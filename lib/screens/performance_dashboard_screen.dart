import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../services/mock_auth_service.dart';
import '../viewmodels/performance_dashboard_viewmodel.dart';
import '../models/performance_dashboard_data.dart';
import '../widgets/performance/metric_cards_grid.dart';
import '../widgets/performance/weekly_work_chart.dart';
import '../widgets/performance/subject_time_pie.dart';
import '../widgets/performance/activity_history_list.dart';
import '../widgets/performance/performance_header.dart';
import '../widgets/performance/insights_section.dart';
import '../widgets/performance/comparative_section.dart';
import 'package:shimmer/shimmer.dart';
import 'dart:async';

class PerformanceDashboardScreen extends ConsumerStatefulWidget {
  const PerformanceDashboardScreen({super.key});

  @override
  ConsumerState<PerformanceDashboardScreen> createState() =>
      _PerformanceDashboardScreenState();
}

class _PerformanceDashboardScreenState extends ConsumerState<PerformanceDashboardScreen>
    with TickerProviderStateMixin {
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

    ref.read(performanceDashboardNotifierProvider.notifier).loadData().whenComplete(() {
      _fadeController.forward();
      _slideController.forward();
    });
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = MockAuthService.instance.currentUser;
    final vm = ref.watch(performanceDashboardNotifierProvider);
    final theme = Theme.of(context);

    if (vm.isLoading) {
      return Scaffold(
        backgroundColor: theme.colorScheme.background,
        body: _buildLoadingSkeleton(context),
      );
    }
    if (vm.errorMessage != null) {
      return Scaffold(
        backgroundColor: theme.colorScheme.background,
        body: _buildErrorWidget(
          context,
          vm.errorMessage,
          () => ref.read(performanceDashboardNotifierProvider.notifier).loadData(),
        ),
      );
    }

    final data = vm.dashboardData!;
    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      body: CustomScrollView(
        slivers: [
          _buildSliverAppBar(onReload: () { ref.read(performanceDashboardNotifierProvider.notifier).loadData(); }),
          PerformanceHeader(
            summary: data.summary,
            userName: user?.fullName,
            onReload: () { ref.read(performanceDashboardNotifierProvider.notifier).loadData(); },
          ),
          MetricCardsGrid(summary: data.summary),
          WeeklyWorkChart(weekly: data.distributions.weekly),
          SubjectTimePie(subjectList: data.distributions.subjectsTime),
          InsightsSection(insights: data.insights),
          ComparativeSection(comparative: data.comparative),
          ActivityHistoryList(logs: data.activity),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
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

  Widget _buildLoadingSkeleton(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey.shade300,
      highlightColor: Colors.grey.shade100,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // AppBar alanı yerine boşluk
          Container(height: 120, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16))),
          const SizedBox(height: 16),
          // Grid skeleton
          Wrap(spacing: 16, runSpacing: 16, children: List.generate(4, (i) => Container(width: (MediaQuery.of(context).size.width-64)/2, height: 140, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16))))),
          const SizedBox(height: 16),
          // Bar chart skeleton
          Container(height: 260, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16))),
          const SizedBox(height: 16),
          // Pie chart skeleton
          Container(height: 260, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16))),
          const SizedBox(height: 16),
          // Activity list skeleton
          ...List.generate(3, (i) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Container(height: 80, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12))),
          )),
        ],
      ),
    );
  }

  Widget _buildErrorWidget(BuildContext context, String? errorMessage, VoidCallback onRetry) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline, color: Colors.red.shade400, size: 48),
          const SizedBox(height: 12),
          Text('Bir hata oluştu', style: GoogleFonts.figtree(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(errorMessage ?? '', style: GoogleFonts.figtree(fontSize: 13, color: Colors.grey[700])),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: onRetry,
            child: const Text('Yeniden Dene'),
          ),
        ],
      ),
    );
  }

  Widget _buildSliverAppBar({VoidCallback? onReload}) {
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
          onSelected: (value) => onReload?.call(),
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

  Widget _buildOverviewCardsFromData(PerformanceDashboardData data) {
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
            '${(data.summary.totalStudyHours ?? 0).toStringAsFixed(1)}',
            'Saat Çalıştın',
            Icons.timer,
            AppTheme.primaryColor,
          ),
          _buildMetricCard(
            'Kazanılan XP',
            '0',
            'XP Kazandın',
            Icons.star,
            AppTheme.accentColor,
          ),
          _buildMetricCard(
            'Çalışma Serisi',
            '${data.summary.studyStreak ?? 0}',
            'Günlük Seri',
            Icons.local_fire_department,
            AppTheme.warningColor,
          ),
          _buildMetricCard(
            'Genel Skor',
            '${data.summary.overallScore.toStringAsFixed(0)}',
            'Ortalama',
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

  Widget _buildWeeklyWorkDistributionFromData(PerformanceDashboardData data) {
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
                    rightTitles: AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    topTitles: AxisTitles(
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
                  barGroups: _getWeeklyBarGroupsFromData(data.distributions.weekly),
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

  List<BarChartGroupData> _getWeeklyBarGroupsFromData(List<WeeklyDistributionItem> weekly) {
    final weeklyData = weekly.isNotEmpty
        ? List.generate(7, (i) => (i < weekly.length ? weekly[i].minutes : 0))
        : List.filled(7, 0);
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

  Widget _buildSubjectTimeDistributionFromData(PerformanceDashboardData data) {
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
                         sections: _getSubjectPieSectionsFromData(data.distributions.subjectsTime),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 20),
                Expanded(
                  flex: 1,
                   child: _buildSubjectLegendFromData(data.distributions.subjectsTime),
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

  List<PieChartSectionData> _getSubjectPieSectionsFromData(List<SubjectTimeDistributionItem> subjectList) {
    final colors = [
      AppTheme.primaryColor,
      AppTheme.accentColor,
      AppTheme.successColor,
      AppTheme.warningColor,
      Colors.purple,
      Colors.orange,
    ];
    if (subjectList.isEmpty) return <PieChartSectionData>[];
    return List<PieChartSectionData>.generate(subjectList.length, (i) {
      final item = subjectList[i];
      final minutes = item.minutes as num;
      return PieChartSectionData(
        color: colors[i % colors.length],
        value: minutes.toDouble(),
        title: '${minutes.toInt()}',
        radius: 60,
        titleStyle: GoogleFonts.figtree(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      );
    });
  }

  Widget _buildSubjectLegendFromData(List<SubjectTimeDistributionItem> subjectList) {
    final colors = [
      AppTheme.primaryColor,
      AppTheme.accentColor,
      AppTheme.successColor,
      AppTheme.warningColor,
      Colors.purple,
      Colors.orange,
    ];

    if (subjectList.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      children: List<Widget>.generate(subjectList.length, (i) {
        final item = subjectList[i];
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
                  item.subject,
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

  Widget _buildActivityHistoryFromData(List<ActivityLog> logs) {
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
            ...logs.map((log) => _buildActivityLogTileFromData(log)).toList(),
          ],
        ),
      )
          .animate()
          .fadeIn(delay: 600.ms, duration: 600.ms)
          .slideX(begin: 0.3, duration: 600.ms),
    );
  }

  Widget _buildActivityLogTileFromData(ActivityLog log) {
    final date = log.timestamp;

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
              _getSubjectIcon(''),
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
                  log.activity,
                  style: GoogleFonts.figtree(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).textTheme.bodyLarge?.color,
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
                '${log.duration} dk',
                style: GoogleFonts.figtree(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
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
