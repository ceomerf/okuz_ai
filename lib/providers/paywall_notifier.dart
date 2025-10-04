import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/state/paywall_state.dart';
import '../services/premium_service.dart';
import 'premium_service_provider.dart';

class PaywallNotifier extends StateNotifier<PaywallState> {
  final PremiumService _premiumService;

  PaywallNotifier._(this._premiumService) : super(const PaywallState());
  factory PaywallNotifier(Ref ref) {
    final premium = ref.read(premiumServiceProvider);
    return PaywallNotifier._(premium);
  }

  Future<void> checkPremiumStatus() async {
    state = state.copyWith(isLoading: true);
    try {
      final status = await _premiumService.getSubscriptionStatus();
      state = state.copyWith(isLoading: false, currentStatus: status);
      await _checkPaywallStatus();
    } catch (e) {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> _checkPaywallStatus() async {
    try {
      final shouldShow = await _premiumService.shouldShowPaywall();
      String? reason;
      if (shouldShow) {
        if (state.currentStatus?.status == SubscriptionStatus.FREE) {
          reason = 'Deneme süreniz sona erdi. Okuz AI\'ın tüm potansiyelini ortaya çıkarmak için bir pakete abone olun.';
        } else if (state.currentStatus?.status == SubscriptionStatus.PREMIUM &&
            state.currentStatus?.subscriptionEndDate != null &&
            state.currentStatus!.subscriptionEndDate!.isBefore(DateTime.now())) {
          reason = 'Premium aboneliğiniz sona erdi. Hizmetlerimize devam etmek için aboneliğinizi yenileyin.';
        } else {
          reason = 'Premium özelliklere erişmek için abone olun.';
        }
      }
      state = state.copyWith(shouldShowPaywall: shouldShow, paywallReason: reason);
    } catch (_) {}
  }

  void hidePaywall() {
    state = state.copyWith(shouldShowPaywall: false, paywallReason: null);
  }

  Future<bool> hasPremiumAccess({String? feature}) async {
    try {
      return await _premiumService.hasPremiumAccess(feature: feature);
    } catch (_) {
      return false;
    }
  }

  Future<bool> isTrialExpired() async {
    try {
      return await _premiumService.isTrialExpired();
    } catch (_) {
      return true;
    }
  }

  Future<bool> isPremiumUser() async {
    try {
      return await _premiumService.isPremiumUser();
    } catch (_) {
      return false;
    }
  }

  Future<void> refreshStatus() async {
    await checkPremiumStatus();
  }
}

final paywallNotifierProvider = StateNotifierProvider<PaywallNotifier, PaywallState>((ref) {
  return PaywallNotifier(ref);
});


