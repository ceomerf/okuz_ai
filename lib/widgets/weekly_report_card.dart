import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_theme.dart';
import '../utils/calendar_helpers.dart';

class WeeklyReportCard extends StatefulWidget {
  final Map<String, dynamic> weeklyStats;
  final int currentStreak;
  final int longestStreak;
  final List<String> earnedBadges;
  final VoidCallback? onClose;

  const WeeklyReportCard({
    Key? key,
    required this.weeklyStats,
    required this.currentStreak,
    required this.longestStreak,
    required this.earnedBadges,
    this.onClose,
  }) : super(key: key);

  @override
  State<WeeklyReportCard> createState() => _WeeklyReportCardState();
}

class _WeeklyReportCardState extends State<WeeklyReportCard>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late AnimationController _celebrationController;
  late AnimationController _badgeController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    _celebrationController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    );
    _badgeController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _animationController.forward();
    _celebrationController.repeat();

    // Badge animasyonlarını sırayla başlat
    if (widget.earnedBadges.isNotEmpty) {
      Future.delayed(const Duration(milliseconds: 600), () {
        if (mounted) _badgeController.forward();
      });
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    _celebrationController.dispose();
    _badgeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.blue.shade50,
              Colors.purple.shade50,
              Colors.white,
            ],
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.15),
              blurRadius: 25,
              spreadRadius: 5,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            _buildHeader(),

            // Content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    // Motivational Message
                    _buildMotivationalMessage(),

                    const SizedBox(height: 24),

                    // Stats Grid
                    _buildStatsGrid(),

                    const SizedBox(height: 24),

                    // Subject Analysis
                    _buildSubjectAnalysis(),

                    const SizedBox(height: 24),

                    // Earned Badges
                    if (widget.earnedBadges.isNotEmpty) _buildEarnedBadges(),

                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),

            // Footer Actions
            _buildFooter(),
          ],
        ),
      )
          .animate(controller: _animationController)
          .scale(begin: const Offset(0.7, 0.7))
          .fadeIn(),
    );
  }

  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24.0),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue.shade600, Colors.purple.shade600],
        ),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      child: Row(
        children: [
          // Celebration icon
          AnimatedBuilder(
            animation: _celebrationController,
            builder: (context, child) {
              return Transform.rotate(
                angle: _celebrationController.value * 0.1,
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.celebration,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bu Hafta Harikaydın! 🎉',
                  style: GoogleFonts.montserrat(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _getWeekDateRange(),
                  style: GoogleFonts.lato(
                    fontSize: 14,
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: widget.onClose ?? () => Navigator.pop(context),
            icon: const Icon(
              Icons.close,
              color: Colors.white,
              size: 28,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMotivationalMessage() {
    final completionRate = widget.weeklyStats['completionRate'] as double;
    String message;
    String emoji;
    Color color;

    if (completionRate >= 0.9) {
      message =
          'Mükemmelsin! Bu hafta hedeflerinin %${(completionRate * 100).round()}\'ini tamamladın!';
      emoji = '🏆';
      color = Colors.amber.shade600;
    } else if (completionRate >= 0.7) {
      message =
          'Harika iş çıkardın! %${(completionRate * 100).round()} tamamlama oranı başarılı!';
      emoji = '🌟';
      color = Colors.blue.shade600;
    } else if (completionRate >= 0.5) {
      message = 'İyi gidiyorsun! Gelecek hafta daha da iyisini yapabilirsin!';
      emoji = '💪';
      color = Colors.green.shade600;
    } else {
      message = 'Yeni hafta yeni fırsatlar! Hedefine odaklan ve başaracaksın!';
      emoji = '🚀';
      color = Colors.orange.shade600;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 2,
        ),
      ),
      child: Row(
        children: [
          Text(
            emoji,
            style: const TextStyle(fontSize: 32),
          )
              .animate(onPlay: (controller) => controller.repeat())
              .scale(duration: 1500.ms, begin: const Offset(0.8, 0.8))
              .then()
              .scale(duration: 1500.ms, begin: const Offset(1.2, 1.2)),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              message,
              style: GoogleFonts.lato(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: color,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsGrid() {
    final stats = [
      {
        'title': 'Çalışma Saati',
        'value': '${widget.weeklyStats['totalHours'].toStringAsFixed(1)}h',
        'icon': Icons.schedule,
        'color': Colors.blue,
      },
      {
        'title': 'Tamamlanan Görev',
        'value': '${widget.weeklyStats['completedTasks']}',
        'icon': Icons.check_circle,
        'color': Colors.green,
      },
      {
        'title': 'Tamamlama Oranı',
        'value': '%${(widget.weeklyStats['completionRate'] * 100).round()}',
        'icon': Icons.trending_up,
        'color': Colors.purple,
      },
      {
        'title': 'Streak Günleri',
        'value': '${widget.currentStreak}',
        'icon': Icons.local_fire_department,
        'color': Colors.orange,
      },
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 1.2,
      ),
      itemCount: stats.length,
      itemBuilder: (context, index) {
        final stat = stats[index];
        return _buildStatCard(
          title: stat['title'] as String,
          value: stat['value'] as String,
          icon: stat['icon'] as IconData,
          color: stat['color'] as Color,
          delay: index * 100,
        );
      },
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required int delay,
  }) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: color.withValues(alpha: 0.2),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: color,
              size: 24,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: GoogleFonts.montserrat(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: GoogleFonts.lato(
              fontSize: 12,
              color: AppTheme.textSecondaryColor,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    ).animate(delay: delay.ms).slideY(begin: 0.3).fadeIn(duration: 600.ms);
  }

  Widget _buildSubjectAnalysis() {
    final topSubject = widget.weeklyStats['topSubject'] as String;
    final topSubjectMinutes = widget.weeklyStats['topSubjectMinutes'] as int;
    final subjectDistribution =
        widget.weeklyStats['subjectDistribution'] as Map<String, int>;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Bu Haftanın Analizi',
          style: GoogleFonts.montserrat(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimaryColor,
          ),
        ),
        const SizedBox(height: 16),

        // Top subject
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16.0),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.green.shade50, Colors.green.shade100],
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: Colors.green.shade200,
              width: 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.green.shade200,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.star,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'En Çok Çalışılan Ders',
                      style: GoogleFonts.lato(
                        fontSize: 12,
                        color: Colors.green.shade700,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      '$topSubject (${(topSubjectMinutes / 60).toStringAsFixed(1)} saat)',
                      style: GoogleFonts.montserrat(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.green.shade800,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Subject distribution
        if (subjectDistribution.isNotEmpty) ...[
          Text(
            'Ders Dağılımı',
            style: GoogleFonts.lato(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.textSecondaryColor,
            ),
          ),
          const SizedBox(height: 8),
          ...subjectDistribution.entries.take(3).map((entry) {
            final percentage =
                (entry.value / widget.weeklyStats['totalMinutes'] * 100);
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: Text(
                      entry.key,
                      style: GoogleFonts.lato(
                        fontSize: 12,
                        color: AppTheme.textSecondaryColor,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Container(
                      height: 6,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(3),
                      ),
                      child: FractionallySizedBox(
                        alignment: Alignment.centerLeft,
                        widthFactor: percentage / 100,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.blue.shade400,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '%${percentage.round()}',
                    style: GoogleFonts.lato(
                      fontSize: 12,
                      color: AppTheme.textSecondaryColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ],
      ],
    );
  }

  Widget _buildEarnedBadges() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Kazandığın Rozetler! 🏆',
          style: GoogleFonts.montserrat(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimaryColor,
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: widget.earnedBadges.asMap().entries.map((entry) {
            final index = entry.key;
            final badgeId = entry.value;
            final badgeInfo = CalendarHelpers.getBadgeInfo(badgeId);

            return AnimatedBuilder(
              animation: _badgeController,
              builder: (context, child) {
                final progress = Curves.elasticOut.transform(
                    (_badgeController.value - (index * 0.2)).clamp(0.0, 1.0));

                return Transform.scale(
                  scale: progress,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          (badgeInfo['color'] as Color).withOpacity(0.1),
                          (badgeInfo['color'] as Color).withOpacity(0.05),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: badgeInfo['color'] as Color,
                        width: 2,
                      ),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          badgeInfo['emoji'],
                          style: const TextStyle(fontSize: 24),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          badgeInfo['name'],
                          style: GoogleFonts.lato(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: badgeInfo['color'] as Color,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        Text(
                          badgeInfo['rarity'],
                          style: GoogleFonts.lato(
                            fontSize: 10,
                            color:
                                (badgeInfo['color'] as Color).withOpacity(0.7),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildFooter() {
    return Container(
      padding: const EdgeInsets.all(24.0),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton.icon(
              onPressed: widget.onClose ?? () => Navigator.pop(context),
              icon: const Icon(Icons.check, size: 18),
              label: Text(
                'Yeni Haftaya Hazırım!',
                style: GoogleFonts.montserrat(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green.shade600,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getWeekDateRange() {
    final weekStart = widget.weeklyStats['weekStart'] as DateTime;
    final weekEnd = widget.weeklyStats['weekEnd'] as DateTime;

    return '${weekStart.day}/${weekStart.month} - ${weekEnd.day}/${weekEnd.month}';
  }
}
