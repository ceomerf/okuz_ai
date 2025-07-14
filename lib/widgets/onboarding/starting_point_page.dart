import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class StartingPointPage extends StatefulWidget {
  final OnboardingData onboardingData;
  final ValueChanged<String> onSelectionChanged;

  const StartingPointPage({
    Key? key,
    required this.onboardingData,
    required this.onSelectionChanged,
  }) : super(key: key);

  @override
  State<StartingPointPage> createState() => _StartingPointPageState();
}

class _StartingPointPageState extends State<StartingPointPage> {
  final List<Map<String, dynamic>> _startingPoints = [
    {
      'id': 'school',
      'title': 'Okulla Birlikte İlerle',
      'subtitle': 'Ders programını okulunla senkronize edelim.',
      'icon': Icons.school_outlined,
      'isRecommended': true,
    },
    {
      'id': 'beginner',
      'title': 'En Baştan Başla',
      'subtitle': 'Tüm konuları temelden alarak eksiksiz bir başlangıç yap.',
      'icon': Icons.refresh_rounded,
      'isRecommended': false,
    },
  ];

  void _selectStartingPoint(String pointId) {
    widget.onSelectionChanged(pointId);
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
          Animate(
            effects: const [FadeEffect(duration: Duration(milliseconds: 500))],
            child: Text(
              'Yolculuğa Nereden Başlıyoruz?',
              style: Theme.of(context).textTheme.displaySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimaryColor,
                  ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 16),
          Animate(
            delay: const Duration(milliseconds: 200),
            effects: const [FadeEffect(duration: Duration(milliseconds: 500))],
            child: Text(
              'Sana en uygun başlangıç noktasını seç.',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppTheme.textSecondaryColor,
                  ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 40),
          Expanded(
            child: ListView.builder(
              padding: EdgeInsets.zero,
              itemCount: _startingPoints.length,
              itemBuilder: (context, index) {
                final point = _startingPoints[index];
                final isSelected = point['id'] == widget.onboardingData.startPoint;
                return _buildStartingPointCard(point, isSelected, index);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStartingPointCard(Map<String, dynamic> point, bool isSelected, int index) {
    final isRecommended = point['isRecommended'] == true;
    return Animate(
      delay: Duration(milliseconds: 300 + 100 * index),
      effects: const [
        FadeEffect(duration: Duration(milliseconds: 400)),
        SlideEffect(begin: Offset(0, 0.2), end: Offset.zero)
      ],
      child: GestureDetector(
        onTap: () => _selectStartingPoint(point['id']),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          padding: const EdgeInsets.all(20),
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            color: isSelected ? AppTheme.primaryColor : AppTheme.cardColor,
            border: Border.all(
              color: isSelected ? AppTheme.primaryColor : AppTheme.dividerColor,
              width: isSelected ? 2 : 1,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: AppTheme.primaryColor.withOpacity(0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          child: Row(
            children: [
              Icon(
                point['icon'],
                size: 40,
                color: isSelected ? Colors.white : AppTheme.primaryColor,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (isRecommended)
                      Text(
                        'Tavsiye Edilen',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: isSelected ? Colors.white.withOpacity(0.8) : AppTheme.successColor,
                            ),
                      ),
                    Text(
                      point['title'],
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.white : AppTheme.textPrimaryColor,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      point['subtitle'],
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: isSelected ? Colors.white.withOpacity(0.9) : AppTheme.textSecondaryColor,
                          ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                const Icon(
                  Icons.check_circle_rounded,
                  color: Colors.white,
                  size: 28,
                ),
            ],
          ),
        ),
      ),
    );
  }
} 