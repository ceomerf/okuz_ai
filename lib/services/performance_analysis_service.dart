import 'api_client.dart';
import 'package:flutter/material.dart';

class PerformanceAnalysisService {
  final ApiClient _apiClient = ApiClient();

  // Singleton pattern
  static final PerformanceAnalysisService _instance =
      PerformanceAnalysisService._internal();
  factory PerformanceAnalysisService() => _instance;
  PerformanceAnalysisService._internal();

  // Performans panosu
  Future<Map<String, dynamic>> getPerformanceDashboard() async {
    try {
      return await _apiClient.getPerformanceDashboard();
    } catch (e) {
      throw Exception('Performans panosu alınamadı: $e');
    }
  }

  // Zayıf alanlar
  Future<List<dynamic>> getWeakAreas() async {
    try {
      return await _apiClient.getWeakAreas();
    } catch (e) {
      throw Exception('Zayıf alanlar alınamadı: $e');
    }
  }

  // Güçlü alanlar
  Future<List<dynamic>> getStrengthAreas() async {
    try {
      final response = await _apiClient.get('/analysis/strength-areas');
      return response['data'] as List<dynamic>;
    } catch (e) {
      throw Exception('Güçlü alanlar alınamadı: $e');
    }
  }

  // İlerleme trendleri
  Future<Map<String, dynamic>> getProgressTrends() async {
    try {
      return await _apiClient.get('/analysis/progress-trends');
    } catch (e) {
      throw Exception('İlerleme trendleri alınamadı: $e');
    }
  }

  // Sınav sonucu analizi
  Future<Map<String, dynamic>> analyzeExamResult({
    required Map<String, dynamic> examData,
    required String subject,
    required int grade,
    required int performance,
  }) async {
    try {
      return await _apiClient.post(
        '/analysis/exam-result',
        {
          'examData': examData,
          'subject': subject,
          'grade': grade,
          'performance': performance,
        },
      );
    } catch (e) {
      throw Exception('Sınav sonucu analizi yapılamadı: $e');
    }
  }

  // Konu analizi
  Future<Map<String, dynamic>> getSubjectAnalysis(String subject) async {
    try {
      return await _apiClient.get('/analysis/subject-analysis/$subject');
    } catch (e) {
      throw Exception('Konu analizi alınamadı: $e');
    }
  }

  // Öğrenme verimliliği
  Future<Map<String, dynamic>> getLearningEfficiency() async {
    try {
      return await _apiClient.get('/analysis/learning-efficiency');
    } catch (e) {
      throw Exception('Öğrenme verimliliği alınamadı: $e');
    }
  }

  // Haftalık rapor
  Future<Map<String, dynamic>> getWeeklyReport() async {
    try {
      return await _apiClient.get('/analysis/weekly-report');
    } catch (e) {
      throw Exception('Haftalık rapor alınamadı: $e');
    }
  }

  // Aylık rapor
  Future<Map<String, dynamic>> getMonthlyReport() async {
    try {
      return await _apiClient.get('/analysis/monthly-report');
    } catch (e) {
      throw Exception('Aylık rapor alınamadı: $e');
    }
  }

  // Öneriler
  Future<Map<String, dynamic>> getRecommendations({
    required String analysisType,
    required Map<String, dynamic> preferences,
  }) async {
    try {
      return await _apiClient.post(
        '/analysis/recommendations',
        {
          'analysisType': analysisType,
          'preferences': preferences,
        },
      );
    } catch (e) {
      throw Exception('Öneriler alınamadı: $e');
    }
  }

  Future<Map<String, dynamic>> getTopicConnection(String topic) async {
    // Mock implementation
    debugPrint('Getting topic connection for: $topic');
    return {
      'topic': topic,
      'connections': [
        {'topic': 'Related Topic 1', 'strength': 0.8},
        {'topic': 'Related Topic 2', 'strength': 0.6},
      ],
    };
  }

  Future<List<Map<String, dynamic>>> getTopicMap() async {
    // Mock implementation
    debugPrint('Getting topic map');
    return [
      {'topic': 'Algebra', 'mastery': 0.75, 'subtopics': []},
      {'topic': 'Geometry', 'mastery': 0.5, 'subtopics': []},
    ];
  }
}
