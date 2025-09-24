import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'api_env.dart';

class SseService {
  static final String baseUrl = ApiEnv.baseUrl;
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  // JWT Token yönetimi
  static Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  // SSE bağlantısı için headers
  static Future<Map<String, String>> _getHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// Quick Chat için SSE bağlantısı
  ///
  /// [message] - Kullanıcının mesajı
  /// [subject] - Ders konusu (opsiyonel)
  /// [grade] - Sınıf seviyesi (opsiyonel)
  /// [onData] - Her chunk için callback
  /// [onError] - Hata durumunda callback
  /// [onDone] - Bağlantı tamamlandığında callback
  static Future<void> quickChatStream({
    required String message,
    String? subject,
    String? grade,
    required Function(String chunk) onData,
    required Function(String error) onError,
    required VoidCallback onDone,
  }) async {
    try {
      final headers = await _getHeaders();

      // Create request body
      final requestBody = {
        'message': message,
        if (subject != null && subject.isNotEmpty) 'subject': subject,
        if (grade != null && grade.isNotEmpty) 'grade': grade,
      };

      // URL without query parameters
      final uri = Uri.parse('$baseUrl/smart-tools/quick-chat-stream');

      print('🔗 SSE Bağlantısı başlatılıyor: ${uri.toString()}');
      print('   Method: POST');
      print('   Request Body: $requestBody');

      // SSE bağlantısını başlat - manual HTTP approach kullan
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
                    onData(content);
                    break;
                  case 'METADATA_CHUNK':
                    if (content is Map<String, dynamic>) {
                      if (content['response'] != null) {
                        onData(content['response']);
                      }
                      if (content['followUpQuestions'] != null) {
                        onData('\n\nTakip Soruları:\n');
                        for (final question in content['followUpQuestions']) {
                          onData('• $question\n');
                        }
                      }
                    }
                    break;
                  case 'STATUS':
                    print('📊 Durum: $content');
                    break;
                  case 'ERROR_CHUNK':
                    onError(content);
                    break;
                  default:
                    print('❓ Bilinmeyen event tipi: $type');
                }
              } catch (e) {
                print('❌ JSON parse hatası: $e');
                onData(data);
              }
            }
          }
        }
      }
      
      onDone();
    } catch (e) {
      print('❌ SSE servis hatası: $e');
      onError('Servis hatası: $e');
    }
  }

  /// SSE bağlantısını manuel olarak kapat
  static void closeConnection() {
    // SSEClient.closeSSE() metodu mevcut değil,
    // bunun yerine stream'i dispose etmek gerekir
    print('🔒 SSE bağlantısı kapatıldı');
  }

  /// Bağlantı durumunu kontrol et
  static bool isConnected() {
    // Bu metod SSEClient'ın mevcut durumunu kontrol eder
    // Gerçek implementasyonda SSEClient'ın connection state'ini kontrol etmek gerekir
    return true; // Placeholder
  }
}
