import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/subscription_provider.dart';
import '../screens/subscription_screen.dart';

/// Premium özellikleri kilitleyen widget
class PremiumFeatureLock extends StatelessWidget {
  final Widget child;
  final String featureName;
  final String? customMessage;
  final bool showLockIcon;

  const PremiumFeatureLock({
    Key? key,
    required this.child,
    required this.featureName,
    this.customMessage,
    this.showLockIcon = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<SubscriptionProvider>(
      builder: (context, subscriptionProvider, _) {
        final canAccess = subscriptionProvider.canAccessPremiumFeatures;

        if (canAccess) {
          return child;
        }

        return GestureDetector(
          onTap: () => _showSubscriptionDialog(context),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: Colors.grey.shade100,
              border: Border.all(
                color: Colors.grey.shade300,
                width: 1,
              ),
            ),
            child: Stack(
              children: [
                // Bulanıklaştırılmış içerik
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: ColorFiltered(
                    colorFilter: ColorFilter.mode(
                      Colors.grey.withOpacity(0.3),
                      BlendMode.saturation,
                    ),
                    child: child,
                  ),
                ),
                // Kilit overlay'i
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: Colors.black.withOpacity(0.1),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (showLockIcon)
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.orange.shade600,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.lock,
                              color: Colors.white,
                              size: 24,
                            ),
                          ),
                        const SizedBox(height: 8),
                        Text(
                          customMessage ?? '$featureName özelliği',
                          style: GoogleFonts.figtree(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey.shade700,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Premium abonelik gereklidir',
                          style: GoogleFonts.figtree(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.orange.shade600,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Text(
                            'Premium\'a Geç',
                            style: GoogleFonts.figtree(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showSubscriptionDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const SubscriptionScreen(),
    );
  }
}

/// Premium buton widget'ı
class PremiumButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final String? featureName;

  const PremiumButton({
    Key? key,
    required this.text,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.featureName,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<SubscriptionProvider>(
      builder: (context, subscriptionProvider, _) {
        final canAccess = subscriptionProvider.canAccessPremiumFeatures;

        if (!canAccess) {
          return GestureDetector(
            onTap: () => _showSubscriptionDialog(context),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Colors.grey.shade300,
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.lock,
                    size: 16,
                    color: Colors.grey.shade600,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    text,
                    style: GoogleFonts.figtree(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        return ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.orange.shade600,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          child: isLoading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (icon != null) ...[
                      Icon(icon, size: 16),
                      const SizedBox(width: 8),
                    ],
                    Text(
                      text,
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
        );
      },
    );
  }

  void _showSubscriptionDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const SubscriptionScreen(),
    );
  }
}
