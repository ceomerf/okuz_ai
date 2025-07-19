import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../models/student_profile.dart';

/// Öğrencinin anlık aktivitelerini izlemek için real-time monitoring paneli
class RealtimeMonitoringScreen extends StatefulWidget {
  final String profileId;
  final String profileName;

  const RealtimeMonitoringScreen({
    Key? key,
    required this.profileId,
    required this.profileName,
  }) : super(key: key);

  @override
  State<RealtimeMonitoringScreen> createState() =>
      _RealtimeMonitoringScreenState();
}

class _RealtimeMonitoringScreenState extends State<RealtimeMonitoringScreen> {
  Stream<DocumentSnapshot>? _statusStream;
  Stream<QuerySnapshot>? _todayActivitiesStream;

  @override
  void initState() {
    super.initState();
    _setupStreams();
  }

  void _setupStreams() {
    // Real-time status stream
    _statusStream =
        FirebaseFirestore.instance.doc('users/${widget.profileId}').snapshots();

    // Bugünkü aktiviteler stream
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    _todayActivitiesStream = FirebaseFirestore.instance
        .collection('users/${widget.profileId}/analytics/daily_logs/sessions')
        .where('date', isEqualTo: today)
        .orderBy('timestamp', descending: true)
        .snapshots();
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
              color: Colors.green.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: IconButton(
              icon: Icon(
                Icons.refresh,
                color: Colors.green[600],
                size: 20,
              ),
              tooltip: 'Yenile',
              onPressed: () {
                setState(() {
                  _setupStreams();
                });
              },
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
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

            // Anlık Aktivite Akışı
            _buildActivityFeed(),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentStatusCard() {
    return StreamBuilder<DocumentSnapshot>(
      stream: _statusStream,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return _buildLoadingCard('Durum yükleniyor...');
        }

        final data = snapshot.data?.data() as Map<String, dynamic>?;
        final currentStatus = data?['currentStatus'] as Map<String, dynamic>?;
        final activity = currentStatus?['activity'] ?? 'inactive';
        final currentTopic = currentStatus?['currentTopic'];
        final lastSeen = currentStatus?['lastSeen'];
        final focusMode = currentStatus?['focusMode'] ?? false;

        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: _getStatusColors(activity),
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: _getStatusColors(activity)[0].withOpacity(0.3),
                blurRadius: 15,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withOpacity(0.2),
                    ),
                    child: Icon(
                      _getStatusIcon(activity),
                      color: Colors.white,
                      size: 30,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Şu Anki Durum',
                          style: GoogleFonts.figtree(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                            color: Colors.white.withOpacity(0.9),
                          ),
                        ),
                        Text(
                          _getStatusText(activity, currentTopic, focusMode),
                          style: GoogleFonts.figtree(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Live indicator
                  if (activity != 'inactive')
                    Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white,
                      ),
                    )
                        .animate(onPlay: (controller) => controller.repeat())
                        .scale(
                            begin: const Offset(0.8, 0.8),
                            end: const Offset(1.2, 1.2))
                        .then(delay: 500.ms)
                        .scale(
                            begin: const Offset(1.2, 1.2),
                            end: const Offset(0.8, 0.8)),
                ],
              ),
              const SizedBox(height: 16),
              if (currentTopic != null) ...[
                Text(
                  'Çalışılan Konu',
                  style: GoogleFonts.figtree(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Colors.white.withOpacity(0.8),
                  ),
                ),
                Text(
                  currentTopic,
                  style: GoogleFonts.figtree(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
              ],
              Row(
                children: [
                  Icon(
                    Icons.access_time,
                    color: Colors.white.withOpacity(0.8),
                    size: 16,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _formatLastSeen(lastSeen),
                    style: GoogleFonts.figtree(
                      fontSize: 14,
                      color: Colors.white.withOpacity(0.8),
                    ),
                  ),
                  if (focusMode) ...[
                    const SizedBox(width: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.psychology,
                            color: Colors.white,
                            size: 14,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Odak Modu',
                            style: GoogleFonts.figtree(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.3, end: 0);
      },
    );
  }

  Widget _buildTodaysSummary() {
    return StreamBuilder<QuerySnapshot>(
      stream: _todayActivitiesStream,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return _buildLoadingCard('Bugünkü özet yükleniyor...');
        }

        final activities = snapshot.data!.docs;
        final totalMinutes = activities.fold<int>(0, (sum, doc) {
          final data = doc.data() as Map<String, dynamic>;
          return sum + (data['duration'] as int? ?? 0);
        });

        final sessionCount = activities.length;
        final subjects = activities
            .map((doc) =>
                (doc.data() as Map<String, dynamic>)['subject'] as String?)
            .where((subject) => subject != null)
            .toSet()
            .length;

        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.today,
                    color: AppTheme.primaryColor,
                    size: 24,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Bugünkü Özet',
                    style: GoogleFonts.figtree(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).textTheme.bodyLarge?.color,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildSummaryItem(
                      'Toplam Süre',
                      _formatDuration(totalMinutes),
                      Icons.schedule,
                      Colors.blue,
                    ),
                  ),
                  Expanded(
                    child: _buildSummaryItem(
                      'Oturum',
                      sessionCount.toString(),
                      Icons.play_arrow,
                      Colors.green,
                    ),
                  ),
                  Expanded(
                    child: _buildSummaryItem(
                      'Ders',
                      subjects.toString(),
                      Icons.book,
                      Colors.orange,
                    ),
                  ),
                ],
              ),
            ],
          ),
        )
            .animate()
            .fadeIn(delay: 200.ms, duration: 600.ms)
            .slideY(begin: 0.3, end: 0);
      },
    );
  }

  Widget _buildSummaryItem(
      String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: color,
            size: 24,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: GoogleFonts.figtree(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.figtree(
            fontSize: 12,
            color: Theme.of(context).textTheme.bodyMedium?.color,
          ),
        ),
      ],
    );
  }

  Widget _buildActivityFeed() {
    return StreamBuilder<QuerySnapshot>(
      stream: _todayActivitiesStream,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return _buildLoadingCard('Aktiviteler yükleniyor...');
        }

        final activities = snapshot.data!.docs;

        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.timeline,
                    color: AppTheme.primaryColor,
                    size: 24,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Bugünkü Aktiviteler',
                    style: GoogleFonts.figtree(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).textTheme.bodyLarge?.color,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${activities.length} aktivite',
                      style: GoogleFonts.figtree(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (activities.isEmpty)
                Center(
                  child: Column(
                    children: [
                      Icon(
                        Icons.hourglass_empty,
                        size: 48,
                        color: Colors.grey.withOpacity(0.5),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Bugün henüz aktivite yok',
                        style: GoogleFonts.figtree(
                          fontSize: 16,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: activities.length > 10 ? 10 : activities.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final activity =
                        activities[index].data() as Map<String, dynamic>;
                    return _buildActivityItem(activity, index);
                  },
                ),
            ],
          ),
        )
            .animate()
            .fadeIn(delay: 400.ms, duration: 600.ms)
            .slideY(begin: 0.3, end: 0);
      },
    );
  }

  Widget _buildActivityItem(Map<String, dynamic> activity, int index) {
    final subject = activity['subject'] ?? 'Bilinmeyen';
    final topic = activity['topic'] ?? 'Konu belirtilmemiş';
    final duration = activity['duration'] ?? 0;
    final timestamp = activity['timestamp'];
    final type = activity['type'] ?? 'study';

    final color = _getSubjectColor(subject);
    final icon = _getActivityIcon(type);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              color: color,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  topic,
                  style: GoogleFonts.figtree(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).textTheme.bodyLarge?.color,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(
                      subject,
                      style: GoogleFonts.figtree(
                        fontSize: 12,
                        color: color,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '•',
                      style: GoogleFonts.figtree(
                        fontSize: 12,
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _formatDuration(duration),
                      style: GoogleFonts.figtree(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _formatTime(timestamp),
                style: GoogleFonts.figtree(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Theme.of(context).textTheme.bodyMedium?.color,
                ),
              ),
              const SizedBox(height: 2),
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: color,
                ),
              ),
            ],
          ),
        ],
      ),
    )
        .animate(delay: (index * 100).ms)
        .fadeIn(duration: 500.ms)
        .slideX(begin: 0.3, end: 0);
  }

  Widget _buildLoadingCard(String message) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              color: AppTheme.primaryColor,
              strokeWidth: 2,
            ),
          ),
          const SizedBox(width: 16),
          Text(
            message,
            style: GoogleFonts.figtree(
              fontSize: 16,
              color: Theme.of(context).textTheme.bodyMedium?.color,
            ),
          ),
        ],
      ),
    );
  }

  // Helper functions
  List<Color> _getStatusColors(String activity) {
    switch (activity) {
      case 'studying':
        return [Colors.green[400]!, Colors.green[600]!];
      case 'on_break':
        return [Colors.orange[400]!, Colors.orange[600]!];
      case 'planning':
        return [Colors.blue[400]!, Colors.blue[600]!];
      default:
        return [Colors.grey[400]!, Colors.grey[600]!];
    }
  }

  IconData _getStatusIcon(String activity) {
    switch (activity) {
      case 'studying':
        return Icons.school;
      case 'on_break':
        return Icons.coffee;
      case 'planning':
        return Icons.event_note;
      default:
        return Icons.circle_outlined;
    }
  }

  String _getStatusText(String activity, String? currentTopic, bool focusMode) {
    switch (activity) {
      case 'studying':
        if (focusMode) {
          return 'Odak Modunda Çalışıyor';
        }
        return 'Çalışıyor';
      case 'on_break':
        return 'Mola Veriyor';
      case 'planning':
        return 'Plan Yapıyor';
      default:
        return 'Çevrimdışı';
    }
  }

  Color _getSubjectColor(String subject) {
    switch (subject.toLowerCase()) {
      case 'matematik':
        return Colors.blue;
      case 'türkçe':
        return Colors.red;
      case 'fizik':
        return Colors.purple;
      case 'kimya':
        return Colors.green;
      case 'biyoloji':
        return Colors.teal;
      case 'tarih':
        return Colors.brown;
      case 'coğrafya':
        return Colors.orange;
      case 'felsefe':
        return Colors.indigo;
      default:
        return Colors.grey;
    }
  }

  IconData _getActivityIcon(String type) {
    switch (type) {
      case 'study':
        return Icons.book;
      case 'quiz':
        return Icons.quiz;
      case 'break':
        return Icons.coffee;
      case 'planning':
        return Icons.event_note;
      default:
        return Icons.circle;
    }
  }

  String _formatLastSeen(dynamic lastSeen) {
    if (lastSeen == null) return 'Bilinmiyor';

    DateTime lastSeenTime;
    if (lastSeen is Timestamp) {
      lastSeenTime = lastSeen.toDate();
    } else if (lastSeen is String) {
      lastSeenTime = DateTime.parse(lastSeen);
    } else {
      return 'Bilinmiyor';
    }

    final now = DateTime.now();
    final difference = now.difference(lastSeenTime);

    if (difference.inMinutes < 2) {
      return 'Şu an aktif';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} dakika önce';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} saat önce';
    } else {
      return '${difference.inDays} gün önce';
    }
  }

  String _formatDuration(int minutes) {
    if (minutes < 60) {
      return '${minutes}dk';
    } else {
      final hours = minutes ~/ 60;
      final mins = minutes % 60;
      return mins > 0 ? '${hours}s ${mins}dk' : '${hours}s';
    }
  }

  String _formatTime(dynamic timestamp) {
    if (timestamp == null) return '';

    DateTime time;
    if (timestamp is Timestamp) {
      time = timestamp.toDate();
    } else if (timestamp is int) {
      time = DateTime.fromMillisecondsSinceEpoch(timestamp);
    } else {
      return '';
    }

    return DateFormat('HH:mm').format(time);
  }
}
