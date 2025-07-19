import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../services/study_tracking_service.dart';
import '../providers/study_data_provider.dart';
import '../widgets/xp_notification_widget.dart';

class ManualStudyBottomSheet extends StatefulWidget {
  const ManualStudyBottomSheet({super.key});

  @override
  State<ManualStudyBottomSheet> createState() => _ManualStudyBottomSheetState();
}

class _ManualStudyBottomSheetState extends State<ManualStudyBottomSheet>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final StudyTrackingService _studyTrackingService = StudyTrackingService();

  // Form fields
  String? _selectedSubject;
  final _topicController = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  double _studyHours = 1.0;
  bool _isLoading = false;

  // Animation
  late AnimationController _animationController;
  late Animation<double> _slideAnimation;

  // Pre-defined subjects
  final List<String> _subjects = [
    'Matematik',
    'Fizik',
    'Kimya',
    'Türkçe',
    'Tarih',
    'Biyoloji',
    'Coğrafya',
    'Felsefe',
    'İngilizce',
    'Diğer',
  ];

  @override
  void initState() {
    super.initState();

    _animationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _slideAnimation = Tween<double>(
      begin: 1.0,
      end: 0.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutCubic,
    ));

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _topicController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now(),
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

  Future<void> _saveStudySession() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedSubject == null) {
      _showErrorSnackBar('Lütfen bir ders seçiniz');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final durationInMinutes = (_studyHours * 60).round();
      final date = _selectedDate.toIso8601String().split('T')[0];

      final result = await _studyTrackingService.logStudySession(
        durationInMinutes: durationInMinutes,
        subject: _selectedSubject!,
        topic: _topicController.text.trim().isEmpty
            ? 'Genel Çalışma'
            : _topicController.text.trim(),
        isManualEntry: true,
        date: date,
      );

      // Immediate UI update via StudyDataProvider
      if (mounted) {
        final studyDataProvider =
            Provider.of<StudyDataProvider>(context, listen: false);
        await studyDataProvider.updateAfterStudySession(result);
      }

      HapticFeedback.heavyImpact();

      // Close bottom sheet
      Navigator.of(context).pop();

      // Show XP notification
      final levelInfo = result['levelInfo'];
      showXPNotification(
        context,
        xpGained: result['xpGained'] ?? 0,
        totalXP: result['totalXP'] ?? 0,
        leveledUp: levelInfo?['leveledUp'] ?? false,
        oldLevel: levelInfo?['oldLevel'],
        newLevel: levelInfo?['newLevel'],
        studyType: 'Çevrimdışı Çalışma',
      );
    } catch (e) {
      _showErrorSnackBar('Çalışma kaydı oluşturulurken hata oluştu: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _showErrorSnackBar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: AppTheme.errorColor,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _slideAnimation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(
              0, _slideAnimation.value * MediaQuery.of(context).size.height),
          child: Container(
            height: MediaQuery.of(context).size.height * 0.75,
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 20,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            child: Column(
              children: [
                // Handle
                Container(
                  margin: const EdgeInsets.only(top: 12),
                  width: 50,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Theme.of(context).dividerColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),

                // Header
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          Icons.add_circle_outline,
                          color: AppTheme.primaryColor,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Çevrimdışı Çalışma Ekle',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                            Text(
                              'Daha önceki çalışmalarınızı kaydedin',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    color: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.color
                                        ?.withOpacity(0.7),
                                  ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                ),

                // Form
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Form(
                      key: _formKey,
                      child: SingleChildScrollView(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Warning Card
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppTheme.warningColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: AppTheme.warningColor.withOpacity(0.3),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.info_outline,
                                    color: AppTheme.warningColor,
                                    size: 20,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      'Manuel kayıtlar daha az XP verir (0.75x)',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            color: AppTheme.warningColor,
                                            fontWeight: FontWeight.w500,
                                          ),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 24),

                            // Date Selection
                            Text(
                              'Tarih',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            GestureDetector(
                              onTap: _selectDate,
                              child: Container(
                                width: double.infinity,
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
                                      Icons.calendar_today,
                                      color: AppTheme.primaryColor,
                                      size: 20,
                                    ),
                                    const SizedBox(width: 12),
                                    Text(
                                      _getFormattedDate(),
                                      style:
                                          Theme.of(context).textTheme.bodyLarge,
                                    ),
                                    const Spacer(),
                                    Icon(
                                      Icons.arrow_drop_down,
                                      color: Theme.of(context)
                                          .textTheme
                                          .bodyLarge
                                          ?.color,
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            const SizedBox(height: 24),

                            // Subject Selection
                            Text(
                              'Ders',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            DropdownButtonFormField<String>(
                              decoration: InputDecoration(
                                hintText: 'Ders seçiniz',
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                prefixIcon: Icon(
                                  Icons.school,
                                  color: AppTheme.primaryColor,
                                ),
                              ),
                              value: _selectedSubject,
                              items: _subjects.map((subject) {
                                return DropdownMenuItem(
                                  value: subject,
                                  child: Text(subject),
                                );
                              }).toList(),
                              onChanged: (value) {
                                setState(() {
                                  _selectedSubject = value;
                                });
                              },
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Lütfen bir ders seçiniz';
                                }
                                return null;
                              },
                            ),

                            const SizedBox(height: 24),

                            // Topic
                            Text(
                              'Konu (Opsiyonel)',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _topicController,
                              decoration: InputDecoration(
                                hintText: 'Çalıştığınız konuyu yazın...',
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                prefixIcon: Icon(
                                  Icons.topic,
                                  color: AppTheme.accentColor,
                                ),
                              ),
                              maxLines: 2,
                            ),

                            const SizedBox(height: 24),

                            // Study Duration
                            Text(
                              'Çalışma Süresi: ${_studyHours.toStringAsFixed(1)} saat',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            SliderTheme(
                              data: SliderTheme.of(context).copyWith(
                                activeTrackColor: AppTheme.primaryColor,
                                inactiveTrackColor:
                                    AppTheme.primaryColor.withOpacity(0.3),
                                thumbColor: AppTheme.primaryColor,
                                overlayColor:
                                    AppTheme.primaryColor.withOpacity(0.2),
                                trackHeight: 6,
                              ),
                              child: Slider(
                                value: _studyHours,
                                min: 0.25,
                                max: 8.0,
                                divisions: 31, // 0.25 steps
                                onChanged: (value) {
                                  setState(() {
                                    _studyHours = value;
                                  });
                                },
                              ),
                            ),

                            // Duration helpers
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '15dk',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                        color: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.color
                                            ?.withOpacity(0.7),
                                      ),
                                ),
                                Text(
                                  '8sa',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                        color: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.color
                                            ?.withOpacity(0.7),
                                      ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 24),

                            // XP Preview
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppTheme.accentColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: AppTheme.accentColor.withOpacity(0.3),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.star,
                                    color: AppTheme.accentColor,
                                    size: 20,
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    'Kazanacağınız XP:',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.copyWith(
                                          fontWeight: FontWeight.w500,
                                        ),
                                  ),
                                  const Spacer(),
                                  Text(
                                    '+${((_studyHours * 60) * 0.75).floor()} XP',
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
                            ),

                            const SizedBox(height: 32),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),

                // Save Button
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Container(
                    width: double.infinity,
                    height: 56,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primaryColor.withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _saveStudySession,
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
                                  'Çalışmayı Kaydet',
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
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// Helper function to show the bottom sheet
void showManualStudyBottomSheet(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => const ManualStudyBottomSheet(),
  );
}
