import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:okuz_ai/core/lazy_loading/lazy_loader.dart';

void main() {
  group('LazyLoader Tests', () {
    testWidgets('should show child when enabled is false', (WidgetTester tester) async {
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
      expect(find.text('Test Child'), findsNothing);
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

      // Initially shows placeholder
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Test Child'), findsNothing);

      // Wait for delay
      await tester.pump(Duration(milliseconds: 150));

      // Should now show child
      expect(find.text('Test Child'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });
  });

  group('DeferredLoader Tests', () {
    testWidgets('should show placeholder while loading', (WidgetTester tester) async {
      const placeholder = Text('Loading...');
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DeferredLoader(
              loader: () async {
                await Future.delayed(Duration(milliseconds: 100));
                return Text('Loaded Content');
              },
              placeholder: placeholder,
            ),
          ),
        ),
      );

      expect(find.text('Loading...'), findsOneWidget);
    });

    testWidgets('should show loaded content after loading', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DeferredLoader(
              loader: () async {
                await Future.delayed(Duration(milliseconds: 100));
                return Text('Loaded Content');
              },
            ),
          ),
        ),
      );

      // Wait for loading to complete
      await tester.pump(Duration(milliseconds: 150));

      expect(find.text('Loaded Content'), findsOneWidget);
    });

    testWidgets('should show error when loading fails', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DeferredLoader(
              loader: () async {
                await Future.delayed(Duration(milliseconds: 100));
                throw Exception('Loading failed');
              },
            ),
          ),
        ),
      );

      // Wait for loading to fail
      await tester.pump(Duration(milliseconds: 150));

      expect(find.text('Yükleme hatası'), findsOneWidget);
    });

    testWidgets('should timeout when loading takes too long', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DeferredLoader(
              loader: () async {
                await Future.delayed(Duration(seconds: 2));
                return Text('Loaded Content');
              },
              timeout: Duration(milliseconds: 100),
            ),
          ),
        ),
      );

      // Wait for timeout
      await tester.pump(Duration(milliseconds: 150));

      expect(find.text('Yükleme hatası'), findsOneWidget);
    });
  });

  group('RouteBasedLoader Tests', () {
    test('should load route from cache', () {
      const routeName = 'test-route';
      const widget = Text('Cached Widget');
      
      // Load route first time
      RouteBasedLoader.loadRoute(routeName, () => widget);
      
      // Load same route again (should be cached)
      final cachedWidget = RouteBasedLoader.loadRoute(routeName, () => Text('New Widget'));
      
      expect(cachedWidget, equals(widget));
    });

    test('should clear cache', () {
      const routeName = 'test-route';
      const widget = Text('Test Widget');
      
      // Load route
      RouteBasedLoader.loadRoute(routeName, () => widget);
      
      // Clear cache
      RouteBasedLoader.clearCache();
      
      // Load route again (should not be cached)
      final newWidget = RouteBasedLoader.loadRoute(routeName, () => Text('New Widget'));
      
      expect(newWidget, isNot(equals(widget)));
    });

    test('should remove specific route from cache', () {
      const routeName1 = 'route-1';
      const routeName2 = 'route-2';
      const widget1 = Text('Widget 1');
      const widget2 = Text('Widget 2');
      
      // Load both routes
      RouteBasedLoader.loadRoute(routeName1, () => widget1);
      RouteBasedLoader.loadRoute(routeName2, () => widget2);
      
      // Remove first route
      RouteBasedLoader.removeRoute(routeName1);
      
      // First route should not be cached, second should be
      final newWidget1 = RouteBasedLoader.loadRoute(routeName1, () => Text('New Widget 1'));
      final cachedWidget2 = RouteBasedLoader.loadRoute(routeName2, () => Text('New Widget 2'));
      
      expect(newWidget1, isNot(equals(widget1)));
      expect(cachedWidget2, equals(widget2));
    });
  });

  group('OptimizedWidget Tests', () {
    testWidgets('should wrap child with RepaintBoundary when enabled', (WidgetTester tester) async {
      const child = Text('Test Child');
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: OptimizedWidget(
              enableRepaintBoundary: true,
              child: child,
            ),
          ),
        ),
      );

      expect(find.byType(RepaintBoundary), findsOneWidget);
      expect(find.text('Test Child'), findsOneWidget);
    });

    testWidgets('should not wrap child with RepaintBoundary when disabled', (WidgetTester tester) async {
      const child = Text('Test Child');
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: OptimizedWidget(
              enableRepaintBoundary: false,
              child: child,
            ),
          ),
        ),
      );

      expect(find.byType(RepaintBoundary), findsNothing);
      expect(find.text('Test Child'), findsOneWidget);
    });
  });

  group('MemoryEfficientListView Tests', () {
    testWidgets('should create list with children', (WidgetTester tester) async {
      final children = [
        Text('Item 1'),
        Text('Item 2'),
        Text('Item 3'),
      ];
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MemoryEfficientListView(
              children: children,
            ),
          ),
        ),
      );

      expect(find.text('Item 1'), findsOneWidget);
      expect(find.text('Item 2'), findsOneWidget);
      expect(find.text('Item 3'), findsOneWidget);
    });

    testWidgets('should use LazyLoader for each item', (WidgetTester tester) async {
      final children = [
        Text('Item 1'),
        Text('Item 2'),
      ];
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MemoryEfficientListView(
              children: children,
            ),
          ),
        ),
      );

      // Each item should be wrapped in LazyLoader
      expect(find.byType(LazyLoader), findsNWidgets(2));
    });
  });
}
