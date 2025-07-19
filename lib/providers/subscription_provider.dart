import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:async';
import '../services/subscription_service.dart';

/// Subscription durumunu yöneten Provider
class SubscriptionProvider extends ChangeNotifier {
  final SubscriptionService _subscriptionService = SubscriptionService();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Stream subscriptions
  StreamSubscription<DocumentSnapshot>? _subscriptionSubscription;
  StreamSubscription<User?>? _authSubscription;

  // Cached data
  SubscriptionStatus? _cachedSubscriptionStatus;
  bool _isInitialized = false;
  bool _isLoading = true;

  // Getters
  SubscriptionStatus? get subscriptionStatus => _cachedSubscriptionStatus;
  bool get isInitialized => _isInitialized;
  bool get isLoading => _isLoading;
  bool get isPremium => _cachedSubscriptionStatus?.isPremium ?? false;
  bool get isTrialActive => _cachedSubscriptionStatus?.isTrialActive ?? false;
  bool get canAccessPremiumFeatures =>
      _cachedSubscriptionStatus?.canAccessPremiumFeatures ?? false;
  String get subscriptionTier =>
      _cachedSubscriptionStatus?.subscriptionTier ?? 'free';
  int get remainingTrialDays =>
      _cachedSubscriptionStatus?.remainingTrialDays ?? 0;
  double get trialProgressPercentage =>
      _cachedSubscriptionStatus?.trialProgressPercentage ?? 0.0;

  SubscriptionProvider() {
    _initialize();
  }

  void _initialize() {
    _authSubscription = _auth.authStateChanges().listen((user) {
      if (user != null) {
        _setupSubscriptionStream();
      } else {
        _disposeSubscriptions();
        _resetState();
      }
    });
  }

  void _setupSubscriptionStream() {
    final user = _auth.currentUser;
    if (user == null) return;

    _subscriptionSubscription =
        _firestore.doc('users/${user.uid}').snapshots().listen(
      (snapshot) {
        if (snapshot.exists) {
          try {
            final data = snapshot.data() as Map<String, dynamic>?;
            final subscription = data?['subscription'] as Map<String, dynamic>?;

            if (subscription != null) {
              final now = DateTime.now();
              final trialEndDate = subscription['trialEndDate'] as Timestamp?;
              final isTrialActive =
                  trialEndDate != null && now.isBefore(trialEndDate.toDate());

              final subscriptionTier =
                  subscription['subscriptionTier'] ?? 'free';
              final isPremium = subscriptionTier != 'free' || isTrialActive;

              _cachedSubscriptionStatus = SubscriptionStatus(
                hasSubscription: true,
                isTrialActive: isTrialActive,
                isPremium: isPremium,
                subscriptionTier: subscriptionTier,
                canAccessPremiumFeatures: isPremium,
                trialEndDate: trialEndDate?.toDate(),
                subscriptionEndDate:
                    subscription['subscriptionEndDate']?.toDate(),
              );
            } else {
              _cachedSubscriptionStatus = SubscriptionStatus(
                hasSubscription: false,
                isTrialActive: false,
                isPremium: false,
                subscriptionTier: 'free',
                canAccessPremiumFeatures: false,
              );
            }

            if (!_isInitialized) {
              _isInitialized = true;
              _isLoading = false;
            }

            notifyListeners();
          } catch (e) {
            debugPrint('Subscription data parse error: $e');
            _createDefaultSubscriptionStatus();
          }
        } else {
          _createDefaultSubscriptionStatus();
        }
      },
      onError: (error) {
        debugPrint('Subscription stream error: $error');
        _createDefaultSubscriptionStatus();
        _isLoading = false;
        notifyListeners();
      },
    );
  }

  void _createDefaultSubscriptionStatus() {
    _cachedSubscriptionStatus = SubscriptionStatus(
      hasSubscription: false,
      isTrialActive: false,
      isPremium: false,
      subscriptionTier: 'free',
      canAccessPremiumFeatures: false,
    );
  }

  void _resetState() {
    _cachedSubscriptionStatus = null;
    _isInitialized = false;
    _isLoading = true;
    notifyListeners();
  }

  void _disposeSubscriptions() {
    _subscriptionSubscription?.cancel();
    _subscriptionSubscription = null;
  }

  /// Premium özelliklere erişim kontrolü
  Future<bool> checkPremiumAccess({String? feature}) async {
    return await _subscriptionService.checkPremiumAccess(feature: feature);
  }

  /// Kullanıcıyı premium yapar (test amaçlı)
  Future<bool> upgradeToPremium({String tier = 'ai_pro'}) async {
    final success = await _subscriptionService.upgradeToPremium(tier: tier);
    if (success) {
      // State'i manuel olarak güncelle
      await _refreshSubscriptionStatus();
    }
    return success;
  }

  /// Trial başlatır
  Future<bool> startUserTrial() async {
    final success = await _subscriptionService.startUserTrial();
    if (success) {
      // State'i manuel olarak güncelle
      await _refreshSubscriptionStatus();
    }
    return success;
  }

  /// Kurucu üye olarak kaydol
  Future<Map<String, dynamic>?> joinFounderMembership() async {
    try {
      final result = await _subscriptionService.joinFounderMembership();
      if (result != null && result['success'] == true) {
        await _refreshSubscriptionStatus();
      }
      return result;
    } catch (e) {
      debugPrint('Kurucu üye kayıt hatası: $e');
      return null;
    }
  }

  /// Subscription durumunu manuel olarak yeniler
  Future<void> _refreshSubscriptionStatus() async {
    try {
      final status = await _subscriptionService.checkSubscriptionStatus();
      _cachedSubscriptionStatus = status;
      notifyListeners();
    } catch (e) {
      debugPrint('Subscription status refresh error: $e');
    }
  }

  /// Provider'ı manuel olarak refresh et
  Future<void> refresh() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _refreshSubscriptionStatus();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _disposeSubscriptions();
    _authSubscription?.cancel();
    super.dispose();
  }
}
