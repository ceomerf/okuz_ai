import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class WeaknessIdentificationPage extends StatefulWidget {
  final OnboardingData onboardingData;
  final VoidCallback onNext;
  final Function(bool) onSelectionChanged; // Yeni callback

  const WeaknessIdentificationPage({
    Key? key,
    required this.onboardingData,
    required this.onNext,
    required this.onSelectionChanged, // Yeni callback
  }) : super(key: key);

  @override
  _WeaknessIdentificationPageState createState() =>
      _WeaknessIdentificationPageState();
}

class _WeaknessIdentificationPageState extends State<WeaknessIdentificationPage>
    with TickerProviderStateMixin {
  final List<String> _selectedWeaknesses = [];
  late AnimationController _fadeController;
  late AnimationController _slideController;
  late AnimationController _pulseController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();

    // Animasyon controller'ları
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeInOut,
    ));

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutCubic,
    ));

    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.1,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));

    // Mevcut veriyi yükle
    if (widget.onboardingData.weaknesses != null) {
      _selectedWeaknesses.addAll(widget.onboardingData.weaknesses!);
    }

    // Animasyonları başlat
    _fadeController.forward();
    _slideController.forward();
    _pulseController.repeat(reverse: true);
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _slideController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  void _onChipSelected(String subject, bool selected) {
    setState(() {
      if (selected) {
        if (_selectedWeaknesses.length < 3) {
          _selectedWeaknesses.add(subject);
          // Haptic feedback
          HapticFeedback.lightImpact();
        } else {
          // Kullanıcıyı uyar
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.info_outline, color: Colors.white),
                  const SizedBox(width: 8),
                  const Text('En fazla 3 ders seçebilirsiniz.'),
                ],
              ),
              backgroundColor: Theme.of(context).colorScheme.error,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              duration: const Duration(seconds: 2),
            ),
          );
        }
      } else {
        _selectedWeaknesses.remove(subject);
        HapticFeedback.lightImpact();
      }
    });

    // İlerle butonunun aktif olması için callback çağır
    widget.onSelectionChanged(_selectedWeaknesses.isNotEmpty);
  }

  @override
  Widget build(BuildContext context) {
    // Akademik alanı kontrol et ve gerekirse güncelle
    if (widget.onboardingData.academicTrack == null ||
        widget.onboardingData.academicTrack!.isEmpty) {
      // Akademik alan boşsa "sayısal" olarak ayarla
      widget.onboardingData.academicTrack = "sayısal";
    }

    // Akademik alanı düzelt (eski ID'leri yeni ID'lere dönüştür)
    if (widget.onboardingData.academicTrack == "sayisal") {
      widget.onboardingData.academicTrack = "sayısal";
    } else if (widget.onboardingData.academicTrack == "esit") {
      widget.onboardingData.academicTrack = "eşit ağırlık";
    } else if (widget.onboardingData.academicTrack == "sozel") {
      widget.onboardingData.academicTrack = "sözel";
    } else if (widget.onboardingData.academicTrack == "tyt") {
      widget.onboardingData.academicTrack = "sadece tyt";
    }

    // Sınıf kontrolü
    if (widget.onboardingData.grade == null ||
        widget.onboardingData.grade!.isEmpty) {
      widget.onboardingData.grade = "12";
    }

    // Dersleri belirle - Her durumda akademik alana göre dersleri filtrele
    List<String> allSubjects = [];

    // Akademik alana göre dersleri filtrele (kullanıcı seçimi olsa bile)
    allSubjects = _getDefaultSubjectsForGrade();

    // Debug bilgisi yazdır
    print('🔍 Grade: ${widget.onboardingData.grade}');
    print('🔍 Academic Track: ${widget.onboardingData.academicTrack}');
    print('🔍 Subjects Count: ${allSubjects.length}');
    print('🔍 Subjects: $allSubjects');

    // Eğer kullanıcı özel ders seçimi yapmışsa ve AI Önerisi değilse,
    // seçilen dersleri akademik alan filtresiyle kesişimini al
    if (widget.onboardingData.planScope != 'AI Önerisi' &&
        widget.onboardingData.selectedSubjects.isNotEmpty) {
      // Sadece akademik alana uygun olan seçilmiş dersleri göster
      allSubjects = allSubjects
          .where((subject) =>
              widget.onboardingData.selectedSubjects.contains(subject))
          .toList();
    }
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Container(
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: SlideTransition(
              position: _slideAnimation,
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Section
                    _buildHeader(isDark),
                    const SizedBox(height: 32),

                    // Selection Counter
                    _buildSelectionCounter(isDark),
                    const SizedBox(height: 24),

                    // Subjects Grid
                    Expanded(
                      child: _buildSubjectsGrid(allSubjects, isDark),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Icon ve başlık
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryColor, // Turuncu
                    AppTheme.primaryColor.withOpacity(0.8),
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryColor.withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Icon(
                Icons.report_problem_outlined,
                color: Colors.white,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Zayıf Halkalar',
                    style: TextStyle(
                      fontFamily: 'Figtree',
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : const Color(0xFF1E293B),
                    ),
                  ),
                  Text(
                    'En çok zorlandığın dersleri belirleyelim',
                    style: TextStyle(
                      fontFamily: 'Figtree',
                      fontSize: 16,
                      fontWeight: FontWeight.w400,
                      color: isDark
                          ? Colors.white70
                          : AppTheme.lightTextSecondaryColor,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark
                ? const Color(0xFF2D3748).withOpacity(0.8)
                : Colors.white.withOpacity(0.9),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? const Color(0xFF4A5568) : const Color(0xFFE2E8F0),
            ),
          ),
          child: Row(
            children: [
              Icon(
                Icons.trending_up,
                color: AppTheme.primaryColor,
                size: 20,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Bu derslere programında özel bir yer ayıracağız ve daha fazla pratik yapacağız.',
                  style: TextStyle(
                    fontFamily: 'Figtree',
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: isDark ? Colors.white70 : const Color(0xFF475569),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSelectionCounter(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF2D3748).withOpacity(0.8)
            : Colors.white.withOpacity(0.9),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? const Color(0xFF4A5568) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Row(
        children: [
          AnimatedBuilder(
            animation: _pulseAnimation,
            builder: (context, child) {
              return Transform.scale(
                scale: _selectedWeaknesses.length == 3
                    ? _pulseAnimation.value
                    : 1.0,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: _selectedWeaknesses.length == 3
                        ? AppTheme.successColor
                        : AppTheme.primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    _selectedWeaknesses.length == 3
                        ? Icons.check_circle
                        : Icons.circle_outlined,
                    color: _selectedWeaknesses.length == 3
                        ? Colors.white
                        : AppTheme.primaryColor,
                    size: 16,
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _selectedWeaknesses.length == 3
                  ? 'Mükemmel! 3 ders seçtin'
                  : '${_selectedWeaknesses.length}/3 ders seçtin',
              style: TextStyle(
                fontFamily: 'Figtree',
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: _selectedWeaknesses.length == 3
                    ? const Color(0xFF66BB6A)
                    : (isDark ? Colors.white : const Color(0xFF1E293B)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubjectsGrid(List<String> allSubjects, bool isDark) {
    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 1.2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: allSubjects.length,
      itemBuilder: (context, index) {
        final subject = allSubjects[index];
        final isSelected = _selectedWeaknesses.contains(subject);
        final isDisabled = !isSelected && _selectedWeaknesses.length >= 3;

        return GestureDetector(
          onTap:
              isDisabled ? null : () => _onChipSelected(subject, !isSelected),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            decoration: BoxDecoration(
              color: isSelected
                  ? AppTheme.primaryColor.withOpacity(0.2)
                  : isDisabled
                      ? (isDark
                          ? const Color(0xFF4A5568).withOpacity(0.3)
                          : const Color(0xFFE2E8F0).withOpacity(0.5))
                      : (isDark
                          ? const Color(0xFF2D3748).withOpacity(0.8)
                          : Colors.white.withOpacity(0.9)),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isSelected
                    ? AppTheme.primaryColor
                    : isDisabled
                        ? (isDark
                            ? const Color(0xFF4A5568).withOpacity(0.3)
                            : const Color(0xFFE2E8F0).withOpacity(0.5))
                        : (isDark
                            ? const Color(0xFF4A5568)
                            : const Color(0xFFE2E8F0)),
                width: isSelected ? 2 : 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: isSelected
                      ? AppTheme.primaryColor.withOpacity(0.3)
                      : isDark
                          ? Colors.black.withOpacity(0.2)
                          : Colors.grey.withOpacity(0.1),
                  blurRadius: isSelected ? 12 : 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Stack(
              children: [
                // Ana içerik
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Ders ikonu
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppTheme.primaryColor.withOpacity(0.1)
                              : (isDark
                                  ? const Color(0xFF4A5568).withOpacity(0.3)
                                  : const Color(0xFFF1F5F9)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          _getSubjectIcon(subject),
                          color: isSelected
                              ? AppTheme.primaryColor
                              : isDisabled
                                  ? (isDark
                                      ? Colors.white30
                                      : const Color(0xFF94A3B8))
                                  : (isDark
                                      ? Colors.white70
                                      : AppTheme.lightTextSecondaryColor),
                          size: 24,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Ders adı
                      Text(
                        subject,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontFamily: 'Figtree',
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isSelected
                              ? AppTheme.primaryColor
                              : isDisabled
                                  ? (isDark
                                      ? Colors.white30
                                      : const Color(0xFF94A3B8))
                                  : (isDark
                                      ? Colors.white
                                      : const Color(0xFF1E293B)),
                        ),
                      ),
                    ],
                  ),
                ),

                // Seçim göstergesi
                if (isSelected)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.check,
                        color: Colors.white,
                        size: 12,
                      ),
                    ),
                  ),

                // Disabled overlay
                if (isDisabled)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.black.withOpacity(0.3)
                            : Colors.white.withOpacity(0.7),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.lock_outline,
                          color: Colors.grey,
                          size: 20,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  IconData _getSubjectIcon(String subject) {
    switch (subject.toLowerCase()) {
      case 'tyt temel matematik':
      case 'tyt matematik':
      case 'matematik':
      case 'temel matematik':
      case 'ayt matematik':
        return Icons.functions;
      case 'tyt türkçe':
      case 'türkçe':
      case 'türk dili ve edebiyatı':
      case 'ayt türk dili ve edebiyatı':
        return Icons.book;
      case 'tyt fizik':
      case 'fizik':
      case 'ayt fizik':
        return Icons.science;
      case 'tyt kimya':
      case 'kimya':
      case 'ayt kimya':
        return Icons.science_outlined;
      case 'tyt biyoloji':
      case 'biyoloji':
      case 'ayt biyoloji':
        return Icons.eco;
      case 'tyt tarih':
      case 'tarih':
      case 'ayt tarih-1':
      case 'ayt tarih-2':
        return Icons.history_edu;
      case 'tyt coğrafya':
      case 'coğrafya':
      case 'ayt coğrafya-1':
      case 'ayt coğrafya-2':
        return Icons.public;
      case 'tyt felsefe':
      case 'felsefe':
      case 'ayt felsefe grubu':
        return Icons.psychology;
      case 'tyt din kültürü ve ahlak bilgisi':
      case 'din kültürü ve ahlak bilgisi':
        return Icons.mosque;
      case 'tyt yabancı dil':
      case 'yabancı dil':
      case 'ayt yabancı dil':
        return Icons.language;
      case 'fen bilimleri':
        return Icons.science;
      case 'sosyal bilimler':
        return Icons.public;
      default:
        return Icons.school;
    }
  }

  void _onNextPressed() {
    saveData();
    widget.onNext();
  }

  // Sınıf ve alana göre varsayılan dersleri belirle
  List<String> _getDefaultSubjectsForGrade() {
    final grade = widget.onboardingData.grade;
    final academicTrack = widget.onboardingData.academicTrack;

    // Debug bilgisi
    print('🔄 _getDefaultSubjectsForGrade çağrıldı');
    print('🔄 Grade: $grade');
    print('🔄 Academic Track: $academicTrack');

    // TYT dersleri (tüm sınıflar için)
    final tytSubjects = [
      'TYT Türkçe',
      'TYT Temel Matematik',
      'TYT Fizik',
      'TYT Kimya',
      'TYT Biyoloji',
      'TYT Tarih',
      'TYT Coğrafya',
      'TYT Felsefe',
      'TYT Din Kültürü ve Ahlak Bilgisi',
    ];

    // Tüm AYT dersleri
    final aytSayisalSubjects = [
      'AYT Matematik',
      'AYT Fizik',
      'AYT Kimya',
      'AYT Biyoloji',
    ];

    final aytSozelSubjects = [
      'AYT Türk Dili ve Edebiyatı',
      'AYT Tarih-1',
      'AYT Tarih-2',
      'AYT Coğrafya-1',
      'AYT Coğrafya-2',
      'AYT Felsefe Grubu',
      'AYT Din Kültürü ve Ahlak Bilgisi',
    ];

    final aytEsitAgirlikSubjects = [
      'AYT Matematik',
      'AYT Türk Dili ve Edebiyatı',
      'AYT Tarih-1',
      'AYT Coğrafya-1',
    ];

    final aytDilSubjects = [
      'AYT Yabancı Dil',
    ];

    // Sadece TYT seçildiyse veya 9, 10. sınıflar için sadece TYT dersleri
    if (academicTrack?.toLowerCase() == 'sadece tyt' ||
        grade == '9' ||
        grade == '10') {
      print('🔄 Sadece TYT dersleri döndürülüyor');
      return tytSubjects;
    }

    // 11, 12. sınıf ve mezun için AYT dersleri ekle (11. sınıfta alan dersleri başlar)
    if (grade == '11' || grade == '12' || grade == 'Mezun') {
      // Akademik alan kontrolü
      if (academicTrack == null || academicTrack.isEmpty) {
        print('🔄 Akademik alan boş, varsayılan olarak sayısal ayarlanıyor');
        widget.onboardingData.academicTrack = 'sayısal';
      }

      print('🔄 Switch case kontrolü: "${academicTrack?.toLowerCase()}"');

      switch (academicTrack?.toLowerCase()) {
        case 'sayısal':
          print('🔄 Sayısal dersleri döndürülüyor');
          print('🔄 AYT Sayısal dersler: $aytSayisalSubjects');
          return [
            ...tytSubjects,
            ...aytSayisalSubjects,
          ];
        case 'sözel':
          print('🔄 Sözel dersleri döndürülüyor');
          print('🔄 AYT Sözel dersler: $aytSozelSubjects');
          return [
            ...tytSubjects,
            ...aytSozelSubjects,
          ];
        case 'eşit ağırlık':
          print('🔄 Eşit ağırlık dersleri döndürülüyor');
          print('🔄 AYT Eşit Ağırlık dersler: $aytEsitAgirlikSubjects');
          return [
            ...tytSubjects,
            ...aytEsitAgirlikSubjects,
          ];
        case 'dil':
          print('🔄 Dil dersleri döndürülüyor');
          print('🔄 AYT Dil dersler: $aytDilSubjects');
          return [
            ...tytSubjects,
            ...aytDilSubjects,
          ];
        default:
          // Alan belirtilmemişse sayısal olarak ayarla
          print(
              '🔄 Akademik alan tanımsız, sayısal olarak ayarlanıyor - Gelen değer: "$academicTrack"');
          widget.onboardingData.academicTrack = 'sayısal';
          return [
            ...tytSubjects,
            ...aytSayisalSubjects,
          ];
      }
    }

    // Varsayılan olarak TYT dersleri
    print('🔄 Varsayılan olarak TYT dersleri döndürülüyor');
    return tytSubjects;
  }

  // Bu metod onboarding_screen.dart tarafından çağrılacak
  void saveData() {
    // Geçici "temp" değerini temizle
    widget.onboardingData.weaknesses?.remove('temp');

    // Gerçek seçimleri kaydet
    widget.onboardingData.weaknesses = _selectedWeaknesses;
  }
}
