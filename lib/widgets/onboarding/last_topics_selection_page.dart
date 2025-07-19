import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:cloud_functions/cloud_functions.dart';

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

  Future<void> _loadTopicsFromCurriculum() async {
    try {
      final functions = FirebaseFunctions.instance;
      final callable = functions.httpsCallable('getTopicsForGradeAndSubjects');

      final result = await callable.call({
        'grade': widget.onboardingData.grade,
        'academicTrack': widget.onboardingData.academicTrack,
        'selectedSubjects': widget.onboardingData.selectedSubjects,
      });

      if (mounted) {
        setState(() {
          _subjectTopics = Map<String, List<Map<String, dynamic>>>.from(
              result.data['subjectTopics'].map((key, value) =>
                  MapEntry(key, List<Map<String, dynamic>>.from(value))));
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Konular yüklenirken hata: $e');
      if (mounted) {
        setState(() {
          _errorMessage = 'Konular yüklenemedi: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
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
              color: Theme.of(context).shadowColor.withOpacity(0.05),
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
                      ? AppTheme.primaryColor.withOpacity(0.1)
                      : Theme.of(context).dividerColor.withOpacity(0.1),
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
                              color: AppTheme.primaryColor.withOpacity(0.8),
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
                    final topicName = topicData['konuAdi'] as String;
                    final unitName = topicData['uniteAdi'] as String?;
                    final isSelected = selectedTopic == topicName;

                    return GestureDetector(
                      onTap: () => _selectLastTopic(subject, topicName),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppTheme.primaryColor.withOpacity(0.1)
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
                                  if (unitName != null && unitName.isNotEmpty)
                                    Text(
                                      unitName,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            color:
                                                AppTheme.getSecondaryTextColor(
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
