import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_client_sse/flutter_client_sse.dart';
import '../models/quick_chat_dto.dart';
import 'api_env.dart';

/// Smart Tools API Service for handling streaming and regular API calls
class SmartToolsApiService {
  static final String baseUrl = ApiEnv.baseUrl;
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  // JWT Token yönetimi
  static Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  // HTTP Headers
  Future<Map<String, String>> _getHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // SSE Headers
  Future<Map<String, String>> _getSSEHeaders() async {
    final token = await getToken();
    print('🔐 JWT Token Debug:');
    print('   Token exists: ${token != null}');
    print('   Token length: ${token?.length ?? 0}');
    if (token != null) {
      print(
          '   Token preview: ${token!.substring(0, token.length > 50 ? 50 : token.length)}...');
    }

    return {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// Quick Chat için SSE streaming (NEW METHOD)
  ///
  /// [requestDto] - QuickChatDto object containing message, subject, and grade
  /// Returns: Stream<SSEModel> - SSE streaming response data
  Future<Stream<SSEModel>> quickChatStream(QuickChatDto requestDto) async {
    // Use manual HTTP streaming approach that works
    return _createSSEStream(requestDto);
  }

  /// Create SSE stream using the working approach
  Stream<SSEModel> _createSSEStream(QuickChatDto requestDto) async* {
    final headers = await _getSSEHeaders();
    
    // Change Content-Type to application/json for POST request
    headers['Content-Type'] = 'application/json';

    // Create URL without query parameters
    final uri = Uri.parse('$baseUrl/smart-tools/quick-chat-stream');

    print('🔗 SSE Stream Request Details:');
    print('   URL: ${uri.toString()}');
    print('   Method: POST');
    print('   Headers: $headers');
    print('   Request Body: ${requestDto.toJson()}');

    // Use POST request with body
    final request = http.Request('POST', uri);
    request.headers.addAll(headers);
    request.body = jsonEncode(requestDto.toJson());

    final response = await http.Client().send(request);

    print('📡 SSE Stream Response:');
    print('   Status Code: ${response.statusCode}');
    print('   Headers: ${response.headers}');

    if (response.statusCode != 200) {
      print('❌ SSE Stream Error: ${response.statusCode}');
      print(
          '   Response Body: ${await response.stream.transform(utf8.decoder).join()}');
      throw Exception('Stream bağlantı hatası: ${response.statusCode}');
    }

    print('✅ SSE Stream başarıyla başlatıldı');

    // Stream'i işle
    await for (final chunk in response.stream.transform(utf8.decoder)) {
      final lines = chunk.split('\n');

      for (final line in lines) {
        if (line.startsWith('data: ')) {
          final data = line.substring(6); // Remove 'data: ' prefix

          if (data.isNotEmpty) {
            try {
              final jsonData = jsonDecode(data);
              yield SSEModel(data: data, event: jsonData['type'] ?? 'message');
            } catch (e) {
              print('❌ JSON parse hatası: $e');
              yield SSEModel(data: data, event: 'message');
            }
          }
        }
      }
    }
  }

  /// Quick Chat için manual HTTP streaming (LEGACY METHOD - DEPRECATED)
  ///
  /// [message] - Kullanıcının mesajı
  /// [subject] - Ders konusu (opsiyonel)
  /// [grade] - Sınıf seviyesi (opsiyonel)
  /// Returns: Stream<String> - Streaming response data
  Stream<String> quickChatStreamLegacy({
    required String message,
    String? subject,
    String? grade,
  }) async* {
    try {
      final headers = await _getSSEHeaders();
      
      // Change Content-Type to application/json for POST request
      headers['Content-Type'] = 'application/json';

      // Create request body
      final requestBody = {
        'message': message,
        if (subject != null && subject.isNotEmpty) 'subject': subject,
        if (grade != null && grade.isNotEmpty) 'grade': grade,
      };

      // URL without query parameters
      final uri = Uri.parse('$baseUrl/smart-tools/quick-chat-stream');

      print('🔗 HTTP Stream Bağlantısı başlatılıyor: ${uri.toString()}');
      print('   Method: POST');
      print('   Request Body: $requestBody');

      // Manual HTTP streaming with POST
      final request = http.Request('POST', uri);
      request.headers.addAll(headers);
      request.body = jsonEncode(requestBody);

      final response = await http.Client().send(request);

      if (response.statusCode != 200) {
        throw Exception('Stream bağlantı hatası: ${response.statusCode}');
      }

      // Stream'i işle
      await for (final chunk in response.stream.transform(utf8.decoder)) {
        final lines = chunk.split('\n');

        for (final line in lines) {
          if (line.startsWith('data: ')) {
            final data = line.substring(6); // Remove 'data: ' prefix

            if (data.isNotEmpty) {
              try {
                final jsonData = jsonDecode(data);
                final type = jsonData['type'];
                final content = jsonData['content'];

                switch (type) {
                  case 'TEXT_CHUNK':
                    yield content;
                    break;
                  case 'METADATA_CHUNK':
                    if (content is Map<String, dynamic>) {
                      if (content['response'] != null) {
                        yield content['response'];
                      }
                      if (content['followUpQuestions'] != null) {
                        yield '\n\nTakip Soruları:\n';
                        for (final question in content['followUpQuestions']) {
                          yield '• $question\n';
                        }
                      }
                    }
                    break;
                  case 'STATUS':
                    print('📊 Durum: $content');
                    break;
                  case 'ERROR_CHUNK':
                    throw Exception(content);
                  default:
                    print('❓ Bilinmeyen event tipi: $type');
                }
              } catch (e) {
                print('❌ JSON parse hatası: $e');
                // Raw data'yı da yield et
                yield data;
              }
            }
          }
        }
      }
    } catch (e) {
      print('❌ Stream oluşturma hatası: $e');
      rethrow;
    }
  }

  /// SOS Question Solver API call
  Future<Map<String, dynamic>> solveQuestion({
    required String questionText,
    String? imageBase64,
    String? subject,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/smart-tools/sos-question-solver'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'questionText': questionText,
          if (imageBase64 != null) 'imageBase64': imageBase64,
          if (subject != null) 'subject': subject,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(
            'SOS Solver hatası: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('SOS Solver API hatası: $e');
    }
  }

  /// Flashcard Generator API call
  Future<Map<String, dynamic>> createFlashcards({
    required String sourceText,
    required String topic,
    required String difficulty,
    required int cardCount,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/smart-tools/flashcards-generator'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'sourceText': sourceText,
          'topic': topic,
          'difficulty': difficulty,
          'cardCount': cardCount,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(
            'Flashcard oluşturma hatası: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Flashcard API hatası: $e');
    }
  }

  /// Get Flashcard Sets
  Future<Map<String, dynamic>> getFlashcardSets() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/smart-tools/flashcards-generator'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(
            'Flashcard setleri alma hatası: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Flashcard setleri API hatası: $e');
    }
  }

  /// Get Flashcard Set by ID
  Future<Map<String, dynamic>> getFlashcardSetById(String setId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/smart-tools/flashcards-generator'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(
            'Flashcard set detayı alma hatası: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Flashcard set detayı API hatası: $e');
    }
  }

  /// Quiz Generator API call
  Future<Map<String, dynamic>> generateQuiz({
    required String topic,
    required String difficulty,
    required int questionCount,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/smart-tools/live-quiz'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'topic': topic,
          'difficulty': difficulty,
          'questionCount': questionCount,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(
            'Quiz oluşturma hatası: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Quiz API hatası: $e');
    }
  }

  /// Get Tools List
  Future<Map<String, dynamic>> getToolsList() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/smart-tools/tools-list'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(
            'Araçlar listesi alma hatası: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Araçlar listesi API hatası: $e');
    }
  }
}
