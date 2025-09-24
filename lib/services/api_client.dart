import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http_parser/http_parser.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../models/invite_token.dart';
import '../models/student_model.dart';
import '../models/parent_invite_token.dart';
import '../models/parent_model.dart';
import '../models/gamification.dart';
import '../models/student_profile.dart';
import '../models/plan_summary_model.dart';
import 'api_env.dart';
import 'production_auth_service.dart';

class ApiClient {
  // Ortak ortam yapılandırması
  static final String baseUrl = ApiEnv.baseUrl;

  // Secure storage for JWT
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  // Dio instance
  final Dio _dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 120), // Bağlantı timeout'u artırıldı
    receiveTimeout:
        const Duration(seconds: 180), // AI işlemleri için daha uzun timeout
  ));

  // Singleton pattern
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  ProductionAuthService? _authService;

  ApiClient._internal() {
    _initializeDio();
  }

  // Opsiyonel olarak AuthService ile kurulum yapabilen factory
  factory ApiClient.withAuth(ProductionAuthService authService) {
    _instance._authService = authService;
    return _instance;
  }

  // Global auth-expired yayını (UI dinleyebilir)
  static final StreamController<void> _authExpiredController = StreamController<void>.broadcast();
  static Stream<void> get authExpiredStream => _authExpiredController.stream;

  // Global plan refresh yayını (UI dinleyebilir)
  static final StreamController<void> _planRefreshController = StreamController<void>.broadcast();
  static Stream<void> get planRefreshStream => _planRefreshController.stream;

  // Dio interceptors for JWT token
  void _initializeDio() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // JWT token eklemeden önce hazırla
        final token = await _getJwtToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        options.headers['Content-Type'] = 'application/json';

        // Logları güncel header ile yaz
        print('🌐 Dio Request: ${options.method} ${options.uri}');
        print('📤 Request Headers: ${options.headers}');
        print('📤 Request Data: ${options.data}');
        return handler.next(options);
      },
      onResponse: (response, handler) {
        print('✅ Dio Response: ${response.statusCode}');
        print('📄 Response Data: ${response.data}');
        handler.next(response);
      },
      onError: (DioException error, handler) async {
        print('❌ Dio Error: ${error.message}');
        print('🔍 Error Status: ${error.response?.statusCode}');
        print('🔍 Error Data: ${error.response?.data}');
        print('🔍 Error Headers: ${error.response?.headers}');

        // 401 burada ele alınmıyor; metot bazında retry ile ele alınıyor
        return handler.next(error);
      },
    ));

    // 401 interceptor: otomatik refresh ve retry
    _dio.interceptors.add(QueuedInterceptorsWrapper(
      onError: (DioException error, ErrorInterceptorHandler handler) async {
        final status = error.response?.statusCode;
        final requestOptions = error.requestOptions;

        // Sadece 401 için dene ve refresh token endpoint'ini tekrar deneme
        if (status == 401 && !(requestOptions.path.contains('/auth/refresh-token'))) {
          try {
            await _refreshToken();

            // Yeni token'ı header'a koy ve isteği tekrar dene
            final newToken = await _getJwtToken();
            if (newToken != null) {
              final opts = Options(
                method: requestOptions.method,
                headers: {
                  ...requestOptions.headers,
                  'Authorization': 'Bearer $newToken',
                },
                responseType: requestOptions.responseType,
                contentType: requestOptions.contentType,
              );

              final cloneResponse = await _dio.request(
                requestOptions.path,
                data: requestOptions.data,
                queryParameters: requestOptions.queryParameters,
                options: opts,
              );
              return handler.resolve(cloneResponse);
            }
          } catch (e) {
            // refresh başarısız
            print('🔍 ApiClient: Refresh token başarısız, auth expired event gönderiliyor...');
            print('🔍 ApiClient: Refresh error: $e');
            _authExpiredController.add(null);
          }
        } else if (status == 401 && requestOptions.path.contains('/auth/refresh-token')) {
          // Refresh token da 401 döndürüyorsa direkt auth expired event gönder
          print('🔍 ApiClient: Refresh token endpoint 401 döndürdü, auth expired event gönderiliyor...');
          _authExpiredController.add(null);
        }

        return handler.next(error);
      },
    ));
  }

  // JWT token al
  Future<String?> _getJwtToken() async {
    final token = await _secureStorage.read(key: 'jwt_token');
    print(
        '🔍 JWT Token kontrolü: ${token != null ? 'Token var' : 'Token yok'}');
    if (token != null) {
      print('🔍 Token uzunluğu: ${token.length}');
      print('🔍 Token başlangıcı: ${token.substring(0, 20)}...');
    }
    return token;
  }

  // Token yenile
  Future<void> _refreshToken() async {
    try {
      final refreshToken = await _secureStorage.read(key: 'refresh_token');
      if (refreshToken == null) {
        print('🔁 Refresh token bulunamadı, sessiz yenileme yapılamıyor');
        print('🔍 ApiClient: Refresh token bulunamadı, auth expired event gönderiliyor...');
        _authExpiredController.add(null);
        throw Exception('NO_REFRESH_TOKEN');
      }

      final response = await _dio.post(
        '/auth/refresh-token',
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200) {
        await _secureStorage.write(
            key: 'jwt_token', value: response.data['token']);
        await _secureStorage.write(
            key: 'refresh_token', value: response.data['refreshToken']);
        print('🔁 Token başarıyla yenilendi');
      }
    } catch (e) {
      print('Token yenileme hatası: $e');
      // rethrow yerine direkt auth expired event gönder
      print('🔍 ApiClient: Refresh token başarısız, auth expired event gönderiliyor...');
      _authExpiredController.add(null);
      rethrow;
    }
  }

  // AuthService üzerinden çağrılabilsin
  Future<void> forceRefreshToken() => _refreshToken();

  Future<bool> _isOffline() async {
    try {
      final result = await Connectivity().checkConnectivity();
      return result == ConnectivityResult.none;
    } catch (_) {
      return false;
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
      print('🏥 Health check başlatılıyor: $baseUrl/health');
      final response = await http.get(
        Uri.parse('$baseUrl/health'),
        headers: {'Content-Type': 'application/json'},
      );
      print(
          '🏥 Health check sonucu: ${response.statusCode} - ${response.body}');
      return response.statusCode == 200;
    } catch (e) {
      print('🏥 Health check hatası: $e');
      return false;
    }
  }

  // Kullanıcı kaydı
  Future<Map<String, dynamic>> register(
      String email, String password, String name, String accountType) async {
    try {
      print('🔄 Register isteği gönderiliyor: $baseUrl/auth/register');
      print('📧 Email: $email, İsim: $name, Hesap Tipi: $accountType');
      print('🌐 Base URL: $baseUrl');
      print(
          '📤 Request data: {"email": "$email", "password": "***", "name": "$name", "accountType": "$accountType"}');

      final response = await _dio.post(
        '/auth/register',
        data: {
          'email': email,
          'password': password,
          'name': name,
          'accountType': accountType,
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
  Future<Map<String, dynamic>> login(
      String email, String password, String accountType) async {
    try {
      print('🔄 Login isteği gönderiliyor: $baseUrl/auth/login');
      print('📧 Email: $email');
      print('👤 Hesap Tipi: $accountType');

      final response = await _dio.post(
        '/auth/login',
        data: {
          'email': email,
          'password': password,
          // 'accountType': accountType, // Geçici olarak kaldırıldı
        },
      );

      print('✅ Login başarılı: ${response.statusCode}');
      print('📄 Response: ${response.data}');

      // JWT token'ı kaydet
      if (response.data['access_token'] != null) {
        await _secureStorage.write(
            key: 'jwt_token', value: response.data['access_token']);
        print('✅ JWT token kaydedildi');
      }

      // Refresh token varsa onu da kaydet
      if (response.data['refreshToken'] != null) {
        await _secureStorage.write(
            key: 'refresh_token', value: response.data['refreshToken']);
        print('✅ Refresh token kaydedildi');
      }

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

  // Google ile giriş
  Future<Map<String, dynamic>> loginWithGoogle(
      String accessToken, String idToken, String accountType) async {
    try {
      print('🔄 Google ile giriş isteği gönderiliyor: $baseUrl/auth/google');
      print('🔑 Access Token: ${accessToken.substring(0, 20)}...');
      print('🔑 ID Token: ${idToken.substring(0, 20)}...');
      print('👤 Hesap Tipi: $accountType');

      final response = await _dio.post(
        '/auth/google',
        data: {
          'accessToken': accessToken,
          'idToken': idToken,
          // 'accountType': accountType, // Geçici olarak kaldırıldı
        },
      );

      print('✅ Google ile giriş başarılı: ${response.statusCode}');
      print('📄 Response: ${response.data}');

      // JWT token'ı kaydet
      if (response.data['access_token'] != null) {
        await _secureStorage.write(
            key: 'jwt_token', value: response.data['access_token']);
        print('✅ JWT token kaydedildi');
      }

      // Refresh token varsa onu da kaydet
      if (response.data['refreshToken'] != null) {
        await _secureStorage.write(
            key: 'refresh_token', value: response.data['refreshToken']);
        print('✅ Refresh token kaydedildi');
      }

      return response.data;
    } catch (e) {
      print('❌ Google ile giriş hatası: $e');
      if (e is DioException) {
        print('🔍 DioException detayları (Google):');
        print('   Status: ${e.response?.statusCode}');
        print('   Data: ${e.response?.data}');
        print('   Headers: ${e.response?.headers}');
        print('   Request: ${e.requestOptions.uri}');
        print('   Method: ${e.requestOptions.method}');
        print('   Data: ${e.requestOptions.data}');
      }

      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Google ile giriş başarısız');
      }
      throw Exception('Google ile giriş hatası: $e');
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

  // YENİ DAVET SİSTEMİ FONKSİYONLARI

  // Davet oluştur
  Future<Map<String, dynamic>> createInvite(String email, String role) async {
    try {
      print('🔄 Davet oluşturma isteği gönderiliyor: $baseUrl/invites');
      print('📧 Email: $email, Rol: $role');

      // JWT token kontrolü
      final token = await _getJwtToken();
      if (token == null || token.isEmpty) {
        print('⚠️ JWT token bulunamadı. Lütfen giriş yapın.');
        throw Exception('Davet oluşturmak için giriş yapmalısınız');
      }

      print('🔑 Token ile istek gönderiliyor');

      final response = await _dio.post(
        '/invites',
        data: {
          'email': email,
          'role': role, // 'STUDENT' veya 'PARENT'
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );

      print('✅ Davet oluşturma başarılı: ${response.statusCode}');
      print('📄 Response: ${response.data}');
      return response.data;
    } catch (e) {
      print('❌ Davet oluşturma hatası: $e');
      if (e is DioException) {
        print('🔍 DioException detayları (Davet Oluşturma):');
        print('   Status: ${e.response?.statusCode}');
        print('   Data: ${e.response?.data}');
        print('   Headers: ${e.response?.headers}');
        print('   Request: ${e.requestOptions.uri}');
        print('   Method: ${e.requestOptions.method}');
        print('   Data: ${e.requestOptions.data}');
      }

      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'Davet oluşturulamadı');
      }
      throw Exception('Davet oluşturma hatası: $e');
    }
  }

  // Davet kontrol et
  Future<Map<String, dynamic>> verifyInvite(String token) async {
    try {
      print('🔄 Davet kontrol isteği gönderiliyor: $baseUrl/invites/$token');

      final response = await _dio.get('/invites/$token');

      print('✅ Davet kontrol başarılı: ${response.statusCode}');
      print('📄 Response: ${response.data}');
      return response.data;
    } catch (e) {
      print('❌ Davet kontrol hatası: $e');
      if (e is DioException) {
        print('🔍 DioException detayları (Davet Kontrol):');
        print('   Status: ${e.response?.statusCode}');
        print('   Data: ${e.response?.data}');
        print('   Headers: ${e.response?.headers}');
        print('   Request: ${e.requestOptions.uri}');
      }

      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'Geçersiz davet');
      }
      throw Exception('Davet kontrol hatası: $e');
    }
  }

  // Davet kabul et
  Future<Map<String, dynamic>> acceptInvite(
      String token, String name, String password) async {
    try {
      print(
          '🔄 Davet kabul isteği gönderiliyor: $baseUrl/invites/$token/accept');
      print('👤 İsim: $name');

      final response = await _dio.post(
        '/invites/$token/accept',
        data: {
          'name': name,
          'password': password,
        },
      );

      print('✅ Davet kabul başarılı: ${response.statusCode}');
      print('📄 Response: ${response.data}');
      return response.data;
    } catch (e) {
      print('❌ Davet kabul hatası: $e');
      if (e is DioException) {
        print('🔍 DioException detayları (Davet Kabul):');
        print('   Status: ${e.response?.statusCode}');
        print('   Data: ${e.response?.data}');
        print('   Headers: ${e.response?.headers}');
        print('   Request: ${e.requestOptions.uri}');
        print('   Method: ${e.requestOptions.method}');
        print('   Data: ${e.requestOptions.data}');
      }

      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'Davet kabul edilemedi');
      }
      throw Exception('Davet kabul hatası: $e');
    }
  }

  // Öğrenci davet token'ı oluştur
  Future<InviteToken> createStudentInviteToken() async {
    try {
      // Yeni davet sistemini kullan
      final response = await createInvite('student@temp.com', 'STUDENT');

      // Eski formata dönüştür
      return InviteToken(
        id: response['id'] ?? '',
        token: response['token'] ?? '',
        type: 'student',
        createdBy: 'system',
        isUsed: false,
        parentId: 'parent-id',
        createdAt: response['createdAt'] != null
            ? DateTime.parse(response['createdAt'])
            : DateTime.now(),
      );
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
      // Yeni davet sistemini kullan
      final response = await verifyInvite(token);

      // Eski formata dönüştür
      return InviteToken(
        id: response['id'] ?? '',
        token: response['token'] ?? '',
        type: 'student',
        createdBy: 'system',
        isUsed: false,
        parentId: 'parent-id',
        createdAt: response['createdAt'] != null
            ? DateTime.parse(response['createdAt'])
            : DateTime.now(),
      );
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
      // Yeni davet sistemini kullan
      final response = await createInvite('parent@temp.com', 'PARENT');

      // Eski formata dönüştür
      return ParentInviteToken.fromJson({
        'id': response['id'] ?? '',
        'token': response['token'] ?? '',
        'type': 'parent',
        'createdBy': 'system',
        'isUsed': false,
        'studentId': 'student-id',
        'createdAt': response['createdAt'] ?? DateTime.now().toIso8601String(),
      });
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
      // Yeni davet sistemini kullan
      final response = await verifyInvite(token);

      // Eski formata dönüştür
      return ParentInviteToken.fromJson({
        'id': response['id'] ?? '',
        'token': response['token'] ?? '',
        'type': 'parent',
        'createdBy': 'system',
        'isUsed': false,
        'studentId': 'student-id',
        'createdAt': response['createdAt'] ?? DateTime.now().toIso8601String(),
      });
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Geçersiz veli davet token');
      }
      throw Exception('Veli token doğrulama hatası: $e');
    }
  }

  // Veli kaydı yap (eski metod - token ile)
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

  // Yeni veli kaydı yap (davet kodu ile)
  Future<Map<String, dynamic>> registerParentWithInviteCode({
    required String name,
    required String email,
    required String password,
    required String inviteCode,
  }) async {
    try {
      final response = await _dio.post(
        '/auth/register-parent',
        data: {
          'name': name,
          'email': email,
          'password': password,
          'inviteCode': inviteCode,
        },
      );

      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'Veli kaydı başarısız');
      }
      throw Exception('Veli kayıt hatası: $e');
    }
  }

  // Davet kodu doğrula
  Future<Map<String, dynamic>> validateInviteCode(String inviteCode) async {
    try {
      final response = await _dio.post(
        '/invite-codes/validate',
        data: {
          'code': inviteCode,
        },
      );

      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Davet kodu doğrulanamadı');
      }
      throw Exception('Davet kodu doğrulama hatası: $e');
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
  Future<List<PlanSummary>> getUserPlans() async {
    try {
      debugPrint('🌐 getUserPlans API çağrısı yapılıyor...');
      final response = await _dio.get('/planning/user-plans');
      debugPrint('✅ getUserPlans başarılı: ${response.data}');
      
      // Response'u List<dynamic> olarak cast et
      final List<dynamic> plansList = response.data is List ? response.data as List<dynamic> : [];
      
      return plansList.map((json) => PlanSummary.fromJson(json as Map<String, dynamic>)).toList();
    } catch (e) {
      debugPrint('❌ getUserPlans hatası: $e');
      if (e is DioException && e.response != null) {
        debugPrint(
            '❌ Dio hatası: ${e.response?.statusCode} - ${e.response?.data}');
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
      
      // Plan oluşturulduğunda global refresh event'i tetikle
      _planRefreshController.add(null);
      
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

  // Özet Oluşturucu - Multipart/form-data desteği ile
  Future<Map<String, dynamic>> generateSummary({
    required String sourceType,
    String? textToSummarize,
    String? sourceUrl,
    File? sourceFile,
    required String format,
    required String length,
  }) async {
    try {
      // FormData oluştur
      final formData = FormData();

      // Zorunlu alanları ekle
      formData.fields.add(MapEntry('sourceType', sourceType));
      formData.fields.add(MapEntry('format', format));
      formData.fields.add(MapEntry('length', length));

      // Kaynak tipine göre ilgili alanı ekle
      if (sourceType == 'text' && textToSummarize != null) {
        formData.fields.add(MapEntry('sourceText', textToSummarize));
      } else if (sourceType == 'url' && sourceUrl != null) {
        formData.fields.add(MapEntry('sourceUrl', sourceUrl));
      } else if (sourceType == 'pdf' && sourceFile != null) {
        formData.files.add(MapEntry(
          'sourceFile',
          await MultipartFile.fromFile(
            sourceFile.path,
            filename: sourceFile.path.split('/').last,
            contentType: MediaType('application', 'pdf'),
          ),
        ));
      }

      final response = await _dio.post(
        '/smart-tools/summary-generator',
        data: formData,
      );

      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'Özet oluşturulamadı');
      }
      throw Exception('Özet oluşturma hatası: $e');
    }
  }

  // PDF olarak dışa aktar
  Future<Uint8List> exportSummaryAsPdf(String summaryText, String topic) async {
    try {
      final response = await _dio.post(
        '/smart-tools/summary-generator',
        data: {
          'summaryText': summaryText,
          'topic': topic,
          'exportAsPdf': true,
        },
        options: Options(
          responseType: ResponseType.bytes,
        ),
      );

      return Uint8List.fromList(response.data);
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'PDF oluşturulamadı');
      }
      throw Exception('PDF oluşturma hatası: $e');
    }
  }

  // Genel POST metodu
  Future<Map<String, dynamic>> post(
      String endpoint, Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(endpoint, data: data);
      
      // Plan oluşturma endpoint'lerinde global refresh event'i tetikle
      if (endpoint.contains('/planning/') && 
          (endpoint.contains('create') || endpoint.contains('generate'))) {
        _planRefreshController.add(null);
      }
      
      return response.data;
    } catch (e) {
      if (e is DioException) {
        // 401 ise refresh dene ve isteği tekrarla
        if (e.response?.statusCode == 401) {
          final retried = await _tryRefreshAndRetry(() => _dio.post(endpoint, data: data));
          if (retried != null) {
            // Retry başarılıysa da plan refresh event'i tetikle
            if (endpoint.contains('/planning/') && 
                (endpoint.contains('create') || endpoint.contains('generate'))) {
              _planRefreshController.add(null);
            }
            return retried.data as Map<String, dynamic>;
          }
          _authExpiredController.add(null);
        }
        if (await _isOffline()) {
          throw Exception('İnternet bağlantınızı kontrol edin');
        }
        if (e.response != null) {
          throw Exception(e.response?.data['message'] ?? 'Sunucuya ulaşılamadı, lütfen daha sonra tekrar deneyin');
        }
      }
      throw Exception('POST hatası: $e');
    }
  }

  // Multipart POST metodu (resim yükleme için)
  Future<Map<String, dynamic>> postMultipart(
      String endpoint, Map<String, dynamic> data, File? imageFile) async {
    try {
      final token = await _getJwtToken();

      // FormData oluştur - string değerleri düzgün şekilde ekle
      final Map<String, dynamic> formMap = {};

      // String değerleri ekle
      data.forEach((key, value) {
        if (value != null && value.toString().isNotEmpty) {
          formMap[key] = value.toString();
        }
      });

      // Resim dosyasını ekle
      if (imageFile != null) {
        formMap['image'] = await MultipartFile.fromFile(
          imageFile.path,
          filename: 'question_image.jpg',
          contentType: MediaType('image', 'jpeg'),
        );
      }

      final formData = FormData.fromMap(formMap);

      // Debug log
      print('🔍 FormData fields: ${formData.fields}');
      print('🔍 FormData files: ${formData.files}');

      // Headers ayarla
      final headers = {
        if (token != null) 'Authorization': 'Bearer $token',
      };

      final response = await _dio.post(
        endpoint,
        data: formData,
        options: Options(headers: headers),
      );

      return response.data;
    } catch (e) {
      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'İstek başarısız');
      }
      throw Exception('Multipart POST hatası: $e');
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
      if (e is DioException) {
        if (e.response?.statusCode == 401) {
          final retried = await _tryRefreshAndRetry(() => _dio.get(endpoint, queryParameters: queryParameters));
          if (retried != null) return retried.data as Map<String, dynamic>;
          _authExpiredController.add(null);
        }
        if (await _isOffline()) {
          throw Exception('İnternet bağlantınızı kontrol edin');
        }
        if (e.response != null) {
          throw Exception(e.response?.data['message'] ?? 'Sunucuya ulaşılamadı, lütfen daha sonra tekrar deneyin');
        }
      }
      throw Exception('GET hatası: $e');
    }
  }

  // Esnek GET metodu - Map veya List döndürebilir
  Future<dynamic> getFlexible(String endpoint,
      {Map<String, dynamic>? queryParameters}) async {
    try {
      final response =
          await _dio.get(endpoint, queryParameters: queryParameters);
      return response.data;
    } catch (e) {
      if (e is DioException) {
        if (e.response?.statusCode == 401) {
          final retried = await _tryRefreshAndRetry(() => _dio.get(endpoint, queryParameters: queryParameters));
          if (retried != null) return retried.data;
          _authExpiredController.add(null);
        }
        if (await _isOffline()) {
          throw Exception('İnternet bağlantınızı kontrol edin');
        }
        if (e.response != null) {
          throw Exception(e.response?.data['message'] ?? 'Sunucuya ulaşılamadı, lütfen daha sonra tekrar deneyin');
        }
      }
      throw Exception('GET hatası: $e');
    }
  }

  // Genel DELETE metodu
  Future<Map<String, dynamic>> delete(String endpoint) async {
    try {
      final response = await _dio.delete(endpoint);
      return response.data;
    } catch (e) {
      if (e is DioException) {
        if (e.response?.statusCode == 401) {
          final retried = await _tryRefreshAndRetry(() => _dio.delete(endpoint));
          if (retried != null) return retried.data as Map<String, dynamic>;
          _authExpiredController.add(null);
        }
        if (await _isOffline()) {
          throw Exception('İnternet bağlantınızı kontrol edin');
        }
        if (e.response != null) {
          throw Exception(e.response?.data['message'] ?? 'Sunucuya ulaşılamadı, lütfen daha sonra tekrar deneyin');
        }
      }
      throw Exception('DELETE hatası: $e');
    }
  }

  // Genel PUT metodu
  Future<Map<String, dynamic>> put(String endpoint, Map<String, dynamic> data) async {
    try {
      final response = await _dio.put(endpoint, data: data);
      return response.data;
    } catch (e) {
      if (e is DioException) {
        if (e.response?.statusCode == 401) {
          final retried = await _tryRefreshAndRetry(() => _dio.put(endpoint, data: data));
          if (retried != null) return retried.data as Map<String, dynamic>;
          _authExpiredController.add(null);
        }
        if (await _isOffline()) {
          throw Exception('İnternet bağlantınızı kontrol edin');
        }
        if (e.response != null) {
          throw Exception(e.response?.data['message'] ?? 'Sunucuya ulaşılamadı, lütfen daha sonra tekrar deneyin');
        }
      }
      throw Exception('PUT hatası: $e');
    }
  }

  // 401 sonrası token yenileyip isteği tekrar dene
  Future<Response<dynamic>?> _tryRefreshAndRetry(Future<Response<dynamic>> Function() requestFn) async {
    try {
      await _refreshToken();
      final token = await _getJwtToken();
      if (token != null) {
        _dio.options.headers['Authorization'] = 'Bearer $token';
      }
      return await requestFn();
    } catch (_) {
      return null;
    }
  }

  // Kullanıcı çıkışı
  Future<void> logout() async {
    try {
      print('🔄 Kullanıcı çıkışı yapılıyor...');

      // Secure storage'dan token'ları sil
      await _secureStorage.delete(key: 'jwt_token');
      await _secureStorage.delete(key: 'refresh_token');

      print('✅ Çıkış başarılı, tokenlar silindi');
    } catch (e) {
      print('❌ Çıkış hatası: $e');
      throw Exception('Çıkış yapılırken bir hata oluştu: $e');
    }
  }

  // JWT token kontrolü
  Future<bool> hasValidToken() async {
    try {
      final token = await _getJwtToken();
      return token != null && token.isNotEmpty;
    } catch (e) {
      print('❌ Token kontrolü hatası: $e');
      return false;
    }
  }

  // Davet kodunu doğrula
  Future<Map<String, dynamic>> verifyInviteCode(String code) async {
    try {
      print(
          '🔄 Davet kodu doğrulama isteği gönderiliyor: $baseUrl/invite-codes/verify');
      print('🔑 Kod: $code');

      final response = await _dio.post(
        '/invite-codes/verify',
        data: {
          'code': code,
        },
      );

      print('✅ Davet kodu doğrulama başarılı: ${response.statusCode}');
      print('📄 Response: ${response.data}');
      return response.data;
    } catch (e) {
      print('❌ Davet kodu doğrulama hatası: $e');
      if (e is DioException) {
        print('🔍 DioException detayları (Davet Kodu Doğrulama):');
        print('   Status: ${e.response?.statusCode}');
        print('   Data: ${e.response?.data}');
        print('   Headers: ${e.response?.headers}');
        print('   Request: ${e.requestOptions.uri}');
      }

      if (e is DioException && e.response != null) {
        throw Exception(e.response?.data['message'] ?? 'Geçersiz davet kodu');
      }
      throw Exception('Davet kodu doğrulama hatası: $e');
    }
  }

  // Kullanıcının davet kodlarını getir
  Future<Map<String, dynamic>> getUserInviteCodes() async {
    try {
      print(
          '�� Kullanıcının davet kodları getiriliyor: $baseUrl/invite-codes/my-codes');

      final response = await _dio.get('/invite-codes/my-codes');

      print(
          '✅ Kullanıcının davet kodları başarıyla getirildi: ${response.statusCode}');
      print('📄 Response: ${response.data}');
      return response.data;
    } catch (e) {
      print('❌ Kullanıcının davet kodları getirme hatası: $e');
      if (e is DioException) {
        print('🔍 DioException detayları (Kullanıcının Davet Kodları):');
        print('   Status: ${e.response?.statusCode}');
        print('   Data: ${e.response?.data}');
        print('   Headers: ${e.response?.headers}');
        print('   Request: ${e.requestOptions.uri}');
      }

      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Davet kodları getirilemedi');
      }
      throw Exception('Davet kodları getirme hatası: $e');
    }
  }

  // Davet kodu oluştur
  Future<Map<String, dynamic>> createInviteCode(String type) async {
    try {
      print(
          '🔄 Davet kodu oluşturma isteği gönderiliyor: $baseUrl/invite-codes');
      print('📧 Tip: $type');

      final response = await _dio.post(
        '/invite-codes',
        data: {
          'type': type,
        },
      );

      print('✅ Davet kodu oluşturma başarılı: ${response.statusCode}');
      print('📄 Response: ${response.data}');
      return response.data;
    } catch (e) {
      print('❌ Davet kodu oluşturma hatası: $e');
      if (e is DioException) {
        print('🔍 DioException detayları (Davet Kodu Oluşturma):');
        print('   Status: ${e.response?.statusCode}');
        print('   Data: ${e.response?.data}');
        print('   Headers: ${e.response?.headers}');
        print('   Request: ${e.requestOptions.uri}');
      }

      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Davet kodu oluşturulamadı');
      }
      throw Exception('Davet kodu oluşturma hatası: $e');
    }
  }

  // Davet kodunu kabul et
  Future<Map<String, dynamic>> acceptInviteCode(String code) async {
    try {
      print(
          '🔄 Davet kodu kabul isteği gönderiliyor: $baseUrl/invite-codes/accept');
      print('🔑 Kod: $code');

      final response = await _dio.post(
        '/invite-codes/accept',
        data: {
          'code': code,
        },
      );

      print('✅ Davet kodu kabul başarılı: ${response.statusCode}');
      print('📄 Response: ${response.data}');
      return response.data;
    } catch (e) {
      print('❌ Davet kodu kabul hatası: $e');
      if (e is DioException) {
        print('🔍 DioException detayları (Davet Kodu Kabul):');
        print('   Status: ${e.response?.statusCode}');
        print('   Data: ${e.response?.data}');
        print('   Headers: ${e.response?.headers}');
        print('   Request: ${e.requestOptions.uri}');
      }

      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Davet kodu kabul edilemedi');
      }
      throw Exception('Davet kodu kabul hatası: $e');
    }
  }

  // Davet kodlarını getir
  Future<List<dynamic>> getInviteCodes() async {
    try {
      print(
          '🔄 Davet kodları getirme isteği gönderiliyor: $baseUrl/invite-codes');

      final response = await _dio.get('/invite-codes');

      print('✅ Davet kodları getirme başarılı: ${response.statusCode}');
      print('📄 Response: ${response.data}');
      return response.data;
    } catch (e) {
      print('❌ Davet kodları getirme hatası: $e');
      if (e is DioException) {
        print('🔍 DioException detayları (Davet Kodları Getirme):');
        print('   Status: ${e.response?.statusCode}');
        print('   Data: ${e.response?.data}');
        print('   Headers: ${e.response?.headers}');
        print('   Request: ${e.requestOptions.uri}');
      }

      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Davet kodları getirilemedi');
      }
      throw Exception('Davet kodları getirme hatası: $e');
    }
  }

  // Davet kodu ile kayıt ol
  Future<Map<String, dynamic>> registerWithInviteCode(
      String code, String name, String email, String password) async {
    try {
      print(
          '🔄 Davet kodu ile kayıt isteği gönderiliyor: $baseUrl/auth/register-with-invite');
      print('🔑 Kod: $code');
      print('👤 İsim: $name');
      print('📧 Email: $email');

      final response = await _dio.post(
        '/auth/register-with-invite',
        data: {
          'code': code,
          'name': name,
          'email': email,
          'password': password,
        },
      );

      print('✅ Davet kodu ile kayıt başarılı: ${response.statusCode}');
      print('📄 Response: ${response.data}');

      // JWT token'ı sakla
      if (response.data['token'] != null) {
        await _secureStorage.write(
            key: 'jwt_token', value: response.data['token']);
        print('🔐 JWT token kaydedildi');
      }

      return response.data;
    } catch (e) {
      print('❌ Davet kodu ile kayıt hatası: $e');
      if (e is DioException) {
        print('🔍 DioException detayları (Davet Kodu ile Kayıt):');
        print('   Status: ${e.response?.statusCode}');
        print('   Data: ${e.response?.data}');
        print('   Headers: ${e.response?.headers}');
        print('   Request: ${e.requestOptions.uri}');
      }

      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Davet kodu ile kayıt başarısız');
      }
      throw Exception('Davet kodu ile kayıt hatası: $e');
    }
  }

  // Velinin çocuklarını getir
  Future<Map<String, dynamic>> getMyChildren() async {
    try {
      print('🔄 Velinin çocukları getiriliyor: $baseUrl/parents/my-children');

      final response = await _dio.get('/parents/my-children');

      print('✅ Velinin çocukları başarıyla getirildi: ${response.statusCode}');
      print('📄 Response: ${response.data}');
      return response.data;
    } catch (e) {
      print('❌ Velinin çocukları getirme hatası: $e');
      if (e is DioException) {
        print('🔍 DioException detayları (Velinin Çocukları):');
        print('   Status: ${e.response?.statusCode}');
        print('   Data: ${e.response?.data}');
        print('   Headers: ${e.response?.headers}');
        print('   Request: ${e.requestOptions.uri}');
      }

      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Çocuk listesi getirilemedi');
      }
      throw Exception('Çocuk listesi getirme hatası: $e');
    }
  }

  // Davet kodları getir

  // YKS spesifik API çağrıları
  Future<Map<String, dynamic>> assignYKSSubjects(
      Map<String, dynamic> data) async {
    return await post('/planning/yks/assign-subjects', data);
  }

  Future<Map<String, dynamic>> generateYKSPlan(
      Map<String, dynamic> data) async {
    return await post('/planning/yks/generate-plan', data);
  }

  Future<Map<String, dynamic>> getYKSSubjectRecommendations({
    required String grade,
    required String academicTrack,
    String? curriculumPreference,
  }) async {
    return await get('/planning/yks/subject-recommendations', queryParameters: {
      'grade': grade,
      'academicTrack': academicTrack,
      if (curriculumPreference != null)
        'curriculumPreference': curriculumPreference,
    });
  }

  Future<Map<String, dynamic>> getMEBWeeklyTopics({
    required String grade,
    required String academicTrack,
    required int week,
  }) async {
    return await get('/planning/yks/meb-topics', queryParameters: {
      'grade': grade,
      'academicTrack': academicTrack,
      'week': week.toString(),
    });
  }

  // Günlük program getir
  Future<Map<String, dynamic>> getDailySchedule(String date) async {
    try {
      print('🔄 Günlük program getiriliyor: $baseUrl/planning/daily-schedule');
      print('📅 Tarih: $date');

      final response = await _dio.post('/planning/daily-schedule', data: {
        'date': date,
      });

      print('✅ Günlük program başarıyla getirildi: ${response.statusCode}');
      print('📄 Response: ${response.data}');
      return response.data;
    } catch (e) {
      print('❌ Günlük program getirme hatası: $e');
      if (e is DioException) {
        print('🔍 DioException detayları (Günlük Program):');
        print('   Status: ${e.response?.statusCode}');
        print('   Data: ${e.response?.data}');
        print('   Headers: ${e.response?.headers}');
        print('   Request: ${e.requestOptions.uri}');
      }

      if (e is DioException && e.response != null) {
        throw Exception(
            e.response?.data['message'] ?? 'Günlük program getirilemedi');
      }
      throw Exception('Günlük program getirme hatası: $e');
    }
  }
}
