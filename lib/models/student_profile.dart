import 'package:cloud_firestore/cloud_firestore.dart';

/// Öğrencinin anlık durumu - veli kontrol paneli için
class StudentCurrentStatus {
  final String activity; // 'inactive', 'studying', 'on_break'
  final String? currentTopic;
  final DateTime lastSeen;

  StudentCurrentStatus({
    required this.activity,
    this.currentTopic,
    required this.lastSeen,
  });

  factory StudentCurrentStatus.fromJson(Map<String, dynamic> json) {
    return StudentCurrentStatus(
      activity: json['activity'] ?? 'inactive',
      currentTopic: json['currentTopic'],
      lastSeen: (json['lastSeen'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'activity': activity,
      'currentTopic': currentTopic,
      'lastSeen': Timestamp.fromDate(lastSeen),
    };
  }

  StudentCurrentStatus copyWith({
    String? activity,
    String? currentTopic,
    DateTime? lastSeen,
  }) {
    return StudentCurrentStatus(
      activity: activity ?? this.activity,
      currentTopic: currentTopic ?? this.currentTopic,
      lastSeen: lastSeen ?? this.lastSeen,
    );
  }
}

// Account types
enum AccountType {
  student,
  parent,
}

// Parent info for students
class ParentInfo {
  final String? parentUserId;
  final String? parentEmail;
  final String? parentName;
  final DateTime? connectedAt;

  ParentInfo({
    this.parentUserId,
    this.parentEmail,
    this.parentName,
    this.connectedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'parentUserId': parentUserId,
      'parentEmail': parentEmail,
      'parentName': parentName,
      'connectedAt': connectedAt?.millisecondsSinceEpoch,
    };
  }

  factory ParentInfo.fromMap(Map<String, dynamic> map) {
    // connectedAt'ı güvenli şekilde parse et
    DateTime? parseDateTime(dynamic value) {
      if (value == null) return null;
      if (value is Timestamp) return value.toDate();
      if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
      if (value is String) return DateTime.tryParse(value);
      return null;
    }

    return ParentInfo(
      parentUserId: map['parentUserId'],
      parentEmail: map['parentEmail'],
      parentName: map['parentName'],
      connectedAt: parseDateTime(map['connectedAt']),
    );
  }

  bool get hasParent => parentUserId != null && parentUserId!.isNotEmpty;
}

// Student reference for parents
class StudentReference {
  final String studentUserId;
  final String studentName;
  final String studentEmail;
  final String grade;
  final DateTime addedAt;
  final bool isActive;

  StudentReference({
    required this.studentUserId,
    required this.studentName,
    required this.studentEmail,
    required this.grade,
    required this.addedAt,
    this.isActive = true,
  });

  Map<String, dynamic> toMap() {
    return {
      'studentUserId': studentUserId,
      'studentName': studentName,
      'studentEmail': studentEmail,
      'grade': grade,
      'addedAt': addedAt.millisecondsSinceEpoch,
      'isActive': isActive,
    };
  }

  factory StudentReference.fromMap(Map<String, dynamic> map) {
    // addedAt'ı güvenli şekilde parse et
    DateTime parseDateTime(dynamic value) {
      if (value == null) return DateTime.now();
      if (value is Timestamp) return value.toDate();
      if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
      if (value is String) return DateTime.tryParse(value) ?? DateTime.now();
      return DateTime.now();
    }

    return StudentReference(
      studentUserId: map['studentUserId'] ?? '',
      studentName: map['studentName'] ?? '',
      studentEmail: map['studentEmail'] ?? '',
      grade: map['grade'] ?? '',
      addedAt: parseDateTime(map['addedAt']),
      isActive: map['isActive'] ?? true,
    );
  }
}

// Updated User Account model
class UserAccount {
  final String userId;
  final String email;
  final String fullName;
  final AccountType accountType;
  final DateTime createdAt;

  // For students
  final ParentInfo? parentInfo;
  final String? grade;
  final String? targetUniversity;
  final String? learningStyle;

  // For parents
  final List<StudentReference>? studentProfiles;
  final String? parentTitle; // Dr., Öğretmen, vs.

  // Onboarding status
  final bool isOnboardingCompleted;

  UserAccount({
    required this.userId,
    required this.email,
    required this.fullName,
    required this.accountType,
    required this.createdAt,
    this.parentInfo,
    this.grade,
    this.targetUniversity,
    this.learningStyle,
    this.studentProfiles,
    this.parentTitle,
    this.isOnboardingCompleted = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'email': email,
      'fullName': fullName,
      'accountType': accountType.name,
      'createdAt': createdAt.millisecondsSinceEpoch,
      'parentInfo': parentInfo?.toMap(),
      'grade': grade,
      'targetUniversity': targetUniversity,
      'learningStyle': learningStyle,
      'studentProfiles': studentProfiles?.map((s) => s.toMap()).toList(),
      'parentTitle': parentTitle,
      'isOnboardingCompleted': isOnboardingCompleted,
    };
  }

  factory UserAccount.fromMap(Map<String, dynamic> map) {
    // createdAt'ı güvenli şekilde parse et
    DateTime parseDateTime(dynamic value) {
      if (value == null) return DateTime.now();
      if (value is Timestamp) return value.toDate();
      if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
      if (value is String) return DateTime.tryParse(value) ?? DateTime.now();
      return DateTime.now();
    }

    return UserAccount(
      userId: map['userId'] ?? '',
      email: map['email'] ?? '',
      fullName: map['fullName'] ?? '',
      accountType: AccountType.values.firstWhere(
        (e) => e.name == map['accountType'],
        orElse: () => AccountType.student,
      ),
      createdAt: parseDateTime(map['createdAt']),
      parentInfo: map['parentInfo'] != null
          ? ParentInfo.fromMap(Map<String, dynamic>.from(map['parentInfo']))
          : null,
      grade: map['grade'],
      targetUniversity: map['targetUniversity'],
      learningStyle: map['learningStyle'],
      studentProfiles: map['studentProfiles'] != null
          ? (map['studentProfiles'] as List)
              .map(
                  (s) => StudentReference.fromMap(Map<String, dynamic>.from(s)))
              .toList()
          : null,
      parentTitle: map['parentTitle'],
      isOnboardingCompleted: map['isOnboardingCompleted'] ?? false,
    );
  }

  bool get isStudent => accountType == AccountType.student;
  bool get isParent => accountType == AccountType.parent;
  bool get hasParent => parentInfo?.hasParent ?? false;
  bool get hasStudents => studentProfiles?.isNotEmpty ?? false;

  UserAccount copyWith({
    String? userId,
    String? email,
    String? fullName,
    AccountType? accountType,
    DateTime? createdAt,
    ParentInfo? parentInfo,
    String? grade,
    String? targetUniversity,
    String? learningStyle,
    List<StudentReference>? studentProfiles,
    String? parentTitle,
    bool? isOnboardingCompleted,
  }) {
    return UserAccount(
      userId: userId ?? this.userId,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      accountType: accountType ?? this.accountType,
      createdAt: createdAt ?? this.createdAt,
      parentInfo: parentInfo ?? this.parentInfo,
      grade: grade ?? this.grade,
      targetUniversity: targetUniversity ?? this.targetUniversity,
      learningStyle: learningStyle ?? this.learningStyle,
      studentProfiles: studentProfiles ?? this.studentProfiles,
      parentTitle: parentTitle ?? this.parentTitle,
      isOnboardingCompleted:
          isOnboardingCompleted ?? this.isOnboardingCompleted,
    );
  }
}

// Legacy support - keeping old StudentProfile for backward compatibility
class StudentProfile {
  final String id;
  final String name;
  final String email;
  final String grade;
  final DateTime createdAt;
  final bool isActive;

  // Additional properties that were missing
  final String? avatarUrl;
  final String? academicTrack;

  // Yeni eklenen alanlar - gerçek verilerle çalışmak için
  final DateTime? lastActive;
  final Map<String, dynamic>? performanceData;
  final Map<String, dynamic>? studyHabits;
  final Map<String, dynamic>? studyStats;
  final StudentCurrentStatus? currentStatus;

  // Getter aliases for backward compatibility
  String get profileId => id;
  String get profileName => name;
  String get studentUserId => id;
  String get studentName => name;
  String get studentEmail => email;

  StudentProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.grade,
    required this.createdAt,
    this.isActive = true,
    this.avatarUrl,
    this.academicTrack,
    this.lastActive,
    this.performanceData,
    this.studyHabits,
    this.studyStats,
    this.currentStatus,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'grade': grade,
      'createdAt': createdAt.millisecondsSinceEpoch,
      'isActive': isActive,
      'avatarUrl': avatarUrl,
      'academicTrack': academicTrack,
      'lastActive': lastActive?.millisecondsSinceEpoch,
      'performanceData': performanceData,
      'studyHabits': studyHabits,
      'studyStats': studyStats,
      'currentStatus': currentStatus?.toJson(),
    };
  }

