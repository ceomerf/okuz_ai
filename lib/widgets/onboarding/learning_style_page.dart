import 'package:flutter/material.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class LearningStylePage extends StatefulWidget {
  final OnboardingData onboardingData;
  final VoidCallback onNext;

  const LearningStylePage({Key? key, required this.onboardingData, required this.onNext}) : super(key: key);

  @override
  State<LearningStylePage> createState() => _LearningStylePageState();
}

class _LearningStylePageState extends State<LearningStylePage> {
  String? _selectedStyle;

  final List<Map<String, dynamic>> _styles = [
    {'id': 'visual', 'name': 'Görsel', 'desc': 'Video, harita, görsel materyal', 'icon': Icons.visibility_outlined},
    {'id': 'auditory', 'name': 'İşitsel', 'desc': 'Dinleyerek, sesli anlatım', 'icon': Icons.hearing_outlined},
    {'id': 'kinesthetic', 'name': 'Kinestetik', 'desc': 'Yaparak, uygulayarak', 'icon': Icons.touch_app_outlined},
  ];

  void _selectStyle(String id) {
    setState(() => _selectedStyle = id);
    widget.onboardingData.learningStyle = id;
    
    // UI'ı yenilemek için onNext çağır
    widget.onNext();
  }

  @override
  void initState() {
    super.initState();
    _selectedStyle = widget.onboardingData.learningStyle.isNotEmpty ? widget.onboardingData.learningStyle : null;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      color: AppTheme.backgroundColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 60),
          Text(
            'Öğrenme Stilini Seç',
            style: Theme.of(context).textTheme.displaySmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimaryColor,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            'Sence en iyi nasıl öğreniyorsun?',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppTheme.textSecondaryColor,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 40),
          Expanded(
            child: ListView.separated(
              itemCount: _styles.length,
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final style = _styles[index];
                final isSelected = _selectedStyle == style['id'];
                return GestureDetector(
                  onTap: () => _selectStyle(style['id']),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeInOut,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      color: isSelected ? AppTheme.primaryColor : AppTheme.cardColor,
                      border: Border.all(
                        color: isSelected ? AppTheme.primaryColor : AppTheme.dividerColor,
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(style['icon'], color: isSelected ? Colors.white : AppTheme.primaryColor, size: 36),
                        const SizedBox(width: 20),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(style['name'], style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: isSelected ? Colors.white : AppTheme.textPrimaryColor)),
                              const SizedBox(height: 4),
                              Text(style['desc'], style: Theme.of(context).textTheme.bodySmall?.copyWith(color: isSelected ? Colors.white70 : AppTheme.textSecondaryColor)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
} 