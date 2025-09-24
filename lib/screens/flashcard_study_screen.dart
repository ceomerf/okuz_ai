import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:math' as math;
import '../theme/app_theme.dart';
import '../providers/flashcard_provider.dart';
import '../models/flashcard_models.dart';

class FlashcardStudyScreen extends ConsumerStatefulWidget {
  final String setId;
  final String topic;

  const FlashcardStudyScreen({
    Key? key,
    required this.setId,
    required this.topic,
  }) : super(key: key);

  @override
  ConsumerState<FlashcardStudyScreen> createState() =>
      _FlashcardStudyScreenState();
}

class _FlashcardStudyScreenState extends ConsumerState<FlashcardStudyScreen>
    with TickerProviderStateMixin {
  late AnimationController _flipController;
  late Animation<double> _flipAnimation;
  late PageController _pageController;

  int _currentCardIndex = 0;
  bool _isFlipped = false;
  int _correctAnswers = 0;
  int _incorrectAnswers = 0;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _pageController = PageController();
    _loadFlashcardSet();
  }

  void _initializeAnimations() {
    _flipController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _flipAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _flipController,
      curve: Curves.easeInOut,
    ));
  }

  void _loadFlashcardSet() async {
    await ref
        .read(flashcardProvider.notifier)
        .loadFlashcardSetById(widget.setId);
  }

  @override
  void dispose() {
    _flipController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final flashcardState = ref.watch(flashcardProvider);

    return Scaffold(
      backgroundColor: AppTheme.getBackgroundColor(context),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              isDark ? Colors.grey[900]! : Colors.grey[50]!,
              AppTheme.getBackgroundColor(context),
            ],
          ),
        ),
        child: SafeArea(
          child: _buildBody(isDark, flashcardState),
        ),
      ),
    );
  }

  Widget _buildBody(bool isDark, FlashcardState state) {
    if (state is FlashcardLoading) {
      return _buildLoadingState();
    } else if (state is FlashcardSetDetailLoaded) {
      return _buildStudySession(isDark, state.set);
    } else if (state is FlashcardError) {
      return _buildErrorState(state.message);
    } else {
      return _buildLoadingState();
    }
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
          ),
          const SizedBox(height: 16),
          Text(
            'Flashcard\'lar yükleniyor...',
            style: TextStyle(
              color: AppTheme.getSecondaryTextColor(context),
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String message) {
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
            'Hata',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.getPrimaryTextColor(context),
                ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.getSecondaryTextColor(context),
                ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loadFlashcardSet,
            child: const Text('Tekrar Dene'),
          ),
        ],
      ),
    );
  }

  Widget _buildStudySession(bool isDark, FlashcardSet flashcardSet) {
    return Column(
      children: [
        _buildStudyAppBar(flashcardSet),
        _buildProgressBar(flashcardSet.flashcards.length),
        Expanded(
          child: _buildCardView(isDark, flashcardSet.flashcards),
        ),
        _buildControlButtons(isDark, flashcardSet.flashcards),
      ],
    );
  }

  Widget _buildStudyAppBar(FlashcardSet flashcardSet) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          IconButton(
            onPressed: () => _showExitDialog(),
            icon: Icon(
              Icons.close,
              color: AppTheme.getPrimaryTextColor(context),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  flashcardSet.topic,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.getPrimaryTextColor(context),
                      ),
                ),
                Text(
                  '${_currentCardIndex + 1} / ${flashcardSet.flashcards.length}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.getSecondaryTextColor(context),
                      ),
                ),
              ],
            ),
          ),
          // Stats
          Row(
            children: [
              _buildStatChip(
                  Icons.check, _correctAnswers, AppTheme.successColor),
              const SizedBox(width: 8),
              _buildStatChip(
                  Icons.close, _incorrectAnswers, AppTheme.errorColor),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatChip(IconData icon, int count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 14),
          const SizedBox(width: 4),
          Text(
            count.toString(),
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressBar(int totalCards) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: LinearProgressIndicator(
        value: (_currentCardIndex + 1) / totalCards,
        backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
        valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
        minHeight: 6,
      ),
    );
  }

  Widget _buildCardView(bool isDark, List<Flashcard> cards) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: PageView.builder(
        controller: _pageController,
        onPageChanged: (index) {
          setState(() {
            _currentCardIndex = index;
            _isFlipped = false;
          });
          _flipController.reset();
        },
        itemCount: cards.length,
        itemBuilder: (context, index) {
          final card = cards[index];
          return _buildFlashcard(card, isDark);
        },
      ),
    );
  }

  Widget _buildFlashcard(Flashcard card, bool isDark) {
    return GestureDetector(
      onTap: _flipCard,
      child: AnimatedBuilder(
        animation: _flipAnimation,
        builder: (context, child) {
          final isShowingFront = _flipAnimation.value < 0.5;
          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.001)
              ..rotateY(_flipAnimation.value * 3.14159),
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: AppTheme.getCardColor(context),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: AppTheme.primaryColor.withValues(alpha: 0.2),
                  width: 2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: isDark
                        ? Colors.black.withValues(alpha: 0.3)
                        : Colors.grey.withValues(alpha: 0.2),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    // Card type indicator
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: isShowingFront
                                ? const Color(0xFF3B82F6).withOpacity(0.1)
                                : AppTheme.primaryColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                isShowingFront
                                    ? Icons.help_outline
                                    : Icons.lightbulb_outline,
                                color: isShowingFront
                                    ? const Color(0xFF3B82F6)
                                    : AppTheme.primaryColor,
                                size: 16,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                isShowingFront ? 'SORU' : 'CEVAP',
                                style: TextStyle(
                                  color: isShowingFront
                                      ? const Color(0xFF3B82F6)
                                      : AppTheme.primaryColor,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
                        Icon(
                          Icons.touch_app,
                          color: AppTheme.getSecondaryTextColor(context),
                          size: 20,
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                    // Card content
                    Expanded(
                      child: Center(
                        child: Transform(
                          alignment: Alignment.center,
                          transform: Matrix4.identity()
                            ..rotateY(isShowingFront ? 0 : 3.14159),
                          child: Text(
                            isShowingFront ? card.front : card.back,
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(
                                  color: AppTheme.getPrimaryTextColor(context),
                                  height: 1.4,
                                  fontWeight: isShowingFront
                                      ? FontWeight.w600
                                      : FontWeight.normal,
                                ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Flip instruction
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        isShowingFront
                            ? 'Kartı çevirmek için dokunun'
                            : 'Cevabı gördünüz mü?',
                        style: TextStyle(
                          color: AppTheme.primaryColor,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
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
    );
  }

  Widget _buildControlButtons(bool isDark, List<Flashcard> cards) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          if (_isFlipped) ...[
            // Answer feedback buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _markAnswer(false),
                    icon: const Icon(Icons.close),
                    label: const Text('Bilmedim'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.errorColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _markAnswer(true),
                    icon: const Icon(Icons.check),
                    label: const Text('Biliyordum'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.successColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
          // Navigation buttons
          Row(
            children: [
              if (_currentCardIndex > 0)
                IconButton(
                  onPressed: _previousCard,
                  icon: Icon(
                    Icons.arrow_back_ios,
                    color: AppTheme.getPrimaryTextColor(context),
                  ),
                ),
              const Spacer(),
              if (!_isFlipped)
                OutlinedButton(
                  onPressed: _flipCard,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.primaryColor,
                    side: BorderSide(color: AppTheme.primaryColor),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Cevabı Gör'),
                ),
              const Spacer(),
              if (_currentCardIndex < cards.length - 1)
                IconButton(
                  onPressed: _nextCard,
                  icon: Icon(
                    Icons.arrow_forward_ios,
                    color: AppTheme.getPrimaryTextColor(context),
                  ),
                )
              else if (_isFlipped)
                ElevatedButton(
                  onPressed: _finishSession,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Bitir'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  void _flipCard() {
    if (!_isFlipped) {
      _flipController.forward();
      setState(() => _isFlipped = true);
    }
  }

  void _markAnswer(bool isCorrect) {
    setState(() {
      if (isCorrect) {
        _correctAnswers++;
      } else {
        _incorrectAnswers++;
      }
    });
    _nextCard();
  }

  void _nextCard() {
    final state = ref.read(flashcardProvider);
    if (state is FlashcardSetDetailLoaded) {
      if (_currentCardIndex < state.set.flashcards.length - 1) {
        _pageController.nextPage(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
      }
    }
  }

  void _previousCard() {
    if (_currentCardIndex > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _finishSession() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text('Oturum Tamamlandı!'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.celebration,
              size: 64,
              color: Colors.amber,
            ),
            const SizedBox(height: 16),
            Text(
              'Doğru: $_correctAnswers\nYanlış: $_incorrectAnswers',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: const Text('Tamam'),
          ),
        ],
      ),
    );
  }

  void _showExitDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text('Oturumu Bitir'),
        content:
            const Text('Çalışma oturununu bitirmek istediğinize emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Devam Et'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.errorColor,
            ),
            child: const Text('Çık'),
          ),
        ],
      ),
    );
  }
}
