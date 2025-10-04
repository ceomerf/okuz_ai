import 'dart:async';
import 'dart:convert';
import 'package:equatable/equatable.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/smart_tools_api_service.dart';
import '../models/quick_chat_dto.dart';

class SmartToolsState extends Equatable {
  final String aiResponseText;
  final bool isStreaming;
  final List<Map<String, String>> chatHistory;
  final List<String> suggestedReplies;
  final List<Map<String, dynamic>> toolsList;
  final bool isLoadingTools;
  final List<Map<String, dynamic>> flashcardSets;
  final bool isLoadingFlashcards;
  final Map<String, dynamic>? currentQuiz;
  final bool isLoadingQuiz;
  final String? error;

  const SmartToolsState({
    this.aiResponseText = '',
    this.isStreaming = false,
    this.chatHistory = const [],
    this.suggestedReplies = const [],
    this.toolsList = const [],
    this.isLoadingTools = false,
    this.flashcardSets = const [],
    this.isLoadingFlashcards = false,
    this.currentQuiz,
    this.isLoadingQuiz = false,
    this.error,
  });

  SmartToolsState copyWith({
    String? aiResponseText,
    bool? isStreaming,
    List<Map<String, String>>? chatHistory,
    List<String>? suggestedReplies,
    List<Map<String, dynamic>>? toolsList,
    bool? isLoadingTools,
    List<Map<String, dynamic>>? flashcardSets,
    bool? isLoadingFlashcards,
    Map<String, dynamic>? currentQuiz,
    bool? isLoadingQuiz,
    String? error,
    bool clearError = false,
  }) {
    return SmartToolsState(
      aiResponseText: aiResponseText ?? this.aiResponseText,
      isStreaming: isStreaming ?? this.isStreaming,
      chatHistory: chatHistory ?? this.chatHistory,
      suggestedReplies: suggestedReplies ?? this.suggestedReplies,
      toolsList: toolsList ?? this.toolsList,
      isLoadingTools: isLoadingTools ?? this.isLoadingTools,
      flashcardSets: flashcardSets ?? this.flashcardSets,
      isLoadingFlashcards:
          isLoadingFlashcards ?? this.isLoadingFlashcards,
      currentQuiz: currentQuiz ?? this.currentQuiz,
      isLoadingQuiz: isLoadingQuiz ?? this.isLoadingQuiz,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props => [
        aiResponseText,
        isStreaming,
        chatHistory,
        suggestedReplies,
        toolsList,
        isLoadingTools,
        flashcardSets,
        isLoadingFlashcards,
        currentQuiz,
        isLoadingQuiz,
        error,
      ];
}

class SmartToolsNotifier extends StateNotifier<SmartToolsState> {
  final SmartToolsApiService _apiService;
  StreamSubscription? _streamSubscription;

  SmartToolsNotifier({SmartToolsApiService? apiService})
      : _apiService = apiService ?? SmartToolsApiService(),
        super(const SmartToolsState());

  /// Send message and start streaming response
  Future<void> sendMessageAndStreamResponse({
    required String message,
    String? subject,
    String? grade,
  }) async {
    state = state.copyWith(
      isStreaming: true,
      aiResponseText: '',
      suggestedReplies: [],
      clearError: true,
    );

    // Add user message to chat history
    addNewMessage('user', message);

    try {
      // Cancel any previous subscription
      _streamSubscription?.cancel();

      // Create the request DTO
      final requestDto = QuickChatDto(
        message: message,
        subject: subject,
        grade: grade,
      );

      // Start streaming with the new SSE method
      final stream = await _apiService.quickChatStream(requestDto);

      _streamSubscription = stream.listen(
        (event) {
          try {
            print('📨 SSE Event alındı: ${event.data}');

            // Parse the SSE event data
            final data = jsonDecode(event.data ?? '{}');

            switch (data['type']) {
              case 'STATUS':
                print('📊 Durum: ${data['content']}');
                break;
              case 'TEXT_CHUNK':
                print('📝 Metin chunk: ${data['content']}');
                state = state.copyWith(
                  aiResponseText: state.aiResponseText + (data['content'] ?? ''),
                );
                break;
              case 'METADATA_CHUNK':
                print('📋 Metadata: ${data['content']}');
                // Handle metadata (follow-up questions, etc.)
                final metadata = data['content'];
                if (metadata is Map<String, dynamic>) {
                  if (metadata['followUpQuestions'] != null) {
                    state = state.copyWith(
                      suggestedReplies: List<String>.from(
                        metadata['followUpQuestions'],
                      ),
                    );
                  }
                }
                break;
              case 'ERROR_CHUNK':
                print('❌ Hata: ${data['content']}');
                state = state.copyWith(
                  error: 'AI Hatası: ${data['content']}',
                  isStreaming: false,
                );
                break;
              default:
                print('❓ Bilinmeyen event tipi: ${data['type']}');
            }
          } catch (e) {
            print('❌ SSE event parse hatası: $e');
            state = state.copyWith(
              error: 'Event parse hatası: $e',
              isStreaming: false,
            );
          }
        },
        onError: (error) {
          print('❌ Stream hatası: $error');
          state = state.copyWith(
            error: 'Streaming hatası: ${error.toString()}',
            isStreaming: false,
          );
        },
        onDone: () {
          print('✅ Stream tamamlandı');
          final completedText = state.aiResponseText;
          state = state.copyWith(isStreaming: false);
          if (completedText.isNotEmpty) {
            addNewMessage('ai', completedText);
          }
        },
      );
    } catch (e) {
      print('❌ Stream başlatma hatası: $e');
      state = state.copyWith(
        error: 'Stream başlatma hatası: ${e.toString()}',
        isStreaming: false,
      );
    }
  }

  /// Add new message to chat history
  void addNewMessage(String sender, String message) {
    final updated = List<Map<String, String>>.from(state.chatHistory)
      ..add({
        'sender': sender,
        'message': message,
        'timestamp': DateTime.now().toIso8601String(),
      });
    state = state.copyWith(chatHistory: updated);
  }

  /// Clear chat history
  void clearChatHistory() {
    state = state.copyWith(
      chatHistory: const [],
      aiResponseText: '',
      suggestedReplies: const [],
    );
  }

  /// Get tools list
  Future<void> loadToolsList() async {
    state = state.copyWith(isLoadingTools: true, clearError: true);

    try {
      final result = await _apiService.getToolsList();
      if (result['success'] == true) {
        state = state.copyWith(
          toolsList: List<Map<String, dynamic>>.from(result['tools'] ?? []),
        );
      } else {
        state = state.copyWith(
          error:
              'Araçlar listesi alma hatası: ${result['message'] ?? 'Bilinmeyen hata'}',
        );
      }
    } catch (e) {
      print('❌ Araçlar listesi hatası: $e');
      state = state.copyWith(
        error: 'Araçlar listesi hatası: ${e.toString()}',
      );
    } finally {
      state = state.copyWith(isLoadingTools: false);
    }
  }

  /// Create flashcards
  Future<Map<String, dynamic>?> createFlashcards({
    required String sourceText,
    required String topic,
    required String difficulty,
    required int cardCount,
  }) async {
    try {
      final result = await _apiService.createFlashcards(
        sourceText: sourceText,
        topic: topic,
        difficulty: difficulty,
        cardCount: cardCount,
      );

      if (result['success'] == true) {
        // Refresh flashcard sets
        await loadFlashcardSets();
        return result;
      } else {
        state = state.copyWith(
          error:
              'Flashcard oluşturma hatası: ${result['message'] ?? 'Bilinmeyen hata'}',
        );
        return null;
      }
    } catch (e) {
      print('❌ Flashcard oluşturma hatası: $e');
      state = state.copyWith(
        error: 'Flashcard oluşturma hatası: ${e.toString()}',
      );
      return null;
    }
  }

  /// Load flashcard sets
  Future<void> loadFlashcardSets() async {
    state = state.copyWith(isLoadingFlashcards: true, clearError: true);

    try {
      final result = await _apiService.getFlashcardSets();
      if (result['success'] == true) {
        state = state.copyWith(
          flashcardSets: List<Map<String, dynamic>>.from(result['sets'] ?? []),
        );
      } else {
        state = state.copyWith(
          error:
              'Flashcard setleri alma hatası: ${result['message'] ?? 'Bilinmeyen hata'}',
        );
      }
    } catch (e) {
      print('❌ Flashcard setleri hatası: $e');
      state = state.copyWith(
        error: 'Flashcard setleri hatası: ${e.toString()}',
      );
    } finally {
      state = state.copyWith(isLoadingFlashcards: false);
    }
  }

  /// Generate quiz
  Future<Map<String, dynamic>?> generateQuiz({
    required String topic,
    required String difficulty,
    required int questionCount,
  }) async {
    state = state.copyWith(isLoadingQuiz: true, clearError: true);

    try {
      final result = await _apiService.generateQuiz(
        topic: topic,
        difficulty: difficulty,
        questionCount: questionCount,
      );

      if (result['success'] == true) {
        state = state.copyWith(currentQuiz: result);
        return result;
      } else {
        state = state.copyWith(
          error:
              'Quiz oluşturma hatası: ${result['message'] ?? 'Bilinmeyen hata'}',
        );
        return null;
      }
    } catch (e) {
      print('❌ Quiz oluşturma hatası: $e');
      state = state.copyWith(
        error: 'Quiz oluşturma hatası: ${e.toString()}',
      );
      return null;
    } finally {
      state = state.copyWith(isLoadingQuiz: false);
    }
  }

  /// Solve question using SOS solver
  Future<Map<String, dynamic>?> solveQuestion({
    required String questionText,
    String? imageBase64,
    String? subject,
  }) async {
    try {
      final result = await _apiService.solveQuestion(
        questionText: questionText,
        imageBase64: imageBase64,
        subject: subject,
      );

      if (result['success'] == true) {
        return result;
      } else {
        state = state.copyWith(
          error: 'SOS Solver hatası: ${result['message'] ?? 'Bilinmeyen hata'}',
        );
        return null;
      }
    } catch (e) {
      print('❌ SOS Solver hatası: $e');
      state = state.copyWith(
        error: 'SOS Solver hatası: ${e.toString()}',
      );
      return null;
    }
  }

  /// Stop streaming
  void stopStreaming() {
    _streamSubscription?.cancel();
    state = state.copyWith(isStreaming: false);
  }

  /// Reset AI response text
  void resetAIResponse() {
    state = state.copyWith(aiResponseText: '');
  }

  /// Clear suggested replies
  void clearSuggestedReplies() {
    state = state.copyWith(suggestedReplies: const []);
  }

  /// Clear current quiz
  void clearCurrentQuiz() {
    state = state.copyWith(currentQuiz: null);
  }

  @override
  void dispose() {
    _streamSubscription?.cancel();
    super.dispose();
  }
}

final smartToolsNotifierProvider =
    StateNotifierProvider<SmartToolsNotifier, SmartToolsState>((ref) {
  return SmartToolsNotifier();
});
