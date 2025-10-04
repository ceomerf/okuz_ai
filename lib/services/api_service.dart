import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_env.dart';
import '../models/plan_summary_model.dart';

class ApiService {
  static final String baseUrl = ApiEnv.baseUrl; // Ortak base URL
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  // JWT Token yönetimi
  static Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  static Future<void> setToken(String token) async {
    await _storage.write(key: 'jwt_token', value: token);
  }

  static Future<void> clearToken() async {
    await _storage.delete(key: 'jwt_token');
  }

  // Kullanıcı kimliğini almak için metot
  Future<String?> getUserId() async {
    try {
      print('🔍 getUserId() başlatıldı');
      
      // JWT token'dan kullanıcı kimliğini çıkarmayı dene
      final token = await getToken();
      print('🔍 JWT token: ${token != null ? "var" : "yok"}');
      
      if (token != null) {
        print('🔍 JWT token uzunluğu: ${token.length}');
        // JWT token'ı parçalara ayır
        final parts = token.split('.');
        print('🔍 JWT parts sayısı: ${parts.length}');
        
        if (parts.length == 3) {
          // Payload kısmını decode et
          final payload = parts[1];
          print('🔍 Payload uzunluğu: ${payload.length}');
          
          try {
            final normalized = base64Url.normalize(payload);
            final decoded = utf8.decode(base64Url.decode(normalized));
            final data = jsonDecode(decoded);
            print('🔍 Decoded payload: $data');

            // sub alanı genellikle kullanıcı kimliğidir
            if (data['sub'] != null) {
              print('🔑 JWT token\'dan kullanıcı kimliği alındı: ${data['sub']}');
              return data['sub'];
            } else {
              print('⚠️ JWT payload\'da sub alanı yok');
              print('🔍 Mevcut payload alanları: ${data.keys.toList()}');
              
              // Alternatif alanları kontrol et
              if (data['id'] != null) {
                print('🔑 JWT token\'dan id alanı kullanılıyor: ${data['id']}');
                return data['id'];
              } else if (data['userId'] != null) {
                print('🔑 JWT token\'dan userId alanı kullanılıyor: ${data['userId']}');
                return data['userId'];
              } else if (data['user_id'] != null) {
                print('🔑 JWT token\'dan user_id alanı kullanılıyor: ${data['user_id']}');
                return data['user_id'];
              }
            }
          } catch (decodeError) {
            print('❌ JWT payload decode hatası: $decodeError');
          }
        } else {
          print('⚠️ JWT token formatı geçersiz, parts sayısı: ${parts.length}');
        }
      }

      // Eğer JWT token'dan alınamazsa, SharedPreferences'dan almayı dene
      print('🔍 SharedPreferences kontrol ediliyor...');
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('user_id');
      print('🔍 SharedPreferences user_id: $userId');
      
      if (userId != null && userId.isNotEmpty) {
        print('🔑 SharedPreferences\'dan kullanıcı kimliği alındı: $userId');
        return userId;
      }

      print('⚠️ Kullanıcı kimliği bulunamadı!');
      return null;
    } catch (e) {
      print('❌ Kullanıcı kimliği alınırken hata: $e');
      return null;
    }
  }

