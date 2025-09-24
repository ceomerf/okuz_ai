import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/app_theme.dart';
import '../../providers/study_data_provider.dart';

class WeeklyOverviewCard extends ConsumerWidget {
  final bool isDark;
  final int totalXp;
  final int studyStreak;
  final int currentLevel;
  final double weeklyProgress;

  const WeeklyOverviewCard({
    super.key,
    required this.isDark,
    required this.totalXp,
    required this.studyStreak,
    required this.currentLevel,
    required this.weeklyProgress,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.black.withOpacity(0.3) : Colors.black.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
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
                'Haftalık Bakış',
                style: GoogleFonts.figtree(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.getPrimaryTextColor(context),
                ),
              ),
              TextButton.icon(
                onPressed: () {},
                icon: Icon(
                  Icons.trending_up,
                  size: 18,
                  color: AppTheme.primaryColor,
                ),
                label: Text(
                  'Tümünü Gör',
                  style: GoogleFonts.figtree(
                    color: AppTheme.primaryColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              SizedBox(
                width: 120,
                height: 120,
                child: Stack(
                  children: [
                    Center(
                      child: SizedBox(
                        width: 100,
                        height: 100,
                        child: CircularProgressIndicator(
                          value: weeklyProgress,
                          strokeWidth: 8,
                          backgroundColor: isDark ? Colors.grey[700] : Colors.grey[200],
                          valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                        ),
                      ),
                    ),
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '${(weeklyProgress * 100).toInt()}%',
                            style: GoogleFonts.figtree(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                          Text(
                            'Tamamlandı',
                            style: GoogleFonts.figtree(
                              fontSize: 12,
                              color: AppTheme.getSecondaryTextColor(context),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 24),
              Expanded(
                child: Column(
                  children: [
                    _StatItem(icon: Icons.star, value: '$totalXp', label: 'Toplam XP', color: Colors.amber, isDark: isDark),
                    const SizedBox(height: 16),
                    _StatItem(icon: Icons.local_fire_department, value: '$studyStreak gün', label: 'Çalışma Serisi', color: Colors.orange, isDark: isDark),
                    const SizedBox(height: 16),
                    _StatItem(icon: Icons.trending_up, value: '$currentLevel', label: 'Seviye', color: Colors.green, isDark: isDark),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            'Bu Haftaki Görevlerin',
            style: GoogleFonts.figtree(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.getPrimaryTextColor(context),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '0/120 görevi tamamladın',
            style: GoogleFonts.figtree(
              fontSize: 13,
              color: AppTheme.getSecondaryTextColor(context),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;
  final bool isDark;

  const _StatItem({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.getPrimaryTextColor(context),
                ),
              ),
              Text(
                label,
                style: GoogleFonts.figtree(
                  fontSize: 12,
                  color: AppTheme.getSecondaryTextColor(context),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

