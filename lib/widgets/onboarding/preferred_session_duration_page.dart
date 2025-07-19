import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:flutter_animate/flutter_animate.dart';

class PreferredSessionDurationPage extends StatefulWidget {
  final OnboardingData onboardingData;
  final VoidCallback onNext;

  const PreferredSessionDurationPage({
    Key? key,
    required this.onboardingData,
    required this.onNext,
  }) : super(key: key);

  @override
  State<PreferredSessionDurationPage> createState() =>
      _PreferredSessionDurationPageState();
}

class _PreferredSessionDurationPageState
    extends State<PreferredSessionDurationPage> with TickerProviderStateMixin {
  int _selectedDuration = 25; // Varsayılan değer
  late AnimationController _scaleController;

  // Önceden tanımlanmış seçenekler
  final List<Map<String, dynamic>> _durationOptions = [
    {
      'duration': 15,
      'label': '15-20 dk',
      'description': 'Kısa odaklanma\nHızlı konular için',
      'icon': Icons.flash_on,
      'color': Colors.orange,
    },
    {
      'duration': 25,
      'label': '25-30 dk',
      'description': 'Klasik Pomodoro\nDengeli çalışma',
      'icon': Icons.timer,
      'color': AppTheme.primaryColor,
    },
    {
      'duration': 40,
      'label': '40-45 dk',
      'description': 'Derin odaklanma\nKarmaşık konular',
      'icon': Icons.psychology,
      'color': Colors.purple,
    },
    {
      'duration': 60,
      'label': '50-60 dk',
      'description': 'Uzun seanlar\nProje çalışması',
      'icon': Icons.trending_up,
      'color': Colors.green,
    },
  ];

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );

    // Mevcut değeri al
    _selectedDuration = widget.onboardingData.preferredSessionDuration;
  }

  @override
  void dispose() {
    _scaleController.dispose();
    super.dispose();
  }

  void _selectDuration(int duration) {
    setState(() {
      _selectedDuration = duration;
      widget.onboardingData.preferredSessionDuration = duration;
    });

    _scaleController.reset();
    _scaleController.forward();

    // Otomatik geçiş için delay
    Future.delayed(const Duration(milliseconds: 800), () {
      if (mounted) {
        widget.onNext();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),

              // Başlık ve açıklama
              Text(
                'İdeal Çalışma Süren Nedir?',
                style: GoogleFonts.figtree(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).textTheme.headlineLarge?.color,
                ),
              ).animate().fadeIn(duration: 600.ms).slideX(begin: -0.3),

              const SizedBox(height: 16),

              Text(
                'Bir konuya odaklandığında, tek bir oturuşta (seans) genellikle kaç dakika verimli çalışırsın?',
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  color: Theme.of(context)
                      .textTheme
                      .bodyLarge
                      ?.color
                      ?.withOpacity(0.8),
                  height: 1.5,
                ),
              )
                  .animate()
                  .fadeIn(duration: 600.ms, delay: 200.ms)
                  .slideX(begin: -0.3),

              const SizedBox(height: 12),

              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppTheme.primaryColor.withOpacity(0.2),
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
                        'Bu bilgi AI\'nın senin için daha kişisel Pomodoro seansları planlamasını sağlar',
                        style: GoogleFonts.figtree(
                          fontSize: 13,
                          color: AppTheme.primaryColor.withOpacity(0.8),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              )
                  .animate()
                  .fadeIn(duration: 600.ms, delay: 400.ms)
                  .scale(begin: const Offset(0.9, 0.9)),

              const SizedBox(height: 40),

              // Seçenekler
              Expanded(
                child: ListView.builder(
                  itemCount: _durationOptions.length,
                  itemBuilder: (context, index) {
                    final option = _durationOptions[index];
                    final isSelected = _selectedDuration == option['duration'];

                    return Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSelected
                                ? option['color']
                                : Theme.of(context).dividerColor,
                            width: isSelected ? 2 : 1,
                          ),
                          color: isSelected
                              ? option['color'].withOpacity(0.1)
                              : Theme.of(context).cardColor,
                          boxShadow: isSelected
                              ? [
                                  BoxShadow(
                                    color: option['color'].withOpacity(0.3),
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
                          onTap: () => _selectDuration(option['duration']),
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
                                        ? option['color']
                                        : option['color'].withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: Icon(
                                    option['icon'],
                                    color: isSelected
                                        ? Colors.white
                                        : option['color'],
                                    size: 28,
                                  ),
                                ),

                                const SizedBox(width: 20),

                                // Content
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        option['label'],
                                        style: GoogleFonts.figtree(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                          color: isSelected
                                              ? option['color']
                                              : Theme.of(context)
                                                  .textTheme
                                                  .headlineSmall
                                                  ?.color,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        option['description'],
                                        style: GoogleFonts.figtree(
                                          fontSize: 14,
                                          color: Theme.of(context)
                                              .textTheme
                                              .bodyMedium
                                              ?.color
                                              ?.withOpacity(0.7),
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
                                        ? option['color']
                                        : Colors.transparent,
                                    border: Border.all(
                                      color: isSelected
                                          ? option['color']
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
                      )
                          .animate()
                          .fadeIn(
                            duration: 600.ms,
                            delay: Duration(milliseconds: 600 + (index * 100)),
                          )
                          .slideY(begin: 0.3),
                    );
                  },
                ),
              ),

              // Alt bilgi
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Theme.of(context).dividerColor.withOpacity(0.5),
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
                        'Seçtiğin süre daha sonra ayarlardan değiştirilebilir',
                        style: GoogleFonts.figtree(
                          fontSize: 13,
                          color: Theme.of(context).textTheme.bodySmall?.color,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              )
                  .animate()
                  .fadeIn(duration: 600.ms, delay: 1000.ms)
                  .slideY(begin: 0.3),
            ],
          ),
        ),
      ),
    );
  }
}
