import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:okuz_ai/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('User Flow Integration Tests', () {
    testWidgets('Complete user journey from registration to study completion', (WidgetTester tester) async {
      // Start the app
      app.main();
      await tester.pumpAndSettle();

      // Step 1: User Registration
      await _testUserRegistration(tester);
      
      // Step 2: User Login
      await _testUserLogin(tester);
      
      // Step 3: Profile Setup
      await _testProfileSetup(tester);
      
      // Step 4: Plan Creation
      await _testPlanCreation(tester);
      
      // Step 5: Study Session
      await _testStudySession(tester);
      
      // Step 6: Progress Tracking
      await _testProgressTracking(tester);
      
      // Step 7: Analytics Review
      await _testAnalyticsReview(tester);
    });

    testWidgets('Offline mode functionality', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Login first
      await _testUserLogin(tester);
      
      // Simulate offline mode
      await _simulateOfflineMode(tester);
      
      // Test offline features
      await _testOfflineStudySession(tester);
      await _testOfflineProgressTracking(tester);
      
      // Test data sync when back online
      await _testDataSync(tester);
    });

    testWidgets('Error handling and recovery', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Test network errors
      await _testNetworkErrorHandling(tester);
      
      // Test data validation errors
      await _testDataValidationErrors(tester);
      
      // Test app recovery
      await _testAppRecovery(tester);
    });
  });
}

Future<void> _testUserRegistration(WidgetTester tester) async {
  // Navigate to registration
  await tester.tap(find.text('Kayıt Ol'));
  await tester.pumpAndSettle();

  // Fill registration form
  await tester.enterText(find.byType(TextField).at(0), 'Test User');
  await tester.enterText(find.byType(TextField).at(1), 'test@example.com');
  await tester.enterText(find.byType(TextField).at(2), 'password123');
  
  // Select grade
  await tester.tap(find.text('12. Sınıf'));
  await tester.pumpAndSettle();
  
  // Select learning style
  await tester.tap(find.text('Görsel'));
  await tester.pumpAndSettle();
  
  // Submit registration
  await tester.tap(find.text('Kayıt Ol'));
  await tester.pumpAndSettle();

  // Verify successful registration
  expect(find.text('Kayıt başarılı'), findsOneWidget);
}

Future<void> _testUserLogin(WidgetTester tester) async {
  // Navigate to login
  await tester.tap(find.text('Giriş Yap'));
  await tester.pumpAndSettle();

  // Enter credentials
  await tester.enterText(find.byType(TextField).at(0), 'test@example.com');
  await tester.enterText(find.byType(TextField).at(1), 'password123');
  
  // Tap login button
  await tester.tap(find.text('Giriş Yap'));
  await tester.pumpAndSettle();

  // Verify successful login
  expect(find.text('Ana Sayfa'), findsOneWidget);
}

Future<void> _testProfileSetup(WidgetTester tester) async {
  // Navigate to profile
  await tester.tap(find.byIcon(Icons.person));
  await tester.pumpAndSettle();

  // Update profile information
  await tester.tap(find.text('Profili Düzenle'));
  await tester.pumpAndSettle();

  // Update learning preferences
  await tester.tap(find.text('Öğrenme Tercihleri'));
  await tester.pumpAndSettle();
  
  // Select preferred subjects
  await tester.tap(find.text('Matematik'));
  await tester.tap(find.text('Fizik'));
  await tester.tap(find.text('Kimya'));
  
  // Set study goals
  await tester.tap(find.text('Hedefler'));
  await tester.pumpAndSettle();
  
  await tester.enterText(find.byType(TextField), 'YKS\'de ilk 1000\'e girmek');
  
  // Save profile
  await tester.tap(find.text('Kaydet'));
  await tester.pumpAndSettle();

  // Verify profile update
  expect(find.text('Profil güncellendi'), findsOneWidget);
}

Future<void> _testPlanCreation(WidgetTester tester) async {
  // Navigate to plans
  await tester.tap(find.byIcon(Icons.school));
  await tester.pumpAndSettle();

  // Create new plan
  await tester.tap(find.text('Yeni Plan Oluştur'));
  await tester.pumpAndSettle();

  // Fill plan form
  await tester.enterText(find.byType(TextField).at(0), 'Matematik Hazırlık Planı');
  await tester.enterText(find.byType(TextField).at(1), '30 günlük matematik hazırlık planı');
  
  // Select subjects
  await tester.tap(find.text('Matematik'));
  await tester.tap(find.text('Geometri'));
  
  // Set duration
  await tester.tap(find.text('30 gün'));
  await tester.pumpAndSettle();
  
  // Set difficulty
  await tester.tap(find.text('Orta'));
  await tester.pumpAndSettle();
  
  // Set available time
  await tester.tap(find.text('2 saat/gün'));
  await tester.pumpAndSettle();
  
  // Create plan
  await tester.tap(find.text('Plan Oluştur'));
  await tester.pumpAndSettle();

  // Verify plan creation
  expect(find.text('Plan başarıyla oluşturuldu'), findsOneWidget);
  expect(find.text('Matematik Hazırlık Planı'), findsOneWidget);
}

