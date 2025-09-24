import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_client.dart';
import '../models/performance_dashboard_data.dart';
import '../services/providers.dart';

class PerformanceDashboardState {
  final bool isLoading;
  final String? errorMessage;
  final PerformanceDashboardData? dashboardData;
  const PerformanceDashboardState({this.isLoading = true, this.errorMessage, this.dashboardData});

  PerformanceDashboardState copyWith({bool? isLoading, String? errorMessage, PerformanceDashboardData? dashboardData}) {
    return PerformanceDashboardState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      dashboardData: dashboardData ?? this.dashboardData,
    );
  }
}

class PerformanceDashboardNotifier extends StateNotifier<PerformanceDashboardState> {
  final Ref _ref;
  PerformanceDashboardNotifier(this._ref) : super(const PerformanceDashboardState());

  Future<void> loadData() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final json = await _ref.read(apiClientProvider).getPerformanceDashboard();
      state = state.copyWith(isLoading: false, dashboardData: PerformanceDashboardData.fromJson(json));
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }
}

final performanceDashboardNotifierProvider = StateNotifierProvider<PerformanceDashboardNotifier, PerformanceDashboardState>((ref) {
  return PerformanceDashboardNotifier(ref);
});

