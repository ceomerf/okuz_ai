import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/app_theme.dart';
import '../../utils/calendar_helpers.dart';
import '../../providers/calendar_provider.dart';
import '../../models/long_term_plan.dart';
import 'task_tile.dart';

class SelectedDayDetails extends ConsumerWidget {
  const SelectedDayDetails({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vm = ref.watch(calendarNotifierProvider);

    if (vm.selectedDay == null) {
      return Container(
        margin: const EdgeInsets.all(20),
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 15,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.touch_app_rounded, size: 32, color: AppTheme.primaryColor),
            ),
            const SizedBox(height: 16),
            Text(
              'Bir gün seçin',
              style: GoogleFonts.montserrat(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).textTheme.bodyLarge?.color,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Takvimden bir gün seçerek o günün\ngörevlerini ve detaylarını görebilirsiniz',
              textAlign: TextAlign.center,
              style: GoogleFonts.lato(
                fontSize: 14,
                color: Theme.of(context).textTheme.bodyMedium?.color,
                height: 1.4,
              ),
            ),
          ],
        ),
      );
    }

    final dayTasks = CalendarHelpers.getTasksForDate(vm.selectedDay!, vm.events);
    final formattedDate = CalendarHelpers.formatDateTurkish(vm.selectedDay!);
    final completedTasks = dayTasks.where((t) => t.isCompleted).length;
    final totalDuration = dayTasks.fold<int>(0, (sum, t) => sum + t.durationInMinutes);

    return Container(
      margin: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.primaryColor.withValues(alpha: 0.1),
                  AppTheme.primaryColor.withValues(alpha: 0.05),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        formattedDate,
                        style: GoogleFonts.montserrat(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).textTheme.bodyLarge?.color,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${dayTasks.length} görev • $totalDuration dakika',
                        style: GoogleFonts.lato(
                          fontSize: 14,
                          color: Theme.of(context).textTheme.bodyMedium?.color,
                        ),
                      ),
                    ],
                  ),
                ),
                if (dayTasks.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: completedTasks == dayTasks.length
                          ? Colors.green.withValues(alpha: 0.15)
                          : AppTheme.primaryColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        Text(
                          '$completedTasks/${dayTasks.length}',
                          style: GoogleFonts.montserrat(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: completedTasks == dayTasks.length
                                ? Colors.green
                                : AppTheme.primaryColor,
                          ),
                        ),
                        Text(
                          'tamamlandı',
                          style: GoogleFonts.lato(
                            fontSize: 10,
                            color: completedTasks == dayTasks.length
                                ? Colors.green
                                : AppTheme.primaryColor,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),

          if (dayTasks.isEmpty)
            Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.beach_access_rounded, size: 32, color: Colors.green),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Dinlenme Günü',
                    style: GoogleFonts.montserrat(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Theme.of(context).textTheme.bodyLarge?.color,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Bu gün için planlanmış görev yok.\nKeyifli bir dinlenme günü geçir!',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.lato(
                      fontSize: 14,
                      color: Theme.of(context).textTheme.bodyMedium?.color,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            )
          else
            Column(
              children: [
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: dayTasks.length,
                  itemBuilder: (context, index) => TaskTile(task: dayTasks[index]),
                ),
                if (vm.isEditMode && vm.selectedDay != null)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.all(20),
                    child: ElevatedButton.icon(
                      onPressed: () => ref.read(calendarNotifierProvider.notifier).showTaskFormModal(context),
                      icon: const Icon(Icons.add_task_rounded),
                      label: const Text('Yeni Görev Ekle'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 2,
                      ),
                    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.3),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

