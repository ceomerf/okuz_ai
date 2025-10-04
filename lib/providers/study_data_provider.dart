// JWT Backend için Study Data Provider
// Firebase bağımlılığı tamamen kaldırıldı

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:state_notifier/state_notifier.dart';
import 'package:equatable/equatable.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_client.dart';
import '../services/providers.dart';

class StudyDataState extends Equatable {
  final Map<String, dynamic>? studyData;
  final List<Map<String, dynamic>> studySessions;
  final bool isLoading;
  final String studentName;
  final Map<String, dynamic>? dailySchedule;
  final String? errorMessage;

  const StudyDataState({
    this.studyData,
    this.studySessions = const [],
    this.isLoading = true,
    this.studentName = '',
    this.dailySchedule,
    this.errorMessage,
  });

  StudyDataState copyWith({
    Map<String, dynamic>? studyData,
    List<Map<String, dynamic>>? studySessions,
    bool? isLoading,
    String? studentName,
    Map<String, dynamic>? dailySchedule,
    String? errorMessage,
  }) {
    return StudyDataState(
      studyData: studyData ?? this.studyData,
      studySessions: studySessions ?? this.studySessions,
      isLoading: isLoading ?? this.isLoading,
      studentName: studentName ?? this.studentName,
      dailySchedule: dailySchedule ?? this.dailySchedule,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [studyData, studySessions, isLoading, studentName, dailySchedule, errorMessage];
}

class StudyDataNotifier extends StateNotifier<StudyDataState> {
  final Ref _ref;
  StudyDataNotifier(this._ref) : super(const StudyDataState());

  // Eski alan: tema vs. için kalabilir
  bool _hasActiveTheme = false;
  bool get hasActiveTheme => _hasActiveTheme;

  // Dashboards: Öğrenci adı yükleme (private)
  Future<void> _loadStudentData() async {
    final prefs = await SharedPreferences.getInstance();
    state = state.copyWith(studentName: prefs.getString('student_name') ?? '');
  }

  // Dashboards: Günlük programı yükleme (private)
  Future<Map<String, dynamic>> _loadDailySchedule() async {
    final today = DateTime.now().toIso8601String().split('T')[0];

    // Önce mevcut planları al ve normalize et
    final plansResponse = await _ref.read(apiClientProvider).getFlexible('/planning/user-plans');

    List<dynamic> plans = [];
    try {
      if (plansResponse is Map<String, dynamic>) {
        if (plansResponse['data'] is List) {
          plans = plansResponse['data'] as List<dynamic>;
        } else if (plansResponse['plans'] is List) {
          plans = plansResponse['plans'] as List<dynamic>;
        } else if (plansResponse['data'] != null && plansResponse['data'] is Map) {
          final dataMap = plansResponse['data'] as Map<String, dynamic>;
          if (dataMap['plans'] is List) {
            plans = dataMap['plans'] as List<dynamic>;
          }
        }
      } else if (plansResponse is List) {
        plans = List<dynamic>.from(plansResponse as List);
      }
    } catch (_) {
      plans = [];
    }

    if (plans.isEmpty) {
      return {
        'date': today,
        'totalSessions': 2,
        'totalStudyTime': 105,
        'hasActivePlan': false,
        'planProgress': 0,
        'timeline': [
          {
            'hour': 10,
            'timeSlot': '10:00',
            'sessions': [
              {
                'id': '1',
                'subject': 'Matematik',
                'topic': 'Türev Konusu',
                'durationInMinutes': 60,
                'startTime': '2025-08-03T10:00:00Z',
                'isCompleted': false,
              }
            ],
            'isAvailable': false,
          },
          {
            'hour': 15,
            'timeSlot': '15:00',
            'sessions': [
              {
                'id': '2',
                'subject': 'Fizik',
                'topic': 'Hareket ve Kuvvet',
                'durationInMinutes': 45,
                'startTime': '2025-08-03T15:00:00Z',
                'isCompleted': false,
              }
            ],
            'isAvailable': false,
          },
        ],
        'suggestions': [
          {
            'type': 'no_plan',
            'message': 'Henüz bir çalışma programınız yok. Yeni bir program oluşturun!',
            'action': 'create_plan',
          }
        ],
      };
    }

    final daily = await _ref.read(apiClientProvider).getDailySchedule(today);

    try {
      final activePlan = plans.firstWhere(
        (plan) => plan is Map<String, dynamic> && plan['isActive'] == true,
        orElse: () => null,
      );
      if (activePlan != null && activePlan is Map<String, dynamic>) {
        daily['hasActivePlan'] = true;
        daily['planProgress'] = activePlan['progress'] ?? 0;
        daily['planTitle'] = activePlan['title'];
        daily['planEndDate'] = activePlan['endDate'];
        daily['totalPlanSessions'] = activePlan['stats']?['totalSessions'] ?? 0;
        daily['completedPlanSessions'] = activePlan['stats']?['completedSessions'] ?? 0;
      } else {
        daily['hasActivePlan'] = false;
        daily['planProgress'] = 0;
      }
    } catch (_) {
      daily['hasActivePlan'] = false;
      daily['planProgress'] = 0;
    }

    return daily;
  }

  // Public orchestrator: Dashboard verilerini getir
  Future<void> fetchDashboardData() async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      await _loadStudentData();
      final schedule = await _loadDailySchedule();
      state = state.copyWith(dailySchedule: schedule);
    } catch (e) {
      state = state.copyWith(errorMessage: e.toString());
    } finally {
      state = state.copyWith(isLoading: false);
    }
  }

