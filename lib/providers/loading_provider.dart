import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class LoadingState {
  final Map<String, bool> loadingStates;
  final Map<String, String> loadingMessages;
  final Map<String, dynamic> errors;

  const LoadingState({
    this.loadingStates = const {},
    this.loadingMessages = const {},
    this.errors = const {},
  });

  LoadingState copyWith({
    Map<String, bool>? loadingStates,
    Map<String, String>? loadingMessages,
    Map<String, dynamic>? errors,
  }) {
    return LoadingState(
      loadingStates: loadingStates ?? this.loadingStates,
      loadingMessages: loadingMessages ?? this.loadingMessages,
      errors: errors ?? this.errors,
    );
  }
}

class LoadingNotifier extends StateNotifier<LoadingState> {
  LoadingNotifier() : super(const LoadingState());

  // Loading durumunu kontrol et
  bool isLoading(String key) => state.loadingStates[key] ?? false;

  // Tüm loading durumlarını kontrol et
  bool get isAnyLoading => state.loadingStates.values.any((loading) => loading);

  // Loading mesajını al
  String? getLoadingMessage(String key) => state.loadingMessages[key];

  // Hata mesajını al
  dynamic getError(String key) => state.errors[key];

  // Hata var mı kontrol et
  bool hasError(String key) => state.errors.containsKey(key) && state.errors[key] != null;

  // Loading durumunu başlat
  void setLoading(String key, {String? message}) {
    final newStates = Map<String, bool>.from(state.loadingStates)..[key] = true;
    final newMessages = Map<String, String>.from(state.loadingMessages);
    if (message != null) newMessages[key] = message;
    final newErrors = Map<String, dynamic>.from(state.errors)..remove(key);
    state = state.copyWith(loadingStates: newStates, loadingMessages: newMessages, errors: newErrors);
  }

  // Loading durumunu bitir
  void setLoaded(String key) {
    final newStates = Map<String, bool>.from(state.loadingStates)..[key] = false;
    final newMessages = Map<String, String>.from(state.loadingMessages)..remove(key);
    state = state.copyWith(loadingStates: newStates, loadingMessages: newMessages);
  }

  // Hata durumunu ayarla
  void setError(String key, dynamic error) {
    final newStates = Map<String, bool>.from(state.loadingStates)..[key] = false;
    final newErrors = Map<String, dynamic>.from(state.errors)..[key] = error;
    state = state.copyWith(loadingStates: newStates, errors: newErrors);
  }

  // Hatayı temizle
  void clearError(String key) {
    final newErrors = Map<String, dynamic>.from(state.errors)..remove(key);
    state = state.copyWith(errors: newErrors);
  }

  // Tüm durumları temizle
  void reset() {
    state = const LoadingState();
  }
}

final loadingNotifierProvider = StateNotifierProvider<LoadingNotifier, LoadingState>((ref) {
  return LoadingNotifier();
});
