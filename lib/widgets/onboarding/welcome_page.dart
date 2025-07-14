import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lottie/lottie.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class WelcomePage extends StatelessWidget {
  final VoidCallback onNext;
  const WelcomePage({Key? key, required this.onNext}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDarkMode = AppTheme.themeNotifier.value == ThemeMode.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      color: AppTheme.backgroundColor,
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
                    ? AppTheme.primaryColor.withOpacity(0.2)
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
              'Öküz AI\'a Hoş Geldin!',
              style: Theme.of(context).textTheme.displaySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimaryColor,
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
              'Kişiselleştirilmiş öğrenme yolculuğun burada başlıyor.',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppTheme.textSecondaryColor,
                  ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}
