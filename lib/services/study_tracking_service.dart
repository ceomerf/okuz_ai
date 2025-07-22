// JWT Backend için Study Tracking Service
// Firebase bağımlılığı tamamen kaldırıldı

import 'package:flutter/material.dart';
import 'api_client.dart';

class StudyTrackingService {
  final ApiClient _apiClient = ApiClient();

  // Çalışma seansı başlat
  Future<String?> startStudySession({
    required String subject,
    required String topic,
    int? duration,
  }) async {
    try {
      final response = await _apiClient.post('/study/start-session', {
        'subject': subject,
        'topic': topic,
        'duration': duration,
      });
      return response['sessionId'];
    } catch (e) {
      debugPrint('Çalışma seansı başlatma hatası: $e');
      return null;
    }
  }

  // Çalışma seansını bitir
  Future<bool> endStudySession({
    required String sessionId,
    int? actualDuration,
    int? score,
  }) async {
    try {
      await _apiClient.post('/study/end-session', {
        'sessionId': sessionId,
        'actualDuration': actualDuration,
        'score': score,
      });
      return true;
    } catch (e) {
      debugPrint('Çalışma seansı bitirme hatası: $e');
      return false;
    }
  }

  // Çalışma istatistiklerini getir
  Future<Map<String, dynamic>?> getStudyStats() async {
    try {
      final response = await _apiClient.get('/study/stats');
      return response;
    } catch (e) {
      debugPrint('Çalışma istatistikleri alma hatası: $e');
      return null;
    }
  }

  // Haftalık çalışma verilerini getir
  Future<Map<String, dynamic>?> getWeeklyStats() async {
    try {
      final response = await _apiClient.get('/study/weekly-stats');
      return response;
    } catch (e) {
      debugPrint('Haftalık istatistikler alma hatası: $e');
      return null;
    }
  }

  // Çalışma hedefi belirle
  Future<bool> setStudyGoal({
    required int dailyMinutes,
    required List<String> subjects,
  }) async {
    try {
      await _apiClient.post('/study/set-goal', {
        'dailyMinutes': dailyMinutes,
        'subjects': subjects,
      });
      return true;
    } catch (e) {
      debugPrint('Çalışma hedefi belirleme hatası: $e');
      return false;
    }
  }

  Future<List<String>> getTopSubjects() async {
    // Mock implementation
    return ['Matematik', 'Fizik', 'Kimya'];
  }

  Future<List<Map<String, dynamic>>> getDailyStudyLogs() async {
    // Mock implementation
    return [
      {'date': DateTime.now(), 'hours': 2},
      {'date': DateTime.now().subtract(Duration(days: 1)), 'hours': 3},
    ];
  }

  Stream<Map<String, dynamic>> getWeeklyStatsStream() {
    // Mock implementation
    return Stream.value({'week': 'Hafta 1', 'hours': 15});
  }

  Future<Map<String, dynamic>> getSubjectBreakdown() async {
    // Mock implementation
    return {'Matematik': 5, 'Fizik': 3, 'Kimya': 2};
  }

  Future<void> logStudySession(String subject, int duration) async {
    // Mock implementation
    debugPrint('Study session logged: $subject for $duration hours');
  }
}
