class PlanDetail {
  final String id;
  final String title;
  final String type;
  final int progress;
  final String createdAt;
  final String endDate;
  final bool isActive;
  final List<StudySession> sessions;
  final Map<String, dynamic> metadata;

  PlanDetail({
    required this.id,
    required this.title,
    required this.type,
    required this.progress,
    required this.createdAt,
    required this.endDate,
    required this.isActive,
    required this.sessions,
    required this.metadata,
  });

  factory PlanDetail.fromJson(Map<String, dynamic> json) {
    return PlanDetail(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      type: json['type'] ?? '',
      progress: (json['progress'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] ?? '',
      endDate: json['endDate'] ?? '',
      isActive: json['isActive'] ?? false,
      sessions: (json['sessions'] as List?)
              ?.map((session) => StudySession.fromJson(session))
              .toList() ??
          [],
      metadata: json['metadata'] ?? {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'type': type,
      'progress': progress,
      'createdAt': createdAt,
      'endDate': endDate,
      'isActive': isActive,
      'sessions': sessions.map((session) => session.toJson()).toList(),
      'metadata': metadata,
    };
  }

  PlanDetail copyWith({
    String? id,
    String? title,
    String? type,
    int? progress,
    String? createdAt,
    String? endDate,
    bool? isActive,
    List<StudySession>? sessions,
    Map<String, dynamic>? metadata,
  }) {
    return PlanDetail(
      id: id ?? this.id,
      title: title ?? this.title,
      type: type ?? this.type,
      progress: progress ?? this.progress,
      createdAt: createdAt ?? this.createdAt,
      endDate: endDate ?? this.endDate,
      isActive: isActive ?? this.isActive,
      sessions: sessions ?? this.sessions,
      metadata: metadata ?? this.metadata,
    );
  }
}

class StudySession {
  final String id;
  final String planId;
  final String subject;
  final String topic;
  final DateTime startTime;
  final int duration;
  final bool isCompleted;
  final int? performance;
  final String? notes;
  final Map<String, dynamic>? metadata;

  StudySession({
    required this.id,
    required this.planId,
    required this.subject,
    required this.topic,
    required this.startTime,
    required this.duration,
    required this.isCompleted,
    this.performance,
    this.notes,
    this.metadata,
  });

  factory StudySession.fromJson(Map<String, dynamic> json) {
    return StudySession(
      id: json['id'] ?? '',
      planId: json['planId'] ?? '',
      subject: json['subject'] ?? '',
      topic: json['topic'] ?? '',
      startTime:
          DateTime.parse(json['startTime'] ?? DateTime.now().toIso8601String()),
      duration: (json['duration'] as num?)?.toInt() ?? 0,
      isCompleted: json['isCompleted'] ?? false,
      performance: (json['performance'] as num?)?.toInt(),
      notes: json['notes'],
      metadata: json['metadata'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'planId': planId,
      'subject': subject,
      'topic': topic,
      'startTime': startTime.toIso8601String(),
      'duration': duration,
      'isCompleted': isCompleted,
      'performance': performance,
      'notes': notes,
      'metadata': metadata,
    };
  }

  StudySession copyWith({
    String? id,
    String? planId,
    String? subject,
    String? topic,
    DateTime? startTime,
    int? duration,
    bool? isCompleted,
    int? performance,
    String? notes,
    Map<String, dynamic>? metadata,
  }) {
    return StudySession(
      id: id ?? this.id,
      planId: planId ?? this.planId,
      subject: subject ?? this.subject,
      topic: topic ?? this.topic,
      startTime: startTime ?? this.startTime,
      duration: duration ?? this.duration,
      isCompleted: isCompleted ?? this.isCompleted,
      performance: performance ?? this.performance,
      notes: notes ?? this.notes,
      metadata: metadata ?? this.metadata,
    );
  }
}

class PlanDetailModel {
  final String id;
  final String title;
  final String? description;
  final String type;
  final int? totalDays;
  final int? completedDays;
  final int? progress;
  final Map<String, dynamic>? nextSession;
  final List<dynamic>? subjects;
  final Map<String, dynamic>? plan; // holiday plan or nested structure

  const PlanDetailModel({
    required this.id,
    required this.title,
    required this.type,
    this.description,
    this.totalDays,
    this.completedDays,
    this.progress,
    this.nextSession,
    this.subjects,
    this.plan,
  });

  factory PlanDetailModel.fromJson(Map<String, dynamic> json) {
    return PlanDetailModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Çalışma Planı',
      description: json['description']?.toString(),
      type: json['type']?.toString() ?? 'UNKNOWN',
      totalDays: (json['totalDays'] is num) ? (json['totalDays'] as num).toInt() : null,
      completedDays: (json['completedDays'] is num) ? (json['completedDays'] as num).toInt() : null,
      progress: (json['progress'] is num) ? (json['progress'] as num).toInt() : null,
      nextSession: json['nextSession'] is Map<String, dynamic> ? Map<String, dynamic>.from(json['nextSession']) : null,
      subjects: json['subjects'] is List ? List<dynamic>.from(json['subjects']) : null,
      plan: json['plan'] is Map<String, dynamic> ? Map<String, dynamic>.from(json['plan']) : null,
    );
  }
}
