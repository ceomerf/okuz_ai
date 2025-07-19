import 'package:flutter/material.dart';
import 'package:okuz_ai/models/learning_habits.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:okuz_ai/screens/learning_habits_result_screen.dart';
import 'package:okuz_ai/screens/advanced_profile_screen.dart';

class LearningHabitsScreen extends StatefulWidget {
  const LearningHabitsScreen({Key? key}) : super(key: key);

  @override
  _LearningHabitsScreenState createState() => _LearningHabitsScreenState();
}

class _LearningHabitsScreenState extends State<LearningHabitsScreen> {
  final List<LearningHabitsQuestion> _questions =
      LearningHabitsQuestionnaire.getQuestions();
  final Map<String, dynamic> _answers = {};
  int _currentQuestionIndex = 0;
  bool _isSubmitting = false;

  LearningHabitsQuestion get currentQuestion =>
      _questions[_currentQuestionIndex];
  bool get isLastQuestion => _currentQuestionIndex == _questions.length - 1;

  @override
  void initState() {
    super.initState();
    // Varsayılan değerler ata
    for (final question in _questions) {
      if (question.type == 'slider') {
        _answers[question.id] = question.minValue ?? 0;
      } else if (question.type == 'checkbox') {
        _answers[question.id] = <String>[];
      }
    }
  }

  void _nextQuestion() {
    // Geçerli sorunun cevabını kontrol et
    if (!_validateCurrentAnswer()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lütfen bu soruyu cevaplayın')),
      );
      return;
    }

    setState(() {
      if (isLastQuestion) {
        _submitAnswers();
      } else {
        _currentQuestionIndex++;
      }
    });
  }

  void _previousQuestion() {
    setState(() {
      if (_currentQuestionIndex > 0) {
        _currentQuestionIndex--;
      }
    });
  }

  bool _validateCurrentAnswer() {
    final question = currentQuestion;
    final answer = _answers[question.id];

    if (question.type == 'radio' && answer == null) {
      return false;
    } else if (question.type == 'checkbox' &&
        (answer == null || (answer as List).isEmpty)) {
      return false;
    }

    return true;
  }

  Future<void> _submitAnswers() async {
    setState(() {
      _isSubmitting = true;
    });

    try {
      final userId = FirebaseAuth.instance.currentUser?.uid;
      if (userId == null) {
        throw Exception('Kullanıcı oturum açmamış');
      }

      // Cevapları işle
      final processedAnswers =
          LearningHabitsQuestionnaire.processAnswers(_answers);

      // Cloud Functions'a gönder
      final callable =
          FirebaseFunctions.instance.httpsCallable('createAdvancedProfile');
      await callable.call({
        'learningHabits': processedAnswers,
      });

      // Sonuç ekranına git
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => LearningHabitsResultScreen(
              learningHabits: processedAnswers,
            ),
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
        title: const Text('Öğrenme Alışkanlıkları'),
        backgroundColor: AppTheme.backgroundColor,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (context) => const AdvancedProfileScreen(),
                ),
              );
            },
            child: const Text('İptal', style: TextStyle(color: Colors.grey)),
          ),
        ],
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
                    value: (_currentQuestionIndex + 1) / _questions.length,
                    backgroundColor: Colors.grey[300],
                    valueColor:
                        AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Soru ${_currentQuestionIndex + 1}/${_questions.length}',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Soru
                  Text(
                    currentQuestion.question,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Cevap alanı
                  Expanded(
                    child: _buildAnswerWidget(),
                  ),

                  // Alt butonlar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      if (_currentQuestionIndex > 0)
                        ElevatedButton(
                          onPressed: _previousQuestion,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.grey[300],
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 24, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                          ),
                          child: const Text('Önceki'),
                        )
                      else
                        const SizedBox(width: 80),
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
                        child: Text(isLastQuestion ? 'Tamamla' : 'Sonraki'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildAnswerWidget() {
    final question = currentQuestion;

    switch (question.type) {
      case 'slider':
        return _buildSliderAnswer(question);
      case 'radio':
        return _buildRadioAnswer(question);
      case 'checkbox':
        return _buildCheckboxAnswer(question);
      default:
        return const Center(child: Text('Desteklenmeyen soru tipi'));
    }
  }

  Widget _buildSliderAnswer(LearningHabitsQuestion question) {
    final value = (_answers[question.id] ?? question.minValue ?? 0).toDouble();
    final min = (question.minValue ?? 0).toDouble();
    final max = (question.maxValue ?? 100).toDouble();

    return Column(
      children: [
        Slider(
          value: value,
          min: min,
          max: max,
          divisions: (max - min).toInt(),
          label: question.unit != null
              ? '${value.toInt()} ${question.unit}'
              : value.toInt().toString(),
          onChanged: (newValue) {
            setState(() {
              _answers[question.id] = newValue.toInt();
            });
          },
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              question.unit != null
                  ? '${min.toInt()} ${question.unit}'
                  : min.toInt().toString(),
              style: TextStyle(color: Colors.grey[600]),
            ),
            Text(
              question.unit != null
                  ? '${max.toInt()} ${question.unit}'
                  : max.toInt().toString(),
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          'Seçilen: ${value.toInt()}${question.unit != null ? ' ${question.unit}' : ''}',
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildRadioAnswer(LearningHabitsQuestion question) {
    final options = question.options ?? [];
    final selectedValue = _answers[question.id];

    return ListView.builder(
      itemCount: options.length,
      itemBuilder: (context, index) {
        final option = options[index];
        final isSelected = selectedValue == option;

        return Padding(
          padding: const EdgeInsets.only(bottom: 12.0),
          child: InkWell(
            onTap: () {
              setState(() {
                _answers[question.id] = option;
              });
            },
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppTheme.primaryColor.withAlpha(26)
                    : Colors.white,
                border: Border.all(
                  color: isSelected ? AppTheme.primaryColor : Colors.grey,
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isSelected ? AppTheme.primaryColor : Colors.grey,
                      ),
                      color: isSelected
                          ? AppTheme.primaryColor.withAlpha(26)
                          : Colors.white,
                    ),
                    child: isSelected
                        ? const Icon(
                            Icons.check,
                            size: 16,
                            color: Colors.white,
                          )
                        : null,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      option,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight:
                            isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildCheckboxAnswer(LearningHabitsQuestion question) {
    final options = question.options ?? [];
    final selectedValues =
        (_answers[question.id] as List<String>?) ?? <String>[];

    return ListView.builder(
      itemCount: options.length,
      itemBuilder: (context, index) {
        final option = options[index];
        final isSelected = selectedValues.contains(option);

        return Padding(
          padding: const EdgeInsets.only(bottom: 12.0),
          child: InkWell(
            onTap: () {
              setState(() {
                final List<String> updatedList = List.from(selectedValues);
                if (isSelected) {
                  updatedList.remove(option);
                } else {
                  updatedList.add(option);
                }
                _answers[question.id] = updatedList;
              });
            },
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppTheme.primaryColor.withAlpha(26)
                    : Colors.white,
                border: Border.all(
                  color: isSelected ? AppTheme.primaryColor : Colors.grey,
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                        color: isSelected ? AppTheme.primaryColor : Colors.grey,
                      ),
                      color: isSelected
                          ? AppTheme.primaryColor.withAlpha(26)
                          : Colors.white,
                    ),
                    child: isSelected
                        ? const Icon(
                            Icons.check,
                            size: 16,
                            color: Colors.white,
                          )
                        : null,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      option,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight:
                            isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
