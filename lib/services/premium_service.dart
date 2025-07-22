// JWT Backend için Premium Service
// Firebase bağımlılığı tamamen kaldırıldı

import 'package:flutter/material.dart';
import 'api_client.dart';

class PremiumService {
  final ApiClient _apiClient = ApiClient();

  // Premium kullanıcı kontrolü
  Future<bool> isPremiumUser() async {
    try {
      final response = await _apiClient.get('/subscription/status');
      return response['isPremium'] ?? false;
    } catch (e) {
      debugPrint('Premium kullanıcı kontrol hatası: $e');
      return false;
    }
  }

  // Premium'a yükselt
  Future<bool> upgradeToPremium() async {
    try {
      final response = await _apiClient.post('/subscription/upgrade', {});
      return response['success'] ?? false;
    } catch (e) {
      debugPrint('Premium yükseltme hatası: $e');
      return false;
    }
  }

  // Günün kilitli olup olmadığını kontrol et
  Future<bool> isDayLocked(DateTime date) async {
    try {
      final response = await _apiClient.get('/subscription/day-locked',
          queryParameters: {'date': date.toIso8601String()});
      return response['isLocked'] ?? false;
    } catch (e) {
      debugPrint('Gün kilit kontrolü hatası: $e');
      return false;
    }
  }

  // Premium erişim kontrolü
  Future<bool> checkPremiumAccess({String? feature}) async {
    try {
      final response = await _apiClient.get('/subscription/premium-access');
      return response['hasAccess'] ?? false;
    } catch (e) {
      debugPrint('Premium erişim kontrol hatası: $e');
      return false;
    }
  }

  // Premium özelliği ekle
  Future<bool> addPremiumFeature(String feature) async {
    try {
      await _apiClient.post('/subscription/add-feature', {
        'feature': feature,
      });
      return true;
    } catch (e) {
      debugPrint('Premium özellik ekleme hatası: $e');
      return false;
    }
  }

  // Premium özelliği kaldır
  Future<bool> removePremiumFeature(String feature) async {
    try {
      await _apiClient.post('/subscription/remove-feature', {
        'feature': feature,
      });
      return true;
    } catch (e) {
      debugPrint('Premium özellik kaldırma hatası: $e');
      return false;
    }
  }
}
