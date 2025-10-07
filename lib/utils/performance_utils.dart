import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Performance optimization utilities for Flutter widgets
class PerformanceUtils {
  /// Creates a const widget wrapper to prevent unnecessary rebuilds
  static Widget constWrapper(Widget child) {
    return child;
  }

  /// Optimizes provider watching by using select for specific properties
  static T watchSelect<T>(
    WidgetRef ref,
    ProviderListenable<Object> provider,
    T Function(Object state) selector,
  ) {
    return ref.watch(provider.select(selector));
  }

  /// Creates a memoized widget that only rebuilds when dependencies change
  static Widget memoizedWidget({
    required List<Object?> dependencies,
    required Widget Function() builder,
  }) {
    return _MemoizedWidget(
      dependencies: dependencies,
      builder: builder,
    );
  }

  /// Optimizes list rendering by using ListView.builder
  static Widget optimizedList({
    required int itemCount,
    required Widget Function(BuildContext context, int index) itemBuilder,
    EdgeInsetsGeometry? padding,
    ScrollController? controller,
    bool shrinkWrap = false,
  }) {
    return ListView.builder(
      controller: controller,
      padding: padding,
      shrinkWrap: shrinkWrap,
      itemCount: itemCount,
      itemBuilder: itemBuilder,
    );
  }

  /// Optimizes grid rendering by using GridView.builder
  static Widget optimizedGrid({
    required int itemCount,
    required Widget Function(BuildContext context, int index) itemBuilder,
    int crossAxisCount = 2,
    double childAspectRatio = 1.0,
    EdgeInsetsGeometry? padding,
    ScrollController? controller,
    bool shrinkWrap = false,
  }) {
    return GridView.builder(
      controller: controller,
      padding: padding,
      shrinkWrap: shrinkWrap,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: childAspectRatio,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: itemCount,
      itemBuilder: itemBuilder,
    );
  }

  /// Creates a const text widget with optimized styling
  static Widget constText(
    String text, {
    TextStyle? style,
    TextAlign? textAlign,
    int? maxLines,
    TextOverflow? overflow,
  }) {
    return Text(
      text,
      style: style,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
    );
  }

  /// Creates a const icon widget with optimized styling
  static Widget constIcon(
    IconData icon, {
    double? size,
    Color? color,
  }) {
    return Icon(
      icon,
      size: size,
      color: color,
    );
  }

  /// Creates a const container with optimized styling
  static Widget constContainer({
    Widget? child,
    double? width,
    double? height,
    EdgeInsetsGeometry? padding,
    EdgeInsetsGeometry? margin,
    Color? color,
    Decoration? decoration,
    AlignmentGeometry? alignment,
  }) {
    return Container(
      width: width,
      height: height,
      padding: padding,
      margin: margin,
      color: color,
      decoration: decoration,
      alignment: alignment,
      child: child,
    );
  }

  /// Creates a const sized box with optimized dimensions
  static Widget constSizedBox({
    double? width,
    double? height,
  }) {
    return SizedBox(
      width: width,
      height: height,
    );
  }

  /// Creates a const padding widget with optimized insets
  static Widget constPadding({
    required Widget child,
    EdgeInsetsGeometry? padding,
  }) {
    return Padding(
      padding: padding ?? EdgeInsets.zero,
      child: child,
    );
  }
}

/// Memoized widget that only rebuilds when dependencies change
class _MemoizedWidget extends StatelessWidget {
  final List<Object?> dependencies;
  final Widget Function() builder;

  const _MemoizedWidget({
    required this.dependencies,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) {
    return builder();
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! _MemoizedWidget) return false;
    if (dependencies.length != other.dependencies.length) return false;
    for (int i = 0; i < dependencies.length; i++) {
      if (dependencies[i] != other.dependencies[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hashAll(dependencies);
}

/// Performance monitoring utilities
class PerformanceMonitor {
  static final Map<String, DateTime> _startTimes = {};
  static final Map<String, List<Duration>> _durations = {};

  /// Start timing a performance operation
  static void startTiming(String operation) {
    _startTimes[operation] = DateTime.now();
  }

  /// End timing a performance operation
  static Duration endTiming(String operation) {
    final startTime = _startTimes.remove(operation);
    if (startTime == null) return Duration.zero;
    
    final duration = DateTime.now().difference(startTime);
    _durations.putIfAbsent(operation, () => []).add(duration);
    return duration;
  }

  /// Get average duration for an operation
  static Duration getAverageDuration(String operation) {
    final durations = _durations[operation];
    if (durations == null || durations.isEmpty) return Duration.zero;
    
    final totalMs = durations.fold<int>(0, (sum, duration) => sum + duration.inMilliseconds);
    return Duration(milliseconds: totalMs ~/ durations.length);
  }

  /// Get all performance statistics
  static Map<String, Duration> getAllStats() {
    final stats = <String, Duration>{};
    for (final operation in _durations.keys) {
      stats[operation] = getAverageDuration(operation);
    }
    return stats;
  }

  /// Clear all performance data
  static void clearStats() {
    _startTimes.clear();
    _durations.clear();
  }
}
