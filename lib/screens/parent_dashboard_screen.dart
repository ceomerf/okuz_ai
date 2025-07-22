import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../services/family_account_service.dart';
import '../services/mock_auth_service.dart';
import '../services/mock_database_service.dart';
import '../models/student_profile.dart';
import '../theme/app_theme.dart';
import 'family_portal_screen.dart';

/// Veli kontrol paneli - öğrencinin akademik sürecini takip etmek için
class ParentDashboardScreen extends StatefulWidget {
  final String profileId;
  final String profileName;

  const ParentDashboardScreen({
    Key? key,
    required this.profileId,
    required this.profileName,
  }) : super(key: key);

  @override
  State<ParentDashboardScreen> createState() => _ParentDashboardScreenState();
}

class _ParentDashboardScreenState extends State<ParentDashboardScreen> {
  Map<String, dynamic>? _dashboardData;
  bool _isLoading = true;
  Stream<Map<String, dynamic>?>? _statusStream;
  Map<String, dynamic>? _weeklyAIReport;
  bool _isLoadingAIReport = false;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
    _setupStatusStream();
    _loadWeeklyAIReport();
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);

    try {
      final familyService = context.read<FamilyAccountService>();
      final data = await familyService.getParentDashboardData(
        profileId: widget.profileId,
      );

      if (mounted) {
        setState(() {
          _dashboardData = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        _showErrorSnackBar('Veriler yüklenemedi: $e');
      }
    }
  }

  void _setupStatusStream() {
    // Mock implementation - gerçek uygulamada real-time stream dinlenecek
    _statusStream = Stream.value(null);
  }

  Future<void> _loadWeeklyAIReport() async {
    setState(() => _isLoadingAIReport = true);

    try {
      final dbService =
          Provider.of<MockDatabaseService>(context, listen: false);
      final result =
          await dbService.callCloudFunction('getWeeklyParentReport', {
        'studentId': widget.profileId,
      });

      if (mounted) {
        setState(() {
          _weeklyAIReport = result;
          _isLoadingAIReport = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingAIReport = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('AI raporu yüklenemedi: $e'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red.shade400,
      ),
    );
  }

  String _formatDuration(int minutes) {
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    if (hours > 0) {
      return '${hours}s ${mins}dk';
    }
    return '${mins}dk';
  }

  String _formatLastSeen(DateTime? lastSeen) {
    if (lastSeen == null) return 'Bilinmiyor';

    final now = DateTime.now();
    final difference = now.difference(lastSeen);

    if (difference.inMinutes < 5) {
      return 'Şu an aktif';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes} dakika önce';
    } else if (difference.inDays < 1) {
      return '${difference.inHours} saat önce';
    } else {
      return '${difference.inDays} gün önce';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('${widget.profileName}\'nin Gelişim Paneli'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          // Portal geri dönüş butonu
          Container(
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: Colors.blue.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: IconButton(
              icon: Icon(
                Icons.home_outlined,
                color: Colors.blue[600],
                size: 20,
              ),
              tooltip: 'Aile Portalına Dön',
              onPressed: () {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(
                    builder: (context) => const FamilyPortalScreen(),
                  ),
                  (route) => false,
                );
              },
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDashboardData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildDashboard(),
    );
  }

  Widget _buildDashboard() {
    if (_dashboardData == null) {
      return const Center(
        child: Text('Veri yüklenemedi'),
      );
    }

    final profile = _dashboardData!['profile'] as Map<String, dynamic>?;
    final gamification =
        _dashboardData!['gamification'] as Map<String, dynamic>?;
    final weeklyStats = _dashboardData!['weeklyStats'] as Map<String, dynamic>?;
    final recentSessions = _dashboardData!['recentSessions'] as List<dynamic>?;

    return RefreshIndicator(
      onRefresh: _loadDashboardData,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // "Şu An Ne Yapıyor?" Kartı - Real-time güncellemeli
            _statusStream != null
                ? StreamBuilder<Map<String, dynamic>?>(
                    stream: _statusStream,
                    builder: (context, snapshot) {
                      final liveProfile =
                          snapshot.hasData ? snapshot.data! : profile ?? {};
                      return _buildCurrentStatusCard(liveProfile);
                    },
                  )
                : _buildCurrentStatusCard(profile),
            const SizedBox(height: 16),

            // Performans Özeti
            _buildPerformanceSummary(gamification, weeklyStats),
            const SizedBox(height: 16),

            // AI'dan Veliye Özel Rapor
            _buildAIReport(),
            const SizedBox(height: 16),

            // Son Tamamlanan Görevler
            if (recentSessions != null && recentSessions.isNotEmpty)
              _buildRecentTasks(recentSessions),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentStatusCard(Map<String, dynamic>? profile) {
    final currentStatus = profile?['currentStatus'] as Map<String, dynamic>?;
    final activity = currentStatus?['activity'] ?? 'inactive';
    final currentTopic = currentStatus?['currentTopic'];
    final lastSeen = currentStatus?['lastSeen'];

    String statusText = '';
    Color statusColor = Colors.grey;
    IconData statusIcon = Icons.circle;

    switch (activity) {
      case 'studying':
        statusText = currentTopic != null
            ? 'Şu an odak modunda: $currentTopic çalışıyor 👏'
            : 'Şu an odak modunda çalışıyor 👏';
        statusColor = Colors.green;
        statusIcon = Icons.school;
        break;
      case 'on_break':
        statusText = 'Kısa bir mola veriyor ☕';
        statusColor = Colors.orange;
        statusIcon = Icons.coffee;
        break;
      case 'inactive':
      default:
        final lastSeenTime =
            lastSeen != null ? DateTime.parse(lastSeen.toString()) : null;
        statusText = 'Şu anda çevrimdışı (${_formatLastSeen(lastSeenTime)})';
        statusColor = Colors.grey;
        statusIcon = Icons.circle_outlined;
        break;
    }

    return Animate(
      effects: const [FadeEffect(duration: Duration(milliseconds: 600))],
      child: Card(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: statusColor.withValues(alpha: 0.3), width: 2),
        ),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
              colors: [
                statusColor.withValues(alpha: 0.05),
                statusColor.withValues(alpha: 0.02),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: statusColor.withValues(alpha: 0.2),
                ),
                child: Icon(
                  statusIcon,
                  color: statusColor,
                  size: 30,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Şu An Ne Yapıyor?',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.getPrimaryTextColor(context),
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      statusText,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: statusColor,
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPerformanceSummary(
    Map<String, dynamic>? gamification,
    Map<String, dynamic>? weeklyStats,
  ) {
    final xp = gamification?['xp'] ?? 0;
    final level = gamification?['level'] ?? 1;
    final streak = gamification?['streak'] ?? 0;
    final totalStudyTime = weeklyStats?['totalStudyTime'] ?? 0;
    final sessionsCount = weeklyStats?['sessionsCount'] ?? 0;

    return Animate(
      delay: const Duration(milliseconds: 200),
      effects: const [
        FadeEffect(duration: Duration(milliseconds: 600)),
        SlideEffect(begin: Offset(0, 0.2), end: Offset.zero),
      ],
      child: Card(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Theme.of(context).dividerColor),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.trending_up,
                    color: AppTheme.primaryColor,
                    size: 24,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Performans Özeti',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppTheme.getPrimaryTextColor(context),
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Metrikler grid'i
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 1.5,
                children: [
                  _buildMetricCard(
                    'Toplam XP',
                    xp.toString(),
                    Icons.star,
                    Colors.amber,
                  ),
                  _buildMetricCard(
                    'Level',
                    level.toString(),
                    Icons.emoji_events,
                    Colors.purple,
                  ),
                  _buildMetricCard(
                    'Çalışma Serisi',
                    '$streak gün',
                    Icons.local_fire_department,
                    Colors.orange,
                  ),
                  _buildMetricCard(
                    'Bu Hafta',
                    _formatDuration(totalStudyTime),
                    Icons.schedule,
                    Colors.green,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard(
      String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: color.withValues(alpha: 0.1),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.getSecondaryTextColor(context),
                ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildAIReport() {
    return Animate(
      delay: const Duration(milliseconds: 400),
      effects: const [
        FadeEffect(duration: Duration(milliseconds: 600)),
        SlideEffect(begin: Offset(0, 0.2), end: Offset.zero),
      ],
      child: Card(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
              color: AppTheme.primaryColor.withValues(alpha: 0.3), width: 1),
        ),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
              colors: [
                AppTheme.primaryColor.withValues(alpha: 0.05),
                AppTheme.primaryColor.withValues(alpha: 0.02),
              ],
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
                      shape: BoxShape.circle,
                      color: AppTheme.primaryColor.withValues(alpha: 0.2),
                    ),
                    child: Icon(
                      Icons.psychology,
                      color: AppTheme.primaryColor,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'AI\'dan Veliye Özel Rapor',
                      style: GoogleFonts.poppins(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textColor,
                      ),
                    ),
                  ),
                  if (_isLoadingAIReport)
                    const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              if (_isLoadingAIReport)
                Container(
                  height: 100,
                  alignment: Alignment.center,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const CircularProgressIndicator(),
                      const SizedBox(height: 12),
                      Text(
                        'AI raporu hazırlanıyor...',
                        style: GoogleFonts.poppins(
                          color: AppTheme.textColor.withValues(alpha: 0.7),
                        ),
                      ),
                    ],
                  ),
                )
              else if (_weeklyAIReport != null) ...[
                // AI Raporu Başarıyla Yüklendi
                _buildAIReportContent(_weeklyAIReport!),
              ] else ...[
                // Hata durumu veya veri yok
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    color: Colors.orange.withValues(alpha: 0.1),
                    border:
                        Border.all(color: Colors.orange.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, color: Colors.orange, size: 20),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'AI raporu henüz hazırlanamadı. Lütfen daha sonra tekrar deneyin.',
                          style: GoogleFonts.poppins(
                            color: Colors.orange[700],
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: _loadWeeklyAIReport,
                  icon: const Icon(Icons.refresh, size: 18),
                  label: const Text('Raporu Yenile'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAIReportContent(Map<String, dynamic> reportData) {
    final aiReport = reportData['aiReport'] as Map<String, dynamic>?;
    final studentName =
        reportData['studentName'] as String? ?? widget.profileName;
    final weekPeriod = reportData['weekPeriod'] as Map<String, dynamic>?;

    if (aiReport == null) {
      return Text(
        'Rapor verileri bulunamadı.',
        style: GoogleFonts.poppins(
            color: AppTheme.textColor.withValues(alpha: 0.7)),
      );
    }

    final summary = aiReport['summary'] as String? ?? '';
    final achievements = aiReport['achievements'] as String? ?? '';
    final concerns = aiReport['concerns'] as String? ?? '';
    final recommendations = aiReport['recommendations'] as String? ?? '';
    final motivationalMessage =
        aiReport['motivationalMessage'] as String? ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Özet
        if (summary.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              color: Colors.blue.withValues(alpha: 0.1),
            ),
            child: Text(
              summary,
              style: GoogleFonts.poppins(
                fontSize: 15,
                fontWeight: FontWeight.w500,
                color: AppTheme.textColor,
                height: 1.4,
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Başarılar
        if (achievements.isNotEmpty) ...[
          _buildReportSection(
            'Bu Haftaki Başarılar',
            achievements,
            Icons.celebration,
            Colors.green,
          ),
          const SizedBox(height: 12),
        ],

        // Dikkat edilmesi gereken alanlar
        if (concerns.isNotEmpty) ...[
          _buildReportSection(
            'Dikkat Edilmesi Gereken Alanlar',
            concerns,
            Icons.lightbulb_outline,
            Colors.orange,
          ),
          const SizedBox(height: 12),
        ],

        // Öneriler
        if (recommendations.isNotEmpty) ...[
          _buildReportSection(
            'Öneriler',
            recommendations,
            Icons.tips_and_updates,
            Colors.purple,
          ),
          const SizedBox(height: 12),
        ],

        // Motivasyonel mesaj
        if (motivationalMessage.isNotEmpty) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              gradient: LinearGradient(
                colors: [
                  AppTheme.primaryColor.withValues(alpha: 0.1),
                  AppTheme.primaryColor.withValues(alpha: 0.05),
                ],
              ),
              border: Border.all(
                  color: AppTheme.primaryColor.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                Icon(Icons.favorite, color: AppTheme.primaryColor, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    motivationalMessage,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppTheme.primaryColor,
                      height: 1.3,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Rapor tarihi
        if (weekPeriod != null) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              color: AppTheme.textColor.withValues(alpha: 0.1),
            ),
            child: Text(
              'Haftalık rapor • ${_formatWeekPeriod(weekPeriod)}',
              style: GoogleFonts.poppins(
                fontSize: 12,
                color: AppTheme.textColor.withValues(alpha: 0.7),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildReportSection(
      String title, String content, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: color.withValues(alpha: 0.1),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 18),
              const SizedBox(width: 8),
              Text(
                title,
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            content,
            style: GoogleFonts.poppins(
              fontSize: 14,
              color: AppTheme.textColor,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  String _formatWeekPeriod(Map<String, dynamic> weekPeriod) {
    try {
      final start = DateTime.parse(weekPeriod['start']);
      final end = DateTime.parse(weekPeriod['end']);
      final formatter = DateFormat('d MMM', 'tr_TR');
      return '${formatter.format(start)} - ${formatter.format(end)}';
    } catch (e) {
      return 'Bu hafta';
    }
  }

  Widget _buildRecentTasks(List<dynamic> recentSessions) {
    return Animate(
      delay: const Duration(milliseconds: 600),
      effects: const [
        FadeEffect(duration: Duration(milliseconds: 600)),
        SlideEffect(begin: Offset(0, 0.2), end: Offset.zero),
      ],
      child: Card(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Theme.of(context).dividerColor),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.check_circle_outline,
                    color: AppTheme.primaryColor,
                    size: 24,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Son Tamamlanan Görevler',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppTheme.getPrimaryTextColor(context),
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount:
                    recentSessions.length > 5 ? 5 : recentSessions.length,
                separatorBuilder: (context, index) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final session = recentSessions[index] as Map<String, dynamic>;
                  return _buildTaskItem(session);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTaskItem(Map<String, dynamic> session) {
    final subject = session['subject'] ?? 'Bilinmeyen';
    final topic = session['topic'] ?? 'Bilinmeyen';
    final duration = session['duration'] ?? 0;
    final timestamp = session['timestamp'];

    String timeAgo = 'Bilinmiyor';
    if (timestamp != null) {
      try {
        final sessionTime = DateTime.parse(timestamp.toString());
        final difference = DateTime.now().difference(sessionTime);
        if (difference.inDays > 0) {
          timeAgo = '${difference.inDays} gün önce';
        } else if (difference.inHours > 0) {
          timeAgo = '${difference.inHours} saat önce';
        } else {
          timeAgo = '${difference.inMinutes} dakika önce';
        }
      } catch (e) {
        // Timestamp parsing hatası
      }
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: Theme.of(context).cardColor,
        border: Border.all(
            color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
            ),
            child: Icon(
              Icons.book_outlined,
              color: AppTheme.primaryColor,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$subject - $topic',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${_formatDuration(duration)} • $timeAgo',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.getSecondaryTextColor(context),
                      ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.check_circle,
            color: Colors.green,
            size: 20,
          ),
        ],
      ),
    );
  }
}
