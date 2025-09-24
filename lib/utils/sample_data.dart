import '../models/plan_summary_model.dart';
import 'dart:math';

class SampleData {
  static final Random _random = Random();
  
  static List<PlanSummary> getSamplePlans() {
    final subjects = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Tarih', 'Coğrafya', 'Felsefe'];
    final planTypes = [PlanType.MONTHLY, PlanType.WEEKLY, PlanType.DAILY, PlanType.HOLIDAY, PlanType.LONG_TERM];
    final statuses = ['active', 'completed', 'paused'];
    
    return [
      PlanSummary(
        id: 'plan-1',
        title: '${subjects[_random.nextInt(subjects.length)]} Aylık Çalışma Planı',
        type: PlanType.MONTHLY,
        progress: 60 + _random.nextInt(40),
        createdAt: DateTime.now().subtract(Duration(days: 15)).toIso8601String(),
        endDate: DateTime.now().add(Duration(days: 15)).toIso8601String(),
        totalSessions: 15 + _random.nextInt(10),
        completedSessions: 8 + _random.nextInt(8),
        averagePerformance: 70.0 + _random.nextDouble() * 30.0,
        status: statuses[_random.nextInt(statuses.length)],
      ),
      PlanSummary(
        id: 'plan-2',
        title: '${subjects[_random.nextInt(subjects.length)]} Haftalık Plan',
        type: PlanType.WEEKLY,
        progress: 40 + _random.nextInt(60),
        createdAt: DateTime.now().subtract(Duration(days: 7)).toIso8601String(),
        endDate: DateTime.now().add(Duration(days: 7)).toIso8601String(),
        totalSessions: 8 + _random.nextInt(5),
        completedSessions: 3 + _random.nextInt(5),
        averagePerformance: 75.0 + _random.nextDouble() * 25.0,
        status: statuses[_random.nextInt(statuses.length)],
      ),
      PlanSummary(
        id: 'plan-3',
        title: '${subjects[_random.nextInt(subjects.length)]} Uzun Vadeli Plan',
        type: PlanType.LONG_TERM,
        progress: 80 + _random.nextInt(20),
        createdAt: DateTime.now().subtract(Duration(days: 30)).toIso8601String(),
        endDate: DateTime.now().add(Duration(days: 90)).toIso8601String(),
        totalSessions: 40 + _random.nextInt(20),
        completedSessions: 30 + _random.nextInt(15),
        averagePerformance: 80.0 + _random.nextDouble() * 20.0,
        status: statuses[_random.nextInt(statuses.length)],
      ),
      PlanSummary(
        id: 'plan-4',
        title: '${subjects[_random.nextInt(subjects.length)]} Günlük Plan',
        type: PlanType.DAILY,
        progress: 90 + _random.nextInt(10),
        createdAt: DateTime.now().subtract(Duration(days: 1)).toIso8601String(),
        endDate: DateTime.now().add(Duration(days: 1)).toIso8601String(),
        totalSessions: 3 + _random.nextInt(3),
        completedSessions: 2 + _random.nextInt(2),
        averagePerformance: 85.0 + _random.nextDouble() * 15.0,
        status: statuses[_random.nextInt(statuses.length)],
      ),
      PlanSummary(
        id: 'plan-5',
        title: '${subjects[_random.nextInt(subjects.length)]} Tatil Planı',
        type: PlanType.HOLIDAY,
        progress: 50 + _random.nextInt(50),
        createdAt: DateTime.now().subtract(Duration(days: 5)).toIso8601String(),
        endDate: DateTime.now().add(Duration(days: 10)).toIso8601String(),
        totalSessions: 12 + _random.nextInt(8),
        completedSessions: 6 + _random.nextInt(6),
        averagePerformance: 70.0 + _random.nextDouble() * 30.0,
        status: statuses[_random.nextInt(statuses.length)],
      ),
    ];
  }

  static Map<String, dynamic> getSampleJson() {
    return {
      'id': 'plan-test-1',
      'title': 'Test Plan',
      'type': 'MONTHLY',
      'progress': 75,
      'createdAt': '2024-01-15T10:30:00Z',
      'endDate': '2024-02-15T10:30:00Z',
      'totalSessions': 20,
      'completedSessions': 15,
      'averagePerformance': 85.5,
      'status': 'active',
    };
  }

  static List<Map<String, dynamic>> getSampleJsonList() {
    return [
      {
        'id': 'plan-1',
        'title': 'Matematik Aylık Çalışma Planı',
        'type': 'MONTHLY',
        'progress': 75,
        'createdAt': '2024-01-15T10:30:00Z',
        'endDate': '2024-02-15T10:30:00Z',
        'totalSessions': 20,
        'completedSessions': 15,
        'averagePerformance': 85.5,
        'status': 'active',
      },
      {
        'id': 'plan-2',
        'title': 'Fizik Tatil Çalışma Planı',
        'type': 'HOLIDAY',
        'progress': 45,
        'createdAt': '2024-01-10T08:00:00Z',
        'endDate': '2024-01-25T08:00:00Z',
        'totalSessions': 10,
        'completedSessions': 4,
        'averagePerformance': 78.2,
        'status': 'active',
      },
      {
        'id': 'plan-3',
        'title': 'Kimya Uzun Vadeli Plan',
        'type': 'LONG_TERM',
        'progress': 90,
        'createdAt': '2024-01-01T09:00:00Z',
        'endDate': '2024-06-01T09:00:00Z',
        'totalSessions': 50,
        'completedSessions': 45,
        'averagePerformance': 92.1,
        'status': 'completed',
      },
    ];
  }
}
