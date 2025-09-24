import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/app_theme.dart';
import '../../providers/theme_provider.dart';
import '../../screens/settings_screen.dart';

class DashboardHeader extends StatelessWidget {
  final String studentName;
  final int studyStreak;
  final bool isDark;

  const DashboardHeader({
    super.key,
    required this.studentName,
    required this.studyStreak,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final displayName = (studentName.isNotEmpty ? studentName : 'hakan').trim();
    return Row(
      children: [
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: AppTheme.primaryColor,
            borderRadius: BorderRadius.circular(30),
          ),
          child: Center(
            child: Text(
              displayName.isNotEmpty ? displayName[0].toUpperCase() : 'H',
              style: GoogleFonts.figtree(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'İyi günler,',
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  color: AppTheme.getSecondaryTextColor(context),
                ),
              ),
              Text(
                displayName,
                style: GoogleFonts.figtree(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.getPrimaryTextColor(context),
                ),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.orange.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.local_fire_department,
                color: Colors.orange,
                size: 20,
              ),
              const SizedBox(width: 4),
              Text(
                '$studyStreak',
                style: GoogleFonts.figtree(
                  fontWeight: FontWeight.w600,
                  color: Colors.orange,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Consumer(builder: (context, ref, _) {
          return IconButton(
            onPressed: () => ref.read(appThemeNotifierProvider.notifier).toggleTheme(),
            icon: Icon(
              isDark ? Icons.light_mode : Icons.dark_mode,
              color: AppTheme.getSecondaryTextColor(context),
            ),
          );
        }),
        IconButton(
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const SettingsScreen(),
              ),
            );
          },
          icon: Icon(
            Icons.more_vert,
            color: AppTheme.getSecondaryTextColor(context),
          ),
        ),
      ],
    );
  }
}

