import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';
import 'production_auth_service.dart';
import 'api_service.dart';
import 'plan_service.dart';
import 'subscription_service.dart';
import 'family_account_service.dart';

// ApiClient singleton'ını Riverpod üzerinden expose eder
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

// ProductionAuthService'i Riverpod üzerinden expose eder
final authServiceProvider = Provider<ProductionAuthService>((ref) {
  // AuthService artık ApiClient'a DI ile bağlanıyor
  return ProductionAuthService();
});

// FlutterSecureStorage erişimi için provider (test edilebilirlik için)
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

// SharedPreferences için future provider; ihtiyaç olan yerler await ile kullanır
final sharedPrefsProvider = FutureProvider<SharedPreferences>((ref) async {
  return await SharedPreferences.getInstance();
});

// SubscriptionService provider
final subscriptionServiceProvider = Provider<SubscriptionService>((ref) {
  return SubscriptionService(ref.read(apiClientProvider));
});

// Legacy ApiService provider (used by quiz flow)
final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});

// PlanService provider
final planServiceProvider = Provider<PlanService>((ref) {
  return PlanService(ref.read(apiClientProvider));
});

// FamilyAccountService provider
final familyAccountNotifierProvider =
    NotifierProvider<FamilyAccountService, FamilyAccountState>(() {
  return FamilyAccountService();
});


