import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/models/onboarding_page_type.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class SummaryPage extends StatefulWidget {
  final OnboardingData onboardingData;
  final ValueChanged<bool> onConfirmationChanged;
  final ValueChanged<OnboardingPageType> onEdit;
  final bool isParentMode; // Veli modu için

  const SummaryPage({
    Key? key,
    required this.onboardingData,
    required this.onConfirmationChanged,
    required this.onEdit,
    this.isParentMode = false, // Varsayılan olarak false
  }) : super(key: key);

  @override
  State<SummaryPage> createState() => _SummaryPageState();
}

class _SummaryPageState extends State<SummaryPage> {
  String _formatDuration(double hours) {
    print('🎯 SummaryPage - Duration formatlanıyor: $hours saat');
    if (hours == 0.0) {
      print('⚠️ SummaryPage - Günlük hedef 0 saat!');
    }
    final int totalMinutes = (hours * 60).round();
    final int dHours = totalMinutes ~/ 60;
    final int dMinutes = totalMinutes % 60;
    return dHours > 0 ? '$dHours saat $dMinutes dk' : '$dMinutes dk';
  }

  // Sınıf bilgisini formatlayan metod
  String _formatGrade(String grade) {
    print('🎯 SummaryPage - Grade formatlanıyor: "$grade"');
    if (grade.isEmpty) {
      print('⚠️ SummaryPage - Grade boş!');
      return 'Sınıf Belirtilmemiş';
    }
    if (grade == 'Mezun') {
      return 'Mezun';
    } else {
      return '$grade. Sınıf';
    }
  }

  // Baş harfleri büyük yapan yardımcı metod
  String _capitalizeFirst(String text) {
    if (text.isEmpty) return text;
    return text[0].toUpperCase() + text.substring(1).toLowerCase();
  }

  // Alan bilgisini formatlayan metod
  String _formatField(String field) {
    switch (field) {
      case 'sayisal':
        return 'Sayısal';
      case 'sozel':
        return 'Sözel';
      case 'esit':
        return 'Eşit Ağırlık';
      case 'dil':
        return 'Dil';
      case 'tyt':
        return 'TYT';
      default:
        return field;
    }
  }

