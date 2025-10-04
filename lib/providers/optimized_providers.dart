import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Optimized provider examples for better performance
/// These examples show how to use Riverpod's select method and other optimizations

// Example: User data provider with optimized selectors
class UserData {
  final String id;
  final String name;
  final String email;
  final int age;
  final String role;
  final DateTime lastLogin;

  const UserData({
    required this.id,
    required this.name,
    required this.email,
    required this.age,
    required this.role,
    required this.lastLogin,
  });

  UserData copyWith({
    String? id,
    String? name,
    String? email,
    int? age,
    String? role,
    DateTime? lastLogin,
  }) {
    return UserData(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      age: age ?? this.age,
      role: role ?? this.role,
      lastLogin: lastLogin ?? this.lastLogin,
    );
  }
}

// Main user data provider
final userDataProvider = StateNotifierProvider<UserDataNotifier, UserData>((ref) {
  return UserDataNotifier();
});

class UserDataNotifier extends StateNotifier<UserData> {
  UserDataNotifier() : super(const UserData(
    id: '',
    name: '',
    email: '',
    age: 0,
    role: '',
    lastLogin: null,
  ));

  void updateUser(UserData user) {
    state = user;
  }

  void updateName(String name) {
    state = state.copyWith(name: name);
  }

  void updateEmail(String email) {
    state = state.copyWith(email: email);
  }
}

// Optimized selectors - these prevent unnecessary rebuilds
final userNameProvider = Provider<String>((ref) {
  return ref.watch(userDataProvider.select((user) => user.name));
});

final userEmailProvider = Provider<String>((ref) {
  return ref.watch(userDataProvider.select((user) => user.email));
});

final userRoleProvider = Provider<String>((ref) {
  return ref.watch(userDataProvider.select((user) => user.role));
});

final userAgeProvider = Provider<int>((ref) {
  return ref.watch(userDataProvider.select((user) => user.age));
});

final isAdminProvider = Provider<bool>((ref) {
  return ref.watch(userDataProvider.select((user) => user.role == 'admin'));
});

final isStudentProvider = Provider<bool>((ref) {
  return ref.watch(userDataProvider.select((user) => user.role == 'student'));
});

// Example: Study session data with optimized selectors
class StudySession {
  final String id;
  final String subject;
  final int duration;
  final DateTime startTime;
  final bool isCompleted;
  final double score;

  const StudySession({
    required this.id,
    required this.subject,
    required this.duration,
    required this.startTime,
    required this.isCompleted,
    required this.score,
  });
}

final studySessionsProvider = StateNotifierProvider<StudySessionsNotifier, List<StudySession>>((ref) {
  return StudySessionsNotifier();
});

class StudySessionsNotifier extends StateNotifier<List<StudySession>> {
  StudySessionsNotifier() : super([]);

  void addSession(StudySession session) {
    state = [...state, session];
  }

  void updateSession(String id, StudySession updatedSession) {
    state = state.map((session) => session.id == id ? updatedSession : session).toList();
  }

  void removeSession(String id) {
    state = state.where((session) => session.id != id).toList();
  }
}

// Optimized selectors for study sessions
final completedSessionsProvider = Provider<List<StudySession>>((ref) {
  return ref.watch(studySessionsProvider.select((sessions) => 
    sessions.where((session) => session.isCompleted).toList()));
});

final pendingSessionsProvider = Provider<List<StudySession>>((ref) {
  return ref.watch(studySessionsProvider.select((sessions) => 
    sessions.where((session) => !session.isCompleted).toList()));
});

final totalStudyTimeProvider = Provider<int>((ref) {
  return ref.watch(studySessionsProvider.select((sessions) => 
    sessions.fold(0, (total, session) => total + session.duration)));
});

final averageScoreProvider = Provider<double>((ref) {
  final sessions = ref.watch(completedSessionsProvider);
  if (sessions.isEmpty) return 0.0;
  return sessions.fold(0.0, (sum, session) => sum + session.score) / sessions.length;
});

final sessionsBySubjectProvider = Provider.family<List<StudySession>, String>((ref, subject) {
  return ref.watch(studySessionsProvider.select((sessions) => 
    sessions.where((session) => session.subject == subject).toList()));
});

// Example: Performance metrics with optimized selectors
class PerformanceMetrics {
  final int totalXP;
  final int currentLevel;
  final int studyStreak;
  final double weeklyProgress;
  final int todayTasks;

