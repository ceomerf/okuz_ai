import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class ComingSoonDialog extends StatelessWidget {
  final String featureName;
  final String description;
  final IconData icon;
  final Color? color;

  const ComingSoonDialog({
    Key? key,
    required this.featureName,
    required this.description,
    required this.icon,
    this.color,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = color ?? AppTheme.primaryColor;

    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: primaryColor.withOpacity(0.1),
              blurRadius: 20,
              spreadRadius: 5,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Animated Icon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    primaryColor.withOpacity(0.8),
                    primaryColor,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(40),
                boxShadow: [
                  BoxShadow(
                    color: primaryColor.withOpacity(0.3),
                    blurRadius: 15,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: Icon(
                icon,
                size: 40,
                color: Colors.white,
              ),
            )
                .animate(onPlay: (controller) => controller.repeat())
                .shimmer(duration: 2000.ms, delay: 500.ms)
                .then()
                .shake(hz: 2, curve: Curves.easeInOut),

            const SizedBox(height: 24),

            // Title
            Text(
              '🚀 Çok Yakında!',
              style: GoogleFonts.figtree(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: primaryColor,
              ),
              textAlign: TextAlign.center,
            ).animate().fadeIn(duration: 600.ms).slideY(begin: -0.3),

            const SizedBox(height: 12),

            // Feature Name
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: primaryColor.withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: Text(
                featureName,
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: primaryColor,
                ),
                textAlign: TextAlign.center,
              ),
            )
                .animate()
                .fadeIn(duration: 600.ms, delay: 200.ms)
                .scale(begin: const Offset(0.8, 0.8)),

            const SizedBox(height: 20),

            // Description
            Text(
              description,
              style: GoogleFonts.figtree(
                fontSize: 16,
                color: isDark
                    ? Colors.white.withOpacity(0.8)
                    : const Color(0xFF64748B),
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ).animate().fadeIn(duration: 600.ms, delay: 400.ms),

            const SizedBox(height: 24),

            // Feature highlights
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF0F172A).withOpacity(0.5)
                    : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark
                      ? const Color(0xFF334155).withOpacity(0.5)
                      : const Color(0xFFE2E8F0),
                  width: 1,
                ),
              ),
              child: Column(
                children: [
                  _buildFeatureHighlight(
                    '🤖',
                    'Yapay Zeka Desteği',
                    'Gelişmiş AI algoritmaları',
                    isDark,
                  ),
                  const SizedBox(height: 12),
                  _buildFeatureHighlight(
                    '📊',
                    'Detaylı Analizler',
                    'Kişiselleştirilmiş raporlar',
                    isDark,
                  ),
                  const SizedBox(height: 12),
                  _buildFeatureHighlight(
                    '🎯',
                    'Akıllı Öneriler',
                    'Hedefe odaklı stratejiler',
                    isDark,
                  ),
                ],
              ),
            )
                .animate()
                .fadeIn(duration: 600.ms, delay: 600.ms)
                .slideY(begin: 0.3),

            const SizedBox(height: 24),

            // CTA Buttons
            Row(
              children: [
                // Close Button
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      side: BorderSide(
                        color: primaryColor.withOpacity(0.3),
                      ),
                    ),
                    child: Text(
                      'Anladım',
                      style: GoogleFonts.figtree(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: isDark
                            ? Colors.white.withOpacity(0.7)
                            : const Color(0xFF64748B),
                      ),
                    ),
                  ),
                ),

                const SizedBox(width: 12),

                // Follow Updates Button
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pop();
                      _showFollowUpdatesSnackBar(context, primaryColor);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.notifications_active, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Habersiz Kalma',
                          style: GoogleFonts.figtree(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            )
                .animate()
                .fadeIn(duration: 600.ms, delay: 800.ms)
                .slideY(begin: 0.5),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureHighlight(
      String emoji, String title, String subtitle, bool isDark) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
              width: 1,
            ),
          ),
          child: Center(
            child: Text(
              emoji,
              style: const TextStyle(fontSize: 16),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.figtree(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : const Color(0xFF1E293B),
                ),
              ),
              Text(
                subtitle,
                style: GoogleFonts.figtree(
                  fontSize: 12,
                  color: isDark
                      ? Colors.white.withOpacity(0.6)
                      : const Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  static void show(
    BuildContext context, {
    required String featureName,
    required String description,
    required IconData icon,
    Color? color,
  }) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) => ComingSoonDialog(
        featureName: featureName,
        description: description,
        icon: icon,
        color: color,
      ),
    );
  }

  void _showFollowUpdatesSnackBar(BuildContext context, Color primaryColor) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.rocket_launch, color: Colors.white, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Harika! Yeni özellikler çıktığında seni bilgilendireceğiz!',
                style: GoogleFonts.figtree(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: primaryColor,
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        margin: const EdgeInsets.all(16),
      ),
    );
  }
}

// Helper function for easy usage across the app
void showComingSoonDialog(
  BuildContext context, {
  required String featureName,
  required String description,
  required IconData icon,
  Color? color,
}) {
  ComingSoonDialog.show(
    context,
    featureName: featureName,
    description: description,
    icon: icon,
    color: color,
  );
}
