import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';

/// Bu provider, AuthService'in tek bir örneğini oluşturur ve
/// uygulama boyunca bunu yönetir.
/// Diğer provider'lar ve widget'lar bu servis'e buradan erişecek.
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService();
});


