import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_client.dart';

/// Uygulama genelinde tek bir ApiClient örneği sağlar.
/// Not: AuthService enjeksiyonu opsiyoneldir; ApiClient kendi refresh akışını yönetir.
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});


