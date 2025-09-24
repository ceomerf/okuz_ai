import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/models/curriculum_preference.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class CurriculumPreferencePage extends StatefulWidget {
  final OnboardingData onboardingData;
  final VoidCallback onNext;
  final Function(String) onSelectionChanged;

  const CurriculumPreferencePage({
    Key? key,
    required this.onboardingData,
    required this.onNext,
    required this.onSelectionChanged,
  }) : super(key: key);

  @override
  State<CurriculumPreferencePage> createState() =>
      _CurriculumPreferencePageState();
}

class _CurriculumPreferencePageState extends State<CurriculumPreferencePage>
    with TickerProviderStateMixin {
  CurriculumPreference? selectedPreference;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    // Mevcut seçimi yükle
    if (widget.onboardingData.planScope?.isNotEmpty == true) {
      selectedPreference =
          CurriculumPreference.fromString(widget.onboardingData.planScope!);
    }

    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _selectPreference(CurriculumPreference preference) {
    setState(() {
      selectedPreference = preference;
    });

    // planScope'u güncelle
    widget.onboardingData.planScope = preference.value;
    widget.onSelectionChanged(preference.value);

    // Otomatik ilerlemeyi kaldır - kullanıcı manuel olarak ilerle butonuna basacak
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Progress indicator kaldırıldı
                const SizedBox(height: 60),

                // Başlık
                Text(
                  'Çalışma Yaklaşımın',
                  style: GoogleFonts.figtree(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.getPrimaryTextColor(context),
                  ),
                ).animate().fadeIn(duration: 600.ms).slideX(begin: -0.3),

                const SizedBox(height: 16),

                Text(
                  'Planın okul müfredatıyla paralel mi ilerlesin, yoksa YKS sınavına özel mi olsun?',
                  style: GoogleFonts.figtree(
                    fontSize: 16,
                    color: AppTheme.getSecondaryTextColor(context),
                    height: 1.5,
                  ),
                ).animate().fadeIn(duration: 600.ms, delay: 200.ms).slideX(begin: -0.3),

                const SizedBox(height: 12),

                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppTheme.primaryColor.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.lightbulb_outline,
                        color: AppTheme.primaryColor,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Bu tercih AI\'nın senin için en uygun çalışma planını oluşturmasını sağlar',
                          style: GoogleFonts.figtree(
                            fontSize: 13,
                            color: AppTheme.primaryColor.withValues(alpha: 0.8),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(duration: 600.ms, delay: 400.ms).scale(begin: const Offset(0.9, 0.9)),

                const SizedBox(height: 32),

                // Seçenekler
                Expanded(
                  child: ListView.builder(
                    itemCount: CurriculumPreference.values.length,
                    itemBuilder: (context, index) {
                      final preference = CurriculumPreference.values[index];
                      final isSelected = selectedPreference == preference;
                      
                      // Her seçenek için özel renk ve ikon
                      Color optionColor;
                      IconData optionIcon;
                      
                      switch (preference) {
                        case CurriculumPreference.schoolBased:
                          optionColor = Colors.blue;
                          optionIcon = Icons.school;
                          break;
                        case CurriculumPreference.examBased:
                          optionColor = AppTheme.primaryColor;
                          optionIcon = Icons.quiz;
                          break;
                      }

                      return Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isSelected
                                  ? optionColor
                                  : Theme.of(context).dividerColor,
                              width: isSelected ? 2 : 1,
                            ),
                            color: isSelected
                                ? optionColor.withOpacity(0.1)
                                : Theme.of(context).cardColor,
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(
                                      color: optionColor.withOpacity(0.3),
                                      blurRadius: 8,
                                      offset: const Offset(0, 4),
                                    ),
                                  ]
                                : [
                                    BoxShadow(
                                      color: Theme.of(context)
                                          .shadowColor
                                          .withOpacity(0.1),
                                      blurRadius: 4,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                          ),
                          child: InkWell(
                            onTap: () => _selectPreference(preference),
                            borderRadius: BorderRadius.circular(16),
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Row(
                                children: [
                                  // Icon container
                                  AnimatedContainer(
                                    duration: const Duration(milliseconds: 300),
                                    width: 56,
                                    height: 56,
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? optionColor
                                          : optionColor.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: Icon(
                                      optionIcon,
                                      color: isSelected
                                          ? Colors.white
                                          : optionColor,
                                      size: 28,
                                    ),
                                  ),

                                  const SizedBox(width: 20),

                                  // Content
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                preference.displayName,
                                                style: GoogleFonts.figtree(
                                                  fontSize: 18,
                                                  fontWeight: FontWeight.bold,
                                                  color: isSelected
                                                      ? optionColor
                                                      : AppTheme.getPrimaryTextColor(context),
                                                ),
                                              ),
                                            ),
                                            if (preference == CurriculumPreference.examBased)
                                              Container(
                                                padding: const EdgeInsets.symmetric(
                                                  horizontal: 8,
                                                  vertical: 4,
                                                ),
                                                decoration: BoxDecoration(
                                                  color: AppTheme.primaryColor.withValues(alpha: 0.2),
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                                child: Text(
                                                  'ÖNERİLEN',
                                                  style: GoogleFonts.figtree(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.bold,
                                                    color: AppTheme.primaryColor,
                                                  ),
                                                ),
                                              ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          preference.description,
                                          style: GoogleFonts.figtree(
                                            fontSize: 14,
                                            color: AppTheme.getSecondaryTextColor(context),
                                            height: 1.3,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Selection indicator
                                  AnimatedContainer(
                                    duration: const Duration(milliseconds: 300),
                                    width: 24,
                                    height: 24,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: isSelected
                                          ? optionColor
                                          : Colors.transparent,
                                      border: Border.all(
                                        color: isSelected
                                            ? optionColor
                                            : Theme.of(context).dividerColor,
                                        width: 2,
                                      ),
                                    ),
                                    child: isSelected
                                        ? const Icon(
                                            Icons.check,
                                            color: Colors.white,
                                            size: 16,
                                          )
                                        : null,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ).animate().fadeIn(
                          duration: 600.ms,
                          delay: Duration(milliseconds: 600 + (index * 100)),
                        ).slideY(begin: 0.3),
                      );
                    },
                  ),
                ),

                const SizedBox(height: 20),

                // Bilgi notu
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Theme.of(context).dividerColor.withValues(alpha: 0.5),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        color: Theme.of(context).primaryColor,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Bu tercihi daha sonra ayarlardan değiştirebilirsin.',
                          style: GoogleFonts.figtree(
                            fontSize: 13,
                            color: AppTheme.getSecondaryTextColor(context),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(duration: 600.ms, delay: 1000.ms).slideY(begin: 0.3),

                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
