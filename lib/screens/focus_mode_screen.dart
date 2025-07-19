import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import 'dart:math' as math;
import 'package:provider/provider.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import '../theme/app_theme.dart';
import '../services/study_tracking_service.dart';
import '../services/plan_service.dart';
import '../providers/study_data_provider.dart';
import '../widgets/xp_notification_widget.dart';

class FocusModeScreen extends StatefulWidget {
  final String? taskSubject;
  final String? taskTopic;
  final int? taskDurationMinutes;
  final String? taskId;

  const FocusModeScreen({
    super.key,
    this.taskSubject,
    this.taskTopic,
    this.taskDurationMinutes,
    this.taskId,
  });

  @override
  State<FocusModeScreen> createState() => _FocusModeScreenState();
}

class _FocusModeScreenState extends State<FocusModeScreen>
    with TickerProviderStateMixin {
  Timer? _timer;

  // Timer state
  late int _totalSeconds;
  late int _remainingSeconds;
  bool _isRunning = false;
  bool _isPaused = false;
  bool _isCompleted = false;

  // Analytics data
  int _pauseCount = 0;
  String _sessionCompletionState = 'pending';
  String? _userFeeling; // Başlangıçta null
  DateTime? _sessionStartTime;

  // Animations
  late AnimationController _pulseController;
  late AnimationController _progressController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _scaleAnimation;

  // Subject and Topic
  String? _selectedSubject;
  String? _selectedTopic;

  @override
  void initState() {
    super.initState();

    // Initialize timer values
    _totalSeconds = (widget.taskDurationMinutes ?? 25) * 60;
    _remainingSeconds = _totalSeconds;

    // Initialize subject and topic
    _selectedSubject = widget.taskSubject;
    _selectedTopic = widget.taskTopic;

    // Initialize animations
    _setupAnimations();
  }

  void _setupAnimations() {
    // Pulse animation for breathing effect
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );

    _pulseAnimation = Tween<double>(
      begin: 0.95,
      end: 1.05,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));

    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 1.02,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));

    // Progress animation controller
    _progressController = AnimationController(
      duration: Duration(seconds: _totalSeconds),
      vsync: this,
    );

    // Start breathing animation when running
    _pulseController.repeat(reverse: true);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  void _startTimer() {
    if (_remainingSeconds <= 0) return;

    setState(() {
      _isRunning = true;
      _isPaused = false;

      // Record start time if this is the first start
      if (_sessionStartTime == null) {
        _sessionStartTime = DateTime.now();
      }
    });

    // Start progress animation
    _progressController.forward();

    // Vibration feedback
    HapticFeedback.lightImpact();

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_remainingSeconds > 0) {
          _remainingSeconds--;
        } else {
          _completeSession('completed');
        }
      });
    });
  }

  void _pauseTimer() {
    _timer?.cancel();
    _progressController.stop();

    setState(() {
      _isRunning = false;
      _isPaused = true;
      _pauseCount++; // Increment pause count for analytics
    });

    HapticFeedback.lightImpact();
  }

  void _resumeTimer() {
    _startTimer();
  }

  void _stopTimer() {
    _timer?.cancel();
    _progressController.reset();

    // Check if session was prematurely stopped
    if (_isRunning || _isPaused) {
      // Calculate what percentage of the session was completed
      final percentageCompleted =
          (_totalSeconds - _remainingSeconds) / _totalSeconds;

      // If less than 90% completed, mark as interrupted
      _sessionCompletionState =
          percentageCompleted >= 0.9 ? 'completed' : 'interrupted';

      // Only show session summary if at least 20% was completed
      if (percentageCompleted >= 0.2) {
        _showSessionSummaryDialog();
      }
    }

    setState(() {
      _isRunning = false;
      _isPaused = false;
      _remainingSeconds = _totalSeconds;
    });

    HapticFeedback.mediumImpact();
  }

  void _completeSession(String completionState) {
    _timer?.cancel();
    _progressController.stop();

    setState(() {
      _isRunning = false;
      _isPaused = false;
      _isCompleted = true;
      _remainingSeconds = 0;
      _sessionCompletionState = completionState;
    });

    // Completion feedback
    HapticFeedback.heavyImpact();

    // Show session summary dialog with analytics data
    _showSessionSummaryDialog();
  }

  void _showSessionSummaryDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(builder: (context, setDialogState) {
          return AlertDialog(
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            contentPadding: const EdgeInsets.fromLTRB(24, 20, 24, 12),
            title: _buildDialogTitle(),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _sessionCompletionState == 'completed'
                        ? 'Harika iş! Bu seansı başarıyla tamamladın.'
                        : 'Seans özetin aşağıda. Geri bildirimin bizim için önemli.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 15),
                  ),
                  const SizedBox(height: 20),
                  _buildStatsContainer(),
                  const SizedBox(height: 20),
                  _buildFeelingSection(setDialogState),
                  const SizedBox(height: 20),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('İptal'),
              ),
              FilledButton(
                onPressed: _userFeeling != null
                    ? () {
                        _trackStudySession();
                        Navigator.of(context).pop(); // Dismiss dialog
                        Navigator.of(context)
                            .pop(); // Return to previous screen
                      }
                    : null, // Disable if no feeling is selected
                style: FilledButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                ),
                child: const Text('Kaydet ve Çık'),
              ),
            ],
          );
        });
      },
    );
  }

  Widget _buildDialogTitle() {
    return Row(
      children: [
        Icon(
          _sessionCompletionState == 'completed'
              ? Icons.celebration
              : Icons.assignment_turned_in,
          color: _sessionCompletionState == 'completed'
              ? AppTheme.successColor
              : AppTheme.accentColor,
          size: 28,
        ),
        const SizedBox(width: 12),
        Text(
          _sessionCompletionState == 'completed' ? 'Tebrikler!' : 'Seans Özeti',
          style: Theme.of(context).textTheme.titleLarge,
        ),
      ],
    );
  }

  Widget _buildStatsContainer() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).dividerColor,
          width: 1,
        ),
      ),
      child: Column(
        children: [
          _buildStatRow(
            icon: Icons.timer,
            title: 'Çalışılan Süre',
            value:
                '${((_totalSeconds - _remainingSeconds) / 60).ceil()} dakika',
          ),
          const Divider(),
          _buildStatRow(
            icon: Icons.pause_circle_outline,
            title: 'Mola Sayısı',
            value: '$_pauseCount kez',
          ),
        ],
      ),
    );
  }

  Widget _buildFeelingSection(void Function(void Function()) setDialogState) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Nasıl Hissettin?',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Bu konudaki anlama seviyeni seçerek yapay zekaya yardımcı ol.',
          style: TextStyle(fontSize: 14, color: Colors.grey),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildFeelingOption(
              emoji: '😕',
              label: 'Zorlandım',
              value: 'confused',
              setDialogState: setDialogState,
            ),
            _buildFeelingOption(
              emoji: '😐',
              label: 'Normaldi',
              value: 'neutral',
              setDialogState: setDialogState,
            ),
            _buildFeelingOption(
              emoji: '😎',
              label: 'Hakimim',
              value: 'confident',
              setDialogState: setDialogState,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildFeelingOption({
    required String emoji,
    required String label,
    required String value,
    required void Function(void Function()) setDialogState,
  }) {
    final isSelected = _userFeeling == value;

    return GestureDetector(
      onTap: () {
        setDialogState(() {
          _userFeeling = value;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.primaryColor.withOpacity(0.1)
              : Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppTheme.primaryColor : Colors.transparent,
            width: 2,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                      color: AppTheme.primaryColor.withOpacity(0.2),
                      blurRadius: 8,
                      offset: const Offset(0, 4))
                ]
              : [],
        ),
        child: Column(
          children: [
            Text(
              emoji,
              style: const TextStyle(fontSize: 32),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected
                    ? AppTheme.primaryColor
                    : Theme.of(context).textTheme.bodyMedium?.color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Theme.of(context).colorScheme.secondary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  void _trackStudySession() async {
    if (_userFeeling == null) return;

    try {
      final studyService = StudyTrackingService();
      final studyDataProvider =
          Provider.of<StudyDataProvider>(context, listen: false);

      final studiedMinutes = ((_totalSeconds - _remainingSeconds) / 60).ceil();

      final result = await studyService.logStudySession(
        durationInMinutes: studiedMinutes,
        subject: widget.taskSubject!,
        topic: widget.taskTopic!,
        isManualEntry: false,
        date: DateTime.now().toIso8601String().split('T')[0],
        additionalData: {
          'pauseCount': _pauseCount,
          'sessionCompletionState': _sessionCompletionState,
          'userFeeling': _userFeeling,
          'taskId': widget.taskId, // Görev ID'sini ekle
        },
      );

      await studyDataProvider.updateAfterStudySession(result);

      // Kısmen tamamlanan görevin ilerlemesini güncelle
      if (widget.taskId != null && studiedMinutes > 0) {
        await _updateTaskProgress(widget.taskId!, studiedMinutes);
      }

      // Reset state for next session
      setState(() {
        _pauseCount = 0;
        _userFeeling = null;
        _sessionCompletionState = 'pending';
      });
    } catch (e) {
      print('Error tracking study session: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content:
                Text('Hata: Çalışma seansı kaydedilemedi. ${e.toString()}')));
      }
    }
  }

  /// Görevin kısmen tamamlanma ilerlemesini günceller
  Future<void> _updateTaskProgress(String taskId, int studiedMinutes) async {
    try {
      // Plan service ile görev ilerlemesini güncelle
      final planService = PlanService();
      await planService.updateTaskProgress(taskId, studiedMinutes);

      print('Görev ilerlemesi güncellendi: $taskId, $studiedMinutes dakika');
    } catch (e) {
      print('Görev ilerlemesi güncellenirken hata: $e');
      // Bu hata kritik değil, ana işlemi etkilemez
    }
  }

  String _formatTime(int seconds) {
    final minutes = seconds ~/ 60;
    final remainingSeconds = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${remainingSeconds.toString().padLeft(2, '0')}';
  }

  double get _progressPercent {
    if (_totalSeconds == 0) return 0.0;
    return (_totalSeconds - _remainingSeconds) / _totalSeconds;
  }

  Color get _progressColor {
    if (_isCompleted) return AppTheme.successColor;
    if (_isRunning) return AppTheme.primaryColor;
    if (_isPaused) return AppTheme.warningColor;
    return AppTheme.accentColor;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: WillPopScope(
        onWillPop: () async {
          if (_isRunning ||
              (_isPaused && _sessionCompletionState == 'pending')) {
            _showExitConfirmationDialog();
            return false; // Prevent back navigation
          }
          return true; // Allow back navigation
        },
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Theme.of(context).colorScheme.surface,
                _progressColor.withOpacity(0.1),
              ],
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                children: [
                  // Header with close button
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        onPressed: () {
                          if (_isRunning ||
                              (_isPaused &&
                                  _sessionCompletionState == 'pending')) {
                            _showExitConfirmationDialog();
                          } else {
                            Navigator.of(context).pop();
                          }
                        },
                        icon: const Icon(Icons.close),
                        iconSize: 28,
                      ),
                      Text(
                        'Odaklanma Seansı',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                      const SizedBox(width: 56), // Balance for close button
                    ],
                  ),

                  const SizedBox(height: 32),

                  // Subject and Topic Card
                  if (_selectedSubject != null && _selectedTopic != null)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      margin: const EdgeInsets.only(bottom: 40),
                      decoration: BoxDecoration(
                        color: Theme.of(context).cardColor,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primaryColor.withOpacity(0.1),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
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
                                  color: AppTheme.primaryColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(
                                  Icons.school,
                                  color: AppTheme.primaryColor,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  _selectedSubject!,
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.primaryColor,
                                      ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppTheme.accentColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(
                                  Icons.topic,
                                  color: AppTheme.accentColor,
                                  size: 18,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  _selectedTopic!,
                                  style: Theme.of(context).textTheme.bodyLarge,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                  const Spacer(),

                  // Main Timer Circle
                  AnimatedBuilder(
                    animation: _pulseAnimation,
                    builder: (context, child) {
                      return Transform.scale(
                        scale: _isRunning ? _scaleAnimation.value : 1.0,
                        child: Container(
                          width: 280,
                          height: 280,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: _progressColor.withOpacity(0.3),
                                blurRadius: _isRunning ? 40 : 20,
                                spreadRadius: _isRunning ? 10 : 5,
                              ),
                            ],
                          ),
                          child: CircularPercentIndicator(
                            radius: 140.0,
                            lineWidth: 8.0,
                            animation: false,
                            percent: _progressPercent,
                            center: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  _formatTime(_remainingSeconds),
                                  style: Theme.of(context)
                                      .textTheme
                                      .displayLarge
                                      ?.copyWith(
                                        fontWeight: FontWeight.w300,
                                        fontSize: 48,
                                        color: _progressColor,
                                      ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _isCompleted
                                      ? 'Tamamlandı!'
                                      : _isRunning
                                          ? 'Odaklan'
                                          : _isPaused
                                              ? 'Duraklatıldı'
                                              : 'Hazır',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyLarge
                                      ?.copyWith(
                                        color: Theme.of(context)
                                            .colorScheme
                                            .onSurface
                                            .withOpacity(0.7),
                                        fontWeight: FontWeight.w500,
                                      ),
                                ),

                                // Show pause count if paused
                                if (_isPaused && _pauseCount > 0)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 8.0),
                                    child: Text(
                                      '$_pauseCount. mola',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.warningColor,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            progressColor: _progressColor,
                            backgroundColor:
                                Theme.of(context).dividerColor.withOpacity(0.2),
                            startAngle: 270.0,
                            circularStrokeCap: CircularStrokeCap.round,
                          ),
                        ),
                      );
                    },
                  ),

                  const Spacer(),

                  // Control Buttons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      // Stop/Reset Button
                      _buildControlButton(
                        onPressed: _isRunning || _isPaused
                            ? _stopTimer
                            : () => Navigator.of(context).pop(),
                        icon: _isRunning || _isPaused
                            ? Icons.stop
                            : Icons.arrow_back,
                        label: _isRunning || _isPaused ? 'Bitir' : 'Geri',
                        color: _isRunning || _isPaused
                            ? AppTheme.errorColor
                            : Theme.of(context).colorScheme.outline,
                        backgroundColor: Theme.of(context).colorScheme.surface,
                      ),

                      // Main Action Button
                      _buildMainActionButton(),

                      // Settings Button or Pause Count
                      _buildControlButton(
                        onPressed: () {
                          // TODO: Add timer settings
                        },
                        icon: Icons.analytics_outlined,
                        label: 'Mola: $_pauseCount',
                        color: AppTheme.accentColor,
                        backgroundColor: Theme.of(context).colorScheme.surface,
                      ),
                    ],
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showExitConfirmationDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Çıkmak İstiyor musunuz?'),
        content: const Text(
          'Çalışma seansından çıkmak üzeresiniz. İlerlemeniz kaydedilmeyecektir.',
          style: TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop(); // Close dialog
            },
            child: const Text('İptal'),
          ),
          FilledButton(
            onPressed: () {
              _timer?.cancel();
              Navigator.of(context).pop(); // Close dialog
              Navigator.of(context).pop(); // Return to previous screen
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
            ),
            child: const Text('Evet, Çık'),
          ),
        ],
      ),
    );
  }

  Widget _buildMainActionButton() {
    String label;
    IconData icon;
    Color color;
    VoidCallback onPressed;

    if (_isCompleted) {
      label = 'Yeniden Başla';
      icon = Icons.replay;
      color = AppTheme.successColor;
      onPressed = () {
        setState(() {
          _isCompleted = false;
          _remainingSeconds = _totalSeconds;
          _pauseCount = 0; // Reset pause count
          _sessionCompletionState = 'pending';
          _sessionStartTime = null;
          _userFeeling = null;
        });
        _progressController.reset();
      };
    } else if (_isRunning) {
      label = 'Duraklat';
      icon = Icons.pause;
      color = AppTheme.warningColor;
      onPressed = _pauseTimer;
    } else if (_isPaused) {
      label = 'Devam Et';
      icon = Icons.play_arrow;
      color = AppTheme.successColor;
      onPressed = _resumeTimer;
    } else {
      label = 'Başla';
      icon = Icons.play_arrow;
      color = AppTheme.primaryColor;
      onPressed = _startTimer;
    }

    return Container(
      width: 120,
      height: 60,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color, color.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.4),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(30),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white, size: 24),
              const SizedBox(height: 4),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildControlButton({
    required VoidCallback onPressed,
    required IconData icon,
    required String label,
    required Color color,
    Color? backgroundColor,
  }) {
    return Container(
      width: 80,
      height: 60,
      decoration: BoxDecoration(
        color: backgroundColor ?? color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: color.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  color: color,
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
