import 'package:flutter/material.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class PreferredStudyTimesPage extends StatefulWidget {
  final OnboardingData onboardingData;
  final VoidCallback onNext;

  const PreferredStudyTimesPage(
      {Key? key, required this.onboardingData, required this.onNext})
      : super(key: key);

  @override
  State<PreferredStudyTimesPage> createState() =>
      _PreferredStudyTimesPageState();
}

class _PreferredStudyTimesPageState extends State<PreferredStudyTimesPage> {
  final List<Map<String, dynamic>> _timeBlocks = [
    {
      'id': 'early_morning',
      'name': 'Erken Sabah',
      'time': '06:00 - 09:00',
      'icon': Icons.wb_twilight
    },
    {
      'id': 'morning',
      'name': 'Sabah',
      'time': '09:00 - 12:00',
      'icon': Icons.wb_sunny_outlined
    },
    {
      'id': 'afternoon',
      'name': 'Öğlen',
      'time': '12:00 - 15:00',
      'icon': Icons.wb_cloudy_outlined
    },
    {
      'id': 'late_afternoon',
      'name': 'İkindi',
      'time': '15:00 - 18:00',
      'icon': Icons.wb_shade
    },
    {
      'id': 'evening',
      'name': 'Akşam',
      'time': '18:00 - 21:00',
      'icon': Icons.nights_stay_outlined
    },
    {
      'id': 'night',
      'name': 'Gece',
      'time': '21:00 - 00:00',
      'icon': Icons.bedtime_outlined
    },
  ];

  List<String> _selected = [];

  @override
  void initState() {
    super.initState();
    _selected = List<String>.from(widget.onboardingData.preferredStudyTimes);
  }

  void _toggle(String id) {
    setState(() {
      if (_selected.contains(id)) {
        _selected.remove(id);
      } else {
        _selected.add(id);
      }
      widget.onboardingData.preferredStudyTimes = List<String>.from(_selected);

      // UI'ı yenilemek için onNext çağır
      widget.onNext();
    });
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
          Text(
            'Çalışma Saatlerini Seç',
            style: Theme.of(context).textTheme.displaySmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.getPrimaryTextColor(context),
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            'Hangi saatlerde çalışmayı tercih ediyorsun? Birden fazla seçebilirsin.',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppTheme.getSecondaryTextColor(context),
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 40),
          Expanded(
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.5,
              ),
              itemCount: _timeBlocks.length,
              itemBuilder: (context, index) {
                final time = _timeBlocks[index];
                final isSelected = _selected.contains(time['id']);
                return GestureDetector(
                  onTap: () => _toggle(time['id']),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeInOut,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      color: isSelected
                          ? AppTheme.primaryColor
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
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              )
                            ]
                          : null,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(time['icon'],
                            color: isSelected
                                ? Colors.white
                                : AppTheme.primaryColor,
                            size: 28),
                        const SizedBox(height: 8),
                        Text(
                          time['name'],
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: isSelected
                                      ? Colors.white
                                      : AppTheme.getPrimaryTextColor(context)),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          time['time'],
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(
                                  color: isSelected
                                      ? Colors.white.withAlpha(230)
                                      : AppTheme.getSecondaryTextColor(
                                          context)),
                          textAlign: TextAlign.center,
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
