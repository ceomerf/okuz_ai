import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static const String baseUrl =
      'https://api.benimsitem.com'; // VPS sunucu adresi
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
      final response = await http.post(
        Uri.parse('$baseUrl$endpoint'),
        headers: await _getHeaders(),
        body: jsonEncode(data),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        throw Exception(
            'POST hatası: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
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
  Future<List<Map<String, dynamic>>> getUserPlans(String userId) async {
    final response = await get('/users/$userId/plans');
    return List<Map<String, dynamic>>.from(response['data'] ?? []);
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
}
