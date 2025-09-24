import 'package:flutter/material.dart';
import 'package:okuz_ai/models/diagnostic_test.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:okuz_ai/screens/advanced_profile_screen.dart';

class TestResultScreen extends StatelessWidget {
  final List<QuestionResult> results;

  const TestResultScreen({
    Key? key,
    required this.results,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Sonuçları hesapla
    final int totalQuestions = results.length;
    final int correctAnswers = results.where((r) => r.isCorrect).length;
    final double correctPercentage = (correctAnswers / totalQuestions) * 100;
    final int totalTimeSpent = results.fold(0, (sum, r) => sum + r.timeSpent);
    final double avgTimePerQuestion = totalTimeSpent / totalQuestions;

    // Derslere göre performans
    final Map<String, Map<String, dynamic>> subjectPerformance = {};

    for (final result in results) {
      if (!subjectPerformance.containsKey(result.subject)) {
        subjectPerformance[result.subject] = {
          'total': 0,
          'correct': 0,
          'timeSpent': 0,
        };
      }

      subjectPerformance[result.subject]!['total'] =
          subjectPerformance[result.subject]!['total'] + 1;
      if (result.isCorrect) {
        subjectPerformance[result.subject]!['correct'] =
            subjectPerformance[result.subject]!['correct'] + 1;
      }
      subjectPerformance[result.subject]!['timeSpent'] =
          subjectPerformance[result.subject]!['timeSpent'] + result.timeSpent;
    }

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Test Sonuçları'),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Genel sonuç kartı
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Genel Sonuç',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildResultStat(
                          '$correctAnswers/$totalQuestions',
                          'Doğru Cevap',
                          Colors.green,
                        ),
                        _buildResultStat(
                          '%${correctPercentage.toStringAsFixed(0)}',
                          'Başarı Oranı',
                          AppTheme.primaryColor,
                        ),
                        _buildResultStat(
                          '${avgTimePerQuestion.toStringAsFixed(0)} sn',
                          'Ortalama Süre',
                          Colors.orange,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Derslere göre performans
            const Text(
              'Derslere Göre Performans',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),

            ...subjectPerformance.entries.map((entry) {
              final subject = entry.key;
              final data = entry.value;
              final int total = data['total'];
              final int correct = data['correct'];
              final int timeSpent = data['timeSpent'];
              final double correctRate = correct / total;
              final double avgTime = timeSpent / total;

              return Padding(
                padding: const EdgeInsets.only(bottom: 12.0),
                child: Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          subject,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Doğru: $correct/$total',
                                    style: TextStyle(
                                      color: Colors.grey[700],
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Ortalama Süre: ${avgTime.toStringAsFixed(0)} sn',
                                    style: TextStyle(
                                      color: Colors.grey[700],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: _getPerformanceColor(correctRate),
                              ),
                              child: Center(
                                child: Text(
                                  '%${(correctRate * 100).toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),

            const SizedBox(height: 32),

            // Tavsiyeler
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Tavsiyeler',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _generateRecommendation(subjectPerformance),
                      style: const TextStyle(
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 32),

            // Devam Et Butonu
            Center(
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(
                      builder: (context) => const AdvancedProfileScreen(),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
                child: const Text(
                  'Devam Et',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultStat(String value, String label, Color color) {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color.withAlpha(26),
          ),
          child: Center(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            color: Colors.grey[700],
          ),
        ),
      ],
    );
  }

  Color _getPerformanceColor(double rate) {
    if (rate >= 0.7) return Colors.green;
    if (rate >= 0.5) return Colors.orange;
    return Colors.red;
  }

  String _generateRecommendation(
      Map<String, Map<String, dynamic>> subjectPerformance) {
    // En düşük performanslı dersi bul
    String? weakestSubject;
    double lowestRate = 1.0;

    for (final entry in subjectPerformance.entries) {
      final subject = entry.key;
      final data = entry.value;
      final double correctRate = data['correct'] / data['total'];

      if (correctRate < lowestRate) {
        lowestRate = correctRate;
        weakestSubject = subject;
      }
    }

    // En yavaş cevaplanan dersi bul
    String? slowestSubject;
    double highestAvgTime = 0;

    for (final entry in subjectPerformance.entries) {
      final subject = entry.key;
      final data = entry.value;
      final double avgTime = data['timeSpent'] / data['total'];

      if (avgTime > highestAvgTime) {
        highestAvgTime = avgTime;
        slowestSubject = subject;
      }
    }

    // Tavsiye oluştur
    String recommendation = '';

    if (weakestSubject != null && lowestRate < 0.5) {
      recommendation +=
          '• $weakestSubject dersinde temel kavramları gözden geçirmeniz faydalı olacaktır.\n\n';
    }

    if (slowestSubject != null && highestAvgTime > 45) {
      recommendation +=
          '• $slowestSubject dersinde soru çözme hızınızı artırmak için daha fazla pratik yapmanızı öneririz.\n\n';
    }

    if (recommendation.isEmpty) {
      recommendation =
          'Tebrikler! Genel performansınız oldukça iyi. Düzenli çalışmaya devam ederek başarınızı koruyabilirsiniz.';
    } else {
      recommendation +=
          'Bu alanlara odaklanarak kişiselleştirilmiş çalışma planınızda daha hızlı ilerleme kaydedebilirsiniz.';
    }

    return recommendation;
  }
}
