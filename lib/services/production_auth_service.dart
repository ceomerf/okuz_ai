import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';

class ProductionAuthService {
  static final ProductionAuthService _instance =
      ProductionAuthService._internal();
  factory ProductionAuthService() => _instance;
  ProductionAuthService._internal();

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  final ApiClient _apiClient = ApiClient();

  // Kullanıcı kaydı
  Future<Map<String, dynamic>> register(
      String email, String password, String name) async {
    try {
      final result = await _apiClient.register(email, password, name);

      // JWT token'ı kaydet
      if (result['token'] != null) {
        await _secureStorage.write(key: 'jwt_token', value: result['token']);
        await _secureStorage.write(key: 'user_email', value: email);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user_id', result['user']['id'] ?? '');
        await prefs.setString('user_name', result['user']['name'] ?? '');
        await prefs.setString('user_role', result['user']['role'] ?? 'STUDENT');
      } else if (result['access_token'] != null) {
        await _secureStorage.write(
            key: 'jwt_token', value: result['access_token']);
        await _secureStorage.write(key: 'user_email', value: email);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user_id', result['user']['id'] ?? '');
        await prefs.setString('user_name', result['user']['name'] ?? '');
        await prefs.setString('user_role', result['user']['role'] ?? 'STUDENT');
      }

      return result;
    } catch (e) {
      throw Exception('Kayıt hatası: $e');
    }
  }

  // Kullanıcı girişi
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final result = await _apiClient.login(email, password);

      // JWT token'ı kaydet
      if (result['token'] != null) {
        await _secureStorage.write(key: 'jwt_token', value: result['token']);
        await _secureStorage.write(key: 'user_email', value: email);

        final prefs = await SharedPreferences.getInstance();
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

  // Google ile giriş (şimdilik devre dışı)
  Future<Map<String, dynamic>> loginWithGoogle() async {
    throw Exception('Google ile giriş şimdilik desteklenmiyor');
  }
}
