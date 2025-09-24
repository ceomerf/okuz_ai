import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/socratic_models.dart';
import '../services/api_service.dart';

// API Service Provider
final apiServiceProvider = Provider((ref) => ApiService());

// Socratic Chat Provider
final socraticChatProvider =
    StateNotifierProvider<SocraticChatNotifier, SocraticChatState>((ref) {
  return SocraticChatNotifier(ref.watch(apiServiceProvider));
});

class SocraticChatNotifier extends StateNotifier<SocraticChatState> {
  final ApiService _apiService;

  SocraticChatNotifier(this._apiService) : super(SocraticChatState()) {
    // Sohbeti başlangıç mesajı ile başlat
    _initializeChat();
  }

  void _initializeChat() {
    final initialMessage = SocraticMessage(
      role: 'model',
      content:
          'Merhaba, ben Sokrat. Bilgini sınamak veya bir konuyu derinlemesine tartışmak için buradayım. Hangi konuyu ele alalım?',
      createdAt: DateTime.now(),
    );
    state = state.copyWith(messages: [initialMessage]);
  }

  Future<void> sendMessage(String message) async {
    // Kullanıcı mesajını anında UI'a ekle
    final userMessage = SocraticMessage(
      role: 'user',
      content: message,
      createdAt: DateTime.now(),
    );

    state = state.copyWith(
      messages: [...state.messages, userMessage],
      isLoading: true,
      suggestedReplies: [], // Önerileri temizle
      error: null,
    );

    try {
      // API'ye istek gönder
      final request = SocraticChatRequest(
        conversationId: state.conversationId,
        message: message,
      );

      final responseData =
          await _apiService.sendSocraticMessage(request.toJson());
      final response = SocraticChatResponse.fromJson(responseData);

      final aiMessage = SocraticMessage(
        role: 'model',
        content: response.aiResponse,
        createdAt: DateTime.now(),
      );

      // AI yanıtını ve yeni önerileri state'e ekle
      state = state.copyWith(
        conversationId: response.conversationId,
        messages: [...state.messages, aiMessage],
        suggestedReplies: response.suggestedReplies,
        isLoading: false,
      );
    } catch (e) {
      // Hata yönetimi
      final errorMessage = SocraticMessage(
        role: 'model',
        content: 'Üzgünüm, bir sorun oluştu. Lütfen tekrar dene.',
        createdAt: DateTime.now(),
      );

      state = state.copyWith(
        messages: [...state.messages, errorMessage],
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  void clearConversation() {
    state = SocraticChatState();
    _initializeChat();
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}
