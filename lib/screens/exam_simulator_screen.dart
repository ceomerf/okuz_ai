import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../widgets/xp_notification_widget.dart';
import '../services/mock_database_service.dart';

class ExamSimulatorScreen extends StatefulWidget {
  const ExamSimulatorScreen({Key? key}) : super(key: key);

  @override
  State<ExamSimulatorScreen> createState() => _ExamSimulatorScreenState();
}

class _ExamSimulatorScreenState extends State<ExamSimulatorScreen>
    with TickerProviderStateMixin {
  String _selectedExamType = 'TYT';
  int _duration = 180;
  List<String> _selectedSubjects = ['Türkçe', 'Matematik', 'Fen', 'Sosyal'];

  Map<String, dynamic>? _strategy;
  String? _strategyId;
  bool _isLoadingStrategy = false;
  bool _isExamInProgress = false;

  // Exam results form
  final Map<String, TextEditingController> _correctControllers = {};
  final Map<String, TextEditingController> _totalControllers = {};
  final TextEditingController _timeSpentController = TextEditingController();

  late AnimationController _strategyAnimationController;
  late Animation<double> _strategyAnimation;

  final Map<String, List<String>> _examSubjects = {
    'TYT': ['Türkçe', 'Matematik', 'Fen', 'Sosyal'],
    'AYT': [
      'Türk Dili ve Edebiyatı',
      'Tarih',
      'Coğrafya',
      'Matematik',
      'Fizik',
      'Kimya',
      'Biyoloji'
    ],
    'YDT': ['Yabancı Dil'],
  };

  final Map<String, int> _examDurations = {
    'TYT': 165,
    'AYT': 180,
    'YDT': 180,
  };

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _updateSubjectsAndDuration();
  }

  void _initializeAnimations() {
    _strategyAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );

    _strategyAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
          parent: _strategyAnimationController, curve: Curves.easeOutBack),
    );
  }

  void _updateSubjectsAndDuration() {
    setState(() {
      _selectedSubjects = _examSubjects[_selectedExamType] ?? [];
      _duration = _examDurations[_selectedExamType] ?? 180;
    });

    // Initialize controllers for each subject
    _correctControllers.clear();
    _totalControllers.clear();
    for (String subject in _selectedSubjects) {
      _correctControllers[subject] = TextEditingController();
      _totalControllers[subject] = TextEditingController();
    }
  }

  Future<void> _getPreExamStrategy() async {
    setState(() {
      _isLoadingStrategy = true;
    });

    try {
      final mockDbService =
          Provider.of<MockDatabaseService>(context, listen: false);
      final result =
          await mockDbService.callCloudFunction('getPreExamStrategy', {
        'examType': _selectedExamType,
        'duration': _duration,
        'subjects': _selectedSubjects,
      });

      if (result['success'] == true) {
        setState(() {
          _strategy = result['strategy'];
          _strategyId = result['strategyId'];
          _isLoadingStrategy = false;
        });

        _strategyAnimationController.forward();

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message']),
            backgroundColor: AppTheme.successColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isLoadingStrategy = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Strateji hazırlanamadı: $e'),
          backgroundColor: AppTheme.errorColor,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _submitExamResults() async {
    // Validate results
    Map<String, dynamic> results = {};
    int totalQuestions = 0;

    for (String subject in _selectedSubjects) {
      final correct =
          int.tryParse(_correctControllers[subject]?.text ?? '0') ?? 0;
      final total = int.tryParse(_totalControllers[subject]?.text ?? '0') ?? 0;

      if (total <= 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$subject için toplam soru sayısını girin')),
        );
        return;
      }

      if (correct > total) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(
                  '$subject için doğru sayısı toplam sayıdan fazla olamaz')),
        );
        return;
      }

      results[subject] = {'correct': correct, 'total': total};
      totalQuestions += total;
    }

    final timeSpent = int.tryParse(_timeSpentController.text) ?? _duration;

    setState(() {
      _isLoadingStrategy = true;
    });

    try {
      final mockDbService =
          Provider.of<MockDatabaseService>(context, listen: false);
      final result =
          await mockDbService.callCloudFunction('analyzeExamResult', {
        'strategyId': _strategyId,
        'results': results,
        'examType': _selectedExamType,
        'totalQuestions': totalQuestions,
        'duration': _duration,
        'timeSpent': timeSpent,
      });

      if (result['success'] == true) {
        setState(() {
          _isLoadingStrategy = false;
        });

        // Show XP notification
        if (mounted) {
          XPNotificationWidget.show(
            context,
            result['xpRewarded'] ?? 0,
            result['message'] ?? 'Sınav analizi tamamlandı!',
          );
        }

        // Navigate to analysis screen
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ExamAnalysisScreen(
              analysis: result['analysis'],
              overallScore: result['overallScore'],
              examType: _selectedExamType,
              xpRewarded: result['xpRewarded'],
            ),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isLoadingStrategy = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Analiz oluşturulamadı: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  @override
  void dispose() {
    _strategyAnimationController.dispose();
    _correctControllers.values.forEach((controller) => controller.dispose());
    _totalControllers.values.forEach((controller) => controller.dispose());
    _timeSpentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Sınav Simülatörü'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppTheme.primaryColor.withValues(alpha: 0.05),
              theme.scaffoldBackgroundColor,
            ],
          ),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              _buildHeader(theme),

              const SizedBox(height: 20),

              if (_strategy == null) ...[
                // Exam Configuration
                _buildExamConfiguration(theme),

                const SizedBox(height: 20),

                // Get Strategy Button
                _buildGetStrategyButton(theme),
              ] else if (!_isExamInProgress) ...[
                // Pre-Exam Strategy Display
                _buildStrategyDisplay(theme),

                const SizedBox(height: 20),

                // Start Exam Button
                _buildStartExamButton(theme),
              ] else ...[
                // Post-Exam Results Form
                _buildResultsForm(theme),

                const SizedBox(height: 20),

                // Submit Results Button
                _buildSubmitResultsButton(theme),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor.withValues(alpha: 0.1),
            AppTheme.accentColor.withValues(alpha: 0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.sports_esports,
              color: AppTheme.primaryColor,
              size: 40,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'AI Koç ile Sınav Simülatörü',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Sınav öncesi kişisel strateji al, sınav sonrası detaylı analiz ile '
            'performansını artır. Koçun gibi yanında!',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildExamConfiguration(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
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
              Icon(Icons.settings, color: AppTheme.infoColor),
              const SizedBox(width: 8),
              Text(
                'Sınav Ayarları',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Exam Type Selection
          Text(
            'Sınav Türü',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),

          Wrap(
            spacing: 12,
            children: _examSubjects.keys.map((examType) {
              return ChoiceChip(
                label: Text(examType),
                selected: _selectedExamType == examType,
                selectedColor: AppTheme.primaryColor,
                onSelected: (selected) {
                  if (selected) {
                    setState(() {
                      _selectedExamType = examType;
                    });
                    _updateSubjectsAndDuration();
                  }
                },
                labelStyle: TextStyle(
                  color: _selectedExamType == examType
                      ? Colors.white
                      : theme.colorScheme.onSurface,
                  fontWeight: FontWeight.w500,
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 20),

          // Duration and Subjects Info
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.infoColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.schedule, color: AppTheme.infoColor, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Süre: $_duration dakika',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.book, color: AppTheme.infoColor, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Dersler: ${_selectedSubjects.join(', ')}',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGetStrategyButton(ThemeData theme) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoadingStrategy ? null : _getPreExamStrategy,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 4,
        ),
        child: _isLoadingStrategy
            ? const CircularProgressIndicator(color: Colors.white)
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.psychology),
                  const SizedBox(width: 8),
                  Text(
                    'Koçumdan Strateji Al',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildStrategyDisplay(ThemeData theme) {
    return AnimatedBuilder(
      animation: _strategyAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: 0.8 + (0.2 * _strategyAnimation.value),
          child: Opacity(
            opacity: _strategyAnimation.value,
            child: _buildStrategyContent(theme),
          ),
        );
      },
    );
  }

  Widget _buildStrategyContent(ThemeData theme) {
    return Column(
      children: [
        // Pre-Exam Pep Talk
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppTheme.successColor,
                AppTheme.successColor.withValues(alpha: 0.8),
              ],
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppTheme.successColor.withValues(alpha: 0.3),
                blurRadius: 15,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.sports, color: Colors.white, size: 28),
                  const SizedBox(width: 12),
                  Text(
                    'Koçundan Mesaj',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                _strategy!['preExamPep'] ?? '',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: Colors.white,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Strategic Plan
        _buildStrategySection(
          theme,
          'Oyun Planı',
          Icons.psychology,
          AppTheme.primaryColor,
          _strategy!['strategicPlan'],
        ),

        const SizedBox(height: 16),

        // Personalized Tips
        _buildStrategySection(
          theme,
          'Kişisel Taktikler',
          Icons.lightbulb,
          AppTheme.warningColor,
          _strategy!['personalizedTips'],
        ),

        const SizedBox(height: 16),

        // Emergency Tactics
        _buildStrategySection(
          theme,
          'Acil Durum Planı',
          Icons.warning,
          AppTheme.errorColor,
          _strategy!['emergencyTactics'],
        ),

        const SizedBox(height: 16),

        // Final Words
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.accentColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.accentColor.withValues(alpha: 0.3)),
          ),
          child: Column(
            children: [
              Icon(Icons.favorite, color: AppTheme.accentColor, size: 32),
              const SizedBox(height: 8),
              Text(
                _strategy!['finalWords'] ?? '',
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: AppTheme.accentColor,
                  fontWeight: FontWeight.bold,
                  fontStyle: FontStyle.italic,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStrategySection(
    ThemeData theme,
    String title,
    IconData icon,
    Color color,
    Map<String, dynamic> content,
  ) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(width: 8),
              Text(
                title,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...content.entries.map((entry) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _buildStrategyItem(theme, entry.key, entry.value),
            );
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildStrategyItem(ThemeData theme, String key, dynamic value) {
    String displayKey = _getDisplayKey(key);

    if (value is List) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            displayKey,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          ...value
              .map((item) => Padding(
                    padding: const EdgeInsets.only(left: 16, bottom: 4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('• ',
                            style: TextStyle(color: AppTheme.primaryColor)),
                        Expanded(child: Text(item.toString())),
                      ],
                    ),
                  ))
              .toList(),
        ],
      );
    } else if (value is Map) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            displayKey,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          ...value.entries
              .map((subEntry) => Padding(
                    padding: const EdgeInsets.only(left: 16, bottom: 4),
                    child: Text('• ${subEntry.key}: ${subEntry.value}'),
                  ))
              .toList(),
        ],
      );
    } else {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            displayKey,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(value.toString()),
        ],
      );
    }
  }

  String _getDisplayKey(String key) {
    final keyMap = {
      'timeAllocation': 'Zaman Dağılımı',
      'orderOfAttack': 'Saldırı Sırası',
      'riskManagement': 'Risk Yönetimi',
      'confidenceBuilders': 'Özgüven Artırıcılar',
      'basedOnWeaknesses': 'Zayıf Yönlere Göre',
      'basedOnStrengths': 'Güçlü Yönlere Göre',
      'mentalPrep': 'Mental Hazırlık',
      'ifStuck': 'Takılırsan',
      'timeRunningOut': 'Zaman Azalırsa',
      'panic': 'Panik Anında',
    };
    return keyMap[key] ?? key;
  }

  Widget _buildStartExamButton(ThemeData theme) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: () {
          setState(() {
            _isExamInProgress = true;
          });
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.successColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 4,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.play_arrow),
            const SizedBox(width: 8),
            Text(
              'Sınava Başla',
              style: theme.textTheme.titleMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultsForm(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
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
              Icon(Icons.assessment, color: AppTheme.infoColor),
              const SizedBox(width: 8),
              Text(
                'Sınav Sonuçlarını Gir',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Time spent
          TextField(
            controller: _timeSpentController,
            decoration: InputDecoration(
              labelText: 'Harcanan Süre (dakika)',
              hintText: _duration.toString(),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              prefixIcon: Icon(Icons.schedule, color: AppTheme.primaryColor),
            ),
            keyboardType: TextInputType.number,
          ),

          const SizedBox(height: 16),

          // Subject results
          ...(_selectedSubjects.map((subject) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    subject,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _correctControllers[subject],
                          decoration: InputDecoration(
                            labelText: 'Doğru',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Text('/'),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _totalControllers[subject],
                          decoration: InputDecoration(
                            labelText: 'Toplam',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }).toList()),
        ],
      ),
    );
  }

  Widget _buildSubmitResultsButton(ThemeData theme) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoadingStrategy ? null : _submitExamResults,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.accentColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 4,
        ),
        child: _isLoadingStrategy
            ? const CircularProgressIndicator(color: Colors.white)
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.analytics),
                  const SizedBox(width: 8),
                  Text(
                    'Analizi Al',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class ExamAnalysisScreen extends StatelessWidget {
  final Map<String, dynamic> analysis;
  final int overallScore;
  final String examType;
  final int xpRewarded;

  const ExamAnalysisScreen({
    Key? key,
    required this.analysis,
    required this.overallScore,
    required this.examType,
    required this.xpRewarded,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Maç Sonu Analizi'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              _getScoreColor(overallScore).withOpacity(0.1),
              theme.scaffoldBackgroundColor,
            ],
          ),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Score Header
              _buildScoreHeader(theme),

              const SizedBox(height: 20),

              // Opening Statement
              _buildOpeningStatement(theme),

              const SizedBox(height: 16),

              // Performance Story
              _buildPerformanceStory(theme),

              const SizedBox(height: 16),

              // Technical Analysis
              _buildTechnicalAnalysis(theme),

              const SizedBox(height: 16),

              // Trend Analysis
              _buildTrendAnalysis(theme),

              const SizedBox(height: 16),

              // Action Plan
              _buildActionPlan(theme),

              const SizedBox(height: 20),

              // Motivational Close
              _buildMotivationalClose(theme),

              const SizedBox(height: 30),

              // Action Buttons
              _buildActionButtons(context, theme),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildScoreHeader(ThemeData theme) {
    final color = _getScoreColor(overallScore);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color, color.withValues(alpha: 0.8)],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.3),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.sports_score,
                  color: Colors.white,
                  size: 32,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$examType Performansı',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '%$overallScore Genel Başarı',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                children: [
                  Text(
                    '+$xpRewarded',
                    style: theme.textTheme.titleLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'XP',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.white.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOpeningStatement(ThemeData theme) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.3)),
      ),
      child: Text(
        analysis['openingStatement'] ?? '',
        style: theme.textTheme.bodyLarge?.copyWith(
          height: 1.5,
          fontStyle: FontStyle.italic,
        ),
      ),
    );
  }

  Widget _buildPerformanceStory(ThemeData theme) {
    final performanceStory =
        analysis['performanceStory'] as Map<String, dynamic>? ?? {};

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.auto_stories, color: AppTheme.successColor),
              const SizedBox(width: 8),
              Text(
                'Performans Hikayesi',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...performanceStory.entries.map((entry) {
            return _buildAnalysisSection(theme, entry.key, entry.value);
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildTechnicalAnalysis(ThemeData theme) {
    final technicalAnalysis =
        analysis['technicalAnalysis'] as Map<String, dynamic>? ?? {};

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.analytics, color: AppTheme.infoColor),
              const SizedBox(width: 8),
              Text(
                'Teknik Analiz',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...technicalAnalysis.entries.map((entry) {
            return _buildAnalysisSection(theme, entry.key, entry.value);
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildTrendAnalysis(ThemeData theme) {
    final trendAnalysis =
        analysis['trendAnalysis'] as Map<String, dynamic>? ?? {};

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.trending_up, color: AppTheme.warningColor),
              const SizedBox(width: 8),
              Text(
                'Trend Analizi',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...trendAnalysis.entries.map((entry) {
            return _buildAnalysisSection(theme, entry.key, entry.value);
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildActionPlan(ThemeData theme) {
    final actionPlan = analysis['actionPlan'] as Map<String, dynamic>? ?? {};

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.checklist, color: AppTheme.primaryColor),
              const SizedBox(width: 8),
              Text(
                'Aksiyon Planı',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...actionPlan.entries.map((entry) {
            return _buildAnalysisSection(theme, entry.key, entry.value);
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildMotivationalClose(ThemeData theme) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.accentColor.withValues(alpha: 0.1),
            AppTheme.successColor.withValues(alpha: 0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.accentColor.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Icon(Icons.emoji_events, color: AppTheme.accentColor, size: 48),
          const SizedBox(height: 12),
          Text(
            analysis['motivationalClose'] ?? '',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: AppTheme.accentColor,
              fontWeight: FontWeight.w600,
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            analysis['confidenceBuilder'] ?? '',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppTheme.successColor,
              fontStyle: FontStyle.italic,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildAnalysisSection(ThemeData theme, String key, dynamic value) {
    String displayKey = _getAnalysisDisplayKey(key);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            displayKey,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 4),
          if (value is List) ...[
            ...value
                .map((item) => Padding(
                      padding: const EdgeInsets.only(left: 16, bottom: 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('• ',
                              style: TextStyle(color: AppTheme.primaryColor)),
                          Expanded(child: Text(item.toString())),
                        ],
                      ),
                    ))
                .toList(),
          ] else ...[
            Padding(
              padding: const EdgeInsets.only(left: 16),
              child: Text(value.toString()),
            ),
          ],
        ],
      ),
    );
  }

  String _getAnalysisDisplayKey(String key) {
    final keyMap = {
      'highlights': 'Parlak Anlar ⭐',
      'challenges': 'Zorlandığın Anlar 💪',
      'surprises': 'Sürprizler 🎯',
      'timeManagement': 'Zaman Yönetimi ⏱️',
      'accuracyAssessment': 'Doğruluk Analizi 🎯',
      'strategicDecisions': 'Stratejik Kararlar 🧠',
      'mentalState': 'Mental Durum 😊',
      'comparedToPrevious': 'Önceki Sınavlarla Karşılaştırma 📈',
      'strengthsGrowing': 'Güçlenen Alanlar 🚀',
      'weaknessesPatterns': 'Zayıflık Kalıpları ⚠️',
      'immediate': 'Hemen Yapılacaklar (1 Hafta) ⚡',
      'shortTerm': 'Kısa Vadeli (1 Ay) 📅',
      'longTerm': 'Uzun Vadeli 🎯',
      'specificDrills': 'Özel Egzersizler 💪',
    };
    return keyMap[key] ?? key;
  }

  Widget _buildActionButtons(BuildContext context, ThemeData theme) {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(
                  builder: (context) => const ExamSimulatorScreen(),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text(
              'Yeni Sınav Simülasyonu',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: () {
              Navigator.popUntil(context, (route) => route.isFirst);
            },
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: theme.dividerColor),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'Ana Sayfaya Dön',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: theme.colorScheme.onSurface,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Color _getScoreColor(int score) {
    if (score >= 90) return AppTheme.successColor;
    if (score >= 80) return Colors.green;
    if (score >= 70) return AppTheme.warningColor;
    if (score >= 60) return Colors.orange;
    return AppTheme.errorColor;
  }
}
