import 'dart:async';
import 'package:http/http.dart' as http;
import '../models/api_error_model.dart';
import 'api_client.dart';

/// Request model for dialogue API calls
class DialogueRequest {
  final String message;
  final String? conversationId;
  final String mode; // 'socratic' or 'companion'
  final Map<String, dynamic>? context;

  const DialogueRequest({
    required this.message,
    this.conversationId,
    this.mode = 'socratic',
    this.context,
  });

  Map<String, dynamic> toJson() {
    return {
      'message': message,
      if (conversationId != null) 'conversationId': conversationId,
      'mode': mode,
      if (context != null) 'context': context,
    };
  }
}

/// Response model for dialogue API calls
class DialogueResponse {
  final String conversationId;
  final String aiResponse;
  final List<String> suggestedReplies;
  final String? modeSwitchSuggestion;
  final String? pedagogicalGoal;
  final String? detectedSentiment;
  final String? detectedCommand;
  final String? visualAidSuggestion;
  final String? followUpSuggestion;
  final Map<String, dynamic>? metadata;

  const DialogueResponse({
    required this.conversationId,
    required this.aiResponse,
    required this.suggestedReplies,
    this.modeSwitchSuggestion,
    this.pedagogicalGoal,
    this.detectedSentiment,
    this.detectedCommand,
    this.visualAidSuggestion,
    this.followUpSuggestion,
    this.metadata,
  });

  factory DialogueResponse.fromJson(Map<String, dynamic> json) {
    return DialogueResponse(
      conversationId: json['conversationId'] ?? '',
      aiResponse: json['aiResponse'] ?? '',
      suggestedReplies: List<String>.from(json['suggestedReplies'] ?? []),
      modeSwitchSuggestion: json['modeSwitchSuggestion'],
      pedagogicalGoal: json['pedagogicalGoal'],
      detectedSentiment: json['detectedSentiment'],
      detectedCommand: json['detectedCommand'],
      visualAidSuggestion: json['visualAidSuggestion'],
      followUpSuggestion: json['followUpSuggestion'],
      metadata:
          json['metadata'] is Map<String, dynamic> ? json['metadata'] : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'conversationId': conversationId,
      'aiResponse': aiResponse,
      'suggestedReplies': suggestedReplies,
      if (modeSwitchSuggestion != null)
        'modeSwitchSuggestion': modeSwitchSuggestion,
      if (pedagogicalGoal != null) 'pedagogicalGoal': pedagogicalGoal,
      if (detectedSentiment != null) 'detectedSentiment': detectedSentiment,
      if (detectedCommand != null) 'detectedCommand': detectedCommand,
      if (visualAidSuggestion != null)
        'visualAidSuggestion': visualAidSuggestion,
      if (followUpSuggestion != null) 'followUpSuggestion': followUpSuggestion,
      if (metadata != null) 'metadata': metadata,
    };
  }
}

/// Service responsible for all dialogue-related API calls
class DialogueApiService {
  final ApiClient _apiClient;
  final String _baseUrl;

  DialogueApiService({
    required ApiClient apiClient,
    String? baseUrl,
  })  : _apiClient = apiClient,
        _baseUrl = baseUrl ?? 'https://api.okuz.ai';

  /// Send a message to the dialogue API
  Future<DialogueResponse> postMessage(DialogueRequest request) async {
    try {
      final response = await _apiClient.post(
        '/dialogue/message',
        request.toJson(),
      );

      return DialogueResponse.fromJson(response);
    } on http.ClientException catch (e) {
      throw ApiErrorHelper.fromNetworkException(e);
    } on TimeoutException {
      throw ApiError.timeoutError();
    } catch (e) {
      throw e.toApiError();
    }
  }

  /// Get conversation history
  Future<List<DialogueResponse>> getConversationHistory(
      String conversationId) async {
    try {
      final response = await _apiClient.get(
        '/dialogue/conversation/$conversationId/history',
      );

      final List<dynamic> history = response['history'] ?? [];
      return history.map((item) => DialogueResponse.fromJson(item)).toList();
    } on http.ClientException catch (e) {
      throw ApiErrorHelper.fromNetworkException(e);
    } on TimeoutException {
      throw ApiError.timeoutError();
    } catch (e) {
      throw e.toApiError();
    }
  }

  /// Clear conversation history
  Future<void> clearConversation(String conversationId) async {
    try {
      await _apiClient.post(
        '/dialogue/conversation/$conversationId/clear',
        {},
      );
    } on http.ClientException catch (e) {
      throw ApiErrorHelper.fromNetworkException(e);
    } on TimeoutException {
      throw ApiError.timeoutError();
    } catch (e) {
      throw e.toApiError();
    }
  }

