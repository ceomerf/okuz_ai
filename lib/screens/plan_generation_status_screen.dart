import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/family_account_service.dart';
import '../models/account_type.dart';
import '../theme/app_theme.dart';

class PlanGenerationStatusScreen extends StatefulWidget {
  final String planName;
  final String subject;
  final String grade;
  final String goal;
  final int duration;

  const PlanGenerationStatusScreen({
    Key? key,
    required this.planName,
    required this.subject,
    required this.grade,
    required this.goal,
    required this.duration,
  }) : super(key: key);

  @override
  State<PlanGenerationStatusScreen> createState() =>
      _PlanGenerationStatusScreenState();
}

class _PlanGenerationStatusScreenState
    extends State<PlanGenerationStatusScreen> {
  bool _isGenerating = true;
  bool _isComplete = false;
  String _statusMessage = 'AI Koçun çalışıyor...';

  @override
  void initState() {
    super.initState();
    _generatePlan();
  }

  Future<void> _generatePlan() async {
    // Simulate plan generation
    await Future.delayed(Duration(seconds: 2));
    setState(() {
      _statusMessage = 'Plan analiz ediliyor...';
    });

    await Future.delayed(Duration(seconds: 2));
    setState(() {
      _statusMessage = 'Görevler oluşturuluyor...';
    });

    await Future.delayed(Duration(seconds: 2));
    setState(() {
      _statusMessage = 'Plan tamamlanıyor...';
    });

    await Future.delayed(Duration(seconds: 1));
    setState(() {
      _isGenerating = false;
      _isComplete = true;
      _statusMessage = 'Plan başarıyla oluşturuldu!';
    });

    // Navigate after completion
    await Future.delayed(Duration(seconds: 2));
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
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
                  color: AppTheme.primaryColor.withAlpha(26),
                  shape: BoxShape.circle,
                ),
                child: _isGenerating
                    ? CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(
                            AppTheme.primaryColor),
                        strokeWidth: 3,
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

              // Plan Details
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.getCardColor(context),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppTheme.primaryColor.withAlpha(26),
                  ),
                ),
                child: Column(
                  children: [
                    Text(
                      widget.planName,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text('${widget.subject} - ${widget.grade}'),
                    Text('Hedef: ${widget.goal}'),
                    Text('Günlük: ${widget.duration} dakika'),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
