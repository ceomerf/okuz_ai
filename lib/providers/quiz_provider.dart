import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/quiz_models.dart';
import '../services/api_service.dart';
import '../services/providers.dart';

// Quiz'in durumlarını temsil eden sealed class
sealed class QuizState {}

class QuizInitial extends QuizState {}

class QuizLoading extends QuizState {}

class QuizInProgress extends QuizState {
  final String quizId;
  final String topic;
  final List<QuizQuestion> questions;
  final Map<String, int> userAnswers; // questionId -> selectedOptionIndex
  final int currentPage;
  final int? timeLimitMinutes;

  QuizInProgress({
    required this.quizId,
    required this.topic,
    required this.questions,
    this.userAnswers = const {},
    this.currentPage = 0,
    this.timeLimitMinutes,
  });
}

class QuizFinished extends QuizState {
  final List<QuizResult> results;
  final int score;
  final int totalQuestions;

  QuizFinished({
    required this.results,
    required this.score,
    required this.totalQuestions,
  });
}

class QuizError extends QuizState {
  final String message;
  QuizError(this.message);
}

class QuizNotifier extends StateNotifier<QuizState> {
  final Ref _ref;
  static const String _quizHistoryKey = 'quiz_history';

  QuizNotifier(this._ref) : super(QuizInitial());

  Future<void> generateQuiz({
    required String topic,
    required int questionCount,
    required String difficulty,
    String? subject,
    String? grade,
    int? timeLimitMinutes,
  }) async {
    print('📊 QuizProvider.generateQuiz başlatıldı');
    state = QuizLoading();

    try {
      print('   API isteği hazırlanıyor');
      final response = await _ref.read(apiServiceProvider).generateQuiz({
        'topic': topic,
        'questionCount': questionCount,
        'count': questionCount,
        'difficulty': difficulty,
        if (subject != null) 'subject': subject,
        if (grade != null) 'grade': grade,
      });
      
      print(
          '   API yanıtı: ${response.toString().substring(0, response.toString().length > 100 ? 100 : response.toString().length)}...');

      if (response['success'] == true) {
        print('   API başarılı yanıt verdi');
        // Backend farklı yapılarda dönebiliyor; normalize edelim
        final String quizId = response['quizId']
            ?? response['quiz']?['id']
            ?? response['quiz']?['quiz']?['id']
            ?? 'temp';
        print('   Quiz ID: $quizId');
        final List<dynamic> questionsList =
            response['questions']
                ?? response['quiz']?['questions']
                ?? response['quiz']?['quiz']?['questions']
                ?? [];
        print('   Soru sayısı: ${questionsList.length}');

        // Map backend alanlarını QuizQuestion modeline dönüştür
        final List<QuizQuestion> questions = questionsList.map((q) {
          if (q is Map<String, dynamic> && (q.containsKey('question') || q.containsKey('questionText') || q.containsKey('text') || q.containsKey('stem'))) {
            String normalizeText(String s) {
              String t = s.replaceAll(RegExp(r'^[A-Da-d][\)\.:\-]\s*'), '');
              t = t.replaceAll(RegExp(r'\s+'), ' ').trim();
              return t;
            }

            int? letterToIndex(String s) {
              if (s.isEmpty) return null;
              final String clean = s.trim().toUpperCase().replaceAll(RegExp(r'[\)\.:\-]'), '');
              if (clean.isEmpty) return null;
              final int code = clean.codeUnitAt(0);
              if (code >= 65 && code <= 90) {
                return code - 65; // A=0
              }
              return null;
            }

            final String questionText = (q['question'] ?? q['questionText'] ?? q['text'] ?? q['stem'] ?? '').toString();
            final List<dynamic> rawOptions = (q['options'] is List) ? (q['options'] as List) : const [];
            final List<String> options = rawOptions.map((opt) {
              if (opt is String) return opt;
              if (opt is Map<String, dynamic>) {
                final dynamic v = opt['text'] ?? opt['label'] ?? opt['value'] ?? (opt.isNotEmpty ? opt.values.first : '');
                return v?.toString() ?? '';
              }
              return opt.toString();
            }).toList();

            int? correctIndex = q['correctIndex'] is int ? q['correctIndex'] as int : null;
            final dynamic correctAnswer = q['correctAnswer'] ?? q['answer'];

            if (correctIndex == null && correctAnswer != null) {
              if (correctAnswer is int) {
                correctIndex = correctAnswer;
              } else if (correctAnswer is String) {
                final String ans = correctAnswer.trim();
                // 1) Harf -> index
                correctIndex = letterToIndex(ans);
                // 2) Metin eşleşmesi (normalize)
                if (correctIndex == null) {
                  final String normAns = normalizeText(ans).toLowerCase();
                  final int byText = options.indexWhere((o) => normalizeText(o).toLowerCase() == normAns);
                  if (byText >= 0) correctIndex = byText;
                }
                // 3) Opsiyon başı harfi ile eşleştir
                if (correctIndex == null) {
                  for (int i = 0; i < options.length; i++) {
                    final String o = options[i];
                    final int? li = letterToIndex(o);
                    if (li != null && letterToIndex(ans) == li) {
                      correctIndex = i;
                      break;
                    }
                  }
                }
              }
            }

            // Halen bulunamadıysa ilk şıkkı doğru kabul etme; null kalsın -> yerel skorlamada -1 ile eşitlenir
            return QuizQuestion(
              id: (q['id'] ?? q['questionId'] ?? questionText.hashCode).toString(),
              questionText: questionText,
              options: options,
              correctAnswerIndex: correctIndex,
              explanation: (q['explanation'] ?? '').toString(),
            );
          }
          // Varsayılan: doğrudan modelden dene
          return QuizQuestion.fromJson(q as Map<String, dynamic>);
        }).toList();

        state = QuizInProgress(
          quizId: quizId,
          topic: topic,
          questions: questions,
          timeLimitMinutes: timeLimitMinutes,
        );
        print('   QuizInProgress durumuna geçildi');
      } else {
        print('   API başarısız yanıt verdi: ${response['message'] ?? 'Bilinmeyen hata'}');
        state = QuizError('Quiz oluşturulurken bir hata oluştu.');
      }
    } catch (e) {
      print('❌ QuizProvider.generateQuiz hatası: $e');
      state = QuizError('Quiz oluşturulurken bir hata oluştu: ${e.toString()}');
    }

    print('📊 QuizProvider.generateQuiz tamamlandı, state: ${state.runtimeType}');
  }

