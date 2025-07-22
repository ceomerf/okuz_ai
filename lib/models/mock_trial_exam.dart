// JWT Backend için Mock Trial Exam Modeli
// Firebase bağımlılığı tamamen kaldırıldı

class MockTrialExam {
  final String id;
  final String title;
  final String description;
  final List<String> subjects;
  final int totalQuestions;
  final int durationInMinutes;
  final DateTime createdAt;
  final DateTime scheduledAt;
  final bool isCompleted;
  final Map<String, dynamic>? results;

  MockTrialExam({
    required this.id,
    required this.title,
    required this.description,
    required this.subjects,
    required this.totalQuestions,
    required this.durationInMinutes,
    required this.createdAt,
    required this.scheduledAt,
    this.isCompleted = false,
    this.results,
  });

  factory MockTrialExam.fromJson(Map<String, dynamic> json) {
    return MockTrialExam(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      subjects: List<String>.from(json['subjects'] ?? []),
      totalQuestions: json['totalQuestions'] ?? 0,
      durationInMinutes: json['durationInMinutes'] ?? 0,
      createdAt: json['createdAt'] is String
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      scheduledAt: json['scheduledAt'] is String
          ? DateTime.parse(json['scheduledAt'])
          : DateTime.now(),
      isCompleted: json['isCompleted'] ?? false,
      results: json['results'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'subjects': subjects,
      'totalQuestions': totalQuestions,
      'durationInMinutes': durationInMinutes,
      'createdAt': createdAt.toIso8601String(),
      'scheduledAt': scheduledAt.toIso8601String(),
      'isCompleted': isCompleted,
      'results': results,
    };
  }
}

/// Ders bazında sonuçları temsil eden sınıf
class SubjectResult {
  final String subject; // Ders adı
  final int correctCount; // Doğru sayısı
  final int incorrectCount; // Yanlış sayısı
  final int emptyCount; // Boş sayısı
  final int totalQuestions; // Toplam soru sayısı
  final double netScore; // Net puan
  final Map<String, TopicResult> topicResults; // Konu bazında sonuçlar

  SubjectResult({
    required this.subject,
    required this.correctCount,
    required this.incorrectCount,
    required this.emptyCount,
    required this.totalQuestions,
    required this.netScore,
    required this.topicResults,
  });

  factory SubjectResult.fromJson(Map<String, dynamic> json) {
    return SubjectResult(
      subject: json['subject'] ?? '',
      correctCount: json['correctCount'] ?? 0,
      incorrectCount: json['incorrectCount'] ?? 0,
      emptyCount: json['emptyCount'] ?? 0,
      totalQuestions: json['totalQuestions'] ?? 0,
      netScore: (json['netScore'] ?? 0.0).toDouble(),
      topicResults: (json['topicResults'] as Map<String, dynamic>?)?.map(
            (key, value) => MapEntry(key, TopicResult.fromJson(value)),
          ) ??
          {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'subject': subject,
      'correctCount': correctCount,
      'incorrectCount': incorrectCount,
      'emptyCount': emptyCount,
      'totalQuestions': totalQuestions,
      'netScore': netScore,
      'topicResults':
          topicResults.map((key, value) => MapEntry(key, value.toJson())),
    };
  }
}

/// Konu bazında sonuçları temsil eden sınıf
class TopicResult {
  final String topic; // Konu adı
  final int correctCount; // Doğru sayısı
  final int incorrectCount; // Yanlış sayısı
  final int emptyCount; // Boş sayısı
  final int totalQuestions; // Toplam soru sayısı
  final double netScore; // Net puan

  TopicResult({
    required this.topic,
    required this.correctCount,
    required this.incorrectCount,
    required this.emptyCount,
    required this.totalQuestions,
    required this.netScore,
  });

  factory TopicResult.fromJson(Map<String, dynamic> json) {
    return TopicResult(
      topic: json['topic'] ?? '',
      correctCount: json['correctCount'] ?? 0,
      incorrectCount: json['incorrectCount'] ?? 0,
      emptyCount: json['emptyCount'] ?? 0,
      totalQuestions: json['totalQuestions'] ?? 0,
      netScore: (json['netScore'] ?? 0.0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'topic': topic,
      'correctCount': correctCount,
      'incorrectCount': incorrectCount,
      'emptyCount': emptyCount,
      'totalQuestions': totalQuestions,
      'netScore': netScore,
    };
  }
}

/// Yanlış yapılan soruları temsil eden sınıf
class WrongQuestion {
  final String questionId;
  final String subject; // Ders adı
  final String topic; // Konu adı
  final String subtopic; // Alt konu adı (opsiyonel)
  final String questionText; // Soru metni
  final int questionNumber; // Soru numarası
  final String selectedOption; // Seçilen şık
  final String correctOption; // Doğru şık
  final String explanation; // Açıklama
  final String difficulty; // Zorluk seviyesi (kolay, orta, zor)
  final int timeSpent; // Harcanan süre (saniye)
  final String imageUrl; // Soru görseli (opsiyonel)

  WrongQuestion({
    required this.questionId,
    required this.subject,
    required this.topic,
    this.subtopic = '',
    required this.questionText,
    required this.questionNumber,
    required this.selectedOption,
    required this.correctOption,
    this.explanation = '',
    this.difficulty = 'medium',
    this.timeSpent = 0,
    this.imageUrl = '',
  });

  factory WrongQuestion.fromJson(Map<String, dynamic> json) {
    return WrongQuestion(
      questionId: json['questionId'] ?? '',
      subject: json['subject'] ?? '',
      topic: json['topic'] ?? '',
      subtopic: json['subtopic'] ?? '',
      questionText: json['questionText'] ?? '',
      questionNumber: json['questionNumber'] ?? 0,
      selectedOption: json['selectedOption'] ?? '',
      correctOption: json['correctOption'] ?? '',
      explanation: json['explanation'] ?? '',
      difficulty: json['difficulty'] ?? 'medium',
      timeSpent: json['timeSpent'] ?? 0,
      imageUrl: json['imageUrl'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'questionId': questionId,
      'subject': subject,
      'topic': topic,
      'subtopic': subtopic,
      'questionText': questionText,
      'questionNumber': questionNumber,
      'selectedOption': selectedOption,
      'correctOption': correctOption,
      'explanation': explanation,
      'difficulty': difficulty,
      'timeSpent': timeSpent,
      'imageUrl': imageUrl,
    };
  }
}
