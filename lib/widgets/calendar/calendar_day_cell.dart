import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/app_theme.dart';
import '../../utils/calendar_helpers.dart';
import '../../providers/calendar_provider.dart';
import '../../models/long_term_plan.dart';
import '../../screens/calendar_view_screen.dart' show DayCellType; // reuse enum

class CalendarDayCell extends ConsumerWidget {
  final DateTime date;
  final List<Day> allDays;
  final DayCellType type;

  const CalendarDayCell({
    super.key,
    required this.date,
    required this.allDays,
    required this.type,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vm = ref.watch(calendarNotifierProvider);

    final dayTasks = CalendarHelpers.getTasksForDate(date, vm.events);
    final hasEvents = dayTasks.isNotEmpty;
    final isToday = DateUtils.isSameDay(date, DateTime.now());
    final isSelected = vm.selectedDay != null && DateUtils.isSameDay(date, vm.selectedDay!);
    final int totalMinutes = dayTasks.fold<int>(0, (sum, t) => sum + t.durationInMinutes);
    final int completedCount = dayTasks.where((t) => t.isCompleted).length;

    Color backgroundColor = Colors.transparent;
    Color textColor = Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black;
    List<BoxShadow> shadows = [];
    BorderRadius borderRadius = BorderRadius.circular(12);
    Border? border;
    Gradient? gradient;

    switch (type) {
      case DayCellType.selected:
        gradient = LinearGradient(
          colors: [AppTheme.primaryColor, AppTheme.primaryColor.withValues(alpha: 0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
        textColor = Colors.white;
        shadows = [
          BoxShadow(
            color: AppTheme.primaryColor.withValues(alpha: 0.4),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ];
        break;
      case DayCellType.today:
        backgroundColor = AppTheme.primaryColor.withValues(alpha: 0.1);
        textColor = AppTheme.primaryColor;
        border = Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.6),
          width: 2,
        );
        shadows = [
          BoxShadow(
            color: AppTheme.primaryColor.withValues(alpha: 0.2),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ];
        break;
      case DayCellType.normal:
        if (hasEvents) {
          gradient = LinearGradient(
            colors: [
              AppTheme.accentColor.withValues(alpha: 0.15),
              AppTheme.accentColor.withValues(alpha: 0.05),
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          );
          border = Border.all(
            color: AppTheme.accentColor.withValues(alpha: 0.3),
            width: 1,
          );
          shadows = [
            BoxShadow(
              color: AppTheme.accentColor.withValues(alpha: 0.1),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ];
        } else {
          textColor = Theme.of(context).textTheme.bodySmall?.color ?? Colors.grey;
        }
        break;
      case DayCellType.outside:
        backgroundColor = Colors.transparent;
        textColor = Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.3) ?? Colors.grey.shade300;
        break;
    }

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
      margin: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: gradient == null ? backgroundColor : null,
        gradient: gradient,
        borderRadius: borderRadius,
        border: border,
        boxShadow: shadows,
      ),
      transform: isSelected ? Matrix4.translationValues(0, -3, 0) : Matrix4.identity(),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: borderRadius,
          onTap: () => ref.read(calendarNotifierProvider.notifier).setSelectedDay(date, date),
          child: SizedBox(
            width: double.infinity,
            height: double.infinity,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Tooltip(
                  message: CalendarHelpers.formatDateTurkish(date),
                  child: Text(
                    '${date.day}',
                    style: GoogleFonts.lato(
                      fontSize: type == DayCellType.selected ? 17 : 15,
                      fontWeight: (type == DayCellType.selected || type == DayCellType.today)
                          ? FontWeight.w700
                          : FontWeight.w600,
                      color: textColor,
                      height: 1.1,
                    ),
                  ),
                ),
                if (hasEvents)
                  Padding(
                    padding: const EdgeInsets.only(top: 4, left: 6, right: 6),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: (completedCount == dayTasks.length && dayTasks.isNotEmpty)
                              ? Colors.green.withValues(alpha: 0.15)
                              : AppTheme.accentColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: (completedCount == dayTasks.length && dayTasks.isNotEmpty)
                                ? Colors.green.withValues(alpha: 0.4)
                                : AppTheme.accentColor.withValues(alpha: 0.3),
                            width: 1,
                          ),
                        ),
                        child: Text(
                          '${dayTasks.length} • ${CalendarHelpers.formatDuration(totalMinutes)}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.lato(
                            fontSize: 9,
                            fontWeight: FontWeight.w600,
                            color: (completedCount == dayTasks.length && dayTasks.isNotEmpty)
                                ? Colors.green.shade700
                                : Theme.of(context).textTheme.bodyMedium?.color,
                            height: 1.0,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

