import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:okuz_ai/models/gamification.dart';
import '../models/student_profile.dart';
import 'dart:developer' as developer;
import 'dart:convert'; // Added for jsonEncode and jsonDecode
import 'package:http/http.dart' as http; // Added for http

/// Oyunlaştırma sistemini yöneten servis sınıfı
/// Artık hem tek kullanıcı hem de aile hesabı sistemini destekler
class GamificationService extends ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFunctions _functions = FirebaseFunctions.instance;
  final String _apiBaseUrl = 'http://89.116.38.173:3000/api'; // API Base URL

  // Mevcut seçili profil ID'si
  String? _selectedProfileId;

  /// Profil seçimini ayarla (aile hesabı için)
  void setSelectedProfile(String? profileId) {
    _selectedProfileId = profileId;
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

  /// Veri yollarını hesap tipine göre belirler
  String _getGamificationPath(
      String userId, String accountType, String? profileId) {
    if (accountType == 'family') {
      if (profileId == null) {
        throw Exception('Aile hesabı için profileId gereklidir');
      }
      return 'users/$userId/studentProfiles/$profileId/gamification/data';
    } else {
      // Tek kullanıcı modu (geriye uyumluluk)
      return 'users/$userId/gamification/data';
    }
  }

  /// Mevcut kullanıcının oyunlaştırma verilerini getirir
  Future<Gamification> getUserGamification({String? profileId}) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturum açmamış');
    }

    // Hesap kontekstini belirle
    final context = await _getAccountContext();
    final targetProfileId = profileId ?? context['selectedProfileId'];
    final gamificationPath = _getGamificationPath(
        user.uid, context['accountType']!, targetProfileId);

    final docRef = _firestore.doc(gamificationPath);
    final docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      // Kullanıcının oyunlaştırma verisi yoksa yeni oluştur
      final newGamification = Gamification(
        userId: user.uid,
        badges: [],
        subjectXP: {},
        achievements: [],
      );

      // Aile hesabı için ek veriler
      final gamificationData = newGamification.toJson();
      if (context['accountType'] == 'family' && targetProfileId != null) {
        gamificationData['profileId'] = targetProfileId;
      }

      await docRef.set(gamificationData);
      return newGamification;
    }

    final data = docSnapshot.data() as Map<String, dynamic>;
    // userId'yi her zaman mevcut kullanıcı ID'si olarak ayarla
    data['userId'] = user.uid;

    return Gamification.fromJson(data);
  }

  /// XP ekler ve seviye kontrolü yapar
  Future<Map<String, dynamic>> addXP(int xp,
      {String? subject, String? profileId}) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturum açmamış');
    }

    // Hesap kontekstini belirle
    final context = await _getAccountContext();
    final targetProfileId = profileId ?? context['selectedProfileId'];
    final gamificationPath = _getGamificationPath(
        user.uid, context['accountType']!, targetProfileId);

    final docRef = _firestore.doc(gamificationPath);
    final gamification = await getUserGamification(profileId: targetProfileId);

    // Toplam XP'yi güncelle
    int newXP = gamification.xp + xp;

    // Ders bazında XP'yi güncelle
    Map<String, int> newSubjectXP = Map.from(gamification.subjectXP);
    if (subject != null) {
      newSubjectXP[subject] = (newSubjectXP[subject] ?? 0) + xp;
    }

    // Seviye hesapla (ör: her 500 XP'de bir seviye)
    int newLevel = (newXP / 500).floor() + 1;

    // Güncellenen veriyi hazırla
    final updatedData = {
      'xp': newXP,
      'level': newLevel,
      'subjectXP': newSubjectXP,
      'updatedAt': FieldValue.serverTimestamp(),
    };

    // Aile hesabı için ek veriler
    if (context['accountType'] == 'family' && targetProfileId != null) {
      updatedData['profileId'] = targetProfileId;
      updatedData['userId'] = user.uid;
    }

    await docRef.update(updatedData);

    return {
      'success': true,
      'newXP': newXP,
      'newLevel': newLevel,
      'addedXP': xp,
      'levelUp': newLevel > gamification.level,
    };
  }

  /// Streak günceller
  Future<void> updateStreak({String? profileId}) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturum açmamış');
    }

    // Hesap kontekstini belirle
    final context = await _getAccountContext();
    final targetProfileId = profileId ?? context['selectedProfileId'];
    final gamificationPath = _getGamificationPath(
        user.uid, context['accountType']!, targetProfileId);

    final docRef = _firestore.doc(gamificationPath);
    final gamification = await getUserGamification(profileId: targetProfileId);

    final today = DateTime.now();
    final todayString =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    int newStreak = gamification.streak;

    if (gamification.lastCompletedDate != null) {
      final lastDate = gamification.lastCompletedDate!;
      final lastDateString =
          '${lastDate.year}-${lastDate.month.toString().padLeft(2, '0')}-${lastDate.day.toString().padLeft(2, '0')}';

      if (lastDateString == todayString) {
        // Bugün zaten çalışmış, streak'i değiştirme
        return;
      }

      final daysDifference = today.difference(lastDate).inDays;

      if (daysDifference == 1) {
        // Dün çalışmış, streak'i artır
        newStreak = gamification.streak + 1;
      } else {
        // Ara verilmiş, streak'i sıfırla
        newStreak = 1;
      }
    } else {
      // İlk çalışma
      newStreak = 1;
    }

    final updatedData = {
      'streak': newStreak,
      'lastCompletedDate': today,
      'updatedAt': FieldValue.serverTimestamp(),
    };

    // Aile hesabı için ek veriler
    if (context['accountType'] == 'family' && targetProfileId != null) {
      updatedData['profileId'] = targetProfileId;
      updatedData['userId'] = user.uid;
    }

    await docRef.update(updatedData);
  }

  /// Rozet ekler
  Future<bool> addBadge(GameBadge badge, {String? profileId}) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturum açmamış');
    }

    // Hesap kontekstini belirle
    final context = await _getAccountContext();
    final targetProfileId = profileId ?? context['selectedProfileId'];
    final gamificationPath = _getGamificationPath(
        user.uid, context['accountType']!, targetProfileId);

    final docRef = _firestore.doc(gamificationPath);
    final gamification = await getUserGamification(profileId: targetProfileId);

    // Rozet zaten var mı kontrol et
    final hasBadge = gamification.badges.any((b) => b.id == badge.id);
    if (hasBadge) {
      return false; // Rozet zaten mevcut
    }

    List<GameBadge> updatedBadges = [...gamification.badges, badge];

    final updatedData = {
      'badges': updatedBadges.map((b) => b.toJson()).toList(),
      'updatedAt': FieldValue.serverTimestamp(),
    };

    // Aile hesabı için ek veriler
    if (context['accountType'] == 'family' && targetProfileId != null) {
      updatedData['profileId'] = targetProfileId;
      updatedData['userId'] = user.uid;
    }

    await docRef.update(updatedData);
    return true; // Yeni rozet eklendi
  }

  /// Başarı ekler
  Future<void> addAchievement(Achievement achievement,
      {String? profileId}) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturum açmamış');
    }

    // Hesap kontekstini belirle
    final context = await _getAccountContext();
    final targetProfileId = profileId ?? context['selectedProfileId'];
    final gamificationPath = _getGamificationPath(
        user.uid, context['accountType']!, targetProfileId);

    final docRef = _firestore.doc(gamificationPath);
    final gamification = await getUserGamification(profileId: targetProfileId);

    List<Achievement> updatedAchievements = [
      ...gamification.achievements,
      achievement
    ];

    final updatedData = {
      'achievements': updatedAchievements.map((a) => a.toJson()).toList(),
      'updatedAt': FieldValue.serverTimestamp(),
    };

    // Aile hesabı için ek veriler
    if (context['accountType'] == 'family' && targetProfileId != null) {
      updatedData['profileId'] = targetProfileId;
      updatedData['userId'] = user.uid;
    }

    await docRef.update(updatedData);
  }

  /// Liderlik tablosu için kullanıcının sıralamasını getirir
  Future<Map<String, dynamic>> getUserRanking({String? profileId}) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturum açmamış');
    }

    final gamification = await getUserGamification(profileId: profileId);

    // Basit bir ranking hesaplama (gerçek uygulamada daha karmaşık olabilir)
    // Şimdilik sadece XP ve seviye bilgisini döndürüyoruz
    return {
      'userId': user.uid,
      'profileId': profileId,
      'xp': gamification.xp,
      'level': gamification.level,
      'streak': gamification.streak,
      'badgeCount': gamification.badges.length,
    };
  }

  /// Başarı (achievement) ilerlemesini günceller
  Future<Map<String, dynamic>> updateAchievementProgress(
    String achievementId, {
    String? profileId,
    Map<String, dynamic>? additionalData,
  }) async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturum açmamış');
      }

      // Hesap kontekstini belirle
      final context = await _getAccountContext();
      final targetProfileId = profileId ?? context['selectedProfileId'];

      // Cloud Function'a achievement güncelleme isteği gönder
      final callable = _functions.httpsCallable('updateAchievementProgress');
      final result = await callable.call({
        'achievementId': achievementId,
        'profileId': targetProfileId,
        'additionalData': additionalData ?? {},
      });

      if (result.data['success'] == true) {
        developer.log('Achievement progress updated: $achievementId');

        // UI'ı güncelle
        notifyListeners();

        return result.data;
      } else {
        throw Exception(result.data['error'] ?? 'Achievement güncellenemedi');
      }
    } catch (e) {
      developer.log('Achievement progress update hatası: $e');
      throw Exception('Achievement ilerlemesi güncellenemedi: $e');
    }
  }

  /// Kullanıcının tüm başarılarını getirir
  Future<List<Map<String, dynamic>>> getUserAchievements(
      {String? profileId}) async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturum açmamış');
      }

      // Hesap kontekstini belirle
      final context = await _getAccountContext();
      final targetProfileId = profileId ?? context['selectedProfileId'];

      // Veri yolunu belirle
      String gamificationPath;
      if (context['accountType'] == 'family' && targetProfileId != null) {
        gamificationPath =
            'users/${user.uid}/studentProfiles/$targetProfileId/gamification/data';
      } else {
        gamificationPath = 'users/${user.uid}/gamification/data';
      }

      final doc = await _firestore.doc(gamificationPath).get();

      if (!doc.exists) {
        return [];
      }

      final data = doc.data() as Map<String, dynamic>;
      final achievements = data['achievements'] as List<dynamic>? ?? [];

      return achievements
          .map((achievement) => {
                'id': achievement['id'] ?? '',
                'name': achievement['name'] ?? '',
                'description': achievement['description'] ?? '',
                'progress': achievement['progress'] ?? 0,
                'target': achievement['target'] ?? 100,
                'completed': achievement['completed'] ?? false,
                'unlockedAt': achievement['unlockedAt'],
                'category': achievement['category'] ?? 'general',
                'reward': achievement['reward'] ?? {},
              })
          .toList();
    } catch (e) {
      developer.log('User achievements getirme hatası: $e');
      return [];
    }
  }

  /// Kullanıcının tüm gamification verilerini backend'den çeker.
  Future<Map<String, dynamic>?> getGamificationData() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      throw Exception(
          'Gamification verilerini almak için kullanıcı girişi gereklidir.');
    }

    try {
      final token = await user.getIdToken();
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/gamification/getUserStats'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'profileId': 'main_profile' // veya dinamik profil ID
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return data['data'] as Map<String, dynamic>;
        } else {
          throw Exception(data['message'] ?? 'API\'den veri alınamadı.');
        }
      } else {
        throw Exception(
            'Gamification verileri alınamadı. Hata kodu: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('❌ GamificationService getGamificationData hatası: $e');
      // Hata durumunda null döndürerek UI'ın çökmesini engelle
      return null;
    }
  }
}
