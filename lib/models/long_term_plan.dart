import 'package:cloud_firestore/cloud_firestore.dart';

class LongTermPlan {
  final String? id;
  final String planTitle;
  final List<Week> weeks;
  final String userId;
  final String grade;
  final String? targetExam;
  final int dailyHours;
  final DateTime createdAt;
  final DateTime updatedAt;

  LongTermPlan({
    this.id,
    required this.planTitle,
    required this.weeks,
    required this.userId,
    required this.grade,
    this.targetExam,
    required this.dailyHours,
    required this.createdAt,
    required this.updatedAt,
  });

  factory LongTermPlan.fromJson(Map<String, dynamic> json) {
    return LongTermPlan.fromMap(json, ''); // documentId is not available here
  }

  factory LongTermPlan.fromMap(Map<String, dynamic> map, String documentId) {
    return LongTermPlan(
      id: documentId,
      planTitle: map['planTitle'] ?? 'Aylık Plan',
      weeks: (map['weeks'] as List<dynamic>?)
              ?.map((weekMap) => Week.fromMap(weekMap as Map<String, dynamic>))
              .toList() ??
          [],
      userId: map['userId'] ?? '',
      grade: map['grade'] ?? '',
      targetExam: map['targetExam'],
      dailyHours: map['dailyHours'] ?? 0,
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  // Helper method to get the plan for a specific day of the year
  Day? getPlanForDay(int dayOfYear) {
    for (var week in weeks) {
      for (var day in week.days) {
        try {
          final date = DateTime.parse(day.date);
          final dateDayOfYear = _dayOfYear(date);
          if (dateDayOfYear == dayOfYear) {
            return day;
          }
        } catch (e) {
          // Tarih formatı yanlışsa bu günü atla
          print("Geçersiz tarih formatı: ${day.date}");
        }
      }
    }
    return null;
  }

  static int _dayOfYear(DateTime date) {
    return date.difference(DateTime(date.year, 1, 1)).inDays + 1;
  }
}

class Week {
  final int weekNumber;
  final List<Day> days;

  Week({
    required this.weekNumber,
    required this.days,
  });

  factory Week.fromMap(Map<String, dynamic> map) {
    return Week(
      weekNumber: map['weekNumber'] ?? 0,
      days: (map['days'] as List<dynamic>?)
              ?.map((dayMap) => Day.fromMap(dayMap as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class Day {
  final String day;
  final String date;
  final bool isRestDay;
  final List<DailyTask> dailyTasks;

  Day({
    required this.day,
    required this.date,
    required this.isRestDay,
    required this.dailyTasks,
  });

  factory Day.fromMap(Map<String, dynamic> map) {
    return Day(
      day: map['day'] ?? '',
      date: map['date'] ?? '',
      isRestDay: map['isRestDay'] ?? false,
      dailyTasks: (map['dailyTasks'] as List<dynamic>?)
              ?.map((taskMap) =>
                  DailyTask.fromMap(taskMap as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class DailyTask {
  final String subject;
  final String topic;
  final int durationInMinutes;
  bool isCompleted;
  final FeynmanStep? feynman;

  // Kısmen tamamlanan görevler için süre takibi
  final int completedMinutes; // Tamamlanan dakika
  final int remainingMinutes; // Kalan dakika
  final DateTime? lastStudiedAt; // Son çalışma tarihi
  final bool isPartiallyCompleted; // Kısmen tamamlandı mı?

  DailyTask({
    required this.subject,
    required this.topic,
    required this.durationInMinutes,
    this.isCompleted = false,
    this.feynman,
    this.completedMinutes = 0,
    int? remainingMinutes,
    this.lastStudiedAt,
    this.isPartiallyCompleted = false,
  }) : remainingMinutes = remainingMinutes ?? durationInMinutes;

  factory DailyTask.fromMap(Map<String, dynamic> map) {
    final duration = map['durationInMinutes'] ?? 0;
    final completed = map['completedMinutes'] ?? 0;

    return DailyTask(
      subject: map['subject'] ?? '',
      topic: map['topic'] ?? '',
      durationInMinutes: duration,
      isCompleted: map['isCompleted'] ?? false,
      feynman: map['feynman'] != null
          ? FeynmanStep.fromMap(map['feynman'] as Map<String, dynamic>)
          : null,
      completedMinutes: completed,
      remainingMinutes: map['remainingMinutes'] ?? (duration - completed),
      lastStudiedAt: map['lastStudiedAt'] != null
          ? DateTime.parse(map['lastStudiedAt'])
          : null,
      isPartiallyCompleted: map['isPartiallyCompleted'] ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'subject': subject,
      'topic': topic,
      'durationInMinutes': durationInMinutes,
      'isCompleted': isCompleted,
      'feynman': feynman?.toMap(),
      'completedMinutes': completedMinutes,
      'remainingMinutes': remainingMinutes,
      'lastStudiedAt': lastStudiedAt?.toIso8601String(),
      'isPartiallyCompleted': isPartiallyCompleted,
    };
  }

  /// Görevin tamamlanma yüzdesini hesaplar (0.0 - 1.0 arası)
  double get completionPercentage {
    if (durationInMinutes == 0) return 0.0;
    return (completedMinutes / durationInMinutes).clamp(0.0, 1.0);
  }

  /// Görevin tam olarak tamamlanıp tamamlanmadığını kontrol eder
  bool get isFullyCompleted {
    return isCompleted || completedMinutes >= durationInMinutes;
  }

  /// Kısmen tamamlanan görevi günceller
  DailyTask updateProgress(int studiedMinutes) {
    final newCompletedMinutes =
        (completedMinutes + studiedMinutes).clamp(0, durationInMinutes);
    final newRemainingMinutes = durationInMinutes - newCompletedMinutes;
    final isNowCompleted = newCompletedMinutes >= durationInMinutes;

    return DailyTask(
      subject: subject,
      topic: topic,
      durationInMinutes: durationInMinutes,
      isCompleted: isNowCompleted,
      feynman: feynman,
      completedMinutes: newCompletedMinutes,
      remainingMinutes: newRemainingMinutes,
      lastStudiedAt: DateTime.now(),
      isPartiallyCompleted: newCompletedMinutes > 0 && !isNowCompleted,
    );
  }
}

class FeynmanStep {
  final String explanation;
  final String analogyPrompt;
  final List<QuizQuestion> quiz;

  FeynmanStep({
    required this.explanation,
    required this.analogyPrompt,
    required this.quiz,
  });

  factory FeynmanStep.fromMap(Map<String, dynamic> map) {
    return FeynmanStep(
      explanation: map['explanation'] ?? 'Açıklama bulunamadı.',
      analogyPrompt: map['analogyPrompt'] ?? 'Bu konuyu basitçe anlat.',
      quiz: (map['quiz'] as List<dynamic>?)
              ?.map(
                  (qMap) => QuizQuestion.fromMap(qMap as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'explanation': explanation,
      'analogyPrompt': analogyPrompt,
      'quiz': quiz.map((q) => q.toMap()).toList(),
    };
  }
}

class QuizQuestion {
  final String question;
  final List<String> options;
  final String correctAnswer;

  QuizQuestion({
    required this.question,
    required this.options,
    required this.correctAnswer,
  });

  factory QuizQuestion.fromMap(Map<String, dynamic> map) {
    return QuizQuestion(
      question: map['question'] ?? '',
      options: (map['options'] as List<dynamic>?)?.cast<String>() ?? [],
      correctAnswer: map['correctAnswer'] ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'question': question,
      'options': options,
      'correctAnswer': correctAnswer,
    };
  }
}
