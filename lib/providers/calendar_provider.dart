import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/long_term_plan.dart';
import '../models/state/calendar_state.dart';
import '../services/gamification_service.dart';
import '../services/premium_service.dart';
import 'premium_service_provider.dart';
import 'gamification_service_provider.dart';
import '../services/realtime_service.dart';
import '../services/api_client.dart';
import '../utils/calendar_helpers.dart';
import '../widgets/calendar/task_form_modal.dart';
import 'plan_provider.dart';

class CalendarNotifier extends StateNotifier<CalendarState> {
  CalendarNotifier(this._ref) : super(CalendarState.initial());

  final Ref _ref;

  late final PremiumService _premiumService = _ref.read(premiumServiceProvider);
  late final GamificationService _gamificationService = _ref.read(gamificationServiceProvider);

  // Initialization
  Future<void> initialize() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('user_id');
      if (userId != null && userId.isNotEmpty) {
        await RealtimeService().connect(userId: userId);
        RealtimeService().progressStream.listen((_) => _refreshPlan());
      }

      ApiClient.planRefreshStream.listen((_) => _refreshPlan());

      final planService = _ref.read(planServiceProvider);
      final planData = await planService.getUserPlan();
      if (planData.isEmpty) {
        final bool hasHoliday = prefs.getBool('has_holiday_plan') ?? false;
        final String? holidayJson = prefs.getString('holiday_plan');
        if (hasHoliday && holidayJson != null && holidayJson.isNotEmpty) {
          try {
            final Map<String, dynamic> holidayMap = jsonDecode(holidayJson) as Map<String, dynamic>;
            final Map<String, dynamic> holiday = (holidayMap['plan'] is Map<String, dynamic>)
                ? (holidayMap['plan'] as Map<String, dynamic>)
                : holidayMap;
            final LongTermPlan holidayAsLongTerm = LongTermPlan.fromHolidayPlan(holiday);
            _loadFromPlan(holidayAsLongTerm);
          } catch (_) {
            state = state.copyWith(currentPlan: null);
          }
        }
      } else {
        final plan = LongTermPlan.fromMap(planData);
        _loadFromPlan(plan);
        _selectDefaultFocusedDay(plan);
      }

      final isPremium = await _premiumService.isPremiumUser();
      state = state.copyWith(isPremium: isPremium);

