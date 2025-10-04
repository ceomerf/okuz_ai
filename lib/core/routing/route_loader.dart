import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../lazy_loading/lazy_loader.dart';

/// Route bazlı lazy loading
class RouteLoader {
  static final Map<String, Widget Function()> _routeBuilders = {};
  static final Map<String, Widget> _cachedRoutes = {};

  /// Route kaydet
  static void registerRoute(String routeName, Widget Function() builder) {
    _routeBuilders[routeName] = builder;
  }

  /// Route yükle (lazy loading ile)
  static Widget loadRoute(String routeName) {
    // Önce cache'den kontrol et
    if (_cachedRoutes.containsKey(routeName)) {
      return _cachedRoutes[routeName]!;
    }

    // Builder'ı kontrol et
    if (!_routeBuilders.containsKey(routeName)) {
      return _buildErrorWidget('Route bulunamadı: $routeName');
    }

    // Lazy loading ile yükle
    return DeferredLoader(
      loader: () async {
        // Simüle edilmiş yükleme süresi
        await Future.delayed(const Duration(milliseconds: 100));
        
        final builder = _routeBuilders[routeName]!;
        final widget = builder();
        
        // Cache'e kaydet
        _cachedRoutes[routeName] = widget;
        
        return widget;
      },
      placeholder: _buildLoadingWidget(),
    );
  }

  /// Route preload (arka planda yükle)
  static Future<void> preloadRoute(String routeName) async {
    if (_cachedRoutes.containsKey(routeName)) return;
    if (!_routeBuilders.containsKey(routeName)) return;

    try {
      final builder = _routeBuilders[routeName]!;
      final widget = builder();
      _cachedRoutes[routeName] = widget;
    } catch (e) {
      debugPrint('Route preload hatası: $e');
    }
  }

  /// Cache temizle
  static void clearCache() {
    _cachedRoutes.clear();
  }

  /// Belirli route'u cache'den çıkar
  static void removeFromCache(String routeName) {
    _cachedRoutes.remove(routeName);
  }

  /// Tüm route'ları preload et
  static Future<void> preloadAllRoutes() async {
    final futures = _routeBuilders.keys.map((routeName) => preloadRoute(routeName));
    await Future.wait(futures);
  }

  static Widget _buildLoadingWidget() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Yükleniyor...'),
        ],
      ),
    );
  }

  static Widget _buildErrorWidget(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error, size: 48, color: Colors.red),
          const SizedBox(height: 16),
          Text(message),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              // Retry logic
            },
            child: const Text('Tekrar Dene'),
          ),
        ],
      ),
    );
  }
}

/// Route bazlı navigation
class RouteBasedNavigator {
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  /// Route'a git (lazy loading ile)
  static Future<T?> pushNamed<T extends Object?>(
    String routeName, {
    Object? arguments,
  }) {
    return navigatorKey.currentState?.pushNamed<T>(
      routeName,
      arguments: arguments,
    );
  }

  /// Route'u değiştir
  static Future<T?> pushReplacementNamed<T extends Object?, TO extends Object?>(
    String routeName, {
    Object? arguments,
    TO? result,
  }) {
    return navigatorKey.currentState?.pushReplacementNamed<T, TO>(
      routeName,
      arguments: arguments,
      result: result,
    );
  }

  /// Route stack'i temizle ve yeni route'a git
  static Future<T?> pushNamedAndRemoveUntil<T extends Object?>(
    String routeName,
    RoutePredicate predicate, {
    Object? arguments,
  }) {
    return navigatorKey.currentState?.pushNamedAndRemoveUntil<T>(
      routeName,
      predicate,
      arguments: arguments,
    );
  }

  /// Geri git
  static void pop<T extends Object?>([T? result]) {
    navigatorKey.currentState?.pop<T>(result);
  }

  /// Route preload (arka planda)
  static void preloadRoute(String routeName) {
    RouteLoader.preloadRoute(routeName);
  }
}

/// Route tanımları
class AppRoutes {
  static const String home = '/';
  static const String login = '/login';
  static const String register = '/register';
  static const String profile = '/profile';
  static const String plans = '/plans';
  static const String study = '/study';
  static const String progress = '/progress';
  static const String settings = '/settings';
  static const String assessment = '/assessment';
  static const String coaching = '/coaching';
  static const String analytics = '/analytics';
  static const String notifications = '/notifications';
  static const String help = '/help';
  static const String about = '/about';

  /// Tüm route'ları kaydet
  static void registerAllRoutes() {
    // Ana sayfalar
    RouteLoader.registerRoute(home, () => const HomePage());
    RouteLoader.registerRoute(login, () => const LoginPage());
    RouteLoader.registerRoute(register, () => const RegisterPage());
    
    // Kullanıcı sayfaları
    RouteLoader.registerRoute(profile, () => const ProfilePage());
    RouteLoader.registerRoute(plans, () => const PlansPage());
    RouteLoader.registerRoute(study, () => const StudyPage());
    RouteLoader.registerRoute(progress, () => const ProgressPage());
    RouteLoader.registerRoute(settings, () => const SettingsPage());
    
    // Özellik sayfaları
    RouteLoader.registerRoute(assessment, () => const AssessmentPage());
    RouteLoader.registerRoute(coaching, () => const CoachingPage());
    RouteLoader.registerRoute(analytics, () => const AnalyticsPage());
    RouteLoader.registerRoute(notifications, () => const NotificationsPage());
    
    // Yardım sayfaları
    RouteLoader.registerRoute(help, () => const HelpPage());
    RouteLoader.registerRoute(about, () => const AboutPage());
  }
}

// Placeholder widget'lar (gerçek implementasyonlar ayrı dosyalarda olacak)
class HomePage extends StatelessWidget {
  const HomePage({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) => const Scaffold(body: Text('Home'));
}

class LoginPage extends StatelessWidget {
  const LoginPage({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) => const Scaffold(body: Text('Login'));
}

class RegisterPage extends StatelessWidget {
  const RegisterPage({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) => const Scaffold(body: Text('Register'));
}

class ProfilePage extends StatelessWidget {
  const ProfilePage({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) => const Scaffold(body: Text('Profile'));
}

class PlansPage extends StatelessWidget {
  const PlansPage({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) => const Scaffold(body: Text('Plans'));
}

class StudyPage extends StatelessWidget {
  const StudyPage({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) => const Scaffold(body: Text('Study'));
}

class ProgressPage extends StatelessWidget {
  const ProgressPage({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) => const Scaffold(body: Text('Progress'));
}

class SettingsPage extends StatelessWidget {
  const SettingsPage({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) => const Scaffold(body: Text('Settings'));
}

class AssessmentPage extends StatelessWidget {
  const AssessmentPage({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) => const Scaffold(body: Text('Assessment'));
}

class CoachingPage extends StatelessWidget {
  const CoachingPage({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) => const Scaffold(body: Text('Coaching'));
}

class AnalyticsPage extends StatelessWidget {
  const AnalyticsPage({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) => const Scaffold(body: Text('Analytics'));
}

class NotificationsPage extends StatelessWidget {
  const NotificationsPage({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) => const Scaffold(body: Text('Notifications'));
}

class HelpPage extends StatelessWidget {
  const HelpPage({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) => const Scaffold(body: Text('Help'));
}

class AboutPage extends StatelessWidget {
  const AboutPage({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) => const Scaffold(body: Text('About'));
}
