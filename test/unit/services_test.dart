import 'package:flutter_test/flutter_test.dart';
import 'package:okuz_ai/services/api_service.dart';
import 'package:okuz_ai/services/auth_service.dart';
import 'package:okuz_ai/services/planning_service.dart';
import 'package:okuz_ai/models/user.dart';

void main() {
  group('ApiService Tests', () {
    late ApiService apiService;

    setUp(() {
      apiService = ApiService();
    });

    test('should make GET request', () async {
      // Mock implementation
      final result = await apiService.get('/test-endpoint');
      expect(result, isNotNull);
    });

    test('should make POST request', () async {
      final data = {'key': 'value'};
      final result = await apiService.post('/test-endpoint', data);
      expect(result, isNotNull);
    });

    test('should handle authentication headers', () async {
      apiService.setAuthToken('test-token');
      final result = await apiService.get('/protected-endpoint');
      expect(result, isNotNull);
    });

    test('should handle errors gracefully', () async {
      try {
        await apiService.get('/non-existent-endpoint');
        fail('Should have thrown an exception');
      } catch (e) {
        expect(e, isA<Exception>());
      }
    });
  });

  group('AuthService Tests', () {
    late AuthService authService;

    setUp(() {
      authService = AuthService();
    });

    test('should login with valid credentials', () async {
      final result = await authService.login('test@example.com', 'password123');
      expect(result.isSuccess, true);
      expect(result.user, isNotNull);
    });

    test('should fail login with invalid credentials', () async {
      final result = await authService.login('invalid@example.com', 'wrongpassword');
      expect(result.isSuccess, false);
      expect(result.error, isNotNull);
    });

    test('should register new user', () async {
      final user = User(
        id: '123',
        email: 'newuser@example.com',
        name: 'New User',
        role: UserRole.STUDENT,
        grade: 12,
        learningStyle: LearningStyle.VISUAL,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final result = await authService.register(user);
      expect(result.isSuccess, true);
    });

    test('should handle logout', () async {
      await authService.logout();
      expect(authService.isAuthenticated, false);
    });

    test('should refresh token', () async {
      final result = await authService.refreshToken();
      expect(result.isSuccess, true);
    });
  });

  group('PlanningService Tests', () {
    late PlanningService planningService;

    setUp(() {
      planningService = PlanningService();
    });

    test('should generate study plan', () async {
      final request = {
        'userId': '123',
        'subjects': ['Mathematics', 'Physics'],
        'duration': 7,
        'difficulty': 'MEDIUM',
      };

      final result = await planningService.generatePlan(request);
      expect(result.isSuccess, true);
      expect(result.plan, isNotNull);
    });

    test('should update plan progress', () async {
      final result = await planningService.updateProgress('plan123', 0.5);
      expect(result.isSuccess, true);
    });

    test('should get user plans', () async {
      final plans = await planningService.getUserPlans('user123');
      expect(plans, isA<List>());
    });

    test('should handle plan generation errors', () async {
      final invalidRequest = {
        'userId': '',
        'subjects': [],
        'duration': 0,
        'difficulty': 'INVALID',
      };

      try {
        await planningService.generatePlan(invalidRequest);
        fail('Should have thrown an exception');
      } catch (e) {
        expect(e, isA<Exception>());
      }
    });
  });
}
