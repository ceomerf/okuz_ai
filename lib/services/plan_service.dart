import 'api_client.dart';
import '../models/plan_summary_model.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class PlanService {
  final ApiClient _apiClient;

  // Eski singleton kaldırıldı; DI zorunlu
  PlanService(this._apiClient);

  // Riverpod/DI için: named ctor korunabilir (opsiyonel)
  factory PlanService.withClient(ApiClient client) => PlanService(client);

  // Kullanıcı planlarını al
  Future<List<PlanSummary>> getUserPlans() async {
    try {
      // ApiClient zaten List<PlanSummary> döndürüyor; yeniden map etmeye gerek yok.
      final plans = await _apiClient.getUserPlans();
      return plans;
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

  // Planı güncelle (tam JSON veya kısmi veri)
  Future<Map<String, dynamic>> updatePlan(String planId, Map<String, dynamic> data) async {
    try {
      return await _apiClient.put('/planning/plan/$planId', data);
    } catch (e) {
      throw Exception('Plan güncellenemedi: $e');
    }
  }

  // Kullanıcının planını al
  Future<Map<String, dynamic>> getUserPlan() async {
    try {
      final plans = await getUserPlans();
      
      if (plans.isEmpty) {
        return {};
      }
      
      // İlk planın detaylarını getir ve döndür
      final firstPlan = plans.first;
      final planData = await getPlan(firstPlan.id);
      
      return planData;
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
        '/planning/session/$sessionId/complete',
        {
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
        '/planning/session/$sessionId/skip',
        {
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

  // Görevi tamamlandı olarak işaretle (tamamlamada performansı 100 kabul eder)
  Future<Map<String, dynamic>> markTaskAsCompleted(String sessionId,
      {int performance = 100, String notes = ''}) async {
    try {
      return await completeSession(
        sessionId: sessionId,
        performance: performance,
        notes: notes,
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

  // Onboarding verilerini kullanarak plan oluştur
  Future<Map<String, dynamic>> createPlanFromOnboarding({int? planDurationDays}) async {
    try {
      // SharedPreferences üzerinden onboarding sırasında kaydedilen verileri oku
      final prefs = await SharedPreferences.getInstance();

      // Zengin payload oluştur (mevcut/veri yoksa null bırak, backend default uygular)
      final Map<String, dynamic> planData = {
        'planType': 'initial',
        'useOnboardingData': true,
        'suppressLearningStyleInTitle': true,
        if (planDurationDays != null) 'planDurationDays': planDurationDays,

        // Kimlik / hedefler
        if ((prefs.getString('student_grade') ?? '').isNotEmpty)
          'grade': prefs.getString('student_grade'),
        if ((prefs.getString('academic_track') ?? '').isNotEmpty)
          'academicTrack': prefs.getString('academic_track'),
        if ((prefs.getString('student_target') ?? '').isNotEmpty)
          'targetExam': prefs.getString('student_target'),
        if ((prefs.getString('target_university') ?? '').isNotEmpty)
          'targetUniversity': prefs.getString('target_university'),

        // Çalışma tercihleri
        if ((prefs.getString('learning_style') ?? '').isNotEmpty)
          'learningStyle': prefs.getString('learning_style'),
        if ((prefs.getDouble('daily_hours') ?? 0) > 0)
          'dailyHours': prefs.getDouble('daily_hours'),
        if ((prefs.getInt('preferred_session_duration') ?? 0) > 0)
          'preferredSessionDuration': prefs.getInt('preferred_session_duration'),
        if ((prefs.getStringList('preferred_study_times') ?? []).isNotEmpty)
          'preferredStudyTimes': prefs.getStringList('preferred_study_times'),
        if ((prefs.getStringList('study_days') ?? []).isNotEmpty)
          'studyDays': (prefs.getStringList('study_days') ?? [])
              .map((e) => int.tryParse(e))
              .whereType<int>()
              .toList(),

        // Ders/konu durumu
        if ((prefs.getStringList('selected_subjects') ?? []).isNotEmpty)
          'selectedSubjects': prefs.getStringList('selected_subjects'),
        if ((prefs.getString('last_completed_topics_json') ?? '').isNotEmpty)
          'lastCompletedTopics': _tryParseJsonMapStringString(
              prefs.getString('last_completed_topics_json')!),
        if ((prefs.getString('confidence_levels_json') ?? '').isNotEmpty)
          'confidenceLevels': _tryParseJsonMapStringString(
              prefs.getString('confidence_levels_json')!),
        if ((prefs.getStringList('weaknesses') ?? []).isNotEmpty)
          'weaknesses': prefs.getStringList('weaknesses'),

        // Müfredat/tercihler
        if ((prefs.getString('curriculum_preference') ?? '').isNotEmpty)
          'curriculumPreference': prefs.getString('curriculum_preference'),
      };

      return await _apiClient.post('/planning/create-from-onboarding', planData);
    } catch (e) {
      throw Exception('Onboarding verilerinden plan oluşturulamadı: $e');
    }
  }

  // JSON string -> Map<String, String> güvenli dönüştürücü
  Map<String, String> _tryParseJsonMapStringString(String input) {
    try {
      final decoded = json.decode(input);
      if (decoded is Map) {
        final result = <String, String>{};
        decoded.forEach((key, value) {
          final k = key?.toString();
          final v = value?.toString();
          if (k != null && v != null) {
            result[k] = v;
          }
        });
        return result;
      }
      return {};
    } catch (_) {
      return {};
    }
  }

  // Premium plan oluştur (7 günlük veya 30 günlük)
  Future<Map<String, dynamic>> createPremiumPlan({
    required String planType, // '7-day' veya '30-day'
    required bool isPremium,
  }) async {
    try {
      final planData = {
        'planType': planType,
        'isPremium': isPremium,
        'useOnboardingData': true,
      };

      return await _apiClient.post('/planning/create-premium-plan', planData);
    } catch (e) {
      throw Exception('Premium plan oluşturulamadı: $e');
    }
  }

  // Tatil planı oluşturma
  Future<Map<String, dynamic>> createHolidayPlan({
    required String holidayType,
    int? duration,
    List<String>? goals,
    String? grade,
    String? academicTrack,
    String? targetExam,
    List<String>? selectedSubjects,
    double? dailyHours,
    Map<String, String>? confidenceLevels,
    Map<String, bool>? holidayWorkPreferences,
    String? approach,
    String? priority,
    bool? followSchool,
    bool? hasTYTKnowledge,
    String? topicTracking,
  }) async {
    try {
      final planData = {
        'holidayType': holidayType,
        if (duration != null) 'duration': duration,
        if (goals != null) 'goals': goals,
        if (grade != null) 'grade': grade,
        if (academicTrack != null) 'academicTrack': academicTrack,
        if (targetExam != null) 'targetExam': targetExam,
        if (selectedSubjects != null) 'selectedSubjects': selectedSubjects,
        if (dailyHours != null) 'dailyHours': dailyHours,
        if (confidenceLevels != null) 'confidenceLevels': confidenceLevels,
        if (holidayWorkPreferences != null) 'holidayWorkPreferences': holidayWorkPreferences,
        if (approach != null) 'approach': approach,
        if (priority != null) 'priority': priority,
        if (followSchool != null) 'followSchool': followSchool,
        if (hasTYTKnowledge != null) 'hasTYTKnowledge': hasTYTKnowledge,
        if (topicTracking != null) 'topicTracking': topicTracking,
      };

      print('🏖️ Tatil planı oluşturuluyor: $planData');
      
      return await _apiClient.post('/planning/create-holiday-plan', planData);
    } catch (e) {
      print('❌ Tatil planı oluşturma hatası: $e');
      throw Exception('Tatil planı oluşturulamadı: $e');
    }
  }
}
