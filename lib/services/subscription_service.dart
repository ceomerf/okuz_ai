// JWT Backend için Subscription Service
// Firebase bağımlılığı tamamen kaldırıldı

import 'package:flutter/material.dart';
import 'api_client.dart';

class SubscriptionService {
  final ApiClient _apiClient = ApiClient();

  // Abonelik durumunu kontrol et
  Future<Map<String, dynamic>> checkSubscriptionStatus() async {
    try {
      final response = await _apiClient.get('/subscription/status');
      return response;
    } catch (e) {
      debugPrint('Abonelik durumu kontrol hatası: $e');
      return {'isPremium': false, 'isActive': false};
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

  // Premium'a yükselt
  Future<bool> upgradeToPremium({String tier = 'ai_pro'}) async {
    try {
      await _apiClient.post('/subscription/upgrade', {'tier': tier});
      return true;
    } catch (e) {
      debugPrint('Premium yükseltme hatası: $e');
      return false;
    }
  }

  // Trial başlat
  Future<bool> startUserTrial() async {
    try {
      await _apiClient.post('/subscription/start-trial', {});
      return true;
    } catch (e) {
      debugPrint('Trial başlatma hatası: $e');
      return false;
    }
  }

  // Kurucu üye ol
  Future<Map<String, dynamic>?> joinFounderMembership() async {
    try {
      final response =
          await _apiClient.post('/subscription/founder-membership', {});
      return response;
    } catch (e) {
      debugPrint('Kurucu üye kayıt hatası: $e');
      return null;
    }
  }

  Future<int> getFounderMemberCount() async {
    // Mock implementation
    return 42;
  }

  Future<String> getUpgradeMessage() async {
    // Mock implementation
    return 'Upgrade to premium for more features!';
  }

  Future<void> upgradeToPremiumAccount() async {
    // Mock implementation
    debugPrint('User upgraded to premium');
  }
}
