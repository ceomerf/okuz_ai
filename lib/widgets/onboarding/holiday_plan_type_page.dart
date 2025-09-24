import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../models/onboarding_data.dart';
import '../../theme/app_theme.dart';

class HolidayPlanTypePage extends StatefulWidget {
  final OnboardingData onboardingData;
  final String holidayReason;
  final Function(String) onSelectionChanged;

  const HolidayPlanTypePage({
    Key? key,
    required this.onboardingData,
    required this.holidayReason,
    required this.onSelectionChanged,
  }) : super(key: key);

  @override
  State<HolidayPlanTypePage> createState() => _HolidayPlanTypePageState();
}

class _HolidayPlanTypePageState extends State<HolidayPlanTypePage> {
  String? selectedPlanType;

  @override
  void initState() {
    super.initState();
    selectedPlanType = widget.onboardingData.holidayPlanType;
  }

  void _selectPlanType(String planType) {
    setState(() {
      selectedPlanType = planType;
      // Plan tipini onboarding data'ya kaydet
      widget.onboardingData.holidayPlanType = planType;
    });
    widget.onSelectionChanged(planType);
  }

  List<Map<String, dynamic>> get planTypes {
    final gradeString = widget.onboardingData.grade ?? '11';
    final grade = int.tryParse(gradeString) ?? 11; // Varsayılan 11. sınıf
    final academicTrack = widget.onboardingData.academicTrack ?? 'sayisal';

    print('🎯 HolidayPlanTypePage - Sınıf bilgisi (string): "$gradeString"');
    print('🎯 HolidayPlanTypePage - Parse edilen sınıf: $grade');
    print('🎯 HolidayPlanTypePage - Akademik alan: $academicTrack');

    // Eğer sınıf bilgisi boş veya geçersizse 11. sınıf varsayılan olarak kullan
    if (gradeString.isEmpty || grade < 8 || grade > 12) {
      print(
          '⚠️ Geçersiz sınıf bilgisi, 11. sınıf varsayılan olarak kullanılıyor');
      return _getGrade11Options(academicTrack);
    }

    // Sınıf seviyesine göre özel seçenekler
    switch (grade) {
      case 8:
        return [
          {
            'title': 'Lise Hazırlık',
            'description': '8. sınıf tekrarı ve lise temel kavramları',
            'value': 'grade8_prep',
            'icon': Icons.school,
            'color': Colors.blue,
          },
          {
            'title': 'Hafif Çalışma',
            'description': 'Sadece eksik konuları tamamla',
            'value': 'light_study',
            'icon': Icons.beach_access,
            'color': Colors.green,
          },
        ];

      case 9:
        return [
          {
            'title': 'TYT Tanışma',
            'description': 'TYT formatına alışma ve temel konular',
            'value': 'tyt_intro',
            'icon': Icons.explore,
            'color': Colors.blue,
          },
          {
            'title': '9. Sınıf Hazırlık',
            'description': 'Yeni dönem konularına hazırlık',
            'value': 'grade9_prep',
            'icon': Icons.trending_up,
            'color': Colors.green,
          },
          {
            'title': 'Sadece Dinleneceğim',
            'description': 'Bu tatilde hiç çalışmam',
            'value': 'holiday_rest',
            'icon': Icons.beach_access,
            'color': Colors.purple,
          },
        ];

      case 10:
        final hasTYTKnowledge =
            widget.onboardingData.confidenceLevels['TYT'] != null;
        return [
          {
            'title': 'Sadece TYT Tekrarı',
            'description': 'TYT konularını pekiştir',
            'value': 'tyt_review',
            'icon': Icons.refresh,
            'color': Colors.orange,
          },
          {
            'title': '10. Sınıf Genel Tekrar + TYT',
            'description': 'Geçen yıl ve TYT karması (%50-%50)',
            'value': 'mixed_grade10_tyt',
            'icon': Icons.balance,
            'color': Colors.blue,
          },
          {
            'title': '11. Sınıf Hazırlık',
            'description': 'Yeni dönem konularına odaklan (%30 TYT, %70 yeni)',
            'value': 'grade11_prep',
            'icon': Icons.trending_up,
            'color': Colors.green,
          },
          {
            'title': 'Sadece Dinleneceğim',
            'description': 'Bu tatilde hiç çalışmam',
            'value': 'holiday_rest',
            'icon': Icons.beach_access,
            'color': Colors.purple,
          },
        ];

      case 11:
        return [
          {
            'title': 'TYT Yoğunluklu',
            'description': 'TYT konularını sağlamlaştır (%70 TYT, %30 AYT)',
            'value': 'tyt_focused',
            'icon': Icons.fitness_center,
            'color': Colors.red,
          },
          {
            'title': 'AYT Ağırlıklı ($academicTrack)',
            'description': 'AYT konularına başla (%30 TYT, %70 AYT)',
            'value': 'ayt_focused',
            'icon': Icons.rocket_launch,
            'color': Colors.green,
          },
          {
            'title': 'Karma Program',
            'description': 'Haftalık dengeli dağılım (3 gün TYT, 3 gün AYT)',
            'value': 'balanced_tyt_ayt',
            'icon': Icons.balance,
            'color': Colors.blue,
          },
          {
            'title': 'Sadece Dinleneceğim',
            'description': 'Bu tatilde hiç çalışmam',
            'value': 'holiday_rest',
            'icon': Icons.beach_access,
            'color': Colors.purple,
          },
        ];

      case 12:
        return [
          {
            'title': 'Okul Paralel Program',
            'description': 'AYT konuları okul sırasına göre',
            'value': 'school_parallel',
            'icon': Icons.school,
            'color': Colors.blue,
          },
          {
            'title': 'Sınav Odaklı Program',
            'description': 'TYT+AYT senkronize ve sınav odaklı',
            'value': 'exam_focused',
            'icon': Icons.assignment,
            'color': Colors.red,
          },
          {
            'title': 'Deneme Odaklı',
            'description': 'Haftalık deneme + eksik konular',
            'value': 'trial_focused',
            'icon': Icons.quiz,
            'color': Colors.orange,
          },
          {
            'title': 'Sadece Dinleneceğim',
            'description': 'Bu tatilde hiç çalışmam',
            'value': 'holiday_rest',
            'icon': Icons.beach_access,
            'color': Colors.purple,
          },
        ];

      default: // Mezun
        return [
          {
            'title': 'TYT-AYT Hatırlatma',
            'description': '2-3 hafta TYT-AYT genel tekrar',
            'value': 'tyt_ayt_review',
            'icon': Icons.refresh,
            'color': Colors.orange,
          },
          {
            'title': 'Yoğun Sınav Odaklı',
            'description': 'AYT ve deneme ritmine geçiş',
            'value': 'intensive_exam',
            'icon': Icons.fitness_center,
            'color': Colors.red,
          },
          {
            'title': 'Haftalık Tekrar Sistemi',
            'description': 'Sistemli tekrar günleri',
            'value': 'weekly_review',
            'icon': Icons.calendar_today,
            'color': Colors.blue,
          },
        ];
    }
  }