  // Çalışma verilerini yükle
  Future<void> loadStudyData() async {
    state = state.copyWith(isLoading: true);

    try {
      final response = await _ref.read(apiClientProvider).get('/study/data');
      state = state.copyWith(studyData: response);
    } catch (e) {
      debugPrint('Çalışma verileri yükleme hatası: $e');
      state = state.copyWith(studyData: null);
    } finally {
      state = state.copyWith(isLoading: false);
    }
  }

  // Çalışma seanslarını yükle
  Future<void> loadStudySessions() async {
    state = state.copyWith(isLoading: true);

    try {
      final response = await _ref.read(apiClientProvider).get('/study/sessions');
      final sessions = List<Map<String, dynamic>>.from(response['sessions'] ?? []);
      state = state.copyWith(studySessions: sessions);
    } catch (e) {
      debugPrint('Çalışma seansları yükleme hatası: $e');
      state = state.copyWith(studySessions: []);
    } finally {
      state = state.copyWith(isLoading: false);
    }
  }

  // Çalışma seansı ekle
  Future<bool> addStudySession(Map<String, dynamic> sessionData) async {
    try {
      await _ref.read(apiClientProvider).post('/study/add-session', sessionData);
      await loadStudySessions(); // Listeyi yenile
      return true;
    } catch (e) {
      debugPrint('Çalışma seansı ekleme hatası: $e');
      return false;
    }
  }

  // Çalışma verilerini güncelle
  Future<bool> updateStudyData(Map<String, dynamic> updates) async {
    try {
      await _ref.read(apiClientProvider).post('/study/update-data', updates);
      await loadStudyData(); // Verileri yenile
      return true;
    } catch (e) {
      debugPrint('Çalışma verileri güncelleme hatası: $e');
      return false;
    }
  }

  // Çalışma seansından sonra güncelle
  Future<void> updateAfterStudySession() async {
    try {
      await loadStudyData();
      await loadStudySessions();
    } catch (e) {
      debugPrint('Çalışma seansı sonrası güncelleme hatası: $e');
    }
  }

  // Ruh hali özetini getir
  String getMoodSummary() {
    // Mock implementation
    return 'Bugün motivasyonun yüksek görünüyor!';
  }

  // Tema güncellemesini zorla
  Future<void> forceThemeUpdate() async {
    try {
      await loadStudyData();
    } catch (e) {
      debugPrint('Tema güncelleme hatası: $e');
    }
  }
}

final studyDataNotifierProvider =
    StateNotifierProvider<StudyDataNotifier, StudyDataState>((ref) {
  return StudyDataNotifier(ref);
});
