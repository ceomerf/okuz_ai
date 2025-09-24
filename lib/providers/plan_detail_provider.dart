import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/socket_service.dart';
import '../services/api_service.dart';
import '../models/plan_detail_model.dart';

class PlanDetailState {
  final PlanDetail? plan;
  final bool isLoading;
  final String? error;
  final String? currentPlanId;

  const PlanDetailState({
    this.plan,
    this.isLoading = false,
    this.error,
    this.currentPlanId,
  });

  PlanDetailState copyWith({
    PlanDetail? plan,
    bool? isLoading,
    String? error,
    bool clearError = false,
    String? currentPlanId,
  }) {
    return PlanDetailState(
      plan: plan ?? this.plan,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      currentPlanId: currentPlanId ?? this.currentPlanId,
    );
  }
}

class PlanDetailNotifier extends StateNotifier<PlanDetailState> {
  PlanDetailNotifier() : super(const PlanDetailState());

  final SocketService _socketService = SocketService();
  final ApiService _apiService = ApiService();

  Future<void> fetchPlan(String planId) async {
    try {
      state = state.copyWith(isLoading: true, clearError: true, currentPlanId: planId);
      final userId = await _apiService.getUserId();
      if (userId == null) throw Exception('Kullanıcı kimliği bulunamadı');

      final response = await _apiService.get('/planning/plan/$planId');
      if (response == null) throw Exception('Plan detayları alınamadı');

      final plan = PlanDetail.fromJson(response);
      state = state.copyWith(plan: plan);
      _startListeningForUpdates(planId);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Plan detayları yüklenirken hata: $e');
      return;
    }
    state = state.copyWith(isLoading: false);
  }

  void _startListeningForUpdates(String planId) {
    try {
      _socketService.joinRoom('plan_$planId');

      _socketService.socket.on('plan_updated', (data) => _handlePlanUpdate(data));
      _socketService.socket.on('session_completed', (data) => _handleSessionCompleted(data));
      _socketService.socket.on('session_skipped', (data) => _handleSessionSkipped(data));
      _socketService.socket.on('progress_updated', (data) => _handleProgressUpdate(data));
      _socketService.socket.on('plan_status_updated', (data) => _handlePlanStatusUpdate(data));
    } catch (_) {}
  }

  void _handlePlanUpdate(Map<String, dynamic> data) {
    final current = state.plan;
    if (current == null || data['planId'] != current.id) return;
    var updated = current;
    if (data['title'] != null) updated = updated.copyWith(title: data['title']);
    if (data['progress'] != null) updated = updated.copyWith(progress: data['progress']);
    if (data['isActive'] != null) updated = updated.copyWith(isActive: data['isActive']);
    state = state.copyWith(plan: updated);
  }

  void _handleSessionCompleted(Map<String, dynamic> data) {
    final current = state.plan;
    if (current == null || data['planId'] != current.id) return;
    final sessionId = data['sessionId'];
    final performance = data['performance'];
    final updatedSessions = current.sessions.map((s) => s.id == sessionId
        ? s.copyWith(isCompleted: true, performance: performance, notes: data['notes'])
        : s).toList();
    final updated = current.copyWith(sessions: updatedSessions);
    state = state.copyWith(plan: _withRecalculatedProgress(updated));
  }

  void _handleSessionSkipped(Map<String, dynamic> data) {
    final current = state.plan;
    if (current == null || data['planId'] != current.id) return;
    final sessionId = data['sessionId'];
    final updatedSessions = current.sessions.map((s) => s.id == sessionId
        ? s.copyWith(isCompleted: true, performance: 0, notes: 'Atlandı: ${data['reason']}')
        : s).toList();
    final updated = current.copyWith(sessions: updatedSessions);
    state = state.copyWith(plan: _withRecalculatedProgress(updated));
  }

  void _handleProgressUpdate(Map<String, dynamic> data) {
    final current = state.plan;
    if (current == null || data['planId'] != current.id) return;
    final newProgress = data['newProgress'];
    if (newProgress != null) {
      state = state.copyWith(plan: current.copyWith(progress: newProgress));
    }
  }

  void _handlePlanStatusUpdate(Map<String, dynamic> data) {
    final current = state.plan;
    if (current == null || data['planId'] != current.id) return;
    final newStatus = data['status'];
    if (newStatus != null) {
      state = state.copyWith(plan: current.copyWith(isActive: newStatus == 'active'));
    }
  }

  PlanDetail _withRecalculatedProgress(PlanDetail plan) {
    if (plan.sessions.isEmpty) return plan.copyWith(progress: 0);
    final total = plan.sessions.length;
    final completed = plan.sessions.where((s) => s.isCompleted).length;
    final progress = total > 0 ? (completed / total * 100).round() : 0;
    return plan.copyWith(progress: progress);
  }

  Future<void> completeSession(String sessionId, int performance, {String? notes}) async {
    try {
      final response = await _apiService.post('/planning/complete-session', {
        'sessionId': sessionId,
        'performance': performance,
        'notes': notes ?? '',
      });
      if (response != null) {
        _socketService.sendEvent('session_completed', {
          'sessionId': sessionId,
          'performance': performance,
          'notes': notes,
          'timestamp': DateTime.now().toIso8601String(),
        });
      }
    } catch (e) {
      state = state.copyWith(error: 'Session tamamlanırken hata: $e');
    }
  }

  Future<void> skipSession(String sessionId, String reason) async {
    try {
      final response = await _apiService.post('/planning/skip-session', {
        'sessionId': sessionId,
        'reason': reason,
      });
      if (response != null) {
        _socketService.sendEvent('session_skipped', {
          'sessionId': sessionId,
          'reason': reason,
          'timestamp': DateTime.now().toIso8601String(),
        });
      }
    } catch (e) {
      state = state.copyWith(error: 'Session atlanırken hata: $e');
    }
  }

  Future<void> updatePlanStatus(String status) async {
    final current = state.plan;
    if (current == null) return;
    try {
      final response = await _apiService.put('/planning/plan/${current.id}', {
        'isActive': status == 'active',
      });
      if (response != null) {
        _socketService.sendEvent('plan_status_updated', {
          'planId': current.id,
          'status': status,
          'timestamp': DateTime.now().toIso8601String(),
        });
      }
    } catch (e) {
      state = state.copyWith(error: 'Plan durumu güncellenirken hata: $e');
    }
  }

  void clearError() => state = state.copyWith(clearError: true);

  void _stopListeningForUpdates() {
    final id = state.currentPlanId;
    if (id == null) return;
    try {
      _socketService.leaveRoom('plan_$id');
      _socketService.socket.off('plan_updated');
      _socketService.socket.off('session_completed');
      _socketService.socket.off('session_skipped');
      _socketService.socket.off('progress_updated');
      _socketService.socket.off('plan_status_updated');
    } catch (_) {}
  }

  @override
  void dispose() {
    _stopListeningForUpdates();
    super.dispose();
  }
}

final planDetailNotifierProvider =
    StateNotifierProvider<PlanDetailNotifier, PlanDetailState>((ref) => PlanDetailNotifier());