  factory StudentProfile.fromMap(Map<String, dynamic> map) {
    // DateTime'ı güvenli şekilde parse et
    DateTime? parseDateTime(dynamic value) {
      if (value == null) return null;
      if (value is Timestamp) return value.toDate();
      if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
      if (value is String) return DateTime.tryParse(value);
      return null;
    }

    return StudentProfile(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      email: map['email'] ?? '',
      grade: map['grade'] ?? '',
      createdAt: parseDateTime(map['createdAt']) ?? DateTime.now(),
      isActive: map['isActive'] ?? true,
      avatarUrl: map['avatarUrl'],
      academicTrack: map['academicTrack'],
      lastActive: parseDateTime(map['lastActive']),
      performanceData: map['performanceData'] != null
          ? Map<String, dynamic>.from(map['performanceData'])
          : null,
      studyHabits: map['studyHabits'] != null
          ? Map<String, dynamic>.from(map['studyHabits'])
          : null,
      studyStats: map['studyStats'] != null
          ? Map<String, dynamic>.from(map['studyStats'])
          : null,
      currentStatus: map['currentStatus'] != null
          ? StudentCurrentStatus.fromJson(
              Map<String, dynamic>.from(map['currentStatus']))
          : null,
    );
  }

  // StudentReference'dan StudentProfile oluşturma
  factory StudentProfile.fromStudentReference(StudentReference ref) {
    return StudentProfile(
      id: ref.studentUserId,
      name: ref.studentName,
      email: ref.studentEmail,
      grade: ref.grade,
      createdAt: ref.addedAt,
      isActive: ref.isActive,
      // Varsayılan değerler
      studyStats: {
        'weeklyStudyHours': 0,
        'completedTasks': 0,
        'totalTasks': 0,
      },
      performanceData: {
        'recentProgressPercentage': 0,
      },
      studyHabits: {
        'bestTimeOfDay': 'Öğleden sonra',
        'weakSubject': 'Matematik',
      },
      lastActive: DateTime.now().subtract(const Duration(days: 1)),
    );
  }
}

