import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';

class XPNotificationWidget extends StatefulWidget {
  final int xpGained;
  final int totalXP;
  final bool leveledUp;
  final int? oldLevel;
  final int? newLevel;
  final String studyType;
  final VoidCallback? onComplete;

  const XPNotificationWidget({
    super.key,
    required this.xpGained,
    required this.totalXP,
    this.leveledUp = false,
    this.oldLevel,
    this.newLevel,
    required this.studyType,
    this.onComplete,
  });

  /// Static method to show XP notification overlay
  static void show(BuildContext context, int xpGained, String message) {
    final overlay = Overlay.of(context);
    late OverlayEntry overlayEntry;

    overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        top: 100,
        left: 20,
        right: 20,
        child: Material(
          color: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.primaryColor, AppTheme.accentColor],
              ),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primaryColor.withOpacity(0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.emoji_events,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '+$xpGained XP',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        message,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    overlay.insert(overlayEntry);

    // Remove after 3 seconds
    Future.delayed(const Duration(seconds: 3), () {
      overlayEntry.remove();
    });
  }

  @override
  State<XPNotificationWidget> createState() => _XPNotificationWidgetState();
}

class _XPNotificationWidgetState extends State<XPNotificationWidget>
    with TickerProviderStateMixin {
  late AnimationController _scaleController;
  late AnimationController _xpController;
  late AnimationController _levelController;
  late AnimationController _confettiController;

  late Animation<double> _scaleAnimation;
  late Animation<double> _xpAnimation;
  late Animation<double> _levelAnimation;
  late Animation<double> _confettiAnimation;

  late Animation<Color?> _colorAnimation;

  @override
  void initState() {
    super.initState();

    _scaleController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _xpController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );

    _levelController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );

    _confettiController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _scaleController,
      curve: Curves.elasticOut,
    ));

    _xpAnimation = Tween<double>(
      begin: 0.0,
      end: widget.xpGained.toDouble(),
    ).animate(CurvedAnimation(
      parent: _xpController,
      curve: Curves.easeOutBack,
    ));

    _levelAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _levelController,
      curve: Curves.bounceOut,
    ));

    _confettiAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _confettiController,
      curve: Curves.easeOut,
    ));

    _colorAnimation = ColorTween(
      begin: AppTheme.primaryColor,
      end: AppTheme.accentColor,
    ).animate(_xpController);

    _startAnimations();
  }

  @override
  void dispose() {
    _scaleController.dispose();
    _xpController.dispose();
    _levelController.dispose();
    _confettiController.dispose();
    super.dispose();
  }

  Future<void> _startAnimations() async {
    // Haptic feedback
    HapticFeedback.mediumImpact();

    // Scale in animation
    await _scaleController.forward();

    // XP gain animation
    await _xpController.forward();

    if (widget.leveledUp) {
      // Level up animation with extra effects
      HapticFeedback.heavyImpact();
      _confettiController.forward();
      await _levelController.forward();
    }

    // Auto close after delay
    await Future.delayed(const Duration(milliseconds: 1500));

    if (widget.onComplete != null) {
      widget.onComplete!();
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([
        _scaleAnimation,
        _xpAnimation,
        _levelAnimation,
        _confettiAnimation,
        _colorAnimation,
      ]),
      builder: (context, child) {
        return Stack(
          children: [
            // Confetti background (if level up)
            if (widget.leveledUp) _buildConfettiBackground(),

            // Main notification card
            Center(
              child: Transform.scale(
                scale: _scaleAnimation.value,
                child: Container(
                  width: MediaQuery.of(context).size.width * 0.85,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: (_colorAnimation.value ?? AppTheme.primaryColor)
                            .withOpacity(0.3),
                        blurRadius: 20,
                        spreadRadius: 5,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Success icon
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: RadialGradient(
                            colors: [
                              (_colorAnimation.value ?? AppTheme.primaryColor)
                                  .withOpacity(0.8),
                              (_colorAnimation.value ?? AppTheme.primaryColor),
                            ],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: (_colorAnimation.value ??
                                      AppTheme.primaryColor)
                                  .withOpacity(0.4),
                              blurRadius: 15,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: Icon(
                          widget.leveledUp ? Icons.military_tech : Icons.star,
                          size: 40,
                          color: Colors.white,
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Title
                      Text(
                        widget.leveledUp ? 'Level Atladın!' : 'Harika Çalışma!',
                        style:
                            Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: _colorAnimation.value ??
                                      AppTheme.primaryColor,
                                ),
                        textAlign: TextAlign.center,
                      ),

                      const SizedBox(height: 8),

                      // Study type info
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppTheme.accentColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          widget.studyType,
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppTheme.accentColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                        ),
                      ),

                      const SizedBox(height: 20),

                      // XP gain animation
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.trending_up,
                            color:
                                _colorAnimation.value ?? AppTheme.primaryColor,
                            size: 28,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '+${_xpAnimation.value.floor()}',
                            style: Theme.of(context)
                                .textTheme
                                .headlineMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: _colorAnimation.value ??
                                      AppTheme.primaryColor,
                                ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'XP',
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: (_colorAnimation.value ??
                                          AppTheme.primaryColor)
                                      .withOpacity(0.8),
                                ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // Total XP info
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Theme.of(context).brightness == Brightness.dark
                              ? Colors.white.withOpacity(0.05)
                              : Colors.black.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Toplam XP',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.w500,
                                  ),
                            ),
                            Text(
                              '${widget.totalXP}',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyLarge
                                  ?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: _colorAnimation.value ??
                                        AppTheme.primaryColor,
                                  ),
                            ),
                          ],
                        ),
                      ),

                      // Level up info (if applicable)
                      if (widget.leveledUp) ...[
                        const SizedBox(height: 16),
                        Transform.scale(
                          scale: _levelAnimation.value,
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  AppTheme.accentColor.withOpacity(0.8),
                                  AppTheme.primaryColor.withOpacity(0.8),
                                ],
                              ),
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.accentColor.withOpacity(0.3),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.arrow_upward,
                                  color: Colors.white,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Level ${widget.oldLevel} → ${widget.newLevel}',
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],

                      const SizedBox(height: 20),

                      // Progress indicator
                      LinearProgressIndicator(
                        value: _xpAnimation.value / widget.xpGained,
                        backgroundColor:
                            (_colorAnimation.value ?? AppTheme.primaryColor)
                                .withOpacity(0.2),
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _colorAnimation.value ?? AppTheme.primaryColor,
                        ),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildConfettiBackground() {
    return Positioned.fill(
      child: CustomPaint(
        painter: ConfettiPainter(_confettiAnimation.value),
      ),
    );
  }
}

