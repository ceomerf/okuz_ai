import 'package:flutter/foundation.dart';

class PerformanceDashboardData {
  final Summary summary;
  final PerformanceSection performance;
  final Distributions distributions;
  final List<ActivityLog> activity;
  final Insights? insights;
  final Comparative? comparative;

  const PerformanceDashboardData({
    required this.summary,
    required this.performance,
    required this.distributions,
    required this.activity,
    this.insights,
    this.comparative,
  });

  factory PerformanceDashboardData.fromJson(Map<String, dynamic> json) {
    return PerformanceDashboardData(
      summary: Summary.fromJson((json['summary'] as Map<String, dynamic>? ?? {})),
      performance: PerformanceSection.fromJson((json['performance'] as Map<String, dynamic>? ?? {})),
      distributions: Distributions.fromJson((json['distributions'] as Map<String, dynamic>? ?? {})),
      activity: ((json['activity'] as List<dynamic>? ?? const []))
          .whereType<Map<String, dynamic>>()
          .map(ActivityLog.fromJson)
          .toList(growable: false),
      insights: json['insights'] is Map<String, dynamic>
          ? Insights.fromJson(json['insights'] as Map<String, dynamic>)
          : null,
      comparative: json['comparative'] is Map<String, dynamic>
          ? Comparative.fromJson(json['comparative'] as Map<String, dynamic>)
          : null,
    );
  }
}

class Summary {
  final double overallScore;
  final double? improvement;
  final double? consistency;
  final int? studyStreak;
  final double? totalStudyHours;

  const Summary({
    required this.overallScore,
    this.improvement,
    this.consistency,
    this.studyStreak,
    this.totalStudyHours,
  });

  factory Summary.fromJson(Map<String, dynamic> json) {
    double toDouble(dynamic v) {
      if (v == null) return 0.0;
      if (v is num) return v.toDouble();
      return double.tryParse(v.toString()) ?? 0.0;
    }

    return Summary(
      overallScore: toDouble(json['overallScore'] ?? json['overall'] ?? 0),
      improvement: (json['improvement'] is num)
          ? (json['improvement'] as num).toDouble()
          : double.tryParse('${json['improvement']}'),
      consistency: (json['consistency'] is num)
          ? (json['consistency'] as num).toDouble()
          : double.tryParse('${json['consistency']}'),
      studyStreak: json['studyStreak'] is num ? (json['studyStreak'] as num).toInt() : null,
      totalStudyHours: (json['totalStudyHours'] is num)
          ? (json['totalStudyHours'] as num).toDouble()
          : double.tryParse('${json['totalStudyHours']}'),
    );
  }
}

class PerformanceSection {
  final List<SubjectPerformance> subjects;
  final Trends trends;
  final List<Goal> goals;

  const PerformanceSection({
    required this.subjects,
    required this.trends,
    required this.goals,
  });

  factory PerformanceSection.fromJson(Map<String, dynamic> json) {
    return PerformanceSection(
      subjects: ((json['subjects'] as List<dynamic>? ?? const []))
          .whereType<Map<String, dynamic>>()
          .map(SubjectPerformance.fromJson)
          .toList(growable: false),
      trends: Trends.fromJson((json['trends'] as Map<String, dynamic>? ?? {})),
      goals: ((json['goals'] as List<dynamic>? ?? const []))
          .whereType<Map<String, dynamic>>()
          .map(Goal.fromJson)
          .toList(growable: false),
    );
  }
}

class Trends {
  final List<WeeklyTrendItem> weekly;
  final List<DailyPatternItem> daily;
  final List<MonthlyProgressItem> monthly;

  const Trends({
    required this.weekly,
    required this.daily,
    required this.monthly,
  });

  factory Trends.fromJson(Map<String, dynamic> json) {
    return Trends(
      weekly: ((json['weekly'] as List<dynamic>? ?? const []))
          .whereType<Map<String, dynamic>>()
          .map(WeeklyTrendItem.fromJson)
          .toList(growable: false),
      daily: ((json['daily'] as List<dynamic>? ?? const []))
          .whereType<Map<String, dynamic>>()
          .map(DailyPatternItem.fromJson)
          .toList(growable: false),
      monthly: ((json['monthly'] as List<dynamic>? ?? const []))
          .whereType<Map<String, dynamic>>()
          .map(MonthlyProgressItem.fromJson)
          .toList(growable: false),
    );
  }
}

class WeeklyTrendItem {
  final int week;
  final double totalHours;
  final int sessions;
  final int averagePerformance;

  const WeeklyTrendItem({
    required this.week,
    required this.totalHours,
    required this.sessions,
    required this.averagePerformance,
  });