      if (state.selectedDay != null) {
        _updateSelectedDayTasks();
      }
    } catch (e) {
      state = state.copyWith(errorMessage: e.toString());
    } finally {
      state = state.copyWith(isLoading: false);
    }
  }

  void _loadFromPlan(LongTermPlan plan) {
    final events = <DateTime, List<DailyTask>>{};
    for (final week in plan.weeks) {
      for (final day in week.days) {
        try {
          final date = DateTime.parse(day.date);
          events[date] = day.dailyTasks;
        } catch (_) {}
      }
    }
    final allDays = plan.weeks.expand((w) => w.days).toList();
    state = state.copyWith(
      currentPlan: plan,
      events: events,
      currentStreak: CalendarHelpers.calculateCurrentStreak(allDays),
      longestStreak: CalendarHelpers.calculateLongestStreak(allDays),
      focusedDay: DateTime.now(),
    );
  }

  void _selectDefaultFocusedDay(LongTermPlan plan) {
    final DateTime today = DateTime.now();
    final DateTime todayKey = DateTime(today.year, today.month, today.day);
    final events = state.events;
    DateTime? selected;
    if (CalendarHelpers.isDateInPlan(todayKey, plan.weeks.expand((w) => w.days).toList())) {
      selected = todayKey;
    } else if (events.isNotEmpty) {
      final dates = events.keys.toList()..sort();
      selected = dates.firstWhere((d) => !d.isBefore(todayKey), orElse: () => dates.last);
    } else {
      selected = todayKey;
    }
    state = state.copyWith(selectedDay: selected);
    _updateSelectedDayTasks();
  }

  void _updateSelectedDayTasks() {
    final selected = state.selectedDay;
    if (selected == null) return;
    final tasks = CalendarHelpers.getTasksForDate(selected, state.events);
    state = state.copyWith(selectedDayTasks: tasks);
  }

  void setSelectedDay(DateTime selected, DateTime focused) {
    state = state.copyWith(selectedDay: selected, focusedDay: focused);
    _updateSelectedDayTasks();
  }

  void toggleEditMode() {
    state = state.copyWith(isEditMode: !state.isEditMode);
  }

  Future<void> handleUserAction(
    BuildContext context, {
    required String actionType,
    DailyTask? task,
    String? subject,
    String? topic,
    String? unit,
    int? durationInMinutes,
    String? date,
  }) async {
    try {
      state = state.copyWith(isLoading: true);
      switch (actionType) {
        case 'ADD_TASK':
          if (date == null || subject == null || topic == null) {
            throw Exception('Eksik parametre: date/subject/topic');
          }
          await _addNewTask(
            date: date,
            subject: subject,
            topic: topic,
            unit: unit,
            durationInMinutes: durationInMinutes ?? 60,
          );
          break;
        case 'DELETE_TASK':
          if (task == null || date == null) return;
          await _deleteTask(task, date);
          break;
        case 'UPDATE_TASK':
          if (task == null || date == null) return;
          await _updateTask(
            task,
            date,
            subject: subject,
            topic: topic,
            unit: unit,
            durationInMinutes: durationInMinutes,
          );
          break;
        case 'TOGGLE_COMPLETION':
          if (task == null || date == null) return;
          await _updateTaskCompletion(task, date);
          break;
        case 'SKIP_TASK':
          if (task == null || date == null) return;
          await _skipTask(task, date);
          break;
        default:
          throw Exception('Bilinmeyen işlem türü: $actionType');
      }

      await _refreshPlan();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_getSuccessMessage(actionType)), backgroundColor: Colors.green, behavior: SnackBarBehavior.floating),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Hata: $e'), backgroundColor: Colors.red, behavior: SnackBarBehavior.floating),
      );
    } finally {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> _skipTask(DailyTask task, String date) async {
    try {
      final updated = DailyTask(
        id: task.id,
        subject: task.subject,
        topic: task.topic,
        durationInMinutes: task.durationInMinutes,
        isCompleted: false,
        feynman: task.feynman,
      );

      final dateTime = DateTime.parse(date);
      final events = Map<DateTime, List<DailyTask>>.from(state.events);
      final list = events[dateTime];
      if (list != null) {
        final index = list.indexWhere((t) =>
            t.subject == task.subject &&
            t.topic == task.topic &&
            t.durationInMinutes == task.durationInMinutes);
        if (index != -1) {
          list[index] = updated;
        }
      }
      state = state.copyWith(events: events);
      if (state.selectedDay != null && DateUtils.isSameDay(state.selectedDay, dateTime)) {
        _updateSelectedDayTasks();
      }
    } catch (_) {}
  }

  String _getSuccessMessage(String actionType) {
    switch (actionType) {
      case 'ADD_TASK':
        return '✅ Yeni görev başarıyla eklendi';
      case 'DELETE_TASK':
        return '🗑️ Görev başarıyla silindi';
      case 'UPDATE_TASK':
        return '✏️ Görev başarıyla güncellendi';
      case 'TOGGLE_COMPLETION':
        return '🎉 Görev durumu güncellendi';
      default:
        return '✅ İşlem başarıyla tamamlandı';
    }
  }

  Future<void> _refreshPlan() async {
    try {
      final planService = _ref.read(planServiceProvider);
      final planData = await planService.getUserPlan();
      if (planData.isNotEmpty) {
        final plan = LongTermPlan.fromMap(planData);
        _loadFromPlan(plan);
      } else {
        final prefs = await SharedPreferences.getInstance();
        final String? holidayJson = prefs.getString('holiday_plan');
        if (holidayJson != null && holidayJson.isNotEmpty) {
          try {
            final Map<String, dynamic> holidayMap = jsonDecode(holidayJson) as Map<String, dynamic>;
            final Map<String, dynamic> holiday = (holidayMap['plan'] is Map<String, dynamic>)
                ? (holidayMap['plan'] as Map<String, dynamic>)
                : holidayMap;
            final LongTermPlan holidayAsLongTerm = LongTermPlan.fromHolidayPlan(holiday);
            _loadFromPlan(holidayAsLongTerm);
          } catch (_) {}
        }
      }
    } catch (_) {} finally {}
  }

  Future<void> _addNewTask({
    required String date,
    required String subject,
    required String topic,
    String? unit,
    required int durationInMinutes,
  }) async {
    final newTask = DailyTask(
      subject: subject,
      topic: topic,
      durationInMinutes: durationInMinutes,
      isCompleted: false,
      feynman: FeynmanStep(
        explanation: '$topic konusu için açıklama',
        analogyPrompt: '$topic konusunu günlük hayatta neye benzetebiliriz?',
        quiz: [
          QuizQuestion(
            question: '$topic ile ilgili soru',
            options: ['Seçenek A', 'Seçenek B', 'Seçenek C'],
            correctAnswer: 'Seçenek A',
          ),
        ],
      ),
    );

    final currentPlan = state.currentPlan;
    if (currentPlan != null) {
      final planJson = currentPlan.toJson();
      final String dateKey = DateTime.parse(date).toIso8601String().split('T')[0];
      bool dayFound = false;
      for (final week in planJson['weeks']) {
        for (final day in week['days']) {
          final String dayDate = (day['date'] ?? '').toString();
          if (dayDate.startsWith(dateKey)) {
            dayFound = true;
            final List<dynamic> tasks = (day['dailyTasks'] as List<dynamic>? ?? []);
            tasks.add(newTask.toMap());
            day['dailyTasks'] = tasks;
          }
        }
      }
      if (!dayFound) {
        if ((planJson['weeks'] as List).isEmpty) {
          planJson['weeks'] = [
            {
              'weekNumber': 1,
              'days': [],
            }
          ];
        }
        final List<dynamic> weeks = planJson['weeks'] as List<dynamic>;
        final firstWeek = weeks.first as Map<String, dynamic>;
        final List<dynamic> days = (firstWeek['days'] as List<dynamic>? ?? []);
        days.add({
          'day': DateTime.parse(date).weekday.toString(),
          'date': DateTime.parse(date).toIso8601String(),
          'isRestDay': false,
          'dailyTasks': [newTask.toMap()],
        });
        firstWeek['days'] = days;
      }
      final planService = _ref.read(planServiceProvider);
      await planService.updatePlan(currentPlan.id, planJson);
    }

    final dateTime = DateTime.parse(date);
    final events = Map<DateTime, List<DailyTask>>.from(state.events);
    (events[dateTime] ??= []).add(newTask);
    state = state.copyWith(events: events);
    if (state.selectedDay != null && DateUtils.isSameDay(state.selectedDay, dateTime)) {
      _updateSelectedDayTasks();
    }
  }

  Future<void> _deleteTask(DailyTask task, String date) async {
    final currentPlan = state.currentPlan;
    if (currentPlan != null) {
      final planJson = currentPlan.toJson();
      final String dateKey = DateTime.parse(date).toIso8601String().split('T')[0];
      for (final week in planJson['weeks']) {
        for (final day in week['days']) {
          final String dayDate = (day['date'] ?? '').toString();
          if (dayDate.startsWith(dateKey)) {
            final List<dynamic> tasks = (day['dailyTasks'] as List<dynamic>? ?? []);
            tasks.removeWhere((t) =>
                t['subject'] == task.subject &&
                t['topic'] == task.topic &&
                (t['durationInMinutes'] ?? 0) == task.durationInMinutes);
            day['dailyTasks'] = tasks;
          }
        }
      }
      final planService = _ref.read(planServiceProvider);
      await planService.updatePlan(currentPlan.id, planJson);
    }

    final dateTime = DateTime.parse(date);
    final events = Map<DateTime, List<DailyTask>>.from(state.events);
    events[dateTime]?.removeWhere((t) =>
        t.subject == task.subject &&
        t.topic == task.topic &&
        t.durationInMinutes == task.durationInMinutes);
    state = state.copyWith(events: events);
    if (state.selectedDay != null && DateUtils.isSameDay(state.selectedDay, dateTime)) {
      _updateSelectedDayTasks();
    }
  }

  Future<void> _updateTask(
    DailyTask task,
    String date, {
    String? subject,
    String? topic,
    String? unit,
    int? durationInMinutes,
  }) async {
    final updatedTask = DailyTask(
      subject: subject ?? task.subject,
      topic: topic ?? task.topic,
      durationInMinutes: durationInMinutes ?? task.durationInMinutes,
      isCompleted: task.isCompleted,
      feynman: task.feynman,
    );

    final currentPlan = state.currentPlan;
    if (currentPlan != null) {
      final planJson = currentPlan.toJson();
      final String dateKey = DateTime.parse(date).toIso8601String().split('T')[0];
      for (final week in planJson['weeks']) {
        for (final day in week['days']) {
          final String dayDate = (day['date'] ?? '').toString();
          if (dayDate.startsWith(dateKey)) {
            final List<dynamic> tasks = (day['dailyTasks'] as List<dynamic>? ?? []);
            final idx = tasks.indexWhere((t) =>
                t['subject'] == task.subject &&
                t['topic'] == task.topic &&
                (t['durationInMinutes'] ?? 0) == task.durationInMinutes);
            final newMap = updatedTask.toMap();
            if (idx >= 0) {
              tasks[idx] = newMap;
            } else {
              tasks.add(newMap);
            }
            day['dailyTasks'] = tasks;
          }
        }
      }
      final planService = _ref.read(planServiceProvider);
      await planService.updatePlan(currentPlan.id, planJson);
    }

    final dateTime = DateTime.parse(date);
    final events = Map<DateTime, List<DailyTask>>.from(state.events);
    final taskList = events[dateTime];
    if (taskList != null) {
      final index = taskList.indexWhere((t) =>
          t.subject == task.subject &&
          t.topic == task.topic &&
          t.durationInMinutes == task.durationInMinutes);
      if (index != -1) {
        taskList[index] = updatedTask;
      }
    }
    state = state.copyWith(events: events);
    if (state.selectedDay != null && DateUtils.isSameDay(state.selectedDay, dateTime)) {
      _updateSelectedDayTasks();
    }
  }

  Future<void> _updateTaskCompletion(DailyTask task, String date) async {
    final updatedTask = DailyTask(
      id: task.id,
      subject: task.subject,
      topic: task.topic,
      durationInMinutes: task.durationInMinutes,
      isCompleted: !task.isCompleted,
      feynman: task.feynman,
    );

    final currentPlan = state.currentPlan;
    if (currentPlan != null) {
      final planJson = currentPlan.toJson();
      final String dateKey = DateTime.parse(date).toIso8601String().split('T')[0];
      for (final week in planJson['weeks']) {
        for (final day in week['days']) {
          final String dayDate = (day['date'] ?? '').toString();
          if (dayDate.startsWith(dateKey)) {
            final List<dynamic> tasks = (day['dailyTasks'] as List<dynamic>? ?? []);
            final idx = tasks.indexWhere((t) =>
                t['subject'] == task.subject &&
                t['topic'] == task.topic &&
                (t['durationInMinutes'] ?? 0) == task.durationInMinutes);
            final newMap = updatedTask.toMap();
            if (idx >= 0) {
              tasks[idx] = newMap;
            } else {
              tasks.add(newMap);
            }
            day['dailyTasks'] = tasks;
          }
        }
      }
      final planService = _ref.read(planServiceProvider);
      await planService.updatePlan(currentPlan.id, planJson);
    }

    final dateTime = DateTime.parse(date);
    final events = Map<DateTime, List<DailyTask>>.from(state.events);
    final taskList = events[dateTime];
    if (taskList != null) {
      final index = taskList.indexWhere((t) =>
          t.subject == task.subject &&
          t.topic == task.topic &&
          t.durationInMinutes == task.durationInMinutes);
      if (index != -1) {
        taskList[index] = updatedTask;
      }
    }
    state = state.copyWith(events: events);
    if (state.selectedDay != null && DateUtils.isSameDay(state.selectedDay, dateTime)) {
      _updateSelectedDayTasks();
    }

    try {
      if (updatedTask.isCompleted && (task.id?.isNotEmpty == true)) {
        final planService = _ref.read(planServiceProvider);
        await planService.completeSession(
          sessionId: task.id!,
          performance: 100,
          notes: 'Kullanıcı tarafından tamamlandı',
        );
        await _gamificationService.addXP(20, subject: task.subject);
      }
    } catch (_) {}
  }

  // Dialog helpers
  void showTaskFormModal(BuildContext context, {DailyTask? task}) {
    final selected = state.selectedDay;
    if (selected == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return TaskFormModal(
          task: task,
          onSave: (ctx, data) async {
            final dateStr = selected.toIso8601String().split('T')[0];
            if (task == null) {
              await handleUserAction(ctx,
                  actionType: 'ADD_TASK',
                  date: dateStr,
                  subject: data['subject'],
                  topic: data['topic'],
                  durationInMinutes: data['durationInMinutes']);
            } else {
              await handleUserAction(ctx,
                  actionType: 'UPDATE_TASK',
                  task: task,
                  date: dateStr,
                  subject: data['subject'],
                  topic: data['topic'],
                  durationInMinutes: data['durationInMinutes']);
            }
          },
        );
      },
    );
  }

  void confirmDeleteTask(BuildContext context, DailyTask task) {
    final selected = state.selectedDay;
    if (selected == null) return;
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Görev Sil'),
          content: const Text('Bu görevi silmek istediğinden emin misin?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('İptal')),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                await handleUserAction(
                  context,
                  actionType: 'DELETE_TASK',
                  task: task,
                  date: selected.toIso8601String().split('T')[0],
                );
              },
              child: const Text('Sil'),
            ),
          ],
        );
      },
    );
  }
}

final calendarNotifierProvider = StateNotifierProvider<CalendarNotifier, CalendarState>((ref) {
  return CalendarNotifier(ref);
});


