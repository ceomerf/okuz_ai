import 'package:flutter/material.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/theme/app_theme.dart';

enum ConfidenceLevel { novice, beginner, intermediate }

class AcademicBackgroundPage extends StatefulWidget {
  final OnboardingData onboardingData;
  final VoidCallback onNext;
  final Function(bool) onSelectionChanged; // Yeni callback

  const AcademicBackgroundPage({
    Key? key,
    required this.onboardingData,
    required this.onNext,
    required this.onSelectionChanged, // Yeni callback
  }) : super(key: key);

  @override
  _AcademicBackgroundPageState createState() => _AcademicBackgroundPageState();
}

class _AcademicBackgroundPageState extends State<AcademicBackgroundPage>
    with TickerProviderStateMixin {
  late Map<String, ConfidenceLevel> _subjectConfidence;
  late AnimationController _fadeController;
  late AnimationController _slideController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  int _selectedTabIndex = 0; // 0: TYT, 1: AYT

  @override
  void initState() {
    super.initState();
    _subjectConfidence = {};

    // Animasyon controller'ları
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 600),
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

    // Dersleri belirle - Her durumda akademik alana göre dersleri filtrele
    List<String> subjects = [];

    // Akademik alana göre dersleri filtrele (kullanıcı seçimi olsa bile)
    subjects = _getDefaultSubjectsForGrade();

    // Eğer kullanıcı özel ders seçimi yapmışsa ve AI Önerisi değilse,
    // seçilen dersleri akademik alan filtresiyle kesişimini al
    if (widget.onboardingData.planScope != 'AI Önerisi' &&
        widget.onboardingData.selectedSubjects.isNotEmpty) {
      // Sadece akademik alana uygun olan seçilmiş dersleri göster
      subjects = subjects
          .where((subject) =>
              widget.onboardingData.selectedSubjects.contains(subject))
          .toList();
    }

    // Mevcut verileri yükle - sadece daha önce seçilmiş olanları yükle
    for (var subject in subjects) {
      final existingLevelString =
          widget.onboardingData.confidenceLevels?[subject];
      if (existingLevelString != null) {
        ConfidenceLevel? existingLevel;
        switch (existingLevelString) {
          case 'novice':
            existingLevel = ConfidenceLevel.novice;
            break;
          case 'beginner':
            existingLevel = ConfidenceLevel.beginner;
            break;
          case 'intermediate':
            existingLevel = ConfidenceLevel.intermediate;
            break;
          default:
            existingLevel = null; // Bilinmeyen değer için null bırak
        }
        if (existingLevel != null) {
          _subjectConfidence[subject] = existingLevel;
        }
      }
      // Yeni dersler için hiçbir varsayılan değer atama
    }

    // Animasyonları başlat
    _fadeController.forward();
    _slideController.forward();
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

  @override
  void dispose() {
    _fadeController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  String _getLabelForLevel(ConfidenceLevel level) {
    switch (level) {
      case ConfidenceLevel.novice:
        return "Yeni Başlıyorum";
      case ConfidenceLevel.beginner:
        return "Temelim Var";
      case ConfidenceLevel.intermediate:
        return "Konuya Hakimim";
    }
  }

  Color _getLevelColor(ConfidenceLevel level, bool isDark) {
    switch (level) {
      case ConfidenceLevel.novice:
        return isDark
            ? const Color(0xFFFF8A50) // Açık turuncu (kırmızı yerine)
            : const Color(0xFFFF7043); // Orta turuncu (kırmızı yerine)
      case ConfidenceLevel.beginner:
        return isDark
            ? const Color(0xFFF57C00) // Ana turuncu
            : const Color(0xFFE65100); // Koyu turuncu
      case ConfidenceLevel.intermediate:
        return isDark
            ? const Color(0xFF66BB6A) // Yeşil (başarı)
            : const Color(0xFF4CAF50); // Koyu yeşil
    }
  }

  IconData _getLevelIcon(ConfidenceLevel level) {
    switch (level) {
      case ConfidenceLevel.novice:
        return Icons.school_outlined;
      case ConfidenceLevel.beginner:
        return Icons.psychology_outlined;
      case ConfidenceLevel.intermediate:
        return Icons.auto_awesome_outlined;
    }
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
    List<String> subjects = [];

    // Akademik alana göre dersleri filtrele (kullanıcı seçimi olsa bile)
    subjects = _getDefaultSubjectsForGrade();

    // Debug bilgisi yazdır
    print('🔍 Grade: ${widget.onboardingData.grade}');
    print('🔍 Academic Track: ${widget.onboardingData.academicTrack}');
    print('🔍 Subjects Count: ${subjects.length}');
    print('🔍 Subjects: $subjects');

    // Eğer kullanıcı özel ders seçimi yapmışsa ve AI Önerisi değilse,
    // seçilen dersleri akademik alan filtresiyle kesişimini al
    if (widget.onboardingData.planScope != 'AI Önerisi' &&
        widget.onboardingData.selectedSubjects.isNotEmpty) {
      // Sadece akademik alana uygun olan seçilmiş dersleri göster
      subjects = subjects
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

                    // Progress Indicator
                    _buildProgressIndicator(
                        _getFilteredSubjects(subjects).length, isDark),
                    const SizedBox(height: 24),

                    // Tab Bar
                    _buildTabBar(isDark),
                    const SizedBox(height: 24),

                    // Subjects List
                    Expanded(
                      child: ListView.builder(
                        itemCount: _getFilteredSubjects(subjects).length,
                        itemBuilder: (context, index) {
                          final subject = _getFilteredSubjects(subjects)[index];
                          return _buildSubjectConfidenceSelector(
                              subject, isDark, index);
                        },
                      ),
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
        // Emoji ve başlık
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryColor,
                    AppTheme.primaryColor.withOpacity(0.7),
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.psychology,
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
                    'Akademik Seviye',
                    style: TextStyle(
                      fontFamily: 'Figtree',
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: isDark
                          ? AppTheme.darkTextPrimaryColor
                          : AppTheme.lightTextPrimaryColor,
                    ),
                  ),
                  Text(
                    'Derslerdeki mevcut durumunu belirleyelim',
                    style: TextStyle(
                      fontFamily: 'Figtree',
                      fontSize: 16,
                      fontWeight: FontWeight.w400,
                      color: isDark
                          ? AppTheme.darkTextSecondaryColor
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
                ? AppTheme.darkCardColor.withOpacity(0.9)
                : AppTheme.lightCardColor.withOpacity(0.95),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark
                  ? AppTheme.darkDividerColor
                  : AppTheme.lightDividerColor,
            ),
          ),
          child: Row(
            children: [
              Icon(
                Icons.lightbulb_outline,
                color: AppTheme.primaryColor,
                size: 20,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Bu bilgiler, sana en uygun çalışma planını oluşturmamız için kritik öneme sahip.',
                  style: TextStyle(
                    fontFamily: 'Figtree',
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: isDark
                        ? const Color(0xFFC5CAE9)
                        : const Color(0xFF757575),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildProgressIndicator(int totalSubjects, bool isDark) {
    // Sadece mevcut tab'deki derslerin seçilmiş olanlarını say
    final completedSubjects = _subjectConfidence.keys
        .where((subject) =>
            (_selectedTabIndex == 0 && subject.startsWith('TYT')) ||
            (_selectedTabIndex == 1 && subject.startsWith('AYT')))
        .length;
    final progress =
        totalSubjects > 0 ? completedSubjects / totalSubjects : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'İlerleme',
              style: TextStyle(
                fontFamily: 'Figtree',
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : const Color(0xFF1E293B),
              ),
            ),
            Text(
              '$completedSubjects/$totalSubjects',
              style: TextStyle(
                fontFamily: 'Figtree',
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color:
                    isDark ? Colors.white70 : AppTheme.lightTextSecondaryColor,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          height: 8,
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF4A5568) : const Color(0xFFE2E8F0),
            borderRadius: BorderRadius.circular(4),
          ),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: progress,
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryColor,
                    AppTheme.primaryColor.withOpacity(0.7),
                  ],
                ),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTabBar(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? AppTheme.darkCardColor.withOpacity(0.8)
            : AppTheme.lightCardColor.withOpacity(0.9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color:
              isDark ? AppTheme.darkDividerColor : AppTheme.lightDividerColor,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _selectedTabIndex = 0;
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                padding:
                    const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
                decoration: BoxDecoration(
                  color: _selectedTabIndex == 0
                      ? AppTheme.primaryColor
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.school_outlined,
                      color: _selectedTabIndex == 0
                          ? Colors.white
                          : (isDark
                              ? Colors.white70
                              : AppTheme.lightTextSecondaryColor),
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'TYT Dersleri',
                      style: TextStyle(
                        fontFamily: 'Figtree',
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: _selectedTabIndex == 0
                            ? Colors.white
                            : (isDark
                                ? Colors.white70
                                : AppTheme.lightTextSecondaryColor),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _selectedTabIndex = 1;
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                padding:
                    const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
                decoration: BoxDecoration(
                  color: _selectedTabIndex == 1
                      ? AppTheme.primaryColor
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.psychology_outlined,
                      color: _selectedTabIndex == 1
                          ? Colors.white
                          : (isDark
                              ? Colors.white70
                              : AppTheme.lightTextSecondaryColor),
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'AYT Dersleri',
                      style: TextStyle(
                        fontFamily: 'Figtree',
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: _selectedTabIndex == 1
                            ? Colors.white
                            : (isDark
                                ? Colors.white70
                                : AppTheme.lightTextSecondaryColor),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubjectConfidenceSelector(
      String subject, bool isDark, int index) {
    final currentLevel = _subjectConfidence[subject]; // Varsayılan değer atama

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      margin: EdgeInsets.only(bottom: 16, top: index == 0 ? 0 : 8),
      child: Container(
        decoration: BoxDecoration(
          color: isDark
              ? AppTheme.darkCardColor.withOpacity(0.8)
              : AppTheme.lightCardColor.withOpacity(0.9),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: currentLevel != null
                ? _getLevelColor(currentLevel, isDark).withOpacity(0.3)
                : AppTheme.primaryColor.withOpacity(0.2),
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: isDark
                  ? Colors.black.withOpacity(0.3)
                  : Colors.grey.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Ders başlığı
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: currentLevel != null
                          ? _getLevelColor(currentLevel, isDark)
                              .withOpacity(0.1)
                          : AppTheme.primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      _getSubjectIcon(subject),
                      color: currentLevel != null
                          ? _getLevelColor(currentLevel, isDark)
                          : AppTheme.primaryColor,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      subject,
                      style: TextStyle(
                        fontFamily: 'Figtree',
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: isDark
                            ? AppTheme.darkTextPrimaryColor
                            : AppTheme.lightTextPrimaryColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Seviye seçenekleri
              Row(
                children: ConfidenceLevel.values.map((level) {
                  final isSelected = currentLevel == level;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _subjectConfidence[subject] = level;
                        });
                        // İlerle butonunun aktif olması için callback çağır
                        // Sadece TYT dersleri varsa sadece TYT seçimi yeterli
                        // Hem TYT hem AYT varsa ikisinde de seçim gerekli
                        final allSubjects = _getDefaultSubjectsForGrade();
                        final hasTytSubjects = allSubjects
                            .any((subject) => subject.startsWith('TYT'));
                        final hasAytSubjects = allSubjects
                            .any((subject) => subject.startsWith('AYT'));

                        final hasTytSelection = _subjectConfidence.keys
                            .where((subject) => subject.startsWith('TYT'))
                            .isNotEmpty;
                        final hasAytSelection = _subjectConfidence.keys
                            .where((subject) => subject.startsWith('AYT'))
                            .isNotEmpty;

                        bool isSelectionValid;
                        if (hasTytSubjects && hasAytSubjects) {
                          // Hem TYT hem AYT varsa ikisinde de seçim gerekli
                          isSelectionValid = hasTytSelection && hasAytSelection;
                        } else if (hasTytSubjects) {
                          // Sadece TYT varsa sadece TYT seçimi yeterli
                          isSelectionValid = hasTytSelection;
                        } else if (hasAytSubjects) {
                          // Sadece AYT varsa sadece AYT seçimi yeterli
                          isSelectionValid = hasAytSelection;
                        } else {
                          // Hiç ders yoksa (olamaz ama güvenlik için)
                          isSelectionValid = false;
                        }

                        widget.onSelectionChanged(isSelectionValid);
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        padding: const EdgeInsets.symmetric(
                            vertical: 16, horizontal: 8),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? _getLevelColor(level, isDark).withOpacity(0.2)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSelected
                                ? _getLevelColor(level, isDark)
                                : isDark
                                    ? const Color(0xFF4A5568)
                                    : AppTheme.primaryColor.withOpacity(0.2),
                            width: isSelected ? 2 : 1,
                          ),
                        ),
                        child: Column(
                          children: [
                            Icon(
                              _getLevelIcon(level),
                              color: isSelected
                                  ? _getLevelColor(level, isDark)
                                  : isDark
                                      ? Colors.white.withOpacity(0.4)
                                      : AppTheme.primaryColor.withOpacity(0.4),
                              size: 24,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _getLabelForLevel(level),
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontFamily: 'Figtree',
                                fontSize: 12,
                                fontWeight: isSelected
                                    ? FontWeight.w600
                                    : FontWeight.w500,
                                color: isSelected
                                    ? _getLevelColor(level, isDark)
                                    : isDark
                                        ? Colors.white.withOpacity(0.4)
                                        : AppTheme.primaryColor
                                            .withOpacity(0.4),
                              ),
                            ),
                          ],
                        ),
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

  List<String> _getFilteredSubjects(List<String> allSubjects) {
    if (_selectedTabIndex == 0) {
      // TYT dersleri
      return allSubjects.where((subject) => subject.startsWith('TYT')).toList();
    } else {
      // AYT dersleri
      return allSubjects.where((subject) => subject.startsWith('AYT')).toList();
    }
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

  // Bu metod onboarding_screen.dart tarafından çağrılacak
  void saveData() {
    // Geçici "temp" değerini temizle
    widget.onboardingData.confidenceLevels.remove('temp');

    // Gerçek seçimleri kaydet
    widget.onboardingData.confidenceLevels = _subjectConfidence.map(
      (key, value) => MapEntry(key, value.name),
    );
  }
}
