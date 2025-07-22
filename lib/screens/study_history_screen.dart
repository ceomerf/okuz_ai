import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/mock_database_service.dart';
import '../services/study_tracking_service.dart';
import '../widgets/main_layout.dart';

class StudyHistoryScreen extends StatefulWidget {
  const StudyHistoryScreen({super.key});

  @override
  _StudyHistoryScreenState createState() => _StudyHistoryScreenState();
}

class _StudyHistoryScreenState extends State<StudyHistoryScreen> {
  late Future<List<String>> _topSubjects;
  late Future<List<Map<String, dynamic>>> _dailyLogs;
  late Future<Map<String, dynamic>> _subjectBreakdown;
  late Stream<Map<String, dynamic>> _weeklyStatsStream;

  @override
  void initState() {
    super.initState();
    final studyTrackingService =
        Provider.of<StudyTrackingService>(context, listen: false);
    _topSubjects = studyTrackingService.getTopSubjects();
    _dailyLogs = studyTrackingService.getDailyStudyLogs();
    _subjectBreakdown = studyTrackingService.getSubjectBreakdown();
    _weeklyStatsStream = studyTrackingService.getWeeklyStatsStream();
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildTopSubjects(),
            const SizedBox(height: 24),
            _buildDailyLogs(),
            const SizedBox(height: 24),
            _buildSubjectBreakdown(),
            const SizedBox(height: 24),
            _buildWeeklyStats(),
          ],
        ),
      ),
    );
  }

  Widget _buildTopSubjects() {
    return FutureBuilder<List<String>>(
      future: _topSubjects,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Hata: ${snapshot.error}'));
        }
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const Center(child: Text('Veri bulunamadı.'));
        }
        final subjects = snapshot.data!;
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('En Çok Çalışılan Dersler',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                ...subjects.map((subject) => ListTile(title: Text(subject))),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDailyLogs() {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _dailyLogs,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Hata: ${snapshot.error}'));
        }
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const Center(child: Text('Veri bulunamadı.'));
        }
        final logs = snapshot.data!;
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Günlük Çalışma Saatleri',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                ...logs.map((log) => ListTile(
                      title: Text(
                          '${log['date'].day}.${log['date'].month}.${log['date'].year}'),
                      trailing: Text('${log['hours']} saat'),
                    )),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSubjectBreakdown() {
    return FutureBuilder<Map<String, dynamic>>(
      future: _subjectBreakdown,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Hata: ${snapshot.error}'));
        }
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const Center(child: Text('Veri bulunamadı.'));
        }
        final breakdown = snapshot.data!;
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Derslere Göre Dağılım',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                ...breakdown.entries.map((entry) => ListTile(
                      title: Text(entry.key),
                      trailing: Text('${entry.value} saat'),
                    )),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildWeeklyStats() {
    return StreamBuilder<Map<String, dynamic>>(
      stream: _weeklyStatsStream,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Hata: ${snapshot.error}'));
        }
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const Center(child: Text('Veri bulunamadı.'));
        }
        final stats = snapshot.data!;
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Haftalık İstatistikler',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                ListTile(
                  title: Text(stats['week']),
                  trailing: Text('${stats['hours']} saat'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
