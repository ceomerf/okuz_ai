import 'package:equatable/equatable.dart';
import 'package:meta/meta.dart';

@immutable
class StudyDashboardState extends Equatable {
  final bool isLoading;
  final String? errorMessage;
  final String studentName;
  final int totalXP;
  final int studyStreak;
  final int currentLevel;
  final double weeklyProgress;
  final int todayTasks;
  final List<dynamic> dailySchedule;

  const StudyDashboardState({
    this.isLoading = true,
    this.errorMessage,
    this.studentName = '',
    this.totalXP = 0,
    this.studyStreak = 0,
    this.currentLevel = 1,
    this.weeklyProgress = 0.0,
    this.todayTasks = 0,
    this.dailySchedule = const [],
  });

  StudyDashboardState copyWith({
    bool? isLoading,
    String? errorMessage,
    String? studentName,
    int? totalXP,
    int? studyStreak,
    int? currentLevel,
    double? weeklyProgress,
    int? todayTasks,
    List<dynamic>? dailySchedule,
  }) {
    return StudyDashboardState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
      studentName: studentName ?? this.studentName,
      totalXP: totalXP ?? this.totalXP,
      studyStreak: studyStreak ?? this.studyStreak,
      currentLevel: currentLevel ?? this.currentLevel,
      weeklyProgress: weeklyProgress ?? this.weeklyProgress,
      todayTasks: todayTasks ?? this.todayTasks,
      dailySchedule: dailySchedule ?? this.dailySchedule,
    );
  }

  @override
  List<Object?> get props => [
        isLoading,
        errorMessage,
        studentName,
        totalXP,
        studyStreak,
        currentLevel,
        weeklyProgress,
        todayTasks,
        dailySchedule,
      ];
}


