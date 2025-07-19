import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import '../models/student_profile.dart';

class PlanService extends ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Express API base URL
  static const String _apiBaseUrl = 'http://89.116.38.173:3000/api/v1';

  // Mevcut seçili profil ID'si
  String? _selectedProfileId;

  // Kimlik doğrulama kontrolü için yardımcı metod
  Future<String?> _ensureAuthenticated() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception(
          'Bu işlemi gerçekleştirmek için giriş yapmanız gerekiyor.');
    }

    // Önce kullanıcı nesnesini yenile, ardından token'ı al
    try {
      // Kullanıcı bilgilerini sunucudan yenile
      await user.reload();

      // Yenilenen kullanıcı nesnesini al
      final refreshedUser = _auth.currentUser;
      if (refreshedUser == null) {
        throw Exception(
            'Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }

      // Yeni token'ı al (forceRefresh=true ile)
      final token = await refreshedUser.getIdToken(true);
      developer.log('Kimlik doğrulama token\'ı başarıyla yenilendi');
      return token;
    } on FirebaseAuthException catch (e) {
      // Firebase Auth hatalarını özel olarak handle et
      developer.log('Firebase Auth hatası: ${e.code} - ${e.message}');
      if (e.code == 'user-token-expired' || e.code == 'user-disabled') {
        throw Exception(
            'Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      throw Exception('Kimlik doğrulama hatası: ${e.message}');
    } catch (e) {
      developer.log('Token yenileme hatası: $e');
      throw Exception('Kimlik doğrulama hatası: $e');
    }
  }

  /// Hesap tipini ve aktif profil ID'sini belirler
  Future<Map<String, String?>> _getAccountContext() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturum açmamış');
    }

    final userDoc = await _firestore.doc('users/${user.uid}').get();
    if (!userDoc.exists) {
      throw Exception('Kullanıcı hesabı bulunamadı');
    }

    final userData = userDoc.data()!;
    final accountType = userData['accountType'] ?? 'single';
    final selectedProfileId =
        _selectedProfileId ?? userData['selectedProfileId'];

    return {
      'accountType': accountType,
      'selectedProfileId': selectedProfileId,
    };
  }

  /// Profil seçimini ayarla (aile hesabı için)
  void setSelectedProfile(String? profileId) {
    _selectedProfileId = profileId;
    notifyListeners();
  }

  /// Veri yollarını hesap tipine göre belirler
  Map<String, String> _getDataPaths(
      String userId, String accountType, String? profileId) {
    if (accountType == 'family' && profileId != null && profileId.isNotEmpty) {
      return {
        'planPath': 'users/$userId/studentProfiles/$profileId/plan/user_plan',
        'profilePath':
            'users/$userId/studentProfiles/$profileId/privateProfile/profile',
        'gamificationPath':
            'users/$userId/studentProfiles/$profileId/gamification/data',
        'performancePath':
            'users/$userId/studentProfiles/$profileId/performance_analytics',
      };
    } else {
      // Tek kullanıcı modu (geriye uyumluluk) veya geçersiz profileId durumu
      return {
        'planPath': 'users/$userId/plan/user_plan',
        'profilePath': 'users/$userId/privateProfile/profile',
        'gamificationPath': 'users/$userId/gamification/data',
        'performancePath': 'users/$userId/performance_analytics',
      };
    }
  }

  /// Kullanıcı dokümanının var olduğundan emin olur, yoksa oluşturur
  Future<void> _ensureUserDocumentExists(User user) async {
    try {
      final docRef = _firestore.doc('users/${user.uid}');
      final docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        await docRef.set({
          'email': user.email,
          'createdAt': FieldValue.serverTimestamp(),
          'lastActiveDate': FieldValue.serverTimestamp(),
          'onboardingCompleted': false
        });
      } else {
        // Kullanıcı aktif, son giriş tarihini güncelle
        await docRef.update({
          'lastActiveDate': FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      debugPrint('⚠️ Kullanıcı dokümanı kontrol hatası: $e');
    }
  }

  /// Kullanıcının son giriş tarihini kontrol eder ve inaktif mi belirler
  Future<bool> isUserInactive() async {
    try {
      final user = _auth.currentUser;
      if (user == null) return true;

      final userDoc = await _firestore.doc('users/${user.uid}').get();
      if (!userDoc.exists) return true;

      final userData = userDoc.data()!;
      final lastActiveDate = userData['lastActiveDate'] as Timestamp?;

      if (lastActiveDate == null) return true;

      final daysSinceLastActive =
          DateTime.now().difference(lastActiveDate.toDate()).inDays;

      // 7 günden fazla kullanmayan kullanıcıları inaktif say
      return daysSinceLastActive > 7;
    } catch (e) {
      developer.log('İnaktif kullanıcı kontrolü hatası: $e');
      return false; // Hata durumunda aktif say
    }
  }

  /// İnaktif kullanıcı için müfredatı günceller
  Future<void> updateCurriculumForInactiveUser() async {
    try {
      final isInactive = await isUserInactive();
      if (!isInactive) return; // Aktif kullanıcı için güncelleme gereksiz

      developer
          .log('İnaktif kullanıcı tespit edildi, müfredat güncelleniyor...');

      final user = _auth.currentUser;
      if (user == null) return;

      // Kullanıcı profilini al
      final context = await _getAccountContext();
      final dataPaths = _getDataPaths(
          user.uid, context['accountType']!, context['selectedProfileId']);

      final profileDoc = await _firestore.doc(dataPaths['profilePath']!).get();
      if (!profileDoc.exists) return;

      final profileData = profileDoc.data()!;

      // Express API ile güncel müfredatı çek ve planı güncelle
      final authToken = await _ensureAuthenticated();
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/planning/update-curriculum'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'userId': user.uid,
          'grade': profileData['grade'],
          'targetExam': profileData['targetExam'],
          'selectedSubjects': profileData['selectedSubjects'] ?? [],
          'profileId': context['selectedProfileId'],
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('Müfredat güncellenemedi: ${response.statusCode}');
      }

      developer.log('İnaktif kullanıcı için müfredat başarıyla güncellendi');
    } catch (e) {
      developer.log('İnaktif kullanıcı müfredat güncelleme hatası: $e');
    }
  }

  /// Mevcut tarihin okul tatil dönemine denk gelip gelmediğini kontrol eder.
  /// Yeni checkHolidayStatus Cloud Function'ını kullanır.
  Future<Map<String, dynamic>> checkHolidayStatus() async {
    try {
      // Token'ı yenile
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }

      // Güncel kullanıcı bilgisini al
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception(
            'Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }

      // Kullanıcı dokümanının var olduğundan emin ol
      await _ensureUserDocumentExists(user);

      final response = await http.get(
        Uri.parse('$_apiBaseUrl/planning/check-holiday-status'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        return result as Map<String, dynamic>;
      } else {
        throw Exception(
            'Tatil durumu kontrol edilemedi: ${response.statusCode}');
      }
    } catch (e) {
      developer.log('Tatil durumu kontrol hatası (istemci): $e');
      // Hata durumunda, varsayılan değer döndür
      return {'isHoliday': false};
    }
  }

  /// Plan oluşturma fonksiyonu
  Future<Map<String, dynamic>> generateInitialLongTermPlan({
    required String grade,
    required String targetExam,
    required int dailyHours,
    required String planScope,
    required List<String> selectedSubjects,
    String? planType,
    String? profileId, // Yeni: aile hesabı için
  }) async {
    try {
      // Token'ı yenile
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }

      final user = _auth.currentUser!;

      // Hesap kontekstini belirle
      final context = await _getAccountContext();
      final targetProfileId = profileId ?? context['selectedProfileId'];

      // Express API'ye istek gönder
      final authToken = await _ensureAuthenticated();
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/planning/generate-initial-plan'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'userId': user.uid,
          'profile': {
            'grade': grade,
            'targetExam': targetExam,
            'dailyHours': dailyHours,
            'planScope': planScope,
            'selectedSubjects': selectedSubjects,
            'planType': planType ?? 'regular',
            'profileId': targetProfileId,
          },
        }),
      );

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        developer.log('Plan başarıyla oluşturuldu: $result');
        return result;
      } else {
        throw Exception('Plan oluşturulamadı: ${response.statusCode}');
      }
    } catch (e) {
      developer.log('Plan oluşturma hatası: $e');
      throw Exception('Plan oluşturulamadı: $e');
    }
  }

  /// Kullanıcının mevcut çalışma planını Firestore'dan getirir
  Future<Map<String, dynamic>?> getUserPlan({String? profileId}) async {
    try {
      // Kullanıcı kontrolü
      final user = _auth.currentUser;
      if (user == null) {
        debugPrint('⚠️ Kullanıcı oturum açmamış, plan getirilemez.');
        return null;
      }

      // Token'ı yenile
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }

      // Kullanıcı dokümanının var olduğundan emin ol
      await _ensureUserDocumentExists(user);

      // Hesap kontekstini belirle
      final context = await _getAccountContext();
      final targetProfileId = profileId ?? context['selectedProfileId'];
      final dataPaths =
          _getDataPaths(user.uid, context['accountType']!, targetProfileId);

      // Plan dökümanını getir
      final snapshot = await _firestore.doc(dataPaths['planPath']!).get();

      if (!snapshot.exists) {
        debugPrint('⚠️ Kullanıcı için plan bulunamadı.');
        return null; // Plan yoksa null döndür
      }

      // Döküman verisini Map olarak döndür
      return snapshot.data() as Map<String, dynamic>;
    } catch (e) {
      debugPrint('❌ Plan getirme hatası: $e');

      // Eğer authentication hatası ise null döndür
      if (e.toString().contains('giriş yap')) {
        return null;
      }

      throw Exception('Çalışma planınız getirilirken bir hata oluştu: $e');
    }
  }

  /// Kullanıcının planını günceller
  Future<Map<String, dynamic>> updatePlan(
      Map<String, dynamic> currentPlan, Map<String, dynamic> modifications,
      {String? profileId}) async {
    try {
      // Token'ı yenile
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }

      // Güncel kullanıcı bilgisini al
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception(
            'Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }

      // Hesap kontekstini belirle
      final context = await _getAccountContext();
      final targetProfileId = profileId ?? context['selectedProfileId'];
      final dataPaths =
          _getDataPaths(user.uid, context['accountType']!, targetProfileId);

      // Express API'ye istek gönder
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/interaction/handle-user-action'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'userId': user.uid,
          'actionType': 'PLAN_UPDATE',
          'payload': {
            'currentPlan': currentPlan,
            'modifications': modifications,
          },
          'profileId': targetProfileId,
        }),
      );

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        developer.log('Plan güncelleme işlemi tamamlandı');
        return result;
      } else {
        throw Exception('Plan güncellenemedi: ${response.statusCode}');
      }
    } catch (e) {
      developer.log('Plan güncelleme hatası: $e');
      throw Exception('Plan güncellenirken bir hata oluştu: $e');
    }
  }

  /// Belirli bir görevi tamamlandı olarak işaretle
  Future<void> markTaskAsCompleted(String taskId, bool isCompleted) async {
    try {
      // Token'ı yenile
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }

      // Güncel kullanıcı bilgisini al
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception(
            'Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }

      // Kullanıcı dokümanının var olduğundan emin ol
      await _ensureUserDocumentExists(user);

      // Hesap kontekstini belirle
      final context = await _getAccountContext();
      final targetProfileId =
          _selectedProfileId ?? context['selectedProfileId'];
      final dataPaths =
          _getDataPaths(user.uid, context['accountType']!, targetProfileId);

      // Ana plan dökümanını güncelle (doğru path: users/{userId}/plan/user_plan)
      final planDocRef = _firestore.doc(dataPaths['planPath']!);

      // Planı al ve güncelle
      final planDoc = await planDocRef.get();
      if (!planDoc.exists) {
        throw Exception('Plan bulunamadı');
      }

      final planData = planDoc.data() as Map<String, dynamic>;

      // Task'ı bulup güncelle
      bool taskFound = false;
      if (planData['weeks'] != null) {
        List<dynamic> weeks = planData['weeks'];
        for (int i = 0; i < weeks.length; i++) {
          if (weeks[i]['days'] != null) {
            List<dynamic> days = weeks[i]['days'];
            for (int j = 0; j < days.length; j++) {
              if (days[j]['dailyTasks'] != null) {
                List<dynamic> tasks = days[j]['dailyTasks'];
                for (int k = 0; k < tasks.length; k++) {
                  // Task ID'sini oluştur
                  String currentTaskId =
                      '${i}_${tasks[k]['subject']}_${tasks[k]['topic']}';
                  if (currentTaskId == taskId) {
                    tasks[k]['isCompleted'] = isCompleted;
                    taskFound = true;
                    break;
                  }
                }
              }
              if (taskFound) break;
            }
          }
          if (taskFound) break;
        }
      }

      if (!taskFound) {
        throw Exception('Görev bulunamadı: $taskId');
      }

      // Güncellenmiş planı kaydet
      await planDocRef.update({
        'weeks': planData['weeks'],
        'updatedAt': FieldValue.serverTimestamp(),
      });

      debugPrint('✅ Görev başarıyla güncellendi: $taskId');
    } catch (e) {
      print('Görev güncelleme hatası: $e');
      throw Exception('Görev güncellenirken bir hata oluştu: $e');
    }
  }

  /// Kullanıcının onboarding durumunu kontrol et
  Future<bool> checkOnboardingStatus() async {
    try {
      // Kullanıcının oturum açtığından emin ol
      final user = _auth.currentUser;
      if (user == null) {
        return false; // Giriş yapmamış kullanıcı onboarding'i tamamlamamış sayılır
      }

      // Kullanıcı token'ını yenile
      await user.reload();
      await user.getIdToken(true);

      // Kullanıcı dokümanını getir
      final doc = await _firestore.doc('users/${user.uid}').get();

      // Kullanıcı dökümanı yoksa oluştur
      if (!doc.exists) {
        await _firestore.doc('users/${user.uid}').set({
          'email': user.email,
          'createdAt': FieldValue.serverTimestamp(),
          'onboardingCompleted': false
        });
        return false;
      }

      // onboardingCompleted alanını kontrol et
      return (doc.data()?['onboardingCompleted'] as bool?) ?? false;
    } catch (e) {
      print('Onboarding durumu kontrol hatası: $e');
      return false; // Hata durumunda varsayılan olarak onboarding'i tamamlamamış say
    }
  }

  /// Onboarding durumunu güncelle
  Future<void> updateOnboardingStatus(bool completed) async {
    try {
      // Token'ı yenile
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }

      // Güncel kullanıcı bilgisini al
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception(
            'Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }

      // Kullanıcı dokümanının var olduğundan emin ol
      await _ensureUserDocumentExists(user);

      // Hesap kontekstini belirle
      final context = await _getAccountContext();
      final targetProfileId =
          _selectedProfileId ?? context['selectedProfileId'];
      final dataPaths =
          _getDataPaths(user.uid, context['accountType']!, targetProfileId);

      // Kullanıcı dökümanını güncelle
      await _firestore
          .doc(dataPaths['profilePath']!)
          .update({'onboardingCompleted': completed});
    } catch (e) {
      print('Onboarding durumu güncelleme hatası: $e');
      throw Exception('Onboarding durumu güncellenirken bir hata oluştu: $e');
    }
  }

  /// Görevin kısmen tamamlanma ilerlemesini günceller
  Future<void> updateTaskProgress(String taskId, int studiedMinutes) async {
    try {
      debugPrint(
          '🔄 Görev ilerlemesi güncelleniyor: $taskId, $studiedMinutes dakika');

      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturum açmamış');
      }

      // Hesap tipine göre path'i belirle
      final context = await _getAccountContext();
      final targetProfileId = context['selectedProfileId'];
      final dataPaths =
          _getDataPaths(user.uid, context['accountType']!, targetProfileId);
      final planDocRef = _firestore.doc(dataPaths['planPath']!);

      // Mevcut planı getir
      final planDoc = await planDocRef.get();
      if (!planDoc.exists) {
        throw Exception('Plan bulunamadı');
      }

      final planData = planDoc.data()!;
      bool taskFound = false;

      // Görevy bul ve güncelle
      if (planData['weeks'] != null) {
        List<dynamic> weeks = planData['weeks'];
        for (int i = 0; i < weeks.length; i++) {
          if (weeks[i]['days'] != null) {
            List<dynamic> days = weeks[i]['days'];
            for (int j = 0; j < days.length; j++) {
              if (days[j]['dailyTasks'] != null) {
                List<dynamic> tasks = days[j]['dailyTasks'];
                for (int k = 0; k < tasks.length; k++) {
                  // Task ID'sini oluştur
                  String currentTaskId =
                      '${i}_${tasks[k]['subject']}_${tasks[k]['topic']}';
                  if (currentTaskId == taskId) {
                    // Mevcut tamamlanan dakikaları al
                    int currentCompleted = tasks[k]['completedMinutes'] ?? 0;
                    int totalDuration = tasks[k]['durationInMinutes'] ?? 0;

                    // Yeni tamamlanan dakika
                    int newCompleted = (currentCompleted + studiedMinutes)
                        .clamp(0, totalDuration);
                    int newRemaining = totalDuration - newCompleted;
                    bool isNowCompleted = newCompleted >= totalDuration;
                    bool isPartiallyCompleted =
                        newCompleted > 0 && !isNowCompleted;

                    // Görevi güncelle
                    tasks[k]['completedMinutes'] = newCompleted;
                    tasks[k]['remainingMinutes'] = newRemaining;
                    tasks[k]['lastStudiedAt'] =
                        DateTime.now().toIso8601String();
                    tasks[k]['isPartiallyCompleted'] = isPartiallyCompleted;

                    // Eğer görev tamamen tamamlandıysa, isCompleted'i true yap
                    if (isNowCompleted) {
                      tasks[k]['isCompleted'] = true;
                    }

                    taskFound = true;
                    break;
                  }
                }
              }
              if (taskFound) break;
            }
          }
          if (taskFound) break;
        }
      }

      if (!taskFound) {
        throw Exception('Görev bulunamadı: $taskId');
      }

      // Güncellenmiş planı kaydet
      await planDocRef.update({
        'weeks': planData['weeks'],
        'updatedAt': FieldValue.serverTimestamp(),
      });

      debugPrint('✅ Görev ilerlemesi başarıyla güncellendi: $taskId');
    } catch (e) {
      print('Görev ilerlemesi güncelleme hatası: $e');
      throw Exception('Görev ilerlemesi güncellenirken bir hata oluştu: $e');
    }
  }
}