  factory WeeklyTrendItem.fromJson(Map<String, dynamic> json) {
    return WeeklyTrendItem(
      week: (json['week'] as num?)?.toInt() ?? 0,
      totalHours: (json['totalHours'] is num) ? (json['totalHours'] as num).toDouble() : 0.0,
      sessions: (json['sessions'] as num?)?.toInt() ?? 0,
      averagePerformance: (json['averagePerformance'] as num?)?.toInt() ?? 0,
    );
  }
}

class DailyPatternItem {
  final String day;
  final int averageTime;
  final int totalSessions;
  final int averagePerformance;

  const DailyPatternItem({
    required this.day,
    required this.averageTime,
    required this.totalSessions,
    required this.averagePerformance,
  });

  factory DailyPatternItem.fromJson(Map<String, dynamic> json) {
    return DailyPatternItem(
      day: (json['day'] ?? '').toString(),
      averageTime: (json['averageTime'] as num?)?.toInt() ?? 0,
      totalSessions: (json['totalSessions'] as num?)?.toInt() ?? 0,
      averagePerformance: (json['averagePerformance'] as num?)?.toInt() ?? 0,
    );
  }
}

class MonthlyProgressItem {
  final String month; // YYYY-MM
  final double totalHours;
  final int sessions;
  final int averagePerformance;

  const MonthlyProgressItem({
    required this.month,
    required this.totalHours,
    required this.sessions,
    required this.averagePerformance,
  });

  factory MonthlyProgressItem.fromJson(Map<String, dynamic> json) {
    return MonthlyProgressItem(
      month: (json['month'] ?? '').toString(),
      totalHours: (json['totalHours'] is num) ? (json['totalHours'] as num).toDouble() : 0.0,
      sessions: (json['sessions'] as num?)?.toInt() ?? 0,
      averagePerformance: (json['averagePerformance'] as num?)?.toInt() ?? 0,
    );
  }
}

class SubjectPerformance {
  final String subject;
  final int averageScore;
  final int totalExams;
  final DateTime? lastExam;
  final String? trend;
  final double? consistency;
  final String? recommendation;

  const SubjectPerformance({
    required this.subject,
    required this.averageScore,
    required this.totalExams,
    this.lastExam,
    this.trend,
    this.consistency,
    this.recommendation,
  });

  factory SubjectPerformance.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      try {
        return DateTime.parse(v.toString());
      } catch (_) {
        return null;
      }
    }

    return SubjectPerformance(
      subject: (json['subject'] ?? 'Genel').toString(),
      averageScore: (json['averageScore'] as num?)?.toInt() ?? 0,
      totalExams: (json['totalExams'] as num?)?.toInt() ?? 0,
      lastExam: parseDate(json['lastExam']),
      trend: json['trend']?.toString(),
      consistency: (json['consistency'] is num) ? (json['consistency'] as num).toDouble() : null,
      recommendation: json['recommendation']?.toString(),
    );
  }
}

class Goal {
  final String id;
  final String title;
  final int target;
  final int current;
  final int progress;
  final String unit;
  final DateTime? deadline;
  final bool isCompleted;
  final int? daysRemaining;
  final String status;

  const Goal({
    required this.id,
    required this.title,
    required this.target,
    required this.current,
    required this.progress,
    required this.unit,
    this.deadline,
    required this.isCompleted,
    this.daysRemaining,
    required this.status,
  });

  factory Goal.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      try {
        return DateTime.parse(v.toString());
      } catch (_) {
        return null;
      }
    }

    return Goal(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      target: (json['target'] as num?)?.toInt() ?? 0,
      current: (json['current'] as num?)?.toInt() ?? 0,
      progress: (json['progress'] as num?)?.toInt() ?? 0,
      unit: (json['unit'] ?? '').toString(),
      deadline: parseDate(json['deadline']),
      isCompleted: (json['isCompleted'] as bool?) ?? false,
      daysRemaining: (json['daysRemaining'] as num?)?.toInt(),
      status: (json['status'] ?? '').toString(),
    );
  }
}

class Distributions {
  final List<WeeklyDistributionItem> weekly;
  final List<SubjectTimeDistributionItem> subjectsTime;

  const Distributions({
    required this.weekly,
    required this.subjectsTime,
  });

  factory Distributions.fromJson(Map<String, dynamic> json) {
    return Distributions(
      weekly: ((json['weekly'] as List<dynamic>? ?? const []))
          .whereType<Map<String, dynamic>>()
          .map(WeeklyDistributionItem.fromJson)
          .toList(growable: false),
      subjectsTime: ((json['subjectsTime'] as List<dynamic>? ?? const []))
          .whereType<Map<String, dynamic>>()
          .map(SubjectTimeDistributionItem.fromJson)
          .toList(growable: false),
    );
  }
}

class WeeklyDistributionItem {
  final String day;
  final int minutes;
  final int completed;
  final int total;

  const WeeklyDistributionItem({
    required this.day,
    required this.minutes,
    required this.completed,
    required this.total,
  });

