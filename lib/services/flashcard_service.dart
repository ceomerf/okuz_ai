import '../models/flashcard_models.dart';
import 'api_client.dart';

class FlashcardService {
  final ApiClient _apiClient;
  FlashcardService(this._apiClient);

  // Flashcard oluştur
  Future<CreateFlashcardsResponse> createFlashcards(
    CreateFlashcardsRequest request,
  ) async {
    try {
      final response = await _apiClient.post(
        '/smart-tools/flashcards-generator',
        request.toJson(),
      );
      return CreateFlashcardsResponse.fromJson(response);
    } catch (e) {
      throw Exception('Flashcard oluşturulurken bir hata oluştu: $e');
    }
  }

  // Kullanıcının flashcard setlerini getir
  Future<List<FlashcardSetHistory>> getFlashcardSets() async {
    try {
      // Backend'de bu endpoint mevcut değil, geçici olarak boş liste döndür
      return [];
    } catch (e) {
      throw Exception('Flashcard setleri alınırken bir hata oluştu: $e');
    }
  }

  // Belirli bir flashcard setini getir
  Future<FlashcardSet?> getFlashcardSetById(String setId) async {
    try {
      // Backend'de bu endpoint mevcut değil, geçici olarak null döndür
      return null;
    } catch (e) {
      throw Exception('Flashcard set detayı alınırken bir hata oluştu: $e');
    }
  }
} 