import 'package:flutter/material.dart';
import 'package:okuz_ai/models/mock_trial_exam.dart';
import 'package:okuz_ai/services/performance_analysis_service.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'dart:math' as math;

class PerformanceDashboardScreen extends StatefulWidget {
  const PerformanceDashboardScreen({Key? key}) : super(key: key);

  @override
  _PerformanceDashboardScreenState createState() => _PerformanceDashboardScreenState();
}

class _PerformanceDashboardScreenState extends State<PerformanceDashboardScreen> {
  final PerformanceAnalysisService _analysisService = PerformanceAnalysisService();
  bool _isLoading = true;
  Map<String, dynamic> _dashboardData = {};
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final data = await _analysisService.getPerformanceDashboardData();
      setState(() {
        _dashboardData = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Performans Gösterge Paneli'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDashboardData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage.isNotEmpty
              ? Center(child: Text('Hata: $_errorMessage'))
              : _buildDashboard(),
    );
  }

  Widget _buildDashboard() {
    final exams = _dashboardData['exams'] as List<MockTrialExam>;
    final weakAreas = _dashboardData['weakAreas'] as List<dynamic>;
    final strongAreas = _dashboardData['strongAreas'] as List<dynamic>;
    final recommendations = _dashboardData['recommendations'] as List<dynamic>;
    final performanceTrend = _dashboardData['performanceTrend'] as Map<String, dynamic>;

    return RefreshIndicator(
      onRefresh: _loadDashboardData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildPerformanceTrendCard(performanceTrend),
            const SizedBox(height: 16),
            _buildScoreChart(exams),
            const SizedBox(height: 16),
            _buildWeakAreasCard(weakAreas),
            const SizedBox(height: 16),
            _buildStrongAreasCard(strongAreas),
            const SizedBox(height: 16),
            _buildRecommendationsCard(recommendations),
            const SizedBox(height: 16),
            _buildRecentExamsCard(exams),
          ],
        ),
      ),
    );
  }

  Widget _buildPerformanceTrendCard(Map<String, dynamic> trend) {
    final trendType = trend['trend'] as String;
    final changePercentage = trend['changePercentage'] as double;
    
    IconData iconData;
    Color iconColor;
    String trendText;
    
    if (trendType == 'increasing') {
      iconData = Icons.trending_up;
      iconColor = Colors.green;
      trendText = 'Yükseliyor';
    } else if (trendType == 'decreasing') {
      iconData = Icons.trending_down;
      iconColor = Colors.red;
      trendText = 'Düşüyor';
    } else {
      iconData = Icons.trending_flat;
      iconColor = Colors.orange;
      trendText = 'Stabil';
    }
    
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Icon(iconData, size: 48, color: iconColor),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Performans Trendi',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Son denemeye göre performansınız $trendText',
                    style: const TextStyle(fontSize: 16),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${changePercentage.toStringAsFixed(1)}% değişim',
                    style: TextStyle(
                      fontSize: 14,
                      color: iconColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScoreChart(List<MockTrialExam> exams) {
    // Sadece son 5 denemeyi göster
    final displayExams = exams.length > 5 ? exams.sublist(0, 5) : exams;
    
    // Tarihleri tersine çevir (en eski solda, en yeni sağda)
    final reversedExams = displayExams.reversed.toList();
    
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Deneme Puanları',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: reversedExams.isEmpty
                  ? const Center(child: Text('Henüz deneme sonucu yok'))
                  : LineChart(
                      LineChartData(
                        gridData: FlGridData(show: true),
                        titlesData: FlTitlesData(
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              getTitlesWidget: (value, meta) {
                                if (value < 0 || value >= reversedExams.length) {
                                  return const SizedBox.shrink();
                                }
                                final exam = reversedExams[value.toInt()];
                                return Padding(
                                  padding: const EdgeInsets.only(top: 8.0),
                                  child: Text(
                                    DateFormat('dd/MM').format(exam.examDate),
                                    style: const TextStyle(fontSize: 10),
                                  ),
                                );
                              },
                              reservedSize: 30,
                            ),
                          ),
                          leftTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              getTitlesWidget: (value, meta) {
                                return Text(
                                  value.toInt().toString(),
                                  style: const TextStyle(fontSize: 10),
                                );
                              },
                              reservedSize: 30,
                            ),
                          ),
                          topTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false),
                          ),
                          rightTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false),
                          ),
                        ),
                        borderData: FlBorderData(show: true),
                        lineBarsData: [
                          LineChartBarData(
                            spots: List.generate(
                              reversedExams.length,
                              (index) => FlSpot(
                                index.toDouble(),
                                reversedExams[index].score,
                              ),
                            ),
                            isCurved: true,
                            color: Theme.of(context).primaryColor,
                            barWidth: 3,
                            isStrokeCapRound: true,
                            dotData: FlDotData(show: true),
                            belowBarData: BarAreaData(
                              show: true,
                              color: Theme.of(context).primaryColor.withOpacity(0.2),
                            ),
                          ),
                        ],
                        minY: _getMinScore(reversedExams) - 5,
                        maxY: _getMaxScore(reversedExams) + 5,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  double _getMinScore(List<MockTrialExam> exams) {
    if (exams.isEmpty) return 0;
    return exams.map((e) => e.score).reduce(math.min);
  }

  double _getMaxScore(List<MockTrialExam> exams) {
    if (exams.isEmpty) return 100;
    return exams.map((e) => e.score).reduce(math.max);
  }

  Widget _buildWeakAreasCard(List<dynamic> weakAreas) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.warning_amber_rounded, color: Colors.orange),
                SizedBox(width: 8),
                Text(
                  'Geliştirilmesi Gereken Alanlar',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            weakAreas.isEmpty
                ? const Text('Yeterli veri yok')
                : Column(
                    children: weakAreas.map((area) {
                      final areaMap = area as Map<String, dynamic>;
                      return ListTile(
                        leading: const Icon(Icons.assignment_late, color: Colors.red),
                        title: Text(areaMap['topic']),
                        subtitle: Text(areaMap['subject']),
                        trailing: Text(
                          '${areaMap['successRate'].toStringAsFixed(1)}%',
                          style: const TextStyle(
                            color: Colors.red,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildStrongAreasCard(List<dynamic> strongAreas) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.star, color: Colors.amber),
                SizedBox(width: 8),
                Text(
                  'Güçlü Alanlar',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            strongAreas.isEmpty
                ? const Text('Yeterli veri yok')
                : Column(
                    children: strongAreas.map((area) {
                      final areaMap = area as Map<String, dynamic>;
                      return ListTile(
                        leading: const Icon(Icons.check_circle, color: Colors.green),
                        title: Text(areaMap['topic']),
                        subtitle: Text(areaMap['subject']),
                        trailing: Text(
                          '${areaMap['successRate'].toStringAsFixed(1)}%',
                          style: const TextStyle(
                            color: Colors.green,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecommendationsCard(List<dynamic> recommendations) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.lightbulb, color: Colors.amber),
                SizedBox(width: 8),
                Text(
                  'Öneriler',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            recommendations.isEmpty
                ? const Text('Yeterli veri yok')
                : Column(
                    children: recommendations.map((recommendation) {
                      final recMap = recommendation as Map<String, dynamic>;
                      return ListTile(
                        leading: const Icon(Icons.tips_and_updates, color: Colors.blue),
                        title: Text(recMap['title']),
                        subtitle: Text(recMap['description']),
                        isThreeLine: true,
                      );
                    }).toList(),
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentExamsCard(List<MockTrialExam> exams) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Son Denemeler',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            exams.isEmpty
                ? const Text('Henüz deneme sonucu yok')
                : Column(
                    children: exams.take(5).map((exam) {
                      return ListTile(
                        title: Text(exam.title),
                        subtitle: Text(
                          '${DateFormat('dd/MM/yyyy').format(exam.examDate)} - ${exam.publisher}',
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              exam.score.toStringAsFixed(2),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            Text(
                              '${exam.correctCount} D / ${exam.incorrectCount} Y / ${exam.emptyCount} B',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                        onTap: () {
                          // Deneme detaylarına git
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => ExamDetailScreen(examId: exam.id),
                            ),
                          );
                        },
                      );
                    }).toList(),
                  ),
          ],
        ),
      ),
    );
  }
}

class ExamDetailScreen extends StatelessWidget {
  final String examId;
  final PerformanceAnalysisService _analysisService = PerformanceAnalysisService();

  ExamDetailScreen({Key? key, required this.examId}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Deneme Detayları'),
      ),
      body: FutureBuilder<MockTrialExam>(
        future: _analysisService.getExamById(examId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          
          if (snapshot.hasError) {
            return Center(child: Text('Hata: ${snapshot.error}'));
          }
          
          if (!snapshot.hasData) {
            return const Center(child: Text('Deneme bulunamadı'));
          }
          
          final exam = snapshot.data!;
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildExamHeader(exam),
                const SizedBox(height: 16),
                _buildExamStats(exam),
                const SizedBox(height: 16),
                _buildSubjectResults(exam),
                const SizedBox(height: 16),
                _buildWrongQuestions(exam),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildExamHeader(MockTrialExam exam) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              exam.title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Tarih: ${DateFormat('dd/MM/yyyy').format(exam.examDate)}',
              style: const TextStyle(fontSize: 16),
            ),
            Text(
              'Yayınevi: ${exam.publisher}',
              style: const TextStyle(fontSize: 16),
            ),
            Text(
              'Sınav Türü: ${exam.examType}',
              style: const TextStyle(fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExamStats(MockTrialExam exam) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Genel Sonuçlar',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem('Puan', exam.score.toStringAsFixed(2), Colors.blue),
                _buildStatItem('Doğru', exam.correctCount.toString(), Colors.green),
                _buildStatItem('Yanlış', exam.incorrectCount.toString(), Colors.red),
                _buildStatItem('Boş', exam.emptyCount.toString(), Colors.grey),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 14),
        ),
      ],
    );
  }

  Widget _buildSubjectResults(MockTrialExam exam) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Ders Sonuçları',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ...exam.subjectResults.entries.map((entry) {
              final subject = entry.key;
              final result = entry.value;
              return ExpansionTile(
                title: Text(subject),
                subtitle: Text(
                  'Net: ${result.netScore.toStringAsFixed(2)} (${result.correctCount} D / ${result.incorrectCount} Y / ${result.emptyCount} B)',
                ),
                children: result.topicResults.entries.map((topicEntry) {
                  final topic = topicEntry.key;
                  final topicResult = topicEntry.value;
                  return ListTile(
                    title: Text(topic),
                    subtitle: Text(
                      'Net: ${topicResult.netScore.toStringAsFixed(2)} (${topicResult.correctCount} D / ${topicResult.incorrectCount} Y / ${topicResult.emptyCount} B)',
                    ),
                    dense: true,
                  );
                }).toList(),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildWrongQuestions(MockTrialExam exam) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Yanlış Yapılan Sorular',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            exam.wrongQuestions.isEmpty
                ? const Text('Yanlış yapılan soru yok')
                : ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: exam.wrongQuestions.length,
                    itemBuilder: (context, index) {
                      final question = exam.wrongQuestions[index];
                      return ExpansionTile(
                        title: Text('Soru ${question.questionNumber}'),
                        subtitle: Text('${question.subject} - ${question.topic}'),
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (question.imageUrl.isNotEmpty)
                                  Image.network(
                                    question.imageUrl,
                                    height: 200,
                                    fit: BoxFit.contain,
                                  ),
                                const SizedBox(height: 8),
                                Text(question.questionText),
                                const SizedBox(height: 8),
                                Text(
                                  'Seçilen Cevap: ${question.selectedOption}',
                                  style: const TextStyle(color: Colors.red),
                                ),
                                Text(
                                  'Doğru Cevap: ${question.correctOption}',
                                  style: const TextStyle(color: Colors.green),
                                ),
                                if (question.explanation.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  const Text(
                                    'Açıklama:',
                                    style: TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  Text(question.explanation),
                                ],
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
          ],
        ),
      ),
    );
  }
} 