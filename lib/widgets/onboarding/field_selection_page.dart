import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class FieldSelectionPage extends StatefulWidget {
  final OnboardingData onboardingData;
  final ValueChanged<String> onSelectionChanged;

  const FieldSelectionPage({
    Key? key,
    required this.onboardingData,
    required this.onSelectionChanged,
  }) : super(key: key);

  @override
  State<FieldSelectionPage> createState() => _FieldSelectionPageState();
}

class _FieldSelectionPageState extends State<FieldSelectionPage> {
  String? _selectedField;

  @override
  void initState() {
    super.initState();
    _selectedField = widget.onboardingData.academicTrack;
  }

  final List<Map<String, dynamic>> _fields = [
    {'id': 'sayisal', 'name': 'Sayısal', 'icon': Icons.calculate_outlined},
    {'id': 'esit', 'name': 'Eşit Ağırlık', 'icon': Icons.balance_outlined},
    {'id': 'sozel', 'name': 'Sözel', 'icon': Icons.history_edu_outlined},
    {'id': 'dil', 'name': 'Dil', 'icon': Icons.language_outlined},
    {
      'id': 'tyt',
      'name': 'Sadece TYT',
      'icon': Icons.lightbulb_outline_rounded
    },
  ];

  void _selectField(String fieldId) {
    setState(() {
      _selectedField = fieldId;
    });
    widget.onSelectionChanged(fieldId);
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
              'Hedefine Giden Yolu Seç',
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
              'Hangi alanda sınava hazırlanıyorsun?',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppTheme.getSecondaryTextColor(context),
                  ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 40),
          Expanded(
            child: GridView.builder(
              padding: EdgeInsets.zero,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 1,
              ),
              itemCount: _fields.length,
              itemBuilder: (context, index) {
                final field = _fields[index];
                final isSelected = field['id'] == _selectedField;
                return _buildFieldCard(field, isSelected, index);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFieldCard(
      Map<String, dynamic> field, bool isSelected, int index) {
    return Animate(
      delay: Duration(milliseconds: 300 + 100 * index),
      effects: [
        const FadeEffect(duration: Duration(milliseconds: 400)),
        ScaleEffect(
          begin: const Offset(0.9, 0.9),
          end: const Offset(1, 1),
          curve: Curves.easeOut,
        ),
      ],
      child: GestureDetector(
        onTap: () => _selectField(field['id']),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
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
                      color: Theme.of(context).shadowColor.withValues(alpha: 0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                field['icon'],
                color: isSelected ? Colors.white : AppTheme.primaryColor,
                size: 40,
              ),
              const SizedBox(height: 16),
              Text(
                field['name'],
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight:
                          isSelected ? FontWeight.bold : FontWeight.w500,
                      color: isSelected
                          ? Colors.white
                          : AppTheme.getPrimaryTextColor(context),
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
