import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import '../models/api_error_model.dart';
import 'api_client.dart';

/// SSE Event model for dialogue streaming
class SSEEvent {
  final String type;
  final Map<String, dynamic> data;
  final bool isComplete;

  const SSEEvent({
    required this.type,
    required this.data,
    this.isComplete = false,
  });

  factory SSEEvent.fromJson(Map<String, dynamic> json) {
    return SSEEvent(
      type: json['type'] ?? '',
      data: json,
      isComplete: json['isComplete'] ?? false,
    );
  }
}

/// SSE Dialogue Service for handling streaming responses
class SSEDialogueService {
  final ApiClient _apiClient;
  final String _baseUrl;

  SSEDialogueService({
    required ApiClient apiClient,
    String? baseUrl,
  })  : _apiClient = apiClient,
        _baseUrl = baseUrl ?? 'https://api.okuz.ai';

  /// Connect to SSE stream for dialogue
  Stream<SSEEvent> connectToStream({
    required String message,
    required String dialogueMode,
    String? conversationId,
    String? authToken,
  }) async* {
    try {
      // Build query parameters
      final queryParams = <String, String>{
        'message': message,
        'dialogueMode': dialogueMode,
        if (conversationId != null) 'conversationId': conversationId,
      };

      // Build URI
      final uri = Uri.parse('$_baseUrl/dialogue/message-stream')
          .replace(queryParameters: queryParams);

      // Create request
      final request = http.Request('GET', uri);
      request.headers['Accept'] = 'text/event-stream';
      request.headers['Cache-Control'] = 'no-cache';
      request.headers['Connection'] = 'keep-alive';

      // Add authorization if provided
      if (authToken != null) {
        request.headers['Authorization'] = 'Bearer $authToken';
      }

      // Send request
      final response = await request.send();

      if (response.statusCode != 200) {
        throw ApiError(
          statusCode: response.statusCode,
          message: 'Failed to connect to SSE stream',
          error: 'HTTP ${response.statusCode}',
        );
      }

      // Process the stream
      await for (final chunk in response.stream.transform(utf8.decoder)) {
        final lines = chunk.split('\n');

        for (final line in lines) {
          if (line.startsWith('data: ')) {
            try {
              final data = line.substring(6); // Remove 'data: ' prefix
              if (data.trim().isNotEmpty) {
                final jsonData = json.decode(data);
                yield SSEEvent.fromJson(jsonData);
              }
            } catch (e) {
              // Skip malformed JSON
              print('SSE parsing error: $e');
            }
          }
        }
      }
    } on http.ClientException catch (e) {
      throw ApiErrorHelper.fromNetworkException(e);
    } on TimeoutException catch (e) {
      throw ApiError.timeoutError();
    } catch (e) {
      if (e is ApiError) {
        rethrow;
      }
      throw e.toApiError();
    }
  }

  /// Connect to authenticated SSE stream
  Stream<SSEEvent> connectToAuthenticatedStream({
    required String message,
    required String dialogueMode,
    String? conversationId,
    required String authToken,
  }) async* {
    yield* connectToStream(
      message: message,
      dialogueMode: dialogueMode,
      conversationId: conversationId,
      authToken: authToken,
    );
  }

  /// Test SSE connection with simulated data
  Stream<SSEEvent> connectToSimulatedStream({
    required String message,
    required String dialogueMode,
    String? conversationId,
  }) async* {
    // Simulate start event
    yield SSEEvent.fromJson({
      'type': 'START',
      'status': 'processing',
      'message': 'AI is thinking...',
    });

    // Simulate delay
    await Future.delayed(Duration(milliseconds: 500));

    // Simulate text chunks
    final words = 'This is a simulated AI response to: $message'.split(' ');
    for (int i = 0; i < words.length; i++) {
      await Future.delayed(Duration(milliseconds: 100));
      yield SSEEvent.fromJson({
        'type': 'TEXT_CHUNK',
        'content': '${words[i]} ',
        'chunkIndex': i + 1,
        'isPartial': true,
      });
    }

    // Simulate metadata
    yield SSEEvent.fromJson({
      'type': 'METADATA_CHUNK',
      'content': {
        'conversationId':
            conversationId ?? 'conv_${DateTime.now().millisecondsSinceEpoch}',
        'aiResponse': 'This is a simulated AI response to: $message',
        'suggestedReplies': ['Reply 1', 'Reply 2', 'Reply 3'],
        'pedagogicalGoal':
            dialogueMode == 'socratic' ? 'STATE_CLARIFY_DEFINITION' : null,
        'detectedSentiment': dialogueMode == 'companion' ? 'positive' : null,
        'detectedCommand': null,
        'visualAidSuggestion': null,
        'modeSwitchSuggestion':
            message.toLowerCase().contains('help') ? 'companion' : null,
        'followUpSuggestion': 'Would you like to explore this topic further?',
      },
      'isComplete': true,
    });

    // Simulate completion
    yield SSEEvent.fromJson({
      'type': 'COMPLETE',
      'conversationId':
          conversationId ?? 'conv_${DateTime.now().millisecondsSinceEpoch}',
      'totalChunks': words.length,
    });
  }
}
