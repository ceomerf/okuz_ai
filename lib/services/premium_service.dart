// JWT Backend için Premium Service
// Freemium Abonelik Sistemi

import 'package:flutter/material.dart';
import 'api_client.dart';

enum SubscriptionStatus {
  TRIAL,
  FREE,
  PREMIUM,
  FAMILY,
  CANCELLED,
}

enum SubscriptionPlan {
  MONTHLY_PREMIUM,
  YEARLY_PREMIUM,
  FAMILY_PLAN,
}

class SubscriptionStatusResponse {
  final SubscriptionStatus status;
  final bool isTrialActive;
  final DateTime? trialEndDate;
  final DateTime? subscriptionEndDate;
  final SubscriptionPlan? planType;
  final List<String> features;

  SubscriptionStatusResponse({
    required this.status,
    required this.isTrialActive,
    this.trialEndDate,
    this.subscriptionEndDate,
    this.planType,
    required this.features,
  });

  factory SubscriptionStatusResponse.fromJson(Map<String, dynamic> json) {
    return SubscriptionStatusResponse(
      status: SubscriptionStatus.values.firstWhere(
        (e) => e.toString().split('.').last == json['status'],
        orElse: () => SubscriptionStatus.FREE,
      ),
      isTrialActive: json['isTrialActive'] ?? false,
      trialEndDate: json['trialEndDate'] != null 
          ? DateTime.parse(json['trialEndDate']) 
          : null,
      subscriptionEndDate: json['subscriptionEndDate'] != null 
          ? DateTime.parse(json['subscriptionEndDate']) 
          : null,
      planType: json['planType'] != null 
          ? SubscriptionPlan.values.firstWhere(
              (e) => e.toString().split('.').last == json['planType'],
              orElse: () => SubscriptionPlan.MONTHLY_PREMIUM,
            )
          : null,
      features: List<String>.from(json['features'] ?? []),
    );
  }
}

class PremiumService {
  final ApiClient _apiClient;
  PremiumService(this._apiClient);

  // Kullanıcının subscription durumunu getir
  Future<SubscriptionStatusResponse?> getSubscriptionStatus() async {
    try {
      final response = await _apiClient.get('/subscription/status');
      
      if (response['success'] == true && response['data'] != null) {
        return SubscriptionStatusResponse.fromJson(response['data']);
      }
      
      return null;
    } catch (e) {
      // 401 gibi yetkisiz durumlarda sessizce null dön
      debugPrint('Subscription durumu kontrol hatası (yoksayılıyor): $e');
      return null;
    }
  }

  // Trial başlat
  Future<bool> startTrial() async {
    try {
      final response = await _apiClient.post('/subscription/start-trial', {});
      return response['success'] ?? false;
    } catch (e) {
      debugPrint('Trial başlatma hatası: $e');
      return false;
    }
  }

  // Premium subscription oluştur
  Future<Map<String, dynamic>?> createSubscription({
    required SubscriptionPlan planType,
    required String paymentMethod,
    required double amount,
    String currency = 'TRY',
  }) async {
    try {
      final response = await _apiClient.post('/subscription/create', {
        'planType': planType.toString().split('.').last,
        'paymentMethod': paymentMethod,
        'amount': amount,
        'currency': currency,
      });
      
      if (response['success'] == true) {
        return response['data'];
      }
      
      return null;
    } catch (e) {
      debugPrint('Subscription oluşturma hatası: $e');
      return null;
    }
  }

  // Premium kullanıcı kontrolü (eski API uyumluluğu)
  Future<bool> isPremiumUser() async {
    try {
      final status = await getSubscriptionStatus();
      return status?.status == SubscriptionStatus.PREMIUM || 
             status?.status == SubscriptionStatus.FAMILY ||
             (status?.status == SubscriptionStatus.TRIAL && status?.isTrialActive == true);
    } catch (e) {
      debugPrint('Premium kullanıcı kontrol hatası: $e');
      return false;
    }
  }

