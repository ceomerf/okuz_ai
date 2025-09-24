import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api_client_provider.dart';

/// Haftalık hedefleri getiren FutureProvider.
/// Loading/error/data durumlarını kendisi yönetir.
final weeklyGoalsProvider = FutureProvider<List<dynamic>>((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  final dashboard = await apiClient.getPerformanceDashboard();
  final goals = dashboard['goals'];
  if (goals is List) return goals;
  return <dynamic>[];
});


