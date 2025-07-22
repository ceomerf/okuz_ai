import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../services/mock_auth_service.dart';
import 'dart:async';

class PerformanceDashboardScreen extends StatefulWidget {
  const PerformanceDashboardScreen({super.key});

  @override
  State<PerformanceDashboardScreen> createState() =>
      _PerformanceDashboardScreenState();
}

class _PerformanceDashboardScreenState extends State<PerformanceDashboardScreen>
    with TickerProviderStateMixin {
  String _selectedTimeRange = 'Bu Hafta';
  bool _isLoading = true;
  Map<String, dynamic> _performanceData = {};
  List<Map<String, dynamic>> _activityLogs = [];

  // Animasyon kontrolcüleri
  late AnimationController _fadeController;
  late AnimationController _slideController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();

    // Animasyon kontrolcülerini başlat
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOutCubic,
    ));

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutCubic,
    ));

    _loadPerformanceData();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  Future<void> _loadPerformanceData() async {
    setState(() => _isLoading = true);

    try {
      final authService = Provider.of<MockAuthService>(context, listen: false);
      final user = authService.currentUser;
      if (user != null) {
        await _loadAnalyticsData(user.id);
        await _loadActivityLogs(user.id);
      }
    } catch (e) {
      debugPrint('Performans verisi yükleme hatası: $e');
    } finally {
      setState(() => _isLoading = false);
      _fadeController.forward();
      _slideController.forward();
    }
  }

  Future<void> _loadAnalyticsData(String userId) async {
    // Mock implementation - gerçek uygulamada veri yüklenecek
    await Future.delayed(Duration(milliseconds: 500));
    _performanceData = {
      'totalStudyTime': 120,
      'averageScore': 85,
      'streak': 7,
      'completedTasks': 45,
    };
  }

  Future<void> _loadActivityLogs(String userId) async {
    // Mock implementation - gerçek uygulamada veri yüklenecek
    await Future.delayed(Duration(milliseconds: 300));
    setState(() {
      _activityLogs = [
        {
          'id': '1',
          'activity': 'Matematik çalışması',
          'duration': 45,
          'timestamp': DateTime.now().subtract(Duration(hours: 2)),
        },
        {
          'id': '2',
          'activity': 'Fizik testi',
          'duration': 30,
          'timestamp': DateTime.now().subtract(Duration(hours: 4)),
        },
      ];
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.background,
      body: _isLoading
          ? _buildLoadingScreen()
          : CustomScrollView(
              slivers: [
                // SliverAppBar
                _buildSliverAppBar(),

                // Genel Bakış Kartları
                _buildOverviewCards(),

                // Haftalık Çalışma Dağılımı
                _buildWeeklyWorkDistribution(),

                // Derslere Göre Zaman Dağılımı
                _buildSubjectTimeDistribution(),

                // Detaylı Aktivite Geçmişi
                _buildActivityHistory(),

                // Alt boşluk
                const SliverToBoxAdapter(
                  child: SizedBox(height: 32),
                ),
              ],
            ),
    );
  }

  Widget _buildLoadingScreen() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            color: AppTheme.primaryColor,
          ),
          const SizedBox(height: 16),
          Text(
            'Performans verilerin yükleniyor...',
            style: GoogleFonts.figtree(
              fontSize: 16,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSliverAppBar() {
    return SliverAppBar(
      expandedHeight: 120,
      floating: false,
      pinned: true,
      backgroundColor: AppTheme.primaryColor,
      elevation: 0,
      flexibleSpace: FlexibleSpaceBar(
        title: Text(
          'Performans Merkezi',
          style: GoogleFonts.figtree(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                AppTheme.primaryColor,
                AppTheme.primaryColor.withValues(alpha: 0.8),
              ],
            ),
          ),
        ),
      ),
      actions: [
        // Zaman aralığı filtresi
        PopupMenuButton<String>(
          icon: const Icon(Icons.filter_list, color: Colors.white),
          onSelected: (value) {
            setState(() {
              _selectedTimeRange = value;
            });
            _loadPerformanceData();
          },
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'Bu Hafta',
              child: Text('Bu Hafta'),
            ),
            const PopupMenuItem(
              value: 'Bu Ay',
              child: Text('Bu Ay'),
            ),
            const PopupMenuItem(
              value: 'Tüm Zamanlar',
              child: Text('Tüm Zamanlar'),
            ),
          ],
        ),
        const SizedBox(width: 8),
      ],
    );
  }

  Widget _buildOverviewCards() {
    return SliverPadding(
      padding: const EdgeInsets.all(16),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 1.2,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
        ),
        delegate: SliverChildListDelegate([
          _buildMetricCard(
            'Toplam Çalışma',
            '${_performanceData['totalStudyHours']?.toStringAsFixed(1) ?? '0'}',
            'Saat Çalıştın',
            Icons.timer,
            AppTheme.primaryColor,
          ),
          _buildMetricCard(
            'Kazanılan XP',
            '${_performanceData['totalXP']?.toString() ?? '0'}',
            'XP Kazandın',
            Icons.star,
            AppTheme.accentColor,
          ),
          _buildMetricCard(
            'Çalışma Serisi',
            '${_performanceData['currentStreak']?.toString() ?? '0'}',
            'Günlük Seri',
            Icons.local_fire_department,
            AppTheme.warningColor,
          ),
          _buildMetricCard(
            'En Uzun Odaklanma',
            '${_performanceData['longestFocusSession']?.toString() ?? '0'}',
            'Dakika',
            Icons.psychology,
            AppTheme.successColor,
          ),
        ]),
      ),
    );
  }

  Widget _buildMetricCard(
      String title, String value, String subtitle, IconData icon, Color color) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color.withValues(alpha: 0.1),
            color.withValues(alpha: 0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: color.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                const Spacer(),
                Text(
                  title,
                  style: GoogleFonts.figtree(
                    fontSize: 12,
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const Spacer(),
            Text(
              value,
              style: GoogleFonts.figtree(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.bodyLarge?.color,
              ),
            ),
            Text(
              subtitle,
              style: GoogleFonts.figtree(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.3, duration: 600.ms);
  }

  Widget _buildWeeklyWorkDistribution() {
    return SliverToBoxAdapter(
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Haftalık Çalışma Ritmin',
              style: GoogleFonts.figtree(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.bodyLarge?.color,
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: 100,
                  barTouchData: BarTouchData(
                    enabled: true,
                    touchTooltipData: BarTouchTooltipData(
                      tooltipRoundedRadius: 8,
                      getTooltipItem: (group, groupIndex, rod, rodIndex) {
                        return BarTooltipItem(
                          '${rod.toY.toInt()} dakika',
                          const TextStyle(color: Colors.white),
                        );
                      },
                    ),
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
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
                              color: Colors.grey[600],
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
                            '${value.toInt()}',
                            style: GoogleFonts.figtree(
                              fontSize: 10,
                              color: Colors.grey[600],
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: _getWeeklyBarGroups(),
                ),
              ),
            ),
          ],
        ),
      )
          .animate()
          .fadeIn(delay: 200.ms, duration: 600.ms)
          .slideX(begin: 0.3, duration: 600.ms),
    );
  }

  List<BarChartGroupData> _getWeeklyBarGroups() {
    final weeklyData = _performanceData['weeklyStudyData'] ?? List.filled(7, 0);
    return List.generate(7, (index) {
      return BarChartGroupData(
        x: index,
        barRods: [
          BarChartRodData(
            toY: (weeklyData[index] ?? 0).toDouble(),
            color: AppTheme.primaryColor,
            width: 20,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(4),
              topRight: Radius.circular(4),
            ),
          ),
        ],
      );
    });
  }

  Widget _buildSubjectTimeDistribution() {
    return SliverToBoxAdapter(
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Zamanını Neye Harcadın?',
              style: GoogleFonts.figtree(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.bodyLarge?.color,
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: SizedBox(
                    height: 200,
                    child: PieChart(
                      PieChartData(
                        sectionsSpace: 2,
                        centerSpaceRadius: 40,
                        sections: _getSubjectPieSections(),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 20),
                Expanded(
                  flex: 1,
                  child: _buildSubjectLegend(),
                ),
              ],
            ),
          ],
        ),
      )
          .animate()
          .fadeIn(delay: 400.ms, duration: 600.ms)
          .slideX(begin: 0.3, duration: 600.ms),
    );
  }

  List<PieChartSectionData> _getSubjectPieSections() {
    final subjectData = _performanceData['subjectTimeDistribution'] ?? {};
    final colors = [
      AppTheme.primaryColor,
      AppTheme.accentColor,
      AppTheme.successColor,
      AppTheme.warningColor,
      Colors.purple,
      Colors.orange,
    ];
    if (subjectData.isEmpty) return <PieChartSectionData>[];
    final entries = subjectData.entries.toList();
    return List<PieChartSectionData>.generate(entries.length, (i) {
      final entry = entries[i];
      return PieChartSectionData(
        color: colors[i % colors.length],
        value: (entry.value is num) ? (entry.value as num).toDouble() : 0.0,
        title: '${entry.value}',
        radius: 60,
        titleStyle: GoogleFonts.figtree(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      );
    });
  }

  Widget _buildSubjectLegend() {
    final subjectData = _performanceData['subjectTimeDistribution'] ?? {};
    final colors = [
      AppTheme.primaryColor,
      AppTheme.accentColor,
      AppTheme.successColor,
      AppTheme.warningColor,
      Colors.purple,
      Colors.orange,
    ];

    if (subjectData.isEmpty) {
      return const SizedBox.shrink();
    }

    final keys = subjectData.keys.toList();
    return Column(
      children: List<Widget>.generate(keys.length, (i) {
        final entry = MapEntry(keys[i], subjectData[keys[i]]);
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: colors[i % colors.length],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  entry.key,
                  style: GoogleFonts.figtree(
                    fontSize: 12,
                    color: Colors.grey[700],
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildActivityHistory() {
    return SliverToBoxAdapter(
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Son Aktivitelerin',
              style: GoogleFonts.figtree(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.bodyLarge?.color,
              ),
            ),
            const SizedBox(height: 16),
            ..._activityLogs.map((log) => _buildActivityLogTile(log)).toList(),
          ],
        ),
      )
          .animate()
          .fadeIn(delay: 600.ms, duration: 600.ms)
          .slideX(begin: 0.3, duration: 600.ms),
    );
  }

  Widget _buildActivityLogTile(Map<String, dynamic> log) {
    final timestamp = log['timestamp'];
    DateTime date;

    if (timestamp is String) {
      date = DateTime.parse(timestamp);
    } else if (timestamp is DateTime) {
      date = timestamp;
    } else {
      date = DateTime.now();
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.grey.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              _getSubjectIcon(log['subject'] ?? ''),
              color: AppTheme.primaryColor,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  log['subject'] ?? 'Bilinmeyen Ders',
                  style: GoogleFonts.figtree(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).textTheme.bodyLarge?.color,
                  ),
                ),
                Text(
                  log['topic'] ?? 'Konu belirtilmemiş',
                  style: GoogleFonts.figtree(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                Text(
                  DateFormat('dd MMM, HH:mm').format(date),
                  style: GoogleFonts.figtree(
                    fontSize: 10,
                    color: Colors.grey[500],
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${log['duration'] ?? 0} dk',
                style: GoogleFonts.figtree(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
              Text(
                '+${log['xp'] ?? 0} XP',
                style: GoogleFonts.figtree(
                  fontSize: 12,
                  color: AppTheme.accentColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  IconData _getSubjectIcon(String subject) {
    switch (subject.toLowerCase()) {
      case 'matematik':
        return Icons.functions;
      case 'fizik':
        return Icons.science;
      case 'kimya':
        return Icons.science_outlined;
      case 'biyoloji':
        return Icons.biotech;
      case 'türkçe':
        return Icons.language;
      case 'tarih':
        return Icons.history;
      case 'coğrafya':
        return Icons.public;
      case 'felsefe':
        return Icons.psychology;
      default:
        return Icons.book;
    }
  }
}
