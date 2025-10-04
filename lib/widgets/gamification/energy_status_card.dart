import 'package:flutter/material.dart';
import 'package:percent_indicator/percent_indicator.dart';

import '../../models/gamification.dart';

class EnergyStatusCard extends StatelessWidget {
  final EnergyStatus energyStatus;
  const EnergyStatusCard({super.key, required this.energyStatus});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final energy = energyStatus;
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.bolt, color: Colors.amber, size: 28),
                const SizedBox(width: 8),
                Text('Enerji', style: theme.textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: 16),
            LinearPercentIndicator(
              lineHeight: 14.0,
              percent: energy.percentage / 100,
              backgroundColor: Colors.amber.withAlpha(51),
              progressColor: Colors.amber,
              barRadius: const Radius.circular(7),
              padding: EdgeInsets.zero,
              animation: true,
              animationDuration: 1000,
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${energy.current}/${energy.max} enerji', style: theme.textTheme.bodySmall),
                Text('Yenilenme: ${energy.nextRefillIn}', style: theme.textTheme.bodySmall),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

