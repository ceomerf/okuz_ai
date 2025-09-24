import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../services/api_client.dart';
import 'package:okuz_ai/services/providers.dart';

class LiveQuizScreen extends ConsumerStatefulWidget {
  final String? subject;
  final String? topic;
  
  const LiveQuizScreen({Key? key, this.subject, this.topic}) : super(key: key);

  @override
  ConsumerState<LiveQuizScreen> createState() => _LiveQuizScreenState();
}

class _LiveQuizScreenState extends ConsumerState<LiveQuizScreen>
    with TickerProviderStateMixin {
  final TextEditingController _topicController = TextEditingController();
  
  bool _isLoading = false;
  List<Map<String, dynamic>> _questions = [];
  int _currentQuestionIndex = 0;
  List<String> _selectedAnswers = [];
  Map<String, dynamic>? _quizResults;
  bool _showSetup = true;
  String _selectedDifficulty = 'Orta';
  int _questionCount = 10;
  int _timeLimit = 30; // seconds per question
  int _remainingTime = 30;
  late Timer? _timer;

  late AnimationController _animationController;
  late AnimationController _resultController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;
  late Animation<double> _resultAnimation;

  @override
  void initState() {
    super.initState();
    
    // Eğer topic parametresi verilmişse, controller'a set et
    if (widget.topic != null) {
      _topicController.text = widget.topic!;
    }
    
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _resultController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
    _slideAnimation = Tween<double>(begin: 30.0, end: 0.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOutCubic),
    );
    _resultAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _resultController, curve: Curves.elasticOut),
    );
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _resultController.dispose();
    _topicController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _startQuiz() async {
    if (_topicController.text.trim().isEmpty) {
      _showErrorSnackBar('Lütfen quiz konusunu girin');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    HapticFeedback.mediumImpact();

    try {
              final response = await ref.read(apiClientProvider).post('/smart-tools/live-quiz', {
        'topic': _topicController.text.trim(),
        'difficulty': _selectedDifficulty,
        'questionCount': _questionCount,
        'timeLimit': _timeLimit,
      });

      if (response['success'] == true) {
        setState(() {
          _questions = List<Map<String, dynamic>>.from(response['questions'] ?? []);
          _selectedAnswers = List.filled(_questions.length, '');
          _currentQuestionIndex = 0;
          _showSetup = false;
          _isLoading = false;
          _remainingTime = _timeLimit;
        });
        _startTimer();
        HapticFeedback.heavyImpact();
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      _showErrorSnackBar('Hata: $e');
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _remainingTime--;
      });
      
      if (_remainingTime <= 0) {
        _nextQuestion();
      }
    });
  }

  void _selectAnswer(String answer) {
    setState(() {
      _selectedAnswers[_currentQuestionIndex] = answer;
    });
    HapticFeedback.lightImpact();
    
    // Auto advance after short delay
    Future.delayed(const Duration(milliseconds: 500), () {
      _nextQuestion();
    });
  }

  void _nextQuestion() {
    _timer?.cancel();
    
    if (_currentQuestionIndex < _questions.length - 1) {
      setState(() {
        _currentQuestionIndex++;
        _remainingTime = _timeLimit;
      });
      _startTimer();
    } else {
      _finishQuiz();
    }
  }

  Future<void> _finishQuiz() async {
    _timer?.cancel();
    
    setState(() {
      _isLoading = true;
    });

    try {
      // Backend'de bu endpoint mevcut değil, geçici olarak başarılı döndür
      final response = {'success': true};

      setState(() {
        _quizResults = response;
        _isLoading = false;
      });

      _resultController.forward();
      HapticFeedback.heavyImpact();
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      _showErrorSnackBar('Hata: $e');
    }
  }

  void _restart() {
    setState(() {
      _questions.clear();
      _selectedAnswers.clear();
      _currentQuestionIndex = 0;
      _quizResults = null;
      _showSetup = true;
      _topicController.clear();
      _remainingTime = _timeLimit;
    });
    _resultController.reset();
    _timer?.cancel();
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
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Canlı Quiz'),
      ),
      body: AnimatedBuilder(
        animation: _animationController,
        builder: (context, child) {
          return FadeTransition(
            opacity: _fadeAnimation,
            child: Transform.translate(
              offset: Offset(0, _slideAnimation.value),
              child: _buildContent(isDark),
            ),
          );
        },
      ),
    );
  }

  Widget _buildContent(bool isDark) {
    if (_quizResults != null) {
      return _buildResults(isDark);
    } else if (_showSetup) {
      return _buildSetup(isDark);
    } else {
      return _buildQuiz(isDark);
    }
  }

  Widget _buildSetup(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFFEF4444).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xFFEF4444).withValues(alpha: 0.3),
              ),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.quiz,
                  size: 48,
                   color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 16),
                Text(
                  'Canlı Quiz Kurulumu',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Bilginizi test edin! Hızlı sorular, anında geri bildirim.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.getSecondaryTextColor(context),
                    height: 1.5,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          
          Text(
            'Quiz Konusu',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: isDark 
                  ? Colors.white.withValues(alpha: 0.05)
                  : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xFFE2E8F0).withValues(alpha: 0.5),
              ),
            ),
            child: TextField(
              controller: _topicController,
              decoration: const InputDecoration(
                hintText: 'Örn: Türk Tarihi, Matematik, Biyoloji...',
                border: InputBorder.none,
                contentPadding: EdgeInsets.all(16),
                prefixIcon: Icon(Icons.topic),
              ),
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Zorluk seviyesi
          Text(
            'Zorluk Seviyesi',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          _buildDifficultySelector(isDark),
          
          const SizedBox(height: 24),
          
          // Soru sayısı
          Text(
            'Soru Sayısı: $_questionCount',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: Theme.of(context).colorScheme.primary,
              inactiveTrackColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3),
              thumbColor: Theme.of(context).colorScheme.primary,
              overlayColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
            ),
            child: Slider(
              value: _questionCount.toDouble(),
              min: 5,
              max: 20,
              divisions: 15,
              onChanged: (value) {
                setState(() {
                  _questionCount = value.toInt();
                });
              },
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Süre sınırı
          Text(
            'Soru Başına Süre: $_timeLimit saniye',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: Theme.of(context).colorScheme.primary,
              inactiveTrackColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3),
              thumbColor: Theme.of(context).colorScheme.primary,
              overlayColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
            ),
            child: Slider(
              value: _timeLimit.toDouble(),
              min: 10,
              max: 60,
              divisions: 10,
              onChanged: (value) {
                setState(() {
                  _timeLimit = value.toInt();
                  _remainingTime = _timeLimit;
                });
              },
            ),
          ),
          
          const SizedBox(height: 32),
          
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _startQuiz,
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
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
                  : const Text(
                      'Quiz\'i Başlat',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDifficultySelector(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: isDark 
            ? Colors.white.withValues(alpha: 0.05)
            : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: ['Kolay', 'Orta', 'Zor'].map((difficulty) {
          final isSelected = _selectedDifficulty == difficulty;
          Color getColor() {
            switch (difficulty) {
              case 'Kolay': return Colors.green;
              case 'Orta': return Colors.orange;
              case 'Zor': return Colors.red;
              default: return Colors.grey;
            }
          }
          
          return Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _selectedDifficulty = difficulty;
                });
                HapticFeedback.lightImpact();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? getColor() : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  difficulty,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: isSelected 
                        ? Colors.white 
                        : getColor(),
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildQuiz(bool isDark) {
    if (_questions.isEmpty) return const SizedBox();
    
    final currentQuestion = _questions[_currentQuestionIndex];
    final progress = (_currentQuestionIndex + 1) / _questions.length;
    
    return Column(
      children: [
        // Header with timer and progress
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark 
                ? Colors.white.withValues(alpha: 0.05)
                : Colors.white.withValues(alpha: 0.9),
            border: Border(
              bottom: BorderSide(
                color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
              ),
            ),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Text(
                    'Soru ${_currentQuestionIndex + 1}/${_questions.length}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _remainingTime <= 5 
                          ? Colors.red.withValues(alpha: 0.1)
                          : Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.timer,
                          size: 16,
                          color: _remainingTime <= 5 ? Colors.red : Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${_remainingTime}s',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: _remainingTime <= 5 ? Colors.red : Theme.of(context).colorScheme.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              LinearProgressIndicator(
                value: progress,
                backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
                valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).colorScheme.primary),
                borderRadius: BorderRadius.circular(4),
              ),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: _remainingTime / _timeLimit,
                backgroundColor: Colors.grey.withValues(alpha: 0.2),
                valueColor: AlwaysStoppedAnimation<Color>(
                  _remainingTime <= 5 ? Colors.red : Colors.green,
                ),
                borderRadius: BorderRadius.circular(4),
              ),
            ],
          ),
        ),
        
        // Question content
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isDark 
                        ? Colors.white.withValues(alpha: 0.05)
                        : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        currentQuestion['question'] ?? '',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                          height: 1.4,
                        ),
                      ),
                      if (currentQuestion['image'] != null) ...[
                        const SizedBox(height: 16),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.network(
                            currentQuestion['image'],
                            height: 200,
                            width: double.infinity,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Answer options
                ...List.generate(
                  (currentQuestion['options'] as List?)?.length ?? 0,
                  (index) {
                    final option = currentQuestion['options'][index];
                    final isSelected = _selectedAnswers[_currentQuestionIndex] == option;
                    
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: GestureDetector(
                        onTap: () => _selectAnswer(option),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.1)
                                : isDark 
                                    ? Colors.white.withValues(alpha: 0.05)
                                    : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? Theme.of(context).colorScheme.primary
                                  : const Color(0xFFE2E8F0).withValues(alpha: 0.5),
                              width: isSelected ? 2 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? const Color(0xFFEF4444)
                                      : Colors.transparent,
                                  shape: BoxShape.circle,
                                border: Border.all(
                                  color: isSelected
                                      ? Theme.of(context).colorScheme.primary
                                      : Colors.grey,
                                ),
                                ),
                                child: isSelected
                                    ? const Icon(
                                        Icons.check,
                                        size: 16,
                                        color: Colors.white,
                                      )
                                    : null,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  option,
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: isSelected
                                        ? Theme.of(context).colorScheme.primary
                                        : null,
                                    fontWeight: isSelected
                                        ? FontWeight.w600
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
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildResults(bool isDark) {
    if (_quizResults == null) return const SizedBox();
    
    final score = _quizResults!['score'] ?? 0;
    final totalQuestions = _questions.length;
    final percentage = ((score / totalQuestions) * 100).toInt();
    
    return AnimatedBuilder(
      animation: _resultAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _resultAnimation.value,
              child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // Results header
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: percentage >= 70 
                          ? [Colors.green, Colors.green.shade700]
                          : percentage >= 50
                              ? [Colors.orange, Colors.orange.shade700]
                              : [Colors.red, Colors.red.shade700],
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        percentage >= 70 ? Icons.celebration : Icons.emoji_events,
                        size: 48,
                        color: Colors.white,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Quiz Tamamlandı!',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '$score/$totalQuestions doğru (%$percentage)',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Performance analysis
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark 
                        ? Colors.white.withValues(alpha: 0.05)
                        : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Performans Analizi',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildPerformanceItem(
                        'Doğru Cevap',
                        '$score',
                        Colors.green,
                        Icons.check_circle,
                      ),
                      _buildPerformanceItem(
                        'Yanlış Cevap',
                        '${totalQuestions - score}',
                        Colors.red,
                        Icons.cancel,
                      ),
                      _buildPerformanceItem(
                        'Başarı Oranı',
                        '%$percentage',
                        percentage >= 70 ? Colors.green : Colors.orange,
                        Icons.analytics,
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Action buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _restart,
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: Theme.of(context).colorScheme.primary),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Yeni Quiz'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => Navigator.pop(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Theme.of(context).colorScheme.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Tamamla'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPerformanceItem(String label, String value, Color color, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
