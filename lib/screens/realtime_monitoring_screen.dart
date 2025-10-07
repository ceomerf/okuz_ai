import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'dart:async';
import '../theme/app_theme.dart';
import '../models/student_profile.dart';
import '../services/mock_database_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Öğrencinin anlık aktivitelerini izlemek için real-time monitoring paneli
class RealtimeMonitoringScreen extends ConsumerStatefulWidget {
  final String profileId;
  final String profileName;

  const RealtimeMonitoringScreen({
    Key? key,
    required this.profileId,
    required this.profileName,
  }) : super(key: key);

  @override
  ConsumerState<RealtimeMonitoringScreen> createState() =>
      _RealtimeMonitoringScreenState();
}

class _RealtimeMonitoringScreenState extends ConsumerState<RealtimeMonitoringScreen> {
  Map<String, dynamic>? _currentStatus;
  List<Map<String, dynamic>> _todayActivities = [];
  List<Map<String, dynamic>> _performanceMetrics = [];
  List<Map<String, dynamic>> _alerts = [];
  bool _isLoading = true;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _loadMockData();
    _startAutoRefresh();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  void _startAutoRefresh() {
    _refreshTimer = Timer.periodic(Duration(seconds: 30), (timer) {
      if (mounted) {
        _loadMockData();
      }
    });
  }

