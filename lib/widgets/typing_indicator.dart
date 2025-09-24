import 'package:flutter/material.dart';

/// A subtle typing indicator widget that shows "Düşünüyor..." with animated dots
class TypingIndicator extends StatefulWidget {
  final String message;
  final Color? color;
  final double fontSize;

  const TypingIndicator({
    Key? key,
    this.message = 'Düşünüyor',
    this.color,
    this.fontSize = 14.0,
  }) : super(key: key);

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
    _animationController.repeat();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.smart_toy,
            size: 16,
            color: widget.color ?? Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 8),
          Text(
            widget.message,
            style: TextStyle(
              fontSize: widget.fontSize,
              color: widget.color ?? Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(width: 4),
          AnimatedBuilder(
            animation: _animation,
            builder: (context, child) {
              final dots = _getDots();
              return Text(
                dots,
                style: TextStyle(
                  fontSize: widget.fontSize,
                  color: widget.color ?? Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  String _getDots() {
    final progress = _animation.value;
    if (progress < 0.33) {
      return '';
    } else if (progress < 0.66) {
      return '.';
    } else if (progress < 1.0) {
      return '..';
    } else {
      return '...';
    }
  }
} 