  List<Map<String, dynamic>> _getGrade11Options(String academicTrack) {
    return [
      {
        'title': 'TYT Yoğunluklu',
        'description': 'TYT konularını sağlamlaştır (%70 TYT, %30 AYT)',
        'value': 'tyt_focused',
        'icon': Icons.fitness_center,
        'color': Colors.red,
      },
      {
        'title': 'AYT Ağırlıklı ($academicTrack)',
        'description': 'AYT konularına başla (%30 TYT, %70 AYT)',
        'value': 'ayt_focused',
        'icon': Icons.rocket_launch,
        'color': Colors.green,
      },
      {
        'title': 'Karma Program',
        'description': 'Haftalık dengeli dağılım (3 gün TYT, 3 gün AYT)',
        'value': 'balanced_tyt_ayt',
        'icon': Icons.balance,
        'color': Colors.blue,
      },
      {
        'title': 'Sadece Dinleneceğim',
        'description': 'Bu tatilde hiç çalışmam',
        'value': 'holiday_rest',
        'icon': Icons.beach_access,
        'color': Colors.purple,
      },
    ];
  }

  Widget _buildPlanTypeCard({
    required String title,
    required String description,
    required String value,
    required IconData icon,
    required bool isSelected,
  }) {
    final planType = planTypes.firstWhere((p) => p['value'] == value);
    final color = planType['color'] as Color;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isSelected ? color : Theme.of(context).dividerColor,
          width: isSelected ? 2 : 1,
        ),
        color: isSelected
            ? color.withValues(alpha: 0.1)
            : Theme.of(context).cardColor,
      ),
      child: InkWell(
        onTap: () => _selectPlanType(value),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: color,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isSelected
                            ? color
                            : Theme.of(context).textTheme.titleMedium?.color,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      description,
                      style: GoogleFonts.figtree(
                        fontSize: 12,
                        color: Theme.of(context).textTheme.bodyMedium?.color,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                Icon(
                  Icons.check_circle,
                  color: color,
                  size: 20,
                ),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Başlık
              Text(
                'Tatil Günleri ve Çalışma Tercihiniz',
                style: GoogleFonts.figtree(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).primaryColor,
                ),
              ).animate().fadeIn(duration: 600.ms).slideX(begin: -0.3, end: 0),

              const SizedBox(height: 8),

              Text(
                'Mevcut tatil dönemini nasıl değerlendirmek istersiniz?',
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  color: Theme.of(context).textTheme.bodyMedium?.color,
                  height: 1.4,
                ),
              )
                  .animate()
                  .fadeIn(delay: 200.ms, duration: 600.ms)
                  .slideX(begin: -0.3, end: 0),

              const SizedBox(height: 32),

              // Mevcut tatil için plan türü seçimi
              Text(
                'Mevcut Tatil Dönemi (${widget.holidayReason})',
                style: GoogleFonts.figtree(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Theme.of(context).primaryColor,
                ),
              ).animate().fadeIn(delay: 300.ms),

              const SizedBox(height: 16),

              // Plan türü seçimleri
              ...planTypes.map((planType) => Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: _buildPlanTypeCard(
                      title: planType['title']!,
                      description: planType['description']!,
                      value: planType['value']!,
                      icon: planType['icon']!,
                      isSelected: selectedPlanType == planType['value'],
                    ),
                  )),

              // Alt boşluk
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
