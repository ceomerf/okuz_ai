import 'api_client.dart';

class PlanService {
  final ApiClient _apiClient = ApiClient();

  // Singleton pattern
  static final PlanService _instance = PlanService._internal();
  factory PlanService() => _instance;
  PlanService._internal();

  // Kullanıcı planlarını al
  Future<List<dynamic>> getUserPlans() async {
    try {
      return await _apiClient.getUserPlans();
    } catch (e) {
      throw Exception('Planlar alınamadı: $e');
    }
  }

  // Haftalık genel bakış
  Future<Map<String, dynamic>> getWeeklyOverview() async {
    try {
      return await _apiClient.getWeeklyOverview();
    } catch (e) {
      throw Exception('Haftalık genel bakış alınamadı: $e');
    }
  }

  // Plan oluştur
  Future<Map<String, dynamic>> generatePlan({
    required List<String> subjects,
    required List<String> goals,
    required int availableTime,
    required String learningStyle,
    required String currentLevel,
    Map<String, dynamic>? preferences,
  }) async {
    try {
      final planData = {
        'subjects': subjects,
        'goals': goals,
        'availableTime': availableTime,
        'learningStyle': learningStyle,
        'currentLevel': currentLevel,
      };

      if (preferences != null) {
        planData['preferences'] = preferences;
      }

      return await _apiClient.generatePlan(planData);
    } catch (e) {
      throw Exception('Plan oluşturulamadı: $e');
    }
  }

  // Belirli bir planı al
  Future<Map<String, dynamic>> getPlan(String planId) async {
    try {
      return await _apiClient.get('/planning/plan/$planId');
    } catch (e) {
      throw Exception('Plan alınamadı: $e');
    }
  }

  // Kullanıcının planını al
  Future<Map<String, dynamic>> getUserPlan() async {
    try {
      final plans = await getUserPlans();
      if (plans.isEmpty) {
        return {};
      }
      // İlk aktif planı döndür
      return plans[0] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Kullanıcı planı alınamadı: $e');
    }
  }

  // Çalışma seansını tamamla
  Future<Map<String, dynamic>> completeSession({
    required String sessionId,
    required int performance,
    String? notes,
  }) async {
    try {
      return await _apiClient.post(
        '/planning/complete-session',
        {
          'sessionId': sessionId,
          'performance': performance,
          'notes': notes ?? '',
        },
      );
    } catch (e) {
      throw Exception('Seans tamamlanamadı: $e');
    }
  }

  // Çalışma seansını atla
  Future<Map<String, dynamic>> skipSession({
    required String sessionId,
    required String reason,
  }) async {
    try {
      return await _apiClient.post(
        '/planning/skip-session',
        {
          'sessionId': sessionId,
          'reason': reason,
        },
      );
    } catch (e) {
      throw Exception('Seans atlanamadı: $e');
    }
  }

  // Yeniden planlama önerileri al
  Future<Map<String, dynamic>> getRescheduleSuggestions({
    required String planId,
    required List<Map<String, dynamic>> conflicts,
    required Map<String, dynamic> performance,
  }) async {
    try {
      return await _apiClient.post(
        '/planning/ai-reschedule-suggestions',
        {
          'planId': planId,
          'conflicts': conflicts,
          'performance': performance,
        },
      );
    } catch (e) {
      throw Exception('Yeniden planlama önerileri alınamadı: $e');
    }
  }

  // Görevi tamamlandı olarak işaretle
  Future<Map<String, dynamic>> markTaskAsCompleted(
      String taskId, String status) async {
    try {
      return await _apiClient.post(
        '/planning/complete-session',
        {
          'sessionId': taskId,
          'status': status,
        },
      );
    } catch (e) {
      throw Exception('Görev tamamlanamadı: $e');
    }
  }

  // Görev ilerleme durumunu güncelle
  Future<Map<String, dynamic>> updateTaskProgress(
      String taskId, int minutes) async {
    try {
      return await _apiClient.post(
        '/planning/update-progress',
        {
          'taskId': taskId,
          'minutes': minutes,
        },
      );
    } catch (e) {
      throw Exception('Görev ilerlemesi güncellenemedi: $e');
    }
  }

  // Uzun vadeli plan oluştur
  Future<Map<String, dynamic>> generateInitialLongTermPlan({
    required List<String> subjects,
    required List<String> goals,
    required int availableTime,
    required String learningStyle,
    required String currentLevel,
  }) async {
    try {
      final planData = {
        'subjects': subjects,
        'goals': goals,
        'availableTime': availableTime,
        'learningStyle': learningStyle,
        'currentLevel': currentLevel,
        'isLongTerm': true,
      };

      return await _apiClient.post('/planning/create-long-term-plan', planData);
    } catch (e) {
      throw Exception('Uzun vadeli plan oluşturulamadı: $e');
    }
  }
}
