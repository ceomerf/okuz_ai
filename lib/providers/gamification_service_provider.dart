import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/gamification_service.dart';
import '../services/providers.dart';

// GamificationService'i Riverpod üzerinden sağlayan provider
final gamificationServiceProvider = Provider<GamificationService>((ref) {
  final api = ref.read(apiClientProvider);
  return GamificationService(api);
});


