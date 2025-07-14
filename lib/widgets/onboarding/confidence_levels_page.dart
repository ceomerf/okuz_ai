import 'package:flutter/material.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class ConfidenceLevelsPage extends StatefulWidget {
  final OnboardingData onboardingData;
  final VoidCallback onNext;

  const ConfidenceLevelsPage({Key? key, required this.onboardingData, required this.onNext}) : super(key: key);

  @override
  State<ConfidenceLevelsPage> createState() => _ConfidenceLevelsPageState();
}

class _ConfidenceLevelsPageState extends State<ConfidenceLevelsPage> {
  final List<String> _subjects = [
    'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türk Dili ve Edebiyatı',
    'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü', 'Yabancı Dil'
  ];

  final Map<String, String> _levels = {
    'low': 'Zorlanıyorum',
    'medium': 'Orta',
    'high': 'Çok İyi',
  };

  @override
  void initState() {
    super.initState();
    // Varsayılan değerleri yükle
    for (final subject in _subjects) {
      widget.onboardingData.confidenceLevels[subject] ??= 'medium';
    }
  }

  void _setLevel(String subject, String level) {
    setState(() {
      widget.onboardingData.confidenceLevels[subject] = level;
      
      // UI'ı yenilemek için onNext çağır
      widget.onNext();
    });
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
            'Derslerdeki Güven Seviyen',
            style: Theme.of(context).textTheme.displaySmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimaryColor,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            'Her ders için kendini ne kadar iyi hissediyorsun?',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppTheme.textSecondaryColor,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 30),
          Expanded(
            child: ListView.separated(
              itemCount: _subjects.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final subject = _subjects[index];
                final selected = widget.onboardingData.confidenceLevels[subject] ?? 'medium';
                return Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: AppTheme.dividerColor, width: 1),
                  ),
                  color: AppTheme.cardColor,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Ders adı
                        Text(
                          subject, 
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold
                          ),
                        ),
                        const SizedBox(height: 8),
                        // Seviye seçenekleri
                        Row(
                          children: _levels.entries.map((entry) {
                            final isSelected = selected == entry.key;
                            return Expanded(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 4),
                                child: ChoiceChip(
                                  label: Text(
                                    entry.value,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isSelected ? Colors.white : AppTheme.textPrimaryColor,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                  selected: isSelected,
                                  onSelected: (_) => _setLevel(subject, entry.key),
                                  selectedColor: AppTheme.primaryColor,
                                  backgroundColor: AppTheme.cardColor,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    side: BorderSide(
                                      color: isSelected ? AppTheme.primaryColor : Colors.grey.shade300,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
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