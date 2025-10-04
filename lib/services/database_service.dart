import '../models/student_profile.dart';
import '../models/long_term_plan.dart';
import 'api_client.dart';

class DatabaseService {
  final ApiClient _apiClient;
  DatabaseService(this._apiClient);

  // Kullanıcı profili işlemleri
  Future<List<StudentProfile>> getStudentProfiles() async {
    try {
      final response = await _apiClient.get('/users/profiles');
      final List<dynamic> data = response['data'] ?? response;
      return data.map((json) => StudentProfile.fromJson(json)).toList();
    } catch (e) {
      print('DatabaseService getStudentProfiles error: $e');
      rethrow;
    }
  }

  Future<void> addStudent(StudentProfile student) async {
    try {
      await _apiClient.post('/users/profiles', student.toJson());
    } catch (e) {
      print('DatabaseService addStudent error: $e');
      rethrow;
    }
  }

  // Plan işlemleri
  Future<List<LongTermPlan>> getPlans() async {
    try {
      final response = await _apiClient.get('/plans');
      final List<dynamic> data = response['data'] ?? response;
      return data.map((json) => LongTermPlan.fromJson(json)).toList();
    } catch (e) {
      print('DatabaseService getPlans error: $e');
      rethrow;
    }
  }

  Future<void> addPlan(LongTermPlan plan) async {
    try {
      await _apiClient.post('/plans', plan.toJson());
    } catch (e) {
      print('DatabaseService addPlan error: $e');
      rethrow;
    }
  }

  // Çalışma oturumu kaydetme
  Future<void> logStudySession({
    required String subject,
    required String topic,
    required int durationInMinutes,
    required DateTime startTime,
    required DateTime endTime,
    String? notes,
    Map<String, dynamic>? performanceData,
  }) async {
    try {
      final sessionData = {
        'subject': subject,
        'topic': topic,
        'durationInMinutes': durationInMinutes,
        'startTime': startTime.toIso8601String(),
        'endTime': endTime.toIso8601String(),
        'notes': notes,
        'performanceData': performanceData,
      };

      await _apiClient.post('/study-sessions', sessionData);
    } catch (e) {
      print('DatabaseService logStudySession error: $e');
      rethrow;
    }
  }

  // Performans Dashboard - tek uç
  Future<Map<String, dynamic>> getPerformanceDashboard() async {
    try {
      final response = await _apiClient.get('/analysis/performance-dashboard');
      return response as Map<String, dynamic>;
    } catch (e) {
      print('DatabaseService getPerformanceDashboard error: $e');
      rethrow;
    }
  }

  // Çalışma hedefleri
  Future<List<Map<String, dynamic>>> getStudyGoals(String userId) async {
    try {
      final response = await _apiClient.get('/goals/$userId');
      final List<dynamic> data = response['data'] ?? response;
      return data.cast<Map<String, dynamic>>();
    } catch (e) {
      print('DatabaseService getStudyGoals error: $e');
      rethrow;
    }
  }

  // Başarılar
  Future<Map<String, dynamic>> getAchievements(String userId) async {
    try {
      final response = await _apiClient.get('/achievements/$userId');
      return response;
    } catch (e) {
      print('DatabaseService getAchievements error: $e');
      rethrow;
    }
  }

  // Cloud function çağrısı
  Future<dynamic> callCloudFunction(String name, Map<String, dynamic> params) async {
    try {
      final response = await _apiClient.post('/cloud-functions/$name', params);
      return response;
    } catch (e) {
      print('DatabaseService callCloudFunction error: $e');
      rethrow;
    }
  }

  // Resim yükleme
  Future<String> uploadImage(dynamic file) async {
    try {
      final response = await _apiClient.postMultipart('/upload/image', {}, file);
      return response['url'] ?? '';
    } catch (e) {
      print('DatabaseService uploadImage error: $e');
      rethrow;
    }
  }
} 