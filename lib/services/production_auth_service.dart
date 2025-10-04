import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';

class ProductionAuthService {
  static final ProductionAuthService _instance =
      ProductionAuthService._internal(ApiClient());
  factory ProductionAuthService() => _instance;
  ProductionAuthService._internal(this._apiClient);

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  final ApiClient _apiClient;

  // Kullanıcı kaydı
  Future<Map<String, dynamic>> register(
      String email, String password, String name, String accountType) async {
    try {
      final result =
          await _apiClient.register(email, password, name, accountType);

      // Backend'den access_token ve refreshToken dönüyor
      if (result['access_token'] != null) {
        await _secureStorage.write(key: 'jwt_token', value: result['access_token']);
        await _secureStorage.write(key: 'user_email', value: email);
        if (result['refreshToken'] != null) {
          await _secureStorage.write(key: 'refresh_token', value: result['refreshToken']);
        }
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('jwt_token', result['access_token']); // Added this line
        await prefs.setString('user_id', result['user']['id'] ?? '');
        await prefs.setString('user_name', result['user']['name'] ?? '');
        await prefs.setString('user_role', result['user']['role'] ?? 'STUDENT');
        
        // Success field'ını ekle
        result['success'] = true;
        result['message'] = 'Kayıt başarılı';
      }

      return result;
    } catch (e) {
      print('❌ Register hatası: $e');
      rethrow;
    }
  }

  // Kullanıcı girişi
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final result = await _apiClient.login(email, password, 'STUDENT');

      // JWT token'ı kaydet
      if (result['access_token'] != null) {
        await _secureStorage.write(key: 'jwt_token', value: result['access_token']);
        await _secureStorage.write(key: 'user_email', value: email);
        if (result['refreshToken'] != null) {
          await _secureStorage.write(key: 'refresh_token', value: result['refreshToken']);
        }

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(
            'jwt_token', result['access_token']); // SharedPreferences'a da kaydet
        await prefs.setString('user_id', result['user']['id'] ?? '');
        await prefs.setString('user_name', result['user']['name'] ?? '');
        await prefs.setString('user_role', result['user']['role'] ?? 'STUDENT');
      }

      return result;
    } catch (e) {
      throw Exception('Giriş hatası: $e');
    }
  }

  // Oturumu kapat
  Future<void> logout() async {
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
      final userRole = prefs.getString('user_role');
      final userEmail = await _secureStorage.read(key: 'user_email');

      if (userId != null && userName != null && userEmail != null) {
        return {
          'id': userId,
          'name': userName,
          'email': userEmail,
          'role': userRole ?? 'STUDENT',
        };
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  // Oturum durumunu kontrol et
  Future<bool> isLoggedIn() async {
    final token = await _secureStorage.read(key: 'jwt_token');
    return token != null && token.isNotEmpty;
  }

  // JWT Token al
  Future<String?> getToken() async {
    return await _secureStorage.read(key: 'jwt_token');
  }

  // Kullanıcı ID'sini al
  Future<String?> getCurrentUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('user_id');
  }

  // Kullanıcı adını al
  Future<String?> getCurrentUserName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('user_name');
  }

  // Kullanıcı rolünü al
  Future<String?> getCurrentUserRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('user_role');
  }

  // Google ile giriş
  Future<Map<String, dynamic>> loginWithGoogleToken(
      String accessToken, String idToken, String accountType) async {
    try {
      final result =
          await _apiClient.loginWithGoogle(accessToken, idToken, accountType);

      // JWT token'ı kaydet
      if (result['access_token'] != null) {
        await _secureStorage.write(key: 'jwt_token', value: result['access_token']);
        await _secureStorage.write(
            key: 'user_email', value: result['user']['email']);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(
            'jwt_token', result['access_token']); // SharedPreferences'a da kaydet
        await prefs.setString('user_id', result['user']['id'] ?? '');
        await prefs.setString('user_name', result['user']['name'] ?? '');
        await prefs.setString('user_role', result['user']['role'] ?? 'STUDENT');
      }

      return result;
    } catch (e) {
      throw Exception('Google ile giriş hatası: $e');
    }
  }

  // Google ile giriş (eski metod - geriye uyumluluk için)
  Future<Map<String, dynamic>> loginWithGoogle() async {
    throw Exception(
        'Google ile giriş için loginWithGoogleToken metodunu kullanın');
  }
}
