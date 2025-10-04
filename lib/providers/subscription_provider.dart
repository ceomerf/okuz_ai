import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:equatable/equatable.dart';
import '../services/providers.dart';

class SubscriptionState extends Equatable {
  final Map<String, dynamic>? currentSubscription;
  final bool isLoading;
  final String? errorMessage;

  const SubscriptionState({
    this.currentSubscription,
    this.isLoading = false,
    this.errorMessage,
  });

  bool get hasActiveSubscription => currentSubscription?['isActive'] ?? false;
  bool get isPremium => currentSubscription?['isPremium'] ?? false;
  String get subscriptionTier => currentSubscription?['tier'] ?? 'free';
  bool get isTrialActive => currentSubscription?['isTrialActive'] ?? false;
  bool get canAccessPremiumFeatures => isPremium || isTrialActive;

  SubscriptionState copyWith({
    Map<String, dynamic>? currentSubscription,
    bool? isLoading,
    String? errorMessage,
  }) {
    return SubscriptionState(
      currentSubscription: currentSubscription ?? this.currentSubscription,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [currentSubscription, isLoading, errorMessage];
}

class SubscriptionNotifier extends StateNotifier<SubscriptionState> {
  final Ref _ref;
  SubscriptionNotifier(this._ref) : super(const SubscriptionState());

  Future<void> loadSubscription() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final api = _ref.read(apiClientProvider);
      final response = await api.get('/subscription/current');
      state = state.copyWith(
        isLoading: false,
        currentSubscription: response['subscription'] as Map<String, dynamic>?,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<bool> createSubscription(String planId) async {
    try {
      final api = _ref.read(apiClientProvider);
      await api.post('/subscription/create', {'planId': planId});
      await loadSubscription();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> cancelSubscription() async {
    try {
      final api = _ref.read(apiClientProvider);
      await api.post('/subscription/cancel', {});
      await loadSubscription();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> upgradeToPremium() async {
    try {
      final api = _ref.read(apiClientProvider);
      await api.post('/subscription/upgrade', {});
      await loadSubscription();
    } catch (_) {}
  }

  Future<void> startUserTrial() async {
    try {
      final api = _ref.read(apiClientProvider);
      await api.post('/subscription/start-trial', {});
      await loadSubscription();
    } catch (_) {}
  }

  Future<void> joinFounderMembership() async {
    try {
      final api = _ref.read(apiClientProvider);
      await api.post('/subscription/join-founder', {});
      await loadSubscription();
    } catch (_) {}
  }
}

final subscriptionNotifierProvider =
    StateNotifierProvider<SubscriptionNotifier, SubscriptionState>((ref) {
  return SubscriptionNotifier(ref);
});

