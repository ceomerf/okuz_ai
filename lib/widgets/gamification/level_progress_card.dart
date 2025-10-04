import 'package:flutter/material.dart';
import 'package:percent_indicator/percent_indicator.dart';

import '../../models/gamification.dart';

class LevelProgressCard extends StatelessWidget {
  final LevelInfo levelInfo;
  const LevelProgressCard({super.key, required this.levelInfo});

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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${levelInfo.currentLevel}. Seviye',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withAlpha(51),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${levelInfo.totalXP} XP',
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            LinearPercentIndicator(
              lineHeight: 14.0,
              percent: levelInfo.progressToNext / 100,
              backgroundColor: theme.colorScheme.primary.withAlpha(51),
              progressColor: theme.colorScheme.primary,
              barRadius: const Radius.circular(7),
              padding: EdgeInsets.zero,
              animation: true,
              animationDuration: 1000,
            ),
            const SizedBox(height: 8),
            Text(
              'Bir sonraki seviye için ${levelInfo.nextLevelXP - levelInfo.currentXP} XP daha gerekiyor',
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

