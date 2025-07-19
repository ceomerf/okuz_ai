import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'dart:developer' as developer;

/// Subscription durumunu temsil eden sınıf
class SubscriptionStatus {
  final bool hasSubscription;
  final bool isTrialActive;
  final bool isPremium;
  final String subscriptionTier;
  final bool canAccessPremiumFeatures;
  final DateTime? trialEndDate;
  final DateTime? subscriptionEndDate;

  SubscriptionStatus({
    required this.hasSubscription,
    required this.isTrialActive,
    required this.isPremium,
    required this.subscriptionTier,
    required this.canAccessPremiumFeatures,
    this.trialEndDate,
    this.subscriptionEndDate,
  });

  factory SubscriptionStatus.fromJson(Map<String, dynamic> json) {
    return SubscriptionStatus(
      hasSubscription: json['hasSubscription'] ?? false,
      isTrialActive: json['isTrialActive'] ?? false,
      isPremium: json['isPremium'] ?? false,
      subscriptionTier: json['subscriptionTier'] ?? 'free',
      canAccessPremiumFeatures: json['canAccessPremiumFeatures'] ?? false,
      trialEndDate: json['trialEndDate'] != null
          ? DateTime.parse(json['trialEndDate'])
          : null,
      subscriptionEndDate: json['subscriptionEndDate'] != null
          ? DateTime.parse(json['subscriptionEndDate'])
          : null,
    );
  }

  /// Trial süresinin kalan gün sayısını hesaplar
  int get remainingTrialDays {
    if (!isTrialActive || trialEndDate == null) return 0;
    final now = DateTime.now();
    final difference = trialEndDate!.difference(now).inDays;
    return difference > 0 ? difference : 0;
  }

  /// Trial süresinin yüzde kaçının kullanıldığını hesaplar
  double get trialProgressPercentage {
    if (!isTrialActive || trialEndDate == null) return 0.0;
    final now = DateTime.now();
    final totalDays = 7; // 7 günlük trial
    final usedDays = now
        .difference(trialEndDate!.subtract(Duration(days: totalDays)))
        .inDays;
    return (usedDays / totalDays * 100).clamp(0.0, 100.0);
  }
}

/// Subscription yönetimi için servis sınıfı
class SubscriptionService {
  static final SubscriptionService _instance = SubscriptionService._internal();
  factory SubscriptionService() => _instance;
  SubscriptionService._internal();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  /// Kullanıcının subscription durumunu kontrol eder
  Future<SubscriptionStatus> checkSubscriptionStatus() async {
    try {
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }

      final callable = _functions.httpsCallable('checkSubscriptionStatus');
      final result = await callable.call();

      return SubscriptionStatus.fromJson(result.data);
    } catch (e) {
      developer.log('Subscription durumu kontrol hatası: $e');
      // Hata durumunda varsayılan değer döndür
      return SubscriptionStatus(
        hasSubscription: false,
        isTrialActive: false,
        isPremium: false,
        subscriptionTier: 'free',
        canAccessPremiumFeatures: false,
      );
    }
  }

  /// Subscription durumunu Stream olarak dinler
  Stream<SubscriptionStatus> subscriptionStatusStream() {
    final user = _auth.currentUser;
    if (user == null) {
      return Stream.value(SubscriptionStatus(
        hasSubscription: false,
        isTrialActive: false,
        isPremium: false,
        subscriptionTier: 'free',
        canAccessPremiumFeatures: false,
      ));
    }

    return _firestore.doc('users/${user.uid}').snapshots().map((doc) {
      if (doc.exists) {
        final data = doc.data() as Map<String, dynamic>?;
        final subscription = data?['subscription'] as Map<String, dynamic>?;

        if (subscription != null) {
          final now = DateTime.now();
          final trialEndDate = subscription['trialEndDate'] as Timestamp?;
          final isTrialActive =
              trialEndDate != null && now.isBefore(trialEndDate.toDate());

          final subscriptionTier = subscription['subscriptionTier'] ?? 'free';
          final isPremium = subscriptionTier != 'free' || isTrialActive;

          return SubscriptionStatus(
            hasSubscription: true,
            isTrialActive: isTrialActive,
            isPremium: isPremium,
            subscriptionTier: subscriptionTier,
            canAccessPremiumFeatures: isPremium,
            trialEndDate: trialEndDate?.toDate(),
            subscriptionEndDate: subscription['subscriptionEndDate']?.toDate(),
          );
        }
      }

      return SubscriptionStatus(
        hasSubscription: false,
        isTrialActive: false,
        isPremium: false,
        subscriptionTier: 'free',
        canAccessPremiumFeatures: false,
      );
    });
  }

  /// Premium özelliklere erişim kontrolü
  Future<bool> checkPremiumAccess({String? feature}) async {
    try {
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }

      final callable = _functions.httpsCallable('checkPremiumAccess');
      final result = await callable.call({'feature': feature});

      return result.data['canAccess'] ?? false;
    } catch (e) {
      developer.log('Premium erişim kontrolü hatası: $e');
      return false;
    }
  }

  /// Kullanıcıyı premium yapar (test amaçlı)
  Future<bool> upgradeToPremium({String tier = 'ai_pro'}) async {
    try {
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }

      final callable = _functions.httpsCallable('upgradeToPremium');
      final result = await callable.call({'tier': tier});

      return result.data['success'] ?? false;
    } catch (e) {
      developer.log('Premium yükseltme hatası: $e');
      return false;
    }
  }

  /// Trial başlatır
  Future<bool> startUserTrial() async {
    try {
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }

      final callable = _functions.httpsCallable('startUserTrial');
      final result = await callable.call();

      return result.data['success'] ?? false;
    } catch (e) {
      developer.log('Trial başlatma hatası: $e');
      return false;
    }
  }

  /// Kurucu üye olarak kaydol
  Future<Map<String, dynamic>?> joinFounderMembership() async {
    try {
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }

      final callable = _functions.httpsCallable('joinFounderMembership');
      final result = await callable.call();

      return result.data;
    } catch (e) {
      developer.log('Kurucu üye kayıt hatası: $e');
      return null;
    }
  }

  /// Kurucu üye sayısını getir
  Future<Map<String, dynamic>?> getFounderMemberCount() async {
    try {
      final callable = _functions.httpsCallable('getFounderMemberCount');
      final result = await callable.call();

      return result.data;
    } catch (e) {
      developer.log('Kurucu üye sayısı getirme hatası: $e');
      return null;
    }
  }

  /// Authentication helper method
  Future<String?> _ensureAuthenticated() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception(
          'Bu işlemi gerçekleştirmek için giriş yapmanız gerekiyor.');
    }

    try {
      await user.reload();
      final refreshedUser = _auth.currentUser;
      if (refreshedUser == null) {
        throw Exception(
            'Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      final token = await refreshedUser.getIdToken(true);
      return token;
    } catch (e) {
      developer.log('Token yenileme hatası: $e');
      throw Exception('Kimlik doğrulama hatası: $e');
    }
  }
}
