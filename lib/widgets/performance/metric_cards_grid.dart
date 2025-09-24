import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../theme/app_theme.dart';
import '../../models/performance_dashboard_data.dart';

class MetricCardsGrid extends StatelessWidget {
  final Summary summary;
  const MetricCardsGrid({super.key, required this.summary});

  @override
  Widget build(BuildContext context) {
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
          _metricCard(
            context,
            title: 'Toplam Çalışma',
            value: '${(summary.totalStudyHours ?? 0).toStringAsFixed(1)}',
            subtitle: 'Saat Çalıştın',
            icon: Icons.timer,
            color: AppTheme.primaryColor,
          ),
          _metricCard(
            context,
            title: 'Genel Skor',
            value: summary.overallScore.toStringAsFixed(0),
            subtitle: 'Ortalama',
            icon: Icons.psychology,
            color: AppTheme.successColor,
          ),
          _metricCard(
            context,
            title: 'Çalışma Serisi',
            value: '${summary.studyStreak ?? 0}',
            subtitle: 'Günlük Seri',
            icon: Icons.local_fire_department,
            color: AppTheme.warningColor,
          ),
          _metricCard(
            context,
            title: 'İyileşme',
            value: (summary.improvement ?? 0).toStringAsFixed(1),
            subtitle: 'Puan',
            icon: Icons.trending_up,
            color: AppTheme.accentColor,
          ),
        ]),
      ),
    );
  }

  Widget _metricCard(BuildContext context,
      {required String title,
      required String value,
      required String subtitle,
      required IconData icon,
      required Color color}) {
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
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  value,
                  style: GoogleFonts.figtree(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).textTheme.bodyLarge?.color,
                  ),
                ),
                const SizedBox(width: 6),
                if (title == 'Genel Skor') _trendBadge(context),
              ],
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

  Widget _trendBadge(BuildContext context) {
    final improvementText = (summary.improvement ?? 0).toStringAsFixed(1);
    final isUp = (summary.improvement ?? 0) >= 0;
    final color = isUp ? Colors.green : Colors.red;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(isUp ? Icons.arrow_upward : Icons.arrow_downward, size: 12, color: color),
          const SizedBox(width: 2),
          Text(improvementText, style: GoogleFonts.figtree(fontSize: 11, color: color, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

