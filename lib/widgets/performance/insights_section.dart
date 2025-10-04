import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../theme/app_theme.dart';
import '../../models/performance_dashboard_data.dart';

class InsightsSection extends StatelessWidget {
  final Insights? insights;
  const InsightsSection({super.key, required this.insights});

  @override
  Widget build(BuildContext context) {
    if (insights == null) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }
    final strengths = insights!.strengths ?? [];
    final improvements = insights!.improvements ?? [];
    final recommendations = insights!.recommendations ?? [];

    if (strengths.isEmpty && improvements.isEmpty && recommendations.isEmpty) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }

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
            Row(
              children: [
                const Icon(Icons.tips_and_updates, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                Text('İçgörüler ve Öneriler',
                    style: GoogleFonts.figtree(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    )),
              ],
            ),
            const SizedBox(height: 16),
            if (strengths.isNotEmpty) _chipGroup(context, 'Güçlü Yönler', strengths, Colors.green),
            if (improvements.isNotEmpty) _chipGroup(context, 'Gelişim Alanları', improvements, Colors.orange),
            if (recommendations.isNotEmpty) _chipGroup(context, 'Öneriler', recommendations, AppTheme.primaryColor),
          ],
        ),
      ).animate().fadeIn(delay: 200.ms, duration: 600.ms).slideY(begin: 0.2, duration: 600.ms),
    );
  }

  Widget _chipGroup(BuildContext context, String title, List<dynamic> items, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.figtree(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: items.map((e) => _pill(context, e.toString(), color)).toList(),
          ),
        ],
      ),
    );
  }

  Widget _pill(BuildContext context, String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        border: Border.all(color: color.withValues(alpha: 0.25)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(text, style: GoogleFonts.figtree(fontSize: 12, color: Theme.of(context).textTheme.bodyLarge?.color)),
    );
  }
}

