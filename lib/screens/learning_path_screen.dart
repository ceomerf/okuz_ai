import 'package:flutter/material.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:percent_indicator/linear_percent_indicator.dart';
import '../theme/app_theme.dart';
import '../widgets/xp_notification_widget.dart';

class LearningPathScreen extends StatefulWidget {
  final String subject;
  final String topic;
  final int? preferredDuration;
  final Map<String, dynamic>? existingPath;

  const LearningPathScreen({
    Key? key,
    required this.subject,
    required this.topic,
    this.preferredDuration = 60,
    this.existingPath,
  }) : super(key: key);

  @override
  State<LearningPathScreen> createState() => _LearningPathScreenState();
}

class _LearningPathScreenState extends State<LearningPathScreen>
    with TickerProviderStateMixin {
  Map<String, dynamic>? _learningPath;
  bool _isLoading = false;
  String? _pathId;

  late AnimationController _stepAnimationController;
  late AnimationController _progressAnimationController;
  late Animation<double> _stepAnimation;
  late Animation<double> _progressAnimation;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();

    if (widget.existingPath != null) {
      // Safe casting for existing path data
      _learningPath = Map<String, dynamic>.from(widget.existingPath!);
      _pathId = widget.existingPath!['id']?.toString();
      _startAnimations();
    } else {
      _generateLearningPath();
    }
  }

  void _initializeAnimations() {
    _stepAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );

    _progressAnimationController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );

    _stepAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
          parent: _stepAnimationController, curve: Curves.elasticOut),
    );

    _progressAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
          parent: _progressAnimationController, curve: Curves.easeOutCirc),
    );
  }

  Future<void> _startAnimations() async {
    await Future.delayed(const Duration(milliseconds: 300));
    _progressAnimationController.forward();

    await Future.delayed(const Duration(milliseconds: 500));
    _stepAnimationController.forward();
  }

  Future<void> _generateLearningPath() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final callable =
          FirebaseFunctions.instance.httpsCallable('getPersonalizedPath');
      final result = await callable.call({
        'subject': widget.subject,
        'topic': widget.topic,
        'preferredDuration': widget.preferredDuration,
        // İçerik tutarlılığı için ek parametreler
        'enforceGradeConsistency': true,
        'validateResources': true,
      });

      if (result.data['success'] == true) {
        setState(() {
          // Safe casting for Firebase data
          final rawLearningPath = result.data['learningPath'];
          _learningPath = rawLearningPath is Map
              ? Map<String, dynamic>.from(rawLearningPath)
              : null;
          _pathId = result.data['pathId']?.toString();
          _isLoading = false;
        });

        _startAnimations();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content:
                  Text(result.data['message'] ?? 'Öğrenme rotası hazırlandı'),
              backgroundColor: AppTheme.successColor,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Öğrenme rotası oluşturulamadı: $e'),
            backgroundColor: AppTheme.errorColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _completeStep(int stepNumber, Map<String, dynamic> step) async {
    final rating = await _showStepCompletionDialog(step);
    if (rating == null) return;

    try {
      final callable =
          FirebaseFunctions.instance.httpsCallable('completePathStep');
      final result = await callable.call({
        'pathId': _pathId,
        'stepNumber': stepNumber,
        'rating': rating,
      });

      if (result.data['success'] == true) {
        setState(() {
          // Safe updates for learning path data
          if (_learningPath != null) {
            _learningPath!['progress'] = result.data['progress'];
            final currentCompleted = _learningPath!['completedSteps'];
            final completedList = currentCompleted is List
                ? List<dynamic>.from(currentCompleted)
                : <dynamic>[];
            completedList.add(stepNumber);
            _learningPath!['completedSteps'] = completedList;
          }
        });

        // XP bildirimi göster
        if (mounted) {
          XPNotificationWidget.show(
            context,
            result.data['xpRewarded'] ?? 0,
            result.data['message'] ?? 'Adım tamamlandı!',
          );
        }

        // Rota tamamlandı mı?
        if (result.data['pathCompleted'] == true) {
          _showPathCompletionDialog();
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Adım tamamlanamadı: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  Future<int?> _showStepCompletionDialog(Map<String, dynamic> step) async {
    return showDialog<int>(
      context: context,
      builder: (BuildContext context) {
        final theme = Theme.of(context);
        final colorScheme = theme.colorScheme;
        int rating = 5;
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              backgroundColor: theme.cardColor,
              title: Text(
                'Adımı Tamamla',
                style: theme.textTheme.titleLarge?.copyWith(
                  color: colorScheme.onSurface,
                ),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${step['title']} adımını tamamladın mı?',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Bu adımı nasıl değerlendiriyorsun?',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurface.withOpacity(0.7),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      return IconButton(
                        icon: Icon(
                          index < rating ? Icons.star : Icons.star_border,
                          color: AppTheme.warningColor,
                        ),
                        onPressed: () {
                          setState(() {
                            rating = index + 1;
                          });
                        },
                      );
                    }),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(
                    'İptal',
                    style: TextStyle(
                        color: colorScheme.onSurface.withOpacity(0.7)),
                  ),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(rating),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Tamamla'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showPathCompletionDialog() {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: theme.cardColor,
          title: Row(
            children: [
              Icon(Icons.emoji_events, color: AppTheme.successColor),
              const SizedBox(width: 8),
              Text(
                'Tebrikler!',
                style: theme.textTheme.titleLarge?.copyWith(
                  color: colorScheme.onSurface,
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Öğrenme rotasını başarıyla tamamladın! 🎉',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurface,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                _learningPath!['nextTopicSuggestion'] ?? '',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontStyle: FontStyle.italic,
                  color: colorScheme.onSurface.withOpacity(0.7),
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                Navigator.of(context).pop();
              },
              child: Text(
                'Ana Sayfa',
                style: TextStyle(color: colorScheme.onSurface.withOpacity(0.7)),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                // Yeni rota oluştur
                _generateLearningPath();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
              ),
              child: const Text('Yeni Rota'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _launchUrl(String url) async {
    try {
      // URL'yi temizle ve doğrula
      String cleanUrl = url.trim();
      if (cleanUrl.isEmpty || cleanUrl == '#' || cleanUrl == 'null') {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Geçersiz kaynak linki'),
              backgroundColor: AppTheme.warningColor,
            ),
          );
        }
        return;
      }

      // HTTP/HTTPS kontrolü
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://$cleanUrl';
      }

      final Uri uri = Uri.parse(cleanUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Link açılamadı - geçersiz URL'),
              backgroundColor: AppTheme.errorColor,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Link açılamadı: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    _stepAnimationController.dispose();
    _progressAnimationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'AI Pathfinder',
              style: theme.textTheme.titleMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              '${widget.subject} • ${widget.topic}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: Colors.white.withOpacity(0.8),
              ),
            ),
          ],
        ),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (_learningPath != null)
            IconButton(
              icon: const Icon(Icons.refresh, color: Colors.white),
              onPressed: _generateLearningPath,
              tooltip: 'Yeni Rota Oluştur',
            ),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppTheme.primaryColor.withOpacity(0.05),
              theme.scaffoldBackgroundColor,
            ],
          ),
        ),
        child: _isLoading
            ? _buildLoadingView(theme)
            : _learningPath != null
                ? _buildPathView(theme, colorScheme)
                : _buildErrorView(theme),
      ),
    );
  }

  Widget _buildLoadingView(ThemeData theme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text(
            'Kişisel öğrenme rotanız hazırlanıyor...',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Bu birkaç saniye sürebilir',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.6),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorView(ThemeData theme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: AppTheme.errorColor,
          ),
          const SizedBox(height: 16),
          Text(
            'Öğrenme rotası oluşturulamadı',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _generateLearningPath,
            child: const Text('Tekrar Dene'),
          ),
        ],
      ),
    );
  }

  Widget _buildPathView(ThemeData theme, ColorScheme colorScheme) {
    // Safe casting for progress and completed steps
    final rawProgress = _learningPath!['progress'];
    final progress = rawProgress is num ? rawProgress.toDouble() : 0.0;

    final rawCompletedSteps = _learningPath!['completedSteps'];
    final completedSteps = rawCompletedSteps is List
        ? rawCompletedSteps.map((e) => e is int ? e : 0).toList()
        : <int>[];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card
          AnimatedBuilder(
            animation: _progressAnimation,
            builder: (context, child) {
              return Transform.scale(
                scale: 0.8 + (0.2 * _progressAnimation.value),
                child: Opacity(
                  opacity: _progressAnimation.value,
                  child: _buildHeaderCard(progress, theme),
                ),
              );
            },
          ),

          const SizedBox(height: 20),

          // Steps
          AnimatedBuilder(
            animation: _stepAnimation,
            builder: (context, child) {
              return Column(
                children: _buildStepsList(completedSteps, theme, colorScheme),
              );
            },
          ),

          const SizedBox(height: 20),

          // Alternative Resources
          if (_learningPath!['alternativeResources'] != null)
            _buildAlternativeResources(theme, colorScheme),

          const SizedBox(height: 20),

          // Motivational Note
          if (_learningPath!['motivationalNote'] != null)
            _buildMotivationalNote(theme, colorScheme),
        ],
      ),
    );
  }

  Widget _buildHeaderCard(double progress, ThemeData theme) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor,
            AppTheme.accentColor,
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withOpacity(0.3),
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
              const Icon(
                Icons.route,
                color: Colors.white,
                size: 28,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  _learningPath!['pathTitle'] ?? 'Öğrenme Rotası',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          Text(
            _learningPath!['personalizedReason'] ?? '',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              height: 1.4,
            ),
          ),

          const SizedBox(height: 20),

          // Progress
          Row(
            children: [
              const Text(
                'İlerleme',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                ),
              ),
              const Spacer(),
              Text(
                '${progress.toInt()}%',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          LinearPercentIndicator(
            lineHeight: 8.0,
            percent: progress / 100,
            backgroundColor: Colors.white.withOpacity(0.3),
            progressColor: Colors.white,
            barRadius: const Radius.circular(4),
            animation: true,
            animationDuration: 1000,
          ),

          const SizedBox(height: 16),

          // Stats
          Row(
            children: [
              _buildStatChip(
                Icons.schedule,
                '${_learningPath!['totalDuration']} dk',
                Colors.white.withOpacity(0.2),
              ),
              const SizedBox(width: 12),
              _buildStatChip(
                Icons.bar_chart,
                _getDifficultyText(_learningPath!['difficultyLevel']),
                Colors.white.withOpacity(0.2),
              ),
              const SizedBox(width: 12),
              _buildStatChip(
                Icons.emoji_events,
                '${_learningPath!['estimatedXP']} XP',
                Colors.white.withOpacity(0.2),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatChip(IconData icon, String text, Color backgroundColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: Colors.white),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildStepsList(
      List<int> completedSteps, ThemeData theme, ColorScheme colorScheme) {
    // Safe casting for steps list
    final rawSteps = _learningPath!['steps'];
    final steps = rawSteps is List ? rawSteps : <dynamic>[];

    return steps.asMap().entries.map((entry) {
      final index = entry.key;
      // Safe casting for each step
      final rawStep = entry.value;
      final step = rawStep is Map
          ? Map<String, dynamic>.from(rawStep)
          : <String, dynamic>{};

      // Safe casting for step number
      final rawStepNumber = step['stepNumber'];
      final stepNumber = rawStepNumber is int ? rawStepNumber : 0;

      final isCompleted = completedSteps.contains(stepNumber);

      // Safe access for previous step number
      final isAccessible = index == 0 ||
          () {
            if (index > 0 && index - 1 < steps.length) {
              final prevStep = steps[index - 1];
              if (prevStep is Map) {
                final prevStepNumber = prevStep['stepNumber'];
                return prevStepNumber is int &&
                    completedSteps.contains(prevStepNumber);
              }
            }
            return false;
          }();

      return Transform.translate(
        offset: Offset(0, 30 * (1 - _stepAnimation.value)),
        child: Opacity(
          opacity: _stepAnimation.value,
          child: Container(
            margin: const EdgeInsets.only(bottom: 16),
            child: _buildStepCard(
                step, isCompleted, isAccessible, theme, colorScheme),
          ),
        ),
      );
    }).toList();
  }

  Widget _buildStepCard(Map<String, dynamic> step, bool isCompleted,
      bool isAccessible, ThemeData theme, ColorScheme colorScheme) {
    // Safe casting for step number
    final rawStepNumber = step['stepNumber'];
    final stepNumber = rawStepNumber is int ? rawStepNumber : 0;

    return Container(
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCompleted
              ? AppTheme.successColor
              : isAccessible
                  ? AppTheme.primaryColor.withOpacity(0.3)
                  : theme.dividerColor,
          width: isCompleted ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Step Header
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Step Number/Status
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: isCompleted
                        ? AppTheme.successColor
                        : isAccessible
                            ? AppTheme.primaryColor
                            : theme.disabledColor,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: isCompleted
                        ? const Icon(Icons.check, color: Colors.white)
                        : Text(
                            '$stepNumber',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                ),

                const SizedBox(width: 16),

                // Step Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              step['title'] ?? '',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: isAccessible
                                    ? colorScheme.onSurface
                                    : theme.disabledColor,
                              ),
                            ),
                          ),
                          _getTypeIcon(step['type']),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.schedule,
                            size: 16,
                            color: colorScheme.onSurface.withOpacity(0.6),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${step['duration']} dakika',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurface.withOpacity(0.6),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Step Content (Expandable)
          if (isAccessible)
            ExpansionTile(
              title: Text(
                'Detayları Göster',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurface,
                ),
              ),
              iconColor: colorScheme.onSurface,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Description
                      Text(
                        step['description'] ?? '',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurface,
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Resource Info
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.infoColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.source,
                                    color: AppTheme.infoColor, size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    step['resourceName'] ?? '',
                                    style: theme.textTheme.bodyMedium?.copyWith(
                                      fontWeight: FontWeight.w600,
                                      color: colorScheme.onSurface,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (step['specificGuidance'] != null) ...[
                              const SizedBox(height: 8),
                              Text(
                                '💡 ${step['specificGuidance']}',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  fontStyle: FontStyle.italic,
                                  color: colorScheme.onSurface.withOpacity(0.7),
                                ),
                              ),
                            ],
                            if (step['whyThisResource'] != null) ...[
                              const SizedBox(height: 8),
                              Text(
                                '🎯 ${step['whyThisResource']}',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: AppTheme.primaryColor,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Action Buttons
                      Row(
                        children: [
                          if (step['resourceUrl'] != null &&
                              step['resourceUrl'] != '#' &&
                              step['resourceUrl'].toString().isNotEmpty)
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () =>
                                    _launchUrl(step['resourceUrl']),
                                icon: const Icon(Icons.open_in_new),
                                label: const Text('Kaynağa Git'),
                                style: OutlinedButton.styleFrom(
                                  side:
                                      BorderSide(color: AppTheme.primaryColor),
                                  foregroundColor: AppTheme.primaryColor,
                                ),
                              ),
                            ),
                          if (step['resourceUrl'] != null &&
                              step['resourceUrl'] != '#' &&
                              step['resourceUrl'].toString().isNotEmpty)
                            const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: isCompleted
                                  ? null
                                  : () => _completeStep(stepNumber, step),
                              icon:
                                  Icon(isCompleted ? Icons.check : Icons.done),
                              label:
                                  Text(isCompleted ? 'Tamamlandı' : 'Tamamla'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isCompleted
                                    ? AppTheme.successColor
                                    : AppTheme.primaryColor,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),

                      // Expected Outcome
                      if (step['expectedOutcome'] != null) ...[
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.successColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.lightbulb,
                                  color: AppTheme.successColor, size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  step['expectedOutcome'],
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: AppTheme.successColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildAlternativeResources(ThemeData theme, ColorScheme colorScheme) {
    // Safe casting for alternative resources
    final rawAlternatives = _learningPath!['alternativeResources'];
    final alternatives =
        rawAlternatives is List ? rawAlternatives : <dynamic>[];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.warningColor.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.alt_route, color: AppTheme.warningColor),
              const SizedBox(width: 8),
              Text(
                'Alternatif Kaynaklar',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: colorScheme.onSurface,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...alternatives.map((alt) {
            // Safe casting for each alternative
            final altMap = alt is Map
                ? Map<String, dynamic>.from(alt)
                : <String, dynamic>{};
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  altMap['title'] ?? '',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                // Safe casting for resources list
                ...() {
                  final rawResources = altMap['resources'];
                  final resources =
                      rawResources is List ? rawResources : <dynamic>[];
                  return resources.map<Widget>((resource) {
                    return Padding(
                      padding: const EdgeInsets.only(left: 16, bottom: 4),
                      child: Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: AppTheme.warningColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              resource.toString(),
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: colorScheme.onSurface.withOpacity(0.8),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList();
                }(),
              ],
            );
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildMotivationalNote(ThemeData theme, ColorScheme colorScheme) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.successColor.withOpacity(0.1),
            AppTheme.accentColor.withOpacity(0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.successColor.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(Icons.favorite, color: AppTheme.successColor, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _learningPath!['motivationalNote'] ?? '',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppTheme.successColor,
                fontWeight: FontWeight.w500,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _getTypeIcon(String? type) {
    switch (type) {
      case 'video':
        return Icon(Icons.play_circle, color: AppTheme.errorColor);
      case 'article':
        return Icon(Icons.article, color: AppTheme.infoColor);
      case 'practice':
        return Icon(Icons.quiz, color: AppTheme.warningColor);
      case 'interactive':
        return Icon(Icons.touch_app, color: AppTheme.accentColor);
      default:
        return Icon(Icons.bookmark, color: AppTheme.primaryColor);
    }
  }

  String _getDifficultyText(String? difficulty) {
    switch (difficulty) {
      case 'kolay':
        return 'Kolay';
      case 'orta':
        return 'Orta';
      case 'zor':
        return 'Zor';
      default:
        return 'Orta';
    }
  }
}