  // HTTP Headers
  Future<Map<String, String>> _getHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Genel GET metodu
  Future<Map<String, dynamic>> get(String endpoint) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$endpoint'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(
            'GET hatası: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('API hatası: $e');
    }
  }

  // Genel POST metodu
  Future<Map<String, dynamic>> post(
      String endpoint, Map<String, dynamic> data) async {
    try {
      print('🌐 API.post başlatıldı');
      print('   Endpoint: $endpoint');
      print(
          '   Data: ${data.toString().substring(0, data.toString().length > 100 ? 100 : data.toString().length)}...');

      final headers = await _getHeaders();
      print('   Headers: $headers');

      final uri = Uri.parse('$baseUrl$endpoint');
      print('   URI: $uri');

      final response = await http.post(
        uri,
        headers: headers,
        body: jsonEncode(data),
      );

      print('   Status Code: ${response.statusCode}');
      print(
          '   Response Body: ${response.body.substring(0, response.body.length > 100 ? 100 : response.body.length)}...');

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        print('❌ HTTP Error: ${response.statusCode} - ${response.body}');
        throw Exception(
            'POST hatası: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('❌ API.post hatası: $e');
      throw Exception('API hatası: $e');
    }
  }

  // Genel PUT metodu
  Future<Map<String, dynamic>> put(
      String endpoint, Map<String, dynamic> data) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl$endpoint'),
        headers: await _getHeaders(),
        body: jsonEncode(data),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(
            'PUT hatası: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('API hatası: $e');
    }
  }

  // Genel DELETE metodu
  Future<void> delete(String endpoint) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl$endpoint'),
        headers: await _getHeaders(),
      );

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception(
            'DELETE hatası: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('API hatası: $e');
    }
  }

  // Kullanıcı işlemleri
  Future<Map<String, dynamic>> getUser(String userId) async {
    return await get('/users/$userId');
  }

  Future<Map<String, dynamic>> updateUser(
      String userId, Map<String, dynamic> data) async {
    return await put('/users/$userId', data);
  }

  // Çalışma verileri
  Future<List<Map<String, dynamic>>> getStudySessions(String userId) async {
    final response = await get('/users/$userId/study-sessions');
    return List<Map<String, dynamic>>.from(response['data'] ?? []);
  }

  Future<Map<String, dynamic>> logStudySession(
      Map<String, dynamic> sessionData) async {
    return await post('/study-sessions', sessionData);
  }

  // Liderlik tablosu
  Future<List<Map<String, dynamic>>> getLeaderboard() async {
    final response = await get('/leaderboard');
    return List<Map<String, dynamic>>.from(response['data'] ?? []);
  }

  // Gamification verileri
  Future<Map<String, dynamic>> getGamificationData(String userId) async {
    return await get('/users/$userId/gamification');
  }

  Future<Map<String, dynamic>> updateGamificationData(
      String userId, Map<String, dynamic> data) async {
    return await put('/users/$userId/gamification', data);
  }

  // Plan işlemleri
  Future<List<PlanSummary>> getUserPlans(String userId) async {
    try {
      print('🌐 getUserPlans API çağrısı yapılıyor...');
      print('   User ID: $userId');
      
      final response = await get('/planning/user-plans');
      
      print('✅ getUserPlans başarılı: ${response.length} plan bulundu');
      
      // Response'u List<dynamic> olarak cast et
      final List<dynamic> plansList = response is List ? response as List<dynamic> : [];
      
      return plansList.map((json) => PlanSummary.fromJson(json as Map<String, dynamic>)).toList();
    } catch (e) {
      print('❌ getUserPlans hatası: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> createPlan(Map<String, dynamic> planData) async {
    return await post('/plans', planData);
  }

  Future<Map<String, dynamic>> updatePlan(
      String planId, Map<String, dynamic> data) async {
    return await put('/plans/$planId', data);
  }

  // Aile hesabı işlemleri
  Future<Map<String, dynamic>> getFamilyAccount(String userId) async {
    return await get('/users/$userId/family-account');
  }

  Future<Map<String, dynamic>> addFamilyMember(
      Map<String, dynamic> memberData) async {
    return await post('/family/members', memberData);
  }

  // Veli dashboard verileri
  Future<Map<String, dynamic>> getParentDashboardData(String userId) async {
    return await get('/users/$userId/parent-dashboard');
  }

  // Onboarding işlemleri
  Future<Map<String, dynamic>> completeOnboarding(
      Map<String, dynamic> onboardingData) async {
    return await post('/onboarding/complete', onboardingData);
  }

  // Premium işlemleri
  Future<Map<String, dynamic>> getSubscriptionStatus(String userId) async {
    return await get('/users/$userId/subscription');
  }

  Future<Map<String, dynamic>> upgradeToPremium(String userId) async {
    return await post('/users/$userId/subscription/upgrade', {});
  }

  // Sokratik Sohbet
  Future<Map<String, dynamic>> sendSocraticMessage(
      Map<String, dynamic> data) async {
    return await post('/smart-tools/socratic-evaluation', data);
  }

  // Quiz işlemleri
  Future<Map<String, dynamic>> generateQuiz(
      Map<String, dynamic> quizData) async {
    print('🌐 API.generateQuiz başlatıldı');
          print('   Endpoint: /smart-tools/live-quiz');

    try {
      // Kullanıcı kimliğini ekleyelim
      final userId = await getUserId();
      if (userId != null) {
        quizData['userId'] = userId;
      }

      print('   Data: $quizData');

      final response = await post('/smart-tools/live-quiz', quizData);
      print(
          '   API yanıtı: ${response.toString().substring(0, response.toString().length > 100 ? 100 : response.toString().length)}...');
      return response;
    } catch (e) {
      print('❌ API.generateQuiz hatası: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> submitQuiz(
      String quizId, List<Map<String, dynamic>> answers) async {
    // Kullanıcı kimliğini ekleyelim
    final userId = await getUserId();

    // Backend'de bu endpoint mevcut değil, geçici olarak başarılı döndür
    return {'success': true};
  }

  Future<List<Map<String, dynamic>>> getQuizHistory() async {
    // Backend'de bu endpoint mevcut değil, geçici olarak boş liste döndür
    return [];
  }

  // Get user plan summaries
  static Future<List<PlanSummary>> getUserPlanSummaries(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/planning/user-plans'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = json.decode(response.body);
        return jsonList.map((json) => PlanSummary.fromJson(json)).toList();
      } else {
        throw Exception(
            'Failed to load plan summaries: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // Get specific plan details
  static Future<Map<String, dynamic>> getPlanDetails(
      String planId, String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/planning/plan/$planId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to load plan details: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // Complete a study session
  static Future<Map<String, dynamic>> completeSession({
    required String sessionId,
    required int performance,
    required String notes,
    required String token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/planning/complete-session'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'sessionId': sessionId,
          'performance': performance,
          'notes': notes,
        }),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to complete session: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // Skip a study session
  static Future<Map<String, dynamic>> skipSession({
    required String sessionId,
    required String reason,
    required String token,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/planning/skip-session'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'sessionId': sessionId,
          'reason': reason,
        }),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to skip session: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }
}
