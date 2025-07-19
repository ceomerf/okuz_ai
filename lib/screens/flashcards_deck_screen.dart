import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../theme/app_theme.dart';

class FlashcardsDeckScreen extends StatefulWidget {
  const FlashcardsDeckScreen({Key? key}) : super(key: key);

  @override
  State<FlashcardsDeckScreen> createState() => _FlashcardsDeckScreenState();
}

class _FlashcardsDeckScreenState extends State<FlashcardsDeckScreen>
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

  void _loadFlashcardDecks() {
    // Simulate loading delay
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
                        child: _isLoading
                            ? _buildLoadingState()
                            : _buildDecksGrid(isDark),
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
              color: AppTheme.primaryColor.withOpacity(0.1),
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
                color: AppTheme.primaryColor.withOpacity(0.1),
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
                          : AppTheme.primaryColor.withOpacity(0.3),
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

  Widget _buildDecksGrid(bool isDark) {
    final decks = _getFilteredDecks();

    if (decks.isEmpty) {
      return _buildEmptyState(isDark);
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: GridView.builder(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.75,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
        ),
        itemCount: decks.length,
        itemBuilder: (context, index) {
          final deck = decks[index];
          return _buildDeckCard(deck, isDark);
        },
      ),
    );
  }

  Widget _buildDeckCard(Map<String, dynamic> deck, bool isDark) {
    final progressPercentage =
        (deck['studiedCards'] / deck['totalCards'] * 100).round();

    return GestureDetector(
      onTap: () => _openStudySession(deck),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(context),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: _getDifficultyColor(deck['difficulty']).withOpacity(0.3),
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: isDark
                  ? Colors.black.withOpacity(0.3)
                  : Colors.grey.withOpacity(0.1),
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
                      color:
                          _getCategoryColor(deck['category']).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      deck['category'],
                      style: TextStyle(
                        color: _getCategoryColor(deck['category']),
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Icon(
                    deck['isAI'] ? Icons.auto_awesome : Icons.person,
                    color: deck['isAI']
                        ? AppTheme.primaryColor
                        : AppTheme.getSecondaryTextColor(context),
                    size: 16,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Title
              Text(
                deck['title'],
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
                    '${deck['totalCards']} kart',
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
                      color: _getDifficultyColor(deck['difficulty'])
                          .withOpacity(0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      deck['difficulty'],
                      style: TextStyle(
                        color: _getDifficultyColor(deck['difficulty']),
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              // Progress
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'İlerleme',
                        style: TextStyle(
                          color: AppTheme.getSecondaryTextColor(context),
                          fontSize: 12,
                        ),
                      ),
                      Text(
                        '$progressPercentage%',
                        style: TextStyle(
                          color: AppTheme.primaryColor,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  LinearProgressIndicator(
                    value: deck['studiedCards'] / deck['totalCards'],
                    backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                    valueColor:
                        AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                    minHeight: 4,
                  ),
                ],
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
                  child: Text(
                    deck['studiedCards'] == 0 ? 'Başla' : 'Devam Et',
                    style: const TextStyle(
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
              color: AppTheme.primaryColor.withOpacity(0.1),
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

  List<Map<String, dynamic>> _getFilteredDecks() {
    // Mock data - gerçek uygulamada Firestore'dan gelecek
    final decks = [
      {
        'id': '1',
        'title': 'Türev Kuralları Destesi',
        'category': 'Matematik',
        'totalCards': 25,
        'studiedCards': 18,
        'difficulty': 'Orta',
        'isAI': true,
        'createdAt': DateTime.now().subtract(const Duration(days: 3)),
      },
      {
        'id': '2',
        'title': 'Osmanlı Yükselme Dönemi',
        'category': 'Tarih',
        'totalCards': 30,
        'studiedCards': 12,
        'difficulty': 'Kolay',
        'isAI': true,
        'createdAt': DateTime.now().subtract(const Duration(days: 5)),
      },
      {
        'id': '3',
        'title': 'Kimyasal Bağlar',
        'category': 'Kimya',
        'totalCards': 20,
        'studiedCards': 20,
        'difficulty': 'Zor',
        'isAI': false,
        'createdAt': DateTime.now().subtract(const Duration(days: 7)),
      },
      {
        'id': '4',
        'title': 'Hareket Fizik Formülleri',
        'category': 'Fizik',
        'totalCards': 15,
        'studiedCards': 8,
        'difficulty': 'Orta',
        'isAI': true,
        'createdAt': DateTime.now().subtract(const Duration(days: 1)),
      },
      {
        'id': '5',
        'title': 'Hücre Bölünmesi',
        'category': 'Biyoloji',
        'totalCards': 35,
        'studiedCards': 0,
        'difficulty': 'Zor',
        'isAI': true,
        'createdAt': DateTime.now(),
      },
    ];

    var filtered = decks.where((deck) {
      final matchesSearch = deck['title']
          .toString()
          .toLowerCase()
          .contains(_searchQuery.toLowerCase());
      final matchesCategory =
          _selectedCategory == 'Tümü' || deck['category'] == _selectedCategory;

      return matchesSearch && matchesCategory;
    }).toList();

    // Sort by creation date (newest first)
    filtered.sort((a, b) =>
        (b['createdAt'] as DateTime).compareTo(a['createdAt'] as DateTime));

    return filtered;
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'Matematik':
        return const Color(0xFF3B82F6);
      case 'Fizik':
        return const Color(0xFF8B5CF6);
      case 'Kimya':
        return const Color(0xFF10B981);
      case 'Biyoloji':
        return const Color(0xFFEF4444);
      case 'Türkçe':
        return AppTheme.primaryColor;
      case 'Tarih':
        return const Color(0xFFF59E0B);
      case 'Coğrafya':
        return const Color(0xFF06B6D4);
      default:
        return AppTheme.primaryColor;
    }
  }

  Color _getDifficultyColor(String difficulty) {
    switch (difficulty) {
      case 'Kolay':
        return AppTheme.successColor;
      case 'Orta':
        return const Color(0xFFF59E0B);
      case 'Zor':
        return AppTheme.errorColor;
      default:
        return AppTheme.primaryColor;
    }
  }

  void _openStudySession(Map<String, dynamic> deck) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => FlashcardStudyScreen(deckData: deck),
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
class FlashcardStudyScreen extends StatefulWidget {
  final Map<String, dynamic> deckData;

  const FlashcardStudyScreen({Key? key, required this.deckData})
      : super(key: key);

  @override
  State<FlashcardStudyScreen> createState() => _FlashcardStudyScreenState();
}

class _FlashcardStudyScreenState extends State<FlashcardStudyScreen>
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

  void _loadCards() {
    // Mock flashcard data
    _cards = [
      {
        'id': '1',
        'front': 'Türevin tanımı nedir?',
        'back':
            'Bir fonksiyonun belirli bir noktadaki anlık değişim hızıdır. f\'(x) = lim(h→0) [f(x+h) - f(x)] / h',
      },
      {
        'id': '2',
        'front': 'Toplam kuralı nedir?',
        'back':
            '(f + g)\' = f\' + g\'\n\nİki fonksiyonun toplamının türevi, türevlerin toplamına eşittir.',
      },
      {
        'id': '3',
        'front': 'Çarpım kuralı nasıl uygulanır?',
        'back':
            '(f × g)\' = f\' × g + f × g\'\n\nİlk fonksiyonun türevi × ikinci fonksiyon + ilk fonksiyon × ikinci fonksiyonun türevi',
      },
      {
        'id': '4',
        'front': 'Zincir kuralı ne zaman kullanılır?',
        'back':
            'Bileşke fonksiyonların türevini alırken kullanılır.\n\n[f(g(x))]\' = f\'(g(x)) × g\'(x)',
      },
      {
        'id': '5',
        'front': 'x^n\'nin türevi nedir?',
        'back':
            '(x^n)\' = n × x^(n-1)\n\nKuvvet kuralı: üs aşağı iner, bir eksilir.',
      },
    ];
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
                child: _buildCardView(isDark),
              ),
              _buildControlButtons(isDark),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStudyAppBar() {
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
                  widget.deckData['title'],
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.getPrimaryTextColor(context),
                      ),
                ),
                Text(
                  '${_currentCardIndex + 1} / ${_cards.length}',
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
        color: color.withOpacity(0.1),
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
        backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
        valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
        minHeight: 6,
      ),
    );
  }

  Widget _buildCardView(bool isDark) {
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
        itemCount: _cards.length,
        itemBuilder: (context, index) {
          final card = _cards[index];
          return _buildFlashcard(card, isDark);
        },
      ),
    );
  }

  Widget _buildFlashcard(Map<String, dynamic> card, bool isDark) {
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
                  color: AppTheme.primaryColor.withOpacity(0.2),
                  width: 2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: isDark
                        ? Colors.black.withOpacity(0.3)
                        : Colors.grey.withOpacity(0.2),
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
                                : AppTheme.primaryColor.withOpacity(0.1),
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
                            isShowingFront ? card['front'] : card['back'],
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
                        color: AppTheme.primaryColor.withOpacity(0.1),
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
              color: AppTheme.primaryColor.withOpacity(0.1),
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
