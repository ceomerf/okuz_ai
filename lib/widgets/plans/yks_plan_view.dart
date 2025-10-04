import 'package:flutter/material.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class YKSPlanView extends StatefulWidget {
  final Map<String, dynamic> planData;
  final Function(String)? onTaskComplete;
  final Function(String, int)? onProgressUpdate;

  const YKSPlanView({
    Key? key,
    required this.planData,
    this.onTaskComplete,
    this.onProgressUpdate,
  }) : super(key: key);

  @override
  State<YKSPlanView> createState() => _YKSPlanViewState();
}

class _YKSPlanViewState extends State<YKSPlanView>
    with TickerProviderStateMixin {
  late TabController _tabController;
  int _currentWeek = 0;

  @override
  void initState() {
    super.initState();
    final weeklyPlans = widget.planData['weeklyPlans'] as List? ?? [];
    _tabController = TabController(length: weeklyPlans.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final weeklyPlans = widget.planData['weeklyPlans'] as List? ?? [];
    final milestones = widget.planData['milestones'] as List? ?? [];
    final adaptiveStrategies =
        widget.planData['adaptiveStrategies'] as Map<String, dynamic>? ?? {};

    if (weeklyPlans.isEmpty) {
      return const Center(
        child: Text('Plan verisi bulunamadı'),
      );
    }

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: Column(
        children: [
          // Plan başlığı ve bilgileri
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.primaryColor,
                  AppTheme.primaryColor.withOpacity(0.8)
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(20),
                bottomRight: Radius.circular(20),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '🎯 YKS Çalışma Planın',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${widget.planData['yksSpecific']?['academicTrack'] ?? 'Genel'} Alan • ${widget.planData['yksSpecific']?['grade'] ?? ''} Sınıf',
                  style: const TextStyle(
                    fontSize: 16,
                    color: Colors.white70,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _buildInfoCard(
                      icon: Icons.schedule,
                      title: 'Toplam Hafta',
                      value: '${weeklyPlans.length}',
                    ),
                    const SizedBox(width: 12),
                    _buildInfoCard(
                      icon: Icons.book,
                      title: 'Dersler',
                      value:
                          '${(widget.planData['metadata']?['subjectsAssigned'] as List?)?.length ?? 0}',
                    ),
                    const SizedBox(width: 12),
                    _buildInfoCard(
                      icon: Icons.flag,
                      title: 'Hedefler',
                      value: '${milestones.length}',
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Haftalık planlar
          Expanded(
            child: Column(
              children: [
                // Hafta seçici tabs
                if (weeklyPlans.length > 1)
                  Container(
                    color: Colors.white,
                    child: TabBar(
                      controller: _tabController,
                      isScrollable: true,
                      labelColor: AppTheme.primaryColor,
                      unselectedLabelColor: Colors.grey,
                      indicatorColor: AppTheme.primaryColor,
                      tabs: weeklyPlans.asMap().entries.map((entry) {
                        final week = entry.value as Map<String, dynamic>;
                        return Tab(
                          text: 'Hafta ${week['week']}',
                        );
                      }).toList(),
                    ),
                  ),

                // Plan içeriği
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: weeklyPlans.map((week) {
                      return _buildWeekView(week as Map<String, dynamic>);
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),

          // Alt navigasyon
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () =>
                        _showAdaptiveStrategies(adaptiveStrategies),
                    icon: const Icon(Icons.psychology),
                    label: const Text('Öğrenme Stratejileri'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _showMilestones(milestones),
                    icon: const Icon(Icons.emoji_events),
                    label: const Text('Hedefler'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: Colors.white, size: 20),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            Text(
              title,
              style: const TextStyle(
                fontSize: 12,
                color: Colors.white70,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWeekView(Map<String, dynamic> week) {
    final days = week['days'] as List? ?? [];
    final theme = week['theme'] as String? ?? 'Haftalık Plan';
    final mebGoals = week['mebGoals'] as String?;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hafta teması
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.primaryColor.withOpacity(0.1),
                  Colors.blue.withOpacity(0.1)
                ],
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.primaryColor.withOpacity(0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '📚 $theme',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
                if (mebGoals != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    '🎯 MEB Kazanımları: $mebGoals',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[700],
                    ),
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Günlük planlar
          ...days.asMap().entries.map((entry) {
            return _buildDayView(entry.value as Map<String, dynamic>);
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildDayView(Map<String, dynamic> day) {
    final sessions = day['sessions'] as List? ?? [];
    final dayNumber = day['day'] as int? ?? 1;
    final date = day['date'] as String? ?? '';
    final summary = day['summary'] as String? ?? '';
    final totalDuration = day['totalDuration'] as int? ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Gün başlığı
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Center(
                    child: Text(
                      '$dayNumber',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Gün $dayNumber',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        date,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${totalDuration}dk',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Seanslar
          ...sessions.map((session) {
            return _buildSessionCard(session as Map<String, dynamic>);
          }).toList(),

          // Gün özeti
          if (summary.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.summarize, color: Colors.blue, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        summary,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.blue[800],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSessionCard(Map<String, dynamic> session) {
    final subject = session['subject'] as String? ?? '';
    final topic = session['topic'] as String? ?? '';
    final duration = session['duration'] as int? ?? 0;
    final type = session['type'] as String? ?? 'lesson';
    final difficulty = session['difficulty'] as String? ?? 'medium';
    final tytOrAyt = session['tytOrAyt'] as String? ?? '';
    final goals = session['goals'] as List? ?? [];
    final activities = session['activities'] as List? ?? [];
    final timeSlot = session['timeSlot'] as String? ?? '';
    final isExtraReview = session['isExtraReview'] as bool? ?? false;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isExtraReview ? Colors.orange.withOpacity(0.1) : Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isExtraReview
              ? Colors.orange.withOpacity(0.3)
              : Colors.grey.withOpacity(0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getSubjectColor(subject),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  subject,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              if (tytOrAyt.isNotEmpty)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: tytOrAyt == 'TYT' ? Colors.blue : Colors.purple,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    tytOrAyt,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              const Spacer(),
              if (isExtraReview)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.orange,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'EK TEKRAR',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              const SizedBox(width: 8),
              Text(
                '${duration}dk',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            topic,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (goals.isNotEmpty) ...[
            const SizedBox(height: 8),
            ...goals
                .take(2)
                .map((goal) => Row(
                      children: [
                        const Icon(Icons.check_circle_outline,
                            size: 16, color: AppTheme.primaryColor),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            goal.toString(),
                            style: const TextStyle(fontSize: 14),
                          ),
                        ),
                      ],
                    ))
                .toList(),
          ],
          if (activities.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: activities
                  .take(3)
                  .map((activity) => Chip(
                        label: Text(
                          activity.toString(),
                          style: const TextStyle(fontSize: 12),
                        ),
                        backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                        padding: const EdgeInsets.all(0),
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ))
                  .toList(),
            ),
          ],
        ],
      ),
    );
  }

  Color _getSubjectColor(String subject) {
    const colors = {
      'Matematik': Colors.blue,
      'Fizik': Colors.purple,
      'Kimya': Colors.green,
      'Biyoloji': Colors.teal,
      'Türkçe': Colors.red,
      'Türk Dili ve Edebiyatı': Colors.red,
      'Tarih': Colors.brown,
      'Coğrafya': Colors.orange,
      'İngilizce': Colors.indigo,
      'Felsefe': Colors.deepPurple,
    };
    return colors[subject] ?? Colors.grey;
  }

  void _showAdaptiveStrategies(Map<String, dynamic> strategies) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
          ),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
              ),
              child: const Row(
                children: [
                  Icon(Icons.psychology, color: Colors.white),
                  SizedBox(width: 8),
                  Text(
                    'Öğrenme Stratejileri',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildStrategySection(
                      'Düşük Güven Seviyeli Dersler',
                      strategies['lowConfidenceSupport']?['subjects'] ?? [],
                      strategies['lowConfidenceSupport']?['strategies'] ?? [],
                      Icons.trending_down,
                      Colors.red,
                    ),
                    _buildStrategySection(
                      'Motivasyon Teknikleri',
                      [],
                      strategies['motivationTechniques'] ?? [],
                      Icons.emoji_events,
                      Colors.orange,
                    ),
                    _buildStrategySection(
                      'Öğrenme Stili Adaptasyonları',
                      [],
                      strategies['learningStyleAdaptations'] ?? [],
                      Icons.school,
                      Colors.blue,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStrategySection(
    String title,
    List subjects,
    List strategies,
    IconData icon,
    Color color,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
          if (subjects.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: subjects
                  .map((subject) => Chip(
                        label: Text(subject.toString()),
                        backgroundColor: color.withOpacity(0.2),
                      ))
                  .toList(),
            ),
          ],
          if (strategies.isNotEmpty) ...[
            const SizedBox(height: 8),
            ...strategies
                .map((strategy) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        children: [
                          Icon(Icons.arrow_right, color: color, size: 16),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              strategy.toString(),
                              style: const TextStyle(fontSize: 14),
                            ),
                          ),
                        ],
                      ),
                    ))
                .toList(),
          ],
        ],
      ),
    );
  }

  void _showMilestones(List milestones) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.6,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
          ),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.orange,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
              ),
              child: const Row(
                children: [
                  Icon(Icons.emoji_events, color: Colors.white),
                  SizedBox(width: 8),
                  Text(
                    'Hedefler ve Kilometre Taşları',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: milestones.length,
                itemBuilder: (context, index) {
                  final milestone = milestones[index] as Map<String, dynamic>;
                  return _buildMilestoneCard(milestone);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMilestoneCard(Map<String, dynamic> milestone) {
    final title = milestone['title'] as String? ?? '';
    final description = milestone['description'] as String? ?? '';
    final week = milestone['week'] as int? ?? 1;
    final subjects = milestone['subjects'] as List? ?? [];
    final metrics = milestone['metrics'] as Map? ?? {};

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.orange.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.orange.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.orange,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Hafta $week',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            description,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[700],
            ),
          ),
          if (subjects.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 4,
              children: subjects
                  .map((subject) => Chip(
                        label: Text(
                          subject.toString(),
                          style: const TextStyle(fontSize: 10),
                        ),
                        backgroundColor: Colors.orange.withOpacity(0.2),
                        padding: const EdgeInsets.all(0),
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ))
                  .toList(),
            ),
          ],
          if (metrics.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: metrics.entries
                  .take(3)
                  .map((entry) => Expanded(
                        child: Column(
                          children: [
                            Text(
                              entry.value.toString(),
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.orange,
                              ),
                            ),
                            Text(
                              _getMetricDisplayName(entry.key),
                              style: const TextStyle(
                                fontSize: 10,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ))
                  .toList(),
            ),
          ],
        ],
      ),
    );
  }

  String _getMetricDisplayName(String key) {
    const displayNames = {
      'studyHours': 'Saat',
      'topicsCompleted': 'Konu',
      'practiceTests': 'Test',
    };
    return displayNames[key] ?? key;
  }
}
