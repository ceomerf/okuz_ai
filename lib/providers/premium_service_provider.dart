import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/premium_service.dart';
import '../services/providers.dart';

// PremiumService'i Riverpod üzerinden sağlayan provider
final premiumServiceProvider = Provider<PremiumService>((ref) {
  final api = ref.read(apiClientProvider);
  return PremiumService(api);
});


