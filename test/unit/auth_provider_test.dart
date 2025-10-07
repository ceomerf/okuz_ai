import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:okuz_ai/providers/auth_provider.dart';
import 'package:okuz_ai/models/user.dart';

void main() {
  group('AuthProvider Tests', () {
    late ProviderContainer container;

    setUp(() {
      container = ProviderContainer();
    });

    tearDown(() {
      container.dispose();
    });

    test('should have initial state as not authenticated', () {
      final authState = container.read(authProvider);
      expect(authState.isAuthenticated, false);
      expect(authState.user, null);
      expect(authState.isLoading, false);
    });

    test('should handle login state changes', () async {
      final authNotifier = container.read(authProvider.notifier);
      
      // Test login
      await authNotifier.login('test@example.com', 'password123');
      
      final authState = container.read(authProvider);
      expect(authState.isAuthenticated, true);
      expect(authState.user?.email, 'test@example.com');
    });

    test('should handle logout', () async {
      final authNotifier = container.read(authProvider.notifier);
      
      // First login
      await authNotifier.login('test@example.com', 'password123');
      expect(container.read(authProvider).isAuthenticated, true);
      
      // Then logout
      await authNotifier.logout();
      expect(container.read(authProvider).isAuthenticated, false);
      expect(container.read(authProvider).user, null);
    });

    test('should handle loading state during login', () async {
      final authNotifier = container.read(authProvider.notifier);
      
      // Start login process
      final loginFuture = authNotifier.login('test@example.com', 'password123');
      
      // Check loading state
      expect(container.read(authProvider).isLoading, true);
      
      // Wait for completion
      await loginFuture;
      
      // Check final state
      expect(container.read(authProvider).isLoading, false);
      expect(container.read(authProvider).isAuthenticated, true);
    });

    test('should handle login errors', () async {
      final authNotifier = container.read(authProvider.notifier);
      
      try {
        await authNotifier.login('invalid@example.com', 'wrongpassword');
        fail('Should have thrown an exception');
      } catch (e) {
        expect(container.read(authProvider).isAuthenticated, false);
        expect(container.read(authProvider).error, isNotNull);
      }
    });

    test('should handle refresh token', () async {
      final authNotifier = container.read(authProvider.notifier);
      
      // Login first
      await authNotifier.login('test@example.com', 'password123');
      
      // Refresh token
      await authNotifier.refreshToken();
      
      final authState = container.read(authProvider);
      expect(authState.isAuthenticated, true);
      expect(authState.user, isNotNull);
    });
  });
}
