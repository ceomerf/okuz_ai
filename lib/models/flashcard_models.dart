class Flashcard {
  final String id;
  final String front;
  final String back;

  Flashcard({
    required this.id,
    required this.front,
    required this.back,
  });

  factory Flashcard.fromJson(Map<String, dynamic> json) {
    return Flashcard(
      id: json['id'] ?? '',
      front: json['front'] ?? '',
      back: json['back'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'front': front,
      'back': back,
    };
  }
}

class FlashcardSet {
  final String id;
  final String topic;
  final String difficulty;
  final int cardCount;
  final DateTime createdAt;
  final List<Flashcard> flashcards;

  FlashcardSet({
    required this.id,
    required this.topic,
    required this.difficulty,
    required this.cardCount,
    required this.createdAt,
    required this.flashcards,
  });

  factory FlashcardSet.fromJson(Map<String, dynamic> json) {
    return FlashcardSet(
      id: json['id'] ?? '',
      topic: json['topic'] ?? '',
      difficulty: json['difficulty'] ?? '',
      cardCount: json['cardCount'] ?? 0,
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      flashcards: (json['flashcards'] as List<dynamic>?)
              ?.map((card) => Flashcard.fromJson(card))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'topic': topic,
      'difficulty': difficulty,
      'cardCount': cardCount,
      'createdAt': createdAt.toIso8601String(),
      'flashcards': flashcards.map((card) => card.toJson()).toList(),
    };
  }
}

class FlashcardSetHistory {
  final String id;
  final String topic;
  final String difficulty;
  final int cardCount;
  final DateTime createdAt;

  FlashcardSetHistory({
    required this.id,
    required this.topic,
    required this.difficulty,
    required this.cardCount,
    required this.createdAt,
  });

  factory FlashcardSetHistory.fromJson(Map<String, dynamic> json) {
    return FlashcardSetHistory(
      id: json['id'] ?? '',
      topic: json['topic'] ?? '',
      difficulty: json['difficulty'] ?? '',
      cardCount: json['cardCount'] ?? 0,
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'topic': topic,
      'difficulty': difficulty,
      'cardCount': cardCount,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class CreateFlashcardsRequest {
  final String sourceText;
  final String topic;
  final int cardCount;
  final String difficulty;
  final String? selectedGrade;
  final String? selectedSubject;
  final String? selectedTopic;

  CreateFlashcardsRequest({
    required this.sourceText,
    required this.topic,
    required this.cardCount,
    required this.difficulty,
    this.selectedGrade,
    this.selectedSubject,
    this.selectedTopic,
  });

  Map<String, dynamic> toJson() {
    return {
      'sourceText': sourceText,
      'topic': topic,
      'cardCount': cardCount,
      'difficulty': difficulty,
      'selectedGrade': selectedGrade,
      'selectedSubject': selectedSubject,
      'selectedTopic': selectedTopic,
    };
  }
}

class CreateFlashcardsResponse {
  final bool success;
  final String setId;
  final List<Flashcard> flashcards;

  CreateFlashcardsResponse({
    required this.success,
    required this.setId,
    required this.flashcards,
  });

  factory CreateFlashcardsResponse.fromJson(Map<String, dynamic> json) {
    // Backend'den gelen response'da flashcards bir obje içinde
    List<dynamic> flashcardsList = [];
    
    if (json['flashcards'] != null) {
      if (json['flashcards'] is Map<String, dynamic>) {
        // Eğer flashcards bir obje ise, içindeki flashcards array'ini al
        final flashcardsObj = json['flashcards'] as Map<String, dynamic>;
        flashcardsList = flashcardsObj['flashcards'] as List<dynamic>? ?? [];
      } else if (json['flashcards'] is List<dynamic>) {
        // Eğer flashcards direkt bir array ise
        flashcardsList = json['flashcards'] as List<dynamic>;
      }
    }
    
    return CreateFlashcardsResponse(
      success: json['success'] ?? false,
      setId: json['setId'] ?? '',
      flashcards: flashcardsList
              .map((card) => Flashcard.fromJson(card))
              .toList(),
    );
  }
} 