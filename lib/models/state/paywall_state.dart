import 'package:equatable/equatable.dart';
import 'package:meta/meta.dart';
import 'package:okuz_ai/services/premium_service.dart';

@immutable
class PaywallState extends Equatable {
  final bool isLoading;
  final bool shouldShowPaywall;
  final String? paywallReason;
  final SubscriptionStatusResponse? currentStatus;

  const PaywallState({
    this.isLoading = false,
    this.shouldShowPaywall = false,
    this.paywallReason,
    this.currentStatus,
  });

  PaywallState copyWith({
    bool? isLoading,
    bool? shouldShowPaywall,
    String? paywallReason,
    SubscriptionStatusResponse? currentStatus,
  }) {
    return PaywallState(
      isLoading: isLoading ?? this.isLoading,
      shouldShowPaywall: shouldShowPaywall ?? this.shouldShowPaywall,
      paywallReason: paywallReason ?? this.paywallReason,
      currentStatus: currentStatus ?? this.currentStatus,
    );
  }

  @override
  List<Object?> get props => [isLoading, shouldShowPaywall, paywallReason, currentStatus];
}


