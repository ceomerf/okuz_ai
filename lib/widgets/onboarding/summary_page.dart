import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
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
    final int totalMinutes = (hours * 60).round();
    final int dHours = totalMinutes ~/ 60;
    final int dMinutes = totalMinutes % 60;
    return dHours > 0 ? '$dHours saat $dMinutes dk' : '$dMinutes dk';
  }

  // Sınıf bilgisini formatlayan metod
  String _formatGrade(String grade) {
    if (grade == 'Mezun') {
      return 'Mezun';
    } else {
      return '$grade. Sınıf';
    }
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
              widget.isParentMode
                  ? 'Veli bilgilerinizi kontrol edin ve devam edin.'
                  : 'Başlamadan önce seçimlerini kontrol et.',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
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
                    _buildSummaryCard(
                      icon: Icons.class_outlined,
                      title: 'Sınıf',
                      value: _formatGrade(widget.onboardingData.grade ?? ''),
                      pageType: OnboardingPageType.grade,
                    ),
                    if (widget.onboardingData.targetExam?.isNotEmpty == true)
                      _buildSummaryCard(
                        icon: Icons.work_outline,
                        title: 'Alan',
                        value: _formatField(widget.onboardingData.targetExam!),
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
                    _buildSummaryCard(
                      icon: Icons.rule_folder_outlined,
                      title: 'Plan Tipi',
                      value: widget.onboardingData.planScope == 'custom'
                          ? 'Dersleri Kendim Seçtim'
                          : 'AI\'a Bıraktım',
                      pageType: OnboardingPageType.planScope,
                    ),
                    if (widget.onboardingData.needsSubjectSelection &&
                        widget.onboardingData.selectedSubjects.isNotEmpty)
                      _buildSelectedSubjectsCard(),
                    _buildSummaryCard(
                      icon: Icons.watch_later_outlined,
                      title: 'Günlük Hedef',
                      value: _formatDuration(
                          widget.onboardingData.dailyGoalInHours ?? 0.0),
                      pageType: OnboardingPageType.dailyGoal,
                    ),
                    _buildSummaryCard(
                      icon: Icons.psychology_outlined,
                      title: 'Öğrenme Stili',
                      value: _formatLearningStyle(
                          widget.onboardingData.learningStyle ?? ''),
                      pageType: OnboardingPageType.learningStyle,
                    ),
                    _buildSummaryCard(
                      icon: Icons.access_time_outlined,
                      title: 'Tercih Edilen Çalışma Saatleri',
                      value: _formatStudyTimes(
                          widget.onboardingData.preferredStudyTimes),
                      pageType: OnboardingPageType.preferredStudyTimes,
                    ),
                    _buildConfidenceLevelsCard(),
                  ],
                  // Veli modu için sadece veli adı, öğrenci modu için tüm bilgiler
                  if (widget.isParentMode) ...[
                    // Veli modu - hesap tipi (değiştirilemez) ve veli adı
                    _buildReadOnlySummaryCard(
                      icon: Icons.family_restroom,
                      title: 'Hesap Tipi',
                      value: 'Veli Hesabı',
                    ),
                    _buildSummaryCard(
                      icon: Icons.person_outline,
                      title: 'Veli Adı',
                      value: widget.onboardingData.fullName ?? '',
                      pageType: OnboardingPageType.nameAndTarget,
                    ),
                  ] else ...[
                    // Öğrenci modu - tüm bilgiler
                    _buildSummaryCard(
                      icon: Icons.person_outline,
                      title: 'Ad Soyad',
                      value: widget.onboardingData.fullName ?? '',
                      pageType: OnboardingPageType.nameAndTarget,
                    ),
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
      child: Card(
        elevation: 0,
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Theme.of(context).dividerColor, width: 1),
        ),
        color: Theme.of(context).cardColor,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Row(
            children: [
              Icon(icon, color: AppTheme.primaryColor, size: 28),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.getSecondaryTextColor(context))),
                    const SizedBox(height: 2),
                    Text(value,
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              TextButton(
                onPressed: () => widget.onEdit(pageType),
                child: const Text('Değiştir'),
              ),
            ],
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
      child: Card(
        elevation: 0,
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Theme.of(context).dividerColor, width: 1),
        ),
        color: Theme.of(context).cardColor,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Row(
            children: [
              Icon(icon, color: AppTheme.primaryColor, size: 28),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.getSecondaryTextColor(context))),
                    const SizedBox(height: 2),
                    Text(value,
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Sabit',
                  style: TextStyle(
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
                  Text('Seçilen Dersler',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold)),
                  TextButton(
                    onPressed: () => widget.onEdit(OnboardingPageType.subject),
                    child: const Text('Değiştir'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8.0,
                runSpacing: 4.0,
                children: widget.onboardingData.selectedSubjects.map((subject) {
                  return Chip(
                    label: Text(subject,
                        style: const TextStyle(fontWeight: FontWeight.w500)),
                    backgroundColor: AppTheme.primaryColor.withAlpha(26),
                    labelStyle: TextStyle(color: AppTheme.primaryColor),
                    side:
                        BorderSide(color: AppTheme.primaryColor.withAlpha(51)),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
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
        padding: const EdgeInsets.all(0), // Arka planı kaldır
        decoration: BoxDecoration(
          color: Colors.transparent, // Tamamen şeffaf
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Checkbox(
              value: widget.onboardingData.isConfirmed,
              onChanged: (value) =>
                  widget.onConfirmationChanged(value ?? false),
              activeColor: AppTheme.primaryColor,
            ),
            Expanded(
              child: InkWell(
                onTap: () => widget
                    .onConfirmationChanged(!widget.onboardingData.isConfirmed),
                child: Text(
                  widget.isParentMode
                      ? 'Bilgilerimi onaylıyorum ve veli hesabımı başlatmak istiyorum.'
                      : 'Tüm seçimlerimi onaylıyorum ve kişiselleştirilmiş planımın oluşturulmasını istiyorum.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ),
          ],
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
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold)),
                  TextButton(
                    onPressed: () =>
                        widget.onEdit(OnboardingPageType.confidenceLevels),
                    child: const Text('Değiştir'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...confidenceLevels.entries
                  .map((entry) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Expanded(child: Text(entry.key)),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: _getConfidenceLevelColor(entry.value),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                levelLabels[entry.value] ?? entry.value,
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold),
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
      default:
        return AppTheme.primaryColor;
    }
  }
}
