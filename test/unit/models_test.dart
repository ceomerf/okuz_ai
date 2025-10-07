import 'package:flutter_test/flutter_test.dart';
import 'package:okuz_ai/models/user.dart';
import 'package:okuz_ai/models/plan_summary_model.dart';
import 'package:okuz_ai/models/diagnostic_test.dart';

void main() {
  group('User Model Tests', () {
    test('should create user from JSON', () {
      final json = {
        'id': '123',
        'email': 'test@example.com',
        'name': 'Test User',
        'role': 'STUDENT',
        'grade': 12,
        'learningStyle': 'VISUAL',
        'createdAt': '2024-01-01T00:00:00Z',
        'updatedAt': '2024-01-01T00:00:00Z',
      };

      final user = User.fromJson(json);

      expect(user.id, '123');
      expect(user.email, 'test@example.com');
      expect(user.name, 'Test User');
      expect(user.role, UserRole.STUDENT);
      expect(user.grade, 12);
      expect(user.learningStyle, LearningStyle.VISUAL);
    });

    test('should convert user to JSON', () {
      final user = User(
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.STUDENT,
        grade: 12,
        learningStyle: LearningStyle.VISUAL,
        createdAt: DateTime.parse('2024-01-01T00:00:00Z'),
        updatedAt: DateTime.parse('2024-01-01T00:00:00Z'),
      );

      final json = user.toJson();

      expect(json['id'], '123');
      expect(json['email'], 'test@example.com');
      expect(json['name'], 'Test User');
      expect(json['role'], 'STUDENT');
      expect(json['grade'], 12);
      expect(json['learningStyle'], 'VISUAL');
    });

    test('should handle null values in JSON', () {
      final json = {
        'id': '123',
        'email': 'test@example.com',
        'name': 'Test User',
        'role': 'STUDENT',
        'grade': null,
        'learningStyle': null,
        'createdAt': '2024-01-01T00:00:00Z',
        'updatedAt': '2024-01-01T00:00:00Z',
      };

      final user = User.fromJson(json);

      expect(user.id, '123');
      expect(user.email, 'test@example.com');
      expect(user.grade, null);
      expect(user.learningStyle, null);
    });
  });

  group('PlanSummary Model Tests', () {
    test('should create plan summary from JSON', () {
      final json = {
        'id': 'plan123',
        'title': 'Test Plan',
        'description': 'Test Description',
        'duration': 7,
        'difficulty': 'MEDIUM',
        'subjects': ['Mathematics', 'Physics'],
        'createdAt': '2024-01-01T00:00:00Z',
        'progress': 0.5,
        'isCompleted': false,
      };

      final plan = PlanSummary.fromJson(json);

      expect(plan.id, 'plan123');
      expect(plan.title, 'Test Plan');
      expect(plan.description, 'Test Description');
      expect(plan.duration, 7);
      expect(plan.difficulty, 'MEDIUM');
      expect(plan.subjects, ['Mathematics', 'Physics']);
      expect(plan.progress, 0.5);
      expect(plan.isCompleted, false);
    });

    test('should convert plan summary to JSON', () {
      final plan = PlanSummary(
        id: 'plan123',
        title: 'Test Plan',
        description: 'Test Description',
        duration: 7,
        difficulty: 'MEDIUM',
        subjects: ['Mathematics', 'Physics'],
        createdAt: DateTime.parse('2024-01-01T00:00:00Z'),
        progress: 0.5,
        isCompleted: false,
      );

      final json = plan.toJson();

      expect(json['id'], 'plan123');
      expect(json['title'], 'Test Plan');
      expect(json['description'], 'Test Description');
      expect(json['duration'], 7);
      expect(json['difficulty'], 'MEDIUM');
      expect(json['subjects'], ['Mathematics', 'Physics']);
      expect(json['progress'], 0.5);
      expect(json['isCompleted'], false);
    });
  });

  group('DiagnosticTest Model Tests', () {
    test('should create diagnostic test from JSON', () {
      final json = {
        'id': 'test123',
        'title': 'Math Test',
        'description': 'Basic Math Test',
        'duration': 30,
        'questions': [
          {
            'id': 'q1',
            'question': 'What is 2+2?',
            'options': ['3', '4', '5', '6'],
            'correctAnswer': 1,
            'subject': 'Mathematics',
            'difficulty': 'EASY',
          }
        ],
      };

      final test = DiagnosticTest.fromJson(json);

      expect(test.id, 'test123');
      expect(test.title, 'Math Test');
      expect(test.description, 'Basic Math Test');
      expect(test.duration, 30);
      expect(test.questions.length, 1);
      expect(test.questions[0].question, 'What is 2+2?');
      expect(test.questions[0].correctAnswer, 1);
    });

    test('should create question result', () {
      final result = QuestionResult(
        questionId: 'q1',
        selectedAnswer: 1,
        isCorrect: true,
        timeSpent: 30,
        subject: 'Mathematics',
      );

      expect(result.questionId, 'q1');
      expect(result.selectedAnswer, 1);
      expect(result.isCorrect, true);
      expect(result.timeSpent, 30);
      expect(result.subject, 'Mathematics');
    });
  });
}
