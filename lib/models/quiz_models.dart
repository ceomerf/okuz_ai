import 'dart:convert';

// API'den gelen soru verisi için
class QuizQuestion {
  final String id;
  final String questionText;
  final List<String> options;
  final int? correctAnswerIndex;
  final String? explanation;

  QuizQuestion({
    required this.id,
    required this.questionText,
    required this.options,
    this.correctAnswerIndex,
    this.explanation,
  });

  factory QuizQuestion.fromJson(Map<String, dynamic> json) {
    return QuizQuestion(
      id: json['id'],
      questionText: json['questionText'],
      options: List<String>.from(json['options']),
      correctAnswerIndex: json['correctAnswerIndex'],
      explanation: json['explanation'],
    );
  }
}

// Kullanıcının cevabını tutmak için
class UserAnswer {
  final String questionId;
  final int selectedOptionIndex;

  UserAnswer({
    required this.questionId,
    required this.selectedOptionIndex,
  });

  Map<String, dynamic> toJson() => {
        'questionId': questionId,
        'selectedOptionIndex': selectedOptionIndex,
      };
}

// Sonuç ekranı için
class QuizResult {
  final String questionText;
  final List<String> options;
  final int yourAnswerIndex;
  final int correctAnswerIndex;
  final String explanation;

  bool get wasCorrect => yourAnswerIndex == correctAnswerIndex;

  QuizResult({
    required this.questionText,
    required this.options,
    required this.yourAnswerIndex,
    required this.correctAnswerIndex,
    required this.explanation,
  });

  factory QuizResult.fromJson(Map<String, dynamic> json) {
    return QuizResult(
      questionText: json['questionText'],
      options: List<String>.from(json['options']),
      yourAnswerIndex: json['yourAnswerIndex'],
      correctAnswerIndex: json['correctAnswerIndex'],
      explanation: json['explanation'],
    );
  }
}

// Quiz geçmişi için
class QuizHistoryItem {
  final String id;
  final String topic;
  final int score;
  final int totalQuestions;
  final DateTime completedAt;

  QuizHistoryItem({
    required this.id,
    required this.topic,
    required this.score,
    required this.totalQuestions,
    required this.completedAt,
  });

  factory QuizHistoryItem.fromJson(Map<String, dynamic> json) {
    return QuizHistoryItem(
      id: json['id'],
      topic: json['topic'],
      score: json['score'],
      totalQuestions: json['totalQuestions'],
      completedAt: DateTime.parse(json['completedAt']),
    );
  }
}