  factory WeeklyDistributionItem.fromJson(Map<String, dynamic> json) {
    return WeeklyDistributionItem(
      day: (json['day'] ?? '').toString(),
      minutes: (json['minutes'] as num?)?.toInt() ?? 0,
      completed: (json['completed'] as num?)?.toInt() ?? 0,
      total: (json['total'] as num?)?.toInt() ?? 0,
    );
  }
}

class SubjectTimeDistributionItem {
  final String subject;
  final int minutes;
  final int completedMinutes;
  final int count;

  const SubjectTimeDistributionItem({
    required this.subject,
    required this.minutes,
    required this.completedMinutes,
    required this.count,
  });

  factory SubjectTimeDistributionItem.fromJson(Map<String, dynamic> json) {
    return SubjectTimeDistributionItem(
      subject: (json['subject'] ?? 'Genel').toString(),
      minutes: (json['minutes'] as num?)?.toInt() ?? 0,
      completedMinutes: (json['completedMinutes'] as num?)?.toInt() ?? 0,
      count: (json['count'] as num?)?.toInt() ?? 0,
    );
  }
}

class ActivityLog {
  final String id;
  final String activity;
  final int duration;
  final DateTime timestamp;
  final bool? completed;
  final int? performance;

  const ActivityLog({
    required this.id,
    required this.activity,
    required this.duration,
    required this.timestamp,
    this.completed,
    this.performance,
  });

  factory ActivityLog.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic v) {
      try {
        return DateTime.parse(v.toString());
      } catch (_) {
        return DateTime.now();
      }
    }

    return ActivityLog(
      id: (json['id'] ?? '').toString(),
      activity: (json['activity'] ?? '').toString(),
      duration: (json['duration'] as num?)?.toInt() ?? 0,
      timestamp: parseDate(json['timestamp']),
      completed: json['completed'] as bool?,
      performance: (json['performance'] as num?)?.toInt(),
    );
  }
}

class Insights {
  final List<dynamic>? strengths;
  final List<dynamic>? improvements;
  final List<dynamic>? recommendations;

  const Insights({this.strengths, this.improvements, this.recommendations});

  factory Insights.fromJson(Map<String, dynamic> json) {
    return Insights(
      strengths: (json['strengths'] as List<dynamic>?),
      improvements: (json['improvements'] as List<dynamic>?),
      recommendations: (json['recommendations'] as List<dynamic>?),
    );
  }
}

class Comparative {
  final PeerComparison? peer;
  final GeneralComparison? general;

  const Comparative({this.peer, this.general});

  factory Comparative.fromJson(Map<String, dynamic> json) {
    return Comparative(
      peer: json['peer'] is Map<String, dynamic>
          ? PeerComparison.fromJson(json['peer'] as Map<String, dynamic>)
          : null,
      general: json['general'] is Map<String, dynamic>
          ? GeneralComparison.fromJson(json['general'] as Map<String, dynamic>)
          : null,
    );
  }
}

class PeerComparison {
  final int peerCount;
  final int userAverage;
  final int peerAverage;
  final int percentile;
  final String comparison;
  final int ranking;

  const PeerComparison({
    required this.peerCount,
    required this.userAverage,
    required this.peerAverage,
    required this.percentile,
    required this.comparison,
    required this.ranking,
  });

  factory PeerComparison.fromJson(Map<String, dynamic> json) {
    return PeerComparison(
      peerCount: (json['peerCount'] as num?)?.toInt() ?? 0,
      userAverage: (json['userAverage'] as num?)?.toInt() ?? 0,
      peerAverage: (json['peerAverage'] as num?)?.toInt() ?? 0,
      percentile: (json['percentile'] as num?)?.toInt() ?? 0,
      comparison: (json['comparison'] ?? '').toString(),
      ranking: (json['ranking'] as num?)?.toInt() ?? 0,
    );
  }
}

class GeneralComparison {
  final int totalUsers;
  final int totalExams;
  final int userExamCount;
  final int userAverage;
  final int platformAverage;
  final int userRank;

  const GeneralComparison({
    required this.totalUsers,
    required this.totalExams,
    required this.userExamCount,
    required this.userAverage,
    required this.platformAverage,
    required this.userRank,
  });

  factory GeneralComparison.fromJson(Map<String, dynamic> json) {
    return GeneralComparison(
      totalUsers: (json['totalUsers'] as num?)?.toInt() ?? 0,
      totalExams: (json['totalExams'] as num?)?.toInt() ?? 0,
      userExamCount: (json['userExamCount'] as num?)?.toInt() ?? 0,
      userAverage: (json['userAverage'] as num?)?.toInt() ?? 0,
      platformAverage: (json['platformAverage'] as num?)?.toInt() ?? 0,
      userRank: (json['userRank'] as num?)?.toInt() ?? 0,
    );
  }
}

