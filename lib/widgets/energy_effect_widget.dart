import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/study_data_provider.dart';

class EnergyEffectWidget extends StatefulWidget {
  final Widget child;
  final bool enabled;
  final double intensity;
  final Color? effectColor;

  const EnergyEffectWidget({
    Key? key,
    required this.child,
    this.enabled = true,
    this.intensity = 0.6,
    this.effectColor,
  }) : super(key: key);

  @override
  State<EnergyEffectWidget> createState() => _EnergyEffectWidgetState();
}

class _EnergyEffectWidgetState extends State<EnergyEffectWidget>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _glowController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      duration: Duration(milliseconds: 1500),
      vsync: this,
    );

    _glowController = AnimationController(
      duration: Duration(milliseconds: 2000),
      vsync: this,
    );

    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.05,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));

    _glowAnimation = Tween<double>(
      begin: 0.3,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _glowController,
      curve: Curves.easeInOut,
    ));

    _startAnimations();
  }

  void _startAnimations() {
    if (widget.enabled) {
      _pulseController.repeat(reverse: true);
      _glowController.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(EnergyEffectWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.enabled != oldWidget.enabled) {
      if (widget.enabled) {
        _startAnimations();
      } else {
        _pulseController.stop();
        _glowController.stop();
      }
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _glowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<StudyDataProvider>(
      builder: (context, provider, child) {
        final effectsEnabled = provider.areEffectsEnabled && widget.enabled;
        final effectIntensity =
            provider.energyEffectIntensity * widget.intensity;

        if (!effectsEnabled || effectIntensity <= 0.1) {
          return widget.child;
        }

        final effectColor =
            widget.effectColor ?? _getEffectColorFromTheme(provider.themeType);

        return AnimatedBuilder(
          animation: Listenable.merge([_pulseAnimation, _glowAnimation]),
          builder: (context, child) {
            return Transform.scale(
              scale:
                  1.0 + ((_pulseAnimation.value - 1.0) * effectIntensity * 0.5),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: effectColor.withOpacity(
                          _glowAnimation.value * effectIntensity * 0.6),
                      blurRadius: 20 * effectIntensity,
                      spreadRadius: 2 * effectIntensity,
                    ),
                    // İkinci glow katmanı
                    BoxShadow(
                      color: effectColor.withOpacity(
                          _glowAnimation.value * effectIntensity * 0.3),
                      blurRadius: 40 * effectIntensity,
                      spreadRadius: 4 * effectIntensity,
                    ),
                  ],
                ),
                child: widget.child,
              ),
            );
          },
        );
      },
    );
  }

  Color _getEffectColorFromTheme(String themeType) {
    switch (themeType) {
      case 'energetic':
        return Color(0xFFFF6B35);
      case 'calm':
        return Color(0xFF81C784);
      case 'motivated':
        return Color(0xFF7986CB);
      case 'focused':
        return Color(0xFF26A69A);
      default:
        return Color(0xFF5E35B1);
    }
  }
}

class AdaptiveGradientContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;

  const AdaptiveGradientContainer({
    Key? key,
    required this.child,
    this.padding,
    this.margin,
    this.width,
    this.height,
    this.borderRadius,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<StudyDataProvider>(
      builder: (context, provider, child) {
        final theme = provider.currentTheme;
        final gradientIntensity = provider.gradientIntensity;

        if (theme == null) {
          return Container(
            padding: padding,
            margin: margin,
            width: width,
            height: height,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: borderRadius ?? BorderRadius.circular(12),
            ),
            child: this.child,
          );
        }

        final primaryColor =
            Color(int.parse(theme['primaryColor'].replaceFirst('#', '0xFF')));
        final backgroundColor = Color(
            int.parse(theme['backgroundColor'].replaceFirst('#', '0xFF')));

        return Container(
          padding: padding,
          margin: margin,
          width: width,
          height: height,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                backgroundColor,
                primaryColor.withOpacity(0.1 * gradientIntensity),
              ],
            ),
            borderRadius: borderRadius ?? BorderRadius.circular(12),
            border: Border.all(
              color: primaryColor.withOpacity(0.2 * gradientIntensity),
              width: 1,
            ),
          ),
          child: this.child,
        );
      },
    );
  }
}

class AdaptiveElevatedButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final Widget child;
  final bool enableEnergyEffect;
  final double energyIntensity;

  const AdaptiveElevatedButton({
    Key? key,
    required this.onPressed,
    required this.child,
    this.enableEnergyEffect = true,
    this.energyIntensity = 0.8,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<StudyDataProvider>(
      builder: (context, provider, child) {
        final theme = provider.currentTheme;
        final animationSpeed = provider.animationSpeed;

        if (theme == null) {
          return ElevatedButton(
            onPressed: onPressed,
            child: this.child,
          );
        }

        final buttonColor =
            Color(int.parse(theme['buttonColor'].replaceFirst('#', '0xFF')));
        final textColor =
            Color(int.parse(theme['textColor'].replaceFirst('#', '0xFF')));

        Widget button = ElevatedButton(
          onPressed: onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: buttonColor,
            foregroundColor: textColor,
            padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            elevation: 4,
          ),
          child: AnimatedScale(
            scale: 1.0,
            duration: Duration(milliseconds: (200 / animationSpeed).round()),
            child: this.child,
          ),
        );

        if (enableEnergyEffect && provider.areEffectsEnabled) {
          return EnergyEffectWidget(
            intensity: energyIntensity,
            child: button,
          );
        }

        return button;
      },
    );
  }
}

class AdaptiveAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final Widget? leading;
  final bool enableEnergyEffect;

  const AdaptiveAppBar({
    Key? key,
    required this.title,
    this.actions,
    this.leading,
    this.enableEnergyEffect = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<StudyDataProvider>(
      builder: (context, provider, child) {
        final theme = provider.currentTheme;

        if (theme == null) {
          return AppBar(title: Text(title), actions: actions, leading: leading);
        }

        final primaryColor =
            Color(int.parse(theme['primaryColor'].replaceFirst('#', '0xFF')));
        final textColor =
            Color(int.parse(theme['textColor'].replaceFirst('#', '0xFF')));
        final gradientIntensity = provider.gradientIntensity;

        Widget appBar = AppBar(
          title: Text(
            title,
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.bold,
            ),
          ),
          backgroundColor: primaryColor,
          elevation: 0,
          flexibleSpace: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  primaryColor,
                  primaryColor.withOpacity(0.8 + (0.2 * gradientIntensity)),
                ],
              ),
            ),
          ),
          actions: actions,
          leading: leading,
          iconTheme: IconThemeData(color: textColor),
        );

        if (enableEnergyEffect &&
            provider.areEffectsEnabled &&
            provider.energyLevel == 'high') {
          return EnergyEffectWidget(
            intensity: 0.3,
            effectColor: primaryColor.withOpacity(0.4),
            child: appBar,
          );
        }

        return appBar;
      },
    );
  }

  @override
  Size get preferredSize => Size.fromHeight(kToolbarHeight);
}

class MoodIndicatorWidget extends StatelessWidget {
  final bool showDetails;

  const MoodIndicatorWidget({
    Key? key,
    this.showDetails = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<StudyDataProvider>(
      builder: (context, provider, child) {
        if (!provider.hasActiveTheme) {
          return SizedBox();
        }

        final moodSummary = provider.getMoodSummary();
        final themeType = provider.themeType;

        return AdaptiveGradientContainer(
          padding: EdgeInsets.all(12),
          margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisSize: showDetails ? MainAxisSize.max : MainAxisSize.min,
            children: [
              _getMoodIcon(themeType),
              SizedBox(width: 8),
              if (showDetails) ...[
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Ruh Halin',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Colors.grey[600],
                        ),
                      ),
                      Text(
                        moodSummary,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                Text(
                  moodSummary,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
              if (provider.hasBurnoutRisk) ...[
                SizedBox(width: 8),
                Icon(
                  Icons.warning,
                  color: Colors.orange,
                  size: 16,
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _getMoodIcon(String themeType) {
    switch (themeType) {
      case 'energetic':
        return Text('🔥', style: TextStyle(fontSize: 20));
      case 'calm':
        return Text('😌', style: TextStyle(fontSize: 20));
      case 'motivated':
        return Text('💪', style: TextStyle(fontSize: 20));
      case 'focused':
        return Text('🎯', style: TextStyle(fontSize: 20));
      default:
        return Text('⚖️', style: TextStyle(fontSize: 20));
    }
  }
}
