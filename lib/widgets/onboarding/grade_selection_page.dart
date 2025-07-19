import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:cloud_functions/cloud_functions.dart';

class GradeSelectionPage extends StatefulWidget {
  final OnboardingData onboardingData;
  final ValueChanged<String> onSelectionChanged;

  const GradeSelectionPage({
    Key? key,
    required this.onboardingData,
    required this.onSelectionChanged,
  }) : super(key: key);

  @override
  State<GradeSelectionPage> createState() => _GradeSelectionPageState();
}

class _GradeSelectionPageState extends State<GradeSelectionPage> {
  final List<String> _grades = ['9', '10', '11', '12', 'Mezun'];
  bool _isHoliday = false;
  String _holidayReason = '';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkHolidayStatus();
  }

  Future<void> _checkHolidayStatus() async {
    try {
      final functions = FirebaseFunctions.instance;
      final callable = functions.httpsCallable('checkHolidayStatus');
      final result = await callable.call();

      if (mounted) {
        setState(() {
          _isHoliday = result.data['isHoliday'] ?? false;
          _holidayReason = result.data['holidayReason'] ?? '';
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Tatil durumu kontrol hatası: $e');
      if (mounted) {
        setState(() {
          _isHoliday = false;
          _isLoading = false;
        });
      }
    }
  }

  void _selectGrade(String grade) {
    widget.onSelectionChanged(grade);
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
              'Harika! Hadi seni daha yakından tanıyalım.',
              style: Theme.of(context).textTheme.displaySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.getPrimaryTextColor(context),
                  ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 16),
          if (_isLoading)
            const Center(child: CircularProgressIndicator())
          else
            Animate(
              delay: const Duration(milliseconds: 200),
              effects: const [
                FadeEffect(duration: Duration(milliseconds: 500))
              ],
              child: Column(
                children: [
                  Text(
                    _isHoliday
                        ? 'Kaçıncı sınıfa gireceksin?'
                        : 'Hangi sınıftasın?',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: AppTheme.getSecondaryTextColor(context),
                          fontWeight: FontWeight.w600,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  if (_isHoliday && _holidayReason.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: AppTheme.primaryColor.withOpacity(0.3),
                          width: 1,
                        ),
                      ),
                      child: Text(
                        '🏖️ $_holidayReason döneminde',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppTheme.primaryColor,
                              fontWeight: FontWeight.w500,
                            ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          const SizedBox(height: 40),
          if (!_isLoading)
            Expanded(
              child: ListView.builder(
                padding: EdgeInsets.zero,
                itemCount: _grades.length,
                itemBuilder: (context, index) {
                  final grade = _grades[index];
                  final isSelected = grade == widget.onboardingData.grade;
                  return _buildGradeCard(grade, isSelected, index);
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildGradeCard(String grade, bool isSelected, int index) {
    String displayText;
    if (grade == 'Mezun') {
      displayText = _isHoliday ? 'Üniversiteye Hazırlanıyorum' : 'Mezun';
    } else {
      displayText = _isHoliday ? '$grade. Sınıfa Geçeceğim' : '$grade. Sınıf';
    }
    return Animate(
      delay: Duration(milliseconds: 300 + 100 * index),
      effects: const [
        FadeEffect(duration: Duration(milliseconds: 400)),
        SlideEffect(begin: Offset(0.2, 0), end: Offset.zero),
      ],
      child: GestureDetector(
        onTap: () => _selectGrade(grade),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          height: 70,
          margin: const EdgeInsets.only(bottom: 16),
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
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : [
                    BoxShadow(
                      color: Theme.of(context).shadowColor.withOpacity(0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          child: Center(
            child: Text(
              displayText,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected
                        ? Colors.white
                        : AppTheme.getPrimaryTextColor(context),
                  ),
            ),
          ),
        ),
      ),
    );
  }
}
