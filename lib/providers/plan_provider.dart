import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/plan_summary_model.dart';
import 'api_client_provider.dart';
import '../services/plan_service.dart';
import '../models/plan_detail_model.dart';

final plansProvider = FutureProvider<List<PlanSummary>>((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  return await apiClient.getUserPlans();
});

/// PlanService'in bir örneğini oluşturan ve bağımlılıklarını yöneten provider.
final planServiceProvider = Provider<PlanService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return PlanService.withClient(apiClient);
});

/// Belirli bir planın detaylarını getiren FutureProvider (Map yapısı ile)
final planDetailProvider = FutureProvider.family<PlanDetailModel, String>((ref, planId) async {
  final planService = ref.watch(planServiceProvider);

  const specialIds = ['_holiday', '_from_quick_access'];

  if (specialIds.contains(planId)) {
    final rawDefault = await planService.getUserPlan();
    if (rawDefault.isEmpty) {
      throw Exception('Varsayılan plan bulunamadı.');
    }
    return PlanDetailModel.fromJson(rawDefault);
  } else {
    final raw = await planService.getPlan(planId);
    return PlanDetailModel.fromJson(raw);
  }
});


