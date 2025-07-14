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

  DailyTask({
    required this.subject,
    required this.topic,
    required this.durationInMinutes,
    this.isCompleted = false,
    this.feynman,
  });

  factory DailyTask.fromMap(Map<String, dynamic> map) {
    return DailyTask(
      subject: map['subject'] ?? '',
      topic: map['topic'] ?? '',
      durationInMinutes: map['durationInMinutes'] ?? 0,
      isCompleted: map['isCompleted'] ?? false,
      feynman: map['feynman'] != null
          ? FeynmanStep.fromMap(map['feynman'] as Map<String, dynamic>)
          : null,
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
              ?.map((qMap) =>
                  QuizQuestion.fromMap(qMap as Map<String, dynamic>))
              .toList() ??
          [],
    );
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
}
