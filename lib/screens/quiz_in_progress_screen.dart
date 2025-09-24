import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:circular_countdown_timer/circular_countdown_timer.dart';
import '../providers/quiz_provider.dart';
import 'quiz_results_screen.dart';

class QuizInProgressScreen extends ConsumerStatefulWidget {
  static const routeName = '/quiz-in-progress';

  const QuizInProgressScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<QuizInProgressScreen> createState() => _QuizInProgressScreenState();
}

class _QuizInProgressScreenState extends ConsumerState<QuizInProgressScreen>
    with SingleTickerProviderStateMixin {
  final PageController _pageController = PageController();
  final CountDownController _timerController = CountDownController();
  Timer? _pageTimer;
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _setupTimer();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _animationController.forward();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _pageTimer?.cancel();
    _animationController.dispose();
    super.dispose();
  }

  void _setupTimer() {
    final quizState = ref.read(quizNotifierProvider);
    if (quizState is QuizInProgress && quizState.timeLimitMinutes != null) {
      // Her saniyede bir sayfa değişimini kontrol et
      _pageTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (!mounted) {
          timer.cancel();
          return;
        }

        // Son sayfadaysak veya zamanlayıcı bittiğinde quizi bitir
        if (_timerController.getTime() == '0' ||
            _pageController.page?.round() == quizState.questions.length - 1) {
          timer.cancel();
          _finishQuiz();
        }
      });
    }
  }

  void _finishQuiz() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: const Text('Quiz Süresi Doldu'),
        content:
            const Text('Quiz süreniz doldu. Cevaplarınız değerlendirilecek.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              ref.read(quizNotifierProvider.notifier).submitQuiz().then((_) {
                final state = ref.read(quizNotifierProvider);
                if (state is QuizFinished) {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(
                      builder: (context) => const QuizResultsScreen(),
                    ),
                  );
                }
              });
            },
            child: const Text('Tamam'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final quizState = ref.watch(quizNotifierProvider);
    if (quizState is! QuizInProgress) {
          return Scaffold(
            body: Center(
              child: CircularProgressIndicator(
                color: colorScheme.primary,
              ),
            ),
          );
    }

    final questions = quizState.questions;
    final userAnswers = quizState.userAnswers;
    final currentPage = quizState.currentPage;
    final timeLimitMinutes = quizState.timeLimitMinutes;

    return Scaffold(
          body: Container(
            color: Theme.of(context).scaffoldBackgroundColor,
            child: SafeArea(
              child: Column(
                children: [
                  // App Bar
                  Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16.0, vertical: 8.0),
                    child: Row(
                      children: [
                        // Geri butonu yerine Quiz başlığı
                        Text(
                          'Quiz',
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Spacer(),
                        // Zamanlayıcı
                        if (timeLimitMinutes != null)
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: colorScheme.surface,
                              borderRadius: BorderRadius.circular(50),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.1),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: CircularCountDownTimer(
                              width: 50,
                              height: 50,
                              duration: timeLimitMinutes * 60,
                              fillColor: colorScheme.primary,
                               ringColor: Colors.grey.shade200,
                               backgroundColor: colorScheme.surface,
                              controller: _timerController,
                              isReverse: true,
                              onComplete: _finishQuiz,
                              textStyle: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: colorScheme.onSurface,
                              ),
                              textFormat: CountdownTextFormat.MM_SS,
                            ),
                          ),
                      ],
                    ),
                  ),

                  // İlerleme Göstergesi
                  Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16.0, vertical: 8.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Soru ${currentPage + 1}/${questions.length}',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: colorScheme.primary,
                              ),
                            ),
                            Text(
                              // Soru sayısı 0 olduğunda NaN oluşmasını engelle
                              questions.isEmpty
                                  ? '0%'
                                  : '${((currentPage + 1) / questions.length * 100).toInt()}%',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: colorScheme.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: LinearProgressIndicator(
                            // Soru sayısı 0 olduğunda NaN oluşmasını engelle
                            value: questions.isEmpty
                                ? 0
                                : (currentPage + 1) / questions.length,
                            backgroundColor: Colors.grey.shade200,
                            color: colorScheme.primary,
                            minHeight: 8,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Sorular
                  Expanded(
                    child: PageView.builder(
                      controller: _pageController,
                      itemCount: questions.length,
                      onPageChanged: (index) {
                        ref.read(quizNotifierProvider.notifier).changePage(index);
                      },
                      itemBuilder: (context, index) {
                        final question = questions[index];
                        final selectedOption = userAnswers[question.id];

                        return SingleChildScrollView(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Soru Kartı
                              Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  color: colorScheme.surface,
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.05),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 12, vertical: 6),
                                          decoration: BoxDecoration(
                                               color: colorScheme.primary
                                                .withOpacity(0.1),
                                            borderRadius:
                                                BorderRadius.circular(20),
                                          ),
                                          child: Text(
                                            'Soru ${index + 1}',
                                            style: theme.textTheme.bodySmall
                                                ?.copyWith(
                                              color: colorScheme.primary,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      question.questionText,
                                      style:
                                          theme.textTheme.titleLarge?.copyWith(
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              )
                                  .animate(controller: _animationController)
                                  .fadeIn(duration: 400.ms, delay: 100.ms)
                                  .slideY(
                                      begin: 0.1,
                                      end: 0,
                                      duration: 400.ms,
                                      curve: Curves.easeOutQuad),

                              const SizedBox(height: 24),

                              // Şıklar
                              ...List.generate(question.options.length,
                                  (optionIndex) {
                                final option = question.options[optionIndex];
                                final isSelected =
                                    selectedOption == optionIndex;
                                final optionLetter = String.fromCharCode(
                                    65 + optionIndex); // A, B, C, D

                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 12.0),
                                  child: InkWell(
                                    onTap: () {
                                      ref.read(quizNotifierProvider.notifier).answerQuestion(
                                        question.id,
                                        optionIndex,
                                      );
                                    },
                                    borderRadius: BorderRadius.circular(12),
                                    child: Container(
                                      padding: const EdgeInsets.all(16.0),
                                      decoration: BoxDecoration(
                                        color: isSelected
                                            ? colorScheme.primary
                                                .withOpacity(0.1)
                                            : colorScheme.surface,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(
                                          color: isSelected
                                              ? colorScheme.primary
                                              : Colors.grey.shade300,
                                          width: isSelected ? 2 : 1,
                                        ),
                                        boxShadow: isSelected
                                            ? [
                                                BoxShadow(
                                                  color: colorScheme.primary
                                                      .withOpacity(0.2),
                                                  blurRadius: 8,
                                                  offset: const Offset(0, 2),
                                                ),
                                              ]
                                            : null,
                                      ),
                                      child: Row(
                                        children: [
                                          Container(
                                            width: 36,
                                            height: 36,
                                            alignment: Alignment.center,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              color: isSelected
                                                  ? colorScheme.primary
                                                  : Colors.grey.shade100,
                                              border: Border.all(
                                                color: isSelected
                                                    ? colorScheme.primary
                                                    : Colors.grey.shade300,
                                                width: 1,
                                              ),
                                            ),
                                            child: Text(
                                              optionLetter,
                                              style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                                color: isSelected
                                                    ? colorScheme.onPrimary
                                                    : Colors.grey.shade700,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 16),
                                          Expanded(
                                            child: Text(
                                              option,
                                              style: theme.textTheme.bodyLarge
                                                  ?.copyWith(
                                                color: isSelected
                                                    ? colorScheme.primary
                                                    : null,
                                                fontWeight: isSelected
                                                    ? FontWeight.w500
                                                    : FontWeight.normal,
                                              ),
                                            ),
                                          ),
                                          if (isSelected)
                                            Icon(
                                              Icons.check_circle,
                                              color: colorScheme.primary,
                                            ),
                                        ],
                                      ),
                                    ),
                                  ),
                                )
                                    .animate(controller: _animationController)
                                    .fadeIn(
                                        duration: 400.ms,
                                        delay: 200.ms + (optionIndex * 100).ms)
                                    .slideY(
                                        begin: 0.1,
                                        end: 0,
                                        duration: 400.ms,
                                        curve: Curves.easeOutQuad);
                              }),
                            ],
                          ),
                        );
                      },
                    ),
                  ),

                  // Navigasyon Butonları
                  Container(
                    padding: const EdgeInsets.all(16.0),
                    decoration: BoxDecoration(
                      color: colorScheme.surface,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(24),
                        topRight: Radius.circular(24),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 10,
                          offset: const Offset(0, -4),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Önceki Soru Butonu
                        ElevatedButton.icon(
                          onPressed: currentPage > 0
                              ? () {
                                  _pageController.previousPage(
                                    duration: const Duration(milliseconds: 300),
                                    curve: Curves.easeInOut,
                                  );
                                }
                              : null,
                          icon: const Icon(Icons.arrow_back_rounded),
                          label: const Text('Önceki'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: colorScheme.surface,
                            foregroundColor: colorScheme.primary,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: BorderSide(
                                color: currentPage > 0
                                    ? colorScheme.primary
                                    : Colors.grey.shade300,
                              ),
                            ),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 12),
                          ),
                        ),

                        // Sonraki/Bitir Butonu
                        ElevatedButton.icon(
                          onPressed: () {
                            if (currentPage < questions.length - 1) {
                              _pageController.nextPage(
                                duration: const Duration(milliseconds: 300),
                                curve: Curves.easeInOut,
                              );
                            } else {
                              // Son sayfadaysa quizi bitir
                              showDialog(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  title: const Text('Quiz\'i Bitir'),
                                  content: Text(
                                    '${questions.length} sorudan ${userAnswers.length} tanesini cevapladınız. Quiz\'i bitirmek istediğinize emin misiniz?',
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed: () {
                                        Navigator.of(ctx).pop();
                                      },
                                      child: const Text('İptal'),
                                    ),
                                    FilledButton(
                                      onPressed: () {
                                        Navigator.of(ctx).pop();
                                        ref.read(quizNotifierProvider.notifier).submitQuiz().then((_) {
                                          final state = ref.read(quizNotifierProvider);
                                          if (state is QuizFinished) {
                                            Navigator.of(context)
                                                .pushReplacement(
                                              MaterialPageRoute(
                                                builder: (context) =>
                                                    const QuizResultsScreen(),
                                              ),
                                            );
                                          }
                                        });
                                      },
                                      style: FilledButton.styleFrom(
                                        backgroundColor: colorScheme.primary,
                                        shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(12),
                                        ),
                                      ),
                                      child: const Text('Bitir'),
                                    ),
                                  ],
                                ),
                              );
                            }
                          },
                          icon: Icon(
                            currentPage < questions.length - 1
                                ? Icons.arrow_forward_rounded
                                : Icons.check_circle_outline_rounded,
                          ),
                          label: Text(
                            currentPage < questions.length - 1
                                ? 'Sonraki'
                                : 'Quiz\'i Bitir',
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: colorScheme.primary,
                            foregroundColor: colorScheme.onPrimary,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
  }
}
