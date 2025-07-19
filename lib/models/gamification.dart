import 'package:cloud_firestore/cloud_firestore.dart';

/// Oyunlaştırma sistemini temsil eden ana sınıf
class Gamification {
  final String userId;
  final int xp; // Deneyim puanı
  final int level; // Seviye
  final int streak; // Seri (aralıksız çalışma günü)
  final List<GameBadge> badges; // Kazanılan rozetler
  final DateTime? lastCompletedDate; // Son görev tamamlama tarihi
  final Map<String, int> subjectXP; // Ders bazında XP
  final List<Achievement> achievements; // Başarımlar

  Gamification({
    required this.userId,
    this.xp = 0,
    this.level = 1,
    this.streak = 0,
    required this.badges,
    this.lastCompletedDate,
    required this.subjectXP,
    required this.achievements,
  });

  factory Gamification.fromJson(Map<String, dynamic> json) {
    return Gamification(
      userId: json['userId'] ?? '',
      xp: json['xp'] ?? 0,
      level: json['level'] ?? 1,
      streak: json['streak'] ?? 0,
      badges: (json['badges'] as List?)
              ?.map((e) => GameBadge.fromJson(e))
              .toList() ??
          [],
      lastCompletedDate: json['lastCompletedDate'] != null
          ? (json['lastCompletedDate'] as Timestamp).toDate()
          : null,
      subjectXP: Map<String, int>.from(json['subjectXP'] ?? {}),
      achievements: (json['achievements'] as List?)
              ?.map((e) => Achievement.fromJson(e))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'xp': xp,
      'level': level,
      'streak': streak,
      'badges': badges.map((e) => e.toJson()).toList(),
      'lastCompletedDate': lastCompletedDate,
      'subjectXP': subjectXP,
      'achievements': achievements.map((e) => e.toJson()).toList(),
    };
  }

  /// Bir sonraki seviyeye geçmek için gereken XP miktarını hesaplar
  int get nextLevelXP => level * 500;

  /// Seviye ilerleme yüzdesini hesaplar (0-1 arası)
  double get levelProgress {
    final currentLevelXP = (level - 1) * 500;
    final xpInCurrentLevel = xp - currentLevelXP;
    return xpInCurrentLevel / 500;
  }
}

/// Rozet sınıfı
class GameBadge {
  final String id;
  final String name;
  final String description;
  final String imageUrl;
  final String category; // 'streak', 'subject', 'achievement', 'special'
  final DateTime awardedAt;
  final int rarity; // 1-5 arası (5 en nadir)

  GameBadge({
    required this.id,
    required this.name,
    required this.description,
    required this.imageUrl,
    required this.category,
    required this.awardedAt,
    this.rarity = 1,
  });

  factory GameBadge.fromJson(Map<String, dynamic> json) {
    return GameBadge(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      imageUrl: json['imageUrl'] ?? '',
      category: json['category'] ?? 'achievement',
      awardedAt: json['awardedAt'] != null
          ? (json['awardedAt'] as Timestamp).toDate()
          : DateTime.now(),
      rarity: json['rarity'] ?? 1,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'imageUrl': imageUrl,
      'category': category,
      'awardedAt': awardedAt,
      'rarity': rarity,
    };
  }
}

/// Başarım sınıfı
class Achievement {
  final String id;
  final String name;
  final String description;
  final String type; // 'streak', 'task', 'exam', 'subject', 'special'
  final int progress; // Mevcut ilerleme
  final int target; // Hedef değer
  final bool isCompleted;
  final int xpReward; // Tamamlandığında kazanılacak XP
  final String? badgeId; // Tamamlandığında kazanılacak rozet ID'si (opsiyonel)
  final DateTime? completedAt;

  Achievement({
    required this.id,
    required this.name,
    required this.description,
    required this.type,
    required this.progress,
    required this.target,
    required this.isCompleted,
    required this.xpReward,
    this.badgeId,
    this.completedAt,
  });

  factory Achievement.fromJson(Map<String, dynamic> json) {
    return Achievement(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      type: json['type'] ?? '',
      progress: json['progress'] ?? 0,
      target: json['target'] ?? 1,
      isCompleted: json['isCompleted'] ?? false,
      xpReward: json['xpReward'] ?? 0,
      badgeId: json['badgeId'],
      completedAt: json['completedAt'] != null
          ? (json['completedAt'] as Timestamp).toDate()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'type': type,
      'progress': progress,
      'target': target,
      'isCompleted': isCompleted,
      'xpReward': xpReward,
      'badgeId': badgeId,
      'completedAt': completedAt,
    };
  }

  /// İlerleme yüzdesini hesaplar (0-1 arası)
  double get progressPercentage => progress / target;
}
