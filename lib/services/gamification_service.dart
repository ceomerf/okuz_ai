import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:okuz_ai/models/gamification.dart';

/// Oyunlaştırma sistemini yöneten servis sınıfı
class GamificationService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Mevcut kullanıcının oyunlaştırma verilerini getirir
  Future<Gamification> getUserGamification() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturum açmamış');
    }

    final docRef = _firestore.doc('users/${user.uid}/gamification/data');
    final docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      // Kullanıcının oyunlaştırma verisi yoksa yeni oluştur
      final newGamification = Gamification(
        userId: user.uid,
        badges: [],
        subjectXP: {},
        achievements: [],
      );
      await docRef.set(newGamification.toJson());
      return newGamification;
    }

    return Gamification.fromJson({
      'userId': user.uid,
      ...docSnapshot.data() as Map<String, dynamic>
    });
  }

  /// XP ekler ve seviye kontrolü yapar
  Future<Map<String, dynamic>> addXP(int xp, {String? subject}) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturum açmamış');
    }

    final docRef = _firestore.doc('users/${user.uid}/gamification/data');
    final gamification = await getUserGamification();
    
    // Toplam XP'yi güncelle
    int newXP = gamification.xp + xp;
    
    // Ders bazında XP'yi güncelle
    Map<String, int> newSubjectXP = Map.from(gamification.subjectXP);
    if (subject != null) {
      newSubjectXP[subject] = (newSubjectXP[subject] ?? 0) + xp;
    }
    
    // Seviye kontrolü
    int newLevel = gamification.level;
    bool leveledUp = false;
    int nextLevelThreshold = gamification.level * 500;
    
    if (newXP >= nextLevelThreshold) {
      newLevel = (newXP / 500).floor() + 1;
      leveledUp = newLevel > gamification.level;
    }
    
    // Firestore'a kaydet
    await docRef.update({
      'xp': newXP,
      'level': newLevel,
      'subjectXP': newSubjectXP,
    });
    
    return {
      'newXP': newXP,
      'newLevel': newLevel,
      'leveledUp': leveledUp,
      'subject': subject,
      'subjectXP': subject != null ? newSubjectXP[subject] : null,
    };
  }

  /// Seriyi (streak) günceller
  Future<int> updateStreak() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturum açmamış');
    }

    final docRef = _firestore.doc('users/${user.uid}/gamification/data');
    final gamification = await getUserGamification();
    
    final today = DateTime.now().toIso8601String().split('T')[0];
    int newStreak = gamification.streak;
    
    if (gamification.lastCompletedDate == null) {
      // İlk görev tamamlama
      newStreak = 1;
    } else {
      final lastDate = gamification.lastCompletedDate!.toIso8601String().split('T')[0];
      if (lastDate == today) {
        // Bugün zaten bir görev tamamlanmış, streak değişmez
      } else {
        final yesterday = DateTime.now().subtract(const Duration(days: 1)).toIso8601String().split('T')[0];
        if (lastDate == yesterday) {
          // Dün bir görev tamamlanmış, streak artar
          newStreak += 1;
        } else {
          // Bir günden fazla ara verilmiş, streak sıfırlanır
          newStreak = 1;
        }
      }
    }
    
    // Firestore'a kaydet
    await docRef.update({
      'streak': newStreak,
      'lastCompletedDate': FieldValue.serverTimestamp(),
    });
    
    // Streak başarımlarını kontrol et
    await _checkStreakAchievements(newStreak);
    
    return newStreak;
  }

  /// Başarım ilerlemesini günceller
  Future<List<Achievement>> updateAchievementProgress(
    String achievementId,
    int progressIncrement,
  ) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturum açmamış');
    }

    final docRef = _firestore.doc('users/${user.uid}/gamification/data');
    final gamification = await getUserGamification();
    
    List<Achievement> updatedAchievements = [];
    List<Achievement> completedAchievements = [];
    
    for (var achievement in gamification.achievements) {
      if (achievement.id == achievementId && !achievement.isCompleted) {
        int newProgress = achievement.progress + progressIncrement;
        bool newlyCompleted = false;
        
        if (newProgress >= achievement.target && !achievement.isCompleted) {
          // Başarım yeni tamamlandı
          newProgress = achievement.target;
          newlyCompleted = true;
          
          // XP ödülünü ekle
          await addXP(achievement.xpReward);
          
          // Rozet varsa ekle
          if (achievement.badgeId != null) {
            await _awardBadge(achievement.badgeId!);
          }
        }
        
        // Başarımı güncelle
        Achievement updatedAchievement = Achievement(
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          type: achievement.type,
          progress: newProgress,
          target: achievement.target,
          isCompleted: newlyCompleted,
          xpReward: achievement.xpReward,
          badgeId: achievement.badgeId,
          completedAt: newlyCompleted ? DateTime.now() : null,
        );
        
        updatedAchievements.add(updatedAchievement);
        
        if (newlyCompleted) {
          completedAchievements.add(updatedAchievement);
        }
      } else {
        updatedAchievements.add(achievement);
      }
    }
    
    // Firestore'a kaydet
    await docRef.update({
      'achievements': updatedAchievements.map((e) => e.toJson()).toList(),
    });
    
    return completedAchievements;
  }

  /// Rozet ekler
  Future<Badge> _awardBadge(String badgeId) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturum açmamış');
    }

    // Rozet bilgilerini al
    final badgeRef = _firestore.doc('badges/$badgeId');
    final badgeSnap = await badgeRef.get();
    
    if (!badgeSnap.exists) {
      throw Exception('Rozet bulunamadı');
    }
    
    final badgeData = badgeSnap.data() as Map<String, dynamic>;
    final badge = Badge.fromJson({
      'id': badgeId,
      ...badgeData,
      'awardedAt': DateTime.now(),
    });
    
    // Kullanıcının rozetlerine ekle
    final docRef = _firestore.doc('users/${user.uid}/gamification/data');
    await docRef.update({
      'badges': FieldValue.arrayUnion([badge.toJson()]),
    });
    
    return badge;
  }

  /// Seri (streak) başarımlarını kontrol eder
  Future<List<Achievement>> _checkStreakAchievements(int streak) async {
    List<Achievement> completedAchievements = [];
    
    // Streak başarımlarını kontrol et
    if (streak == 7) {
      completedAchievements.addAll(
        await updateAchievementProgress('streak_7_days', 7)
      );
      await _awardBadge('hafta1_fatihi');
    }
    
    if (streak == 30) {
      completedAchievements.addAll(
        await updateAchievementProgress('streak_30_days', 30)
      );
      await _awardBadge('ay1_fatihi');
    }
    
    return completedAchievements;
  }

  /// Kullanıcının seviye ilerleme durumunu hesaplar (0-1 arası)
  Future<double> getLevelProgress() async {
    final gamification = await getUserGamification();
    return gamification.levelProgress;
  }

  /// Kullanıcının bir sonraki seviyeye geçmek için gereken XP miktarını hesaplar
  Future<int> getXPForNextLevel() async {
    final gamification = await getUserGamification();
    return gamification.nextLevelXP;
  }
} 