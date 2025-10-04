import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../theme/app_theme.dart';
import '../../models/performance_dashboard_data.dart';

class SubjectTimePie extends StatelessWidget {
  final List<SubjectTimeDistributionItem> subjectList;
  const SubjectTimePie({super.key, required this.subjectList});

  @override
  Widget build(BuildContext context) {
    final colors = [
      AppTheme.primaryColor,
      AppTheme.accentColor,
      AppTheme.successColor,
      AppTheme.warningColor,
      Colors.purple,
      Colors.orange,
    ];

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
                    height: 220,
                    child: PieChart(
                      PieChartData(
                        sectionsSpace: 2,
                        centerSpaceRadius: 42,
                        sections: _sections(subjectList, colors),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 20),
                Expanded(
                  flex: 1,
                   child: _legend(subjectList, colors),
                ),
              ],
            ),
          ],
        ),
      ).animate().fadeIn(delay: 400.ms, duration: 600.ms).slideX(begin: 0.3, duration: 600.ms),
    );
  }

  List<PieChartSectionData> _sections(List<SubjectTimeDistributionItem> list, List<Color> colors) {
    if (list.isEmpty) return <PieChartSectionData>[];
    return List<PieChartSectionData>.generate(list.length, (i) {
      final item = list[i];
      final minutes = item.minutes as num;
       return PieChartSectionData(
        color: colors[i % colors.length],
        value: minutes.toDouble(),
         title: '${minutes.toInt()} dk',
         radius: 62,
        titleStyle: GoogleFonts.figtree(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      );
    });
  }

  Widget _legend(List<SubjectTimeDistributionItem> list, List<Color> colors) {
    if (list.isEmpty) return const SizedBox.shrink();

    return Column(
      children: List<Widget>.generate(list.length, (i) {
        final item = list[i];
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
}

