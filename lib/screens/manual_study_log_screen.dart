import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../services/study_tracking_service.dart';
import '../providers/study_data_provider.dart';
import '../widgets/xp_notification_widget.dart';

class ManualStudyLogScreen extends StatefulWidget {
  const ManualStudyLogScreen({super.key});

  @override
  State<ManualStudyLogScreen> createState() => _ManualStudyLogScreenState();
}

class _ManualStudyLogScreenState extends State<ManualStudyLogScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _durationController = TextEditingController();
  final _customSubjectController = TextEditingController();
  final _customTopicController = TextEditingController();

  String? _selectedSubject;
  String? _selectedTopic;
  DateTime _selectedDate = DateTime.now();
  int _selectedHours = 0;
  int _selectedMinutes = 0;
  bool _useCustomSubject = false;
  bool _useCustomTopic = false;
  bool _isLoading = false;

  // Services
  final StudyTrackingService _studyTrackingService = StudyTrackingService();

  late AnimationController _cardAnimationController;
  late Animation<double> _cardAnimation;

  // Pre-defined subjects and topics
  final Map<String, List<String>> _subjectsAndTopics = {
    'Matematik': [
      'Fonksiyonlar',
      'Türev',
      'İntegral',
      'Geometri',
      'Sayılar',
      'Diğer'
    ],
    'Fizik': ['Hareket', 'Kuvvet', 'Enerji', 'Optik', 'Elektrik', 'Diğer'],
    'Kimya': [
      'Atomlar',
      'Moleküller',
      'Tepkimeler',
      'Çözeltiler',
      'Organik',
      'Diğer'
    ],
    'Türkçe': [
      'Dil Bilgisi',
      'Edebiyat',
      'Şiir',
      'Kompozisyon',
      'Metin Analizi',
      'Diğer'
    ],
    'Tarih': [
      'Osmanlı',
      'Cumhuriyet',
      'Dünya Tarihi',
      'Sanat Tarihi',
      'Coğrafya',
      'Diğer'
    ],
    'Biyoloji': [
      'Hücre',
      'Kalıtım',
      'Evrim',
      'Ekoloji',
      'İnsan Vücudu',
      'Diğer'
    ],
    'Diğer': [
      'Özel Ders',
      'Deneme Sınavı',
      'Kitap Okuma',
      'Video İzleme',
      'Diğer'
    ],
  };

  @override
  void initState() {
    super.initState();

    _cardAnimationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _cardAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _cardAnimationController,
      curve: Curves.elasticOut,
    ));

    _cardAnimationController.forward();
  }

  @override
  void dispose() {
    _cardAnimationController.dispose();
    _durationController.dispose();
    _customSubjectController.dispose();
    _customTopicController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final now = DateTime.now();
    final firstDate = DateTime(now.year - 1);
    final lastDate = now;

    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: firstDate,
      lastDate: lastDate,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: AppTheme.primaryColor,
                  onPrimary: Colors.white,
                ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  String _getFormattedDate() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final selectedDay =
        DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day);

    if (selectedDay == today) {
      return 'Bugün';
    } else if (selectedDay == yesterday) {
      return 'Dün';
    } else {
      return '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}';
    }
  }

  int _getTotalMinutes() {
    return (_selectedHours * 60) + _selectedMinutes;
  }

  double _getXPGain() {
    final totalMinutes = _getTotalMinutes();
    return totalMinutes * 0.75; // Manuel giriş multiplier
  }

  Future<void> _saveStudyLog() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final totalMinutes = _getTotalMinutes();
    if (totalMinutes == 0) {
      _showErrorDialog('Lütfen geçerli bir süre giriniz.');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final subject = _useCustomSubject
          ? _customSubjectController.text.trim()
          : _selectedSubject!;
      final topic = _useCustomTopic
          ? _customTopicController.text.trim()
          : _selectedTopic!;
      final date = _selectedDate.toIso8601String().split('T')[0];

      await _studyTrackingService.logStudySession(subject, totalMinutes);

      // Mock result for UI update
      final result = {
        'xpGained': totalMinutes * 2, // Mock XP calculation
        'totalXP': 1000, // Mock total XP
        'levelInfo': {
          'leveledUp': false,
          'oldLevel': 5,
          'newLevel': 5,
        }
      };

      // Immediate UI update via StudyDataProvider
      if (mounted) {
        final studyDataProvider =
            Provider.of<StudyDataProvider>(context, listen: false);
        // Mock update - no actual update needed for now
      }

      HapticFeedback.heavyImpact();
      _showXPNotification(result);
    } catch (e) {
      _showErrorDialog('Çalışma kaydı oluşturulurken hata oluştu: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _showXPNotification(Map<String, dynamic> result) {
    final levelInfo = result['levelInfo'];
    showXPNotification(
      context,
      xpGained: result['xpGained'] ?? 0,
      totalXP: result['totalXP'] ?? 0,
      leveledUp: levelInfo?['leveledUp'] ?? false,
      oldLevel: levelInfo?['oldLevel'],
      newLevel: levelInfo?['newLevel'],
      studyType: 'Manuel Kayıt',
    );

    // Reset form and optionally navigate back after notification
    Future.delayed(const Duration(milliseconds: 3000), () {
      if (mounted) {
        _resetForm();
      }
    });
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(20))),
        title: const Row(
          children: [
            Icon(Icons.error, color: AppTheme.errorColor),
            SizedBox(width: 8),
            Text('Hata'),
          ],
        ),
        content: Text(message),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tamam'),
          ),
        ],
      ),
    );
  }

  void _resetForm() {
    setState(() {
      _selectedSubject = null;
      _selectedTopic = null;
      _selectedDate = DateTime.now();
      _selectedHours = 0;
      _selectedMinutes = 0;
      _useCustomSubject = false;
      _useCustomTopic = false;
    });

    _customSubjectController.clear();
    _customTopicController.clear();
    _formKey.currentState?.reset();
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Manuel Çalışma Kaydı'),
        centerTitle: true,
        elevation: 0,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                AppTheme.primaryColor,
                AppTheme.primaryDarkColor,
                AppTheme.accentColor,
              ],
            ),
          ),
        ),
        actions: [
          IconButton(
            onPressed: _resetForm,
            icon: const Icon(Icons.refresh),
            tooltip: 'Formu Temizle',
          ),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDarkMode
                ? [
                    AppTheme.darkBackgroundColor,
                    AppTheme.darkCardColor,
                  ]
                : [
                    AppTheme.lightBackgroundColor,
                    AppTheme.primaryLightColor.withValues(alpha: 0.1),
                  ],
          ),
        ),
        child: SafeArea(
          child: Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(24.0),
              children: [
                // Info Card
                AnimatedBuilder(
                  animation: _cardAnimation,
                  builder: (context, child) {
                    return Transform.scale(
                      scale: _cardAnimation.value,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        margin: const EdgeInsets.only(bottom: 24),
                        decoration: BoxDecoration(
                          color: AppTheme.infoColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: AppTheme.infoColor.withValues(alpha: 0.3),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.info_outline,
                              color: AppTheme.infoColor,
                              size: 24,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Manuel Kayıt Bilgisi',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleSmall
                                        ?.copyWith(
                                          fontWeight: FontWeight.bold,
                                          color: AppTheme.infoColor,
                                        ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Manuel kayıtlar otomatik zamanlayıcıya göre %25 daha az XP verir. Dürüstlük için teşekkürler!',
                                    style:
                                        Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),

                // Date Selection
                _buildSectionCard(
                  title: 'Tarih Seçimi',
                  icon: Icons.calendar_today,
                  child: GestureDetector(
                    onTap: _selectDate,
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: Theme.of(context).dividerColor,
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.date_range,
                            color: AppTheme.primaryColor,
                          ),
                          const SizedBox(width: 12),
                          Text(
                            _getFormattedDate(),
                            style:
                                Theme.of(context).textTheme.bodyLarge?.copyWith(
                                      fontWeight: FontWeight.w500,
                                    ),
                          ),
                          const Spacer(),
                          Icon(
                            Icons.arrow_drop_down,
                            color: Theme.of(context).textTheme.bodyLarge?.color,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // Subject Selection
                _buildSectionCard(
                  title: 'Ders Seçimi',
                  icon: Icons.school,
                  child: Column(
                    children: [
                      if (!_useCustomSubject)
                        DropdownButtonFormField<String>(
                          decoration: InputDecoration(
                            labelText: 'Ders',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            prefixIcon: Icon(
                              Icons.subject,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                          value: _selectedSubject,
                          items: _subjectsAndTopics.keys.map((subject) {
                            return DropdownMenuItem(
                              value: subject,
                              child: Text(subject),
                            );
                          }).toList(),
                          onChanged: (value) {
                            setState(() {
                              _selectedSubject = value;
                              _selectedTopic = null;
                            });
                          },
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Lütfen bir ders seçiniz';
                            }
                            return null;
                          },
                        ),
                      if (_useCustomSubject)
                        TextFormField(
                          controller: _customSubjectController,
                          decoration: InputDecoration(
                            labelText: 'Özel Ders Adı',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            prefixIcon: Icon(
                              Icons.edit,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Lütfen ders adını giriniz';
                            }
                            return null;
                          },
                        ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Checkbox(
                            value: _useCustomSubject,
                            onChanged: (value) {
                              setState(() {
                                _useCustomSubject = value ?? false;
                                if (_useCustomSubject) {
                                  _selectedSubject = null;
                                } else {
                                  _customSubjectController.clear();
                                }
                              });
                            },
                            activeColor: AppTheme.primaryColor,
                          ),
                          Text(
                            'Özel ders adı gir',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Topic Selection
                _buildSectionCard(
                  title: 'Konu Seçimi',
                  icon: Icons.topic,
                  child: Column(
                    children: [
                      if (!_useCustomTopic && _selectedSubject != null)
                        DropdownButtonFormField<String>(
                          decoration: InputDecoration(
                            labelText: 'Konu',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            prefixIcon: Icon(
                              Icons.topic,
                              color: AppTheme.accentColor,
                            ),
                          ),
                          value: _selectedTopic,
                          items: _subjectsAndTopics[_selectedSubject]!
                              .map((topic) {
                            return DropdownMenuItem(
                              value: topic,
                              child: Text(topic),
                            );
                          }).toList(),
                          onChanged: (value) {
                            setState(() {
                              _selectedTopic = value;
                              if (value == 'Diğer') {
                                _useCustomTopic = true;
                              }
                            });
                          },
                          validator: (value) {
                            if (!_useCustomTopic &&
                                (value == null || value.isEmpty)) {
                              return 'Lütfen bir konu seçiniz';
                            }
                            return null;
                          },
                        ),
                      if (_useCustomTopic || _selectedTopic == 'Diğer')
                        TextFormField(
                          controller: _customTopicController,
                          decoration: InputDecoration(
                            labelText: 'Özel Konu Adı',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            prefixIcon: Icon(
                              Icons.edit,
                              color: AppTheme.accentColor,
                            ),
                          ),
                          validator: (value) {
                            if (_useCustomTopic || _selectedTopic == 'Diğer') {
                              if (value == null || value.trim().isEmpty) {
                                return 'Lütfen konu adını giriniz';
                              }
                            }
                            return null;
                          },
                        ),
                      if (_selectedSubject != null)
                        Column(
                          children: [
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Checkbox(
                                  value: _useCustomTopic,
                                  onChanged: (value) {
                                    setState(() {
                                      _useCustomTopic = value ?? false;
                                      if (_useCustomTopic) {
                                        _selectedTopic = null;
                                      } else {
                                        _customTopicController.clear();
                                      }
                                    });
                                  },
                                  activeColor: AppTheme.accentColor,
                                ),
                                Text(
                                  'Özel konu adı gir',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ],
                        ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Duration Selection
                _buildSectionCard(
                  title: 'Süre Seçimi',
                  icon: Icons.timer,
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Saat',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.copyWith(
                                        fontWeight: FontWeight.w500,
                                      ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12),
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: Theme.of(context).dividerColor,
                                    ),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: DropdownButtonHideUnderline(
                                    child: DropdownButton<int>(
                                      value: _selectedHours,
                                      isExpanded: true,
                                      items: List.generate(13, (index) {
                                        return DropdownMenuItem(
                                          value: index,
                                          child: Text('$index saat'),
                                        );
                                      }),
                                      onChanged: (value) {
                                        setState(() {
                                          _selectedHours = value ?? 0;
                                        });
                                      },
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Dakika',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.copyWith(
                                        fontWeight: FontWeight.w500,
                                      ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12),
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: Theme.of(context).dividerColor,
                                    ),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: DropdownButtonHideUnderline(
                                    child: DropdownButton<int>(
                                      value: _selectedMinutes,
                                      isExpanded: true,
                                      items: List.generate(12, (index) {
                                        final minutes = index * 5;
                                        return DropdownMenuItem(
                                          value: minutes,
                                          child: Text('$minutes dakika'),
                                        );
                                      }),
                                      onChanged: (value) {
                                        setState(() {
                                          _selectedMinutes = value ?? 0;
                                        });
                                      },
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // Duration Summary
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: AppTheme.primaryColor.withValues(alpha: 0.3),
                          ),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Toplam Süre:',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.copyWith(
                                        fontWeight: FontWeight.w500,
                                      ),
                                ),
                                Text(
                                  '${_getTotalMinutes()} dakika',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyLarge
                                      ?.copyWith(
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.primaryColor,
                                      ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Kazanacağınız XP:',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.copyWith(
                                        fontWeight: FontWeight.w500,
                                      ),
                                ),
                                Text(
                                  '${_getXPGain().floor()} XP',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyLarge
                                      ?.copyWith(
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.accentColor,
                                      ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // Save Button
                Container(
                  width: double.infinity,
                  height: 56,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primaryColor.withValues(alpha: 0.3),
                        blurRadius: 12,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _saveStudyLog,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 0,
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.save, size: 24),
                              const SizedBox(width: 8),
                              Text(
                                'Çalışma Kaydını Oluştur',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                            ],
                          ),
                  ),
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required Widget child,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: AppTheme.primaryColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}
