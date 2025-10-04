import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:math' as math;
import '../theme/app_theme.dart';
import '../providers/flashcard_provider.dart';
import '../providers/curriculum_selection_provider.dart';
import '../models/flashcard_models.dart';

class FlashcardsScreen extends ConsumerStatefulWidget {
  const FlashcardsScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<FlashcardsScreen> createState() => _FlashcardsScreenState();
}

class _FlashcardsScreenState extends ConsumerState<FlashcardsScreen>
    with TickerProviderStateMixin {
  final TextEditingController _topicController = TextEditingController();
  final TextEditingController _sourceTextController = TextEditingController();
  final PageController _pageController = PageController();

  int _currentCardIndex = 0;
  int _cardCount = 10;
  String _selectedDifficulty = 'medium';

  late AnimationController _animationController;
  late AnimationController _flipController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;

  final List<String> _difficulties = ['easy', 'medium', 'hard'];

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _flipController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
    _slideAnimation = Tween<double>(begin: 30.0, end: 0.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOutCubic),
    );
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _flipController.dispose();
    _topicController.dispose();
    _sourceTextController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _generateFlashcards() async {
    final curriculumState = ref.read(curriculumSelectionProvider);
    
    // Müfredat seçimi kontrolü
    if (curriculumState.selectedGrade == null || 
        curriculumState.selectedSubject == null || 
        curriculumState.selectedTopic == null) {
      _showErrorSnackBar('Lütfen müfredat seçimi yapın');
      return;
    }

    // Kaynak metin opsiyonel, boş olabilir
    final sourceText = _sourceTextController.text.trim();
    final selectedTopic = curriculumState.selectedTopic!;

    HapticFeedback.mediumImpact();

    await ref.read(flashcardProvider.notifier).createFlashcards(
          sourceText: sourceText.isEmpty ? '' : sourceText,
          topic: selectedTopic, // Seçilen konuyu kullan
          cardCount: _cardCount,
          difficulty: _selectedDifficulty,
          selectedGrade: curriculumState.selectedGrade,
          selectedSubject: curriculumState.selectedSubject,
          selectedTopic: curriculumState.selectedTopic,
        );
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

  String? _getValidTopicValue(String? selectedTopic, List<String> availableTopics) {
    if (selectedTopic == null) return null;
    if (availableTopics.contains(selectedTopic)) {
      return selectedTopic;
    }
    return null; // Seçili değer items listesinde yoksa null döndür
  }

  String? _getValidSubjectValue(String? selectedSubject, List<String> availableSubjects) {
    if (selectedSubject == null) return null;
    if (availableSubjects.contains(selectedSubject)) {
      return selectedSubject;
    }
    return null; // Seçili değer items listesinde yoksa null döndür
  }

  Widget _buildCurriculumSelection(BuildContext context, bool isDark) {
    final curriculumState = ref.watch(curriculumSelectionProvider);
    final curriculumNotifier = ref.read(curriculumSelectionProvider.notifier);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Müfredat Seçimi',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: AppTheme.getPrimaryTextColor(context),
              ),
        ),
        const SizedBox(height: 8),
        
        // Sınıf Seçimi
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
                  child: Text(
                    grade,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 14),
                  ),
                );
              }).toList(),
              onChanged: (value) {
                curriculumNotifier.selectGrade(value);
              },
              isExpanded: true,
            ),
        ),

        const SizedBox(height: 12),

        // Ders Seçimi
        if (curriculumState.selectedGrade != null) ...[
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
            child: DropdownButtonFormField<String>(
              value: _getValidSubjectValue(curriculumState.selectedSubject, curriculumNotifier.getAvailableSubjects()),
              decoration: const InputDecoration(
                labelText: 'Ders Seçin',
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                prefixIcon: Icon(Icons.book),
              ),
              items: curriculumNotifier.getAvailableSubjects().map((subject) {
                return DropdownMenuItem(
                  value: subject,
                  child: Text(
                    subject,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 14),
                  ),
                );
              }).toList(),
              onChanged: (value) {
                curriculumNotifier.selectSubject(value);
              },
              isExpanded: true,
            ),
          ),

          const SizedBox(height: 12),
        ],

        // Konu Seçimi
        if (curriculumState.selectedSubject != null) ...[
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
            child: DropdownButtonFormField<String>(
              value: _getValidTopicValue(curriculumState.selectedTopic, curriculumNotifier.getAvailableTopics()),
              decoration: const InputDecoration(
                labelText: 'Konu Seçin',
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                prefixIcon: Icon(Icons.topic),
              ),
              items: curriculumNotifier.getAvailableTopics().map((topic) {
                return DropdownMenuItem(
                  value: topic,
                  child: Text(
                    topic,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 14),
                  ),
                );
              }).toList(),
              onChanged: (value) {
                curriculumNotifier.selectTopic(value);
              },
              isExpanded: true,
            ),
          ),
        ],

        // Müfredat Seçimi Tamamlandı Bilgisi
        if (curriculumNotifier.isSelectionComplete) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: const Color(0xFF10B981).withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.check_circle,
                  color: const Color(0xFF10B981),
                  size: 20,
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    'Müfredat seçimi tamamlandı! Flashcard\'lar seçilen konuya göre oluşturulacak.',
                    style: TextStyle(
                      color: const Color(0xFF10B981),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final flashcardState = ref.watch(flashcardProvider);

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
                color: const Color(0xFF10B981).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text('🗂️', style: TextStyle(fontSize: 20)),
            ),
            const SizedBox(width: 12),
            Text(
              'Flashcard Oluşturucu',
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
              child: _buildBody(isDark, flashcardState),
            ),
          );
        },
      ),
    );
  }

  Widget _buildBody(bool isDark, FlashcardState state) {
    if (state is FlashcardLoading) {
      return _buildLoadingState(isDark);
    } else if (state is FlashcardLoaded) {
      return _buildFlashcardsView(isDark, state.cards);
    } else if (state is FlashcardError) {
      // Use post-frame callback to show snackbar after build
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showErrorSnackBar(state.message);
      });
      return _buildCreationForm(isDark);
    } else {
      return _buildCreationForm(isDark);
    }
  }

  Widget _buildLoadingState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(const Color(0xFF10B981)),
          ),
          const SizedBox(height: 24),
          Text(
            'Flashcard\'lar oluşturuluyor...',
            style: TextStyle(
              color: isDark ? Colors.white70 : Colors.black54,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCreationForm(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withValues(alpha: 0.05)
              : Colors.white.withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: const Color(0xFF10B981).withValues(alpha: 0.2),
          ),
          boxShadow: [
            BoxShadow(
              color: isDark
                  ? Colors.black.withValues(alpha: 0.3)
                  : const Color(0xFF10B981).withValues(alpha: 0.08),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Oluşturma Formu',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF10B981),
                  ),
            ),
            const SizedBox(height: 20),

            // Müfredat Seçimi
            _buildCurriculumSelection(context, isDark),

            const SizedBox(height: 16),

            // Metin giriş alanı (Opsiyonel)
            Text(
              'Kaynak Metin (Opsiyonel)',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppTheme.getPrimaryTextColor(context),
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              'Boş bırakırsanız seçilen konuya göre otomatik içerik oluşturulur',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppTheme.getSecondaryTextColor(context),
                    fontSize: 12,
                  ),
            ),
            const SizedBox(height: 8),
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
                controller: _sourceTextController,
                maxLines: 4,
                decoration: const InputDecoration(
                  hintText: 'Kartları oluşturmak istediğiniz metni girin (opsiyonel)...',
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.all(16),
                  prefixIcon: Icon(Icons.text_fields),
                ),
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),

            const SizedBox(height: 24),

            // Kart sayısı slider
            Text(
              'Oluşturulacak Kart Sayısı',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppTheme.getPrimaryTextColor(context),
                  ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.03)
                    : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('5'),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '$_cardCount Kart',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      Text('20'),
                    ],
                  ),
                  Slider(
                    value: _cardCount.toDouble(),
                    min: 5,
                    max: 20,
                    divisions: 15,
                    activeColor: const Color(0xFF10B981),
                    onChanged: (value) {
                      setState(() {
                        _cardCount = value.round();
                      });
                      HapticFeedback.lightImpact();
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Zorluk seviyesi
            Text(
              'Zorluk Seviyesi',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppTheme.getPrimaryTextColor(context),
                  ),
            ),
            const SizedBox(height: 12),
            _buildDifficultySelector(isDark),

            const SizedBox(height: 32),

            // Flashcard oluştur butonu
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _generateFlashcards,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  'Flashcard\'ları Oluştur',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                ),
              ),
            ),
          ],
        ),
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
        children: _difficulties.map((difficulty) {
          final isSelected = _selectedDifficulty == difficulty;
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
                  color: isSelected
                      ? _getDifficultyColor(difficulty)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _getDifficultyDisplayName(difficulty),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: isSelected
                        ? Colors.white
                        : _getDifficultyColor(difficulty),
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildFlashcardsView(bool isDark, List<Flashcard> flashcards) {
    return Column(
      children: [
        // Header ve progress
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              IconButton(
                onPressed: () {
                  ref.read(flashcardProvider.notifier).reset();
                  setState(() {
                    _currentCardIndex = 0;
                  });
                },
                icon: const Icon(Icons.arrow_back),
                style: IconButton.styleFrom(
                  backgroundColor: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : const Color(0xFFF1F5F9),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${_currentCardIndex + 1} / ${flashcards.length}',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: const Color(0xFF10B981),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Carousel
        Expanded(
          child: PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() {
                _currentCardIndex = index;
              });
              HapticFeedback.lightImpact();
            },
            itemCount: flashcards.length,
            itemBuilder: (context, index) {
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _FlipCard(
                  key: ValueKey(index),
                  front: flashcards[index].front,
                  back: flashcards[index].back,
                  difficulty: _selectedDifficulty,
                  isDark: isDark,
                ),
              );
            },
          ),
        ),

        // Navigation dots
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(flashcards.length, (index) {
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: _currentCardIndex == index ? 24 : 8,
                height: 8,
                decoration: BoxDecoration(
                  color: _currentCardIndex == index
                      ? const Color(0xFF10B981)
                      : const Color(0xFF10B981).withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(4),
                ),
              );
            }),
          ),
        ),
      ],
    );
  }

  String _getDifficultyDisplayName(String difficulty) {
    switch (difficulty) {
      case 'easy':
        return 'Kolay';
      case 'medium':
        return 'Orta';
      case 'hard':
        return 'Zor';
      default:
        return 'Orta';
    }
  }

  Color _getDifficultyColor(String difficulty) {
    switch (difficulty.toLowerCase()) {
      case 'easy':
      case 'kolay':
        return Colors.green;
      case 'medium':
      case 'orta':
        return Colors.orange;
      case 'hard':
      case 'zor':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

class _FlipCard extends StatefulWidget {
  final String front;
  final String back;
  final String difficulty;
  final bool isDark;

  const _FlipCard({
    Key? key,
    required this.front,
    required this.back,
    required this.difficulty,
    required this.isDark,
  }) : super(key: key);

  @override
  State<_FlipCard> createState() => _FlipCardState();
}

class _FlipCardState extends State<_FlipCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _flipController;
  late Animation<double> _flipAnimation;
  bool _isFlipped = false;

  @override
  void initState() {
    super.initState();
    _flipController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _flipAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _flipController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _flipController.dispose();
    super.dispose();
  }

  void _flip() {
    if (!_isFlipped) {
      _flipController.forward();
    } else {
      _flipController.reverse();
    }
    setState(() {
      _isFlipped = !_isFlipped;
    });
    HapticFeedback.mediumImpact();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _flip,
      child: AnimatedBuilder(
        animation: _flipAnimation,
        builder: (context, child) {
          final isShowingFront = _flipAnimation.value < 0.5;
          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.001)
              ..rotateY(_flipAnimation.value * math.pi),
            child: Container(
              width: double.infinity,
              height: 400,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: isShowingFront
                      ? [
                          widget.isDark
                              ? Colors.white.withValues(alpha: 0.05)
                              : Colors.white,
                          widget.isDark
                              ? Colors.white.withValues(alpha: 0.08)
                              : const Color(0xFFF8FAFC),
                        ]
                      : [
                          const Color(0xFF10B981),
                          const Color(0xFF059669),
                        ],
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: const Color(0xFF10B981).withValues(alpha: 0.2),
                  width: 2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF10B981).withValues(alpha: 0.2),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: isShowingFront ? _buildFront() : _buildBack(),
            ),
          );
        },
      ),
    );
  }

  Widget _buildFront() {
    return Column(
      children: [
        // Zorluk seviyesi
        Align(
          alignment: Alignment.topRight,
          child: Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: _getDifficultyColor(widget.difficulty),
              shape: BoxShape.circle,
            ),
          ),
        ),

        Expanded(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.help_outline,
                color: const Color(0xFF10B981),
                size: 48,
              ),
              const SizedBox(height: 20),
              Text(
                'SORU',
                style: TextStyle(
                  color: const Color(0xFF10B981),
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                widget.front,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      height: 1.5,
                    ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),

        Text(
          'Dokunarak cevaba geç',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppTheme.getSecondaryTextColor(context),
              ),
        ),
      ],
    );
  }

  Widget _buildBack() {
    return Transform(
      alignment: Alignment.center,
      transform: Matrix4.identity()..rotateY(math.pi),
      child: Column(
        children: [
          // Zorluk seviyesi
          Align(
            alignment: Alignment.topRight,
            child: Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.7),
                shape: BoxShape.circle,
              ),
            ),
          ),

          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.lightbulb,
                  color: Colors.white,
                  size: 48,
                ),
                const SizedBox(height: 20),
                Text(
                  'CEVAP',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  widget.back,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    height: 1.5,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),

          Text(
            'Dokunarak soruya dön',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.7),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Color _getDifficultyColor(String difficulty) {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return Colors.green;
      case 'medium':
        return Colors.orange;
      case 'hard':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}
