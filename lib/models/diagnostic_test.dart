class DiagnosticQuestion {
  final String id;
  final String subject; // Matematik, Fizik, Türkçe vb.
  final String questionText;
  final List<String> options;
  final int correctOptionIndex;
  final String explanation;
  final String difficulty; // 'easy', 'medium', 'hard'
  final String topic; // Konusu (örn: Fonksiyonlar, Vektörler, Paragraf)

  DiagnosticQuestion({
    required this.id,
    required this.subject,
    required this.questionText,
    required this.options,
    required this.correctOptionIndex,
    required this.explanation,
    required this.difficulty,
    required this.topic,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'subject': subject,
      'questionText': questionText,
      'options': options,
      'correctOptionIndex': correctOptionIndex,
      'explanation': explanation,
      'difficulty': difficulty,
      'topic': topic,
    };
  }

  factory DiagnosticQuestion.fromJson(Map<String, dynamic> json) {
    return DiagnosticQuestion(
      id: json['id'],
      subject: json['subject'],
      questionText: json['questionText'],
      options: List<String>.from(json['options']),
      correctOptionIndex: json['correctOptionIndex'],
      explanation: json['explanation'],
      difficulty: json['difficulty'],
      topic: json['topic'],
    );
  }
}

class DiagnosticTest {
  final String id;
  final String title;
  final String description;
  final List<DiagnosticQuestion> questions;

  DiagnosticTest({
    required this.id,
    required this.title,
    required this.description,
    required this.questions,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'questions': questions.map((q) => q.toJson()).toList(),
    };
  }

  factory DiagnosticTest.fromJson(Map<String, dynamic> json) {
    return DiagnosticTest(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      questions: (json['questions'] as List)
          .map((q) => DiagnosticQuestion.fromJson(q))
          .toList(),
    );
  }
}

class QuestionResult {
  final String questionId;
  final String subject;
  final String topic;
  final bool isCorrect;
  final int selectedOptionIndex;
  final int timeSpent; // Saniye cinsinden

  QuestionResult({
    required this.questionId,
    required this.subject,
    required this.topic,
    required this.isCorrect,
    required this.selectedOptionIndex,
    required this.timeSpent,
  });

  Map<String, dynamic> toJson() {
    return {
      'questionId': questionId,
      'subject': subject,
      'topic': topic,
      'isCorrect': isCorrect,
      'selectedOptionIndex': selectedOptionIndex,
      'timeSpent': timeSpent,
    };
  }
}

class TestResult {
  final String testId;
  final String userId;
  final DateTime completedAt;
  final List<QuestionResult> questions;
  final int totalTimeSpent; // Saniye cinsinden

  TestResult({
    required this.testId,
    required this.userId,
    required this.completedAt,
    required this.questions,
    required this.totalTimeSpent,
  });

  Map<String, dynamic> toJson() {
    return {
      'testId': testId,
      'userId': userId,
      'completedAt': completedAt.toIso8601String(),
      'questions': questions.map((q) => q.toJson()).toList(),
      'totalTimeSpent': totalTimeSpent,
    };
  }
}

// Örnek teşhis sınavı verileri
class DiagnosticTestData {
  static DiagnosticTest getMathTest() {
    return DiagnosticTest(
      id: 'math_diagnostic_1',
      title: 'Matematik Teşhis Sınavı',
      description: 'Bu kısa sınav matematik konularındaki seviyenizi belirlemek için tasarlanmıştır.',
      questions: [
        DiagnosticQuestion(
          id: 'math_q1',
          subject: 'Matematik',
          questionText: 'f(x) = 2x + 3 ve g(x) = x² - 1 fonksiyonları için (f∘g)(2) değeri nedir?',
          options: ['7', '9', '11', '13'],
          correctOptionIndex: 1, // 9
          explanation: 'f(g(2)) = f(2² - 1) = f(3) = 2(3) + 3 = 9',
          difficulty: 'medium',
          topic: 'Fonksiyonlar',
        ),
        DiagnosticQuestion(
          id: 'math_q2',
          subject: 'Matematik',
          questionText: 'log₃(27) değeri nedir?',
          options: ['2', '3', '4', '9'],
          correctOptionIndex: 1, // 3
          explanation: 'log₃(27) = log₃(3³) = 3',
          difficulty: 'medium',
          topic: 'Logaritma',
        ),
        DiagnosticQuestion(
          id: 'math_q3',
          subject: 'Matematik',
          questionText: '3x² - 12x + 9 = 0 denkleminin kökleri nelerdir?',
          options: ['x = 1 ve x = 3', 'x = 1 ve x = 9', 'x = 2 ve x = 1.5', 'x = 1 ve x = -3'],
          correctOptionIndex: 0, // x = 1 ve x = 3
          explanation: '3x² - 12x + 9 = 3(x² - 4x + 3) = 3(x - 1)(x - 3) = 0, x = 1 veya x = 3',
          difficulty: 'medium',
          topic: 'İkinci Dereceden Denklemler',
        ),
      ],
    );
  }