class ConfettiPainter extends CustomPainter {
  final double progress;
  final List<Color> colors = [
    AppTheme.primaryColor,
    AppTheme.accentColor,
    AppTheme.successColor,
    AppTheme.warningColor,
  ];

  ConfettiPainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint();

    for (int i = 0; i < 50; i++) {
      final x = (i * 37.0) % size.width;
      final y = (progress * size.height * 1.5) - (i * 10.0);
      final color = colors[i % colors.length];

      if (y > -20 && y < size.height + 20) {
        paint.color = color.withOpacity(0.8);

        // Draw different shapes
        if (i % 3 == 0) {
          // Circle
          canvas.drawCircle(Offset(x, y), 3.0, paint);
        } else if (i % 3 == 1) {
          // Square
          canvas.drawRect(
            Rect.fromCenter(center: Offset(x, y), width: 6, height: 6),
            paint,
          );
        } else {
          // Triangle
          final path = Path();
          path.moveTo(x, y - 3);
          path.lineTo(x - 3, y + 3);
          path.lineTo(x + 3, y + 3);
          path.close();
          canvas.drawPath(path, paint);
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant ConfettiPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

// Helper function to show XP notification
void showXPNotification(
  BuildContext context, {
  required int xpGained,
  required int totalXP,
  bool leveledUp = false,
  int? oldLevel,
  int? newLevel,
  required String studyType,
}) {
  showDialog(
    context: context,
    barrierDismissible: false,
    barrierColor: Colors.black.withOpacity(0.7),
    builder: (context) => XPNotificationWidget(
      xpGained: xpGained,
      totalXP: totalXP,
      leveledUp: leveledUp,
      oldLevel: oldLevel,
      newLevel: newLevel,
      studyType: studyType,
      onComplete: () => Navigator.of(context).pop(),
    ),
  );
}
