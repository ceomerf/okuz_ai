import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/invite_token.dart';
import '../models/student_model.dart';
import '../models/parent_invite_token.dart';
import '../models/parent_model.dart';
import '../models/gamification.dart';
import '../models/student_profile.dart';

class ApiClient {
  // Backend adresi - Production VPS
  static const String baseUrl = 'http://89.116.38.173:3002'; // Production VPS

  // Local development için (test sırasında değiştirilecek)
  // static const String baseUrl = 'http://10.0.2.2:3002'; // Android emülatör için

  // Secure storage for JWT
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  // Dio instance
  final Dio _dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));

  // Singleton pattern
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  ApiClient._internal() {
    _initializeDio();
  }

  // Dio interceptors for JWT token
  void _initializeDio() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // JWT token ekle
        final token = await _getJwtToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        options.headers['Content-Type'] = 'application/json';
        return handler.next(options);
      },
      onError: (DioException error, handler) async {
        // 401 hatası durumunda token yenile
        if (error.response?.statusCode == 401) {
          try {
            // Token yenile
            await _refreshToken();

            // Yeni token ile isteği tekrar gönder
            final token = await _getJwtToken();
            error.requestOptions.headers['Authorization'] = 'Bearer $token';

            // Yeni istek oluştur
            final response = await _dio.request(
              error.requestOptions.path,
              data: error.requestOptions.data,
              queryParameters: error.requestOptions.queryParameters,
              options: Options(
                method: error.requestOptions.method,
                headers: error.requestOptions.headers,
              ),
            );

            return handler.resolve(response);
          } catch (e) {
            return handler.next(error);
          }
        }
        return handler.next(error);
      },
    ));
  }

  // JWT token al
  Future<String?> _getJwtToken() async {
    return await _secureStorage.read(key: 'jwt_token');
  }

  // Token yenile
  Future<void> _refreshToken() async {
    try {
      final refreshToken = await _secureStorage.read(key: 'refresh_token');
      if (refreshToken == null) return;

      final response = await _dio.post(
        '/auth/refresh-token',
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200) {
        await _secureStorage.write(
            key: 'jwt_token', value: response.data['token']);
        await _secureStorage.write(
            key: 'refresh_token', value: response.data['refreshToken']);
      }
    } catch (e) {
      print('Token yenileme hatası: $e');
    }
  }

  // Token alarak header oluştur
  Future<Map<String, String>> _getHeaders() async {
    final token = await _getJwtToken();
    if (token == null) {
      throw Exception('JWT token bulunamadı');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  // Test için basit header
  Map<String, String> _getTestHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  // Health check
  Future<bool> healthCheck() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/health'),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Kullanıcı kaydı
  Future<Map<String, dynamic>> register(
      String email, String password, String name) async {
    try {
      print('🔄 Register isteği gönderiliyor: $baseUrl/auth/register');
      print('📧 Email: $email, İsim: $name');

      final response = await _dio.post(
        '/auth/register',
        data: {
          'email': email,
          'password': password,
          'name': name,
        },
      );

      print('✅ Register başarılı: ${response.statusCode}');
      print('📄 Response: ${response.data}');
      return response.data;
    } catch (e) {
      print('❌ Register hatası: $e');
      if (e is DioException) {
        print('🔍 DioException detayları:');
        print('   Status: ${e.response?.statusCode}');
        print('   Data: ${e.response?.data}');
        print('   Headers: ${e.response?.headers}');
        print('   Request: ${e.requestOptions.uri}');
        print('   Method: ${e.requestOptions.method}');
        print('   Data: ${e.requestOptions.data}');
      }

      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'Kayıt başarısız');
      }
      throw Exception('Kayıt hatası: $e');
    }
  }

  // Kullanıcı girişi
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      print('🔄 Login isteği gönderiliyor: $baseUrl/auth/login');
      print('📧 Email: $email');

      final response = await _dio.post(
        '/auth/login',
        data: {
          'email': email,
          'password': password,
        },
      );

      print('✅ Login başarılı: ${response.statusCode}');
      print('📄 Response: ${response.data}');
      return response.data;
    } catch (e) {
      print('❌ Login hatası: $e');
      if (e is DioException) {
        print('🔍 DioException detayları:');
        print('   Status: ${e.response?.statusCode}');
        print('   Data: ${e.response?.data}');
        print('   Headers: ${e.response?.headers}');
        print('   Request: ${e.requestOptions.uri}');
        print('   Method: ${e.requestOptions.method}');
        print('   Data: ${e.requestOptions.data}');
      }

      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'Giriş başarısız');
      }
      throw Exception('Giriş hatası: $e');
    }
  }

  // Kullanıcı profili
  Future<Map<String, dynamic>> getProfile() async {
    try {
      final response = await _dio.get('/auth/profile');
      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'Profil alınamadı');
      }
      throw Exception('Profil alma hatası: $e');
    }
  }

  // Öğrenci davet token'ı oluştur
  Future<InviteToken> createStudentInviteToken() async {
    try {
      final response = await _dio.post(
        '/invites/student',
        data: {},
      );

      return InviteToken.fromJson(response.data);
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ??
            'Öğrenci davet token oluşturulamadı');
      }
      throw Exception('Öğrenci davet token oluşturma hatası: $e');
    }
  }

  // Öğrenci davet token'ını kontrol et
  Future<InviteToken> verifyStudentInviteToken(String token) async {
    try {
      final response = await _dio.get('/invites/student/$token');
      return InviteToken.fromJson(response.data);
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Geçersiz öğrenci davet token');
      }
      throw Exception('Öğrenci token doğrulama hatası: $e');
    }
  }

  // Öğrenci kaydı yap
  Future<StudentModel> registerStudent(
      String token, StudentModel student) async {
    try {
      final response = await _dio.post(
        '/students/register',
        data: {
          'token': token,
          'student': student.toJson(),
        },
      );

      return StudentModel.fromJson(response.data['student']);
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Öğrenci kaydı başarısız');
      }
      throw Exception('Öğrenci kayıt hatası: $e');
    }
  }

  // Veli davet token'ı oluştur
  Future<ParentInviteToken> createParentInviteToken() async {
    try {
      final response = await _dio.post(
        '/invites/parent',
        data: {},
      );

      return ParentInviteToken.fromJson(response.data);
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Veli davet token oluşturulamadı');
      }
      throw Exception('Veli davet token oluşturma hatası: $e');
    }
  }

  // Veli davet token'ını kontrol et
  Future<ParentInviteToken> verifyParentInviteToken(String token) async {
    try {
      final response = await _dio.get('/invites/parent/$token');
      return ParentInviteToken.fromJson(response.data);
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Geçersiz veli davet token');
      }
      throw Exception('Veli token doğrulama hatası: $e');
    }
  }

  // Veli kaydı yap
  Future<ParentModel> registerParent(String token, ParentModel parent) async {
    try {
      final response = await _dio.post(
        '/parents/register',
        data: {
          'token': token,
          'parent': parent.toJson(),
        },
      );

      return ParentModel.fromJson(response.data['parent']);
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'Veli kaydı başarısız');
      }
      throw Exception('Veli kayıt hatası: $e');
    }
  }

  // GAMIFICATION ENDPOINTS

  // Kullanıcı ilerleme bilgisi
  Future<GamificationProgress> getProgress() async {
    try {
      final response = await _dio.get('/gamification/progress');
      return GamificationProgress.fromJson(response.data);
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'İlerleme bilgisi alınamadı');
      }
      throw Exception('İlerleme bilgisi alma hatası: $e');
    }
  }

  // Seviye bilgisi
  Future<LevelInfo> getLevelInfo() async {
    try {
      final response = await _dio.get('/gamification/level-info');
      return LevelInfo.fromJson(response.data);
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Seviye bilgisi alınamadı');
      }
      throw Exception('Seviye bilgisi alma hatası: $e');
    }
  }

  // Enerji durumu
  Future<EnergyStatus> getEnergyStatus() async {
    try {
      final response = await _dio.get('/gamification/energy-status');
      return EnergyStatus.fromJson(response.data);
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Enerji durumu alınamadı');
      }
      throw Exception('Enerji durumu alma hatası: $e');
    }
  }

  // Liderlik tablosu
  Future<Map<String, dynamic>> getLeaderboard() async {
    try {
      final response = await _dio.get('/gamification/leaderboard');
      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Liderlik tablosu alınamadı');
      }
      throw Exception('Liderlik tablosu alma hatası: $e');
    }
  }

  // Başarımlar
  Future<List<dynamic>> getAchievements() async {
    try {
      final response = await _dio.get('/gamification/achievements');
      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'Başarımlar alınamadı');
      }
      throw Exception('Başarımlar alma hatası: $e');
    }
  }

  // PLANNING ENDPOINTS

  // Kullanıcı planları
  Future<List<dynamic>> getUserPlans() async {
    try {
      final response = await _dio.get('/planning/user-plans');
      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'Planlar alınamadı');
      }
      throw Exception('Planlar alma hatası: $e');
    }
  }

  // Haftalık genel bakış
  Future<Map<String, dynamic>> getWeeklyOverview() async {
    try {
      final response = await _dio.get('/planning/weekly-overview');
      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Haftalık genel bakış alınamadı');
      }
      throw Exception('Haftalık genel bakış alma hatası: $e');
    }
  }

  // Plan oluştur
  Future<Map<String, dynamic>> generatePlan(
      Map<String, dynamic> planData) async {
    try {
      final response = await _dio.post(
        '/planning/generate-plan',
        data: planData,
      );
      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'Plan oluşturulamadı');
      }
      throw Exception('Plan oluşturma hatası: $e');
    }
  }

  // ANALYSIS ENDPOINTS

  // Performans panosu
  Future<Map<String, dynamic>> getPerformanceDashboard() async {
    try {
      final response = await _dio.get('/analysis/performance-dashboard');
      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Performans panosu alınamadı');
      }
      throw Exception('Performans panosu alma hatası: $e');
    }
  }

  // Zayıf alanlar
  Future<List<dynamic>> getWeakAreas() async {
    try {
      final response = await _dio.get('/analysis/weak-areas');
      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Zayıf alanlar alınamadı');
      }
      throw Exception('Zayıf alanlar alma hatası: $e');
    }
  }

  // SMART TOOLS ENDPOINTS

  // Araçlar listesi
  Future<Map<String, dynamic>> getToolsList() async {
    try {
      final response = await _dio.get('/smart-tools/tools-list');
      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Araçlar listesi alınamadı');
      }
      throw Exception('Araçlar listesi alma hatası: $e');
    }
  }

  // SOS Soru Çözücü
  Future<Map<String, dynamic>> solveQuestion(
      String question, String subject, int grade) async {
    try {
      final response = await _dio.post(
        '/smart-tools/sos-question-solver',
        data: {
          'question': question,
          'subject': subject,
          'grade': grade,
        },
      );
      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'Soru çözülemedi');
      }
      throw Exception('Soru çözme hatası: $e');
    }
  }

  // Özet Oluşturucu
  Future<Map<String, dynamic>> generateSummary(
      String content, String type) async {
    try {
      final response = await _dio.post(
        '/smart-tools/summary-generator',
        data: {
          'content': content,
          'type': type,
        },
      );
      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'Özet oluşturulamadı');
      }
      throw Exception('Özet oluşturma hatası: $e');
    }
  }

  // Genel POST metodu
  Future<Map<String, dynamic>> post(
      String endpoint, Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(endpoint, data: data);
      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'İstek başarısız');
      }
      throw Exception('POST hatası: $e');
    }
  }

  // Genel GET metodu
  Future<Map<String, dynamic>> get(String endpoint,
      {Map<String, dynamic>? queryParameters}) async {
    try {
      final response =
          await _dio.get(endpoint, queryParameters: queryParameters);
      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'İstek başarısız');
      }
      throw Exception('GET hatası: $e');
    }
  }
}
