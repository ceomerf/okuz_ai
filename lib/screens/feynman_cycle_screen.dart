import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:okuz_ai/services/providers.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../services/api_client.dart';
import '../models/long_term_plan.dart';

class FeynmanCycleScreen extends ConsumerStatefulWidget {
  final DailyTask? task;
  
  const FeynmanCycleScreen({Key? key, this.task}) : super(key: key);

  @override
  _FeynmanCycleScreenState createState() => _FeynmanCycleScreenState();
}

class _FeynmanCycleScreenState extends ConsumerState<FeynmanCycleScreen>
    with TickerProviderStateMixin {
  final PageController _pageController = PageController();
  final TextEditingController _topicController = TextEditingController();
  final TextEditingController _explanationController = TextEditingController();
  final TextEditingController _revisedController = TextEditingController();

  int _currentStep = 0;
  bool _isLoading = false;
  Map<String, dynamic>? _analysisData;
  List<String> _gaps = [];
  List<String> _nextSteps = [];

  late AnimationController _animationController;
  late AnimationController _progressController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;
  late Animation<double> _progressAnimation;

  final List<Map<String, dynamic>> _steps = [
    {
      'title': 'Açıkla',
      'subtitle': 'Konuyu Basitçe Anlat',
      'description':
          'Bir konuyu sanki 10 yaşındaki bir çocuğa anlatıyormuş gibi basitçe açıklayın.',
      'icon': '🧠',
      'color': const Color(0xFF06B6D4),
    },
    {
      'title': 'Analiz',
      'subtitle': 'Eksiklikleri Keşfet',
      'description':
          'AI\'ın metninizi analiz etmesini bekleyin ve eksiklikleri görün.',
      'icon': '🔍',
      'color': const Color(0xFFF59E0B),
    },
    {
      'title': 'Basitleştir',
      'subtitle': 'Metni Düzelt',
      'description':
          'AI\'ın geri bildirimine göre açıklamanızı düzeltin ve basitleştirin.',
      'icon': '✏️',
      'color': const Color(0xFF8B5CF6),
    },
    {
      'title': 'Değerlendirme',
      'subtitle': 'Sonuç ve Sonraki Adımlar',
      'description':
          'Final değerlendirmesi ve önerilen sonraki adımları görün.',
      'icon': '🎯',
      'color': const Color(0xFF10B981),
    },
  ];

  @override
  void initState() {
    super.initState();
    
    // Eğer task parametresi verilmişse, topic controller'a set et
    if (widget.task != null) {
      _topicController.text = widget.task!.topic;
    }
    
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _progressController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
    _slideAnimation = Tween<double>(begin: 30.0, end: 0.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOutCubic),
    );
    _progressAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _progressController, curve: Curves.easeOut),
    );
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _progressController.dispose();
    _pageController.dispose();
    _topicController.dispose();
    _explanationController.dispose();
    _revisedController.dispose();
    super.dispose();
  }

  Future<void> _analyzeExplanation() async {
    if (_topicController.text.trim().isEmpty ||
        _explanationController.text.trim().isEmpty) {
      _showErrorSnackBar('Lütfen konu ve açıklamayı girin');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    HapticFeedback.mediumImpact();

    try {
      final response = await ref.read(apiClientProvider).post('/smart-tools/feynman-cycle', {
        'explanationText': _explanationController.text.trim(),
      });

      setState(() {
        _analysisData = response;
        _gaps = List<String>.from(response['gaps'] ?? []);
        _isLoading = false;
      });

      _nextStep();
      HapticFeedback.heavyImpact();
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      _showErrorSnackBar('Hata: $e');
    }
  }

  Future<void> _getFinalEvaluation() async {
    if (_revisedController.text.trim().isEmpty) {
      _showErrorSnackBar('Lütfen düzeltilmiş açıklamayı girin');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    HapticFeedback.mediumImpact();

    try {
      final response =
          await ref.read(apiClientProvider).post('/smart-tools/socratic-evaluation', {
        'topic': _topicController.text.trim(),
        'original': _explanationController.text.trim(),
        'revised': _revisedController.text.trim(),
      });

      setState(() {
        _nextSteps = List<String>.from(response['nextSteps'] ?? []);
        _isLoading = false;
      });

      _nextStep();
      HapticFeedback.heavyImpact();
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      _showErrorSnackBar('Hata: $e');
    }
  }

  void _nextStep() {
    if (_currentStep < _steps.length - 1) {
      setState(() {
        _currentStep++;
      });
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      _updateProgress();
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      _updateProgress();
    }
  }

  void _updateProgress() {
    _progressController.animateTo((_currentStep + 1) / _steps.length);
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.errorColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor:
          isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            color: isDark ? Colors.white : Colors.black87,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF06B6D4).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text('🔄', style: TextStyle(fontSize: 20)),
            ),
            const SizedBox(width: 12),
            Text(
              'Feynman Döngüsü',
              style: TextStyle(
                color: isDark ? Colors.white : Colors.black87,
                fontWeight: FontWeight.w800,
                fontSize: 20,
              ),
            ),
          ],
        ),
      ),
      body: AnimatedBuilder(
        animation: _animationController,
        builder: (context, child) {
          return FadeTransition(
            opacity: _fadeAnimation,
            child: Transform.translate(
              offset: Offset(0, _slideAnimation.value),
              child: Column(
                children: [
                  _buildProgressHeader(isDark),
                  Expanded(
                    child: PageView.builder(
                      controller: _pageController,
                      onPageChanged: (index) {
                        setState(() {
                          _currentStep = index;
                        });
                        _updateProgress();
                      },
                      itemCount: _steps.length,
                      itemBuilder: (context, index) {
                        return _buildStepContent(index, isDark);
                      },
                    ),
                  ),
                  _buildNavigationButtons(isDark),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildProgressHeader(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.05)
            : Colors.white.withValues(alpha: 0.9),
        border: Border(
          bottom: BorderSide(
            color: const Color(0xFF06B6D4).withValues(alpha: 0.1),
          ),
        ),
      ),
      child: Column(
        children: [
          // Step indicator
          Row(
            children: _steps.asMap().entries.map((entry) {
              final index = entry.key;
              final step = entry.value;
              final isActive = index <= _currentStep;
              final isCurrent = index == _currentStep;

              return Expanded(
                child: Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 4,
                        decoration: BoxDecoration(
                          color: isActive
                              ? step['color'] as Color
                              : (step['color'] as Color).withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    if (index < _steps.length - 1) const SizedBox(width: 8),
                  ],
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 16),

          // Current step info
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: (_steps[_currentStep]['color'] as Color)
                      .withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: (_steps[_currentStep]['color'] as Color)
                        .withValues(alpha: 0.3),
                  ),
                ),
                child: Text(
                  _steps[_currentStep]['icon'],
                  style: const TextStyle(fontSize: 24),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Adım ${_currentStep + 1}: ${_steps[_currentStep]['title']}',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: _steps[_currentStep]['color'] as Color,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _steps[_currentStep]['subtitle'],
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.getSecondaryTextColor(context),
                          ),
                    ),
                  ],
                ),
              ),
              // Progress circle
              SizedBox(
                width: 50,
                height: 50,
                child: AnimatedBuilder(
                  animation: _progressAnimation,
                  builder: (context, child) {
                    return CircularProgressIndicator(
                      value: _progressAnimation.value,
                      backgroundColor:
                          const Color(0xFF06B6D4).withValues(alpha: 0.2),
                      valueColor: AlwaysStoppedAnimation<Color>(
                        _steps[_currentStep]['color'] as Color,
                      ),
                      strokeWidth: 4,
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStepContent(int stepIndex, bool isDark) {
    switch (stepIndex) {
      case 0:
        return _buildExplainStep(isDark);
      case 1:
        return _buildAnalysisStep(isDark);
      case 2:
        return _buildSimplifyStep(isDark);
      case 3:
        return _buildEvaluationStep(isDark);
      default:
        return const SizedBox();
    }
  }

  Widget _buildExplainStep(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF06B6D4).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xFF06B6D4).withValues(alpha: 0.3),
              ),
            ),
            child: Text(
              _steps[0]['description'],
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF06B6D4),
                    height: 1.5,
                  ),
            ),
          ),

          const SizedBox(height: 24),

          // Konu girişi
          Text(
            'Konu',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFFE2E8F0).withValues(alpha: 0.5),
              ),
            ),
            child: TextField(
              controller: _topicController,
              decoration: const InputDecoration(
                hintText: 'Öğrenmek istediğiniz konuyu girin...',
                border: InputBorder.none,
                contentPadding: EdgeInsets.all(16),
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Açıklama girişi
          Text(
            'Açıklamanız',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 8),
          Container(
            height: 200,
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFFE2E8F0).withValues(alpha: 0.5),
              ),
            ),
            child: TextField(
              controller: _explanationController,
              maxLines: null,
              expands: true,
              decoration: const InputDecoration(
                hintText:
                    'Konuyu 10 yaşındaki bir çocuğa anlatır gibi açıklayın...',
                border: InputBorder.none,
                contentPadding: EdgeInsets.all(16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnalysisStep(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_isLoading) ...[
            _buildLoadingState(isDark),
          ] else if (_analysisData != null) ...[
            _buildAnalysisResults(isDark),
          ] else ...[
            _buildAnalysisPrompt(isDark),
          ],
        ],
      ),
    );
  }

  Widget _buildLoadingState(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(40),
      child: Center(
        child: Column(
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 20),
            Text(
              'Açıklamanız analiz ediliyor...',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppTheme.getSecondaryTextColor(context),
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAnalysisPrompt(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFF59E0B).withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        children: [
          Icon(
            Icons.analytics,
            size: 48,
            color: const Color(0xFFF59E0B),
          ),
          const SizedBox(height: 16),
          Text(
            'Analiz Hazır',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFFF59E0B),
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Açıklamanızı AI ile analiz etmek için devam edin',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.getSecondaryTextColor(context),
                ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildAnalysisResults(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Highlighted gaps
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.red.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: Colors.red.withValues(alpha: 0.3),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.warning, color: Colors.red[700], size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Tespit Edilen Eksiklikler',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: Colors.red[700],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ..._gaps.map((gap) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '• ',
                          style: TextStyle(
                            color: Colors.red[700],
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Expanded(
                          child: Text(
                            gap,
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      height: 1.4,
                                    ),
                          ),
                        ),
                      ],
                    ),
                  )),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // Improvement suggestions
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.blue.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: Colors.blue.withValues(alpha: 0.3),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.lightbulb, color: Colors.blue[700], size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'İyileştirme Önerileri',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: Colors.blue[700],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                _analysisData!['improvedExplanation'] ?? '',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      height: 1.5,
                    ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSimplifyStep(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF8B5CF6).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xFF8B5CF6).withValues(alpha: 0.3),
              ),
            ),
            child: Text(
              _steps[2]['description'],
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF8B5CF6),
                    height: 1.5,
                  ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Düzeltilmiş Açıklama',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 8),
          Container(
            height: 250,
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFFE2E8F0).withValues(alpha: 0.5),
              ),
            ),
            child: TextField(
              controller: _revisedController,
              maxLines: null,
              expands: true,
              decoration: const InputDecoration(
                hintText: 'AI önerilerine göre açıklamanızı düzenleyin...',
                border: InputBorder.none,
                contentPadding: EdgeInsets.all(16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEvaluationStep(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_isLoading) ...[
            _buildLoadingState(isDark),
          ] else if (_nextSteps.isNotEmpty) ...[
            _buildFinalResults(isDark),
          ] else ...[
            _buildEvaluationPrompt(isDark),
          ],
        ],
      ),
    );
  }

  Widget _buildEvaluationPrompt(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF10B981).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFF10B981).withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        children: [
          Icon(
            Icons.check_circle,
            size: 48,
            color: const Color(0xFF10B981),
          ),
          const SizedBox(height: 16),
          Text(
            'Final Değerlendirmesi',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF10B981),
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Son değerlendirme ve sonraki adımlar için devam edin',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.getSecondaryTextColor(context),
                ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildFinalResults(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Success message
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF10B981).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: const Color(0xFF10B981).withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            children: [
              Icon(Icons.celebration, color: const Color(0xFF10B981), size: 32),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Tebrikler!',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF10B981),
                          ),
                    ),
                    Text(
                      'Feynman döngüsünü başarıyla tamamladınız',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.getSecondaryTextColor(context),
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Next steps
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: const Color(0xFF10B981).withValues(alpha: 0.2),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.rocket_launch,
                      color: const Color(0xFF10B981), size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Sonraki Adımlar',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF10B981),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ..._nextSteps.map((step) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '• ',
                          style: TextStyle(
                            color: const Color(0xFF10B981),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Expanded(
                          child: Text(
                            step,
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      height: 1.4,
                                    ),
                          ),
                        ),
                      ],
                    ),
                  )),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildNavigationButtons(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.05)
            : Colors.white.withValues(alpha: 0.9),
        border: Border(
          top: BorderSide(
            color: const Color(0xFF06B6D4).withValues(alpha: 0.1),
          ),
        ),
      ),
      child: Row(
        children: [
          if (_currentStep > 0)
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _previousStep,
                icon: const Icon(Icons.arrow_back),
                label: const Text('Geri'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.grey,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            )
          else
            const Spacer(),
          const SizedBox(width: 16),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: _getNextButtonAction(),
              style: ElevatedButton.styleFrom(
                backgroundColor: _steps[_currentStep]['color'] as Color,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Text(_getNextButtonText()),
            ),
          ),
        ],
      ),
    );
  }

  VoidCallback? _getNextButtonAction() {
    if (_isLoading) return null;

    switch (_currentStep) {
      case 0:
        return _analyzeExplanation;
      case 1:
        return _analysisData != null ? _nextStep : null;
      case 2:
        return _getFinalEvaluation;
      case 3:
        return () => Navigator.pop(context);
      default:
        return null;
    }
  }

  String _getNextButtonText() {
    switch (_currentStep) {
      case 0:
        return 'Analiz Et';
      case 1:
        return 'Devam Et';
      case 2:
        return 'Değerlendir';
      case 3:
        return 'Tamamla';
      default:
        return 'Devam';
    }
  }
}
