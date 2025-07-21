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
          ? DateTime.parse(json['lastCompletedDate'])
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
      'lastCompletedDate': lastCompletedDate?.toIso8601String(),
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
          ? DateTime.parse(json['awardedAt'])
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
      'awardedAt': awardedAt.toIso8601String(),
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
          ? DateTime.parse(json['completedAt'])
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
      'completedAt': completedAt?.toIso8601String(),
    };
  }

  /// İlerleme yüzdesini hesaplar (0-1 arası)
  double get progressPercentage => progress / target;
}

class GamificationProgress {
  final LevelInfo level;
  final GamificationStats stats;
  final List<Badge> badges;
  final Milestone nextMilestone;

  GamificationProgress({
    required this.level,
    required this.stats,
    required this.badges,
    required this.nextMilestone,
  });

  factory GamificationProgress.fromJson(Map<String, dynamic> json) {
    return GamificationProgress(
      level: LevelInfo.fromJson(json['level']),
      stats: GamificationStats.fromJson(json['stats']),
      badges: (json['badges'] as List).map((b) => Badge.fromJson(b)).toList(),
      nextMilestone: Milestone.fromJson(json['nextMilestone']),
    );
  }
}

class LevelInfo {
  final int currentLevel;
  final int currentXP;
  final int nextLevelXP;
  final int progressToNext;
  final int totalXP;

  LevelInfo({
    required this.currentLevel,
    required this.currentXP,
    required this.nextLevelXP,
    required this.progressToNext,
    required this.totalXP,
  });

  factory LevelInfo.fromJson(Map<String, dynamic> json) {
    return LevelInfo(
      currentLevel: json['currentLevel'],
      currentXP: json['currentXP'],
      nextLevelXP: json['nextLevelXP'],
      progressToNext: json['progressToNext'],
      totalXP: json['totalXP'],
    );
  }
}

class GamificationStats {
  final int totalStudyTime;
  final int completedQuizzes;
  final int solvedQuestions;
  final int createdFlashcards;
  final int weeklyXP;

  GamificationStats({
    required this.totalStudyTime,
    required this.completedQuizzes,
    required this.solvedQuestions,
    required this.createdFlashcards,
    required this.weeklyXP,
  });

  factory GamificationStats.fromJson(Map<String, dynamic> json) {
    return GamificationStats(
      totalStudyTime: json['totalStudyTime'],
      completedQuizzes: json['completedQuizzes'],
      solvedQuestions: json['solvedQuestions'],
      createdFlashcards: json['createdFlashcards'],
      weeklyXP: json['weeklyXP'],
    );
  }
}

class Badge {
  final String title;
  final String icon;
  final DateTime unlockedAt;

  Badge({
    required this.title,
    required this.icon,
    required this.unlockedAt,
  });

  factory Badge.fromJson(Map<String, dynamic> json) {
    return Badge(
      title: json['title'],
      icon: json['icon'],
      unlockedAt: DateTime.parse(json['unlockedAt']),
    );
  }
}

class Milestone {
  final int target;
  final int remaining;
  final int progress;

  Milestone({
    required this.target,
    required this.remaining,
    required this.progress,
  });

  factory Milestone.fromJson(Map<String, dynamic> json) {
    return Milestone(
      target: json['target'],
      remaining: json['remaining'],
      progress: json['progress'],
    );
  }
}

class EnergyStatus {
  final int current;
  final int max;
  final int percentage;
  final String nextRefillIn;
  final String refillRate;

  EnergyStatus({
    required this.current,
    required this.max,
    required this.percentage,
    required this.nextRefillIn,
    required this.refillRate,
  });

  factory EnergyStatus.fromJson(Map<String, dynamic> json) {
    return EnergyStatus(
      current: json['current'],
      max: json['max'],
      percentage: json['percentage'],
      nextRefillIn: json['nextRefillIn'],
      refillRate: json['refillRate'],
    );
  }
}

class LeaderboardEntry {
  final int position;
  final String userId;
  final String name;
  final int level;
  final int experience;
  final String? grade;
  final String? field;
  final bool isCurrentUser;

  LeaderboardEntry({
    required this.position,
    required this.userId,
    required this.name,
    required this.level,
    required this.experience,
    this.grade,
    this.field,
    required this.isCurrentUser,
  });

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntry(
      position: json['position'],
      userId: json['userId'],
      name: json['name'],
      level: json['level'],
      experience: json['experience'],
      grade: json['grade'],
      field: json['field'],
      isCurrentUser: json['isCurrentUser'],
    );
  }
}

class Leaderboard {
  final GlobalLeaderboard global;
  final FriendsLeaderboard friends;

  Leaderboard({
    required this.global,
    required this.friends,
  });

  factory Leaderboard.fromJson(Map<String, dynamic> json) {
    return Leaderboard(
      global: GlobalLeaderboard.fromJson(json['global']),
      friends: FriendsLeaderboard.fromJson(json['friends']),
    );
  }
}

class GlobalLeaderboard {
  final List<LeaderboardEntry> rankings;
  final int userPosition;
  final int totalUsers;

  GlobalLeaderboard({
    required this.rankings,
    required this.userPosition,
    required this.totalUsers,
  });

  factory GlobalLeaderboard.fromJson(Map<String, dynamic> json) {
    return GlobalLeaderboard(
      rankings: (json['rankings'] as List)
          .map((r) => LeaderboardEntry.fromJson(r))
          .toList(),
      userPosition: json['userPosition'],
      totalUsers: json['totalUsers'],
    );
  }
}

class FriendsLeaderboard {
  final List<LeaderboardEntry> rankings;

  FriendsLeaderboard({
    required this.rankings,
  });

  factory FriendsLeaderboard.fromJson(Map<String, dynamic> json) {
    return FriendsLeaderboard(
      rankings: (json['rankings'] as List)
          .map((r) => LeaderboardEntry.fromJson(r))
          .toList(),
    );
  }
}
