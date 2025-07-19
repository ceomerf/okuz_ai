import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../models/onboarding_data.dart';
import '../../theme/app_theme.dart';

class HolidayPlanTypePage extends StatefulWidget {
  final OnboardingData onboardingData;
  final String holidayReason;
  final List<Map<String, dynamic>>?
      upcomingHolidays; // Gelecek haftanın tatilleri
  final Function(String) onSelectionChanged;

  const HolidayPlanTypePage({
    Key? key,
    required this.onboardingData,
    required this.holidayReason,
    this.upcomingHolidays,
    required this.onSelectionChanged,
  }) : super(key: key);

  @override
  State<HolidayPlanTypePage> createState() => _HolidayPlanTypePageState();
}

class _HolidayPlanTypePageState extends State<HolidayPlanTypePage> {
  String? selectedPlanType;
  Map<String, bool> holidayWorkPreferences =
      {}; // Tatil günlerinde çalışma tercihleri

  @override
  void initState() {
    super.initState();
    selectedPlanType = widget.onboardingData.holidayPlanType;

    // Gelecek tatil günleri için varsayılan tercihler
    if (widget.upcomingHolidays != null) {
      for (var holiday in widget.upcomingHolidays!) {
        holidayWorkPreferences[holiday['name']] =
            false; // Varsayılan: çalışma yok
      }
    }
  }

  void _selectPlanType(String planType) {
    setState(() {
      selectedPlanType = planType;
      // Plan tipini onboarding data'ya kaydet
      widget.onboardingData.holidayPlanType = planType;
      // Tatil çalışma tercihlerini de kaydet
      widget.onboardingData.holidayWorkPreferences =
          Map.from(holidayWorkPreferences);
    });
    widget.onSelectionChanged(planType);
  }

  void _toggleHolidayWork(String holidayName, bool willWork) {
    setState(() {
      holidayWorkPreferences[holidayName] = willWork;
      widget.onboardingData.holidayWorkPreferences =
          Map.from(holidayWorkPreferences);
    });
  }

  List<Map<String, dynamic>> get planTypes => [
        {
          'title': 'Dengeli Program',
          'description': 'Hem dinlen hem de hafif çalışma yap',
          'value': 'holiday_balanced',
          'icon': Icons.balance,
          'color': Colors.blue,
        },
        {
          'title': 'Eksiklerimi Kapatayım',
          'description': 'Geçmiş konuları tekrar et ve pekiştir',
          'value': 'holiday_review',
          'icon': Icons.refresh,
          'color': Colors.orange,
        },
        {
          'title': 'Önden Gideyim',
          'description': 'Yeni dönem konularına başla',
          'value': 'holiday_prepare',
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

  List<Widget> _buildUpcomingHolidaysSection() {
    return [
      const SizedBox(height: 24),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.orange.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.orange.shade200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.calendar_today,
                    color: Colors.orange.shade600, size: 20),
                const SizedBox(width: 8),
                Text(
                  'Gelecek Haftanın Tatil Günleri',
                  style: GoogleFonts.figtree(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.orange.shade800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Bu günlerde çalışmak ister misiniz?',
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: Colors.orange.shade700,
              ),
            ),
            const SizedBox(height: 12),
            ...widget.upcomingHolidays!
                .map((holiday) => _buildHolidayWorkOption(
                      holiday['name'] as String,
                      holiday['date'] as String,
                    ))
                .toList(),
          ],
        ),
      ),
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
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isSelected ? color : Colors.grey.shade300,
          width: isSelected ? 2 : 1,
        ),
        color: isSelected ? color.withOpacity(0.1) : Colors.white,
      ),
      child: InkWell(
        onTap: () => _selectPlanType(value),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: color,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.figtree(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: isSelected ? color : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                Icon(
                  Icons.check_circle,
                  color: color,
                  size: 24,
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
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Padding(
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
                  color: AppTheme.primaryColor,
                ),
              ).animate().fadeIn(duration: 600.ms).slideX(begin: -0.3, end: 0),

              const SizedBox(height: 8),

              Text(
                'Mevcut tatil dönemini ve gelecek tatil günlerini nasıl değerlendirmek istersiniz?',
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  color: Colors.grey[600],
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
                  color: AppTheme.primaryColor,
                ),
              ).animate().fadeIn(delay: 300.ms),

              const SizedBox(height: 16),

              // Gelecek haftadaki tatil günleri için tercih sorgusu
              if (widget.upcomingHolidays != null &&
                  widget.upcomingHolidays!.isNotEmpty)
                ..._buildUpcomingHolidaysSection(),

              const Spacer(),

              // Plan türü seçimleri
              ...planTypes.map((planType) => Padding(
                    padding: const EdgeInsets.only(bottom: 12.0),
                    child: _buildPlanTypeCard(
                      title: planType['title']!,
                      description: planType['description']!,
                      value: planType['value']!,
                      icon: planType['icon']!,
                      isSelected: selectedPlanType == planType['value'],
                    ),
                  )),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlanTypeOption(
    String value,
    String title,
    String description,
    IconData icon,
    Color color,
  ) {
    final isSelected = selectedPlanType == value;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isSelected ? color : Colors.grey.shade300,
          width: isSelected ? 2 : 1,
        ),
        color: isSelected ? color.withOpacity(0.1) : Colors.white,
      ),
      child: InkWell(
        onTap: () => _selectPlanType(value),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: color,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.figtree(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: isSelected ? color : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                Icon(
                  Icons.check_circle,
                  color: color,
                  size: 24,
                ),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2);
  }

  Widget _buildHolidayWorkOption(String holidayName, String date) {
    final willWork = holidayWorkPreferences[holidayName] ?? false;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
        color: Colors.white,
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    holidayName,
                    style: GoogleFonts.figtree(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    date,
                    style: GoogleFonts.figtree(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            Row(
              children: [
                Text(
                  'Çalışacağım',
                  style: GoogleFonts.figtree(
                    fontSize: 14,
                    fontWeight: willWork ? FontWeight.w600 : FontWeight.normal,
                    color: willWork ? AppTheme.primaryColor : Colors.grey[600],
                  ),
                ),
                const SizedBox(width: 8),
                Switch(
                  value: willWork,
                  onChanged: (value) => _toggleHolidayWork(holidayName, value),
                  activeColor: AppTheme.primaryColor,
                ),
              ],
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.2);
  }
}