  // Premium'a yükselt (eski API uyumluluğu)
  Future<bool> upgradeToPremium() async {
    try {
      final result = await createSubscription(
        planType: SubscriptionPlan.MONTHLY_PREMIUM,
        paymentMethod: 'credit_card',
        amount: 99.99,
      );
      return result != null;
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

  // Trial süresi kontrolü
  Future<bool> isTrialExpired() async {
    try {
      final response = await _apiClient.get('/subscription/trial-expired');
      return response['isExpired'] ?? false;
    } catch (e) {
      debugPrint('Trial süresi kontrol hatası: $e');
      return true;
    }
  }

  // Subscription geçmişini getir
  Future<List<Map<String, dynamic>>> getSubscriptionHistory() async {
    try {
      final response = await _apiClient.get('/subscription/history');
      
      if (response['success'] == true && response['data'] != null) {
        return List<Map<String, dynamic>>.from(response['data']);
      }
      
      return [];
    } catch (e) {
      debugPrint('Subscription geçmişi getirme hatası: $e');
      return [];
    }
  }

  // Payment geçmişini getir
  Future<List<Map<String, dynamic>>> getPaymentHistory() async {
    try {
      final response = await _apiClient.get('/subscription/payment-history');
      
      if (response['success'] == true && response['data'] != null) {
        return List<Map<String, dynamic>>.from(response['data']);
      }
      
      return [];
    } catch (e) {
      debugPrint('Payment geçmişi getirme hatası: $e');
      return [];
    }
  }

  // Subscription'ı iptal et
  Future<bool> cancelSubscription(String subscriptionId) async {
    try {
      final response = await _apiClient.delete('/subscription/$subscriptionId');
      return response['success'] ?? false;
    } catch (e) {
      debugPrint('Subscription iptal hatası: $e');
      return false;
    }
  }

  // Subscription'ı yenile
  Future<bool> renewSubscription(String subscriptionId) async {
    try {
      final response = await _apiClient.put('/subscription/$subscriptionId/renew', {});
      return response['success'] ?? false;
    } catch (e) {
      debugPrint('Subscription yenileme hatası: $e');
      return false;
    }
  }

  // Premium özelliği ekle (eski API uyumluluğu)
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

  // Premium özelliği kaldır (eski API uyumluluğu)
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

  // Kullanıcının premium durumunu kontrol et ve gerekirse paywall göster
  Future<bool> shouldShowPaywall() async {
    try {
      final status = await getSubscriptionStatus();
      
      if (status == null) return false;
      
      // Trial süresi bittiyse ve FREE durumundaysa paywall göster
      if (status.status == SubscriptionStatus.FREE && !status.isTrialActive) {
        return true;
      }
      
      // Premium süresi bittiyse paywall göster
      if (status.status == SubscriptionStatus.PREMIUM && 
          status.subscriptionEndDate != null &&
          status.subscriptionEndDate!.isBefore(DateTime.now())) {
        return true;
      }
      
      return false;
    } catch (e) {
      debugPrint('Paywall kontrol hatası: $e');
      return false;
    }
  }

  // Kullanıcının premium özelliklere erişimi var mı kontrol et
  Future<bool> hasPremiumAccess({String? feature}) async {
    try {
      final status = await getSubscriptionStatus();
      
      if (status == null) return false;
      
      // Trial veya Premium durumunda tüm özellikler açık
      if (status.status == SubscriptionStatus.TRIAL || 
          status.status == SubscriptionStatus.PREMIUM ||
          status.status == SubscriptionStatus.FAMILY) {
        return true;
      }
      
      // FREE durumunda sadece temel özellikler
      if (status.status == SubscriptionStatus.FREE) {
        const freeFeatures = ['basic_plan', 'limited_ai_tools', 'basic_analytics'];
        return feature == null || freeFeatures.contains(feature);
      }
      
      return false;
    } catch (e) {
      debugPrint('Premium erişim kontrol hatası: $e');
      return false;
    }
  }
}
