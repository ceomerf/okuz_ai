import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:okuz_ai/core/lazy_loading/lazy_loader.dart';

void main() {
  group('LazyLoader Tests', () {
    testWidgets('should render child when enabled is false', (WidgetTester tester) async {
      const child = Text('Test Child');
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LazyLoader(
              enabled: false,
              child: child,
            ),
          ),
        ),
      );

      expect(find.text('Test Child'), findsOneWidget);
    });

    testWidgets('should show placeholder initially when enabled', (WidgetTester tester) async {
      const child = Text('Test Child');
      const placeholder = Text('Loading...');
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LazyLoader(
              enabled: true,
              child: child,
              placeholder: placeholder,
            ),
          ),
        ),
      );

      expect(find.text('Loading...'), findsOneWidget);
      expect(find.text('Test Child'), findsNothing);
    });

    testWidgets('should show default placeholder when none provided', (WidgetTester tester) async {
      const child = Text('Test Child');
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LazyLoader(
              enabled: true,
              child: child,
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('should load child after delay', (WidgetTester tester) async {
      const child = Text('Test Child');
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LazyLoader(
              enabled: true,
              child: child,
              delay: Duration(milliseconds: 100),
            ),
          ),
        ),
      );

      // Initially should show placeholder
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      
      // Wait for delay
      await tester.pump(Duration(milliseconds: 150));
      
      // Should now show child
      expect(find.text('Test Child'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });
  });

  group('DeferredLoader Tests', () {
    testWidgets('should load widget asynchronously', (WidgetTester tester) async {
      Future<Widget> loader() async {
        await Future.delayed(Duration(milliseconds: 100));
        return Text('Loaded Widget');
      }

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DeferredLoader(
              loader: loader,
            ),
          ),
        ),
      );

      // Initially should show loading
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      
      // Wait for loading
      await tester.pump(Duration(milliseconds: 150));
      
      // Should show loaded widget
      expect(find.text('Loaded Widget'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });

    testWidgets('should handle loading errors', (WidgetTester tester) async {
      Future<Widget> errorLoader() async {
        await Future.delayed(Duration(milliseconds: 100));
        throw Exception('Loading error');
      }

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DeferredLoader(
              loader: errorLoader,
            ),
          ),
        ),
      );

      // Wait for error
      await tester.pump(Duration(milliseconds: 150));
      
      // Should show error message
      expect(find.text('Yükleme hatası'), findsOneWidget);
    });

    testWidgets('should respect timeout', (WidgetTester tester) async {
      Future<Widget> slowLoader() async {
        await Future.delayed(Duration(seconds: 2));
        return Text('Slow Widget');
      }

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DeferredLoader(
              loader: slowLoader,
              timeout: Duration(milliseconds: 100),
            ),
          ),
        ),
      );

      // Wait for timeout
      await tester.pump(Duration(milliseconds: 150));
      
      // Should show error due to timeout
      expect(find.text('Yükleme hatası'), findsOneWidget);
    });
  });

  group('RouteBasedLoader Tests', () {
    test('should cache routes', () {
      RouteBasedLoader.clearCache();
      
      final widget1 = RouteBasedLoader.loadRoute('route1', () => Text('Route 1'));
      final widget2 = RouteBasedLoader.loadRoute('route1', () => Text('Route 1'));
      
      expect(identical(widget1, widget2), true);
    });

    test('should clear cache', () {
      RouteBasedLoader.loadRoute('route1', () => Text('Route 1'));
      expect(RouteBasedLoader._cachedRoutes.length, 1);
      
      RouteBasedLoader.clearCache();
      expect(RouteBasedLoader._cachedRoutes.length, 0);
    });

    test('should remove specific route', () {
      RouteBasedLoader.clearCache();
      
      RouteBasedLoader.loadRoute('route1', () => Text('Route 1'));
      RouteBasedLoader.loadRoute('route2', () => Text('Route 2'));
      
      expect(RouteBasedLoader._cachedRoutes.length, 2);
      
      RouteBasedLoader.removeRoute('route1');
      expect(RouteBasedLoader._cachedRoutes.length, 1);
      expect(RouteBasedLoader._cachedRoutes.containsKey('route1'), false);
      expect(RouteBasedLoader._cachedRoutes.containsKey('route2'), true);
    });
  });

  group('OptimizedWidget Tests', () {
    testWidgets('should apply repaint boundary when enabled', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: OptimizedWidget(
              enableRepaintBoundary: true,
              child: Text('Test'),
            ),
          ),
        ),
      );

      expect(find.byType(RepaintBoundary), findsOneWidget);
    });

    testWidgets('should not apply repaint boundary when disabled', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: OptimizedWidget(
              enableRepaintBoundary: false,
              child: Text('Test'),
            ),
          ),
        ),
      );

      expect(find.byType(RepaintBoundary), findsNothing);
    });

    testWidgets('should apply keep alive when enabled', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: OptimizedWidget(
              enableAutomaticKeepAlive: true,
              child: Text('Test'),
            ),
          ),
        ),
      );

      expect(find.byType(KeepAlive), findsOneWidget);
    });
  });

  group('MemoryEfficientListView Tests', () {
    testWidgets('should render list with lazy loading', (WidgetTester tester) async {
      final children = List.generate(10, (index) => Text('Item $index'));
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MemoryEfficientListView(
              children: children,
            ),
          ),
        ),
      );

      expect(find.byType(ListView), findsOneWidget);
      expect(find.byType(LazyLoader), findsWidgets);
    });

    testWidgets('should handle empty list', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MemoryEfficientListView(
              children: [],
            ),
          ),
        ),
      );

      expect(find.byType(ListView), findsOneWidget);
    });
  });
}