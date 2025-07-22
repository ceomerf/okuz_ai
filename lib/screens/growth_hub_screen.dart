import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../models/user_account.dart';
import '../theme/app_theme.dart';

class GrowthHubScreen extends StatefulWidget {
  const GrowthHubScreen({Key? key}) : super(key: key);

  @override
  State<GrowthHubScreen> createState() => _GrowthHubScreenState();
}

class _GrowthHubScreenState extends State<GrowthHubScreen>
    with TickerProviderStateMixin {
  final ApiService _apiService = ApiService();

  // State variables
  Map<String, dynamic>? _userData;
  Map<String, dynamic>? _gamificationData;
  List<Map<String, dynamic>> _leaderboardData = [];
  bool _isLoading = true;
  String? _errorMessage;

  // Tab controller
  late TabController _tabController;

  // Filter variables
  String _selectedFilter = 'Haftalık';
  final List<String> _filterOptions = ['Haftalık', 'Aylık', 'Tüm Zamanlar'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  // Veri yükleme
  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final currentUser = Provider.of<UserAccount?>(context, listen: false);
      if (currentUser == null) {
        throw Exception('Kullanıcı oturum açmamış');
      }

      // Paralel olarak verileri yükle
      final results = await Future.wait([
        _apiService.getUser(currentUser.id),
        _apiService.getGamificationData(currentUser.id),
        _apiService.getLeaderboard(),
      ]);

      if (mounted) {
        setState(() {
          _userData = results[0] as Map<String, dynamic>;
          _gamificationData = results[1] as Map<String, dynamic>;
          _leaderboardData = results[2] as List<Map<String, dynamic>>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  // Filtre değiştirme
  void _changeFilter(String newFilter) {
    setState(() {
      _selectedFilter = newFilter;
    });
    _loadData(); // Filtreye göre verileri yeniden yükle
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: AppTheme.getBackgroundColor(context),
      appBar: AppBar(
        title: Text(
          'Büyüme Merkezi',
          style: GoogleFonts.figtree(
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: AppTheme.getBackgroundColor(context),
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Genel Bakış'),
            Tab(text: 'Liderlik'),
            Tab(text: 'Rozetler'),
          ],
        ),
      ),
      body: _isLoading
          ? _buildLoadingState()
          : _errorMessage != null
              ? _buildErrorState()
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOverviewTab(isDark),
                    _buildLeaderboardTab(isDark),
                    _buildBadgesTab(isDark),
                  ],
                ),
    );
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Veriler yükleniyor...'),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.red,
          ),
          const SizedBox(height: 16),
          Text(
            'Hata: $_errorMessage',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.red),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadData,
            child: const Text('Tekrar Dene'),
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewTab(bool isDark) {
    final userName = _userData?['fullName'] ?? 'Kullanıcı';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Empatik Başlık ve Ana İstatistikler
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                Text(
                  _getEmpathicTitle(_gamificationData, userName),
                  style: GoogleFonts.figtree(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: isDark
                        ? AppTheme.darkTextPrimaryColor
                        : AppTheme.lightTextPrimaryColor,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),

                // Ana İstatistikler
                Row(
                  children: [
                    Expanded(
                      child: _buildStatCard(
                        'Haftalık Görevler',
                        (_gamificationData?['completedTasksThisWeek'] ?? 0)
                            .toString(),
                        Icons.task_alt,
                        isDark,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildStatCard(
                        'Streak',
                        '${_gamificationData?['streak'] ?? 0} gün',
                        Icons.local_fire_department,
                        isDark,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildStatCard(
                        'Haftalık XP',
                        (_gamificationData?['weeklyXP'] ?? 0).toString(),
                        Icons.star,
                        isDark,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLeaderboardTab(bool isDark) {
    return Column(
      children: [
        // Filtre seçici
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
            borderRadius: BorderRadius.circular(12),
          ),
          child: DropdownButton<String>(
            value: _selectedFilter,
            items: _filterOptions.map((String option) {
              return DropdownMenuItem<String>(
                value: option,
                child: Text(option),
              );
            }).toList(),
            onChanged: (String? newValue) {
              if (newValue != null) {
                _changeFilter(newValue);
              }
            },
          ),
        ),

        // Liderlik tablosu
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _leaderboardData.length,
            itemBuilder: (context, index) {
              final userData = _leaderboardData[index];
              return _buildLeaderboardItem(userData, index + 1, isDark);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildBadgesTab(bool isDark) {
    final achievements = _generateAchievements(_gamificationData);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Rozetlerim',
            style: GoogleFonts.figtree(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: isDark
                  ? AppTheme.darkTextPrimaryColor
                  : AppTheme.lightTextPrimaryColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${achievements.where((a) => a['unlocked']).length}/${achievements.length} rozet kazanıldı',
            style: GoogleFonts.figtree(
              fontSize: 14,
              color: AppTheme.primaryColor,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 16),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.8,
            ),
            itemCount: achievements.length,
            itemBuilder: (context, index) {
              final achievement = achievements[index];
              return _buildAchievementCard(achievement, isDark);
            },
          ),
        ],
      ),
    );
  }

  // Yardımcı metodlar
  String _getEmpathicTitle(
      Map<String, dynamic>? gamificationData, String userName) {
    final streak = gamificationData?['streak'] ?? 0;
    final weeklyXP = gamificationData?['weeklyXP'] ?? 0;

    if (streak >= 7) {
      return 'Harika gidiyorsun, $userName! 🔥';
    } else if (weeklyXP > 1000) {
      return 'Bu hafta çok verimliydin, $userName! ⭐';
    } else {
      return 'Hoş geldin, $userName! 💪';
    }
  }

  Widget _buildStatCard(
      String title, String value, IconData icon, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppTheme.primaryColor, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.figtree(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark
                  ? AppTheme.darkTextPrimaryColor
                  : AppTheme.lightTextPrimaryColor,
            ),
          ),
          Text(
            title,
            style: GoogleFonts.figtree(
              fontSize: 12,
              color: isDark
                  ? AppTheme.darkTextSecondaryColor
                  : AppTheme.lightTextSecondaryColor,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildLeaderboardItem(
      Map<String, dynamic> userData, int rank, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
        borderRadius: BorderRadius.circular(12),
        border: rank <= 3
            ? Border.all(color: AppTheme.primaryColor, width: 2)
            : null,
      ),
      child: Row(
        children: [
          // Sıralama
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: rank <= 3 ? AppTheme.primaryColor : Colors.grey,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Center(
              child: Text(
                '$rank',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),

          // Kullanıcı bilgileri
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  userData['fullName'] ?? 'Anonim',
                  style: GoogleFonts.figtree(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: isDark
                        ? AppTheme.darkTextPrimaryColor
                        : AppTheme.lightTextPrimaryColor,
                  ),
                ),
                Text(
                  '${userData['totalXP'] ?? 0} XP',
                  style: GoogleFonts.figtree(
                    fontSize: 14,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ],
            ),
          ),

          // Streak
          Text(
            '${userData['streak'] ?? 0} gün',
            style: GoogleFonts.figtree(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Colors.orange,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAchievementCard(Map<String, dynamic> achievement, bool isDark) {
    final isUnlocked = achievement['unlocked'] ?? false;

    return Container(
      decoration: BoxDecoration(
        color: isUnlocked
            ? AppTheme.primaryColor.withValues(alpha: 0.1)
            : Colors.grey.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isUnlocked ? AppTheme.primaryColor : Colors.grey,
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            IconData(achievement['iconCode'] ?? 0, fontFamily: 'MaterialIcons'),
            size: 32,
            color: isUnlocked ? AppTheme.primaryColor : Colors.grey,
          ),
          const SizedBox(height: 8),
          Text(
            achievement['title'] ?? '',
            style: GoogleFonts.figtree(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: isUnlocked
                  ? (isDark
                      ? AppTheme.darkTextPrimaryColor
                      : AppTheme.lightTextPrimaryColor)
                  : Colors.grey,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  List<Map<String, dynamic>> _generateAchievements(
      Map<String, dynamic>? gamificationData) {
    final streak = gamificationData?['streak'] ?? 0;
    final totalXP = gamificationData?['totalXP'] ?? 0;
    final completedTasks = gamificationData?['completedTasks'] ?? 0;

    return [
      {
        'title': 'İlk Adım',
        'iconCode': 0xe3c9, // Icons.emoji_events
        'unlocked': completedTasks >= 1,
      },
      {
        'title': 'Ateşli',
        'iconCode': 0xe3c9, // Icons.local_fire_department
        'unlocked': streak >= 7,
      },
      {
        'title': 'XP Avcısı',
        'iconCode': 0xe3c9, // Icons.star
        'unlocked': totalXP >= 1000,
      },
      {
        'title': 'Görev Ustası',
        'iconCode': 0xe3c9, // Icons.task_alt
        'unlocked': completedTasks >= 50,
      },
      {
        'title': 'Haftalık Şampiyon',
        'iconCode': 0xe3c9, // Icons.emoji_events
        'unlocked': gamificationData?['weeklyRank'] == 1,
      },
      {
        'title': 'Sürekli Öğrenci',
        'iconCode': 0xe3c9, // Icons.school
        'unlocked': streak >= 30,
      },
    ];
  }
}
