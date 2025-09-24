import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppThemeState {
  final bool isDarkMode;
  const AppThemeState({this.isDarkMode = false});
  ThemeMode get themeMode => isDarkMode ? ThemeMode.dark : ThemeMode.light;
  AppThemeState copyWith({bool? isDarkMode}) => AppThemeState(isDarkMode: isDarkMode ?? this.isDarkMode);
}

class AppThemeNotifier extends StateNotifier<AppThemeState> {
  AppThemeNotifier() : super(const AppThemeState()) {
    _loadThemeState();
  }

  Future<void> _loadThemeState() async {
    final prefs = await SharedPreferences.getInstance();
    final isDark = prefs.getBool('is_dark_mode') ?? false;
    state = state.copyWith(isDarkMode: isDark);
  }

  Future<void> toggleTheme() async {
    final newValue = !state.isDarkMode;
    state = state.copyWith(isDarkMode: newValue);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('is_dark_mode', newValue);
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    if (mode == ThemeMode.system) {
      final systemDark = WidgetsBinding.instance.platformDispatcher.platformBrightness == Brightness.dark;
      state = state.copyWith(isDarkMode: systemDark);
    } else {
      state = state.copyWith(isDarkMode: mode == ThemeMode.dark);
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('is_dark_mode', state.isDarkMode);
  }
}

final appThemeNotifierProvider = StateNotifierProvider<AppThemeNotifier, AppThemeState>((ref) {
  return AppThemeNotifier();
});
