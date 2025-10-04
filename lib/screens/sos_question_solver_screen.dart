import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import 'package:share_plus/share_plus.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:flutter_tts/flutter_tts.dart';

import '../theme/app_theme.dart';
import '../services/api_client.dart';
import '../services/api_service.dart';

class SOSQuestionSolverScreen extends ConsumerStatefulWidget {
  const SOSQuestionSolverScreen({super.key});

  @override
  _SOSQuestionSolverScreenState createState() =>
      _SOSQuestionSolverScreenState();
}

class _SOSQuestionSolverScreenState extends ConsumerState<SOSQuestionSolverScreen>
    with TickerProviderStateMixin {
  final TextEditingController _questionController = TextEditingController();
  final FocusNode _questionFocusNode = FocusNode();
  final ImagePicker _picker = ImagePicker();
  final stt.SpeechToText _speechToText = stt.SpeechToText();
  final FlutterTts _flutterTts = FlutterTts();

  File? _image;
  String? _solution;
  String? _detectedTopic;
  List<String> _hints = [];
  List<Map<String, dynamic>> _solutionSteps = [];
  bool _isLoading = false;
  bool _isListening = false;
  bool _isSpeaking = false;
  bool _isFavorite = false;
  String _selectedSubject = 'Matematik';
  int _selectedGrade = 12;
  int _currentStepIndex = 0;

  late AnimationController _animationController;
  late AnimationController _stepAnimationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;
  late Animation<double> _scaleAnimation;

  final List<String> subjects = [
    'Matematik',
    'Fizik',
    'Kimya',
    'Biyoloji',
    'Türkçe',
    'Tarih',
    'Coğrafya',
    'Felsefe'
  ];

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _initializeSpeech();
  }

  void _initializeAnimations() {
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    _stepAnimationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
    _slideAnimation = Tween<double>(begin: 50.0, end: 0.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOutCubic),
    );
    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.elasticOut),
    );
    
    _animationController.forward();
  }

  Future<void> _initializeSpeech() async {
    await _speechToText.initialize();
    await _flutterTts.setLanguage("tr-TR");
    await _flutterTts.setSpeechRate(0.5);
    await _flutterTts.setVolume(1.0);
    await _flutterTts.setPitch(1.0);
  }

  @override
  void dispose() {
    _animationController.dispose();
    _stepAnimationController.dispose();
    _questionController.dispose();
    _questionFocusNode.dispose();
    _speechToText.cancel();
    _flutterTts.stop();
    super.dispose();
  }

  Future<void> _startListening() async {
    if (!_isListening) {
      setState(() => _isListening = true);
      await _speechToText.listen(
        onResult: (result) {
          if (result.finalResult) {
            setState(() {
              _questionController.text = result.recognizedWords;
              _isListening = false;
            });
          }
        },
        localeId: "tr_TR",
      );
    }
  }

  Future<void> _stopListening() async {
    await _speechToText.stop();
    setState(() => _isListening = false);
  }

  Future<void> _speakSolution() async {
    if (_solution != null) {
      setState(() => _isSpeaking = true);
      await _flutterTts.speak(_solution!);
      setState(() => _isSpeaking = false);
    }
  }

  Future<void> _shareSolution() async {
    if (_solution != null) {
      await Share.share(
        'SOS Soru Çözücü - $_detectedTopic\n\n$_solution',
        subject: 'Soru Çözümü Paylaşımı',
      );
    }
  }

  void _toggleFavorite() {
    setState(() => _isFavorite = !_isFavorite);
    HapticFeedback.lightImpact();
  }

  void _nextStep() {
    if (_currentStepIndex < _solutionSteps.length - 1) {
      setState(() => _currentStepIndex++);
      _stepAnimationController.forward(from: 0.0);
    }
  }

  void _previousStep() {
    if (_currentStepIndex > 0) {
      setState(() => _currentStepIndex--);
      _stepAnimationController.forward(from: 0.0);
    }
  }

  Future<void> _pickImage() async {
    try {
      final pickedFile = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 70,
        maxWidth: 1024,
        maxHeight: 1024,
      );
      if (pickedFile != null) {
        setState(() {
          _image = File(pickedFile.path);
        });
        HapticFeedback.lightImpact();
      }
    } catch (e) {
      _showErrorSnackBar('Resim seçilirken hata oluştu: $e');
    }
  }

  Future<void> _takePhoto() async {
    try {
      final pickedFile = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 70,
        maxWidth: 1024,
        maxHeight: 1024,
      );
      if (pickedFile != null) {
        setState(() {
          _image = File(pickedFile.path);
        });
        HapticFeedback.lightImpact();
      }
    } catch (e) {
      _showErrorSnackBar('Fotoğraf çekilirken hata oluştu: $e');
    }
  }

  Future<void> _solveQuestion() async {
    final questionText = _questionController.text.trim();

    if (questionText.isEmpty && _image == null) {
      _showErrorSnackBar('Lütfen bir soru metni girin veya resim seçin');
      return;
    }

    setState(() {
      _isLoading = true;
      _solution = null;
      _detectedTopic = null;
      _hints = [];
      _solutionSteps = [];
      _currentStepIndex = 0;
    });

    HapticFeedback.mediumImpact();

    try {
      if (_selectedSubject.isEmpty) {
        throw Exception('Lütfen bir ders seçin');
      }

      final requestData = <String, dynamic>{
        'subject': _selectedSubject,
      };

      final apiService = ApiService();
      final userId = await apiService.getUserId();
      
      if (userId != null && userId.isNotEmpty) {
        requestData['userId'] = userId;
      }

      if (questionText.isNotEmpty) {
        requestData['questionText'] = questionText;
      }

      if (_image != null) {
        final bytes = await _image!.readAsBytes();
        if (bytes.length > 500 * 1024) {
          _showErrorSnackBar('Resim çok büyük! Lütfen daha küçük bir resim seçin.');
          setState(() => _isLoading = false);
          return;
        }
        final base64Image = base64Encode(bytes);
        requestData['imageBase64'] = base64Image;
      }

      final response = await ref.read(apiClientProvider).post('/smart-tools/sos-question-solver', requestData);

      setState(() {
        final learningPath = response['learningPath'];
        if (learningPath != null) {
          _solutionSteps = List<Map<String, dynamic>>.from(learningPath['steps'] ?? []);
          _solution = _solutionSteps.map((step) => 
            '${step['step']}. ${step['explanation']}${step['formula'] != null ? '\nFormül: ${step['formula']}' : ''}'
          ).join('\n\n');
          _detectedTopic = learningPath['topic'];
          _hints = List<String>.from(learningPath['tips'] ?? []);
        } else {
          _solution = 'Çözüm bulunamadı';
        }
        _isLoading = false;
      });

      _questionController.clear();
      _questionFocusNode.unfocus();
      setState(() => _image = null);
      HapticFeedback.heavyImpact();
    } catch (e) {
      setState(() {
        _solution = 'Çözüm oluşturulurken hata oluştu. Lütfen tekrar deneyin.';
        _isLoading = false;
      });
      _showErrorSnackBar('Hata: $e');
    }
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
    final isWide = MediaQuery.of(context).size.width > 768;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0A0F1C) : const Color(0xFFF8FAFC),
      appBar: _buildAppBar(isDark),
      body: AnimatedBuilder(
        animation: _animationController,
        builder: (context, child) {
          return FadeTransition(
            opacity: _fadeAnimation,
            child: Transform.translate(
              offset: Offset(0, _slideAnimation.value),
              child: isWide ? _buildWideLayout(isDark) : _buildNarrowLayout(isDark),
            ),
          );
        },
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(bool isDark) {
    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      leading: Container(
        margin: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: isDark ? Colors.white.withValues(alpha: 0.1) : Colors.white.withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(12),
        ),
        child: IconButton(
          icon: Icon(Icons.arrow_back_ios, color: isDark ? Colors.white : Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [const Color(0xFFEF4444), const Color(0xFFFF6B6B)],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text('🚨', style: TextStyle(fontSize: 20)),
          ),
          const SizedBox(width: 12),
          Text(
            'SOS Soru Çözücü',
            style: TextStyle(
              color: isDark ? Colors.white : Colors.black87,
              fontWeight: FontWeight.w800,
              fontSize: 20,
            ),
          ),
        ],
      ),
      actions: [
        if (_solution != null) ...[
          IconButton(
            onPressed: _toggleFavorite,
            icon: Icon(
              _isFavorite ? Icons.favorite : Icons.favorite_border,
              color: _isFavorite ? const Color(0xFFEF4444) : null,
            ),
          ),
          IconButton(
            onPressed: _shareSolution,
            icon: const Icon(Icons.share),
          ),
        ],
      ],
    );
  }

  Widget _buildWideLayout(bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(flex: 1, child: _buildInputPanel(isDark)),
          const SizedBox(width: 24),
          Expanded(flex: 1, child: _buildSolutionPanel(isDark)),
        ],
      ),
    );
  }

  Widget _buildNarrowLayout(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          _buildInputPanel(isDark),
          const SizedBox(height: 24),
          _buildSolutionPanel(isDark),
        ],
      ),
    );
  }

  Widget _buildInputPanel(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.white.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.black.withValues(alpha: 0.3) : const Color(0xFFEF4444).withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeaderSection(isDark),
          const SizedBox(height: 24),
          _buildQuestionInputSection(isDark),
          const SizedBox(height: 20),
          _buildImageSection(isDark),
          const SizedBox(height: 20),
          _buildSubjectSelection(isDark),
          const SizedBox(height: 24),
          _buildSolveButton(isDark),
        ],
      ),
    );
  }

  Widget _buildHeaderSection(bool isDark) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [const Color(0xFFEF4444), const Color(0xFFFF6B6B)],
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(Icons.quiz, color: Colors.white, size: 24),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Soru Giriş Alanı',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFFEF4444),
                ),
              ),
              Text(
                'Sorunuzu yazın veya fotoğrafını çekin',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.getSecondaryTextColor(context),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildQuestionInputSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Soru Metni',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: isDark ? Colors.white.withValues(alpha: 0.05) : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0).withValues(alpha: 0.5)),
          ),
          child: TextField(
            controller: _questionController,
            focusNode: _questionFocusNode,
            maxLines: 6,
            decoration: InputDecoration(
              hintText: 'Soru metnini buraya yazın...',
              border: InputBorder.none,
              contentPadding: const EdgeInsets.all(16),
              suffixIcon: IconButton(
                onPressed: _isListening ? _stopListening : _startListening,
                icon: Icon(
                  _isListening ? Icons.mic : Icons.mic_none,
                  color: _isListening ? const Color(0xFFEF4444) : null,
                ),
              ),
            ),
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      ],
    );
  }

  Widget _buildImageSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Resim Yükleme',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        if (_image != null) ...[
          Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Stack(
                children: [
                  Image.file(_image!, fit: BoxFit.cover, width: double.infinity, height: double.infinity),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: IconButton(
                        onPressed: () => setState(() => _image = null),
                        icon: const Icon(Icons.close, color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                onPressed: _pickImage,
                icon: Icons.upload_file,
                label: 'Galeri',
                isDark: isDark,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                onPressed: _takePhoto,
                icon: Icons.camera_alt,
                label: 'Kamera',
                isDark: isDark,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionButton({
    required VoidCallback onPressed,
    required IconData icon,
    required String label,
    required bool isDark,
  }) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFFEF4444).withValues(alpha: 0.1),
            const Color(0xFFFF6B6B).withValues(alpha: 0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: const Color(0xFFEF4444), size: 20),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: TextStyle(
                    color: const Color(0xFFEF4444),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSubjectSelection(bool isDark) {
    return Row(
      children: [
        Expanded(
          child: _buildDropdown(
            value: _selectedSubject,
            items: subjects.map((subject) => DropdownMenuItem(value: subject, child: Text(subject))).toList(),
            onChanged: (value) => setState(() => _selectedSubject = value!),
            label: 'Ders',
            isDark: isDark,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildDropdown(
            value: _selectedGrade,
            items: List.generate(13, (index) => index + 1)
                .map((grade) => DropdownMenuItem(value: grade, child: Text('$grade. Sınıf')))
                .toList(),
            onChanged: (value) => setState(() => _selectedGrade = value!),
            label: 'Sınıf',
            isDark: isDark,
          ),
        ),
      ],
    );
  }

  Widget _buildDropdown<T>({
    required T value,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?> onChanged,
    required String label,
    required bool isDark,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white70 : Colors.black54,
          ),
        ),
        const SizedBox(height: 4),
        Container(
          decoration: BoxDecoration(
            color: isDark ? Colors.white.withValues(alpha: 0.05) : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0).withValues(alpha: 0.5)),
          ),
          child: DropdownButtonFormField<T>(
            value: value,
            decoration: const InputDecoration(
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
            items: items,
            onChanged: onChanged,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      ],
    );
  }

  Widget _buildSolveButton(bool isDark) {
    return Container(
      width: double.infinity,
      height: 56,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [const Color(0xFFEF4444), const Color(0xFFFF6B6B)],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFEF4444).withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _isLoading ? null : _solveQuestion,
          borderRadius: BorderRadius.circular(16),
          child: Center(
            child: _isLoading
                ? const SizedBox(
                    height: 24,
                    width: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.auto_awesome, color: Colors.white, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'Çözümü Başlat',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildSolutionPanel(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.white.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.black.withValues(alpha: 0.3) : const Color(0xFFEF4444).withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSolutionHeader(isDark),
          const SizedBox(height: 20),
          if (_isLoading) ...[
            _buildLoadingSkeleton(isDark),
          ] else if (_solution != null) ...[
            _buildSolutionContent(isDark),
          ] else ...[
            _buildEmptyState(isDark),
          ],
        ],
      ),
    );
  }

  Widget _buildSolutionHeader(bool isDark) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [const Color(0xFF10B981), const Color(0xFF34D399)],
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(Icons.lightbulb, color: Colors.white, size: 24),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Çözüm Görüntüleme',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF10B981),
                ),
              ),
              Text(
                'AI destekli adım adım çözüm',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.getSecondaryTextColor(context),
                ),
              ),
            ],
          ),
        ),
        if (_solution != null) ...[
          IconButton(
            onPressed: _speakSolution,
            icon: Icon(
              _isSpeaking ? Icons.volume_off : Icons.volume_up,
              color: _isSpeaking ? const Color(0xFFEF4444) : const Color(0xFF10B981),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildLoadingSkeleton(bool isDark) {
    return AnimationLimiter(
      child: Column(
        children: AnimationConfiguration.toStaggeredList(
          duration: const Duration(milliseconds: 600),
          childAnimationBuilder: (widget) => SlideAnimation(
            horizontalOffset: 50.0,
            child: FadeInAnimation(child: widget),
          ),
          children: [
            _buildSkeletonItem(isDark, 0.8),
            const SizedBox(height: 12),
            _buildSkeletonItem(isDark, 0.6),
            const SizedBox(height: 8),
            _buildSkeletonItem(isDark, 0.7),
            const SizedBox(height: 8),
            _buildSkeletonItem(isDark, 0.5),
          ],
        ),
      ),
    );
  }

  Widget _buildSkeletonItem(bool isDark, double width) {
    return Container(
      height: 16,
      width: MediaQuery.of(context).size.width * width,
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.1) : Colors.grey.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(8),
      ),
    );
  }

  Widget _buildSolutionContent(bool isDark) {
    return AnimationLimiter(
      child: Column(
        children: AnimationConfiguration.toStaggeredList(
          duration: const Duration(milliseconds: 800),
          childAnimationBuilder: (widget) => SlideAnimation(
            verticalOffset: 30.0,
            child: FadeInAnimation(child: widget),
          ),
          children: [
            if (_detectedTopic != null) _buildTopicTag(isDark),
            const SizedBox(height: 20),
            _buildStepNavigation(isDark),
            const SizedBox(height: 20),
            _buildCurrentStep(isDark),
            if (_hints.isNotEmpty) ...[
              const SizedBox(height: 20),
              _buildHintsSection(isDark),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTopicTag(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [const Color(0xFF10B981).withValues(alpha: 0.2), const Color(0xFF34D399).withValues(alpha: 0.1)],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.tag, color: const Color(0xFF10B981), size: 16),
          const SizedBox(width: 8),
          Text(
            'Belirlenen Konu: $_detectedTopic',
            style: TextStyle(
              color: const Color(0xFF10B981),
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepNavigation(bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        IconButton(
          onPressed: _currentStepIndex > 0 ? _previousStep : null,
          icon: Icon(
            Icons.arrow_back_ios,
            color: _currentStepIndex > 0 ? const Color(0xFF10B981) : Colors.grey,
          ),
        ),
        Text(
          'Adım ${_currentStepIndex + 1} / ${_solutionSteps.length}',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: const Color(0xFF10B981),
          ),
        ),
        IconButton(
          onPressed: _currentStepIndex < _solutionSteps.length - 1 ? _nextStep : null,
          icon: Icon(
            Icons.arrow_forward_ios,
            color: _currentStepIndex < _solutionSteps.length - 1 ? const Color(0xFF10B981) : Colors.grey,
          ),
        ),
      ],
    );
  }

  Widget _buildCurrentStep(bool isDark) {
    if (_solutionSteps.isEmpty) return const SizedBox.shrink();
    
    final currentStep = _solutionSteps[_currentStepIndex];
    
    return AnimatedBuilder(
      animation: _stepAnimationController,
      builder: (context, child) {
        return Transform.scale(
          scale: 0.95 + (0.05 * _stepAnimationController.value),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? Colors.white.withValues(alpha: 0.03) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0).withValues(alpha: 0.5)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${currentStep['step']}',
                        style: TextStyle(
                          color: const Color(0xFF10B981),
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Adım ${currentStep['step']}',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF10B981),
                          fontSize: 18,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  currentStep['explanation'] ?? '',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    height: 1.6,
                  ),
                ),
                if (currentStep['formula'] != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.amber.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.functions, color: Colors.amber[700], size: 16),
                        const SizedBox(width: 8),
                        Text(
                          'Formül: ${currentStep['formula']}',
                          style: TextStyle(
                            color: Colors.amber[700],
                            fontWeight: FontWeight.w600,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHintsSection(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.amber.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.tips_and_updates, color: Colors.amber[700], size: 20),
              const SizedBox(width: 8),
              Text(
                'Benzer Sorular İçin İpuçları',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: Colors.amber[700],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ..._hints.map((hint) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '• ',
                  style: TextStyle(
                    color: Colors.amber[700],
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Expanded(
                  child: Text(
                    hint,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [const Color(0xFFEF4444).withValues(alpha: 0.1), const Color(0xFFFF6B6B).withValues(alpha: 0.1)],
              ),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.quiz,
              size: 48,
              color: const Color(0xFFEF4444).withValues(alpha: 0.7),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Soru çözümü burada görünecek',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: AppTheme.getSecondaryTextColor(context),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Bir soru girin ve çözümü başlatın',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppTheme.getSecondaryTextColor(context),
            ),
          ),
        ],
      ),
    );
  }
}
