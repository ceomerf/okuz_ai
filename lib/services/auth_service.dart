import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final ApiClient _apiClient = ApiClient();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  // Singleton pattern
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  // JWT token için key
  static const String _tokenKey = 'jwt_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _tokenExpiryKey = 'token_expiry';

  // Token alma
  Future<String?> getToken() async {
    try {
      // Önce secure storage'dan token'ı al
      String? token = await _secureStorage.read(key: _tokenKey);

      // Token yoksa veya süresi dolmuşsa yenile
      if (token == null || await _isTokenExpired()) {
        token = await _refreshToken();
      }

      return token;
    } catch (e) {
      print('Token alma hatası: $e');
      return null;
    }
  }

  // Token'ın süresi dolmuş mu kontrol et
  Future<bool> _isTokenExpired() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final expiryString = prefs.getString(_tokenExpiryKey);

      if (expiryString == null) return true;

      final expiry = DateTime.parse(expiryString);
      return DateTime.now().isAfter(expiry);
    } catch (e) {
      return true;
    }
  }

  // Token'ı yenile
  Future<String?> _refreshToken() async {
    try {
      // Firebase token'ı al
      final User? user = _auth.currentUser;
      if (user == null) return null;

      final idToken = await user.getIdToken(true);

      // Backend'e token ile login ol
      final response = await _apiClient.post(
        '/auth/login-with-token',
        {'firebaseToken': idToken},
      );

      // Dönen JWT token'ı kaydet
      final token = response['token'];
      final refreshToken = response['refreshToken'];
      final expiry = DateTime.now().add(Duration(hours: 1));

      // Secure storage'a kaydet
      await _secureStorage.write(key: _tokenKey, value: token);
      await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);

      // Expiry'i shared preferences'a kaydet
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenExpiryKey, expiry.toIso8601String());

      return token;
    } catch (e) {
      print('Token yenileme hatası: $e');
      return null;
    }
  }

  // Token'ı temizle (logout)
  Future<void> clearToken() async {
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenExpiryKey);
  }

  // Backend'e email/password ile giriş yap
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _apiClient.login(email, password);

      // JWT token'ı kaydet
      if (response.containsKey('token')) {
        await _secureStorage.write(key: _tokenKey, value: response['token']);

        if (response.containsKey('refreshToken')) {
          await _secureStorage.write(
              key: _refreshTokenKey, value: response['refreshToken']);
        }

        // Token süresi
        final expiry = DateTime.now().add(Duration(hours: 1));
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenExpiryKey, expiry.toIso8601String());
      }

      return response;
    } catch (e) {
      rethrow;
    }
  }

  // Backend'e kayıt ol
  Future<Map<String, dynamic>> register(
      String email, String password, String name) async {
    try {
      final response = await _apiClient.register(email, password, name);

      // JWT token'ı kaydet
      if (response.containsKey('token')) {
        await _secureStorage.write(key: _tokenKey, value: response['token']);

        if (response.containsKey('refreshToken')) {
          await _secureStorage.write(
              key: _refreshTokenKey, value: response['refreshToken']);
        }

        // Token süresi
        final expiry = DateTime.now().add(Duration(hours: 1));
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenExpiryKey, expiry.toIso8601String());
      }

      return response;
    } catch (e) {
      rethrow;
    }
  }

  // Çıkış yap
  Future<void> logout() async {
    await clearToken();
    await _auth.signOut();
  }

  // Google ile giriş
  Future<Map<String, dynamic>> loginWithGoogle() async {
    try {
      // Backend'e Google ile giriş isteği gönder
      final response = await _apiClient.post(
        '/auth/login-with-google',
        {},
      );

      // JWT token'ı kaydet
      if (response.containsKey('token')) {
        await _secureStorage.write(key: _tokenKey, value: response['token']);

        if (response.containsKey('refreshToken')) {
          await _secureStorage.write(
              key: _refreshTokenKey, value: response['refreshToken']);
        }

        // Token süresi
        final expiry = DateTime.now().add(Duration(hours: 1));
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenExpiryKey, expiry.toIso8601String());
      }

      return response;
    } catch (e) {
      rethrow;
    }
  }

  // Şifre sıfırlama
  Future<void> sendPasswordResetEmail({required String email}) async {
    try {
      await _apiClient.post(
        '/auth/reset-password',
        {'email': email},
      );
    } catch (e) {
      rethrow;
    }
  }
}
