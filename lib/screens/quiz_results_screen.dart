import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../providers/quiz_provider.dart';
import '../models/quiz_models.dart';
import 'quiz_history_screen.dart';
import '../theme/app_theme.dart';

class QuizResultsScreen extends ConsumerWidget {
  static const routeName = '/quiz-results';

  const QuizResultsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quizState = ref.watch(quizNotifierProvider);

        if (quizState is! QuizFinished) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        final results = quizState.results;
        final int totalQuestions = results.length;
        final int correctCount = results.where((r) => r.wasCorrect).length;
        final int unansweredCount = results.where((r) => r.yourAnswerIndex < 0).length;
        final int wrongCount = totalQuestions - correctCount;
        final double correctPercentage = totalQuestions == 0 ? 0 : (correctCount / totalQuestions) * 100;

        final colorScheme = Theme.of(context).colorScheme;
        final primary = colorScheme.primary;
        final error = colorScheme.error;

        final wrong = wrongCount;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Quiz Sonuçları'),
            automaticallyImplyLeading: false,
            actions: [
              IconButton(
                icon: const Icon(Icons.history),
                tooltip: 'Quiz Geçmişi',
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const QuizHistoryScreen(),
                    ),
                  );
                },
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Başlık + Skor Özeti (Sade Header)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: primary.withValues(alpha: 0.15)),
                  ),
                  child: Row(
                    children: [
                      // Donut chart compact
                      SizedBox(
                        width: 110,
                        height: 110,
                        child: PieChart(
                          PieChartData(
                            sectionsSpace: 0,
                            centerSpaceRadius: 36,
                            startDegreeOffset: -90,
                            sections: [
                              PieChartSectionData(
                                value: correctCount.toDouble(),
                                color: primary,
                                title: '',
                                radius: 38,
                              ),
                              PieChartSectionData(
                                value: wrong.toDouble(),
                                color: primary.withValues(alpha: 0.18),
                                title: '',
                                radius: 38,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${correctPercentage.toStringAsFixed(1)}% Başarı',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '$correctCount / $totalQuestions doğru',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                _statChip(context, label: 'Doğru', value: '$correctCount', color: primary),
                                _statChip(context, label: 'Yanlış', value: '$wrong', color: primary.withValues(alpha: 0.6)),
                                if (unansweredCount > 0)
                                  _statChip(context, label: 'Boş', value: '$unansweredCount', color: primary.withValues(alpha: 0.35)),
                                _statChip(context, label: 'Toplam', value: '$totalQuestions', color: primary.withValues(alpha: 0.25)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Cevapların detay listesi
                Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: primary.withValues(alpha: 0.12)),
                  ),
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: primary.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(Icons.fact_check_rounded, color: primary),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Cevaplarınızın Değerlendirmesi',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ...results.map((r) => _buildResultItem(context, r)).toList(),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Aksiyonlar
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const QuizHistoryScreen(),
                            ),
                          );
                        },
                        icon: const Icon(Icons.history),
                        label: const Text('Quiz Geçmişi'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.of(context).popUntil((route) => route.isFirst);
                        },
                        icon: const Icon(Icons.home_rounded),
                        label: const Text('Ana Menü'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
  }

  // Her bir soru için sonuç widget'ı (modern)
  Widget _buildResultItem(BuildContext context, QuizResult result) {
    final isCorrect = result.wasCorrect;
    final primary = Theme.of(context).colorScheme.primary;
    final error = Theme.of(context).colorScheme.error;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: (isCorrect ? primary : error).withValues(alpha: 0.3),
        ),
      ),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        childrenPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: (isCorrect ? primary : error).withValues(alpha: 0.15),
          foregroundColor: isCorrect ? primary : error,
          child: Icon(isCorrect ? Icons.check_rounded : Icons.close_rounded),
        ),
        title: Text(
          result.questionText,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: isCorrect
            ? Text('Doğru cevap', style: Theme.of(context).textTheme.bodySmall)
            : Text('Yanlış cevap', style: Theme.of(context).textTheme.bodySmall),
        children: [
          // Seçenekler (chip benzeri satırlar)
          ...List.generate(result.options.length, (index) {
            final isYourAnswer = index == result.yourAnswerIndex;
            final isCorrectAnswer = index == result.correctAnswerIndex;

            final bg = isCorrectAnswer
                ? primary.withValues(alpha: 0.12)
                : isYourAnswer
                    ? error.withValues(alpha: 0.12)
                    : Theme.of(context).cardColor;
            final border = isCorrectAnswer
                ? primary
                : isYourAnswer
                    ? error
                    : Theme.of(context).dividerColor;

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: bg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: border.withValues(alpha: 0.8)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: border,
                    ),
                    child: Text(
                      String.fromCharCode(65 + index),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      result.options[index],
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                  if (isYourAnswer && !isCorrectAnswer)
                    Icon(Icons.close_rounded, color: error),
                  if (isCorrectAnswer) Icon(Icons.check_rounded, color: primary),
                ],
              ),
            );
          }),

          // Açıklama
          if (result.explanation.trim().isNotEmpty) ...[
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerLeft,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  result.explanation,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }

  Widget _statChip(BuildContext context, {required String label, required String value, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(width: 6),
          Text(value, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