Future<void> _testStudySession(WidgetTester tester) async {
  // Navigate to study session
  await tester.tap(find.text('Çalışmaya Başla'));
  await tester.pumpAndSettle();

  // Start study session
  await tester.tap(find.text('Başla'));
  await tester.pumpAndSettle();

  // Simulate study session
  await tester.pump(Duration(seconds: 2));
  
  // Answer questions
  await tester.tap(find.text('A'));
  await tester.pump();
  
  await tester.tap(find.text('İleri'));
  await tester.pumpAndSettle();
  
  await tester.tap(find.text('B'));
  await tester.pump();
  
  await tester.tap(find.text('İleri'));
  await tester.pumpAndSettle();
  
  // Complete session
  await tester.tap(find.text('Oturumu Tamamla'));
  await tester.pumpAndSettle();

  // Verify session completion
  expect(find.text('Oturum tamamlandı'), findsOneWidget);
  expect(find.text('Başarı oranı'), findsOneWidget);
}

Future<void> _testProgressTracking(WidgetTester tester) async {
  // Navigate to progress
  await tester.tap(find.byIcon(Icons.analytics));
  await tester.pumpAndSettle();

  // Check progress indicators
  expect(find.byType(LinearProgressIndicator), findsWidgets);
  expect(find.text('%25'), findsOneWidget);
  
  // View detailed progress
  await tester.tap(find.text('Detaylı İlerleme'));
  await tester.pumpAndSettle();
  
  // Check subject progress
  expect(find.text('Matematik'), findsOneWidget);
  expect(find.text('Geometri'), findsOneWidget);
  
  // Check weekly progress
  await tester.tap(find.text('Haftalık İlerleme'));
  await tester.pumpAndSettle();
  
  expect(find.byType(LineChart), findsOneWidget);
}

Future<void> _testAnalyticsReview(WidgetTester tester) async {
  // Navigate to analytics
  await tester.tap(find.byIcon(Icons.analytics));
  await tester.pumpAndSettle();

  // Check analytics dashboard
  expect(find.text('İstatistikler'), findsOneWidget);
  expect(find.text('Toplam Çalışma Süresi'), findsOneWidget);
  expect(find.text('Tamamlanan Oturumlar'), findsOneWidget);
  
  // View study patterns
  await tester.tap(find.text('Çalışma Kalıpları'));
  await tester.pumpAndSettle();
  
  expect(find.text('Optimal Çalışma Saati'), findsOneWidget);
  expect(find.text('En Verimli Konular'), findsOneWidget);
  
  // View recommendations
  await tester.tap(find.text('Öneriler'));
  await tester.pumpAndSettle();
  
  expect(find.text('Gelişim Önerileri'), findsOneWidget);
}

Future<void> _simulateOfflineMode(WidgetTester tester) async {
  // This would simulate network disconnection
  // In a real test, you'd use network mocking
  await tester.pump(Duration(seconds: 1));
  
  // Show offline indicator
  expect(find.text('Çevrimdışı Mod'), findsOneWidget);
}

Future<void> _testOfflineStudySession(WidgetTester tester) async {
  // Test offline study session
  await tester.tap(find.text('Çevrimdışı Çalışma'));
  await tester.pumpAndSettle();
  
  // Start offline session
  await tester.tap(find.text('Başla'));
  await tester.pumpAndSettle();
  
  // Simulate offline study
  await tester.pump(Duration(seconds: 2));
  
  // Complete offline session
  await tester.tap(find.text('Tamamla'));
  await tester.pumpAndSettle();
  
  // Verify offline session completion
  expect(find.text('Çevrimdışı oturum kaydedildi'), findsOneWidget);
}

Future<void> _testOfflineProgressTracking(WidgetTester tester) async {
  // Test offline progress tracking
  await tester.tap(find.text('Çevrimdışı İlerleme'));
  await tester.pumpAndSettle();
  
  // View cached progress
  expect(find.text('Önbellek Verileri'), findsOneWidget);
  expect(find.text('Son Güncelleme'), findsOneWidget);
}

Future<void> _testDataSync(WidgetTester tester) async {
  // Simulate coming back online
  await tester.pump(Duration(seconds: 1));
  
  // Test data synchronization
  await tester.tap(find.text('Verileri Senkronize Et'));
  await tester.pumpAndSettle();
  
  // Verify data sync
  expect(find.text('Veriler senkronize edildi'), findsOneWidget);
}

Future<void> _testNetworkErrorHandling(WidgetTester tester) async {
  // Test network error scenarios
  await tester.tap(find.text('Plan Oluştur'));
  await tester.pumpAndSettle();
  
  // Simulate network error
  await tester.pump(Duration(seconds: 1));
  
  // Verify error handling
  expect(find.text('Bağlantı hatası'), findsOneWidget);
  expect(find.text('Tekrar Dene'), findsOneWidget);
}

Future<void> _testDataValidationErrors(WidgetTester tester) async {
  // Test data validation
  await tester.enterText(find.byType(TextField).at(0), '');
  await tester.enterText(find.byType(TextField).at(1), 'invalid-email');
  
  await tester.tap(find.text('Kaydet'));
  await tester.pumpAndSettle();
  
  // Verify validation errors
  expect(find.text('Geçerli bir email adresi girin'), findsOneWidget);
  expect(find.text('Bu alan zorunludur'), findsOneWidget);
}

Future<void> _testAppRecovery(WidgetTester tester) async {
  // Test app recovery from errors
  await tester.tap(find.text('Uygulamayı Yenile'));
  await tester.pumpAndSettle();
  
  // Verify app recovery
  expect(find.text('Ana Sayfa'), findsOneWidget);
  expect(find.text('Uygulama yenilendi'), findsOneWidget);
}
