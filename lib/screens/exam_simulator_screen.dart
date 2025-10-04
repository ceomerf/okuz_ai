import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../services/api_client.dart';
import 'package:okuz_ai/services/providers.dart';

class ExamSimulatorScreen extends ConsumerStatefulWidget {
  const ExamSimulatorScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<ExamSimulatorScreen> createState() => _ExamSimulatorScreenState();
}

class _ExamSimulatorScreenState extends ConsumerState<ExamSimulatorScreen>
    with TickerProviderStateMixin {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _tcController = TextEditingController();
  
  bool _isLoading = false;
  List<Map<String, dynamic>> _questions = [];
  int _currentQuestionIndex = 0;
  List<String> _selectedAnswers = [];
  Map<String, dynamic>? _examResults;
  bool _showSetup = true;
  bool _showExam = false;
  String _selectedExamType = 'TYT';
  Duration _remainingTime = const Duration(minutes: 165);
  Timer? _timer;

  late AnimationController _animationController;
  late AnimationController _resultController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;
  late Animation<double> _resultAnimation;

  final Map<String, Map<String, dynamic>> _examTypes = {
    'TYT': {
      'name': 'Temel Yeterlilik Testi',
      'duration': 165,
      'subjects': ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilimler'],
      'description': 'Tüm üniversite adayları için zorunlu',
    },
    'AYT': {
      'name': 'Alan Yeterlilik Testi',
      'duration': 180,
      'subjects': ['Türk Dili ve Edebiyatı', 'Tarih', 'Coğrafya', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji'],
      'description': '4 yıllık üniversite programları için',
    },
    'YDT': {
      'name': 'Yabancı Dil Testi',
      'duration': 180,
      'subjects': ['Yabancı Dil'],
      'description': 'Yabancı dil öğretmenliği için',
    },
  };

  @override
  void initState() {
    super.initState();
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
    _nameController.dispose();
    _tcController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _startExam() async {
    if (_nameController.text.trim().isEmpty || _tcController.text.trim().isEmpty) {
      _showErrorSnackBar('Lütfen ad soyad ve TC kimlik numaranızı girin');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    HapticFeedback.mediumImpact();

    try {
      final response = await ref.read(apiClientProvider).post('/smart-tools/exam-simulator', {
        'examType': _selectedExamType,
        'name': _nameController.text.trim(),
        'tcNo': _tcController.text.trim(),
      });

      if (response['success'] == true) {
        setState(() {
          _questions = List<Map<String, dynamic>>.from(response['questions'] ?? []);
          _selectedAnswers = List.filled(_questions.length, '');
          _currentQuestionIndex = 0;
          _showSetup = false;
          _showExam = true;
          _isLoading = false;
          _remainingTime = Duration(minutes: _examTypes[_selectedExamType]!['duration']);
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
      if (_remainingTime.inSeconds > 0) {
        setState(() {
          _remainingTime = Duration(seconds: _remainingTime.inSeconds - 1);
        });
      } else {
        _finishExam();
      }
    });
  }

  void _selectAnswer(String answer) {
    setState(() {
      _selectedAnswers[_currentQuestionIndex] = answer;
    });
    HapticFeedback.lightImpact();
  }

  void _nextQuestion() {
    if (_currentQuestionIndex < _questions.length - 1) {
      setState(() {
        _currentQuestionIndex++;
      });
    }
  }

  void _previousQuestion() {
    if (_currentQuestionIndex > 0) {
      setState(() {
        _currentQuestionIndex--;
      });
    }
  }

  Future<void> _finishExam() async {
    _timer?.cancel();
    
    setState(() {
      _isLoading = true;
    });

    try {
      // Backend'de bu endpoint mevcut değil, geçici olarak başarılı döndür
      final response = {'success': true};

      setState(() {
        _examResults = response;
        _showExam = false;
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
      _examResults = null;
      _showSetup = true;
      _showExam = false;
      _nameController.clear();
      _tcController.clear();
      _remainingTime = Duration(minutes: _examTypes[_selectedExamType]!['duration']);
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
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
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
                color: const Color(0xFF0EA5E9).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text('📊', style: TextStyle(fontSize: 20)),
            ),
            const SizedBox(width: 12),
            Text(
              'Sınav Simülatörü',
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
              child: _buildContent(isDark),
            ),
          );
        },
      ),
    );
  }

  Widget _buildContent(bool isDark) {
    if (_examResults != null) {
      return _buildResults(isDark);
    } else if (_showExam) {
      return _buildExam(isDark);
    } else {
      return _buildSetup(isDark);
    }
  }

  Widget _buildSetup(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ÖSYM Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0EA5E9), Color(0xFF0284C7)],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.school,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'ÖSYM Benzeri Sınav Simülatörü',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Gerçek sınav ortamında kendinizi test edin',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Registration Form
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark 
                  ? Colors.white.withValues(alpha: 0.05)
                  : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xFF0EA5E9).withValues(alpha: 0.2),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Sınav Kaydı',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0EA5E9),
                  ),
                ),
                const SizedBox(height: 16),
                
                TextField(
                  controller: _nameController,
                  decoration: InputDecoration(
                    labelText: 'Ad Soyad',
                    hintText: 'Adınızı ve soyadınızı girin',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    prefixIcon: const Icon(Icons.person),
                  ),
                ),
                
                const SizedBox(height: 16),
                
                TextField(
                  controller: _tcController,
                  decoration: InputDecoration(
                    labelText: 'TC Kimlik No',
                    hintText: '11 haneli TC kimlik numaranız',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    prefixIcon: const Icon(Icons.credit_card),
                  ),
                  keyboardType: TextInputType.number,
                  maxLength: 11,
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Exam Type Selection
          Text(
            'Sınav Türü Seçimi',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: const Color(0xFF0EA5E9),
            ),
          ),
          const SizedBox(height: 16),
          
          ..._examTypes.entries.map((entry) {
            final examType = entry.key;
            final details = entry.value;
            final isSelected = _selectedExamType == examType;
            
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: isSelected
                    ? const Color(0xFF0EA5E9).withValues(alpha: 0.1)
                    : isDark 
                        ? Colors.white.withValues(alpha: 0.05)
                        : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected
                      ? const Color(0xFF0EA5E9)
                      : const Color(0xFFE2E8F0).withValues(alpha: 0.5),
                  width: isSelected ? 2 : 1,
                ),
              ),
              child: RadioListTile<String>(
                value: examType,
                groupValue: _selectedExamType,
                onChanged: (value) {
                  setState(() {
                    _selectedExamType = value!;
                  });
                  HapticFeedback.lightImpact();
                },
                title: Text(
                  examType,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: isSelected ? const Color(0xFF0EA5E9) : null,
                  ),
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(details['name']),
                    const SizedBox(height: 4),
                    Text(
                      details['description'],
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.getSecondaryTextColor(context),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Icons.schedule,
                          size: 16,
                          color: const Color(0xFF0EA5E9),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${details['duration']} dakika',
                          style: TextStyle(
                            fontSize: 12,
                            color: const Color(0xFF0EA5E9),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Icon(
                          Icons.subject,
                          size: 16,
                          color: const Color(0xFF0EA5E9),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            '${details['subjects'].length} ders',
                            style: TextStyle(
                              fontSize: 12,
                              color: const Color(0xFF0EA5E9),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                activeColor: const Color(0xFF0EA5E9),
              ),
            );
          }).toList(),
          
          const SizedBox(height: 32),
          
          // Rules and Instructions
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.amber.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Colors.amber.withValues(alpha: 0.3),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.rule, color: Colors.amber[700], size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Sınav Kuralları',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: Colors.amber[700],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ...const [
                  '• Sınav süreniz belirlenmiş süre ile sınırlıdır',
                  '• Her soruya sadece bir cevap verebilirsiniz',
                  '• Süre bittiğinde sınav otomatik olarak sonlanır',
                  '• Sınav sırasında sayfayı kapatmayın',
                  '• Gerçek sınav koşullarını simüle etmek için sessiz bir ortam seçin',
                ].map((rule) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(
                    rule,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      height: 1.4,
                    ),
                  ),
                )),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _startExam,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0EA5E9),
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
                      'Sınava Başla',
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

  Widget _buildExam(bool isDark) {
    if (_questions.isEmpty) return const SizedBox();
    
    final currentQuestion = _questions[_currentQuestionIndex];
    final progress = (_currentQuestionIndex + 1) / _questions.length;
    
    return Column(
      children: [
        // ÖSYM-style header
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0EA5E9),
            border: Border(
              bottom: BorderSide(
                color: const Color(0xFF0284C7),
                width: 2,
              ),
            ),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _selectedExamType,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 18,
                          ),
                        ),
                        Text(
                          _nameController.text,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.schedule,
                          color: Colors.white,
                          size: 18,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${_remainingTime.inHours.toString().padLeft(2, '0')}:'
                          '${(_remainingTime.inMinutes % 60).toString().padLeft(2, '0')}:'
                          '${(_remainingTime.inSeconds % 60).toString().padLeft(2, '0')}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Text(
                    'Soru ${_currentQuestionIndex + 1}/${_questions.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${(progress * 100).toInt()}% Tamamlandı',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: progress,
                backgroundColor: Colors.white.withValues(alpha: 0.3),
                valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                borderRadius: BorderRadius.circular(2),
              ),
            ],
          ),
        ),
        
        // Question content
        Expanded(
          child: Container(
            color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Question card (ÖSYM style)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: const Color(0xFFE2E8F0),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0EA5E9).withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                currentQuestion['subject'] ?? 'Genel',
                                style: const TextStyle(
                                  color: Color(0xFF0EA5E9),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            const Spacer(),
                            Text(
                              'Soru ${_currentQuestionIndex + 1}',
                              style: const TextStyle(
                                color: Color(0xFF64748B),
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          currentQuestion['question'] ?? '',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                            height: 1.5,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 20),
                  
                  // Answer options (ÖSYM style)
                  ...List.generate(
                    (currentQuestion['options'] as List?)?.length ?? 0,
                    (index) {
                      final option = currentQuestion['options'][index];
                      final optionLabel = String.fromCharCode(65 + index); // A, B, C, D, E
                      final isSelected = _selectedAnswers[_currentQuestionIndex] == option;
                      
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected
                                ? const Color(0xFF0EA5E9)
                                : const Color(0xFFE2E8F0),
                            width: isSelected ? 2 : 1,
                          ),
                        ),
                        child: InkWell(
                          onTap: () => _selectAnswer(option),
                          borderRadius: BorderRadius.circular(8),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? const Color(0xFF0EA5E9)
                                        : Colors.transparent,
                                    border: Border.all(
                                      color: isSelected
                                          ? const Color(0xFF0EA5E9)
                                          : const Color(0xFF94A3B8),
                                      width: 2,
                                    ),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Center(
                                    child: Text(
                                      optionLabel,
                                      style: TextStyle(
                                        color: isSelected
                                            ? Colors.white
                                            : const Color(0xFF64748B),
                                        fontWeight: FontWeight.w700,
                                        fontSize: 16,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Text(
                                    option,
                                    style: TextStyle(
                                      fontSize: 15,
                                      color: isSelected
                                          ? const Color(0xFF0EA5E9)
                                          : const Color(0xFF1E293B),
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
        ),
        
        // Navigation buttons (ÖSYM style)
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(
              top: BorderSide(
                color: const Color(0xFFE2E8F0),
              ),
            ),
          ),
          child: Row(
            children: [
              if (_currentQuestionIndex > 0)
                Expanded(
                  child: OutlinedButton(
                    onPressed: _previousQuestion,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF0EA5E9)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.arrow_back, size: 18),
                        SizedBox(width: 8),
                        Text('Önceki Soru'),
                      ],
                    ),
                  ),
                )
              else
                const Spacer(),
              
              const SizedBox(width: 16),
              
              if (_currentQuestionIndex < _questions.length - 1)
                Expanded(
                  child: ElevatedButton(
                    onPressed: _nextQuestion,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0EA5E9),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Sonraki Soru'),
                        SizedBox(width: 8),
                        Icon(Icons.arrow_forward, size: 18),
                      ],
                    ),
                  ),
                )
              else
                Expanded(
                  child: ElevatedButton(
                    onPressed: _finishExam,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Sınavı Bitir'),
                        SizedBox(width: 8),
                        Icon(Icons.check, size: 18),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildResults(bool isDark) {
    if (_examResults == null) return const SizedBox();
    
    final score = _examResults!['totalScore'] ?? 0;
    final ranking = _examResults!['ranking'] ?? 0;
    final analysis = _examResults!['analysis'] ?? {};
    
    return AnimatedBuilder(
      animation: _resultAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _resultAnimation.value,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // Results header (ÖSYM style)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: score >= 400 
                          ? [Colors.green, Colors.green.shade700]
                          : score >= 300
                              ? [Colors.orange, Colors.orange.shade700]
                              : [Colors.red, Colors.red.shade700],
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.emoji_events,
                        size: 48,
                        color: Colors.white,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '$_selectedExamType Sonuçları',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _nameController.text,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          Column(
                            children: [
                              Text(
                                '$score',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 32,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const Text(
                                'Net Puan',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            width: 1,
                            height: 40,
                            color: Colors.white.withValues(alpha: 0.3),
                          ),
                          Column(
                            children: [
                              Text(
                                '${ranking}K',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 32,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const Text(
                                'Tahmini Sıralama',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Subject breakdown
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark 
                        ? Colors.white.withValues(alpha: 0.05)
                        : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: const Color(0xFF0EA5E9).withValues(alpha: 0.2),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Ders Bazlı Performans',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF0EA5E9),
                        ),
                      ),
                      const SizedBox(height: 16),
                      ...(_examTypes[_selectedExamType]!['subjects'] as List).map((subject) {
                        final subjectScore = analysis[subject] ?? {'correct': 0, 'total': 10};
                        final correct = subjectScore['correct'] ?? 0;
                        final total = subjectScore['total'] ?? 10;
                        final percentage = total > 0 ? (correct / total * 100).toInt() : 0;
                        
                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    subject,
                                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  Text(
                                    '$correct/$total (%$percentage)',
                                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: AppTheme.getSecondaryTextColor(context),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              LinearProgressIndicator(
                                value: percentage / 100,
                                backgroundColor: Colors.grey.withValues(alpha: 0.2),
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  percentage >= 80 ? Colors.green :
                                  percentage >= 60 ? Colors.orange : Colors.red,
                                ),
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
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
                          side: const BorderSide(color: Color(0xFF0EA5E9)),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Yeni Sınav'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => Navigator.pop(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0EA5E9),
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
}
