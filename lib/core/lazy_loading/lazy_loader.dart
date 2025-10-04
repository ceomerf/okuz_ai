import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Lazy loading widget'ı - sadece görünür olduğunda yüklenir
class LazyLoader extends StatefulWidget {
  final Widget child;
  final Widget? placeholder;
  final Duration delay;
  final bool enabled;

  const LazyLoader({
    Key? key,
    required this.child,
    this.placeholder,
    this.delay = const Duration(milliseconds: 100),
    this.enabled = true,
  }) : super(key: key);

  @override
  State<LazyLoader> createState() => _LazyLoaderState();
}

class _LazyLoaderState extends State<LazyLoader> {
  bool _isVisible = false;
  bool _isLoaded = false;

  @override
  void initState() {
    super.initState();
    if (widget.enabled) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _checkVisibility();
      });
    } else {
      _isLoaded = true;
    }
  }

  void _checkVisibility() {
    if (!mounted) return;
    
    final RenderBox? renderBox = context.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    final position = renderBox.localToGlobal(Offset.zero);
    final size = renderBox.size;
    final screenSize = MediaQuery.of(context).size;

    // Widget ekranda görünür mü kontrol et
    final isVisible = position.dy < screenSize.height && 
                     position.dy + size.height > 0;

    if (isVisible && !_isVisible) {
      setState(() {
        _isVisible = true;
      });

      // Gecikme ile yükle
      Future.delayed(widget.delay, () {
        if (mounted) {
          setState(() {
            _isLoaded = true;
          });
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled || _isLoaded) {
      return widget.child;
    }

    return widget.placeholder ?? 
           const SizedBox(
             height: 200,
             child: Center(
               child: CircularProgressIndicator(),
             ),
           );
  }
}

/// Deferred loading için widget
class DeferredLoader extends StatefulWidget {
  final Future<Widget> Function() loader;
  final Widget? placeholder;
  final Duration timeout;

  const DeferredLoader({
    Key? key,
    required this.loader,
    this.placeholder,
    this.timeout = const Duration(seconds: 10),
  }) : super(key: key);

  @override
  State<DeferredLoader> createState() => _DeferredLoaderState();
}

class _DeferredLoaderState extends State<DeferredLoader> {
  Widget? _loadedWidget;
  bool _isLoading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _loadWidget();
  }

  Future<void> _loadWidget() async {
    try {
      final widget = await widget.loader().timeout(widget.timeout);
      if (mounted) {
        setState(() {
          _loadedWidget = widget;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _hasError = true;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      return const Center(
        child: Text('Yükleme hatası'),
      );
    }

    if (_isLoading) {
      return widget.placeholder ?? 
             const Center(
               child: CircularProgressIndicator(),
             );
    }

    return _loadedWidget ?? const SizedBox.shrink();
  }
}

/// Route bazlı code splitting
class RouteBasedLoader {
  static final Map<String, Widget> _cachedRoutes = {};

  static Widget loadRoute(String routeName, Widget Function() builder) {
    if (_cachedRoutes.containsKey(routeName)) {
      return _cachedRoutes[routeName]!;
    }

    final widget = builder();
    _cachedRoutes[routeName] = widget;
    return widget;
  }

  static void clearCache() {
    _cachedRoutes.clear();
  }

  static void removeRoute(String routeName) {
    _cachedRoutes.remove(routeName);
  }
}

/// Bundle boyutu optimizasyonu için widget
class OptimizedWidget extends StatelessWidget {
  final Widget child;
  final bool enableRepaintBoundary;
  final bool enableAutomaticKeepAlive;

  const OptimizedWidget({
    Key? key,
    required this.child,
    this.enableRepaintBoundary = true,
    this.enableAutomaticKeepAlive = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Widget optimizedChild = child;

    if (enableRepaintBoundary) {
      optimizedChild = RepaintBoundary(child: optimizedChild);
    }

    if (enableAutomaticKeepAlive) {
      optimizedChild = AutomaticKeepAliveClient(
        child: optimizedChild,
      );
    }

    return optimizedChild;
  }
}

/// Memory efficient list view
class MemoryEfficientListView extends StatelessWidget {
  final List<Widget> children;
  final ScrollController? controller;
  final EdgeInsetsGeometry? padding;

  const MemoryEfficientListView({
    Key? key,
    required this.children,
    this.controller,
    this.padding,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      controller: controller,
      padding: padding,
      itemCount: children.length,
      itemBuilder: (context, index) {
        return LazyLoader(
          child: children[index],
        );
      },
    );
  }
}
