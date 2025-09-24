enum PlanType { DAILY, WEEKLY, MONTHLY, HOLIDAY, LONG_TERM, THREE_DAY }

class PlanSummary {
  final String id;
  final String title;
  final PlanType type;
  final int progress;
  final String createdAt;
  final String endDate;
  final int totalSessions;
  final int completedSessions;
  final double? averagePerformance;
  final String? status;

  PlanSummary({
    required this.id,
    required this.title,
    required this.type,
    required this.progress,
    required this.createdAt,
    required this.endDate,
    required this.totalSessions,
    required this.completedSessions,
    this.averagePerformance,
    this.status,
  });

  factory PlanSummary.fromJson(Map<String, dynamic> json) {
    return PlanSummary(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      type: _parsePlanType(json['type']),
      progress: (json['progress'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] ?? '',
      endDate: json['endDate'] ?? '',
      totalSessions: (json['totalSessions'] as num?)?.toInt() ?? 0,
      completedSessions: (json['completedSessions'] as num?)?.toInt() ?? 0,
      averagePerformance: (json['averagePerformance'] as num?)?.toDouble(),
      status: json['status'],
    );
  }

  static PlanType _parsePlanType(String? typeString) {
    if (typeString == null) return PlanType.MONTHLY;

    switch (typeString.toUpperCase()) {
      case 'DAILY':
        return PlanType.DAILY;
      case 'WEEKLY':
        return PlanType.WEEKLY;
      case 'MONTHLY':
        return PlanType.MONTHLY;
      case 'HOLIDAY':
        return PlanType.HOLIDAY;
      case 'LONG_TERM':
        return PlanType.LONG_TERM;
      case 'THREE_DAY':
        return PlanType.THREE_DAY;
      default:
        return PlanType.MONTHLY;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'type': type.toString().split('.').last,
      'progress': progress,
      'createdAt': createdAt,
      'endDate': endDate,
      'totalSessions': totalSessions,
      'completedSessions': completedSessions,
      'averagePerformance': averagePerformance,
      'status': status,
    };
  }

  @override
  String toString() {
    return 'PlanSummary(id: $id, title: $title, type: $type, progress: $progress, totalSessions: $totalSessions, completedSessions: $completedSessions)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is PlanSummary &&
        other.id == id &&
        other.title == title &&
        other.type == type &&
        other.progress == progress;
  }

  @override
  int get hashCode {
    return id.hashCode ^ title.hashCode ^ type.hashCode ^ progress.hashCode;
  }

  // Helper methods for UI
  String get progressText => '$progress%';

  String get sessionsText => '$completedSessions/$totalSessions';

  double get progressRatio =>
      totalSessions > 0 ? completedSessions / totalSessions : 0.0;

  String get averagePerformanceText => averagePerformance != null
      ? '${averagePerformance!.toStringAsFixed(1)}%'
      : 'N/A';

  bool get isActive => status == 'active';

  bool get isCompleted => status == 'completed';

  bool get isPaused => status == 'paused';

  String get typeDisplayName {
    switch (type) {
      case PlanType.DAILY:
        return 'Günlük';
      case PlanType.WEEKLY:
        return 'Haftalık';
      case PlanType.MONTHLY:
        return 'Aylık';
      case PlanType.HOLIDAY:
        return 'Tatil';
      case PlanType.LONG_TERM:
        return 'Uzun Vadeli';
      case PlanType.THREE_DAY:
        return '3 Günlük';
    }
  }

  String get statusDisplayName {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'completed':
        return 'Tamamlandı';
      case 'paused':
        return 'Duraklatıldı';
      default:
        return 'Bilinmiyor';
    }
  }
}
