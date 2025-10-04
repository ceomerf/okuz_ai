import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../theme/app_theme.dart';
import '../../models/performance_dashboard_data.dart';

class PerformanceHeader extends StatelessWidget {
  final Summary summary;
  final String? userName;
  final VoidCallback? onReload;

  const PerformanceHeader({super.key, required this.summary, this.userName, this.onReload});

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 16, 16, 8),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppTheme.primaryColor.withValues(alpha: 0.10),
              AppTheme.primaryColor.withValues(alpha: 0.06),
            ],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.20)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.2),
                  child: const Icon(Icons.insights, color: AppTheme.primaryColor),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        userName == null || userName!.isEmpty ? 'Performans Merkezine Hoş Geldin' : 'Merhaba, ${userName!}',
                        style: GoogleFonts.figtree(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).textTheme.bodyLarge?.color,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Özet görünüm',
                        style: GoogleFonts.figtree(fontSize: 12, color: Colors.grey[700]),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: onReload,
                  icon: const Icon(Icons.refresh, color: AppTheme.primaryColor),
                  tooltip: 'Yenile',
                )
              ],
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _chip(context, icon: Icons.psychology, label: 'Genel Skor', value: summary.overallScore.toStringAsFixed(0)),
                _chip(context, icon: Icons.trending_up, label: 'İyileşme', value: (summary.improvement ?? 0).toStringAsFixed(1)),
                _chip(context, icon: Icons.local_fire_department, label: 'Seri', value: '${summary.studyStreak ?? 0}g'),
                _chip(context, icon: Icons.timer, label: 'Toplam', value: '${(summary.totalStudyHours ?? 0).toStringAsFixed(1)}s'),
              ],
            ),
          ],
        ),
      ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.2, duration: 400.ms),
    );
  }

  Widget _chip(BuildContext context, {required IconData icon, required String label, required String value}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppTheme.primaryColor),
          const SizedBox(width: 8),
          Text(label, style: GoogleFonts.figtree(fontSize: 12, color: Colors.grey[700])),
          const SizedBox(width: 6),
          Container(width: 4, height: 4, decoration: const BoxDecoration(color: Colors.grey, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(value, style: GoogleFonts.figtree(fontSize: 12, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

