import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:okuz_ai/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('App Integration Tests', () {
    testWidgets('should complete full user journey', (WidgetTester tester) async {
      // Start the app
      app.main();
      await tester.pumpAndSettle();

      // Test 1: Login flow
      await _testLoginFlow(tester);
      
      // Test 2: Navigation flow
      await _testNavigationFlow(tester);
      
      // Test 3: Plan creation flow
      await _testPlanCreationFlow(tester);
      
      // Test 4: Study session flow
      await _testStudySessionFlow(tester);
      
      // Test 5: Progress tracking flow
      await _testProgressTrackingFlow(tester);
    });

    testWidgets('should handle offline mode gracefully', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Simulate offline mode
      await _simulateOfflineMode(tester);
      
      // Test offline functionality
      await _testOfflineFunctionality(tester);
    });

    testWidgets('should handle app lifecycle events', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Test app pause/resume
      await _testAppLifecycle(tester);
    });
  });
}

Future<void> _testLoginFlow(WidgetTester tester) async {
  // Find and tap login button
  expect(find.text('Giriş Yap'), findsOneWidget);
  await tester.tap(find.text('Giriş Yap'));
  await tester.pumpAndSettle();

  // Enter credentials
  await tester.enterText(find.byType(TextField).first, 'test@example.com');
  await tester.enterText(find.byType(TextField).last, 'password123');
  
  // Tap login button
  await tester.tap(find.text('Giriş Yap'));
  await tester.pumpAndSettle();

  // Verify successful login
  expect(find.text('Ana Sayfa'), findsOneWidget);
}

Future<void> _testNavigationFlow(WidgetTester tester) async {
  // Test bottom navigation
  await tester.tap(find.byIcon(Icons.home));
  await tester.pumpAndSettle();
  expect(find.text('Ana Sayfa'), findsOneWidget);

  await tester.tap(find.byIcon(Icons.school));
  await tester.pumpAndSettle();
  expect(find.text('Planlarım'), findsOneWidget);

  await tester.tap(find.byIcon(Icons.analytics));
  await tester.pumpAndSettle();
  expect(find.text('İstatistikler'), findsOneWidget);

  await tester.tap(find.byIcon(Icons.person));
  await tester.pumpAndSettle();
  expect(find.text('Profil'), findsOneWidget);
}

Future<void> _testPlanCreationFlow(WidgetTester tester) async {
  // Navigate to plans screen
  await tester.tap(find.byIcon(Icons.school));
  await tester.pumpAndSettle();

  // Tap create plan button
  await tester.tap(find.text('Yeni Plan Oluştur'));
  await tester.pumpAndSettle();

  // Fill plan form
  await tester.enterText(find.byType(TextField).first, 'Test Plan');
  await tester.enterText(find.byType(TextField).at(1), 'Test Description');
  
  // Select subjects
  await tester.tap(find.text('Matematik'));
  await tester.tap(find.text('Fizik'));
  
  // Set duration
  await tester.tap(find.text('7 gün'));
  
  // Set difficulty
  await tester.tap(find.text('Orta'));
  
  // Create plan
  await tester.tap(find.text('Plan Oluştur'));
  await tester.pumpAndSettle();

  // Verify plan creation
  expect(find.text('Plan başarıyla oluşturuldu'), findsOneWidget);
}

Future<void> _testStudySessionFlow(WidgetTester tester) async {
  // Navigate to study session
  await tester.tap(find.text('Çalışmaya Başla'));
  await tester.pumpAndSettle();

  // Start study session
  await tester.tap(find.text('Başla'));
  await tester.pumpAndSettle();

  // Simulate study session
  await tester.pump(Duration(seconds: 2));
  
  // Complete session
  await tester.tap(find.text('Tamamla'));
  await tester.pumpAndSettle();

  // Verify session completion
  expect(find.text('Oturum tamamlandı'), findsOneWidget);
}

Future<void> _testProgressTrackingFlow(WidgetTester tester) async {
  // Navigate to analytics
  await tester.tap(find.byIcon(Icons.analytics));
  await tester.pumpAndSettle();

  // Check progress indicators
  expect(find.byType(LinearProgressIndicator), findsWidgets);
  expect(find.text('%50'), findsOneWidget);
}

Future<void> _simulateOfflineMode(WidgetTester tester) async {
  // This would simulate network disconnection
  // In a real test, you'd use network mocking
  await tester.pump(Duration(seconds: 1));
}

Future<void> _testOfflineFunctionality(WidgetTester tester) async {
  // Test offline features
  expect(find.text('Çevrimdışı Mod'), findsOneWidget);
  
  // Test cached data access
  await tester.tap(find.text('Önbellek Verileri'));
  await tester.pumpAndSettle();
  
  expect(find.text('Önbellek verileri yüklendi'), findsOneWidget);
}

Future<void> _testAppLifecycle(WidgetTester tester) async {
  // Test app pause
  await tester.binding.pause();
  await tester.pump(Duration(seconds: 1));
  
  // Test app resume
  await tester.binding.resume();
  await tester.pumpAndSettle();
  
  // Verify app state is maintained
  expect(find.text('Ana Sayfa'), findsOneWidget);
}
