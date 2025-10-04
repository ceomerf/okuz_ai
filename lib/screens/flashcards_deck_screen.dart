import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_theme.dart';
import '../providers/flashcard_provider.dart';
import '../models/flashcard_models.dart';

class FlashcardsDeckScreen extends ConsumerStatefulWidget {
  const FlashcardsDeckScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<FlashcardsDeckScreen> createState() =>
      _FlashcardsDeckScreenState();
}

class _FlashcardsDeckScreenState extends ConsumerState<FlashcardsDeckScreen>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;

  String _searchQuery = '';
  String _selectedCategory = 'Tümü';
  bool _isLoading = true;

  final List<String> _categories = [
    'Tümü',
    'Matematik',
    'Fizik',
    'Kimya',
    'Biyoloji',
    'Türkçe',
    'Tarih',
    'Coğrafya'
  ];

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _loadFlashcardDecks();
  }

  void _initializeAnimations() {
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
    ));
    _slideAnimation = Tween<double>(
      begin: 30.0,
      end: 0.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: const Interval(0.2, 1.0, curve: Curves.easeOutCubic),
    ));
    _animationController.forward();
  }

  void _loadFlashcardDecks() async {
    await ref.read(flashcardProvider.notifier).loadFlashcardSets();
    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
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
          child: AnimatedBuilder(
            animation: _animationController,
            builder: (context, child) {
              return FadeTransition(
                opacity: _fadeAnimation,
                child: Transform.translate(
                  offset: Offset(0, _slideAnimation.value),
                  child: Column(
                    children: [
                      _buildAppBar(isDark),
                      _buildSearchAndFilter(isDark),
                      Expanded(
                        child: _buildDecksGrid(isDark, flashcardState),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
      floatingActionButton: _buildFloatingActionButton(isDark),
    );
  }

  Widget _buildAppBar(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: Icon(
              Icons.arrow_back_ios,
              color: AppTheme.getPrimaryTextColor(context),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Hafıza Kartları',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.getPrimaryTextColor(context),
                      ),
                ),
                Text(
                  'AI destekli akıllı tekrar sistemi',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.getSecondaryTextColor(context),
                      ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.psychology,
              color: AppTheme.primaryColor,
              size: 24,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchAndFilter(bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Search Bar
          Container(
            decoration: BoxDecoration(
              color: AppTheme.getCardColor(context),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                width: 1,
              ),
            ),
            child: TextField(
              onChanged: (value) => setState(() => _searchQuery = value),
              decoration: InputDecoration(
                hintText: 'Kart destesi ara...',
                hintStyle: TextStyle(
                  color: AppTheme.getSecondaryTextColor(context),
                ),
                prefixIcon: Icon(
                  Icons.search,
                  color: AppTheme.getSecondaryTextColor(context),
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.all(16),
              ),
              style: TextStyle(
                color: AppTheme.getPrimaryTextColor(context),
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Category Filter
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _categories.map((category) {
                final isSelected = _selectedCategory == category;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(
                      category,
                      style: TextStyle(
                        color: isSelected
                            ? Colors.white
                            : AppTheme.getPrimaryTextColor(context),
                        fontWeight:
                            isSelected ? FontWeight.w600 : FontWeight.normal,
                        fontSize: 12,
                      ),
                    ),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() => _selectedCategory = category);
                    },
                    backgroundColor: AppTheme.getCardColor(context),
                    selectedColor: AppTheme.primaryColor,
                    side: BorderSide(
                      color: isSelected
                          ? AppTheme.primaryColor
                          : AppTheme.primaryColor.withValues(alpha: 0.3),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
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
            'Hafıza kartları yükleniyor...',
            style: TextStyle(
              color: AppTheme.getSecondaryTextColor(context),
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDecksGrid(bool isDark, FlashcardState state) {
    if (state is FlashcardLoading || _isLoading) {
      return _buildLoadingState();
    } else if (state is FlashcardSetsLoaded) {
      final decks = _getFilteredDecks(state.sets);
      if (decks.isEmpty) {
        return _buildEmptyState(isDark);
      }
      return _buildDecksList(decks, isDark);
    } else if (state is FlashcardError) {
      return _buildErrorState(state.message);
    } else {
      return _buildEmptyState(isDark);
    }
  }

  Widget _buildDecksList(List<FlashcardSetHistory> decks, bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: ListView.builder(
        itemCount: decks.length,
        itemBuilder: (context, index) {
          final deck = decks[index];
          return _buildDeckCard(deck, isDark);
        },
      ),
    );
  }

  Widget _buildDeckCard(FlashcardSetHistory deck, bool isDark) {
    return GestureDetector(
      onTap: () => _openStudySession(deck),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(context),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: _getDifficultyColor(deck.difficulty).withOpacity(0.3),
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: isDark
                  ? Colors.black.withValues(alpha: 0.3)
                  : Colors.grey.withValues(alpha: 0.1),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with category and type
              Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _getCategoryFromTopic(deck.topic),
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Icon(
                    Icons.auto_awesome,
                    color: AppTheme.primaryColor,
                    size: 16,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Title
              Text(
                deck.topic,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.getPrimaryTextColor(context),
                      height: 1.2,
                    ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              // Stats
              Row(
                children: [
                  Icon(
                    Icons.style,
                    color: AppTheme.getSecondaryTextColor(context),
                    size: 14,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${deck.cardCount} kart',
                    style: TextStyle(
                      color: AppTheme.getSecondaryTextColor(context),
                      fontSize: 12,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: _getDifficultyColor(deck.difficulty)
                          .withOpacity(0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      _getDifficultyDisplayName(deck.difficulty),
                      style: TextStyle(
                        color: _getDifficultyColor(deck.difficulty),
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Created date
              Text(
                'Oluşturulma: ${_formatDate(deck.createdAt)}',
                style: TextStyle(
                  color: AppTheme.getSecondaryTextColor(context),
                  fontSize: 11,
                ),
              ),
              const SizedBox(height: 12),
              // Action Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => _openStudySession(deck),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                  child: const Text(
                    'Çalışmaya Başla',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
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
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Icon(
              Icons.style_outlined,
              size: 64,
              color: AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Henüz hafıza kartı yok',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.getPrimaryTextColor(context),
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'AI ile kart oluştur veya\nkendi kartlarını ekle',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.getSecondaryTextColor(context),
                ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => _showCreateDeckDialog(),
            icon: const Icon(Icons.add),
            label: const Text('İlk Desteyi Oluştur'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
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
            onPressed: _loadFlashcardDecks,
            child: const Text('Tekrar Dene'),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingActionButton(bool isDark) {
    return FloatingActionButton.extended(
      heroTag: "flashcards_deck_fab",
      onPressed: () => _showCreateDeckDialog(),
      backgroundColor: AppTheme.primaryColor,
      foregroundColor: Colors.white,
      icon: const Icon(Icons.add),
      label: const Text('Yeni Deste'),
    );
  }

  List<FlashcardSetHistory> _getFilteredDecks(List<FlashcardSetHistory> sets) {
    var filtered = sets.where((deck) {
      final matchesSearch =
          deck.topic.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesCategory = _selectedCategory == 'Tümü' ||
          _getCategoryFromTopic(deck.topic) == _selectedCategory;

      return matchesSearch && matchesCategory;
    }).toList();

    // Sort by creation date (newest first)
    filtered.sort((a, b) => b.createdAt.compareTo(a.createdAt));

    return filtered;
  }

  String _getCategoryFromTopic(String topic) {
    final lowerTopic = topic.toLowerCase();
    if (lowerTopic.contains('matematik') ||
        lowerTopic.contains('türev') ||
        lowerTopic.contains('integral')) {
      return 'Matematik';
    } else if (lowerTopic.contains('fizik') ||
        lowerTopic.contains('hareket') ||
        lowerTopic.contains('kuvvet')) {
      return 'Fizik';
    } else if (lowerTopic.contains('kimya') ||
        lowerTopic.contains('bağ') ||
        lowerTopic.contains('molekül')) {
      return 'Kimya';
    } else if (lowerTopic.contains('biyoloji') ||
        lowerTopic.contains('hücre') ||
        lowerTopic.contains('organ')) {
      return 'Biyoloji';
    } else if (lowerTopic.contains('türkçe') ||
        lowerTopic.contains('dil') ||
        lowerTopic.contains('edebiyat')) {
      return 'Türkçe';
    } else if (lowerTopic.contains('tarih') ||
        lowerTopic.contains('osmanlı') ||
        lowerTopic.contains('cumhuriyet')) {
      return 'Tarih';
    } else if (lowerTopic.contains('coğrafya') ||
        lowerTopic.contains('ülke') ||
        lowerTopic.contains('iklim')) {
      return 'Coğrafya';
    }
    return 'Diğer';
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

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  Color _getDifficultyColor(String difficulty) {
    switch (difficulty) {
      case 'easy':
        return AppTheme.successColor;
      case 'medium':
        return AppTheme.warningColor;
      case 'hard':
        return AppTheme.errorColor;
      default:
        return AppTheme.warningColor;
    }
  }

  void _openStudySession(FlashcardSetHistory deck) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) =>
            FlashcardStudyScreen(setId: deck.id, topic: deck.topic),
      ),
    );
  }

  void _showCreateDeckDialog() {
    showDialog(
      context: context,
      builder: (context) => CreateDeckDialog(),
    );
  }
}

// Study Session Screen with flip animations
class FlashcardStudyScreen extends ConsumerStatefulWidget {
  final String setId;
  final String topic;

  const FlashcardStudyScreen(
      {Key? key, required this.setId, required this.topic})
      : super(key: key);

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
  List<Map<String, dynamic>> _cards = [];
  int _correctAnswers = 0;
  int _incorrectAnswers = 0;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _loadCards();
    _pageController = PageController();
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

  void _loadCards() async {
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
          child: Column(
            children: [
              _buildStudyAppBar(),
              _buildProgressBar(),
              Expanded(
                child: _buildCardView(isDark, flashcardState),
              ),
              _buildControlButtons(isDark),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStudyAppBar() {
    final flashcardState = ref.watch(flashcardProvider);
    int totalCards = 0;

    if (flashcardState is FlashcardSetDetailLoaded) {
      totalCards = flashcardState.set.flashcards.length;
    }

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
                  widget.topic,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.getPrimaryTextColor(context),
                      ),
                ),
                Text(
                  '${_currentCardIndex + 1} / $totalCards',
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

  Widget _buildProgressBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: LinearProgressIndicator(
        value: (_currentCardIndex + 1) / _cards.length,
        backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
        valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
        minHeight: 6,
      ),
    );
  }

  Widget _buildCardView(bool isDark, FlashcardState flashcardState) {
    if (flashcardState is FlashcardLoading) {
      return const Center(child: CircularProgressIndicator());
    } else if (flashcardState is FlashcardError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: AppTheme.errorColor),
            const SizedBox(height: 16),
            Text(
              flashcardState.message,
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.errorColor),
            ),
          ],
        ),
      );
    } else if (flashcardState is FlashcardSetDetailLoaded) {
      final cards = flashcardState.set.flashcards;
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
    } else {
      return const Center(child: Text('Kartlar yüklenemedi'));
    }
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

  Widget _buildControlButtons(bool isDark) {
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
              if (_currentCardIndex < _cards.length - 1)
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
    if (_currentCardIndex < _cards.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
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
            const Text('Çalışma oturumunu bitirmek istediğinize emin misiniz?'),
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

// Create Deck Dialog
class CreateDeckDialog extends StatelessWidget {
  const CreateDeckDialog({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.add_circle,
              color: AppTheme.primaryColor,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          const Text('Yeni Deste Oluştur'),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Nasıl bir deste oluşturmak istiyorsunuz?'),
          const SizedBox(height: 16),
          ListTile(
            leading: Icon(Icons.auto_awesome, color: AppTheme.primaryColor),
            title: const Text('AI ile Oluştur'),
            subtitle: const Text('Konu seçin, AI kartları hazırlasın'),
            onTap: () {
              Navigator.pop(context);
              // Navigate to AI creation
            },
          ),
          ListTile(
            leading: Icon(Icons.edit, color: AppTheme.primaryColor),
            title: const Text('Manuel Oluştur'),
            subtitle: const Text('Kartları kendiniz yazın'),
            onTap: () {
              Navigator.pop(context);
              // Navigate to manual creation
            },
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('İptal'),
        ),
      ],
    );
  }
}
