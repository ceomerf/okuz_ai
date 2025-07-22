// JWT Backend için Study Data Provider
// Firebase bağımlılığı tamamen kaldırıldı

import 'package:flutter/material.dart';
import '../services/api_client.dart';

class StudyDataProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  Map<String, dynamic>? _studyData;
  List<Map<String, dynamic>> _studySessions = [];
  bool _isLoading = false;
  bool _hasActiveTheme = false;

  Map<String, dynamic>? get studyData => _studyData;
  List<Map<String, dynamic>> get studySessions => _studySessions;
  bool get isLoading => _isLoading;
  bool get hasActiveTheme => _hasActiveTheme;

  // Çalışma verilerini yükle
  Future<void> loadStudyData() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiClient.get('/study/data');
      _studyData = response;
    } catch (e) {
      debugPrint('Çalışma verileri yükleme hatası: $e');
      _studyData = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Çalışma seanslarını yükle
  Future<void> loadStudySessions() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiClient.get('/study/sessions');
      _studySessions =
          List<Map<String, dynamic>>.from(response['sessions'] ?? []);
    } catch (e) {
      debugPrint('Çalışma seansları yükleme hatası: $e');
      _studySessions = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Çalışma seansı ekle
  Future<bool> addStudySession(Map<String, dynamic> sessionData) async {
    try {
      await _apiClient.post('/study/add-session', sessionData);
      await loadStudySessions(); // Listeyi yenile
      return true;
    } catch (e) {
      debugPrint('Çalışma seansı ekleme hatası: $e');
      return false;
    }
  }

  // Çalışma verilerini güncelle
  Future<bool> updateStudyData(Map<String, dynamic> updates) async {
    try {
      await _apiClient.post('/study/update-data', updates);
      await loadStudyData(); // Verileri yenile
      return true;
    } catch (e) {
      debugPrint('Çalışma verileri güncelleme hatası: $e');
      return false;
    }
  }

  // Çalışma seansından sonra güncelle
  Future<void> updateAfterStudySession() async {
    try {
      await loadStudyData();
      await loadStudySessions();
    } catch (e) {
      debugPrint('Çalışma seansı sonrası güncelleme hatası: $e');
    }
  }

  // Ruh hali özetini getir
  String getMoodSummary() {
    // Mock implementation
    return 'Bugün motivasyonun yüksek görünüyor!';
  }

  // Tema güncellemesini zorla
  Future<void> forceThemeUpdate() async {
    try {
      await loadStudyData();
      notifyListeners();
    } catch (e) {
      debugPrint('Tema güncelleme hatası: $e');
    }
  }
}