  void answerQuestion(String questionId, int selectedIndex) {
    if (state is QuizInProgress) {
      final currentState = state as QuizInProgress;
      final newAnswers = Map<String, int>.from(currentState.userAnswers);
      newAnswers[questionId] = selectedIndex;
      state = QuizInProgress(
        quizId: currentState.quizId,
        topic: currentState.topic,
        questions: currentState.questions,
        userAnswers: newAnswers,
        currentPage: currentState.currentPage,
        timeLimitMinutes: currentState.timeLimitMinutes,
      );
    }
  }

  void changePage(int page) {
    if (state is QuizInProgress) {
      final currentState = state as QuizInProgress;
      state = QuizInProgress(
        quizId: currentState.quizId,
        topic: currentState.topic,
        questions: currentState.questions,
        userAnswers: currentState.userAnswers,
        currentPage: page,
        timeLimitMinutes: currentState.timeLimitMinutes,
      );
    }
  }

  Future<void> submitQuiz() async {
    if (state is QuizInProgress) {
      final currentState = state as QuizInProgress;
      state = QuizLoading();

      try {
        final answers = currentState.userAnswers.entries
            .map((e) => {
                  'questionId': e.key,
                  'selectedOptionIndex': e.value,
                })
            .toList();

        final response = await _ref.read(apiServiceProvider).submitQuiz(
          currentState.quizId,
          answers,
        );

        bool hydratedFromApi = false;
        if (response['success'] == true && response['results'] != null) {
          try {
            final List<dynamic> resultsList = response['results'];
            final List<QuizResult> results =
                resultsList.map((r) => QuizResult.fromJson(r)).toList();
            final int score = response['score'] ??
                results.where((r) => r.yourAnswerIndex == r.correctAnswerIndex).length;
            final int total = response['totalQuestions'] ?? results.length;

            state = QuizFinished(
              results: results,
              score: score,
              totalQuestions: total,
            );

            await _appendQuizHistoryItem(
              QuizHistoryItem(
                id: currentState.quizId,
                topic: currentState.topic,
                score: score,
                totalQuestions: total,
                completedAt: DateTime.now(),
              ),
            );

            hydratedFromApi = true;
          } catch (_) {
            hydratedFromApi = false;
          }
        }

        // API sonuç döndürmediyse yerelde hesapla
        if (!hydratedFromApi) {
          final List<QuizResult> results = <QuizResult>[];
          int score = 0;
          for (final QuizQuestion question in currentState.questions) {
            final int yourIndex = currentState.userAnswers[question.id] ?? -1;
            final int correctIndex = question.correctAnswerIndex ?? -1;
            if (yourIndex >= 0 && correctIndex >= 0 && yourIndex == correctIndex) {
              score += 1;
            }
            results.add(
              QuizResult(
                questionText: question.questionText,
                options: question.options,
                yourAnswerIndex: yourIndex,
                correctAnswerIndex: correctIndex,
                explanation: question.explanation ?? 'Açıklama mevcut değil.',
              ),
            );
          }

          state = QuizFinished(
            results: results,
            score: score,
            totalQuestions: currentState.questions.length,
          );

          await _appendQuizHistoryItem(
            QuizHistoryItem(
              id: currentState.quizId,
              topic: currentState.topic,
              score: score,
              totalQuestions: currentState.questions.length,
              completedAt: DateTime.now(),
            ),
          );
        }
      } catch (e) {
        state = QuizError(
            'Quiz sonuçları alınırken bir hata oluştu: ${e.toString()}');
      }
    }
  }

  Future<List<QuizHistoryItem>> getQuizHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_quizHistoryKey);
      if (raw == null || raw.isEmpty) return [];
      final List<dynamic> list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => QuizHistoryItem.fromJson(e as Map<String, dynamic>))
          .toList()
          .reversed
          .toList();
    } catch (e) {
      throw Exception('Quiz geçmişi alınırken bir hata oluştu: ${e.toString()}');
    }
  }

  Future<void> _appendQuizHistoryItem(QuizHistoryItem item) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_quizHistoryKey);
      List<dynamic> list = [];
      if (raw != null && raw.isNotEmpty) {
        try {
          list = jsonDecode(raw) as List<dynamic>;
        } catch (_) {
          list = [];
        }
      }
      list.add({
        'id': item.id,
        'topic': item.topic,
        'score': item.score,
        'totalQuestions': item.totalQuestions,
        'completedAt': item.completedAt.toIso8601String(),
      });
      // Son 50 kaydı tut
      if (list.length > 50) {
        list = list.sublist(list.length - 50);
      }
      await prefs.setString(_quizHistoryKey, jsonEncode(list));
    } catch (_) {
      // Sessizce yut; geçmiş kaydı kritik değil
    }
  }
}

final quizNotifierProvider = StateNotifierProvider<QuizNotifier, QuizState>((ref) {
  return QuizNotifier(ref);
});
