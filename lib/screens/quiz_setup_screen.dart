import 'package:flutter/material.dart';
// removed provider
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart' as rvd;
import '../providers/quiz_provider.dart';
import '../providers/curriculum_selection_provider.dart';
import '../theme/app_theme.dart';
import 'quiz_in_progress_screen.dart';

class QuizSetupScreen extends rvd.ConsumerStatefulWidget {
  static const routeName = '/quiz-setup';

  const QuizSetupScreen({Key? key}) : super(key: key);

  @override
  rvd.ConsumerState<QuizSetupScreen> createState() => _QuizSetupScreenState();
}

class _QuizSetupScreenState extends rvd.ConsumerState<QuizSetupScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  int _questionCount = 10;
  String _difficulty = 'medium';
  int? _timeLimitMinutes;
  bool _isLoading = false;
  // Animasyonlar için Flutter Animate'in kendi dahili kontrolünü kullanalım

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    super.dispose();
  }

  void _generateQuiz() async {
    final curriculumState = ref.read(curriculumSelectionProvider);

    // Müfredat seçimi zorunlu: sınıf + ders + konu
    if (curriculumState.selectedGrade == null ||
        curriculumState.selectedSubject == null ||
        curriculumState.selectedTopic == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Lütfen müfredat seçiminden sınıf, ders ve konu seçin'),
          backgroundColor: AppTheme.errorColor,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
      });

      try {
        print('🔍 Quiz oluşturma başlatıldı');
        print('   Topic: ${curriculumState.selectedTopic}');
        print('   Question Count: $_questionCount');
        print('   Difficulty: $_difficulty');
        print('   Time Limit: $_timeLimitMinutes');

        await ref.read(quizNotifierProvider.notifier).generateQuiz(
          topic: curriculumState.selectedTopic!,
          questionCount: _questionCount,
          difficulty: _difficulty,
          subject: curriculumState.selectedSubject,
          grade: curriculumState.selectedGrade,
          timeLimitMinutes: _timeLimitMinutes,
        );
        print('   generateQuiz metodu tamamlandı');

        if (!mounted) return;

        // Quiz oluşturulduğunda quiz ekranına yönlendir
        final state = ref.read(quizNotifierProvider);
        print('   Quiz state: ${state.runtimeType}');

        if (state is QuizInProgress) {
          print('   QuizInProgress durumu, ekrana yönlendiriliyor');
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => const QuizInProgressScreen(),
            ),
          );
        } else {
          print('   Hata: Quiz oluşturuldu ama state QuizInProgress değil');
        }
      } catch (e) {
        print('❌ Quiz oluşturma hatası: $e');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hata: ${e.toString()}'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppTheme.errorColor,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      } finally {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final curriculumState = ref.watch(curriculumSelectionProvider);
    final curriculumNotifier = ref.read(curriculumSelectionProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Quiz Oluştur'),
      ),
      body: Container(
        color: Theme.of(context).scaffoldBackgroundColor,
        child: SafeArea(
          child: Column(
            children: [
              // Main Content
              Expanded(
                child: SingleChildScrollView(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Quiz Açıklaması
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardColor,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: AppTheme.primaryColor.withOpacity(0.15),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primaryColor.withOpacity(0.12),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Icon(Icons.quiz_rounded, color: AppTheme.primaryColor),
                                    ),
                                    const SizedBox(width: 12),
                                    Text(
                                      'Quiz Parametreleri',
                                      style: theme.textTheme.titleLarge?.copyWith(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Müfredattan seç, soru sayısını ve zorluğu belirle, hemen başla.',
                                  style: theme.textTheme.bodyMedium,
                                ),
                              ],
                            ),
                          )
                              .animate()
                              .fadeIn(duration: 400.ms, delay: 100.ms)
                              .slideY(
                                  begin: 0.2,
                                  end: 0,
                                  duration: 400.ms,
                                  curve: Curves.easeOutQuad),

                          const SizedBox(height: 32),
                          // Müfredat Seçimi (Sınıf, Ders, Konu)
                          Text(
                            'Müfredat Seçimi',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          )
                              .animate()
                              .fadeIn(duration: 400.ms, delay: 200.ms),
                          const SizedBox(height: 8),

                          // Sınıf Seçimi
                          Container(
                            decoration: BoxDecoration(
                              color: colorScheme.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: colorScheme.outline.withOpacity(0.3),
                              ),
                            ),
                            child: DropdownButtonFormField<String>(
                              value: curriculumState.selectedGrade,
                              decoration: const InputDecoration(
                                labelText: 'Sınıf Seçin',
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                prefixIcon: Icon(Icons.school),
                              ),
                              items: curriculumNotifier.getAvailableGrades().map((grade) {
                                return DropdownMenuItem(
                                  value: grade,
                                  child: Text(grade, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14)),
                                );
                              }).toList(),
                              onChanged: (value) {
                                curriculumNotifier.selectGrade(value);
                              },
                              isExpanded: true,
                            ),
                          )
                              .animate()
                              .fadeIn(duration: 400.ms, delay: 260.ms),

                          const SizedBox(height: 12),

                          // Ders Seçimi
                          if (curriculumState.selectedGrade != null) ...[
                          Container(
                              decoration: BoxDecoration(
                                color: colorScheme.surface,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: colorScheme.outline.withOpacity(0.3),
                                ),
                              ),
                              child: DropdownButtonFormField<String>(
                                value: curriculumState.selectedSubject,
                                decoration: const InputDecoration(
                                  labelText: 'Ders Seçin',
                                  border: InputBorder.none,
                                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  prefixIcon: Icon(Icons.book),
                                ),
                                items: curriculumNotifier.getAvailableSubjects().map((subject) {
                                  return DropdownMenuItem(
                                    value: subject,
                                    child: Text(subject, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14)),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  curriculumNotifier.selectSubject(value);
                                },
                                isExpanded: true,
                              ),
                            )
                                .animate()
                                .fadeIn(duration: 400.ms, delay: 320.ms),
                          ],

                          const SizedBox(height: 12),

                          // Konu Seçimi
                          if (curriculumState.selectedSubject != null) ...[
                          Container(
                              decoration: BoxDecoration(
                                color: colorScheme.surface,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: colorScheme.outline.withOpacity(0.3),
                                ),
                              ),
                              child: DropdownButtonFormField<String>(
                                value: curriculumState.selectedTopic,
                                decoration: const InputDecoration(
                                  labelText: 'Konu Seçin',
                                  border: InputBorder.none,
                                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  prefixIcon: Icon(Icons.topic),
                                ),
                                items: curriculumNotifier.getAvailableTopics().map((topic) {
                                  return DropdownMenuItem(
                                    value: topic,
                                    child: Text(topic, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14)),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  curriculumNotifier.selectTopic(value);
                                },
                                isExpanded: true,
                              ),
                            )
                                .animate()
                                .fadeIn(duration: 400.ms, delay: 380.ms),
                          ],

                          const SizedBox(height: 32),

                          // Soru Sayısı Ayarı
                          Text(
                            'Soru Sayısı',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          )
                              .animate()
                              .fadeIn(duration: 400.ms, delay: 400.ms),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: colorScheme.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: colorScheme.outline.withOpacity(0.3),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '$_questionCount Soru',
                                       style: theme.textTheme.titleMedium?.copyWith(
                                        color: AppTheme.primaryColor,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primaryColor
                                            .withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Text(
                                        'Yaklaşık ${_questionCount * 2} dakika',
                                         style: theme.textTheme.bodySmall?.copyWith(
                                          color: AppTheme.primaryColor,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                SliderTheme(
                                  data: SliderThemeData(
                                    activeTrackColor: AppTheme.primaryColor,
                                    inactiveTrackColor:
                                        AppTheme.primaryColor.withOpacity(0.2),
                                    thumbColor: AppTheme.primaryColor,
                                    overlayColor:
                                        AppTheme.primaryColor.withOpacity(0.2),
                                    thumbShape: const RoundSliderThumbShape(
                                        enabledThumbRadius: 12),
                                    overlayShape: const RoundSliderOverlayShape(
                                        overlayRadius: 24),
                                  ),
                                  child: Slider(
                                    value: _questionCount.toDouble(),
                                    min: 5,
                                    max: 20,
                                    divisions: 15,
                                    label: _questionCount.toString(),
                                    onChanged: (value) {
                                      setState(() {
                                        _questionCount = value.round();
                                      });
                                    },
                                  ),
                                ),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '5',
                                      style: theme.textTheme.bodySmall,
                                    ),
                                    Text(
                                      '20',
                                      style: theme.textTheme.bodySmall,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          )
                              .animate()
                              .fadeIn(duration: 400.ms, delay: 500.ms)
                              .slideY(
                                  begin: 0.2,
                                  end: 0,
                                  duration: 400.ms,
                                  curve: Curves.easeOutQuad),

                          const SizedBox(height: 32),

                          // Zorluk Seviyesi Seçimi
                          Text(
                            'Zorluk Seviyesi',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          )
                              .animate()
                              .fadeIn(duration: 400.ms, delay: 600.ms),
                          const SizedBox(height: 8),
                          Container(
                            decoration: BoxDecoration(
                              color: colorScheme.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: colorScheme.outline.withOpacity(0.3),
                              ),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(4.0),
                              child: SegmentedButton<String>(
                                style: ButtonStyle(
                                  backgroundColor:
                                      MaterialStateProperty.resolveWith<Color>(
                                    (states) {
                                      if (states
                                          .contains(MaterialState.selected)) {
                                        return colorScheme.primary;
                                      }
                                      return Colors.transparent;
                                    },
                                  ),
                                  foregroundColor:
                                      MaterialStateProperty.resolveWith<Color>(
                                    (states) {
                                      if (states
                                          .contains(MaterialState.selected)) {
                                        return colorScheme.onPrimary;
                                      }
                                      return colorScheme.onSurface;
                                    },
                                  ),
                                ),
                                segments: [
                                  ButtonSegment<String>(
                                    value: 'easy',
                                    label: Text('Kolay'),
                                    icon: Icon(
                                        Icons.sentiment_satisfied_outlined),
                                  ),
                                  ButtonSegment<String>(
                                    value: 'medium',
                                    label: Text('Orta'),
                                    icon:
                                        Icon(Icons.sentiment_neutral_outlined),
                                  ),
                                  ButtonSegment<String>(
                                    value: 'hard',
                                    label: Text('Zor'),
                                    icon: Icon(Icons
                                        .sentiment_very_dissatisfied_outlined),
                                  ),
                                ],
                                selected: <String>{_difficulty},
                                onSelectionChanged: (Set<String> newSelection) {
                                  setState(() {
                                    _difficulty = newSelection.first;
                                  });
                                },
                              ),
                            ),
                          )
                              .animate()
                              .fadeIn(duration: 400.ms, delay: 700.ms)
                              .slideY(
                                  begin: 0.2,
                                  end: 0,
                                  duration: 400.ms,
                                  curve: Curves.easeOutQuad),

                          const SizedBox(height: 32),

                          // Süre Sınırı (Opsiyonel)
                          Text(
                            'Süre Sınırı (Opsiyonel)',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          )
                              .animate()
                              .fadeIn(duration: 400.ms, delay: 800.ms),
                          const SizedBox(height: 8),
                          Container(
                            decoration: BoxDecoration(
                              color: colorScheme.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: colorScheme.outline.withOpacity(0.3),
                              ),
                            ),
                            child: DropdownButtonFormField<int?>(
                              decoration: InputDecoration(
                                prefixIcon: Icon(Icons.timer_outlined,
                                    color: AppTheme.primaryColor),
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 12),
                              ),
                              value: _timeLimitMinutes,
                              items: [
                                const DropdownMenuItem<int?>(
                                  value: null,
                                  child: Text('Süre Sınırı Yok'),
                                ),
                                ...List.generate(10, (index) {
                                  final minutes = (index + 1) * 5;
                                  return DropdownMenuItem<int?>(
                                    value: minutes,
                                    child: Text('$minutes dakika'),
                                  );
                                }),
                              ],
                              onChanged: (value) {
                                setState(() {
                                  _timeLimitMinutes = value;
                                });
                              },
                               icon: Icon(Icons.arrow_drop_down,
                                   color: AppTheme.primaryColor),
                              isExpanded: true,
                              borderRadius: BorderRadius.circular(12),
                              dropdownColor: colorScheme.surface,
                            ),
                          )
                              .animate()
                              .fadeIn(duration: 400.ms, delay: 900.ms)
                              .slideY(
                                  begin: 0.2,
                                  end: 0,
                                  duration: 400.ms,
                                  curve: Curves.easeOutQuad),

                          const SizedBox(height: 40),

                          // Quiz Oluştur Butonu
                          SizedBox(
                            width: double.infinity,
                            height: 56,
                            child: ElevatedButton(
                              onPressed: _isLoading ? null : _generateQuiz,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryColor,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                elevation: 2,
                                 shadowColor:
                                     AppTheme.primaryColor.withOpacity(0.3),
                              ),
                              child: _isLoading
                                  ? SizedBox(
                                      width: 24,
                                      height: 24,
                                      child: CircularProgressIndicator(
                                        color: colorScheme.onPrimary,
                                        strokeWidth: 3,
                                      ),
                                    )
                                  : Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.play_arrow_rounded,
                                            size: 28),
                                        const SizedBox(width: 8),
                                        Text(
                                          'Quiz Oluştur',
                                           style: theme.textTheme.titleMedium
                                              ?.copyWith(
                                            fontWeight: FontWeight.bold,
                                             color: Colors.white,
                                          ),
                                        ),
                                      ],
                                    ),
                            ),
                          )
                              .animate()
                              .fadeIn(duration: 400.ms, delay: 1000.ms)
                              .slideY(
                                  begin: 0.2,
                                  end: 0,
                                  duration: 400.ms,
                                  curve: Curves.easeOutQuad),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
