import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/api_error_model.dart';
import '../services/dialogue_api_service.dart';
import '../services/sse_dialogue_service.dart';
import '../services/voice_service.dart';
import '../providers/api_client_provider.dart';

class DialogueState {
  final String currentDialogueMode;
  final String? pendingModeSwitch;
  final String? conversationId;
  final List<Map<String, String>> chatHistory;
  final List<String> suggestedReplies;
  final bool isSendingMessage;
  final String aiTypingResponse;
  final bool isStreaming;
  final ApiError? error;

  const DialogueState({
    this.currentDialogueMode = 'socratic',
    this.pendingModeSwitch,
    this.conversationId,
    this.chatHistory = const [],
    this.suggestedReplies = const [],
    this.isSendingMessage = false,
    this.aiTypingResponse = '',
    this.isStreaming = false,
    this.error,
  });

  DialogueState copyWith({
    String? currentDialogueMode,
    String? pendingModeSwitch,
    String? conversationId,
    List<Map<String, String>>? chatHistory,
    List<String>? suggestedReplies,
    bool? isSendingMessage,
    String? aiTypingResponse,
    bool? isStreaming,
    ApiError? error,
    bool clearError = false,
  }) {
    return DialogueState(
      currentDialogueMode: currentDialogueMode ?? this.currentDialogueMode,
      pendingModeSwitch: pendingModeSwitch,
      conversationId: conversationId ?? this.conversationId,
      chatHistory: chatHistory ?? this.chatHistory,
      suggestedReplies: suggestedReplies ?? this.suggestedReplies,
      isSendingMessage: isSendingMessage ?? this.isSendingMessage,
      aiTypingResponse: aiTypingResponse ?? this.aiTypingResponse,
      isStreaming: isStreaming ?? this.isStreaming,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class DialogueNotifier extends StateNotifier<DialogueState> {
  DialogueNotifier(this.ref)
      : _voiceService = VoiceService(),
        super(const DialogueState()) {
    _voiceService.state.addListener(_voiceListener);
  }

  final Ref ref;
  final VoiceService _voiceService;
  StreamSubscription<SSEEvent>? _streamSubscription;

  late final DialogueApiService _apiService =
      DialogueApiService(apiClient: ref.read(apiClientProvider));
  late final SSEDialogueService _sseService =
      SSEDialogueService(apiClient: ref.read(apiClientProvider));

  VoiceState get voiceState => _voiceService.state.value;

  void _voiceListener() {
    // no-op for now; UI reads voiceState via getter
  }

  void setDialogueMode(String mode) {
    state = state.copyWith(currentDialogueMode: mode);
  }

  Future<void> toggleVoiceListening() async {
    await _voiceService.initialize();
    if (_voiceService.state.value == VoiceState.listening) {
      await _voiceService.stopListening();
    } else {
      await _voiceService.startListening(onResult: (text) {
        if (text.isNotEmpty) {
          sendMessage(text);
        }
      });
    }
  }

  void setPendingModeSwitch(String? mode) {
    state = state.copyWith(pendingModeSwitch: mode);
  }

  void acceptModeSwitch() {
    if (state.pendingModeSwitch != null) {
      state = state.copyWith(
        currentDialogueMode: state.pendingModeSwitch,
        pendingModeSwitch: null,
      );
    }
  }

  void declineModeSwitch() {
    state = state.copyWith(pendingModeSwitch: null);
  }

  Future<void> sendMessageStreaming(String message) async {
    state = state.copyWith(
      isSendingMessage: true,
      isStreaming: true,
      aiTypingResponse: '',
      clearError: true,
      chatHistory: [
        ...state.chatHistory,
        {'role': 'user', 'content': message},
      ],
    );

    final stream = _sseService.connectToStream(
      message: message,
      dialogueMode: state.currentDialogueMode,
      conversationId: state.conversationId,
    );

    _streamSubscription = stream.listen(
      _handleSSEEvent,
      onError: (error) {
        state = state.copyWith(
          error: const ApiError(
            statusCode: 0,
            message: 'Streaming error occurred.',
            error: 'Streaming Error',
          ),
        );
      },
      onDone: () {
        state = state.copyWith(isStreaming: false, isSendingMessage: false);
      },
    );
  }

  void _handleSSEEvent(SSEEvent event) {
    switch (event.type) {
      case 'START':
        break;
      case 'TEXT_CHUNK':
        final content = event.data['content'] ?? '';
        state = state.copyWith(aiTypingResponse: state.aiTypingResponse + content);
        break;
      case 'METADATA_CHUNK':
        _processMetadata(event.data['content']);
        break;
      case 'COMPLETE':
        _finalizeStreamingResponse();
        break;
      case 'ERROR_CHUNK':
        final message = event.data['message'] ?? 'Bir hata oluştu';
        state = state.copyWith(
          error: ApiError(
            statusCode: 500,
            message: message,
            error: 'Stream Error',
          ),
        );
        _finalizeStreamingResponse();
        break;
      case 'FALLBACK':
        _processFallbackResponse(event.data['content']);
        break;
      default:
        break;
    }
  }

  void _processMetadata(Map<String, dynamic> metadata) {
    state = state.copyWith(
      conversationId: metadata['conversationId'] ?? state.conversationId,
      pendingModeSwitch: metadata['modeSwitchSuggestion'] ?? state.pendingModeSwitch,
      suggestedReplies: metadata['suggestedReplies'] != null
          ? List<String>.from(metadata['suggestedReplies'])
          : state.suggestedReplies,
    );
  }

  void _processFallbackResponse(Map<String, dynamic> fallback) {
    state = state.copyWith(
      aiTypingResponse: fallback['aiResponse'] ?? state.aiTypingResponse,
      suggestedReplies: fallback['suggestedReplies'] != null
          ? List<String>.from(fallback['suggestedReplies'])
          : state.suggestedReplies,
    );
  }

  Future<void> _speak(String text) async {
    await _voiceService.speak(text);
  }

  void _finalizeStreamingResponse() async {
    if (state.aiTypingResponse.isNotEmpty) {
      final ai = state.aiTypingResponse;
      state = state.copyWith(
        chatHistory: [
          ...state.chatHistory,
          {'role': 'assistant', 'content': ai},
        ],
        aiTypingResponse: '',
        isStreaming: false,
        isSendingMessage: false,
      );
      await _speak(ai);
    } else {
      state = state.copyWith(isStreaming: false, isSendingMessage: false);
    }
  }

  void cancelStreaming() {
    _streamSubscription?.cancel();
    state = state.copyWith(isStreaming: false, isSendingMessage: false, aiTypingResponse: '');
  }

  Future<void> sendMessage(String message) async {
    state = state.copyWith(isSendingMessage: true, clearError: true);
    try {
      final request = DialogueRequest(
        message: message,
        conversationId: state.conversationId,
        mode: state.currentDialogueMode,
      );
      final response = await _apiService.postMessage(request);
      _processSuccessfulResponse(message, response);
      await _speak(response.aiResponse);
    } catch (e) {
      state = state.copyWith(
        error: ApiError(
          statusCode: 500,
          message: e.toString(),
          error: 'Exception',
        ),
      );
    } finally {
      state = state.copyWith(isSendingMessage: false);
    }
  }

  Future<void> switchMode(String newMode) async {
    if (state.conversationId == null) {
      setDialogueMode(newMode);
      return;
    }
    try {
      final response = await _apiService.switchMode(state.conversationId!, newMode);
      state = state.copyWith(currentDialogueMode: newMode);
      _processSuccessfulResponse('Mode switched to $newMode', response);
    } catch (e) {
      state = state.copyWith(
        error: ApiError(
          statusCode: 500,
          message: e.toString(),
          error: 'Exception',
        ),
      );
    }
  }

  Future<void> loadConversationHistory() async {
    if (state.conversationId == null) return;
    try {
      final list = await _apiService.getConversationHistory(state.conversationId!);
      final messages = <Map<String, String>>[];
      for (final r in list) {
        messages.add({'role': 'assistant', 'content': r.aiResponse});
      }
      state = state.copyWith(chatHistory: messages);
    } catch (e) {
      state = state.copyWith(
        error: ApiError(
          statusCode: 500,
          message: e.toString(),
          error: 'Exception',
        ),
      );
    }
  }

  Future<void> clearConversation() async {
    cancelStreaming();
    if (state.conversationId != null) {
      try {
        await _apiService.clearConversation(state.conversationId!);
      } catch (_) {}
    }
    state = const DialogueState();
  }

  Future<Map<String, dynamic>?> getConversationSummary() async {
    if (state.conversationId == null) return null;
    try {
      return await _apiService.getConversationSummary(state.conversationId!);
    } catch (e) {
      state = state.copyWith(
        error: ApiError(
          statusCode: 500,
          message: e.toString(),
          error: 'Exception',
        ),
      );
      return null;
    }
  }

  Future<void> loadSuggestedReplies() async {
    if (state.conversationId == null) return;
    try {
      final replies = await _apiService.getSuggestedReplies(state.conversationId!);
      state = state.copyWith(suggestedReplies: replies);
    } catch (e) {
      state = state.copyWith(
        error: ApiError(
          statusCode: 500,
          message: e.toString(),
          error: 'Exception',
        ),
      );
    }
  }

  Future<void> sendFeedback(String messageId, Map<String, dynamic> feedback) async {
    if (state.conversationId == null) return;
    try {
      await _apiService.sendFeedback(state.conversationId!, messageId, feedback);
    } catch (e) {
      state = state.copyWith(
        error: ApiError(
          statusCode: 500,
          message: e.toString(),
          error: 'Exception',
        ),
      );
    }
  }

  void _processSuccessfulResponse(String userMessage, DialogueResponse response) {
    final List<Map<String, String>> updated = List.of(state.chatHistory)
      ..add({'role': 'user', 'content': userMessage})
      ..add({'role': 'assistant', 'content': response.aiResponse});
    state = state.copyWith(
      conversationId: response.conversationId.isNotEmpty ? response.conversationId : state.conversationId,
      chatHistory: updated,
      pendingModeSwitch: response.modeSwitchSuggestion ?? state.pendingModeSwitch,
      suggestedReplies:
          response.suggestedReplies.isNotEmpty ? response.suggestedReplies : state.suggestedReplies,
    );
  }

  String get conversationSummary {
    if (state.chatHistory.isEmpty) return 'No messages yet';
    final userMessages = state.chatHistory.where((m) => m['role'] == 'user').length;
    final aiMessages = state.chatHistory.where((m) => m['role'] == 'assistant').length;
    return 'User: $userMessages messages, AI: $aiMessages messages';
  }

  bool get isConversationEmpty => state.chatHistory.isEmpty;
  String? get lastMessage => state.chatHistory.isEmpty ? null : state.chatHistory.last['content'];
  String? get lastUserMessage => state.chatHistory.where((m) => m['role'] == 'user').isEmpty
      ? null
      : state.chatHistory.where((m) => m['role'] == 'user').last['content'];
  String? get lastAIMessage => state.chatHistory.where((m) => m['role'] == 'assistant').isEmpty
      ? null
      : state.chatHistory.where((m) => m['role'] == 'assistant').last['content'];
  String get retrySuggestion => 'Lütfen tekrar deneyin.';

  @override
  void dispose() {
    _streamSubscription?.cancel();
    _voiceService.state.removeListener(_voiceListener);
    super.dispose();
  }
}

final dialogueNotifierProvider =
    StateNotifierProvider<DialogueNotifier, DialogueState>((ref) => DialogueNotifier(ref));