  const PerformanceMetrics({
    required this.totalXP,
    required this.currentLevel,
    required this.studyStreak,
    required this.weeklyProgress,
    required this.todayTasks,
  });

  PerformanceMetrics copyWith({
    int? totalXP,
    int? currentLevel,
    int? studyStreak,
    double? weeklyProgress,
    int? todayTasks,
  }) {
    return PerformanceMetrics(
      totalXP: totalXP ?? this.totalXP,
      currentLevel: currentLevel ?? this.currentLevel,
      studyStreak: studyStreak ?? this.studyStreak,
      weeklyProgress: weeklyProgress ?? this.weeklyProgress,
      todayTasks: todayTasks ?? this.todayTasks,
    );
  }
}

final performanceMetricsProvider = StateNotifierProvider<PerformanceMetricsNotifier, PerformanceMetrics>((ref) {
  return PerformanceMetricsNotifier();
});

class PerformanceMetricsNotifier extends StateNotifier<PerformanceMetrics> {
  PerformanceMetricsNotifier() : super(const PerformanceMetrics(
    totalXP: 0,
    currentLevel: 1,
    studyStreak: 0,
    weeklyProgress: 0.0,
    todayTasks: 0,
  ));

  void updateMetrics(PerformanceMetrics metrics) {
    state = metrics;
  }

  void addXP(int xp) {
    state = state.copyWith(totalXP: state.totalXP + xp);
  }

  void updateStreak(int streak) {
    state = state.copyWith(studyStreak: streak);
  }
}

// Optimized selectors for performance metrics
final totalXPProvider = Provider<int>((ref) {
  return ref.watch(performanceMetricsProvider.select((metrics) => metrics.totalXP));
});

final currentLevelProvider = Provider<int>((ref) {
  return ref.watch(performanceMetricsProvider.select((metrics) => metrics.currentLevel));
});

final studyStreakProvider = Provider<int>((ref) {
  return ref.watch(performanceMetricsProvider.select((metrics) => metrics.studyStreak));
});

final weeklyProgressProvider = Provider<double>((ref) {
  return ref.watch(performanceMetricsProvider.select((metrics) => metrics.weeklyProgress));
});

final todayTasksProvider = Provider<int>((ref) {
  return ref.watch(performanceMetricsProvider.select((metrics) => metrics.todayTasks));
});

// Example: Theme provider with optimized selectors
enum AppTheme { light, dark, system }

class ThemeState {
  final AppTheme theme;
  final bool isDark;

  const ThemeState({
    required this.theme,
    required this.isDark,
  });

  ThemeState copyWith({
    AppTheme? theme,
    bool? isDark,
  }) {
    return ThemeState(
      theme: theme ?? this.theme,
      isDark: isDark ?? this.isDark,
    );
  }
}

final themeStateProvider = StateNotifierProvider<ThemeStateNotifier, ThemeState>((ref) {
  return ThemeStateNotifier();
});

class ThemeStateNotifier extends StateNotifier<ThemeState> {
  ThemeStateNotifier() : super(const ThemeState(
    theme: AppTheme.system,
    isDark: false,
  ));

  void setTheme(AppTheme theme) {
    state = state.copyWith(theme: theme);
  }

  void setDarkMode(bool isDark) {
    state = state.copyWith(isDark: isDark);
  }
}

// Optimized selectors for theme
final currentThemeProvider = Provider<AppTheme>((ref) {
  return ref.watch(themeStateProvider.select((state) => state.theme));
});

final isDarkModeProvider = Provider<bool>((ref) {
  return ref.watch(themeStateProvider.select((state) => state.isDark));
});

// Example: Auto-dispose provider for temporary data
final temporaryDataProvider = Provider.autoDispose<String>((ref) {
  // This provider will automatically dispose when no longer watched
  return 'Temporary data';
});

// Example: Family provider for user-specific data
final userSpecificDataProvider = Provider.family<String, String>((ref, userId) {
  // This provider creates a separate instance for each userId
  return 'Data for user: $userId';
});

// Example: Future provider with optimized error handling
final userProfileProvider = FutureProvider.family<UserData, String>((ref, userId) async {
  // This provider will cache the result and only refetch when userId changes
  // Simulate API call
  await Future.delayed(const Duration(seconds: 1));
  return UserData(
    id: userId,
    name: 'User $userId',
    email: 'user$userId@example.com',
    age: 20,
    role: 'student',
    lastLogin: DateTime.now(),
  );
});
