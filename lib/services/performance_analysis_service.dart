import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:okuz_ai/models/mock_trial_exam.dart';
import 'package:okuz_ai/models/topic_connection.dart';
import 'dart:developer' as developer;

class PerformanceAnalysisService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseFunctions _functions = FirebaseFunctions.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Kimlik doğrulama kontrolü için yardımcı metod
  Future<String?> _ensureAuthenticated() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Bu işlemi gerçekleştirmek için giriş yapmanız gerekiyor.');
    }
    
    try {
      await user.reload();
      final refreshedUser = _auth.currentUser;
      if (refreshedUser == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      final token = await refreshedUser.getIdToken(true);
      return token;
    } catch (e) {
      developer.log('Token yenileme hatası: $e');
      throw Exception('Kimlik doğrulama hatası: $e');
    }
  }

  /// Deneme sınavı sonucunu Firestore'a kaydeder
  Future<String> saveExamResult(MockTrialExam exam) async {
    try {
      await _ensureAuthenticated();
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      // Exam nesnesini Firestore'a kaydet
      final examData = exam.toJson();
      examData['userId'] = user.uid;
      examData['createdAt'] = FieldValue.serverTimestamp();
      
      final docRef = await _firestore
          .collection('users')
          .doc(user.uid)
          .collection('mock_exams')
          .add(examData);
      
      // Deneme sonucunu analiz et ve içgörüler oluştur
      await _analyzeExamResult(docRef.id);
      
      return docRef.id;
    } catch (e) {
      developer.log('Deneme sınavı kaydetme hatası: $e');
      throw Exception('Deneme sınavı kaydedilemedi: $e');
    }
  }

  /// Deneme sınavı sonucunu analiz eder ve içgörüler oluşturur
  Future<void> _analyzeExamResult(String examId) async {
    try {
      await _ensureAuthenticated();
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      // Cloud Function'a analiz isteği gönder
      final callable = _functions.httpsCallable('analyzeExamResult');
      await callable.call({
        'examId': examId,
        'userId': user.uid,
      });
    } catch (e) {
      developer.log('Deneme sınavı analiz hatası: $e');
      throw Exception('Deneme sınavı analizi yapılamadı: $e');
    }
  }

  /// Kullanıcının tüm deneme sınavı sonuçlarını getirir
  Future<List<MockTrialExam>> getUserExams() async {
    try {
      await _ensureAuthenticated();
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      final snapshot = await _firestore
          .collection('users')
          .doc(user.uid)
          .collection('mock_exams')
          .orderBy('examDate', descending: true)
          .get();
      
      return snapshot.docs
          .map((doc) => MockTrialExam.fromJson({...doc.data(), 'id': doc.id}))
          .toList();
    } catch (e) {
      developer.log('Deneme sınavları getirme hatası: $e');
      throw Exception('Deneme sınavları getirilemedi: $e');
    }
  }

  /// Belirli bir deneme sınavı sonucunu getirir
  Future<MockTrialExam> getExamById(String examId) async {
    try {
      await _ensureAuthenticated();
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      final doc = await _firestore
          .collection('users')
          .doc(user.uid)
          .collection('mock_exams')
          .doc(examId)
          .get();
      
      if (!doc.exists) {
        throw Exception('Deneme sınavı bulunamadı.');
      }
      
      return MockTrialExam.fromJson({...doc.data()!, 'id': doc.id});
    } catch (e) {
      developer.log('Deneme sınavı getirme hatası: $e');
      throw Exception('Deneme sınavı getirilemedi: $e');
    }
  }

  /// Son üç deneme sınavı sonucunu analiz eder ve zayıf alanları belirler
  Future<Map<String, dynamic>> analyzeRecentExams() async {
    try {
      await _ensureAuthenticated();
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      // Cloud Function'a analiz isteği gönder
      final callable = _functions.httpsCallable('analyzeRecentExams');
      final result = await callable.call({
        'userId': user.uid,
        'examCount': 3, // Son 3 denemeyi analiz et
      });
      
      return result.data;
    } catch (e) {
      developer.log('Son denemeler analiz hatası: $e');
      throw Exception('Son denemeler analizi yapılamadı: $e');
    }
  }

  /// Konu bağlantılarını getirir
  Future<TopicMap> getTopicMap(String subject) async {
    try {
      await _ensureAuthenticated();
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      // Önce kullanıcının konu haritasını kontrol et
      final userMapSnapshot = await _firestore
          .collection('users')
          .doc(user.uid)
          .collection('topic_maps')
          .where('subject', isEqualTo: subject)
          .limit(1)
          .get();
      
      // Kullanıcıya özel harita varsa onu döndür
      if (userMapSnapshot.docs.isNotEmpty) {
        final doc = userMapSnapshot.docs.first;
        return TopicMap.fromJson({...doc.data(), 'id': doc.id});
      }
      
      // Yoksa genel haritayı getir
      final generalMapSnapshot = await _firestore
          .collection('topic_maps')
          .where('subject', isEqualTo: subject)
          .limit(1)
          .get();
      
      if (generalMapSnapshot.docs.isEmpty) {
        // Genel harita da yoksa AI ile oluştur
        return await _generateTopicMap(subject);
      }
      
      final doc = generalMapSnapshot.docs.first;
      return TopicMap.fromJson({...doc.data(), 'id': doc.id});
    } catch (e) {
      developer.log('Konu haritası getirme hatası: $e');
      throw Exception('Konu haritası getirilemedi: $e');
    }
  }

  /// AI ile konu haritası oluşturur
  Future<TopicMap> _generateTopicMap(String subject) async {
    try {
      await _ensureAuthenticated();
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      // Cloud Function'a istek gönder
      final callable = _functions.httpsCallable('generateTopicMap');
      final result = await callable.call({
        'subject': subject,
        'userId': user.uid,
      });
      
      // Oluşturulan haritayı Firestore'a kaydet
      final topicMapData = result.data;
      final docRef = await _firestore
          .collection('users')
          .doc(user.uid)
          .collection('topic_maps')
          .add(topicMapData);
      
      return TopicMap.fromJson({...topicMapData, 'id': docRef.id});
    } catch (e) {
      developer.log('Konu haritası oluşturma hatası: $e');
      throw Exception('Konu haritası oluşturulamadı: $e');
    }
  }

  /// Belirli bir konunun bağlantılarını getirir
  Future<TopicConnection> getTopicConnection(String subject, String topic) async {
    try {
      await _ensureAuthenticated();
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      // Önce kullanıcının konu bağlantısını kontrol et
      final userConnectionSnapshot = await _firestore
          .collection('users')
          .doc(user.uid)
          .collection('topic_connections')
          .where('subject', isEqualTo: subject)
          .where('topic', isEqualTo: topic)
          .limit(1)
          .get();
      
      // Kullanıcıya özel bağlantı varsa onu döndür
      if (userConnectionSnapshot.docs.isNotEmpty) {
        final doc = userConnectionSnapshot.docs.first;
        return TopicConnection.fromJson({...doc.data(), 'id': doc.id});
      }
      
      // Yoksa genel bağlantıyı getir
      final generalConnectionSnapshot = await _firestore
          .collection('topic_connections')
          .where('subject', isEqualTo: subject)
          .where('topic', isEqualTo: topic)
          .limit(1)
          .get();
      
      if (generalConnectionSnapshot.docs.isEmpty) {
        // Genel bağlantı da yoksa AI ile oluştur
        return await _generateTopicConnection(subject, topic);
      }
      
      final doc = generalConnectionSnapshot.docs.first;
      return TopicConnection.fromJson({...doc.data(), 'id': doc.id});
    } catch (e) {
      developer.log('Konu bağlantısı getirme hatası: $e');
      throw Exception('Konu bağlantısı getirilemedi: $e');
    }
  }

  /// AI ile konu bağlantısı oluşturur
  Future<TopicConnection> _generateTopicConnection(String subject, String topic) async {
    try {
      await _ensureAuthenticated();
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      // Cloud Function'a istek gönder
      final callable = _functions.httpsCallable('generateTopicConnection');
      final result = await callable.call({
        'subject': subject,
        'topic': topic,
        'userId': user.uid,
      });
      
      // Oluşturulan bağlantıyı Firestore'a kaydet
      final connectionData = result.data;
      final docRef = await _firestore
          .collection('users')
          .doc(user.uid)
          .collection('topic_connections')
          .add(connectionData);
      
      return TopicConnection.fromJson({...connectionData, 'id': docRef.id});
    } catch (e) {
      developer.log('Konu bağlantısı oluşturma hatası: $e');
      throw Exception('Konu bağlantısı oluşturulamadı: $e');
    }
  }

  /// Performans gösterge paneli için gerekli verileri getirir
  Future<Map<String, dynamic>> getPerformanceDashboardData() async {
    try {
      await _ensureAuthenticated();
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      // Son deneme sonuçlarını getir
      final exams = await getUserExams();
      
      // Son denemeleri analiz et
      final analysisResult = await analyzeRecentExams();
      
      // Zayıf alanları belirle
      final weakAreas = analysisResult['weakAreas'] ?? [];
      
      // Güçlü alanları belirle
      final strongAreas = analysisResult['strongAreas'] ?? [];
      
      // Öneriler al
      final recommendations = analysisResult['recommendations'] ?? [];
      
      // Performans trendini hesapla
      final performanceTrend = _calculatePerformanceTrend(exams);
      
      return {
        'exams': exams,
        'weakAreas': weakAreas,
        'strongAreas': strongAreas,
        'recommendations': recommendations,
        'performanceTrend': performanceTrend,
      };
    } catch (e) {
      developer.log('Performans gösterge paneli verisi getirme hatası: $e');
      throw Exception('Performans gösterge paneli verisi getirilemedi: $e');
    }
  }

  /// Performans trendini hesaplar
  Map<String, dynamic> _calculatePerformanceTrend(List<MockTrialExam> exams) {
    if (exams.isEmpty) {
      return {
        'trend': 'stable',
        'changePercentage': 0.0,
      };
    }
    
    if (exams.length == 1) {
      return {
        'trend': 'stable',
        'changePercentage': 0.0,
      };
    }
    
    // Son iki denemeyi karşılaştır
    final latestExam = exams[0];
    final previousExam = exams[1];
    
    final scoreDifference = latestExam.score - previousExam.score;
    final changePercentage = (scoreDifference / previousExam.score) * 100;
    
    String trend;
    if (changePercentage > 5) {
      trend = 'increasing';
    } else if (changePercentage < -5) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }
    
    return {
      'trend': trend,
      'changePercentage': changePercentage,
    };
  }
} 