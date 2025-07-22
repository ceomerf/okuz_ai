import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class LastTopicsSelectionPage extends StatefulWidget {
  final OnboardingData onboardingData;
  final VoidCallback onNext;

  const LastTopicsSelectionPage({
    Key? key,
    required this.onboardingData,
    required this.onNext,
  }) : super(key: key);

  @override
  State<LastTopicsSelectionPage> createState() =>
      _LastTopicsSelectionPageState();
}

class _LastTopicsSelectionPageState extends State<LastTopicsSelectionPage> {
  Map<String, List<Map<String, dynamic>>> _subjectTopics = {};
  Map<String, String> _selectedLastTopics = {};
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadTopicsFromCurriculum();
  }

  void _loadTopicsFromCurriculum() {
    // Mock data ile basit konular oluşturalım
    final mockTopics = <String, List<Map<String, dynamic>>>{};

    for (String subject in widget.onboardingData.selectedSubjects) {
      mockTopics[subject] = _getMockTopicsForSubject(subject);
    }

    setState(() {
      _subjectTopics = mockTopics;
      _isLoading = false;
    });
  }

  List<Map<String, dynamic>> _getMockTopicsForSubject(String subject) {
    // Her ders için örnek konular
    final topicMap = {
      'Matematik': [
        {'id': 'matematik_1', 'name': 'Sayılar'},
        {'id': 'matematik_2', 'name': 'Cebirsel İfadeler'},
        {'id': 'matematik_3', 'name': 'Denklemler'},
        {'id': 'matematik_4', 'name': 'Fonksiyonlar'},
        {'id': 'matematik_5', 'name': 'Geometri'},
      ],
      'Fizik': [
        {'id': 'fizik_1', 'name': 'Hareket'},
        {'id': 'fizik_2', 'name': 'Kuvvet'},
        {'id': 'fizik_3', 'name': 'Enerji'},
        {'id': 'fizik_4', 'name': 'Elektrik'},
        {'id': 'fizik_5', 'name': 'Optik'},
      ],
      'Kimya': [
        {'id': 'kimya_1', 'name': 'Atom Yapısı'},
        {'id': 'kimya_2', 'name': 'Periyodik Tablo'},
        {'id': 'kimya_3', 'name': 'Kimyasal Bağlar'},
        {'id': 'kimya_4', 'name': 'Asit-Baz'},
        {'id': 'kimya_5', 'name': 'Organik Kimya'},
      ],
      'Biyoloji': [
        {'id': 'biyoloji_1', 'name': 'Hücre'},
        {'id': 'biyoloji_2', 'name': 'Metabolizma'},
        {'id': 'biyoloji_3', 'name': 'Genetik'},
        {'id': 'biyoloji_4', 'name': 'Ekoloji'},
        {'id': 'biyoloji_5', 'name': 'Evrim'},
      ],
      'Türkçe': [
        {'id': 'turkce_1', 'name': 'Dil Bilgisi'},
        {'id': 'turkce_2', 'name': 'Okuduğunu Anlama'},
        {'id': 'turkce_3', 'name': 'Yazım Kuralları'},
        {'id': 'turkce_4', 'name': 'Edebiyat'},
        {'id': 'turkce_5', 'name': 'Kompozisyon'},
      ],
      'Türk Dili ve Edebiyatı': [
        {'id': 'edebiyat_1', 'name': 'Divan Edebiyatı'},
        {'id': 'edebiyat_2', 'name': 'Tanzimat Edebiyatı'},
        {'id': 'edebiyat_3', 'name': 'Cumhuriyet Dönemi'},
        {'id': 'edebiyat_4', 'name': 'Modern Türk Edebiyatı'},
        {'id': 'edebiyat_5', 'name': 'Şiir'},
      ],
      'Tarih': [
        {'id': 'tarih_1', 'name': 'İlk Çağ'},
        {'id': 'tarih_2', 'name': 'Orta Çağ'},
        {'id': 'tarih_3', 'name': 'Osmanlı Tarihi'},
        {'id': 'tarih_4', 'name': 'Türkiye Cumhuriyeti'},
        {'id': 'tarih_5', 'name': 'Dünya Tarihi'},
      ],
      'Coğrafya': [
        {'id': 'cografya_1', 'name': 'Fiziki Coğrafya'},
        {'id': 'cografya_2', 'name': 'Beşeri Coğrafya'},
        {'id': 'cografya_3', 'name': 'Türkiye Coğrafyası'},
        {'id': 'cografya_4', 'name': 'Dünya Coğrafyası'},
        {'id': 'cografya_5', 'name': 'Harita Bilgisi'},
      ],
      'İngilizce': [
        {'id': 'ingilizce_1', 'name': 'Grammar'},
        {'id': 'ingilizce_2', 'name': 'Vocabulary'},
        {'id': 'ingilizce_3', 'name': 'Reading'},
        {'id': 'ingilizce_4', 'name': 'Writing'},
        {'id': 'ingilizce_5', 'name': 'Speaking'},
      ],
    };

    return topicMap[subject] ??
        [
          {'id': '${subject.toLowerCase()}_1', 'name': '$subject - Konu 1'},
          {'id': '${subject.toLowerCase()}_2', 'name': '$subject - Konu 2'},
          {'id': '${subject.toLowerCase()}_3', 'name': '$subject - Konu 3'},
        ];
  }

  void _selectLastTopic(String subject, String topic) {
    setState(() {
      _selectedLastTopics[subject] = topic;
    });
  }

  bool get _allTopicsSelected {
    return _subjectTopics.keys.every((subject) =>
        _selectedLastTopics.containsKey(subject) &&
        _selectedLastTopics[subject]!.isNotEmpty);
  }

  void _proceedToNext() {
    // OnboardingData'ya son konuları kaydet
    widget.onboardingData.lastCompletedTopics =
        Map<String, String>.from(_selectedLastTopics);
    widget.onNext();
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
              'En son hangi konuları işlemiştin?',
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
              'Her ders için en son işlediğin konuyu seç. Bu sayede kaldığın yerden devam edebiliriz:',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppTheme.getSecondaryTextColor(context),
                  ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 40),
          Expanded(
            child: _buildContent(),
          ),
          if (_allTopicsSelected)
            Animate(
              effects: const [
                FadeEffect(duration: Duration(milliseconds: 500))
              ],
              child: Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: ElevatedButton(
                  onPressed: _proceedToNext,
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    backgroundColor: AppTheme.primaryColor,
                    elevation: 0,
                  ),
                  child: const Text(
                    'Devam Et',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Konular yükleniyor...'),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Colors.red.shade600,
                  ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _isLoading = true;
                  _errorMessage = null;
                });
                _loadTopicsFromCurriculum();
              },
              child: const Text('Tekrar Dene'),
            ),
          ],
        ),
      );
    }

    if (_subjectTopics.isEmpty) {
      return const Center(
        child: Text('Ders bulunamadı'),
      );
    }

    return ListView.builder(
      padding: EdgeInsets.zero,
      itemCount: _subjectTopics.keys.length,
      itemBuilder: (context, index) {
        final subject = _subjectTopics.keys.elementAt(index);
        final topics = _subjectTopics[subject]!;
        return _buildSubjectCard(subject, topics, index);
      },
    );
  }

  Widget _buildSubjectCard(
      String subject, List<Map<String, dynamic>> topics, int index) {
    final selectedTopic = _selectedLastTopics[subject];
    final hasSelection = selectedTopic != null && selectedTopic.isNotEmpty;

    return Animate(
      delay: Duration(milliseconds: 300 + 100 * index),
      effects: const [
        FadeEffect(duration: Duration(milliseconds: 400)),
        SlideEffect(begin: Offset(0.3, 0), end: Offset.zero),
      ],
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: Theme.of(context).cardColor,
          border: Border.all(
            color: hasSelection
                ? AppTheme.primaryColor
                : Theme.of(context).dividerColor,
            width: hasSelection ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Theme.of(context).shadowColor.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ExpansionTile(
          title: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: hasSelection
                      ? AppTheme.primaryColor.withValues(alpha: 0.1)
                      : Theme.of(context).dividerColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  _getSubjectIcon(subject),
                  color: hasSelection
                      ? AppTheme.primaryColor
                      : Theme.of(context).iconTheme.color,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      subject,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: hasSelection
                                ? AppTheme.primaryColor
                                : AppTheme.getPrimaryTextColor(context),
                          ),
                    ),
                    if (hasSelection)
                      Text(
                        selectedTopic,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppTheme.primaryColor.withValues(alpha: 0.8),
                              fontWeight: FontWeight.w500,
                            ),
                      )
                    else
                      Text(
                        'Konu seçiniz',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppTheme.getSecondaryTextColor(context),
                              fontStyle: FontStyle.italic,
                            ),
                      ),
                  ],
                ),
              ),
              if (hasSelection)
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.check,
                    color: Colors.white,
                    size: 16,
                  ),
                ),
            ],
          ),
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Divider(),
                  const SizedBox(height: 8),
                  Text(
                    'En son işlediğin konuyu seç:',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                          color: AppTheme.getPrimaryTextColor(context),
                        ),
                  ),
                  const SizedBox(height: 12),
                  ...topics.map((topicData) {
                    final topicName = topicData['name'] as String;
                    final isSelected = selectedTopic == topicName;

                    return GestureDetector(
                      onTap: () => _selectLastTopic(subject, topicName),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppTheme.primaryColor.withValues(alpha: 0.1)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected
                                ? AppTheme.primaryColor
                                : Colors.transparent,
                            width: 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    topicName,
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.copyWith(
                                          fontWeight: isSelected
                                              ? FontWeight.w600
                                              : FontWeight.normal,
                                          color: isSelected
                                              ? AppTheme.primaryColor
                                              : AppTheme.getPrimaryTextColor(
                                                  context),
                                        ),
                                  ),
                                ],
                              ),
                            ),
                            if (isSelected)
                              Icon(
                                Icons.radio_button_checked,
                                color: AppTheme.primaryColor,
                                size: 20,
                              )
                            else
                              Icon(
                                Icons.radio_button_unchecked,
                                color: Theme.of(context).dividerColor,
                                size: 20,
                              ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getSubjectIcon(String subject) {
    switch (subject.toLowerCase()) {
      case 'matematik':
        return Icons.calculate;
      case 'fizik':
        return Icons.science;
      case 'kimya':
        return Icons.biotech;
      case 'biyoloji':
        return Icons.local_florist;
      case 'türk dili ve edebiyatı':
      case 'türkçe':
        return Icons.menu_book;
      case 'tarih':
        return Icons.history;
      case 'coğrafya':
        return Icons.map;
      case 'felsefe':
        return Icons.psychology;
      case 'geometri':
        return Icons.architecture;
      default:
        return Icons.book;
    }
  }
}
