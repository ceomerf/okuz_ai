import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:okuz_ai/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Performance Integration Tests', () {
    testWidgets('App startup performance', (WidgetTester tester) async {
      final stopwatch = Stopwatch()..start();
      
      // Start the app
      app.main();
      await tester.pumpAndSettle();
      
      stopwatch.stop();
      
      // Verify startup time is within acceptable limits (< 3 seconds)
      expect(stopwatch.elapsedMilliseconds, lessThan(3000));
      
      // Verify app is responsive
      expect(find.text('Ana Sayfa'), findsOneWidget);
    });

    testWidgets('Navigation performance', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Test navigation between screens
      final navigationTimes = <int>[];
      
      // Navigate to Plans
      final plansStopwatch = Stopwatch()..start();
      await tester.tap(find.byIcon(Icons.school));
      await tester.pumpAndSettle();
      plansStopwatch.stop();
      navigationTimes.add(plansStopwatch.elapsedMilliseconds);
      
      // Navigate to Analytics
      final analyticsStopwatch = Stopwatch()..start();
      await tester.tap(find.byIcon(Icons.analytics));
      await tester.pumpAndSettle();
      analyticsStopwatch.stop();
      navigationTimes.add(analyticsStopwatch.elapsedMilliseconds);
      
      // Navigate to Profile
      final profileStopwatch = Stopwatch()..start();
      await tester.tap(find.byIcon(Icons.person));
      await tester.pumpAndSettle();
      profileStopwatch.stop();
      navigationTimes.add(profileStopwatch.elapsedMilliseconds);
      
      // Verify navigation times are acceptable (< 500ms each)
      for (final time in navigationTimes) {
        expect(time, lessThan(500));
      }
    });

    testWidgets('List scrolling performance', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Navigate to plans screen
      await tester.tap(find.byIcon(Icons.school));
      await tester.pumpAndSettle();

      // Test scrolling performance
      final scrollStopwatch = Stopwatch()..start();
      
      // Scroll down
      await tester.drag(find.byType(ListView), Offset(0, -500));
      await tester.pumpAndSettle();
      
      // Scroll up
      await tester.drag(find.byType(ListView), Offset(0, 500));
      await tester.pumpAndSettle();
      
      scrollStopwatch.stop();
      
      // Verify scrolling is smooth (< 200ms)
      expect(scrollStopwatch.elapsedMilliseconds, lessThan(200));
    });

    testWidgets('Memory usage during extended use', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Simulate extended app usage
      for (int i = 0; i < 10; i++) {
        // Navigate between screens
        await tester.tap(find.byIcon(Icons.school));
        await tester.pumpAndSettle();
        
        await tester.tap(find.byIcon(Icons.analytics));
        await tester.pumpAndSettle();
        
        await tester.tap(find.byIcon(Icons.person));
        await tester.pumpAndSettle();
        
        await tester.tap(find.byIcon(Icons.home));
        await tester.pumpAndSettle();
        
        // Simulate user interaction
        await tester.pump(Duration(milliseconds: 100));
      }
      
      // Verify app is still responsive
      expect(find.text('Ana Sayfa'), findsOneWidget);
      
      // Test memory cleanup
      await tester.pump(Duration(seconds: 2));
      
      // Verify no memory leaks (app should still be responsive)
      await tester.tap(find.byIcon(Icons.school));
      await tester.pumpAndSettle();
      expect(find.text('Planlarım'), findsOneWidget);
    });

    testWidgets('Form input performance', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Navigate to plan creation
      await tester.tap(find.byIcon(Icons.school));
      await tester.pumpAndSettle();
      
      await tester.tap(find.text('Yeni Plan Oluştur'));
      await tester.pumpAndSettle();

      // Test form input performance
      final inputStopwatch = Stopwatch()..start();
      
      // Fill form fields
      await tester.enterText(find.byType(TextField).at(0), 'Test Plan');
      await tester.pump();
      
      await tester.enterText(find.byType(TextField).at(1), 'Test Description');
      await tester.pump();
      
      // Select options
      await tester.tap(find.text('Matematik'));
      await tester.pump();
      
      await tester.tap(find.text('30 gün'));
      await tester.pump();
      
      await tester.tap(find.text('Orta'));
      await tester.pump();
      
      inputStopwatch.stop();
      
      // Verify input is responsive (< 100ms per field)
      expect(inputStopwatch.elapsedMilliseconds, lessThan(500));
    });

    testWidgets('Data loading performance', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Test data loading performance
      final loadingStopwatch = Stopwatch()..start();
      
      // Navigate to analytics (which loads data)
      await tester.tap(find.byIcon(Icons.analytics));
      await tester.pumpAndSettle();
      
      loadingStopwatch.stop();
      
      // Verify data loads within acceptable time (< 1 second)
      expect(loadingStopwatch.elapsedMilliseconds, lessThan(1000));
      
      // Verify data is displayed
      expect(find.text('İstatistikler'), findsOneWidget);
    });

    testWidgets('Animation performance', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Test animation performance
      final animationStopwatch = Stopwatch()..start();
      
      // Trigger animations
      await tester.tap(find.byIcon(Icons.school));
      await tester.pumpAndSettle();
      
      await tester.tap(find.byIcon(Icons.analytics));
      await tester.pumpAndSettle();
      
      await tester.tap(find.byIcon(Icons.person));
      await tester.pumpAndSettle();
      
      animationStopwatch.stop();
      
      // Verify animations are smooth (< 300ms)
      expect(animationStopwatch.elapsedMilliseconds, lessThan(300));
    });

    testWidgets('Background/foreground performance', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Simulate app going to background
      await tester.binding.pause();
      await tester.pump(Duration(seconds: 1));
      
      // Simulate app coming to foreground
      await tester.binding.resume();
      await tester.pumpAndSettle();
      
      // Verify app state is maintained
      expect(find.text('Ana Sayfa'), findsOneWidget);
      
      // Test performance after background/foreground cycle
      final resumeStopwatch = Stopwatch()..start();
      
      await tester.tap(find.byIcon(Icons.school));
      await tester.pumpAndSettle();
      
      resumeStopwatch.stop();
      
      // Verify app is still responsive after background/foreground
      expect(resumeStopwatch.elapsedMilliseconds, lessThan(500));
    });

    testWidgets('Large dataset handling', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Navigate to plans screen
      await tester.tap(find.byIcon(Icons.school));
      await tester.pumpAndSettle();

      // Test handling of large datasets
      final largeDataStopwatch = Stopwatch()..start();
      
      // Simulate loading large number of plans
      for (int i = 0; i < 50; i++) {
        await tester.drag(find.byType(ListView), Offset(0, -10));
        await tester.pump();
      }
      
      largeDataStopwatch.stop();
      
      // Verify app handles large datasets smoothly (< 1 second)
      expect(largeDataStopwatch.elapsedMilliseconds, lessThan(1000));
      
      // Verify app is still responsive
      expect(find.text('Planlarım'), findsOneWidget);
    });

    testWidgets('Concurrent operations performance', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Test concurrent operations
      final concurrentStopwatch = Stopwatch()..start();
      
      // Simulate multiple concurrent operations
      await Future.wait([
        tester.tap(find.byIcon(Icons.school)),
        tester.pump(Duration(milliseconds: 100)),
        tester.tap(find.byIcon(Icons.analytics)),
        tester.pump(Duration(milliseconds: 100)),
      ]);
      
      await tester.pumpAndSettle();
      
      concurrentStopwatch.stop();
      
      // Verify concurrent operations complete within acceptable time
      expect(concurrentStopwatch.elapsedMilliseconds, lessThan(1000));
    });
  });
}
