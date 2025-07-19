import 'package:flutter/material.dart';
import 'package:okuz_ai/models/diagnostic_test.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:okuz_ai/screens/test_result_screen.dart';

class DiagnosticTestScreen extends StatefulWidget {
  final List<DiagnosticTest> tests;

  const DiagnosticTestScreen({
    Key? key,
    required this.tests,
  }) : super(key: key);

  @override
  _DiagnosticTestScreenState createState() => _DiagnosticTestScreenState();
}

class _DiagnosticTestScreenState extends State<DiagnosticTestScreen> {
  int _currentTestIndex = 0;
  int _currentQuestionIndex = 0;
  int? _selectedOptionIndex;
  bool _showExplanation = false;
  bool _isSubmitting = false;

  // Her soru için harcanan süreyi takip etmek için
  DateTime? _questionStartTime;

  // Test sonuçları
  final List<QuestionResult> _results = [];
  int _totalTimeSpent = 0;

  @override
  void initState() {
    super.initState();
    _startQuestionTimer();
  }

  void _startQuestionTimer() {
    _questionStartTime = DateTime.now();
  }

  int _getTimeSpentOnQuestion() {
    if (_questionStartTime == null) return 0;
    return DateTime.now().difference(_questionStartTime!).inSeconds;
  }

  DiagnosticTest get currentTest => widget.tests[_currentTestIndex];
  DiagnosticQuestion get currentQuestion =>
      currentTest.questions[_currentQuestionIndex];
  bool get isLastQuestion =>
      _currentQuestionIndex == currentTest.questions.length - 1;
  bool get isLastTest => _currentTestIndex == widget.tests.length - 1;

  void _selectOption(int index) {
    if (_showExplanation) return; // Açıklama gösteriliyorsa seçim yapılamaz

    setState(() {
      _selectedOptionIndex = index;
    });
  }

  void _checkAnswer() {
    if (_selectedOptionIndex == null) return;

    final timeSpent = _getTimeSpentOnQuestion();
    final isCorrect =
        _selectedOptionIndex == currentQuestion.correctOptionIndex;

    // Sonucu kaydet
    _results.add(QuestionResult(
      questionId: currentQuestion.id,
      subject: currentQuestion.subject,
      topic: currentQuestion.topic,
      isCorrect: isCorrect,
      selectedOptionIndex: _selectedOptionIndex!,
      timeSpent: timeSpent,
    ));

    _totalTimeSpent += timeSpent;

    setState(() {
      _showExplanation = true;
    });
  }

  void _nextQuestion() {
    setState(() {
      if (isLastQuestion) {
        if (isLastTest) {
          _submitResults();
        } else {
          // Sonraki teste geç
          _currentTestIndex++;
          _currentQuestionIndex = 0;
          _selectedOptionIndex = null;
          _showExplanation = false;
          _startQuestionTimer();
        }
      } else {
        // Sonraki soruya geç
        _currentQuestionIndex++;
        _selectedOptionIndex = null;
        _showExplanation = false;
        _startQuestionTimer();
      }
    });
  }

  Future<void> _submitResults() async {
    setState(() {
      _isSubmitting = true;
    });

    try {
      final userId = FirebaseAuth.instance.currentUser?.uid;
      if (userId == null) {
        throw Exception('Kullanıcı oturum açmamış');
      }

      final testResult = TestResult(
        testId: 'diagnostic_test_${DateTime.now().millisecondsSinceEpoch}',
        userId: userId,
        completedAt: DateTime.now(),
        questions: _results,
        totalTimeSpent: _totalTimeSpent,
      );

      // Cloud Functions'a gönder
      final callable =
          FirebaseFunctions.instance.httpsCallable('createAdvancedProfile');
      await callable.call({
        'diagnosticTestResults': {
          'testId': testResult.testId,
          'completedAt': testResult.completedAt.toIso8601String(),
          'questions': _results.map((r) => r.toJson()).toList(),
          'totalTimeSpent': testResult.totalTimeSpent,
        },
      });

      // Sonuç ekranına git
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => TestResultScreen(results: _results),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Sonuçlar kaydedilirken hata oluştu: $e')),
      );
      setState(() {
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text(currentTest.title),
        backgroundColor: AppTheme.backgroundColor,
        elevation: 0,
      ),
      body: _isSubmitting
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // İlerleme göstergesi
                  LinearProgressIndicator(
                    value: (_currentQuestionIndex + 1) /
                        currentTest.questions.length,
                    backgroundColor: Colors.grey[300],
                    valueColor:
                        AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Soru ${_currentQuestionIndex + 1}/${currentTest.questions.length}',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Soru
                  Text(
                    currentQuestion.questionText,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Seçenekler
                  Expanded(
                    child: ListView.builder(
                      itemCount: currentQuestion.options.length,
                      itemBuilder: (context, index) {
                        final option = currentQuestion.options[index];
                        final isSelected = _selectedOptionIndex == index;
                        final isCorrect =
                            index == currentQuestion.correctOptionIndex;

                        // Renk belirleme
                        Color backgroundColor;
                        Color borderColor;

                        if (_showExplanation) {
                          if (isCorrect) {
                            backgroundColor = Colors.green.withAlpha(26);
                            borderColor = Colors.green;
                          } else if (isSelected) {
                            backgroundColor = Colors.red.withAlpha(26);
                            borderColor = Colors.red;
                          } else {
                            backgroundColor = Colors.white;
                            borderColor = Colors.grey;
                          }
                        } else {
                          if (isSelected) {
                            backgroundColor =
                                AppTheme.primaryColor.withAlpha(26);
                            borderColor = AppTheme.primaryColor;
                          } else {
                            backgroundColor = Colors.white;
                            borderColor = Colors.grey;
                          }
                        }

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12.0),
                          child: InkWell(
                            onTap: () => _selectOption(index),
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: backgroundColor,
                                border: Border.all(color: borderColor),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 30,
                                    height: 30,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(color: borderColor),
                                      color: isSelected
                                          ? borderColor
                                          : Colors.transparent,
                                    ),
                                    child: isSelected
                                        ? const Icon(Icons.check,
                                            size: 18, color: Colors.white)
                                        : null,
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Text(
                                      option,
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: isSelected
                                            ? FontWeight.bold
                                            : FontWeight.normal,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  // Açıklama (doğru cevap seçildikten sonra gösterilir)
                  if (_showExplanation)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.blue.withAlpha(26),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.blue),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Açıklama:',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.blue,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(currentQuestion.explanation),
                        ],
                      ),
                    ),

                  const SizedBox(height: 24),

                  // Alt butonlar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      if (!_showExplanation)
                        ElevatedButton(
                          onPressed: _selectedOptionIndex != null
                              ? _checkAnswer
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 24, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                          ),
                          child: const Text('Cevabı Kontrol Et'),
                        )
                      else
                        ElevatedButton(
                          onPressed: _nextQuestion,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 24, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                          ),
                          child: Text(isLastQuestion && isLastTest
                              ? 'Testi Bitir'
                              : 'Sonraki Soru'),
                        ),
                      TextButton(
                        onPressed: () {
                          Navigator.of(context).pop();
                        },
                        child: const Text('İptal'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }
}
