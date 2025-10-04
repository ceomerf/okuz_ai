// JWT Backend için basit Student Profile modeli
// Firebase bağımlılıkları tamamen kaldırıldı

/// Öğrencinin anlık durumu - veli kontrol paneli için
class StudentCurrentStatus {
  final String userId;
  final String activity;
  final String? currentTopic;
  final DateTime lastSeen;

  StudentCurrentStatus({
    required this.userId,
    required this.activity,
    this.currentTopic,
    required this.lastSeen,
  });

  factory StudentCurrentStatus.fromJson(Map<String, dynamic> json) {
    return StudentCurrentStatus(
      userId: json['userId'] ?? '',
      activity: json['activity'] ?? 'inactive',
      currentTopic: json['currentTopic'],
      lastSeen: json['lastSeen'] is String
          ? DateTime.parse(json['lastSeen'])
          : DateTime.now(),
    );
  }

  factory StudentCurrentStatus.fromMap(Map<String, dynamic> map) {
    return StudentCurrentStatus.fromJson(map);
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'activity': activity,
      'currentTopic': currentTopic,
      'lastSeen': lastSeen.toIso8601String(),
    };
  }
}

/// Öğrenci profil modeli - JWT Backend için basitleştirildi
class StudentProfile {
  final String id;
  final String profileName;
  final String studentName; // Eksik alan eklendi
  final String? avatarUrl;
  final Map<String, dynamic>? studyStats;
  final Map<String, dynamic>? performanceData; // Eksik alan eklendi
  final Map<String, dynamic>? studyHabits; // Eksik alan eklendi
  final DateTime lastActive;
  final String? grade;
  final bool isActive;
  final String? academicTrack;
  final List<StudentProfile>? studentProfiles; // Eksik alan eklendi

  StudentProfile({
    required this.id,
    required this.profileName,
    required this.studentName,
    this.avatarUrl,
    this.studyStats,
    this.performanceData,
    this.studyHabits,
    required this.lastActive,
    this.grade,
    this.isActive = true,
    this.academicTrack,
    this.studentProfiles,
  });

  // profileId getter'ı - id ile aynı
  String get profileId => id;

  factory StudentProfile.fromJson(Map<String, dynamic> json) {
    return StudentProfile(
      id: json['id'] ?? '',
      profileName: json['profileName'] ?? '',
      studentName: json['studentName'] ?? json['profileName'] ?? '',
      avatarUrl: json['avatarUrl'],
      studyStats: json['studyStats'],
      performanceData: json['performanceData'],
      studyHabits: json['studyHabits'],
      lastActive: json['lastActive'] is String
          ? DateTime.parse(json['lastActive'])
          : DateTime.now(),
      grade: json['grade'],
      isActive: json['isActive'] ?? true,
      academicTrack: json['academicTrack'],
      studentProfiles: (json['studentProfiles'] as List<dynamic>?)
          ?.map((profile) =>
              StudentProfile.fromJson(profile as Map<String, dynamic>))
          .toList(),
    );
  }

  factory StudentProfile.fromMap(Map<String, dynamic> map) {
    return StudentProfile.fromJson(map);
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'profileName': profileName,
      'studentName': studentName,
      'avatarUrl': avatarUrl,
      'studyStats': studyStats,
      'performanceData': performanceData,
      'studyHabits': studyHabits,
      'lastActive': lastActive.toIso8601String(),
      'grade': grade,
      'isActive': isActive,
      'academicTrack': academicTrack,
      'studentProfiles':
          studentProfiles?.map((profile) => profile.toJson()).toList(),
    };
  }
}

/// Öğrenci profil özeti - Dashboard için
class StudentProfileSummary {
  final String id;
  final String name;
  final String? grade;
  final int totalSessions;
  final DateTime? lastActivityDate;

  StudentProfileSummary({
    required this.id,
    required this.name,
    this.grade,
    required this.totalSessions,
    this.lastActivityDate,
  });

  factory StudentProfileSummary.fromJson(Map<String, dynamic> json) {
    return StudentProfileSummary(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      grade: json['grade'],
      totalSessions: json['totalSessions'] ?? 0,
      lastActivityDate: json['lastActivityDate'] is String
          ? DateTime.parse(json['lastActivityDate'])
          : null,
    );
  }

  factory StudentProfileSummary.fromMap(Map<String, dynamic> map) {
    return StudentProfileSummary.fromJson(map);
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'grade': grade,
      'totalSessions': totalSessions,
      'lastActivityDate': lastActivityDate?.toIso8601String(),
    };
  }
}
