import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class SubjectSelectionPage extends StatefulWidget {
  final OnboardingData onboardingData;
  final ValueChanged<List<String>> onSelectionChanged;

  const SubjectSelectionPage({
    Key? key,
    required this.onboardingData,
    required this.onSelectionChanged,
  }) : super(key: key);

  @override
  State<SubjectSelectionPage> createState() => _SubjectSelectionPageState();
}

class _SubjectSelectionPageState extends State<SubjectSelectionPage>
    with AutomaticKeepAliveClientMixin {
  late Set<String> _selectedSubjects;
  late Map<String, List<String>> _curriculum;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _selectedSubjects = widget.onboardingData.selectedSubjects.toSet();
    _curriculum = _getCurriculumForGrade(widget.onboardingData.grade ?? '11');
    print(
        'SubjectSelectionPage initState - mevcut seçili dersler: $_selectedSubjects');
  }

  @override
  void didUpdateWidget(SubjectSelectionPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Widget güncellendiğinde mevcut seçili dersleri koru
    if (oldWidget.onboardingData.selectedSubjects !=
        widget.onboardingData.selectedSubjects) {
      _selectedSubjects = widget.onboardingData.selectedSubjects.toSet();
      print(
          'SubjectSelectionPage didUpdateWidget - seçili dersler güncellendi: $_selectedSubjects');
    }
  }

  Map<String, List<String>> _getCurriculumForGrade(String grade) {
    final gradeNum = int.tryParse(grade);
    if (gradeNum == 9 || gradeNum == 10) {
      return {
        'Dersler': [
          'Türk Dili ve Edebiyatı',
          'Matematik',
          'Fizik',
          'Kimya',
          'Biyoloji',
          'Tarih',
          'Coğrafya',
          'İngilizce',
        ],
      };
    } else {
      // 11, 12 ve Mezunlar için
      return {
        'TYT': [
          'Türkçe',
          'Matematik',
          'Geometri',
          'Fizik',
          'Kimya',
          'Biyoloji',
          'Tarih',
          'Coğrafya',
          'Felsefe',
          'Din Kültürü'
        ],
        'AYT Sayısal': ['Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji'],
        'AYT Eşit Ağırlık': [
          'Matematik',
          'Geometri',
          'Türk Dili ve Edebiyatı',
          'Tarih-1',
          'Coğrafya-1'
        ],
        'AYT Sözel': [
          'Türk Dili ve Edebiyatı',
          'Tarih-1',
          'Coğrafya-1',
          'Tarih-2',
          'Coğrafya-2',
          'Felsefe Grubu',
          'Din Kültürü'
        ],
        'YDT': ['İngilizce'],
      };
    }
  }

  void _onSubjectSelected(bool? isSelected, String subject) {
    setState(() {
      if (isSelected == true) {
        _selectedSubjects.add(subject);
        print('Ders eklendi: $subject, toplam: $_selectedSubjects');
      } else {
        _selectedSubjects.remove(subject);
        print('Ders çıkarıldı: $subject, toplam: $_selectedSubjects');
      }
      widget.onSelectionChanged(_selectedSubjects.toList());
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // AutomaticKeepAliveClientMixin için gerekli
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
              widget.onboardingData.planScope == 'custom'
                  ? 'Kendi Yolunu Çiz'
                  : 'Hangi Derslerde Güçlenmek İstiyorsun?',
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
              widget.onboardingData.planScope == 'custom'
                  ? 'Çalışmak istediğin dersleri seçerek programını oluştur.'
                  : 'AI senin için en verimli programı oluştursun. Hangi derslere odaklanmak istediğini seç.',
              style: GoogleFonts.figtree(
                fontSize: 16,
                color: AppTheme.getSecondaryTextColor(context),
              ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 30),
          Expanded(
            child: ListView.builder(
              padding: EdgeInsets.zero,
              itemCount: _curriculum.keys.length,
              itemBuilder: (context, index) {
                final category = _curriculum.keys.elementAt(index);
                final subjects = _curriculum[category]!;
                return _buildSubjectCategory(category, subjects, index);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubjectCategory(
      String category, List<String> subjects, int index) {
    return Animate(
      delay: Duration(milliseconds: 300 + 100 * index),
      effects: const [
        FadeEffect(duration: Duration(milliseconds: 400)),
        SlideEffect(begin: Offset(0.1, 0), end: Offset.zero)
      ],
      child: Card(
        elevation: 0,
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Theme.of(context).dividerColor, width: 1),
        ),
        color: Theme.of(context).cardColor,
        child: ExpansionTile(
          shape: const Border(),
          initiallyExpanded: _curriculum.keys.length == 1,
          title: Text(
            category,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.getPrimaryTextColor(context),
                ),
          ),
          children: subjects.map((subject) {
            final isSelected = _selectedSubjects.contains(subject);
            return CheckboxListTile(
              title: Text(subject),
              value: isSelected,
              onChanged: (bool? value) => _onSubjectSelected(value, subject),
              activeColor: AppTheme.primaryColor,
              controlAffinity: ListTileControlAffinity.leading,
            );
          }).toList(),
        ),
      ),
    );
  }
}