  @override
  Widget build(BuildContext context) {
    // Debug bilgileri ekle
    print('🔍 SummaryPage Debug:');
    print('   Grade: ${widget.onboardingData.grade}');
    print('   Academic Track: ${widget.onboardingData.academicTrack}');
    print('   Start Point: ${widget.onboardingData.startPoint}');
    print('   Plan Scope: ${widget.onboardingData.planScope}');
    print('   Selected Subjects: ${widget.onboardingData.selectedSubjects}');
    print('   Confidence Levels (Raw): ${widget.onboardingData.confidenceLevels}');
    print('   Weaknesses (Raw): ${widget.onboardingData.weaknesses}');
    print('   Last Completed Topics (Raw): ${widget.onboardingData.lastCompletedTopics}');
    print('   Daily Goal: ${widget.onboardingData.dailyGoalInHours}');
    print('   Learning Style: ${widget.onboardingData.learningStyle}');
    print('   Preferred Study Times: ${widget.onboardingData.preferredStudyTimes}');
    print('   Target University: ${widget.onboardingData.targetUniversity}');
    print('   Full Name: ${widget.onboardingData.fullName}');
    print('   Is Confirmed: ${widget.onboardingData.isConfirmed}');
    print('   Is Parent Mode: ${widget.isParentMode}');

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
              widget.isParentMode
                  ? 'Veli Hesabınız Hazır!'
                  : 'Harika! İşte Planın',
              style: GoogleFonts.figtree(
                fontSize: 28,
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
              widget.isParentMode
                  ? 'Veli bilgilerinizi kontrol edin ve devam edin.'
                  : 'Başlamadan önce seçimlerini kontrol et.',
              style: GoogleFonts.figtree(
                fontSize: 16,
                color: AppTheme.getSecondaryTextColor(context),
              ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 30),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                children: [
                  if (!widget.isParentMode) ...[
                    // Öğrenci modu için tüm bilgiler
                    if (widget.onboardingData.grade?.isNotEmpty == true)
                      _buildSummaryCard(
                        icon: Icons.class_outlined,
                        title: 'Sınıf',
                        value: _formatGrade(widget.onboardingData.grade ?? ''),
                        pageType: OnboardingPageType.grade,
                      ),
                    if (widget.onboardingData.academicTrack?.isNotEmpty == true)
                      _buildSummaryCard(
                        icon: Icons.work_outline,
                        title: 'Akademik Alan',
                        value:
                            _formatField(widget.onboardingData.academicTrack!),
                        pageType: OnboardingPageType.field,
                      ),
                    if (widget.onboardingData.startPoint?.isNotEmpty == true)
                      _buildSummaryCard(
                        icon: Icons.flag_outlined,
                        title: 'Başlangıç Noktası',
                        value: widget.onboardingData.startPoint == 'school'
                            ? 'Okulla Birlikte'
                            : 'En Baştan',
                        pageType: OnboardingPageType.start,
                      ),
                    if (widget.onboardingData.planScope?.isNotEmpty == true)
                      _buildSummaryCard(
                        icon: Icons.rule_folder_outlined,
                        title: 'Plan Tipi',
                        value: widget.onboardingData.planScope == 'custom'
                            ? 'Dersleri Kendim Seçtim'
                            : 'AI\'a Bıraktım',
                        pageType: OnboardingPageType.planScope,
                      ),
                    if (widget.onboardingData.selectedSubjects.isNotEmpty)
                      _buildSelectedSubjectsCard(),
                    if (widget.onboardingData.confidenceLevels.isNotEmpty)
                      _buildConfidenceLevelsCard(),
                    if (widget.onboardingData.weaknesses?.isNotEmpty == true)
                      _buildWeaknessesCard(),
                    if (widget.onboardingData.lastCompletedTopics.isNotEmpty)
                      _buildLastTopicsCard(),
                    if ((widget.onboardingData.dailyGoalInHours ?? 0) > 0)
                      _buildSummaryCard(
                        icon: Icons.watch_later_outlined,
                        title: 'Günlük Hedef',
                        value: _formatDuration(
                            widget.onboardingData.dailyGoalInHours ?? 0.0),
                        pageType: OnboardingPageType.dailyGoal,
                      ),
                    if (widget.onboardingData.learningStyle?.isNotEmpty == true)
                      _buildSummaryCard(
                        icon: Icons.psychology_outlined,
                        title: 'Öğrenme Stili',
                        value: _formatLearningStyle(
                            widget.onboardingData.learningStyle ?? ''),
                        pageType: OnboardingPageType.learningStyle,
                      ),
                    if (widget.onboardingData.preferredStudyTimes.isNotEmpty)
                      _buildSummaryCard(
                        icon: Icons.access_time_outlined,
                        title: 'Tercih Edilen Çalışma Saatleri',
                        value: _formatStudyTimes(
                            widget.onboardingData.preferredStudyTimes),
                        pageType: OnboardingPageType.preferredStudyTimes,
                      ),
                  ],
                  // Veli modu için sadece veli adı, öğrenci modu için tüm bilgiler
                  if (widget.isParentMode) ...[
                    // Veli modu - hesap tipi (değiştirilemez) ve veli adı
                    _buildReadOnlySummaryCard(
                      icon: Icons.family_restroom,
                      title: 'Hesap Tipi',
                      value: 'Veli Hesabı',
                    ),
                    if (widget.onboardingData.fullName?.isNotEmpty == true)
                      _buildSummaryCard(
                        icon: Icons.person_outline,
                        title: 'Veli Adı',
                        value: widget.onboardingData.fullName ?? '',
                        pageType: OnboardingPageType.nameAndTarget,
                      ),
                  ] else ...[
                    // Öğrenci modu - sadece üniversite
                    if (widget.onboardingData.targetUniversity?.isNotEmpty == true)
                      _buildSummaryCard(
                        icon: Icons.school_outlined,
                        title: 'Hedef Üniversite',
                        value: widget.onboardingData.targetUniversity ?? '',
                        pageType: OnboardingPageType.nameAndTarget,
                      ),
                  ],
                  // Onay kutusu burada, diğer kartlardan sonra
                  const SizedBox(height: 32),
                  _buildConfirmationSection(),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(
      {required IconData icon,
      required String title,
      required String value,
      required OnboardingPageType pageType}) {
    return Animate(
      effects: const [
        FadeEffect(duration: Duration(milliseconds: 400)),
        SlideEffect(begin: Offset(0.2, 0), end: Offset.zero)
      ],
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Theme.of(context).dividerColor.withValues(alpha: 0.3),
            width: 1,
          ),
          color: Theme.of(context).cardColor,
          boxShadow: [
            BoxShadow(
              color: Theme.of(context).shadowColor.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () => widget.onEdit(pageType),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      icon, 
                      color: AppTheme.primaryColor, 
                      size: 24
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _capitalizeFirst(title),
                          style: GoogleFonts.figtree(
                            fontSize: 13,
                            color: AppTheme.getSecondaryTextColor(context),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _capitalizeFirst(value),
                          style: GoogleFonts.figtree(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.getPrimaryTextColor(context),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Düzenle',
                      style: GoogleFonts.figtree(
                        fontSize: 12,
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // Değiştirilemez bilgiler için read-only kart
  Widget _buildReadOnlySummaryCard({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Animate(
      effects: const [
        FadeEffect(duration: Duration(milliseconds: 400)),
        SlideEffect(begin: Offset(0.2, 0), end: Offset.zero)
      ],
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Theme.of(context).dividerColor.withValues(alpha: 0.3),
            width: 1,
          ),
          color: Theme.of(context).cardColor,
          boxShadow: [
            BoxShadow(
              color: Theme.of(context).shadowColor.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon, 
                  color: Colors.grey[600], 
                  size: 24
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _capitalizeFirst(title),
                      style: GoogleFonts.figtree(
                        fontSize: 13,
                        color: AppTheme.getSecondaryTextColor(context),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _capitalizeFirst(value),
                      style: GoogleFonts.figtree(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.getPrimaryTextColor(context),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Sabit',
                  style: GoogleFonts.figtree(
                    color: Colors.grey[600],
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSelectedSubjectsCard() {
    return Animate(
      effects: const [
        FadeEffect(duration: Duration(milliseconds: 400)),
        SlideEffect(begin: Offset(0.2, 0), end: Offset.zero)
      ],
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Theme.of(context).dividerColor.withValues(alpha: 0.3),
            width: 1,
          ),
          color: Theme.of(context).cardColor,
          boxShadow: [
            BoxShadow(
              color: Theme.of(context).shadowColor.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Icons.book_outlined,
                          color: AppTheme.primaryColor,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'Seçilen Dersler',
                        style: GoogleFonts.figtree(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.getPrimaryTextColor(context),
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: InkWell(
                      onTap: () => widget.onEdit(OnboardingPageType.subject),
                      child: Text(
                        'Düzenle',
                        style: GoogleFonts.figtree(
                          fontSize: 12,
                          color: AppTheme.primaryColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8.0,
                runSpacing: 8.0,
                children: widget.onboardingData.selectedSubjects.map((subject) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppTheme.primaryColor.withValues(alpha: 0.2),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      _capitalizeFirst(subject),
                      style: GoogleFonts.figtree(
                        color: AppTheme.primaryColor,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
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

  Widget _buildConfirmationSection() {
    return Animate(
      delay: const Duration(milliseconds: 500),
      effects: const [FadeEffect(duration: Duration(milliseconds: 500))],
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: widget.onboardingData.isConfirmed
              ? AppTheme.primaryColor.withValues(alpha: 0.05)
              : Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: widget.onboardingData.isConfirmed
                ? AppTheme.primaryColor
                : Theme.of(context).dividerColor.withValues(alpha: 0.3),
            width: widget.onboardingData.isConfirmed ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Theme.of(context).shadowColor.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () {
              final newValue = !widget.onboardingData.isConfirmed;
              print('🔍 SummaryPage - InkWell onTap: $newValue');
              widget.onConfirmationChanged(newValue);
            },
            child: Row(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: widget.onboardingData.isConfirmed
                          ? AppTheme.primaryColor
                          : Theme.of(context).dividerColor,
                      width: 2,
                    ),
                    color: widget.onboardingData.isConfirmed
                        ? AppTheme.primaryColor
                        : Colors.transparent,
                  ),
                  child: widget.onboardingData.isConfirmed
                      ? const Icon(
                          Icons.check,
                          color: Colors.white,
                          size: 16,
                        )
                      : null,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    widget.isParentMode
                        ? 'Bilgilerimi onaylıyorum ve veli hesabımı başlatmak istiyorum.'
                        : 'Tüm seçimlerimi onaylıyorum ve kişiselleştirilmiş planımın oluşturulmasını istiyorum.',
                    style: GoogleFonts.figtree(
                      fontSize: 14,
                      color: AppTheme.getPrimaryTextColor(context),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatLearningStyle(String style) {
    switch (style) {
      case 'visual':
        return 'Görsel';
      case 'auditory':
        return 'İşitsel';
      case 'kinesthetic':
        return 'Kinestetik';
      default:
        return style;
    }
  }

  String _formatStudyTimes(List<String> times) {
    if (times.isEmpty) return 'Belirtilmemiş';

    final Map<String, String> timeLabels = {
      'early_morning': 'Erken Sabah',
      'morning': 'Sabah',
      'afternoon': 'Öğlen',
      'late_afternoon': 'İkindi',
      'evening': 'Akşam',
      'night': 'Gece'
    };

    return times.map((t) => timeLabels[t] ?? t).join(', ');
  }

  Widget _buildConfidenceLevelsCard() {
    final confidenceLevels = widget.onboardingData.confidenceLevels;
    if (confidenceLevels.isEmpty) return const SizedBox.shrink();

    // Geçici değerleri filtrele
    final filteredLevels = Map<String, String>.fromEntries(
      confidenceLevels.entries.where((entry) => 
        entry.value != 'temp' && 
        entry.value.isNotEmpty &&
        entry.key != 'temp' &&
        entry.key.isNotEmpty &&
        !entry.key.toLowerCase().contains('temp') &&
        !entry.value.toLowerCase().contains('temp')
      )
    );

    if (filteredLevels.isEmpty) return const SizedBox.shrink();

    final Map<String, String> levelLabels = {
      'low': 'Zorlanıyorum',
      'medium': 'Orta',
      'high': 'Çok İyi'
    };

    return Animate(
      effects: const [
        FadeEffect(duration: Duration(milliseconds: 400)),
        SlideEffect(begin: Offset(0.2, 0), end: Offset.zero)
      ],
      child: Card(
        elevation: 0,
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Theme.of(context).dividerColor, width: 1),
        ),
        color: Theme.of(context).cardColor,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Derslerdeki Güven Seviyen',
                      style: GoogleFonts.figtree(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.getPrimaryTextColor(context),
                      )),
                  TextButton(
                    onPressed: () =>
                        widget.onEdit(OnboardingPageType.confidenceLevels),
                    child: Text(
                      'Değiştir',
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...filteredLevels.entries
                  .map((entry) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                entry.key,
                                style: GoogleFonts.figtree(
                                  fontSize: 14,
                                  color: AppTheme.getPrimaryTextColor(context),
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: _getConfidenceLevelColor(entry.value),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                _formatConfidenceLevel(entry.value),
                                style: GoogleFonts.figtree(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ))
                  .toList(),
            ],
          ),
        ),
      ),
    );
  }

  Color _getConfidenceLevelColor(String level) {
    switch (level) {
      case 'low':
        return Colors.redAccent;
      case 'medium':
        return Colors.amber;
      case 'high':
        return Colors.green;
      case 'novice':
        return Colors.redAccent;
      case 'beginner':
        return Colors.orange;
      case 'intermediate':
        return Colors.green;
      default:
        return AppTheme.primaryColor;
    }
  }

  String _formatConfidenceLevel(String level) {
    switch (level) {
      case 'low':
        return 'Zorlanıyorum';
      case 'medium':
        return 'Orta';
      case 'high':
        return 'Çok İyi';
      case 'novice':
        return 'Yeni Başlayan';
      case 'beginner':
        return 'Başlangıç';
      case 'intermediate':
        return 'Orta Seviye';
      default:
        return level;
    }
  }

  Widget _buildWeaknessesCard() {
    final weaknesses = widget.onboardingData.weaknesses;
    if (weaknesses?.isEmpty ?? true) return const SizedBox.shrink();

    // Geçici değerleri filtrele
    final filteredWeaknesses = weaknesses!
        .where((weakness) => 
          weakness != 'temp' && 
          weakness.isNotEmpty &&
          !weakness.toLowerCase().contains('temp') &&
          weakness.toLowerCase() != 'novice' &&
          weakness.toLowerCase() != 'beginner' &&
          weakness.toLowerCase() != 'intermediate' &&
          weakness.toLowerCase() != 'low' &&
          weakness.toLowerCase() != 'medium' &&
          weakness.toLowerCase() != 'high'
        )
        .toList();

    if (filteredWeaknesses.isEmpty) return const SizedBox.shrink();

    return Animate(
      effects: const [
        FadeEffect(duration: Duration(milliseconds: 400)),
        SlideEffect(begin: Offset(0.2, 0), end: Offset.zero)
      ],
      child: Card(
        elevation: 0,
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Theme.of(context).dividerColor, width: 1),
        ),
        color: Theme.of(context).cardColor,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Zayıf Halkalar',
                      style: GoogleFonts.figtree(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.getPrimaryTextColor(context),
                      )),
                  TextButton(
                    onPressed: () =>
                        widget.onEdit(OnboardingPageType.confidenceLevels),
                    child: Text(
                      'Değiştir',
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: filteredWeaknesses
                    .map((weakness) => Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                                color: AppTheme.primaryColor.withOpacity(0.3)),
                          ),
                          child: Text(
                            weakness,
                            style: GoogleFonts.figtree(
                              fontSize: 12,
                              color: AppTheme.primaryColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ))
                    .toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLastTopicsCard() {
    final lastTopics = widget.onboardingData.lastCompletedTopics;
    if (lastTopics.isEmpty) return const SizedBox.shrink();

    // Geçici değerleri filtrele
    final filteredTopics = Map<String, String>.fromEntries(
      lastTopics.entries.where((entry) => 
        entry.value != 'temp' && 
        entry.value.isNotEmpty &&
        entry.key != 'temp' &&
        entry.key.isNotEmpty &&
        !entry.key.toLowerCase().contains('temp') &&
        !entry.value.toLowerCase().contains('temp') &&
        entry.value.toLowerCase() != 'novice' &&
        entry.value.toLowerCase() != 'beginner' &&
        entry.value.toLowerCase() != 'intermediate' &&
        entry.value.toLowerCase() != 'low' &&
        entry.value.toLowerCase() != 'medium' &&
        entry.value.toLowerCase() != 'high'
      )
    );

    if (filteredTopics.isEmpty) return const SizedBox.shrink();

    return Animate(
      effects: const [
        FadeEffect(duration: Duration(milliseconds: 400)),
        SlideEffect(begin: Offset(0.2, 0), end: Offset.zero)
      ],
      child: Card(
        elevation: 0,
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Theme.of(context).dividerColor, width: 1),
        ),
        color: Theme.of(context).cardColor,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Son Tamamlanan Konular',
                      style: GoogleFonts.figtree(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.getPrimaryTextColor(context),
                      )),
                  TextButton(
                    onPressed: () =>
                        widget.onEdit(OnboardingPageType.lastTopics),
                    child: Text(
                      'Değiştir',
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...filteredTopics.entries
                  .map((entry) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${entry.key}:',
                                style: GoogleFonts.figtree(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.getPrimaryTextColor(context),
                                ),
                              ),
                            ),
                            Expanded(
                              flex: 2,
                              child: Text(
                                entry.value,
                                style: GoogleFonts.figtree(
                                  fontSize: 14,
                                  color:
                                      AppTheme.getSecondaryTextColor(context),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ))
                  .toList(),
            ],
          ),
        ),
      ),
    );
  }
}
