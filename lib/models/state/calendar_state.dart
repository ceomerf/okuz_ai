import 'package:equatable/equatable.dart';
import 'package:meta/meta.dart';

import '../../models/long_term_plan.dart';

@immutable
class CalendarState extends Equatable {
  final LongTermPlan? currentPlan;
  final bool isPremium;
  final bool isLoading;
  final DateTime focusedDay;
  final DateTime? selectedDay;
  final Map<DateTime, List<DailyTask>> events;
  final List<DailyTask> selectedDayTasks;
  final bool isEditMode;
  final int currentStreak;
  final int longestStreak;
  final String? errorMessage;

  const CalendarState({
    this.currentPlan,
    this.isPremium = false,
    this.isLoading = false,
    required this.focusedDay,
    this.selectedDay,
    this.events = const {},
    this.selectedDayTasks = const [],
    this.isEditMode = false,
    this.currentStreak = 0,
    this.longestStreak = 0,
    this.errorMessage,
  });

  factory CalendarState.initial() => CalendarState(
        focusedDay: DateTime.now(),
        selectedDay: null,
      );

  CalendarState copyWith({
    LongTermPlan? currentPlan,
    bool? isPremium,
    bool? isLoading,
    DateTime? focusedDay,
    DateTime? selectedDay,
    Map<DateTime, List<DailyTask>>? events,
    List<DailyTask>? selectedDayTasks,
    bool? isEditMode,
    int? currentStreak,
    int? longestStreak,
    String? errorMessage,
    bool clearError = false,
  }) {
    return CalendarState(
      currentPlan: currentPlan ?? this.currentPlan,
      isPremium: isPremium ?? this.isPremium,
      isLoading: isLoading ?? this.isLoading,
      focusedDay: focusedDay ?? this.focusedDay,
      selectedDay: selectedDay ?? this.selectedDay,
      events: events ?? this.events,
      selectedDayTasks: selectedDayTasks ?? this.selectedDayTasks,
      isEditMode: isEditMode ?? this.isEditMode,
      currentStreak: currentStreak ?? this.currentStreak,
      longestStreak: longestStreak ?? this.longestStreak,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [
        currentPlan,
        isPremium,
        isLoading,
        focusedDay,
        selectedDay,
        events,
        selectedDayTasks,
        isEditMode,
        currentStreak,
        longestStreak,
        errorMessage,
      ];
}


