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
      'id': 'behind',
      'title': 'Geride Kaldım',
      'subtitle': 'Eksik konularımı tamamlamak istiyorum',
      'description':
          'Önceki dönemlerin eksik kalan konularından başlayarak temeli güçlendiririm',
      'icon': '🔄',
      'color': Colors.orange,
      'features': [
        'Temel konulardan başlama',
        'Eksik konuları kapatma',
        'Sağlam temel oluşturma',
        'Adım adım ilerleme'
      ]
    },
    {
      'id': 'current',
      'title': 'Seviyemde',
      'subtitle': 'Mevcut sınıf seviyemden devam etmek istiyorum',
      'description': 'Sınıf seviyeme uygun konularla normal tempoda ilerlerim',
      'icon': '⚖️',
      'color': Colors.blue,
      'features': [
        'Sınıf seviyesi konular',
        'Normal tempo ilerleme',
        'Dengeli program',
        'Müfredata uygun çalışma'
      ]
    },
    {
      'id': 'ahead',
      'title': 'İlerde Olmak İstiyorum',
      'subtitle': 'Sınıf seviyemin ötesine geçmek istiyorum',
      'description':
          'İleri seviye konularla hızlı ilerleyerek avantaj yakalayacağım',
      'icon': '🚀',
      'color': Colors.green,
      'features': [
        'İleri seviye konular',
        'Hızlı ilerleme',
        'Zorlayıcı program',
        'Avantaj yakalama'
      ]
    },
  ];

  void _selectStartingPoint(String startingPoint) {
    widget.onSelectionChanged(startingPoint);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      color: Theme.of(context).scaffoldBackgroundColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 60),
          Animate(
            effects: const [FadeEffect(duration: Duration(milliseconds: 500))],
            child: Text(
              'Hangi seviyeden başlamak istiyorsun?',
              style: Theme.of(context).textTheme.displaySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.getPrimaryTextColor(context),
                  ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 16),
          Animate(
            delay: const Duration(milliseconds: 200),
            effects: const [FadeEffect(duration: Duration(milliseconds: 500))],
            child: Text(
              'AI koçun sana en uygun öğrenme rotasını hazırlayacak:',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppTheme.getSecondaryTextColor(context),
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
                final startingPoint = _startingPoints[index];
                final isSelected =
                    startingPoint['id'] == widget.onboardingData.startPoint;
                return _buildStartingPointCard(
                    startingPoint, isSelected, index);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStartingPointCard(
      Map<String, dynamic> startingPoint, bool isSelected, int index) {
    return Animate(
      delay: Duration(milliseconds: 300 + 100 * index),
      effects: const [
        FadeEffect(duration: Duration(milliseconds: 400)),
        SlideEffect(begin: Offset(0.3, 0), end: Offset.zero),
      ],
      child: GestureDetector(
        onTap: () => _selectStartingPoint(startingPoint['id']),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          margin: const EdgeInsets.only(bottom: 20),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: isSelected
                ? AppTheme.primaryColor.withOpacity(0.1)
                : Theme.of(context).cardColor,
            border: Border.all(
              color: isSelected
                  ? AppTheme.primaryColor
                  : Theme.of(context).dividerColor,
              width: isSelected ? 2 : 1,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: AppTheme.primaryColor.withAlpha(77),
                      blurRadius: 15,
                      offset: const Offset(0, 5),
                    ),
                  ]
                : [
                    BoxShadow(
                      color: Theme.of(context).shadowColor.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: (startingPoint['color'] as Color).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        startingPoint['icon'],
                        style: const TextStyle(fontSize: 24),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          startingPoint['title'],
                          style:
                              Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: isSelected
                                        ? AppTheme.primaryColor
                                        : AppTheme.getPrimaryTextColor(context),
                                  ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          startingPoint['subtitle'],
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(
                                color: AppTheme.getSecondaryTextColor(context),
                                fontWeight: FontWeight.w500,
                              ),
                        ),
                      ],
                    ),
                  ),
                  if (isSelected)
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.check,
                        color: Colors.white,
                        size: 16,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                startingPoint['description'],
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.getSecondaryTextColor(context),
                      height: 1.4,
                    ),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children:
                    (startingPoint['features'] as List<String>).map((feature) {
                  return Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppTheme.primaryColor.withOpacity(0.1)
                          : (startingPoint['color'] as Color).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected
                            ? AppTheme.primaryColor.withOpacity(0.3)
                            : (startingPoint['color'] as Color)
                                .withOpacity(0.3),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      feature,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: isSelected
                                ? AppTheme.primaryColor
                                : (startingPoint['color'] as Color),
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