  Future<void> _loadMockData() async {
    setState(() => _isLoading = true);

    // Mock veri yükle
    await Future.delayed(Duration(milliseconds: 500));

    setState(() {
      _currentStatus = {
        'activity': 'Çalışıyor',
        'currentTopic': 'Matematik - Türev',
        'lastSeen': DateTime.now(),
        'isOnline': true,
      };

      _todayActivities = [
        {
          'subject': 'Matematik',
          'topic': 'Türev',
          'duration': 45,
          'timestamp': DateTime.now().subtract(Duration(minutes: 30)),
          'type': 'study',
          'difficulty': 'Orta',
          'score': 85,
        },
        {
          'subject': 'Fizik',
          'topic': 'Mekanik',
          'duration': 30,
          'timestamp': DateTime.now().subtract(Duration(hours: 2)),
          'type': 'study',
          'difficulty': 'Zor',
          'score': 72,
        },
        {
          'subject': 'Mola',
          'topic': 'Kısa mola',
          'duration': 10,
          'timestamp': DateTime.now().subtract(Duration(hours: 1)),
          'type': 'break',
        },
      ];

      _performanceMetrics = [
        {
          'metric': 'Konsantrasyon',
          'value': 85,
          'trend': 'up',
          'color': Colors.green,
        },
        {
          'metric': 'Hız',
          'value': 72,
          'trend': 'down',
          'color': Colors.orange,
        },
        {
          'metric': 'Doğruluk',
          'value': 91,
          'trend': 'up',
          'color': Colors.blue,
        },
      ];

      _alerts = [
        {
          'type': 'warning',
          'message': 'Konsantrasyon düşüyor, mola öneriliyor',
          'timestamp': DateTime.now().subtract(Duration(minutes: 15)),
          'severity': 'medium',
        },
        {
          'type': 'success',
          'message': 'Matematik konusunda başarılı ilerleme',
          'timestamp': DateTime.now().subtract(Duration(minutes: 5)),
          'severity': 'low',
        },
      ];
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('${widget.profileName} - Anlık İzleme'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: Colors.green.withAlpha(26),
              borderRadius: BorderRadius.circular(12),
            ),
            child: IconButton(
              icon: Icon(
                Icons.refresh,
                color: Colors.green[600],
                size: 20,
              ),
              tooltip: 'Yenile',
              onPressed: _loadMockData,
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Anlık Durum Kartı
                  _buildCurrentStatusCard(),
                  const SizedBox(height: 16),

                  // Bugünkü Aktivite Özeti
                  _buildTodaysSummary(),
                  const SizedBox(height: 16),

                  // Performans Metrikleri
                  _buildPerformanceMetrics(),
                  const SizedBox(height: 16),

                  // Uyarılar ve Bildirimler
                  _buildAlertsSection(),
                  const SizedBox(height: 16),

                  // Anlık Aktivite Akışı
                  _buildActivityFeed(),
                ],
              ),
            ),
    );
  }

  Widget _buildCurrentStatusCard() {
    if (_currentStatus == null) return const SizedBox.shrink();

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color:
                        _currentStatus!['isOnline'] ? Colors.green : Colors.red,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  _currentStatus!['isOnline'] ? 'Çevrimiçi' : 'Çevrimdışı',
                  style: TextStyle(
                    color:
                        _currentStatus!['isOnline'] ? Colors.green : Colors.red,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                Text(
                  'Son görülme: ${DateFormat('HH:mm').format(_currentStatus!['lastSeen'])}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'Şu an: ${_currentStatus!['activity']}',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            if (_currentStatus!['currentTopic'] != null) ...[
              const SizedBox(height: 8),
              Text(
                _currentStatus!['currentTopic'],
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.getSecondaryTextColor(context),
                    ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTodaysSummary() {
    final totalStudyTime = _todayActivities
        .where((activity) => activity['type'] == 'study')
        .fold<int>(0, (sum, activity) => sum + (activity['duration'] as int));

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bugünkü Özet',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _buildSummaryItem(
                  'Toplam Çalışma',
                  '$totalStudyTime dk',
                  Icons.school,
                  Colors.blue,
                ),
                const SizedBox(width: 16),
                _buildSummaryItem(
                  'Aktivite Sayısı',
                  '${_todayActivities.length}',
                  Icons.timeline,
                  Colors.green,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryItem(
      String title, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withAlpha(26),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
            ),
            Text(
              title,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityFeed() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Aktivite Akışı',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            if (_todayActivities.isEmpty)
              const Center(
                child: Text('Henüz aktivite yok'),
              )
            else
              ..._todayActivities
                  .map((activity) => _buildActivityItem(activity)),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityItem(Map<String, dynamic> activity) {
    final isStudy = activity['type'] == 'study';
    final icon = isStudy ? Icons.school : Icons.coffee;
    final color = isStudy ? Colors.blue : Colors.orange;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withAlpha(26),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  activity['subject'],
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                Text(
                  activity['topic'],
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.getSecondaryTextColor(context),
                      ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${activity['duration']} dk',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              Text(
                DateFormat('HH:mm').format(activity['timestamp']),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPerformanceMetrics() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Performans Metrikleri',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            ..._performanceMetrics.map((metric) => _buildMetricItem(metric)),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricItem(Map<String, dynamic> metric) {
    final trendIcon = metric['trend'] == 'up' ? Icons.trending_up : Icons.trending_down;
    final trendColor = metric['trend'] == 'up' ? Colors.green : Colors.red;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: metric['color'].withAlpha(26),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.analytics, color: metric['color'], size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  metric['metric'],
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                Text(
                  '${metric['value']}%',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.getSecondaryTextColor(context),
                      ),
                ),
              ],
            ),
          ),
          Row(
            children: [
              Icon(trendIcon, color: trendColor, size: 16),
              const SizedBox(width: 4),
              Text(
                '${metric['value']}%',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: metric['color'],
                    ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAlertsSection() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Uyarılar ve Bildirimler',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.red.withAlpha(26),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_alerts.length}',
                    style: TextStyle(
                      color: Colors.red[600],
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_alerts.isEmpty)
              const Center(
                child: Text('Henüz uyarı yok'),
              )
            else
              ..._alerts.map((alert) => _buildAlertItem(alert)),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertItem(Map<String, dynamic> alert) {
    final alertColor = alert['type'] == 'warning' ? Colors.orange : Colors.green;
    final alertIcon = alert['type'] == 'warning' ? Icons.warning : Icons.check_circle;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: alertColor.withAlpha(26),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(alertIcon, color: alertColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  alert['message'],
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w500,
                      ),
                ),
                Text(
                  DateFormat('HH:mm').format(alert['timestamp']),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.getSecondaryTextColor(context),
                      ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: alertColor.withAlpha(26),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              alert['severity'].toUpperCase(),
              style: TextStyle(
                color: alertColor,
                fontWeight: FontWeight.bold,
                fontSize: 10,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
