import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/state/study_dashboard_state.dart';
import '../services/api_client.dart';
import 'api_client_provider.dart';

class StudyDashboardNotifier extends StateNotifier<StudyDashboardState> {
  final ApiClient _apiClient;

  StudyDashboardNotifier(this._apiClient) : super(const StudyDashboardState());

  Future<void> fetchDashboardData() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      // Örnek: API'dan performans/durum verilerini çekiyoruz
      final perf = await _apiClient.getPerformanceDashboard();
      final name = (await _apiClient.getProfile())['name']?.toString() ?? '';

      state = state.copyWith(
        isLoading: false,
        studentName: name,
        totalXP: (perf['totalXP'] as num?)?.toInt() ?? state.totalXP,
        studyStreak: (perf['studyStreak'] as num?)?.toInt() ?? state.studyStreak,
        currentLevel: (perf['currentLevel'] as num?)?.toInt() ?? state.currentLevel,
        weeklyProgress: (perf['weeklyProgress'] as num?)?.toDouble() ?? state.weeklyProgress,
        todayTasks: (perf['todayTasks'] as num?)?.toInt() ?? state.todayTasks,
        // dailySchedule ayrı provider ile doldurulabilir; şimdilik mevcut değeri koruyoruz
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }
}

final studyDashboardNotifierProvider = StateNotifierProvider<StudyDashboardNotifier, StudyDashboardState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return StudyDashboardNotifier(apiClient);
});

// Optimized selectors for better performance - prevents unnecessary rebuilds
final studentNameProvider = Provider<String>((ref) {
  return ref.watch(studyDashboardNotifierProvider.select((state) => state.studentName));
});

final totalXPProvider = Provider<int>((ref) {
  return ref.watch(studyDashboardNotifierProvider.select((state) => state.totalXP));
});

final studyStreakProvider = Provider<int>((ref) {
  return ref.watch(studyDashboardNotifierProvider.select((state) => state.studyStreak));
});

final currentLevelProvider = Provider<int>((ref) {
  return ref.watch(studyDashboardNotifierProvider.select((state) => state.currentLevel));
});

final weeklyProgressProvider = Provider<double>((ref) {
  return ref.watch(studyDashboardNotifierProvider.select((state) => state.weeklyProgress));
});

final todayTasksProvider = Provider<int>((ref) {
  return ref.watch(studyDashboardNotifierProvider.select((state) => state.todayTasks));
});

final isLoadingProvider = Provider<bool>((ref) {
  return ref.watch(studyDashboardNotifierProvider.select((state) => state.isLoading));
});

final errorMessageProvider = Provider<String?>((ref) {
  return ref.watch(studyDashboardNotifierProvider.select((state) => state.errorMessage));
});


