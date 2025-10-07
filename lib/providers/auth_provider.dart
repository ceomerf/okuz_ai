import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';

/// Bu provider, AuthService'in tek bir örneğini oluşturur ve
/// uygulama boyunca bunu yönetir.
/// Diğer provider'lar ve widget'lar bu servis'e buradan erişecek.
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService();
});

// Optimized auth state providers for better performance
final isLoggedInProvider = FutureProvider<bool>((ref) async {
  final authService = ref.watch(authServiceProvider);
  return await authService.isLoggedIn();
});

final userRoleProvider = FutureProvider<String?>((ref) async {
  final authService = ref.watch(authServiceProvider);
  return await authService.getUserRole();
});

final userNameProvider = FutureProvider<String?>((ref) async {
  final authService = ref.watch(authServiceProvider);
  return await authService.getUserName();
});

final userEmailProvider = FutureProvider<String?>((ref) async {
  final authService = ref.watch(authServiceProvider);
  return await authService.getUserEmail();
});


