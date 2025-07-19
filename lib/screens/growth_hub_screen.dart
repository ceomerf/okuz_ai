import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../services/study_tracking_service.dart';

class GrowthHubScreen extends StatefulWidget {
  const GrowthHubScreen({super.key});

  @override
  State<GrowthHubScreen> createState() => _GrowthHubScreenState();
}

class _GrowthHubScreenState extends State<GrowthHubScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  final StudyTrackingService _studyTrackingService = StudyTrackingService();

  // Sıralama filtresi
  String _selectedFilter = 'Haftalık XP';
  final List<String> _filterOptions = [
    'Haftalık XP',
    'Toplam XP',
    'Streak',
    'Çalışma Süresi'
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutBack,
    ));
    _animationController.forward();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  // Kullanıcı profil ve gamification stream
  Stream<DocumentSnapshot> _getUserProfileStream() {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return const Stream.empty();

    return FirebaseFirestore.instance
        .collection('users')
        .doc(user.uid)
        .collection('privateProfile')
        .doc('profile')
        .snapshots();
  }

  Stream<DocumentSnapshot> _getGamificationStream() {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return const Stream.empty();

    return FirebaseFirestore.instance
        .collection('users')
        .doc(user.uid)
        .collection('gamification')
        .doc('data')
        .snapshots();
  }

  // Haftalık çalışma verileri stream
  Stream<List<int>> _getWeeklyStudyDataStream() {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return Stream.value([0, 0, 0, 0, 0, 0, 0]);

    return Stream.fromFuture(_getWeeklyStudyData());
  }

  Future<List<int>> _getWeeklyStudyData() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return [0, 0, 0, 0, 0, 0, 0];

    final now = DateTime.now();
    List<int> weeklyData = [];

    for (int i = 6; i >= 0; i--) {
      final date = now.subtract(Duration(days: i));
      final dateStr =
          '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

      try {
        final daySnapshot = await FirebaseFirestore.instance
            .collection('users')
            .doc(user.uid)
            .collection('analytics')
            .doc('daily_logs')
            .collection('sessions')
            .where('date', isEqualTo: dateStr)
            .get();

        int dayTotal = 0;
        for (var doc in daySnapshot.docs) {
          dayTotal += (doc.data()['durationInMinutes'] as int? ?? 0);
        }
        weeklyData.add(dayTotal);
      } catch (e) {
        weeklyData.add(0);
      }
    }

    return weeklyData;
  }

  // Son aktiviteler stream
  Stream<List<Map<String, dynamic>>> _getRecentActivitiesStream() {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return Stream.value([]);

    final now = DateTime.now();
    final weekAgo = now.subtract(const Duration(days: 7));
    final weekAgoStr =
        '${weekAgo.year}-${weekAgo.month.toString().padLeft(2, '0')}-${weekAgo.day.toString().padLeft(2, '0')}';
    final todayStr =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';

    return FirebaseFirestore.instance
        .collection('users')
        .doc(user.uid)
        .collection('analytics')
        .doc('daily_logs')
        .collection('sessions')
        .where('date', isGreaterThanOrEqualTo: weekAgoStr)
        .where('date', isLessThanOrEqualTo: todayStr)
        .orderBy('date', descending: true)
        .orderBy('timestamp', descending: true)
        .limit(10)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => {'id': doc.id, ...doc.data()}).toList());
  }

  // Performance analytics stream
  Stream<DocumentSnapshot> _getPerformanceAnalyticsStream() {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null || user.uid.isEmpty) return const Stream.empty();

    // Document değil collection/doc path kullan
    final path = 'users/${user.uid}/performance_analytics/summary';
    if (path.isEmpty || !path.contains(user.uid) || user.uid.isEmpty) {
      return const Stream.empty();
    }

    try {
      return FirebaseFirestore.instance.doc(path).snapshots();
    } catch (e) {
      print('Performance analytics stream hatası: $e');
      return const Stream.empty();
    }
  }

  // Global leaderboard stream - tüm kullanıcıları XP'ye göre sıralar
  Stream<List<Map<String, dynamic>>> _getGlobalLeaderboardStream() {
    try {
      // Stream.periodic yerine tek seferlik Future stream'i kullan
      return Stream.fromFuture(_fetchGlobalLeaderboard()).handleError((error) {
        print('Global leaderboard stream hatası: $error');
        return <Map<String, dynamic>>[];
      });
    } catch (e) {
      print('Global leaderboard stream hatası: $e');
      return Stream.value([]);
    }
  }

  // Firebase Functions'dan global leaderboard verisi çek
  Future<List<Map<String, dynamic>>> _fetchGlobalLeaderboard() async {
    try {
      final callable =
          FirebaseFunctions.instance.httpsCallable('getGlobalLeaderboard');
      final result = await callable.call({'limit': 100});

      if (result.data['success'] == true) {
        final List<dynamic> rawData = result.data['leaderboard'] ?? [];
        return rawData.map((item) => Map<String, dynamic>.from(item)).toList();
      }
      return [];
    } catch (e) {
      print('Global leaderboard fetch hatası: $e');
      // Firebase Functions henüz deploy edilmediği için geçici mock data
      final mockData = _getMockLeaderboardData();
      print('Mock data döndürülüyor: ${mockData.length} kullanıcı');
      return mockData;
    }
  }

  // Geçici mock data - tüm kullanıcı tiplerini göstermek için
  List<Map<String, dynamic>> _getMockLeaderboardData() {
    final currentUser = FirebaseAuth.instance.currentUser;
    return [
      {
        'userId': 'user1',
        'userName': 'Ahmet Yılmaz',
        'xp': 2850,
        'level': 12,
        'avatarUrl': null,
      },
      {
        'userId': 'user2',
        'userName': 'Zeynep Kaya',
        'xp': 2750,
        'level': 11,
        'avatarUrl': null,
      },
      {
        'userId': 'user3',
        'userName': 'Mehmet Demir',
        'xp': 2650,
        'level': 10,
        'avatarUrl': null,
      },
      {
        'userId': currentUser?.uid ?? 'current_user',
        'userName': 'Sen',
        'xp': 1200,
        'level': 6,
        'avatarUrl': null,
      },
      {
        'userId': 'user4',
        'userName': 'Ayşe Özkan',
        'xp': 950,
        'level': 5,
        'avatarUrl': null,
      },
      {
        'userId': 'user5',
        'userName': 'Emre Şahin',
        'xp': 750,
        'level': 4,
        'avatarUrl': null,
      },
      {
        'userId': 'user6',
        'userName': 'Fatma Arslan',
        'xp': 650,
        'level': 3,
        'avatarUrl': null,
      },
      {
        'userId': 'user7',
        'userName': 'Can Polat',
        'xp': 450,
        'level': 2,
        'avatarUrl': null,
      },
      {
        'userId': 'user8',
        'userName': 'Selin Avcı',
        'xp': 250,
        'level': 1,
        'avatarUrl': null,
      },
      {
        'userId': 'user9',
        'userName': 'Burak Çelik',
        'xp': 150,
        'level': 1,
        'avatarUrl': null,
      },
      {
        'userId': 'user10',
        'userName': 'Deniz Yıldız',
        'xp': 50,
        'level': 1,
        'avatarUrl': null,
      },
      {
        'userId': 'user11',
        'userName': 'Yeni Kullanıcı',
        'xp': 0,
        'level': 1,
        'avatarUrl': null,
      },
    ];
  }

  Widget _buildLeaderboardLoading(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
          ),
          const SizedBox(height: 16),
          Text(
            'Sıralama yükleniyor...',
            style: GoogleFonts.figtree(
              fontSize: 16,
              color: isDark
                  ? AppTheme.darkTextSecondaryColor
                  : AppTheme.lightTextSecondaryColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyLeaderboard(bool isDark) {
    return Center(
      child: Container(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Animasyonlu İkon
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppTheme.primaryColor.withOpacity(0.1),
                    AppTheme.primaryColor.withOpacity(0.05),
                  ],
                ),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.emoji_events_outlined,
                size: 64,
                color: AppTheme.primaryColor.withOpacity(0.6),
              ),
            )
                .animate()
                .fadeIn(duration: 800.ms)
                .scale(begin: const Offset(0.5, 0.5), duration: 600.ms),
            const SizedBox(height: 24),
            Text(
              'Henüz kimse yok! 🏆',
              style: GoogleFonts.figtree(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: isDark
                    ? AppTheme.darkTextPrimaryColor
                    : AppTheme.lightTextPrimaryColor,
              ),
            )
                .animate()
                .fadeIn(duration: 800.ms, delay: 200.ms)
                .slideY(begin: 0.3, end: 0),
            const SizedBox(height: 12),
            Text(
              'İlk sen ol ve sıralamada yerini al!\nÇalışma başladığında burada diğer öğrencilerle yarışabilirsin.',
              style: GoogleFonts.figtree(
                fontSize: 16,
                height: 1.5,
                color: isDark
                    ? AppTheme.darkTextSecondaryColor
                    : AppTheme.lightTextSecondaryColor,
              ),
              textAlign: TextAlign.center,
            )
                .animate()
                .fadeIn(duration: 800.ms, delay: 400.ms)
                .slideY(begin: 0.3, end: 0),
            const SizedBox(height: 32),
            // Call to action button
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    AppTheme.primaryColor,
                    AppTheme.primaryColor.withOpacity(0.8),
                  ],
                ),
                borderRadius: BorderRadius.circular(25),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryColor.withOpacity(0.3),
                    blurRadius: 15,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.rocket_launch,
                    color: Colors.white,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Çalışmaya Başla',
                    style: GoogleFonts.figtree(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 800.ms, delay: 600.ms).scale(
                begin: const Offset(0.8, 0.8), duration: 400.ms, delay: 600.ms),
          ],
        ),
      ),
    );
  }

  Widget _buildGlobalPodium(List<Map<String, dynamic>> topUsers, bool isDark) {
    if (topUsers.isEmpty) return const SizedBox.shrink();

    return Container(
      height: 200,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Stack(
        children: [
          // Arka plan efektleri
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.amber.withOpacity(0.1),
                    Colors.transparent,
                  ],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          ),
          // Podyum
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // 2. Sıra
              if (topUsers.length > 1)
                _buildAnimatedPodiumPlace(2, topUsers[1], isDark, 400.ms),
              // 1. Sıra
              if (topUsers.isNotEmpty)
                _buildAnimatedPodiumPlace(1, topUsers[0], isDark, 200.ms),
              // 3. Sıra
              if (topUsers.length > 2)
                _buildAnimatedPodiumPlace(3, topUsers[2], isDark, 600.ms),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAnimatedPodiumPlace(
      int place, Map<String, dynamic> userData, bool isDark, Duration delay) {
    final colors = [Colors.amber, Colors.grey[400]!, Colors.orange[600]!];
    final heights = [140.0, 120.0, 100.0];
    final icons = [Icons.emoji_events, Icons.star, Icons.workspace_premium];
    final gradients = [
      [Colors.amber, Colors.yellow[700]!],
      [Colors.grey[300]!, Colors.grey[500]!],
      [Colors.orange[400]!, Colors.orange[700]!],
    ];

    final userName = userData['userName'] ?? 'Kullanıcı';
    final xp = userData['xp'] ?? 0;
    final level = userData['level'] ?? 1;

    return Column(
      children: [
        // Avatar ve bilgiler
        Container(
          width: 90,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: gradients[place - 1],
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: colors[place - 1].withOpacity(0.4),
                blurRadius: 15,
                offset: const Offset(0, 8),
                spreadRadius: 2,
              ),
            ],
          ),
          child: Column(
            children: [
              // Crown/Trophy Icon
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icons[place - 1],
                  size: 28,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 12),
              // Kullanıcı adı
              Text(
                userName.length > 10
                    ? '${userName.substring(0, 10)}...'
                    : userName,
                style: GoogleFonts.figtree(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 6),
              // XP Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${xp} XP',
                  style: GoogleFonts.figtree(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              // Level
              Text(
                'Seviye $level',
                style: GoogleFonts.figtree(
                  fontSize: 10,
                  color: Colors.white70,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Podyum tabanı
        Container(
          height: heights[place - 1],
          width: 80,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                colors[place - 1],
                colors[place - 1].withOpacity(0.7),
              ],
            ),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(12),
              topRight: Radius.circular(12),
            ),
            boxShadow: [
              BoxShadow(
                color: colors[place - 1].withOpacity(0.3),
                blurRadius: 10,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Stack(
            children: [
              // Shimmer efekti
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(12),
                      topRight: Radius.circular(12),
                    ),
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Colors.white.withOpacity(0.1),
                        Colors.transparent,
                        Colors.white.withOpacity(0.1),
                      ],
                    ),
                  ),
                ),
              ),
              // Sıra numarası
              Center(
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: Center(
                    child: Text(
                      '$place',
                      style: GoogleFonts.figtree(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    )
        .animate()
        .fadeIn(duration: 600.ms, delay: delay)
        .slideY(begin: 0.5, end: 0, duration: 800.ms, delay: delay)
        .scale(
            begin: const Offset(0.8, 0.8),
            end: const Offset(1.0, 1.0),
            duration: 600.ms,
            delay: delay);
  }

  Widget _buildLeaderboardItem(
    Map<String, dynamic> userData,
    int rank,
    bool isCurrentUser,
    bool isDark,
  ) {
    final userName = userData['userName'] ?? 'Kullanıcı';
    final xp = userData['xp'] ?? 0;
    final level = userData['level'] ?? 1;

    // Renk şemaları
    final rankColors = [
      Colors.amber,
      Colors.grey[400]!,
      Colors.orange[600]!,
    ];

    final isTopThree = rank <= 3;
    final rankColor = isTopThree ? rankColors[rank - 1] : AppTheme.primaryColor;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        gradient: isCurrentUser
            ? LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [
                  AppTheme.primaryColor.withOpacity(0.1),
                  AppTheme.primaryColor.withOpacity(0.05),
                ],
              )
            : null,
        color: !isCurrentUser
            ? (isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor)
            : null,
        borderRadius: BorderRadius.circular(20),
        border: isCurrentUser
            ? Border.all(color: AppTheme.primaryColor, width: 2)
            : null,
        boxShadow: [
          BoxShadow(
            color: isCurrentUser
                ? AppTheme.primaryColor.withOpacity(0.2)
                : Colors.black.withOpacity(0.08),
            blurRadius: isCurrentUser ? 15 : 10,
            offset: const Offset(0, 5),
            spreadRadius: isCurrentUser ? 2 : 0,
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            // Kullanıcı profiline git veya detayları göster
            HapticFeedback.lightImpact();
          },
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Rank Badge
                Stack(
                  children: [
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            rankColor,
                            rankColor.withOpacity(0.7),
                          ],
                        ),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: rankColor.withOpacity(0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          '$rank',
                          style: GoogleFonts.figtree(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    // Top 3 için crown efekti
                    if (isTopThree)
                      Positioned(
                        top: -5,
                        right: -5,
                        child: Container(
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: rankColor.withOpacity(0.3),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Icon(
                            rank == 1
                                ? Icons.emoji_events
                                : rank == 2
                                    ? Icons.star
                                    : Icons.workspace_premium,
                            size: 12,
                            color: rankColor,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 16),
                // Avatar
                Hero(
                  tag: 'avatar_${userData['userId']}',
                  child: Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          AppTheme.primaryColor,
                          AppTheme.primaryColor.withOpacity(0.7),
                        ],
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primaryColor.withOpacity(0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        userName.isNotEmpty ? userName[0].toUpperCase() : '?',
                        style: GoogleFonts.figtree(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
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
                              userName,
                              style: GoogleFonts.figtree(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: isCurrentUser
                                    ? AppTheme.primaryColor
                                    : (isDark
                                        ? AppTheme.darkTextPrimaryColor
                                        : AppTheme.lightTextPrimaryColor),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (isCurrentUser)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryColor,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                'SEN',
                                style: GoogleFonts.figtree(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.amber.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.star,
                                  size: 14,
                                  color: Colors.amber[700],
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Seviye $level',
                                  style: GoogleFonts.figtree(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.amber[700],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                // XP Badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        AppTheme.primaryColor.withOpacity(0.2),
                        AppTheme.primaryColor.withOpacity(0.1),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppTheme.primaryColor.withOpacity(0.3),
                      width: 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '$xp',
                        style: GoogleFonts.figtree(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                      Text(
                        'XP',
                        style: GoogleFonts.figtree(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.primaryColor.withOpacity(0.7),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 400.ms, delay: (rank * 50).ms)
        .slideX(begin: 0.3, end: 0, duration: 600.ms, delay: (rank * 50).ms);
  }

  Color _getRankColor(int rank) {
    if (rank == 1) return Colors.amber;
    if (rank == 2) return Colors.grey;
    if (rank == 3) return Colors.orange;
    return AppTheme.primaryColor;
  }

  String _getEmpathicTitle(
      Map<String, dynamic>? gamificationData, String? userName) {
    final completedTasks = gamificationData?['completedTasksThisWeek'] ?? 0;

    if (completedTasks > 5) {
      return 'Bu Hafta Harikasın, ${userName ?? ''}!';
    } else if (completedTasks > 0) {
      return 'Güzel bir başlangıç, ${userName ?? ''}!';
    } else {
      return 'Merhaba ${userName ?? ''}! Çalışmaya başlamaya hazır mısın?';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor:
          isDark ? AppTheme.darkBackgroundColor : AppTheme.lightBackgroundColor,
      appBar: AppBar(
        backgroundColor:
            isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
        elevation: 0,
        title: Text(
          'Gelişim Merkezi',
          style: GoogleFonts.figtree(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: isDark
                ? AppTheme.darkTextPrimaryColor
                : AppTheme.lightTextPrimaryColor,
          ),
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryColor,
          unselectedLabelColor: isDark
              ? AppTheme.darkTextSecondaryColor
              : AppTheme.lightTextSecondaryColor,
          indicatorColor: AppTheme.primaryColor,
          indicatorWeight: 3,
          labelStyle: GoogleFonts.figtree(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: GoogleFonts.figtree(
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
          tabs: const [
            Tab(text: 'Genel Bakış'),
            Tab(text: 'Dersler'),
            Tab(text: 'Sıralamalar'),
            Tab(text: 'Rozetler'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOverviewTab(isDark),
          _buildSubjectsTab(isDark),
          _buildLeaderboardTab(isDark),
          _buildBadgesTab(isDark),
        ],
      ),
    );
  }

  Widget _buildOverviewTab(bool isDark) {
    return StreamBuilder<DocumentSnapshot>(
      stream: _getUserProfileStream(),
      builder: (context, profileSnapshot) {
        return StreamBuilder<DocumentSnapshot>(
          stream: _getGamificationStream(),
          builder: (context, gamificationSnapshot) {
            final profileData =
                profileSnapshot.data?.data() as Map<String, dynamic>?;
            final gamificationData =
                gamificationSnapshot.data?.data() as Map<String, dynamic>?;
            final userName = profileData?['fullName'] ?? 'Kullanıcı';

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
                      color: isDark
                          ? AppTheme.darkCardColor
                          : AppTheme.lightCardColor,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Text(
                          _getEmpathicTitle(gamificationData, userName),
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
                                (gamificationData?['completedTasksThisWeek'] ??
                                        0)
                                    .toString(),
                                Icons.task_alt,
                                isDark,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildStatCard(
                                'Streak',
                                '${gamificationData?['streak'] ?? 0} gün',
                                Icons.local_fire_department,
                                isDark,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildStatCard(
                                'Haftalık XP',
                                (gamificationData?['weeklyXP'] ?? 0).toString(),
                                Icons.star,
                                isDark,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  )
                      .animate()
                      .fadeIn(duration: 600.ms)
                      .slideY(begin: 0.3, end: 0),

                  const SizedBox(height: 20),

                  // Haftalık Çalışma Bar Grafiği
                  StreamBuilder<List<int>>(
                    stream: _getWeeklyStudyDataStream(),
                    builder: (context, snapshot) {
                      final weeklyData = snapshot.data ?? [0, 0, 0, 0, 0, 0, 0];

                      return Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppTheme.darkCardColor
                              : AppTheme.lightCardColor,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.1),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Son 7 Günün Çalışma Süresi',
                              style: GoogleFonts.figtree(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: isDark
                                    ? AppTheme.darkTextPrimaryColor
                                    : AppTheme.lightTextPrimaryColor,
                              ),
                            ),
                            const SizedBox(height: 20),
                            if (weeklyData.every((element) => element == 0))
                              _buildEmptyStateWidget(
                                Icons.bar_chart,
                                'Henüz çalışma verisi yok',
                                'Çalışmaya başladığında grafiğin burada görünecek',
                                isDark,
                              )
                            else
                              SizedBox(
                                height: 200,
                                child: BarChart(
                                  BarChartData(
                                    alignment: BarChartAlignment.spaceAround,
                                    maxY: weeklyData
                                            .reduce((a, b) => a > b ? a : b)
                                            .toDouble() *
                                        1.2,
                                    barTouchData: BarTouchData(
                                      enabled: true,
                                      touchTooltipData: BarTouchTooltipData(
                                        getTooltipItem:
                                            (group, groupIndex, rod, rodIndex) {
                                          const days = [
                                            'Pzt',
                                            'Sal',
                                            'Çar',
                                            'Per',
                                            'Cum',
                                            'Cmt',
                                            'Paz'
                                          ];
                                          return BarTooltipItem(
                                            '${days[group.x]}\n${rod.toY.round()} dk',
                                            GoogleFonts.figtree(
                                              color: Colors.white,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          );
                                        },
                                      ),
                                    ),
                                    titlesData: FlTitlesData(
                                      show: true,
                                      bottomTitles: AxisTitles(
                                        sideTitles: SideTitles(
                                          showTitles: true,
                                          getTitlesWidget: (value, meta) {
                                            const days = [
                                              'Pzt',
                                              'Sal',
                                              'Çar',
                                              'Per',
                                              'Cum',
                                              'Cmt',
                                              'Paz'
                                            ];
                                            return Text(
                                              days[value.toInt()],
                                              style: GoogleFonts.figtree(
                                                fontSize: 12,
                                                color: isDark
                                                    ? AppTheme
                                                        .darkTextSecondaryColor
                                                    : AppTheme
                                                        .lightTextSecondaryColor,
                                              ),
                                            );
                                          },
                                        ),
                                      ),
                                      leftTitles: AxisTitles(
                                        sideTitles: SideTitles(
                                          showTitles: true,
                                          reservedSize: 40,
                                          getTitlesWidget: (value, meta) {
                                            return Text(
                                              '${value.toInt()}dk',
                                              style: GoogleFonts.figtree(
                                                fontSize: 10,
                                                color: isDark
                                                    ? AppTheme
                                                        .darkTextSecondaryColor
                                                    : AppTheme
                                                        .lightTextSecondaryColor,
                                              ),
                                            );
                                          },
                                        ),
                                      ),
                                      topTitles: const AxisTitles(
                                          sideTitles:
                                              SideTitles(showTitles: false)),
                                      rightTitles: const AxisTitles(
                                          sideTitles:
                                              SideTitles(showTitles: false)),
                                    ),
                                    gridData: FlGridData(
                                      show: true,
                                      drawVerticalLine: false,
                                      horizontalInterval: 30,
                                      getDrawingHorizontalLine: (value) {
                                        return FlLine(
                                          color: isDark
                                              ? AppTheme.darkDividerColor
                                              : AppTheme.lightDividerColor,
                                          strokeWidth: 1,
                                        );
                                      },
                                    ),
                                    borderData: FlBorderData(show: false),
                                    barGroups: List.generate(7, (index) {
                                      return BarChartGroupData(
                                        x: index,
                                        barRods: [
                                          BarChartRodData(
                                            toY: weeklyData[index].toDouble(),
                                            gradient: LinearGradient(
                                              colors: [
                                                AppTheme.primaryColor,
                                                AppTheme.accentColor,
                                              ],
                                              begin: Alignment.bottomCenter,
                                              end: Alignment.topCenter,
                                            ),
                                            width: 16,
                                            borderRadius:
                                                BorderRadius.circular(4),
                                          ),
                                        ],
                                      );
                                    }),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      )
                          .animate()
                          .fadeIn(duration: 600.ms, delay: 200.ms)
                          .slideY(begin: 0.3, end: 0);
                    },
                  ),

                  const SizedBox(height: 20),

                  // Son Aktiviteler Listesi
                  StreamBuilder<List<Map<String, dynamic>>>(
                    stream: _getRecentActivitiesStream(),
                    builder: (context, snapshot) {
                      final recentSessions = snapshot.data ?? [];

                      return Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppTheme.darkCardColor
                              : AppTheme.lightCardColor,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.1),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Son Aktiviteler',
                                  style: GoogleFonts.figtree(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w600,
                                    color: isDark
                                        ? AppTheme.darkTextPrimaryColor
                                        : AppTheme.lightTextPrimaryColor,
                                  ),
                                ),
                                if (recentSessions.isNotEmpty)
                                  Text(
                                    '${recentSessions.length} aktivite',
                                    style: GoogleFonts.figtree(
                                      fontSize: 12,
                                      color: AppTheme.primaryColor,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            if (recentSessions.isEmpty)
                              _buildEmptyStateWidget(
                                Icons.history,
                                'Henüz çalışma seansı yok',
                                'İlk çalışma seansını başlattığında burada görünecek',
                                isDark,
                              )
                            else
                              ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: recentSessions.take(5).length,
                                separatorBuilder: (context, index) =>
                                    const SizedBox(height: 12),
                                itemBuilder: (context, index) {
                                  final session = recentSessions[index];
                                  return _buildActivityItem(
                                    session['subject'] ?? 'Bilinmeyen Ders',
                                    session['topic'] ?? 'Bilinmeyen Konu',
                                    '${session['durationInMinutes'] ?? 0} dakika',
                                    session['date'] ?? '',
                                    isDark,
                                  );
                                },
                              ),
                          ],
                        ),
                      )
                          .animate()
                          .fadeIn(duration: 600.ms, delay: 400.ms)
                          .slideY(begin: 0.3, end: 0);
                    },
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildSubjectsTab(bool isDark) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null || user.uid.isEmpty) {
      return Center(child: Text('Kullanıcı bulunamadı.'));
    }

    // Güvenli path kontrolü - document path olarak düzelt
    final path = 'users/${user.uid}/performance_analytics/summary';
    if (path.isEmpty || !path.contains(user.uid) || user.uid.isEmpty) {
      return Center(child: Text('Performans verisi bulunamadı.'));
    }

    // Firestore document path kontrolü
    try {
      final docRef = FirebaseFirestore.instance.doc(path);
      return StreamBuilder<DocumentSnapshot>(
        stream: docRef.snapshots(),
        builder: (context, snapshot) {
          if (!snapshot.hasData || snapshot.data == null) {
            return Center(child: Text('Performans verisi bulunamadı.'));
          }
          final analyticsData = snapshot.data?.data() as Map<String, dynamic>?;
          final subjectData =
              analyticsData?['timeBySubject'] as Map<String, dynamic>? ?? {};

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Halka Grafik (Zaman Dağılımı)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppTheme.darkCardColor
                        : AppTheme.lightCardColor,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Ders Zaman Dağılımı',
                        style: GoogleFonts.figtree(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? AppTheme.darkTextPrimaryColor
                              : AppTheme.lightTextPrimaryColor,
                        ),
                      ),
                      const SizedBox(height: 20),
                      if (subjectData.isEmpty)
                        _buildEmptyStateWidget(
                          Icons.pie_chart,
                          'Henüz ders verisi yok',
                          'Farklı derslerde çalıştığında dağılım burada görünecek',
                          isDark,
                        )
                      else
                        Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: SizedBox(
                                height: 200,
                                child: PieChart(
                                  PieChartData(
                                    sections:
                                        _createPieChartSections(subjectData),
                                    centerSpaceRadius: 60,
                                    sectionsSpace: 2,
                                    pieTouchData: PieTouchData(
                                      enabled: true,
                                      touchCallback: (FlTouchEvent event,
                                          pieTouchResponse) {
                                        // Touch feedback
                                      },
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 20),
                            Expanded(
                              flex: 1,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children:
                                    _buildPieChartLegend(subjectData, isDark),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.3, end: 0),

                const SizedBox(height: 20),

                // Ders Performansı Bar Grafiği
                if (subjectData.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: isDark
                          ? AppTheme.darkCardColor
                          : AppTheme.lightCardColor,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Ders Performansı',
                          style: GoogleFonts.figtree(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: isDark
                                ? AppTheme.darkTextPrimaryColor
                                : AppTheme.lightTextPrimaryColor,
                          ),
                        ),
                        const SizedBox(height: 20),
                        ...subjectData.entries
                            .map((entry) => _buildSubjectPerformanceBar(
                                  entry.key,
                                  entry.value.toDouble(),
                                  isDark,
                                ))
                            .toList(),
                      ],
                    ),
                  )
                      .animate()
                      .fadeIn(duration: 600.ms, delay: 200.ms)
                      .slideY(begin: 0.3, end: 0),
              ],
            ),
          );
        },
      );
    } catch (e) {
      print('Firestore document path hatası: $e');
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'Performans verisi yüklenirken hata oluştu',
              style: GoogleFonts.figtree(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Lütfen daha sonra tekrar deneyin',
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: Colors.grey[500],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }
  }

  Widget _buildLeaderboardTab(bool isDark) {
    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: _getGlobalLeaderboardStream(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildLeaderboardLoading(isDark);
        }

        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return _buildEmptyLeaderboard(isDark);
        }

        final users = snapshot.data!;
        final currentUser = FirebaseAuth.instance.currentUser;

        // Mevcut kullanıcının pozisyonunu bul
        int currentUserRank = -1;
        Map<String, dynamic>? currentUserData;

        for (int i = 0; i < users.length; i++) {
          final userData = users[i];
          final userId = userData['userId'] ?? '';
          if (currentUser != null && userId == currentUser.uid) {
            currentUserRank = i + 1;
            currentUserData = userData;
            break;
          }
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // Kompakt Filtre Dropdown
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color:
                      isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.filter_list,
                      color: AppTheme.primaryColor,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Sırala:',
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isDark
                            ? AppTheme.darkTextPrimaryColor
                            : AppTheme.lightTextPrimaryColor,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: AppTheme.primaryColor.withOpacity(0.3),
                            width: 1,
                          ),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedFilter,
                            icon: Icon(
                              Icons.keyboard_arrow_down,
                              color: AppTheme.primaryColor,
                              size: 20,
                            ),
                            dropdownColor: isDark
                                ? AppTheme.darkCardColor
                                : AppTheme.lightCardColor,
                            style: GoogleFonts.figtree(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.primaryColor,
                            ),
                            isExpanded: true,
                            items: _filterOptions.map((String filter) {
                              return DropdownMenuItem<String>(
                                value: filter,
                                child: Row(
                                  children: [
                                    Icon(
                                      _getFilterIcon(filter),
                                      size: 16,
                                      color: _selectedFilter == filter
                                          ? AppTheme.primaryColor
                                          : (isDark
                                              ? AppTheme.darkTextSecondaryColor
                                              : AppTheme
                                                  .lightTextSecondaryColor),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      filter,
                                      style: GoogleFonts.figtree(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                        color: _selectedFilter == filter
                                            ? AppTheme.primaryColor
                                            : (isDark
                                                ? AppTheme.darkTextPrimaryColor
                                                : AppTheme
                                                    .lightTextPrimaryColor),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                            onChanged: (String? newValue) {
                              if (newValue != null) {
                                setState(() {
                                  _selectedFilter = newValue;
                                });
                                // Haptic feedback
                                HapticFeedback.selectionClick();
                              }
                            },
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.3, end: 0),

              const SizedBox(height: 20),

              // Top 3 Podyum
              if (users.length >= 3)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppTheme.darkCardColor
                        : AppTheme.lightCardColor,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Top 3 Liderler',
                        style: GoogleFonts.figtree(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? AppTheme.darkTextPrimaryColor
                              : AppTheme.lightTextPrimaryColor,
                        ),
                      ),
                      const SizedBox(height: 20),
                      _buildGlobalPodium(users.take(3).toList(), isDark),
                    ],
                  ),
                )
                    .animate()
                    .fadeIn(duration: 600.ms, delay: 200.ms)
                    .slideY(begin: 0.3, end: 0),

              const SizedBox(height: 20),

              // Kullanıcı Listesi
              Container(
                decoration: BoxDecoration(
                  color:
                      isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          Text(
                            'Genel Sıralama',
                            style: GoogleFonts.figtree(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: isDark
                                  ? AppTheme.darkTextPrimaryColor
                                  : AppTheme.lightTextPrimaryColor,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '${users.length} kullanıcı',
                            style: GoogleFonts.figtree(
                              fontSize: 14,
                              color: isDark
                                  ? AppTheme.darkTextSecondaryColor
                                  : AppTheme.lightTextSecondaryColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: users.length,
                      itemBuilder: (context, index) {
                        final userData = users[index];
                        final userId = userData['userId'] ?? '';
                        final isCurrentUser = userId == currentUser?.uid;

                        return _buildLeaderboardItem(
                          userData,
                          index + 1,
                          isCurrentUser,
                          isDark,
                        );
                      },
                    ),
                  ],
                ),
              )
                  .animate()
                  .fadeIn(duration: 600.ms, delay: 400.ms)
                  .slideY(begin: 0.3, end: 0),

              const SizedBox(height: 20),

              // Mevcut Kullanıcının Pozisyonu
              if (currentUserRank > 10 && currentUserData != null)
                StreamBuilder<DocumentSnapshot>(
                  stream: _getGamificationStream(),
                  builder: (context, gamificationSnapshot) {
                    final gamificationData = gamificationSnapshot.data?.data()
                        as Map<String, dynamic>?;

                    return Container(
                      margin: const EdgeInsets.symmetric(horizontal: 16),
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppTheme.darkCardColor
                            : AppTheme.lightCardColor,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: AppTheme.primaryColor,
                          width: 2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Senin Pozisyonun',
                            style: GoogleFonts.figtree(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: isDark
                                  ? AppTheme.darkTextPrimaryColor
                                  : AppTheme.lightTextPrimaryColor,
                            ),
                          ),
                          const SizedBox(height: 16),
                          if (currentUserData != null)
                            _buildLeaderboardItem(
                              currentUserData,
                              currentUserRank,
                              true,
                              isDark,
                            ),
                        ],
                      ),
                    )
                        .animate()
                        .fadeIn(duration: 600.ms, delay: 400.ms)
                        .slideY(begin: 0.3, end: 0);
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBadgesTab(bool isDark) {
    return StreamBuilder<DocumentSnapshot>(
      stream: _getGamificationStream(),
      builder: (context, snapshot) {
        final gamificationData = snapshot.data?.data() as Map<String, dynamic>?;
        final achievements = _generateAchievements(gamificationData);

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
                  crossAxisCount: 2,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: 1.1,
                ),
                itemCount: achievements.length,
                itemBuilder: (context, index) {
                  final achievement = achievements[index];
                  return _buildBadgeCard(achievement, isDark, index);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  // Başarımlara göre rozetler
  List<Map<String, dynamic>> _generateAchievements(
      Map<String, dynamic>? gamificationData) {
    final totalXP = gamificationData?['totalXP'] ?? 0;
    final weeklyXP = gamificationData?['weeklyXP'] ?? 0;
    final streak = gamificationData?['streak'] ?? 0;
    final completedTasks = gamificationData?['completedTasksThisWeek'] ?? 0;
    final totalStudyMinutes = gamificationData?['totalStudyMinutes'] ?? 0;
    final level = gamificationData?['level'] ?? 1;

    return [
      {
        'id': 'first_study',
        'name': 'İlk Adım',
        'description': 'İlk çalışma seansını tamamla',
        'unlocked': totalStudyMinutes > 0,
        'icon': Icons.play_arrow,
        'color': Colors.green,
        'requirement': '1 çalışma seansı',
      },
      {
        'id': 'daily_goal',
        'name': 'Günlük Hedef',
        'description': 'Günlük hedefini tamamla',
        'unlocked': completedTasks >= 1,
        'icon': Icons.track_changes,
        'color': Colors.blue,
        'requirement': '1 görev tamamla',
      },
      {
        'id': 'week_warrior',
        'name': 'Hafta Savaşçısı',
        'description': '7 gün üst üste çalış',
        'unlocked': streak >= 7,
        'icon': Icons.military_tech,
        'color': Colors.orange,
        'requirement': '7 günlük seri',
      },
      {
        'id': 'focus_master',
        'name': 'Odak Ustası',
        'description': '2 saat kesintisiz çalış',
        'unlocked': totalStudyMinutes >= 120,
        'icon': Icons.psychology,
        'color': Colors.purple,
        'requirement': '120 dakika çalışma',
      },
      {
        'id': 'xp_collector',
        'name': 'XP Koleksiyoneri',
        'description': '1000 XP topla',
        'unlocked': totalXP >= 1000,
        'icon': Icons.star,
        'color': Colors.amber,
        'requirement': '1000 XP',
      },
      {
        'id': 'level_up',
        'name': 'Seviye Atlama',
        'description': '5. seviyeye ulaş',
        'unlocked': level >= 5,
        'icon': Icons.trending_up,
        'color': Colors.red,
        'requirement': '5. seviye',
      },
      {
        'id': 'marathon_runner',
        'name': 'Maraton Koşucusu',
        'description': '10 saat toplam çalış',
        'unlocked': totalStudyMinutes >= 600,
        'icon': Icons.directions_run,
        'color': Colors.teal,
        'requirement': '600 dakika çalışma',
      },
      {
        'id': 'weekly_champion',
        'name': 'Haftalık Şampiyon',
        'description': 'Bir haftada 500 XP kazan',
        'unlocked': weeklyXP >= 500,
        'icon': Icons.emoji_events,
        'color': Colors.deepOrange,
        'requirement': '500 haftalık XP',
      },
      {
        'id': 'consistency_king',
        'name': 'Tutarlılık Kralı',
        'description': '30 gün üst üste çalış',
        'unlocked': streak >= 30,
        'icon': Icons.workspace_premium,
        'color': Colors.indigo,
        'requirement': '30 günlük seri',
      },
      {
        'id': 'task_master',
        'name': 'Görev Ustası',
        'description': 'Bir haftada 10 görev tamamla',
        'unlocked': completedTasks >= 10,
        'icon': Icons.checklist,
        'color': Colors.cyan,
        'requirement': '10 haftalık görev',
      },
      {
        'id': 'xp_legend',
        'name': 'XP Efsanesi',
        'description': '5000 XP topla',
        'unlocked': totalXP >= 5000,
        'icon': Icons.auto_awesome,
        'color': Colors.pink,
        'requirement': '5000 XP',
      },
      {
        'id': 'ultimate_focus',
        'name': 'Nihai Odak',
        'description': '5 saat kesintisiz çalış',
        'unlocked': totalStudyMinutes >= 300,
        'icon': Icons.center_focus_strong,
        'color': Colors.deepPurple,
        'requirement': '300 dakika çalışma',
      },
    ];
  }

  Widget _buildStatCard(
      String title, String value, IconData icon, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.primaryColor.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            size: 24,
            color: AppTheme.primaryColor,
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.figtree(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: GoogleFonts.figtree(
              fontSize: 11,
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

  Widget _buildEmptyStateWidget(
      IconData icon, String title, String subtitle, bool isDark) {
    return Container(
      height: 200,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 48,
              color: isDark
                  ? AppTheme.darkTextLightColor
                  : AppTheme.lightTextLightColor,
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: GoogleFonts.figtree(
                fontSize: 16,
                color: isDark
                    ? AppTheme.darkTextSecondaryColor
                    : AppTheme.lightTextSecondaryColor,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: GoogleFonts.figtree(
                fontSize: 12,
                color: isDark
                    ? AppTheme.darkTextLightColor
                    : AppTheme.lightTextLightColor,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityItem(
      String subject, String topic, String duration, String date, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.primaryColor.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.book,
              color: Colors.white,
              size: 16,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  subject,
                  style: GoogleFonts.figtree(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark
                        ? AppTheme.darkTextPrimaryColor
                        : AppTheme.lightTextPrimaryColor,
                  ),
                ),
                Text(
                  topic,
                  style: GoogleFonts.figtree(
                    fontSize: 12,
                    color: isDark
                        ? AppTheme.darkTextSecondaryColor
                        : AppTheme.lightTextSecondaryColor,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                duration,
                style: GoogleFonts.figtree(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primaryColor,
                ),
              ),
              Text(
                date,
                style: GoogleFonts.figtree(
                  fontSize: 10,
                  color: isDark
                      ? AppTheme.darkTextLightColor
                      : AppTheme.lightTextLightColor,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  List<PieChartSectionData> _createPieChartSections(
      Map<String, dynamic> subjectData) {
    final colors = [
      AppTheme.primaryColor,
      AppTheme.accentColor,
      AppTheme.successColor,
      AppTheme.infoColor,
      AppTheme.warningColor,
      Colors.purple,
      Colors.teal,
      Colors.pink,
    ];

    final total =
        subjectData.values.fold(0.0, (sum, value) => sum + value.toDouble());

    return subjectData.entries.map((entry) {
      final index = subjectData.keys.toList().indexOf(entry.key);
      final percentage = (entry.value.toDouble() / total) * 100;

      return PieChartSectionData(
        color: colors[index % colors.length],
        value: entry.value.toDouble(),
        title: '${percentage.toInt()}%',
        radius: 50,
        titleStyle: GoogleFonts.figtree(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      );
    }).toList();
  }

  List<Widget> _buildPieChartLegend(
      Map<String, dynamic> subjectData, bool isDark) {
    final colors = [
      AppTheme.primaryColor,
      AppTheme.accentColor,
      AppTheme.successColor,
      AppTheme.infoColor,
      AppTheme.warningColor,
      Colors.purple,
      Colors.teal,
      Colors.pink,
    ];

    return subjectData.entries.map((entry) {
      final index = subjectData.keys.toList().indexOf(entry.key);
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Container(
              width: 16,
              height: 16,
              decoration: BoxDecoration(
                color: colors[index % colors.length],
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.key,
                    style: GoogleFonts.figtree(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isDark
                          ? AppTheme.darkTextPrimaryColor
                          : AppTheme.lightTextPrimaryColor,
                    ),
                  ),
                  Text(
                    '${entry.value} dk',
                    style: GoogleFonts.figtree(
                      fontSize: 10,
                      color: isDark
                          ? AppTheme.darkTextSecondaryColor
                          : AppTheme.lightTextSecondaryColor,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }).toList();
  }

  Widget _buildSubjectPerformanceBar(
      String subject, double minutes, bool isDark) {
    final maxMinutes = 300.0; // 5 saat maksimum
    final percentage = (minutes / maxMinutes).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                subject,
                style: GoogleFonts.figtree(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark
                      ? AppTheme.darkTextPrimaryColor
                      : AppTheme.lightTextPrimaryColor,
                ),
              ),
              Text(
                '${minutes.toInt()} dk',
                style: GoogleFonts.figtree(
                  fontSize: 12,
                  color: AppTheme.primaryColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: percentage,
            backgroundColor: AppTheme.primaryColor.withOpacity(0.2),
            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
            minHeight: 8,
          ),
        ],
      ),
    );
  }

  // Filtre ikon seçici
  IconData _getFilterIcon(String filter) {
    switch (filter) {
      case 'Haftalık XP':
        return Icons.date_range;
      case 'Toplam XP':
        return Icons.star;
      case 'Streak':
        return Icons.local_fire_department;
      case 'Çalışma Süresi':
        return Icons.access_time;
      default:
        return Icons.filter_list;
    }
  }

  Widget _buildFilterChip(String label, bool isDark) {
    final isSelected = _selectedFilter == label;

    return FilterChip(
      label: Text(
        label,
        style: GoogleFonts.figtree(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: isSelected
              ? Colors.white
              : (isDark
                  ? AppTheme.darkTextSecondaryColor
                  : AppTheme.lightTextSecondaryColor),
        ),
      ),
      selected: isSelected,
      selectedColor: AppTheme.primaryColor,
      backgroundColor:
          isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
      checkmarkColor: Colors.white,
      onSelected: (bool selected) {
        setState(() {
          _selectedFilter = label;
        });
      },
    );
  }

  Widget _buildPodium(Map<String, dynamic>? gamificationData, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildOldPodiumPlace(
            2, 'Sen', gamificationData?['weeklyXP'] ?? 0, isDark),
        _buildOldPodiumPlace(
            1, 'Sen', gamificationData?['weeklyXP'] ?? 0, isDark),
        _buildOldPodiumPlace(
            3, 'Sen', gamificationData?['weeklyXP'] ?? 0, isDark),
      ],
    );
  }

  Widget _buildOldPodiumPlace(int place, String name, int xp, bool isDark) {
    final colors = [Colors.amber, Colors.grey, Colors.orange];
    final heights = [100.0, 120.0, 80.0];
    final icons = [Icons.emoji_events, Icons.star, Icons.workspace_premium];

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: colors[place - 1],
            borderRadius: BorderRadius.circular(50),
          ),
          child: Icon(
            icons[place - 1],
            color: Colors.white,
            size: 24,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          name,
          style: GoogleFonts.figtree(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isDark
                ? AppTheme.darkTextPrimaryColor
                : AppTheme.lightTextPrimaryColor,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          '$xp XP',
          style: GoogleFonts.figtree(
            fontSize: 10,
            color: AppTheme.primaryColor,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          width: 60,
          height: heights[place - 1],
          decoration: BoxDecoration(
            color: colors[place - 1].withOpacity(0.3),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: colors[place - 1],
              width: 2,
            ),
          ),
          child: Center(
            child: Text(
              '$place',
              style: GoogleFonts.figtree(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: colors[place - 1],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatColumn(String title, String value, bool isDark) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.figtree(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppTheme.primaryColor,
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
        ),
      ],
    );
  }

  Widget _buildBadgeCard(
      Map<String, dynamic> achievement, bool isDark, int index) {
    final isUnlocked = achievement['unlocked'] as bool;
    final color = achievement['color'] as Color;

    return GestureDetector(
      onTap: () => _showBadgeDetails(achievement, isDark),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
          borderRadius: BorderRadius.circular(16),
          border: isUnlocked
              ? Border.all(color: color, width: 2)
              : Border.all(
                  color: isDark
                      ? AppTheme.darkDividerColor
                      : AppTheme.lightDividerColor),
          boxShadow: [
            BoxShadow(
              color: isUnlocked
                  ? color.withOpacity(0.3)
                  : Colors.black.withOpacity(0.1),
              blurRadius: isUnlocked ? 15 : 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isUnlocked
                    ? color
                    : (isDark
                        ? AppTheme.darkTextLightColor
                        : AppTheme.lightTextLightColor),
                borderRadius: BorderRadius.circular(50),
              ),
              child: Icon(
                achievement['icon'] as IconData,
                size: 32,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              achievement['name'] as String,
              style: GoogleFonts.figtree(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isUnlocked
                    ? (isDark
                        ? AppTheme.darkTextPrimaryColor
                        : AppTheme.lightTextPrimaryColor)
                    : (isDark
                        ? AppTheme.darkTextSecondaryColor
                        : AppTheme.lightTextSecondaryColor),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: isUnlocked
                    ? color
                    : (isDark
                        ? AppTheme.darkTextLightColor
                        : AppTheme.lightTextLightColor),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                isUnlocked ? 'Kazanıldı' : 'Kilitli',
                style: GoogleFonts.figtree(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      )
          .animate(delay: Duration(milliseconds: 100 * index))
          .fadeIn(duration: 600.ms)
          .slideY(begin: 0.3, end: 0)
          .scale(begin: const Offset(0.8, 0.8)),
    );
  }

  void _showBadgeDetails(Map<String, dynamic> achievement, bool isDark) {
    final isUnlocked = achievement['unlocked'] as bool;
    final color = achievement['color'] as Color;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor:
            isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isUnlocked
                    ? color
                    : (isDark
                        ? AppTheme.darkTextLightColor
                        : AppTheme.lightTextLightColor),
                borderRadius: BorderRadius.circular(50),
              ),
              child: Icon(
                achievement['icon'] as IconData,
                color: Colors.white,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    achievement['name'] as String,
                    style: GoogleFonts.figtree(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: isDark
                          ? AppTheme.darkTextPrimaryColor
                          : AppTheme.lightTextPrimaryColor,
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: isUnlocked
                          ? color
                          : (isDark
                              ? AppTheme.darkTextLightColor
                              : AppTheme.lightTextLightColor),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      isUnlocked ? 'Kazanıldı' : 'Kilitli',
                      style: GoogleFonts.figtree(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              achievement['description'] as String,
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: isDark
                    ? AppTheme.darkTextSecondaryColor
                    : AppTheme.lightTextSecondaryColor,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: AppTheme.primaryColor.withOpacity(0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.flag,
                    color: AppTheme.primaryColor,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Gereksinim: ${achievement['requirement']}',
                    style: GoogleFonts.figtree(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Tamam',
              style: GoogleFonts.figtree(
                color: AppTheme.primaryColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
