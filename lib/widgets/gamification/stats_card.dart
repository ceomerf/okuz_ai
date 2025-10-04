import 'package:flutter/material.dart';

import '../../models/gamification.dart';

class StatsCard extends StatelessWidget {
  final GamificationStats stats;
  const StatsCard({super.key, required this.stats});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('İstatistikler', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            _buildStatItem(context, 'Toplam Çalışma Süresi', '${stats.totalStudyTime} dakika', Icons.timer),
            _buildStatItem(context, 'Tamamlanan Quizler', '${stats.completedQuizzes}', Icons.quiz),
            _buildStatItem(context, 'Çözülen Sorular', '${stats.solvedQuestions}', Icons.question_answer),
            _buildStatItem(context, 'Haftalık XP', '${stats.weeklyXP} XP', Icons.trending_up),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(BuildContext context, String title, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 12),
          Expanded(child: Text(title, style: Theme.of(context).textTheme.bodyMedium)),
          Text(value, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

