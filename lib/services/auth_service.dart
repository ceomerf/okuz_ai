// JWT tabanlı kimlik doğrulama servisi
// Firebase bağımlılığı tamamen kaldırıldı

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  final ApiClient _apiClient = ApiClient();

  // Kullanıcı oturum açma
  Future<Map<String, dynamic>> signIn(String email, String password) async {
    try {
      final result = await _apiClient.login(email, password);

      // JWT token'ı kaydet
      if (result['token'] != null) {
        await _secureStorage.write(key: 'jwt_token', value: result['token']);
        await _secureStorage.write(key: 'user_email', value: email);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user_id', result['user']['id'] ?? '');
        await prefs.setString('user_name', result['user']['name'] ?? '');
      }

      return result;
    } catch (e) {
      throw Exception('Giriş hatası: $e');
    }
  }

  // Kullanıcı kaydı
  Future<Map<String, dynamic>> signUp(
      String email, String password, String name) async {
    try {
      final result = await _apiClient.register(email, password, name);

      // JWT token'ı kaydet
      if (result['token'] != null) {
        await _secureStorage.write(key: 'jwt_token', value: result['token']);
        await _secureStorage.write(key: 'user_email', value: email);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user_id', result['user']['id'] ?? '');
        await prefs.setString('user_name', name);
      }

      return result;
    } catch (e) {
      throw Exception('Kayıt hatası: $e');
    }
  }

  // Oturumu kapat
  Future<void> signOut() async {
    await _secureStorage.deleteAll();
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  // Mevcut kullanıcıyı al
  Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final token = await _secureStorage.read(key: 'jwt_token');
      if (token == null) return null;

      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('user_id');
      final userName = prefs.getString('user_name');
      final userEmail = await _secureStorage.read(key: 'user_email');

      if (userId != null && userName != null && userEmail != null) {
        return {
          'id': userId,
          'name': userName,
          'email': userEmail,
        };
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  // Oturum durumunu kontrol et
  Future<bool> isSignedIn() async {
    final token = await _secureStorage.read(key: 'jwt_token');
    return token != null && token.isNotEmpty;
  }

  // Kullanıcı ID'sini al
  Future<String?> getCurrentUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('user_id');
  }

  // Google ile giriş (şimdilik devre dışı)
  Future<Map<String, dynamic>> loginWithGoogle() async {
    throw Exception('Google ile giriş şimdilik desteklenmiyor');
  }

  // Şifre sıfırlama e-postası gönder (mock implementation)
  Future<void> sendPasswordResetEmail(String email) async {
    // Mock implementation
    print('Password reset email would be sent to: $email');
  }

  // Login alias for signIn
  Future<Map<String, dynamic>> login(String email, String password) async {
    return signIn(email, password);
  }

  // Register alias for signUp
  Future<Map<String, dynamic>> register(
      String email, String password, String name) async {
    return signUp(email, password, name);
  }

  // JWT Token al
  Future<String?> getToken() async {
    return await _secureStorage.read(key: 'jwt_token');
  }

  // Backward compatibility için eski metodlar
  Future<void> logout() => signOut();
}
