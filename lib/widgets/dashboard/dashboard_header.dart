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
        _UserAvatar(displayName: displayName),
        const SizedBox(width: 16),
        Expanded(
          child: _UserGreeting(displayName: displayName),
        ),
        _StreakBadge(studyStreak: studyStreak),
        const SizedBox(width: 8),
        _ThemeToggleButton(isDark: isDark),
        _SettingsButton(),
      ],
    );
  }
}

// Optimized user avatar widget - const constructor for better performance
class _UserAvatar extends StatelessWidget {
  final String displayName;

  const _UserAvatar({required this.displayName});

  @override
  Widget build(BuildContext context) {
    return Container(
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
    );
  }
}

// Optimized user greeting widget - const constructor for better performance
class _UserGreeting extends StatelessWidget {
  final String displayName;

  const _UserGreeting({required this.displayName});

  @override
  Widget build(BuildContext context) {
    return Column(
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
    );
  }
}

// Optimized streak badge widget - const constructor for better performance
class _StreakBadge extends StatelessWidget {
  final int studyStreak;

  const _StreakBadge({required this.studyStreak});

  @override
  Widget build(BuildContext context) {
    return Container(
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
    );
  }
}

// Optimized theme toggle button - const constructor for better performance
class _ThemeToggleButton extends StatelessWidget {
  final bool isDark;

  const _ThemeToggleButton({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Consumer(builder: (context, ref, _) {
      return IconButton(
        onPressed: () => ref.read(appThemeNotifierProvider.notifier).toggleTheme(),
        icon: Icon(
          isDark ? Icons.light_mode : Icons.dark_mode,
          color: AppTheme.getSecondaryTextColor(context),
        ),
      );
    });
  }
}

// Optimized settings button - const constructor for better performance
class _SettingsButton extends StatelessWidget {
  const _SettingsButton();

  @override
  Widget build(BuildContext context) {
    return IconButton(
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
    );
  }
}

