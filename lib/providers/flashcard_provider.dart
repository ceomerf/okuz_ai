import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/flashcard_models.dart';
import '../services/flashcard_service.dart';
import '../services/providers.dart';

// Service Provider
final flashcardServiceProvider = Provider<FlashcardService>((ref) {
  final api = ref.read(apiClientProvider);
  return FlashcardService(api);
});

// State Notifier Provider
final flashcardProvider = StateNotifierProvider<FlashcardNotifier, FlashcardState>((ref) {
  return FlashcardNotifier(ref.read(flashcardServiceProvider));
});

// State classes
abstract class FlashcardState {}

class FlashcardInitial extends FlashcardState {}

class FlashcardLoading extends FlashcardState {}

class FlashcardLoaded extends FlashcardState {
  final String setId;
  final List<Flashcard> cards;
  
  FlashcardLoaded({required this.setId, required this.cards});
}

class FlashcardError extends FlashcardState {
  final String message;
  
  FlashcardError(this.message);
}

class FlashcardSetsLoaded extends FlashcardState {
  final List<FlashcardSetHistory> sets;
  
  FlashcardSetsLoaded({required this.sets});
}

class FlashcardSetDetailLoaded extends FlashcardState {
  final FlashcardSet set;
  
  FlashcardSetDetailLoaded({required this.set});
}

// Notifier
class FlashcardNotifier extends StateNotifier<FlashcardState> {
  final FlashcardService _flashcardService;

  FlashcardNotifier(this._flashcardService) : super(FlashcardInitial());

  Future<void> createFlashcards({
    required String sourceText,
    required String topic,
    required int cardCount,
    required String difficulty,
    String? selectedGrade,
    String? selectedSubject,
    String? selectedTopic,
  }) async {
    state = FlashcardLoading();
    
    try {
      final request = CreateFlashcardsRequest(
        sourceText: sourceText,
        topic: topic,
        cardCount: cardCount,
        difficulty: difficulty,
        selectedGrade: selectedGrade,
        selectedSubject: selectedSubject,
        selectedTopic: selectedTopic,
      );
      
      final response = await _flashcardService.createFlashcards(request);
      
      if (response.success) {
        state = FlashcardLoaded(
          setId: response.setId,
          cards: response.flashcards,
        );
      } else {
        state = FlashcardError('Flashcard oluşturulamadı');
      }
    } catch (e) {
      state = FlashcardError('Flashcard oluşturulurken bir hata oluştu: $e');
    }
  }

  Future<void> loadFlashcardSets() async {
    state = FlashcardLoading();
    
    try {
      final sets = await _flashcardService.getFlashcardSets();
      state = FlashcardSetsLoaded(sets: sets);
    } catch (e) {
      state = FlashcardError('Flashcard setleri yüklenirken bir hata oluştu: $e');
    }
  }

  Future<void> loadFlashcardSetById(String setId) async {
    state = FlashcardLoading();
    
    try {
      final flashcardSet = await _flashcardService.getFlashcardSetById(setId);
      if (flashcardSet != null) {
        state = FlashcardSetDetailLoaded(set: flashcardSet);
      } else {
        state = FlashcardError('Flashcard set bulunamadı');
      }
    } catch (e) {
      state = FlashcardError('Flashcard set detayı yüklenirken bir hata oluştu: $e');
    }
  }

  void reset() {
    state = FlashcardInitial();
  }
} 