  static DiagnosticTest getPhysicsTest() {
    return DiagnosticTest(
      id: 'physics_diagnostic_1',
      title: 'Fizik Teşhis Sınavı',
      description: 'Bu kısa sınav fizik konularındaki seviyenizi belirlemek için tasarlanmıştır.',
      questions: [
        DiagnosticQuestion(
          id: 'physics_q1',
          subject: 'Fizik',
          questionText: 'Bir cismin ivmesi hangi durumda sıfır olur?',
          options: [
            'Cisim hareket etmiyorsa',
            'Cismin hızı sabit ise',
            'Cisim düşüyorsa',
            'Cisim yavaşlıyorsa'
          ],
          correctOptionIndex: 1, // Cismin hızı sabit ise
          explanation: 'İvme, hızın zamana göre değişimidir. Hız sabit ise ivme sıfırdır.',
          difficulty: 'easy',
          topic: 'Hareket',
        ),
        DiagnosticQuestion(
          id: 'physics_q2',
          subject: 'Fizik',
          questionText: 'Bir elektrik devresinde direncin birimi nedir?',
          options: ['Volt', 'Amper', 'Ohm', 'Watt'],
          correctOptionIndex: 2, // Ohm
          explanation: 'Elektrik direncinin birimi Ohm (Ω) dur.',
          difficulty: 'easy',
          topic: 'Elektrik',
        ),
      ],
    );
  }

  static DiagnosticTest getTurkishTest() {
    return DiagnosticTest(
      id: 'turkish_diagnostic_1',
      title: 'Türkçe Teşhis Sınavı',
      description: 'Bu kısa sınav Türkçe konularındaki seviyenizi belirlemek için tasarlanmıştır.',
      questions: [
        DiagnosticQuestion(
          id: 'turkish_q1',
          subject: 'Türkçe',
          questionText: '"Çocuk, annesinin söylediklerini dikkatlice dinledi." cümlesinde hangi öge yoktur?',
          options: ['Özne', 'Nesne', 'Yüklem', 'Dolaylı Tümleç'],
          correctOptionIndex: 3, // Dolaylı Tümleç
          explanation: 'Cümlede özne (çocuk), nesne (söylediklerini), yüklem (dinledi) vardır ancak dolaylı tümleç yoktur.',
          difficulty: 'medium',
          topic: 'Cümlenin Ögeleri',
        ),
        DiagnosticQuestion(
          id: 'turkish_q2',
          subject: 'Türkçe',
          questionText: '"Kitap okumayı seviyorum." cümlesinde "kitap okumayı" hangi görevdedir?',
          options: ['Özne', 'Nesne', 'Zarf Tümleci', 'Yer Tamlayıcısı'],
          correctOptionIndex: 1, // Nesne
          explanation: '"Kitap okumayı" isim-fiil grubu olup cümlede nesne görevindedir.',
          difficulty: 'medium',
          topic: 'Fiilimsiler',
        ),
      ],
    );
  }

  static List<DiagnosticTest> getAllTests() {
    return [
      getMathTest(),
      getPhysicsTest(),
      getTurkishTest(),
    ];
  }
} 