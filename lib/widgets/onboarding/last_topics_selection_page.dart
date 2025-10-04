import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
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
    // Gerçek müfredat verilerini kullan
    final curriculumTopics = <String, List<Map<String, dynamic>>>{};

    for (String subject in widget.onboardingData.selectedSubjects) {
      curriculumTopics[subject] = _getCurriculumTopicsForSubject(
          subject, (widget.onboardingData.grade as int?) ?? 9);
    }

    setState(() {
      _subjectTopics = curriculumTopics;
      _isLoading = false;
    });
  }

  List<Map<String, dynamic>> _getCurriculumTopicsForSubject(
      String subject, int grade) {
    // Gerçek müfredat verileri
    final curriculumData = _getCurriculumData(grade);

    // Dersi bul
    final subjectData = curriculumData['dersler'].firstWhere(
      (ders) => ders['ders_adi'] == subject,
      orElse: () => null,
    );

    if (subjectData == null) {
      // Ders bulunamazsa varsayılan konular
      return [
        {'id': '${subject.toLowerCase()}_1', 'name': '$subject - Konu 1'},
        {'id': '${subject.toLowerCase()}_2', 'name': '$subject - Konu 2'},
        {'id': '${subject.toLowerCase()}_3', 'name': '$subject - Konu 3'},
      ];
    }

    final topics = <Map<String, dynamic>>[];

    // Temalar varsa (Türk Dili ve Edebiyatı gibi)
    if (subjectData['temalar'] != null) {
      for (var tema in subjectData['temalar']) {
        for (var konu in tema['konular']) {
          topics.add({
            'id': '${subject.toLowerCase()}_${topics.length + 1}',
            'name': konu,
            'tema': tema['tema_adi'],
          });
        }
      }
    }

    // Üniteler varsa (Matematik, Fizik, Kimya, Biyoloji gibi)
    if (subjectData['uniteler'] != null) {
      for (var unite in subjectData['uniteler']) {
        for (var konu in unite['konular']) {
          topics.add({
            'id': '${subject.toLowerCase()}_${topics.length + 1}',
            'name': konu,
            'unite': unite['unite_adi'],
          });
        }
      }
    }

    return topics;
  }

  Map<String, dynamic> _getCurriculumData(int grade) {
    // Gerçek müfredat verileri (backend'deki ile aynı)
    final curriculumData = {
      9: {
        "sinif_duzeyi": "9. Sınıf",
        "dersler": [
          {
            "ders_adi": "Matematik",
            "uniteler": [
              {
                "unite_adi": "Sayılar",
                "konular": [
                  "Gerçek Sayıların Üslü ve Köklü Gösterimleri ile Yapılan İşlemler",
                  "Gerçek Sayı Aralıkları ile Yapılan İşlemler",
                  "Sayı Kümeleri ve İşlem Özellikleri",
                  "İki Kare Farkı ve Tamkare Özdeşlikleri"
                ]
              },
              {
                "unite_adi": "Nicelikler ve Değişimler",
                "konular": [
                  "Gerçek Sayılarda Tanımlı Doğrusal Fonksiyonlar ve Mutlak Değer",
                  "Fonksiyonlarının Nitel Özellikleri",
                  "Doğrusal Fonksiyonlarla İfade Edilen Denklem ve Eşitsizlikler"
                ]
              },
              {
                "unite_adi": "Geometrik Şekiller",
                "konular": [
                  "Üçgende Açı ve Kenarla İlgili Özellikler",
                  "Üçgende Açı Özellikleri Arasındaki İlişkiler",
                  "Üçgende Kenar Özellikleri Arasındaki İlişkiler"
                ]
              }
            ]
          },
          {
            "ders_adi": "Fizik",
            "uniteler": [
              {
                "unite_adi": "Fizik Bilimi ve Kariyer Keşfi",
                "konular": [
                  "Fizik Bilimi",
                  "Fizik Biliminin Alt Dalları",
                  "Fizik Bilimine Yön Verenler",
                  "Fizik Bilimi ile İlgili Kariyer Keşfi"
                ]
              },
              {
                "unite_adi": "Kuvvet ve Hareket",
                "konular": [
                  "Temel ve Türetilmiş Nicelikler",
                  "Skaler ve Vektörel Nicelikler",
                  "Vektörler",
                  "Doğadaki Temel Kuvvetler",
                  "Hareket ve Hareket Türleri"
                ]
              },
              {
                "unite_adi": "Enerji",
                "konular": [
                  "Enerji",
                  "Isı ve Sıcaklık İlişkisi",
                  "Isı, Öz Isı, Isı Sığası ve Sıcaklık Farkı",
                  "Hâl Değişimi",
                  "Isıl Denge",
                  "Isı Aktarım Yolları"
                ]
              }
            ]
          },
          {
            "ders_adi": "Kimya",
            "uniteler": [
              {
                "unite_adi": "Etkileşim",
                "konular": [
                  "Kimya Hayattır",
                  "Atomdan Periyodik Tabloya (Atom Teorileri, Atom Orbitalleri, Periyodik Tabloda Yer Bulma, Periyodik Özellikler)"
                ]
              },
              {
                "unite_adi": "Çeşitlilik",
                "konular": [
                  "Etkileşimler (Metalik, İyonik, Kovalent Bağ, Lewis Yapısı, Molekül Polarlığı)",
                  "Etkileşimden Maddeye (Moleküller Arası Etkileşimler, Katılar, Sıvılar)"
                ]
              }
            ]
          },
          {
            "ders_adi": "Biyoloji",
            "uniteler": [
              {
                "unite_adi": "Yaşam Bilimi: Biyoloji",
                "konular": [
                  "Biyoloji ve Bilimsel Yöntem",
                  "Canlıların Ortak Özellikleri",
                  "Canlıların Yapısındaki Temel Bileşikler"
                ]
              },
              {
                "unite_adi": "Hücre",
                "konular": [
                  "Hücre Teorisi",
                  "Hücrenin Yapısı ve Organizasyonu",
                  "Hücre Zarından Madde Geçişleri"
                ]
              }
            ]
          }
        ]
      },
      10: {
        "sinif_duzeyi": "10. Sınıf",
        "dersler": [
          {
            "ders_adi": "Matematik",
            "temalar": [
              {
                "tema_adi": "Sayılar",
                "konular": ["Polinomlar", "İkinci Dereceden Denklemler"]
              },
              {
                "tema_adi": "Geometrik Şekiller",
                "konular": ["Dörtgenler ve Çokgenler"]
              }
            ]
          },
          {
            "ders_adi": "Fizik",
            "uniteler": [
              {
                "unite_adi": "Kuvvet ve Hareket",
                "konular": [
                  "Newton'un Hareket Yasaları",
                  "Sürtünme Kuvveti",
                  "Limit Hız",
                  "Çembersel Hareket"
                ]
              },
              {
                "unite_adi": "Elektrik ve Manyetizma",
                "konular": [
                  "Elektriksel Kuvvet ve Elektriksel Alan",
                  "Manyetik Alan ve Manyetik Kuvvet",
                  "İndüksiyon Akımı",
                  "Transformatörler"
                ]
              }
            ]
          }
        ]
      }
    };

    return curriculumData[grade] as Map<String, dynamic> ??
        curriculumData[9] as Map<String, dynamic>; // Varsayılan olarak 9. sınıf
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
              'Her ders için en son işlediğin konuyu seç. Bu sayede kaldığın yerden devam edebiliriz:',
              style: GoogleFonts.figtree(
                fontSize: 16,
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
                              color:
                                  AppTheme.primaryColor.withValues(alpha: 0.8),
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
