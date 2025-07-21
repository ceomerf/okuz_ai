import 'package:flutter/foundation.dart';

class LoadingProvider extends ChangeNotifier {
  final Map<String, bool> _loadingStates = {};
  final Map<String, String> _loadingMessages = {};
  final Map<String, dynamic> _errors = {};

  // Loading durumunu kontrol et
  bool isLoading(String key) => _loadingStates[key] ?? false;

  // Tüm loading durumlarını kontrol et
  bool get isAnyLoading => _loadingStates.values.any((loading) => loading);

  // Loading mesajını al
  String? getLoadingMessage(String key) => _loadingMessages[key];

  // Hata mesajını al
  dynamic getError(String key) => _errors[key];

  // Hata var mı kontrol et
  bool hasError(String key) => _errors.containsKey(key) && _errors[key] != null;

  // Loading durumunu başlat
  void setLoading(String key, {String? message}) {
    _loadingStates[key] = true;

    if (message != null) {
      _loadingMessages[key] = message;
    }

    // Varsa hatayı temizle
    _errors.remove(key);

    notifyListeners();
  }

  // Loading durumunu bitir
  void setLoaded(String key) {
    _loadingStates[key] = false;
    _loadingMessages.remove(key);
    notifyListeners();
  }

  // Hata durumunu ayarla
  void setError(String key, dynamic error) {
    _loadingStates[key] = false;
    _errors[key] = error;
    notifyListeners();
  }

  // Hatayı temizle
  void clearError(String key) {
    _errors.remove(key);
    notifyListeners();
  }

  // Tüm durumları temizle
  void reset() {
    _loadingStates.clear();
    _loadingMessages.clear();
    _errors.clear();
    notifyListeners();
  }
}
