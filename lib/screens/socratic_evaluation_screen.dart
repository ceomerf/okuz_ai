import 'package:flutter/material.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import 'package:confetti/confetti.dart';
import '../theme/app_theme.dart';
import 'live_quiz_screen.dart';

class SocraticEvaluationScreen extends StatefulWidget {
  final Map<String, dynamic> evaluation;
  final int xpRewarded;
  final String subject;
  final String topic;

  const SocraticEvaluationScreen({
    Key? key,
    required this.evaluation,
    required this.xpRewarded,
    required this.subject,
    required this.topic,
  }) : super(key: key);

  @override
  State<SocraticEvaluationScreen> createState() =>
      _SocraticEvaluationScreenState();
}

class _SocraticEvaluationScreenState extends State<SocraticEvaluationScreen>
    with TickerProviderStateMixin {
  late AnimationController _scoreAnimationController;
  late AnimationController _cardsAnimationController;
  late ConfettiController _confettiController;

  late Animation<double> _scoreAnimation;
  late Animation<double> _cardsAnimation;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _startAnimations();
  }

  void _initializeAnimations() {
    _scoreAnimationController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );

    _cardsAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _confettiController = ConfettiController(
      duration: const Duration(seconds: 2),
    );

    _scoreAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
          parent: _scoreAnimationController, curve: Curves.easeOutCirc),
    );

    _cardsAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
          parent: _cardsAnimationController, curve: Curves.easeOutBack),
    );
  }

  Future<void> _startAnimations() async {
    await Future.delayed(const Duration(milliseconds: 300));
    _scoreAnimationController.forward();

    await Future.delayed(const Duration(milliseconds: 800));
    _cardsAnimationController.forward();

    // Confetti için skor kontrolü
    final score = widget.evaluation['overallScore'] ?? 0;
    if (score >= 80) {
      await Future.delayed(const Duration(milliseconds: 1200));
      _confettiController.play();
    }
  }

  @override
  void dispose() {
    _scoreAnimationController.dispose();
    _cardsAnimationController.dispose();
    _confettiController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final score = widget.evaluation['overallScore'] ?? 0;
    final level = _getComprehensionLevel();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              _getGradientColor(score).withOpacity(0.1),
              theme.scaffoldBackgroundColor,
            ],
          ),
        ),
        child: Stack(
          children: [
            // Confetti
            Align(
              alignment: Alignment.topCenter,
              child: ConfettiWidget(
                confettiController: _confettiController,
                blastDirectionality: BlastDirectionality.explosive,
                maxBlastForce: 20,
                minBlastForce: 5,
                emissionFrequency: 0.05,
                numberOfParticles: 50,
                colors: [
                  AppTheme.primaryColor,
                  AppTheme.accentColor,
                  AppTheme.successColor,
                  Colors.orange,
                  Colors.purple,
                ],
              ),
            ),

            SafeArea(
              child: Column(
                children: [
                  // Header
                  _buildHeader(theme),

                  // Content
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        children: [
                          const SizedBox(height: 20),

                          // Score Circle
                          AnimatedBuilder(
                            animation: _scoreAnimation,
                            builder: (context, child) {
                              return _buildScoreCircle(
                                  theme, score * _scoreAnimation.value);
                            },
                          ),

                          const SizedBox(height: 30),

                          // Cards
                          AnimatedBuilder(
                            animation: _cardsAnimation,
                            builder: (context, child) {
                              return Column(
                                children: [
                                  _buildFeedbackCard(theme),
                                  const SizedBox(height: 16),
                                  _buildStrengthsCard(theme),
                                  const SizedBox(height: 16),
                                  _buildWeaknessesCard(theme),
                                  const SizedBox(height: 16),
                                  _buildNextStepsCard(theme),
                                  const SizedBox(height: 16),
                                  _buildXpRewardCard(theme),
                                  const SizedBox(height: 30),
                                ],
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Action Buttons
                  _buildActionButtons(theme),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.pop(context),
          ),
          Expanded(
            child: Column(
              children: [
                Text(
                  'Sokrates Değerlendirmesi',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '${widget.subject} • ${widget.topic}',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 48), // Balance the close button
        ],
      ),
    );
  }

  Widget _buildScoreCircle(ThemeData theme, double animatedScore) {
    final score = widget.evaluation['overallScore'] ?? 0;
    final level = _getComprehensionLevel();
    final color = _getGradientColor(score);

    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          CircularPercentIndicator(
            radius: 80.0,
            lineWidth: 12.0,
            percent: animatedScore / 100,
            center: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '${animatedScore.toInt()}',
                  style: theme.textTheme.headlineLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: color,
                    fontSize: 36,
                  ),
                ),
                Text(
                  'PUAN',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            progressColor: color,
            backgroundColor: color.withValues(alpha: 0.2),
            circularStrokeCap: CircularStrokeCap.round,
            animation: false,
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: color.withValues(alpha: 0.3)),
            ),
            child: Text(
              level,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeedbackCard(ThemeData theme) {
    return Transform.translate(
      offset: Offset(0, 50 * (1 - _cardsAnimation.value)),
      child: Opacity(
        opacity: _cardsAnimation.value,
        child: Container(
          width: double.infinity,
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
                  Icon(
                    Icons.psychology,
                    color: AppTheme.primaryColor,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'AI Geri Bildirimi',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                widget.evaluation['feedback'] ?? 'Geri bildirim bulunamadı.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.successColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.favorite,
                      color: AppTheme.successColor,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        widget.evaluation['encouragement'] ??
                            'Harika iş çıkardın!',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppTheme.successColor,
                          fontWeight: FontWeight.w500,
                        ),
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

  Widget _buildStrengthsCard(ThemeData theme) {
    final strongPoints =
        List<String>.from(widget.evaluation['strongPoints'] ?? []);

    return Transform.translate(
      offset: Offset(0, 50 * (1 - _cardsAnimation.value)),
      child: Opacity(
        opacity: _cardsAnimation.value,
        child: Container(
          width: double.infinity,
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
                  Icon(
                    Icons.star,
                    color: AppTheme.successColor,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Güçlü Yönlerin',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...strongPoints
                  .map((point) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              margin: const EdgeInsets.only(top: 6),
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: AppTheme.successColor,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                point,
                                style: theme.textTheme.bodyMedium,
                              ),
                            ),
                          ],
                        ),
                      ))
                  .toList(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWeaknessesCard(ThemeData theme) {
    final weakPoints = List<String>.from(widget.evaluation['weakPoints'] ?? []);
    final conceptualGaps =
        List<String>.from(widget.evaluation['conceptualGaps'] ?? []);
    final allWeaknesses = [...weakPoints, ...conceptualGaps];

    return Transform.translate(
      offset: Offset(0, 50 * (1 - _cardsAnimation.value)),
      child: Opacity(
        opacity: _cardsAnimation.value,
        child: Container(
          width: double.infinity,
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
                  Icon(
                    Icons.lightbulb_outline,
                    color: Colors.orange,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Gelişim Alanları',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (allWeaknesses.isEmpty)
                Text(
                  'Herhangi bir zayıf nokta tespit edilmedi! 🎉',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppTheme.successColor,
                    fontStyle: FontStyle.italic,
                  ),
                )
              else
                ...allWeaknesses
                    .map((point) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                margin: const EdgeInsets.only(top: 6),
                                width: 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  color: Colors.orange,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  point,
                                  style: theme.textTheme.bodyMedium,
                                ),
                              ),
                            ],
                          ),
                        ))
                    .toList(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNextStepsCard(ThemeData theme) {
    final nextSteps = List<String>.from(widget.evaluation['nextSteps'] ?? []);

    return Transform.translate(
      offset: Offset(0, 50 * (1 - _cardsAnimation.value)),
      child: Opacity(
        opacity: _cardsAnimation.value,
        child: Container(
          width: double.infinity,
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
                  Icon(
                    Icons.trending_up,
                    color: AppTheme.primaryColor,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Önerilen Adımlar',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...nextSteps
                  .asMap()
                  .entries
                  .map((entry) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                color: AppTheme.primaryColor,
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text(
                                  '${entry.key + 1}',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                entry.value,
                                style: theme.textTheme.bodyMedium,
                              ),
                            ),
                          ],
                        ),
                      ))
                  .toList(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildXpRewardCard(ThemeData theme) {
    return Transform.translate(
      offset: Offset(0, 50 * (1 - _cardsAnimation.value)),
      child: Opacity(
        opacity: _cardsAnimation.value,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppTheme.accentColor,
                AppTheme.accentColor.withValues(alpha: 0.8),
              ],
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppTheme.accentColor.withValues(alpha: 0.3),
                blurRadius: 15,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.emoji_events,
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
                      'Tebrikler!',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '+${widget.xpRewarded} XP kazandın!',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
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

  Widget _buildActionButtons(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(
                    builder: (context) => LiveQuizScreen(
                      subject: widget.subject,
                      topic: widget.topic,
                    ),
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
                'Tekrar Dene',
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
                Navigator.pop(context);
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
      ),
    );
  }

  String _getComprehensionLevel() {
    final level = widget.evaluation['comprehensionLevel'] ?? 'intermediate';
    switch (level) {
      case 'beginner':
        return 'Başlangıç Seviyesi';
      case 'intermediate':
        return 'Orta Seviye';
      case 'advanced':
        return 'İleri Seviye';
      default:
        return 'Orta Seviye';
    }
  }

  Color _getGradientColor(int score) {
    if (score >= 90) return AppTheme.successColor;
    if (score >= 80) return Colors.green;
    if (score >= 70) return Colors.orange;
    if (score >= 60) return Colors.deepOrange;
    return AppTheme.errorColor;
  }
}
