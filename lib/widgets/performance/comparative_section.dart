import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../theme/app_theme.dart';
import '../../models/performance_dashboard_data.dart';

class ComparativeSection extends StatelessWidget {
  final Comparative? comparative;
  const ComparativeSection({super.key, required this.comparative});

  @override
  Widget build(BuildContext context) {
    if (comparative == null || (comparative!.peer == null && comparative!.general == null)) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }

    final peer = comparative!.peer;
    final general = comparative!.general;

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
                const Icon(Icons.leaderboard, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                Text('Karşılaştırmalı Görünüm',
                    style: GoogleFonts.figtree(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    )),
              ],
            ),
            const SizedBox(height: 12),
            if (peer != null)
              _statRow(context, 'Akran Ortalaması', '${peer.peerAverage}', Icons.groups),
            if (peer != null)
              _statRow(context, 'Senin Ortalaman', '${peer.userAverage}', Icons.person),
            if (peer != null)
              _statRow(context, 'Yüzdelik Dilim', '%${peer.percentile}', Icons.percent),
            if (general != null)
              _statRow(context, 'Platform Ort.', '${general.platformAverage}', Icons.public),
            if (general != null)
              _statRow(context, 'Sıralaman', '#${general.userRank}', Icons.emoji_events),
          ],
        ),
      ).animate().fadeIn(delay: 300.ms, duration: 600.ms).slideY(begin: 0.2, duration: 600.ms),
    );
  }

  Widget _statRow(BuildContext context, String title, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.primaryColor),
          const SizedBox(width: 10),
          Expanded(child: Text(title, style: GoogleFonts.figtree(fontSize: 13, color: Colors.grey[700]))),
          Text(value, style: GoogleFonts.figtree(fontSize: 14, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

