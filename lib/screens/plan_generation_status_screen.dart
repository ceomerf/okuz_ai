import 'package:flutter/material.dart';
import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/plan_service.dart';
import '../models/long_term_plan.dart';
import 'calendar_view_screen.dart';
import '../widgets/main_layout.dart';
import '../theme/app_theme.dart';
import '../providers/plan_provider.dart';

class PlanGenerationStatusScreen extends ConsumerStatefulWidget {
  final String? planName;
  final String? subject;
  final String? grade;
  final String? goal;
  final int? duration;
  final bool useOnboardingData;

  const PlanGenerationStatusScreen({
    Key? key,
    this.planName,
    this.subject,
    this.grade,
    this.goal,
    this.duration,
    this.useOnboardingData = true,
  }) : super(key: key);

  @override
  ConsumerState<PlanGenerationStatusScreen> createState() =>
      _PlanGenerationStatusScreenState();
}

class _PlanGenerationStatusScreenState
    extends ConsumerState<PlanGenerationStatusScreen> {
  bool _isGenerating = true;
  bool _isComplete = false;
  String _statusMessage = 'AI Koçun çalışıyor...';
  Timer? _statusTimer;
  int _statusIndex = 0;
  final List<String> _statusSteps = const [
    'AI Koçun çalışıyor...',
    'Plan analiz ediliyor...',
    'Görevler oluşturuluyor...',
    'Plan tamamlanıyor...'
  ];

  @override
  void initState() {
    super.initState();
    _startStatusTicker();
    _generatePlan();
  }

  void _startStatusTicker() {
    _statusTimer?.cancel();
    _statusTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      if (!mounted) return;
      setState(() {
        _statusMessage = _statusSteps[_statusIndex % _statusSteps.length];
        _statusIndex++;
      });
    });
  }

  Future<void> _generatePlan() async {
    setState(() {
      _isGenerating = true;
      _isComplete = false;
    });

    try {
      final planService = ref.read(planServiceProvider);

      // Basit DTO oluşturma: önceki ekrandan gelen parametrelerle doldur
      final subjects = [if (widget.subject != null) widget.subject! else 'Matematik'];
      final goals = [if (widget.goal != null) widget.goal!];
      final availableTime = widget.duration ?? 120;
      final learningStyle = 'visual';
      final currentLevel = (widget.grade?.isNotEmpty ?? false) ? widget.grade! : 'medium';

      final response = await planService.generatePlan(
        subjects: subjects,
        goals: goals,
        availableTime: availableTime,
        learningStyle: learningStyle,
        currentLevel: currentLevel,
      );

      // Dönen veriyi LongTermPlan'a dönüştürmeyi dene (gerekli değilse atlanabilir)
      LongTermPlan? plan;
      try {
        plan = LongTermPlan.fromMap(response);
      } catch (_) {
        plan = null;
      }

      if (!mounted) return;
      _statusTimer?.cancel();
      setState(() {
        _isGenerating = false;
        _isComplete = true;
        _statusMessage = 'Plan başarıyla oluşturuldu!';
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Planın hazır!')),
      );

      // Calendar ekranına yönlendir (alt navbar ile)
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => const MainLayout(
            currentIndex: 1,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      _statusTimer?.cancel();
      setState(() {
        _isGenerating = false;
        _isComplete = false;
        _statusMessage = 'Plan oluşturulamadı: ${e.toString()}';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: AppTheme.getBackgroundColor(context),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
                child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Animation or Icon
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  // Uygulama turuncu temasına uygun, lacivert tonları yok
                  color: isDark
                      ? AppTheme.primaryColor.withAlpha(38)
                      : AppTheme.primaryColor.withAlpha(26),
                  shape: BoxShape.circle,
                ),
                child: _isGenerating
                    ? CircularProgressIndicator(
                        valueColor: const AlwaysStoppedAnimation<Color>(
                          AppTheme.primaryColor,
                        ),
                        backgroundColor: isDark
                            ? Colors.white10
                            : AppTheme.primaryColor.withAlpha(26),
                        strokeWidth: 4,
                      )
                    : Icon(
                        Icons.check_circle,
                        size: 80,
                        color: AppTheme.primaryColor,
                      ),
              ),
              const SizedBox(height: 32),

              // Title
              Text(
                _isComplete ? 'Plan Hazır!' : 'Plan Oluşturuluyor',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.getPrimaryTextColor(context),
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),

              // Status Message
              Text(
                _statusMessage,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppTheme.getSecondaryTextColor(context),
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),

              // Plan Details (uygulama açık tema renkleriyle)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Theme.of(context).dividerColor,
                  ),
                ),
                child: Column(
                  children: [
                    Text(
                      widget.planName ?? 'Kişiselleştirilmiş Plan',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    if (widget.useOnboardingData) ...[
                      Text('Onboarding verilerinizle oluşturuluyor'),
                      Text('3 günlük kişiselleştirilmiş plan'),
                    ] else ...[
                      Text('${widget.subject ?? ''} - ${widget.grade ?? ''}'),
                      Text('Hedef: ${widget.goal ?? ''}'),
                      Text('Günlük: ${widget.duration ?? 0} dakika'),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 24),

              if (!_isGenerating && !_isComplete)
                ElevatedButton.icon(
                  onPressed: _generatePlan,
                  icon: const Icon(Icons.refresh_rounded, color: Colors.white),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  label: const Text('Tekrar Dene'),
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _statusTimer?.cancel();
    super.dispose();
  }
}
