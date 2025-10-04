import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';

import '../../theme/app_theme.dart';
import '../../utils/calendar_helpers.dart';
import '../../providers/calendar_provider.dart';
import '../../models/long_term_plan.dart';
import '../../screens/calendar_view_screen.dart' show DayCellType;

typedef DayCellBuilder = Widget Function(
  BuildContext context,
  DateTime date,
  List<Day> allDays,
  DayCellType type,
);

class PremiumCalendarWidget extends ConsumerWidget {
  final List<Day> allDays;
  final DayCellBuilder dayCellBuilder;

  const PremiumCalendarWidget({
    super.key,
    required this.allDays,
    required this.dayCellBuilder,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vm = ref.watch(calendarNotifierProvider);

    // Plan tarih aralığını belirle; bugünün her zaman görünür olmasını sağla
    final DateTime today = DateTime.now();
    final range = CalendarHelpers.getPlanDateRange(allDays);
    DateTime computedFirstDay =
        range?.start ?? today.subtract(const Duration(days: 365));
    DateTime computedLastDay =
        range?.end ?? today.add(const Duration(days: 365));
    if (today.isBefore(computedFirstDay)) {
      computedFirstDay = today.subtract(const Duration(days: 365));
    }
    if (today.isAfter(computedLastDay)) {
      computedLastDay = today.add(const Duration(days: 365));
    }

    DateTime _clampToRange(DateTime d) {
      if (d.isBefore(computedFirstDay)) return computedFirstDay;
      if (d.isAfter(computedLastDay)) return computedLastDay;
      return d;
    }

    final DateTime focusedClamped = _clampToRange(vm.focusedDay);

    return Container(
      margin: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
          BoxShadow(
            color: AppTheme.primaryColor.withValues(alpha: 0.1),
            blurRadius: 30,
            spreadRadius: -5,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Column(
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryColor.withValues(alpha: 0.1),
                    AppTheme.primaryColor.withValues(alpha: 0.05),
                  ],
                ),
              ),
              child: Row(
                children: [
                  Icon(Icons.event_note_rounded,
                      color: AppTheme.primaryColor, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    _getFormattedMonthYear(context, focusedClamped),
                    style: GoogleFonts.montserrat(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Theme.of(context).textTheme.bodyLarge?.color,
                    ),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: () {
                      final prevMonth = _clampToRange(
                        DateTime(focusedClamped.year, focusedClamped.month - 1, 1),
                      );
                      // Ayı geri al
                      ref.read(calendarNotifierProvider.notifier).setSelectedDay(prevMonth, prevMonth);
                    },
                    child: _navBtn(context, Icons.chevron_left),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () {
                      final nextMonth = _clampToRange(
                        DateTime(focusedClamped.year, focusedClamped.month + 1, 1),
                      );
                      // Ayı ileri al
                      ref.read(calendarNotifierProvider.notifier).setSelectedDay(nextMonth, nextMonth);
                    },
                    child: _navBtn(context, Icons.chevron_right),
                  ),
                ],
              ),
            ),

            // Calendar
            Padding(
              padding: const EdgeInsets.all(20),
              child: TableCalendar<DailyTask>(
                firstDay: computedFirstDay,
                lastDay: computedLastDay,
                focusedDay: focusedClamped,
                selectedDayPredicate: (d) => isSameDay(vm.selectedDay, d),
                eventLoader: (d) => CalendarHelpers.getTasksForDate(d, vm.events),
                startingDayOfWeek: StartingDayOfWeek.monday,
                locale: 'tr_TR',
                rowHeight: 72,
                daysOfWeekHeight: 45,
                calendarStyle: CalendarStyle(
                  outsideDaysVisible: false,
                  weekendTextStyle: GoogleFonts.lato(
                    color: Colors.red.shade400,
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                  defaultTextStyle: GoogleFonts.lato(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: Theme.of(context).textTheme.bodyLarge?.color,
                  ),
                  selectedDecoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [AppTheme.primaryColor, AppTheme.primaryColor.withValues(alpha: 0.8)],
                    ),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primaryColor.withValues(alpha: 0.4),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  selectedTextStyle: GoogleFonts.lato(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                  todayDecoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppTheme.primaryColor.withValues(alpha: 0.5),
                      width: 2,
                    ),
                  ),
                  todayTextStyle: GoogleFonts.lato(
                    color: AppTheme.primaryColor,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                  markerDecoration: BoxDecoration(
                    color: AppTheme.accentColor,
                    shape: BoxShape.circle,
                  ),
                  markersMaxCount: 4,
                  markerSize: 7,
                ),
                headerVisible: false,
                headerStyle: const HeaderStyle(
                  formatButtonVisible: false,
                  titleCentered: false,
                  headerPadding: EdgeInsets.zero,
                  titleTextStyle: TextStyle(fontSize: 0),
                  leftChevronVisible: false,
                  rightChevronVisible: false,
                ),
                daysOfWeekStyle: DaysOfWeekStyle(
                  weekdayStyle: GoogleFonts.montserrat(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).textTheme.bodyMedium?.color,
                    letterSpacing: 0.5,
                  ),
                  weekendStyle: GoogleFonts.montserrat(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.red.shade400,
                    letterSpacing: 0.5,
                  ),
                ),
                onDaySelected: (selected, focused) =>
                    ref.read(calendarNotifierProvider.notifier).setSelectedDay(selected, focused),
                calendarBuilders: CalendarBuilders(
                  defaultBuilder: (ctx, date, _) =>
                      dayCellBuilder(ctx, date, allDays, DayCellType.normal),
                  selectedBuilder: (ctx, date, _) =>
                      dayCellBuilder(ctx, date, allDays, DayCellType.selected),
                  todayBuilder: (ctx, date, _) =>
                      dayCellBuilder(ctx, date, allDays, DayCellType.today),
                  outsideBuilder: (ctx, date, _) =>
                      dayCellBuilder(ctx, date, allDays, DayCellType.outside),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getFormattedMonthYear(BuildContext context, DateTime date) {
    // Ay + Yıl (TR) – haftanın gününü değil, sadece ay ve yılı göster
    return DateFormat('MMMM yyyy', 'tr_TR').format(date);
  }

  Widget _navBtn(BuildContext context, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? Colors.grey[800]
            : Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, size: 20, color: Theme.of(context).textTheme.bodyMedium?.color),
    );
  }
}

