import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:okuz_ai/widgets/plan_summary_card.dart';
import 'package:okuz_ai/models/plan_summary_model.dart';

void main() {
  group('PlanSummaryCard Widget Tests', () {
    late PlanSummary testPlan;

    setUp(() {
      testPlan = PlanSummary(
        id: 'plan123',
        title: 'Test Plan',
        description: 'Test Description',
        duration: 7,
        difficulty: 'MEDIUM',
        subjects: ['Mathematics', 'Physics'],
        createdAt: DateTime.now(),
        progress: 0.5,
        isCompleted: false,
      );
    });

    testWidgets('should display plan information correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PlanSummaryCard(
              plan: testPlan,
              onTap: () {},
            ),
          ),
        ),
      );

      expect(find.text('Test Plan'), findsOneWidget);
      expect(find.text('Test Description'), findsOneWidget);
      expect(find.text('7 gün'), findsOneWidget);
      expect(find.text('Orta'), findsOneWidget);
      expect(find.text('Mathematics'), findsOneWidget);
      expect(find.text('Physics'), findsOneWidget);
    });

    testWidgets('should display progress indicator', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PlanSummaryCard(
              plan: testPlan,
              onTap: () {},
            ),
          ),
        ),
      );

      expect(find.byType(LinearProgressIndicator), findsOneWidget);
      expect(find.text('%50'), findsOneWidget);
    });

    testWidgets('should handle tap events', (WidgetTester tester) async {
      bool tapped = false;
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PlanSummaryCard(
              plan: testPlan,
              onTap: () {
                tapped = true;
              },
            ),
          ),
        ),
      );

      await tester.tap(find.byType(PlanSummaryCard));
      expect(tapped, true);
    });

    testWidgets('should display completed status', (WidgetTester tester) async {
      final completedPlan = PlanSummary(
        id: 'plan123',
        title: 'Completed Plan',
        description: 'Completed Description',
        duration: 7,
        difficulty: 'MEDIUM',
        subjects: ['Mathematics'],
        createdAt: DateTime.now(),
        progress: 1.0,
        isCompleted: true,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PlanSummaryCard(
              plan: completedPlan,
              onTap: () {},
            ),
          ),
        ),
      );

      expect(find.text('Tamamlandı'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle), findsOneWidget);
    });

    testWidgets('should display different difficulty levels', (WidgetTester tester) async {
      final easyPlan = PlanSummary(
        id: 'plan123',
        title: 'Easy Plan',
        description: 'Easy Description',
        duration: 7,
        difficulty: 'EASY',
        subjects: ['Mathematics'],
        createdAt: DateTime.now(),
        progress: 0.0,
        isCompleted: false,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PlanSummaryCard(
              plan: easyPlan,
              onTap: () {},
            ),
          ),
        ),
      );

      expect(find.text('Kolay'), findsOneWidget);
    });

    testWidgets('should display hard difficulty level', (WidgetTester tester) async {
      final hardPlan = PlanSummary(
        id: 'plan123',
        title: 'Hard Plan',
        description: 'Hard Description',
        duration: 7,
        difficulty: 'HARD',
        subjects: ['Mathematics'],
        createdAt: DateTime.now(),
        progress: 0.0,
        isCompleted: false,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PlanSummaryCard(
              plan: hardPlan,
              onTap: () {},
            ),
          ),
        ),
      );

      expect(find.text('Zor'), findsOneWidget);
    });

    testWidgets('should display multiple subjects', (WidgetTester tester) async {
      final multiSubjectPlan = PlanSummary(
        id: 'plan123',
        title: 'Multi Subject Plan',
        description: 'Multi Subject Description',
        duration: 7,
        difficulty: 'MEDIUM',
        subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology'],
        createdAt: DateTime.now(),
        progress: 0.0,
        isCompleted: false,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PlanSummaryCard(
              plan: multiSubjectPlan,
              onTap: () {},
            ),
          ),
        ),
      );

      expect(find.text('Mathematics'), findsOneWidget);
      expect(find.text('Physics'), findsOneWidget);
      expect(find.text('Chemistry'), findsOneWidget);
      expect(find.text('Biology'), findsOneWidget);
    });

    testWidgets('should handle long titles gracefully', (WidgetTester tester) async {
      final longTitlePlan = PlanSummary(
        id: 'plan123',
        title: 'This is a very long plan title that should be handled gracefully by the widget',
        description: 'Description',
        duration: 7,
        difficulty: 'MEDIUM',
        subjects: ['Mathematics'],
        createdAt: DateTime.now(),
        progress: 0.0,
        isCompleted: false,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PlanSummaryCard(
              plan: longTitlePlan,
              onTap: () {},
            ),
          ),
        ),
      );

      expect(find.textContaining('This is a very long plan title'), findsOneWidget);
    });
  });
}
