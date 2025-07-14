import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class DailyGoalPage extends StatefulWidget {
  final OnboardingData onboardingData;
  final ValueChanged<double> onSelectionChanged;
  final ValueChanged<List<int>> onWorkDaysChanged;

  const DailyGoalPage({
    Key? key,
    required this.onboardingData,
    required this.onSelectionChanged,
    required this.onWorkDaysChanged,
  }) : super(key: key);

  @override
  State<DailyGoalPage> createState() => _DailyGoalPageState();
}

class _DailyGoalPageState extends State<DailyGoalPage> {
  late double _dailyGoal;
  late Set<int> _selectedDays;

  final Map<int, String> _dayLabels = {
    1: 'Pzt',
    2: 'Sal',
    3: 'Çar',
    4: 'Per',
    5: 'Cum',
    6: 'Cmt',
    7: 'Paz',
  };

  @override
  void initState() {
    super.initState();
    _dailyGoal = widget.onboardingData.dailyGoalInHours;
    _selectedDays = widget.onboardingData.workDays.toSet();
  }

  void _onGoalChanged(double value) {
    setState(() {
      _dailyGoal = value;
    });
    widget.onSelectionChanged(value);
  }

  void _onDaySelected(bool selected, int day) {
    setState(() {
      if (selected) {
        _selectedDays.add(day);
      } else {
        // En az bir gün seçili kalmalı
        if (_selectedDays.length > 1) {
          _selectedDays.remove(day);
        }
      }
    });
    widget.onWorkDaysChanged(_selectedDays.toList());
  }

  String _formatDuration(double hours) {
    final int totalMinutes = (hours * 60).round();
    final int dHours = totalMinutes ~/ 60;
    final int dMinutes = totalMinutes % 60;

    if (dHours > 0 && dMinutes > 0) {
      return '$dHours saat $dMinutes dakika';
    } else if (dHours > 0) {
      return '$dHours saat';
    } else {
      return '$dMinutes dakika';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      color: AppTheme.backgroundColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Animate(
            effects: const [FadeEffect(duration: Duration(milliseconds: 500))],
            child: Text(
              'Haftalık Rutinini Ayarla',
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
              'Hangi günler ve günde kaç saat çalışmak istersin?',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppTheme.textSecondaryColor,
                  ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 40),

          // Day Selection Chips
          Animate(
            delay: const Duration(milliseconds: 300),
            effects: const [FadeEffect()],
            child: Wrap(
              alignment: WrapAlignment.center,
              spacing: 8.0,
              children: _dayLabels.entries.map((entry) {
                final isSelected = _selectedDays.contains(entry.key);
                return FilterChip(
                  label: Text(entry.value),
                  selected: isSelected,
                  onSelected: (selected) => _onDaySelected(selected, entry.key),
                  selectedColor: AppTheme.primaryColor.withOpacity(0.8),
                  checkmarkColor: Colors.white,
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : AppTheme.textPrimaryColor,
                    fontWeight: FontWeight.w500,
                  ),
                  shape: StadiumBorder(
                      side: BorderSide(
                          color: isSelected
                              ? AppTheme.primaryColor
                              : AppTheme.dividerColor)),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: 40),

          // Hedef Süre Göstergesi
          Animate(
            delay: const Duration(milliseconds: 300),
            effects: const [ScaleEffect(curve: Curves.easeOut)],
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.cardColor,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppTheme.dividerColor),
              ),
              child: Text(
                _formatDuration(_dailyGoal),
                style: Theme.of(context).textTheme.displaySmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                textAlign: TextAlign.center,
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Slider
          Animate(
            delay: const Duration(milliseconds: 400),
            effects: const [FadeEffect(duration: Duration(milliseconds: 500))],
            child: SliderTheme(
              data: SliderTheme.of(context).copyWith(
                trackHeight: 10.0,
                trackShape: const RoundedRectSliderTrackShape(),
                activeTrackColor: AppTheme.primaryColor,
                inactiveTrackColor: AppTheme.dividerColor,
                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 14.0),
                thumbColor: AppTheme.primaryColor,
                overlayColor: AppTheme.primaryColor.withOpacity(0.2),
                overlayShape: const RoundSliderOverlayShape(overlayRadius: 28.0),
              ),
              child: Slider(
                value: _dailyGoal,
                min: 0.5, // 30 dakika
                max: 16.0, // 16 saat
                divisions: 31, // 30 dakikalık artışlar (15.5 saat * 2)
                onChanged: _onGoalChanged,
              ),
            ),
          ),
        ],
      ),
    );
  }
} 