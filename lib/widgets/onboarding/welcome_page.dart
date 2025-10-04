import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class WelcomePage extends StatelessWidget {
  final VoidCallback onNext;
  final bool isStudentAccount;

  const WelcomePage(
      {Key? key, required this.onNext, this.isStudentAccount = false})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      color: Theme.of(context).scaffoldBackgroundColor,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Öküz Figürü
          Animate(
            effects: const [
              FadeEffect(duration: Duration(milliseconds: 600)),
              SlideEffect(
                  begin: Offset(0, 0.5),
                  end: Offset.zero,
                  curve: Curves.easeOut),
            ],
            child: Container(
              height: 200,
              width: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isDarkMode
                    ? AppTheme.primaryColor.withAlpha(51)
                    : AppTheme.primaryLightColor,
              ),
              child: Center(
                child: Icon(
                  Icons.school,
                  size: 100,
                  color: AppTheme.primaryColor,
                ),
              ),
            ),
          ),

          const SizedBox(height: 50),

          // Başlık
          Animate(
            delay: const Duration(milliseconds: 300),
            effects: const [FadeEffect(duration: Duration(milliseconds: 600))],
            child: Text(
              isStudentAccount ? 'Merhaba! 👋' : 'Öküz AI\'a Hoş Geldin!',
              style: GoogleFonts.figtree(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppTheme.getPrimaryTextColor(context),
              ),
              textAlign: TextAlign.center,
            ),
          ),

          const SizedBox(height: 16),

          // Alt Başlık
          Animate(
            delay: const Duration(milliseconds: 400),
            effects: const [FadeEffect(duration: Duration(milliseconds: 600))],
            child: Text(
              isStudentAccount
                  ? 'Senin için hazırladığımız kişiselleştirilmiş öğrenme planını oluşturalım!'
                  : 'Kişiselleştirilmiş öğrenme yolculuğun burada başlıyor.',
              style: GoogleFonts.figtree(
                fontSize: 16,
                color: AppTheme.getSecondaryTextColor(context),
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}
