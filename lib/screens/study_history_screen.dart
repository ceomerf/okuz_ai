import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../services/study_tracking_service.dart';

class StudyHistoryScreen extends StatefulWidget {
  const StudyHistoryScreen({super.key});

  @override
  State<StudyHistoryScreen> createState() => _StudyHistoryScreenState();
}

class _StudyHistoryScreenState extends State<StudyHistoryScreen>
    with TickerProviderStateMixin {
  late final StudyTrackingService _studyTrackingService;

  late TabController _tabController;
  late AnimationController _animationController;
  late Animation<double> _slideAnimation;

  // Selected date for filtering
  DateTime _selectedDate = DateTime.now();

  // Chart data
  List<Map<String, dynamic>> _weeklyData = [];
  List<Map<String, dynamic>> _topSubjects = [];
  Map<String, dynamic> _stats = {};

  @override
  void initState() {
    super.initState();

    // Services'i güvenli şekilde initialize et
    try {
      _studyTrackingService = StudyTrackingService();
    } catch (e) {
      print('StudyHistoryScreen: Service initialization hatası: $e');
      // Fallback service oluştur (error handling için)
      _studyTrackingService = StudyTrackingService();
    }

    _tabController = TabController(length: 3, vsync: this);
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _slideAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutBack,
    ));

    _animationController.forward();

    // Veriler güvenli şekilde yüklensin
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final topSubjects = await _studyTrackingService.getTopSubjects(limit: 5);
      setState(() {
        _topSubjects = topSubjects;
      });
    } catch (e) {
      _showErrorSnackBar('Veriler yüklenirken hata oluştu: $e');
    }
  }

  void _showErrorSnackBar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: AppTheme.errorColor,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
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

  String _getFormattedDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final selectedDay = DateTime(date.year, date.month, date.day);

    if (selectedDay == today) {
      return 'Bugün';
    } else if (selectedDay == yesterday) {
      return 'Dün';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }

  String _formatDuration(int minutes) {
    if (minutes < 60) {
      return '${minutes}dk';
    } else {
      final hours = minutes ~/ 60;
      final remainingMinutes = minutes % 60;
      if (remainingMinutes == 0) {
        return '${hours}sa';
      } else {
        return '${hours}sa ${remainingMinutes}dk';
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Çalışma Geçmişi'),
        centerTitle: true,
        elevation: 0,
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
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
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Günlük', icon: Icon(Icons.today)),
            Tab(text: 'İstatistik', icon: Icon(Icons.bar_chart)),
            Tab(text: 'Dersler', icon: Icon(Icons.pie_chart)),
          ],
        ),
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
                    AppTheme.primaryLightColor.withOpacity(0.1),
                  ],
          ),
        ),
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildDailyTab(),
            _buildStatsTab(),
            _buildSubjectsTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildDailyTab() {
    return AnimatedBuilder(
      animation: _slideAnimation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, 50 * (1 - _slideAnimation.value)),
          child: Opacity(
            opacity: _slideAnimation.value,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Date Selector
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  child: GestureDetector(
                    onTap: _selectDate,
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Theme.of(context).cardColor,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              Icons.calendar_today,
                              color: AppTheme.primaryColor,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Seçilen Tarih',
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
                                  _getFormattedDate(_selectedDate),
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(
                                        fontWeight: FontWeight.bold,
                                      ),
                                ),
                              ],
                            ),
                          ),
                          Icon(
                            Icons.arrow_drop_down,
                            color: Theme.of(context).textTheme.bodyLarge?.color,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Daily Sessions List
                StreamBuilder<List<Map<String, dynamic>>>(
                  stream: _studyTrackingService.getDailyStudyLogs(
                    _selectedDate.toIso8601String().split('T')[0],
                  ),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(
                        child: CircularProgressIndicator(),
                      );
                    }

                    if (snapshot.hasError) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.error_outline,
                              size: 64,
                              color: AppTheme.errorColor,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Hata: ${snapshot.error}',
                              style: Theme.of(context).textTheme.bodyLarge,
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      );
                    }

                    final sessions = snapshot.data ?? [];

                    if (sessions.isEmpty) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.history_edu,
                              size: 64,
                              color: Theme.of(context)
                                  .textTheme
                                  .bodyLarge
                                  ?.color
                                  ?.withOpacity(0.5),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Bu tarihte çalışma kaydı bulunamadı',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyLarge
                                  ?.copyWith(
                                    color: Theme.of(context)
                                        .textTheme
                                        .bodyLarge
                                        ?.color
                                        ?.withOpacity(0.7),
                                  ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Odak Modu veya Manuel Kayıt ile çalışma seansları oluşturun',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: Theme.of(context)
                                        .textTheme
                                        .bodySmall
                                        ?.color
                                        ?.withOpacity(0.5),
                                  ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      );
                    }

                    return Column(
                      children: sessions
                          .map((session) => _buildSessionCard(session))
                          .toList(),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSessionCard(Map<String, dynamic> session) {
    final isManual = session['isManualEntry'] ?? false;
    final duration = session['durationInMinutes'] ?? 0;
    final xpGained = session['xpGained'] ?? 0;
    final timestamp = session['timestamp'] ?? 0;
    final sessionTime = DateTime.fromMillisecondsSinceEpoch(timestamp);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(
          color: isManual
              ? AppTheme.warningColor.withOpacity(0.3)
              : AppTheme.primaryColor.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isManual
                      ? AppTheme.warningColor.withOpacity(0.1)
                      : AppTheme.primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  isManual ? Icons.edit : Icons.timer,
                  color:
                      isManual ? AppTheme.warningColor : AppTheme.primaryColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      session['subject'] ?? 'Bilinmeyen Ders',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    Text(
                      session['topic'] ?? 'Bilinmeyen Konu',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
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
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${sessionTime.hour.toString().padLeft(2, '0')}:${sessionTime.minute.toString().padLeft(2, '0')}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.color
                              ?.withOpacity(0.7),
                        ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isManual
                          ? AppTheme.warningColor.withOpacity(0.1)
                          : AppTheme.primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      isManual ? 'Manuel' : 'Otomatik',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: isManual
                                ? AppTheme.warningColor
                                : AppTheme.primaryColor,
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.successColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.access_time,
                        color: AppTheme.successColor,
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _formatDuration(duration),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: AppTheme.successColor,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.accentColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.star,
                        color: AppTheme.accentColor,
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '+$xpGained XP',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: AppTheme.accentColor,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatsTab() {
    return StreamBuilder<Map<String, dynamic>>(
      stream: _studyTrackingService.getWeeklyStatsStream(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        // Hata durumunu kontrol et
        if (snapshot.hasError) {
          print('StudyHistoryScreen: Stats yükleme hatası: ${snapshot.error}');
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.grey),
                const SizedBox(height: 16),
                const Text(
                  'İstatistikler yüklenirken hata oluştu',
                  style: TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => setState(() {}),
                  child: const Text('Tekrar Dene'),
                ),
              ],
            ),
          );
        }

        // Veri güvenli şekilde parse et
        final stats = snapshot.data ?? <String, dynamic>{};
        final totalMinutes = (stats['totalStudyTimeMinutes'] is num)
            ? (stats['totalStudyTimeMinutes'] as num).toInt()
            : 0;
        final weeklyMinutes = (stats['weeklyStudyTimeMinutes'] is num)
            ? (stats['weeklyStudyTimeMinutes'] as num).toInt()
            : 0;
        final monthlyMinutes = (stats['monthlyStudyTimeMinutes'] is num)
            ? (stats['monthlyStudyTimeMinutes'] as num).toInt()
            : 0;

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildStatCard(
              title: 'Toplam Çalışma',
              value: _formatDuration(totalMinutes),
              icon: Icons.schedule,
              color: AppTheme.primaryColor,
            ),
            const SizedBox(height: 16),
            _buildStatCard(
              title: 'Bu Hafta',
              value: _formatDuration(weeklyMinutes),
              icon: Icons.date_range,
              color: AppTheme.successColor,
            ),
            const SizedBox(height: 16),
            _buildStatCard(
              title: 'Bu Ay',
              value: _formatDuration(monthlyMinutes),
              icon: Icons.calendar_month,
              color: AppTheme.accentColor,
            ),
          ],
        );
      },
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: color,
              size: 32,
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Theme.of(context)
                            .textTheme
                            .bodyLarge
                            ?.color
                            ?.withOpacity(0.7),
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: color,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubjectsTab() {
    return StreamBuilder<Map<String, dynamic>>(
      stream: _studyTrackingService.getSubjectBreakdown(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final subjectBreakdown = snapshot.data ?? {};

        if (subjectBreakdown.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.school,
                  size: 64,
                  color: Theme.of(context)
                      .textTheme
                      .bodyLarge
                      ?.color
                      ?.withOpacity(0.5),
                ),
                const SizedBox(height: 16),
                Text(
                  'Henüz çalışma kaydı bulunmuyor',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Theme.of(context)
                            .textTheme
                            .bodyLarge
                            ?.color
                            ?.withOpacity(0.7),
                      ),
                ),
              ],
            ),
          );
        }

        final sortedSubjects = subjectBreakdown.entries.toList()
          ..sort((a, b) => (b.value as int).compareTo(a.value as int));

        final totalMinutes = subjectBreakdown.values
            .fold<int>(0, (sum, minutes) => sum + (minutes as int));

        return ListView(
          padding: const EdgeInsets.all(16),
          children: sortedSubjects.map((entry) {
            final subject = entry.key;
            final minutes = entry.value as int;
            final percentage =
                totalMinutes > 0 ? (minutes / totalMinutes * 100) : 0.0;

            return _buildSubjectCard(subject, minutes, percentage);
          }).toList(),
        );
      },
    );
  }

  Widget _buildSubjectCard(String subject, int minutes, double percentage) {
    // Her ders için farklı renk
    final colors = [
      AppTheme.primaryColor,
      AppTheme.successColor,
      AppTheme.warningColor,
      AppTheme.infoColor,
      AppTheme.accentColor,
      AppTheme.primaryDarkColor,
    ];
    final colorIndex = subject.hashCode % colors.length;
    final color = colors[colorIndex.abs()];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.1),
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
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.subject,
                  color: color,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  subject,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    _formatDuration(minutes),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: color,
                        ),
                  ),
                  Text(
                    '%${percentage.toStringAsFixed(1)}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.color
                              ?.withOpacity(0.7),
                        ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            height: 8,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: percentage / 100,
              child: Container(
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