  /// Switch dialogue mode
  Future<DialogueResponse> switchMode(
      String conversationId, String newMode) async {
    try {
      final response = await _apiClient.post(
        '/dialogue/conversation/$conversationId/mode',
        {'mode': newMode},
      );

      return DialogueResponse.fromJson(response);
    } on http.ClientException catch (e) {
      throw ApiErrorHelper.fromNetworkException(e);
    } on TimeoutException {
      throw ApiError.timeoutError();
    } catch (e) {
      throw e.toApiError();
    }
  }

  /// Get conversation summary
  Future<Map<String, dynamic>> getConversationSummary(
      String conversationId) async {
    try {
      return await _apiClient
          .get('/dialogue/conversation/$conversationId/summary');
    } on http.ClientException catch (e) {
      throw ApiErrorHelper.fromNetworkException(e);
    } on TimeoutException {
      throw ApiError.timeoutError();
    } catch (e) {
      throw e.toApiError();
    }
  }

  /// Get suggested replies for a conversation
  Future<List<String>> getSuggestedReplies(String conversationId) async {
    try {
      final response = await _apiClient
          .get('/dialogue/conversation/$conversationId/suggestions');
      return List<String>.from(response['suggestions'] ?? []);
    } on http.ClientException catch (e) {
      throw ApiErrorHelper.fromNetworkException(e);
    } on TimeoutException {
      throw ApiError.timeoutError();
    } catch (e) {
      throw e.toApiError();
    }
  }

  /// Send feedback for a dialogue response
  Future<void> sendFeedback(String conversationId, String messageId,
      Map<String, dynamic> feedback) async {
    try {
      await _apiClient.post(
        '/dialogue/feedback',
        {
          'conversationId': conversationId,
          'messageId': messageId,
          'feedback': feedback,
        },
      );
    } on http.ClientException catch (e) {
      throw ApiErrorHelper.fromNetworkException(e);
    } on TimeoutException {
      throw ApiError.timeoutError();
    } catch (e) {
      throw e.toApiError();
    }
  }

  /// Get dialogue analytics
  Future<Map<String, dynamic>> getDialogueAnalytics(
      String conversationId) async {
    try {
      return await _apiClient.get('/dialogue/analytics/$conversationId');
    } on http.ClientException catch (e) {
      throw ApiErrorHelper.fromNetworkException(e);
    } on TimeoutException {
      throw ApiError.timeoutError();
    } catch (e) {
      throw e.toApiError();
    }
  }

  /// Simulate API call for testing purposes
  Future<DialogueResponse> _simulateApiCall(DialogueRequest request) async {
    // Simulate network delay
    await Future.delayed(Duration(seconds: 1));

    // Simulate different error scenarios based on message content
    if (request.message.toLowerCase().contains('error')) {
      throw ApiError(
        statusCode: 400,
        message: 'Simulated error for testing',
        error: 'Bad Request',
      );
    }

    if (request.message.toLowerCase().contains('network')) {
      throw ApiError.networkError();
    }

    if (request.message.toLowerCase().contains('timeout')) {
      throw ApiError.timeoutError();
    }

    if (request.message.toLowerCase().contains('auth')) {
      throw ApiError.authError();
    }

    if (request.message.toLowerCase().contains('server')) {
      throw ApiError.serverError();
    }

    // Simulate successful response
    return DialogueResponse(
      conversationId: request.conversationId ??
          'conv_${DateTime.now().millisecondsSinceEpoch}',
      aiResponse: 'This is a simulated AI response to: ${request.message}',
      suggestedReplies: ['Reply 1', 'Reply 2', 'Reply 3'],
      modeSwitchSuggestion:
          request.message.toLowerCase().contains('help') ? 'companion' : null,
      pedagogicalGoal:
          request.mode == 'socratic' ? 'STATE_CLARIFY_DEFINITION' : null,
      detectedSentiment: request.mode == 'companion' ? 'positive' : null,
      detectedCommand: null,
      visualAidSuggestion: null,
      followUpSuggestion: 'Would you like to explore this topic further?',
    );
  }

  /// Test method that uses simulation for development
  Future<DialogueResponse> postMessageSimulated(DialogueRequest request) async {
    return await _simulateApiCall(request);
  }
}

/// Extension methods for easier API usage
extension DialogueApiServiceExtensions on DialogueApiService {
  /// Send a simple message with default mode
  Future<DialogueResponse> sendMessage(String message,
      {String? conversationId}) async {
    final request = DialogueRequest(
      message: message,
      conversationId: conversationId,
    );
    return await postMessage(request);
  }

  /// Send a message with specific mode
  Future<DialogueResponse> sendMessageWithMode(String message, String mode,
      {String? conversationId}) async {
    final request = DialogueRequest(
      message: message,
      conversationId: conversationId,
      mode: mode,
    );
    return await postMessage(request);
  }

  /// Send a message with context
  Future<DialogueResponse> sendMessageWithContext(
      String message, Map<String, dynamic> context,
      {String? conversationId}) async {
    final request = DialogueRequest(
      message: message,
      conversationId: conversationId,
      context: context,
    );
    return await postMessage(request);
  }
}
