import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/long_term_plan.dart';
import '../../theme/app_theme.dart';
import '../../providers/calendar_provider.dart';

class TaskTile extends ConsumerWidget {
  final DailyTask task;
  const TaskTile({super.key, required this.task});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vm = ref.watch(calendarNotifierProvider);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: task.isCompleted
              ? Colors.green.withValues(alpha: 0.05)
              : Theme.of(context).brightness == Brightness.dark
                  ? Colors.grey[850]
                  : Colors.grey[50],
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: task.isCompleted
                ? Colors.green.withValues(alpha: 0.3)
                : Theme.of(context).brightness == Brightness.dark
                    ? Colors.grey[700]!
                    : Colors.grey[200]!,
            width: 1,
          ),
          boxShadow: task.isCompleted
              ? [
                  BoxShadow(
                    color: Colors.green.withValues(alpha: 0.1),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : [],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Checkbox
                GestureDetector(
                  onTap: () async {
                    HapticFeedback.mediumImpact();
                    final dateStr = vm.selectedDay!.toIso8601String().split('T')[0];
                    await ref.read(calendarNotifierProvider.notifier).handleUserAction(
                      context,
                      actionType: 'TOGGLE_COMPLETION',
                      task: task,
                      date: dateStr,
                    );
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: task.isCompleted ? Colors.green : Colors.transparent,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: task.isCompleted ? Colors.green : Colors.grey.shade400,
                        width: 2,
                      ),
                    ),
                    child: task.isCompleted
                        ? const Icon(Icons.check, color: Colors.white, size: 16)
                        : null,
                  ),
                ),
                const SizedBox(width: 12),

                // Başlık
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        task.topic,
                        style: GoogleFonts.montserrat(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          decoration: task.isCompleted
                              ? TextDecoration.lineThrough
                              : TextDecoration.none,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.schedule, size: 14, color: Colors.grey.shade600),
                          const SizedBox(width: 4),
                          Text(
                            '${task.durationInMinutes} dk',
                            style: GoogleFonts.lato(fontSize: 12, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 12),
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      task.subject,
                      style: GoogleFonts.figtree(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primaryColor,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),

                const Spacer(),
                if (vm.isEditMode)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        onPressed: () => ref.read(calendarNotifierProvider.notifier).showTaskFormModal(context, task: task),
                        icon: Icon(Icons.edit_rounded, size: 18, color: Colors.blue.shade600),
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                        tooltip: 'Düzenle',
                      ),
                      IconButton(
                        onPressed: () => ref.read(calendarNotifierProvider.notifier).confirmDeleteTask(context, task),
                        icon: Icon(Icons.delete_outline_rounded, size: 18, color: Colors.red.shade600),
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                        tooltip: 'Sil',
                      ),
                    ],
                  )
                else
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('${task.durationInMinutes} dk', style: GoogleFonts.lato(fontSize: 12, color: Colors.grey.shade700)),
                      const SizedBox(width: 8),
                      if (!task.isCompleted)
                        TextButton.icon(
                          onPressed: () async {
                            HapticFeedback.selectionClick();
                            final dateStr = vm.selectedDay!.toIso8601String().split('T')[0];
                            await ref.read(calendarNotifierProvider.notifier).handleUserAction(
                              context,
                              actionType: 'SKIP_TASK',
                              task: task,
                              date: dateStr,
                            );
                          },
                          icon: const Icon(Icons.fast_forward_rounded, size: 16),
                          label: const Text('Atla'),
                          style: TextButton.styleFrom(
                            foregroundColor: Colors.orange.shade700,
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            textStyle: GoogleFonts.figtree(fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ),
                    ],
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