/// Profil özeti - liste görünümü için
class StudentProfileSummary {
  final String profileId;
  final String profileName;
  final String grade;
  final String? avatarUrl;
  final bool isActive;
  final DateTime? lastActivityDate;
  final int? currentXP;
  final int? currentLevel;
  final StudentCurrentStatus? currentStatus;

  StudentProfileSummary({
    required this.profileId,
    required this.profileName,
    required this.grade,
    this.avatarUrl,
    required this.isActive,
    this.lastActivityDate,
    this.currentXP,
    this.currentLevel,
    this.currentStatus,
  });

  factory StudentProfileSummary.fromJson(Map<String, dynamic> json) {
    return StudentProfileSummary(
      profileId: json['profileId'] ?? '',
      profileName: json['profileName'] ?? '',
      grade: json['grade'] ?? '',
      avatarUrl: json['avatarUrl'],
      isActive: json['isActive'] ?? true,
      lastActivityDate: (json['lastActivityDate'] as Timestamp?)?.toDate(),
      currentXP: json['currentXP'],
      currentLevel: json['currentLevel'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'profileId': profileId,
      'profileName': profileName,
      'grade': grade,
      'avatarUrl': avatarUrl,
      'isActive': isActive,
      'lastActivityDate': lastActivityDate != null
          ? Timestamp.fromDate(lastActivityDate!)
          : null,
      'currentXP': currentXP,
      'currentLevel': currentLevel,
    };
  }
}
