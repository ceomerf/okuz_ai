import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({Key? key}) : super(key: key);

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;
  late TabController _tabController;

  String _selectedScope = 'Türkiye Geneli';
  bool _isLoading = true;

  final List<String> _scopes = ['Türkiye Geneli', 'Şehrim', 'Okulum'];
  final List<String> _tabTitles = [
    'Haftalık XP',
    'En Uzun Seri',
    'En Çok Soru'
  ];

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _tabController = TabController(length: 3, vsync: this);
    _loadLeaderboardData();
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

  void _loadLeaderboardData() {
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
    _tabController.dispose();
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
                      _buildScopeFilter(isDark),
                      _buildTabBar(isDark),
                      Expanded(
                        child: _isLoading
                            ? _buildLoadingState()
                            : _buildTabBarView(isDark),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
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
                  'Liderlik Tabloları',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.getPrimaryTextColor(context),
                      ),
                ),
                Text(
                  'Rekabet et, gelişim göster',
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
              Icons.emoji_events,
              color: AppTheme.primaryColor,
              size: 24,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScopeFilter(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Icon(
            Icons.tune,
            color: AppTheme.getSecondaryTextColor(context),
            size: 20,
          ),
          const SizedBox(width: 8),
          Text(
            'Kapsam:',
            style: TextStyle(
              color: AppTheme.getSecondaryTextColor(context),
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _scopes.map((scope) {
                  final isSelected = _selectedScope == scope;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(
                        scope,
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
                        setState(() => _selectedScope = scope);
                        _loadLeaderboardData();
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
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar(bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.getCardColor(context),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.1),
        ),
      ),
      child: TabBar(
        controller: _tabController,
        tabs: _tabTitles.map((title) => Tab(text: title)).toList(),
        labelColor: Colors.white,
        unselectedLabelColor: AppTheme.getSecondaryTextColor(context),
        indicator: BoxDecoration(
          color: AppTheme.primaryColor,
          borderRadius: BorderRadius.circular(8),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        indicatorPadding: const EdgeInsets.all(4),
        labelStyle: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
        unselectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.normal,
          fontSize: 12,
        ),
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
            'Liderlik tabloları yükleniyor...',
            style: TextStyle(
              color: AppTheme.getSecondaryTextColor(context),
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBarView(bool isDark) {
    return TabBarView(
      controller: _tabController,
      children: [
        _buildLeaderboardTab(_getWeeklyXPData(), 'XP', isDark),
        _buildLeaderboardTab(_getLongestStreakData(), 'Gün', isDark),
        _buildLeaderboardTab(_getMostQuestionsData(), 'Soru', isDark),
      ],
    );
  }

  Widget _buildLeaderboardTab(
      List<Map<String, dynamic>> data, String unit, bool isDark) {
    if (data.isEmpty) {
      return _buildEmptyState(isDark);
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Podium for top 3
          if (data.length >= 3)
            _buildPodium(data.take(3).toList(), unit, isDark),
          const SizedBox(height: 24),
          // Rest of the list
          Expanded(
            child: _buildLeaderboardList(
              data.length > 3 ? data.sublist(3) : [],
              unit,
              isDark,
              startRank: 4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPodium(
      List<Map<String, dynamic>> topThree, String unit, bool isDark) {
    final first = topThree[0];
    final second = topThree.length > 1 ? topThree[1] : null;
    final third = topThree.length > 2 ? topThree[2] : null;

    return Container(
      height: 180,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // 2nd Place
          if (second != null)
            Expanded(
              child: _buildPodiumItem(
                second,
                2,
                120,
                const Color(0xFF94A3B8),
                unit,
                isDark,
              ),
            ),
          // 1st Place
          Expanded(
            child: _buildPodiumItem(
              first,
              1,
              150,
              const Color(0xFFFBBF24),
              unit,
              isDark,
            ),
          ),
          // 3rd Place
          if (third != null)
            Expanded(
              child: _buildPodiumItem(
                third,
                3,
                100,
                const Color(0xFFCD7F32),
                unit,
                isDark,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPodiumItem(
    Map<String, dynamic> user,
    int rank,
    double height,
    Color color,
    String unit,
    bool isDark,
  ) {
    return Column(
      children: [
        // User Avatar and Info
        Column(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [color, color.withValues(alpha: 0.8)],
                ),
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white,
                  width: 3,
                ),
                boxShadow: [
                  BoxShadow(
                    color: color.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Center(
                child: Text(
                  user['name'][0].toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              user['name'],
              style: TextStyle(
                color: AppTheme.getPrimaryTextColor(context),
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              '${user['score']} $unit',
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        // Podium Base
        Container(
          height: height,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [color, color.withValues(alpha: 0.8)],
            ),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(8),
              topRight: Radius.circular(8),
            ),
          ),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  rank == 1 ? Icons.emoji_events : Icons.military_tech,
                  color: Colors.white,
                  size: 32,
                ),
                const SizedBox(height: 8),
                Text(
                  rank.toString(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLeaderboardList(
      List<Map<String, dynamic>> users, String unit, bool isDark,
      {int startRank = 4}) {
    if (users.isEmpty) {
      return const SizedBox.shrink();
    }

    return ListView.builder(
      itemCount: users.length,
      itemBuilder: (context, index) {
        final user = users[index];
        final rank = startRank + index;
        return _buildLeaderboardItem(user, rank, unit, isDark);
      },
    );
  }

  Widget _buildLeaderboardItem(
    Map<String, dynamic> user,
    int rank,
    String unit,
    bool isDark,
  ) {
    final isCurrentUser = user['isCurrentUser'] ?? false;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isCurrentUser
            ? AppTheme.primaryColor.withValues(alpha: 0.1)
            : AppTheme.getCardColor(context),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isCurrentUser
              ? AppTheme.primaryColor.withValues(alpha: 0.3)
              : AppTheme.primaryColor.withValues(alpha: 0.1),
          width: isCurrentUser ? 2 : 1,
        ),
        boxShadow: [
          if (!isCurrentUser)
            BoxShadow(
              color: isDark
                  ? Colors.black.withValues(alpha: 0.2)
                  : Colors.grey.withValues(alpha: 0.1),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
        ],
      ),
      child: Row(
        children: [
          // Rank
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: _getRankColor(rank).withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Text(
                rank.toString(),
                style: TextStyle(
                  color: _getRankColor(rank),
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          // Avatar
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.primaryColor,
                  AppTheme.primaryColor.withValues(alpha: 0.8),
                ],
              ),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                user['name'][0].toUpperCase(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          // User Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        user['name'],
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.getPrimaryTextColor(context),
                                ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (isCurrentUser) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          'Sen',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  user['school'] ?? 'Okul bilgisi yok',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.getSecondaryTextColor(context),
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          // Score
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                user['score'].toString(),
                style: TextStyle(
                  color: AppTheme.primaryColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
              Text(
                unit,
                style: TextStyle(
                  color: AppTheme.getSecondaryTextColor(context),
                  fontSize: 12,
                ),
              ),
            ],
          ),
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
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Icon(
              Icons.emoji_events_outlined,
              size: 64,
              color: AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Henüz veri yok',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.getPrimaryTextColor(context),
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Çalışmaya başla ve\nliderlik tablosunda yerini al',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.getSecondaryTextColor(context),
                ),
          ),
        ],
      ),
    );
  }

  Color _getRankColor(int rank) {
    if (rank <= 5) return const Color(0xFFFBBF24); // Gold
    if (rank <= 10) return const Color(0xFF94A3B8); // Silver
    if (rank <= 20) return const Color(0xFFCD7F32); // Bronze
    return AppTheme.getSecondaryTextColor(context);
  }

  // Mock data functions
  List<Map<String, dynamic>> _getWeeklyXPData() {
    return [
      {
        'name': 'Ahmet Yılmaz',
        'score': 2480,
        'school': 'Ankara Fen Lisesi',
        'isCurrentUser': false
      },
      {
        'name': 'Zeynep Kaya',
        'score': 2350,
        'school': 'İstanbul Anadolu Lisesi',
        'isCurrentUser': false
      },
      {
        'name': 'Mehmet Demir',
        'score': 2200,
        'school': 'İzmir Fen Lisesi',
        'isCurrentUser': false
      },
      {
        'name': 'Ayşe Öztürk',
        'score': 2150,
        'school': 'Bursa Anadolu Lisesi',
        'isCurrentUser': true
      },
      {
        'name': 'Can Şahin',
        'score': 2100,
        'school': 'Adana Fen Lisesi',
        'isCurrentUser': false
      },
      {
        'name': 'Elif Çelik',
        'score': 2050,
        'school': 'Antalya Anadolu Lisesi',
        'isCurrentUser': false
      },
      {
        'name': 'Oğuz Aksoy',
        'score': 2000,
        'school': 'Konya Fen Lisesi',
        'isCurrentUser': false
      },
      {
        'name': 'Büşra Yıldız',
        'score': 1950,
        'school': 'Gaziantep Anadolu Lisesi',
        'isCurrentUser': false
      },
    ];
  }

  List<Map<String, dynamic>> _getLongestStreakData() {
    return [
      {
        'name': 'Elif Çelik',
        'score': 45,
        'school': 'Antalya Anadolu Lisesi',
        'isCurrentUser': false
      },
      {
        'name': 'Mehmet Demir',
        'score': 42,
        'school': 'İzmir Fen Lisesi',
        'isCurrentUser': false
      },
      {
        'name': 'Ayşe Öztürk',
        'score': 38,
        'school': 'Bursa Anadolu Lisesi',
        'isCurrentUser': true
      },
      {
        'name': 'Ahmet Yılmaz',
        'score': 35,
        'school': 'Ankara Fen Lisesi',
        'isCurrentUser': false
      },
      {
        'name': 'Zeynep Kaya',
        'score': 32,
        'school': 'İstanbul Anadolu Lisesi',
        'isCurrentUser': false
      },
      {
        'name': 'Can Şahin',
        'score': 28,
        'school': 'Adana Fen Lisesi',
        'isCurrentUser': false
      },
    ];
  }

  List<Map<String, dynamic>> _getMostQuestionsData() {
    return [
      {
        'name': 'Can Şahin',
        'score': 1250,
        'school': 'Adana Fen Lisesi',
        'isCurrentUser': false
      },
      {
        'name': 'Ayşe Öztürk',
        'score': 1180,
        'school': 'Bursa Anadolu Lisesi',
        'isCurrentUser': true
      },
      {
        'name': 'Büşra Yıldız',
        'score': 1150,
        'school': 'Gaziantep Anadolu Lisesi',
        'isCurrentUser': false
      },
      {
        'name': 'Zeynep Kaya',
        'score': 1100,
        'school': 'İstanbul Anadolu Lisesi',
        'isCurrentUser': false
      },
      {
        'name': 'Mehmet Demir',
        'score': 1050,
        'school': 'İzmir Fen Lisesi',
        'isCurrentUser': false
      },
      {
        'name': 'Ahmet Yılmaz',
        'score': 1000,
        'school': 'Ankara Fen Lisesi',
        'isCurrentUser': false
      },
      {
        'name': 'Elif Çelik',
        'score': 950,
        'school': 'Antalya Anadolu Lisesi',
        'isCurrentUser': false
      },
    ];
  }
}
