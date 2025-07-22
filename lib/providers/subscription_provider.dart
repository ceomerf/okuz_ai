// JWT Backend için basit Subscription Provider
// Firebase bağımlılığı tamamen kaldırıldı

import 'package:flutter/material.dart';
import '../services/api_client.dart';

class SubscriptionProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  Map<String, dynamic>? _currentSubscription;
  bool _isLoading = false;

  Map<String, dynamic>? get currentSubscription => _currentSubscription;
  bool get isLoading => _isLoading;
  bool get hasActiveSubscription => _currentSubscription?['isActive'] ?? false;
  bool get isPremium => _currentSubscription?['isPremium'] ?? false;
  String get subscriptionTier => _currentSubscription?['tier'] ?? 'free';
  bool get isTrialActive => _currentSubscription?['isTrialActive'] ?? false;
  bool get canAccessPremiumFeatures => isPremium || isTrialActive;

  // Abonelik bilgilerini getir
  Future<void> loadSubscription() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiClient.get('/subscription/current');
      _currentSubscription = response['subscription'];
    } catch (e) {
      debugPrint('Abonelik bilgileri yükleme hatası: $e');
      _currentSubscription = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Abonelik oluştur
  Future<bool> createSubscription(String planId) async {
    try {
      await _apiClient.post('/subscription/create', {
        'planId': planId,
      });
      await loadSubscription(); // Abonelik bilgilerini yenile
      return true;
    } catch (e) {
      debugPrint('Abonelik oluşturma hatası: $e');
      return false;
    }
  }

  // Aboneliği iptal et
  Future<bool> cancelSubscription() async {
    try {
      await _apiClient.post('/subscription/cancel', {});
      await loadSubscription(); // Abonelik bilgilerini yenile
      return true;
    } catch (e) {
      debugPrint('Abonelik iptal etme hatası: $e');
      return false;
    }
  }

  // Premium'a yükselt
  Future<void> upgradeToPremium() async {
    try {
      await _apiClient.post('/subscription/upgrade', {});
      await loadSubscription();
    } catch (e) {
      debugPrint('Premium yükseltme hatası: $e');
    }
  }

  // Deneme sürümünü başlat
  Future<void> startUserTrial() async {
    try {
      await _apiClient.post('/subscription/start-trial', {});
      await loadSubscription();
    } catch (e) {
      debugPrint('Deneme sürümü başlatma hatası: $e');
    }
  }

  // Kurucu üyeliğe katıl
  Future<void> joinFounderMembership() async {
    try {
      await _apiClient.post('/subscription/join-founder', {});
      await loadSubscription();
    } catch (e) {
      debugPrint('Kurucu üyelik hatası: $e');
    }
  }
}
