import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

/// Deep link türleri
enum DeepLinkType { studentInvite, parentInvite, unknown }

/// Deep link verisi
class DeepLinkData {
  final DeepLinkType type;
  final String? token;

  DeepLinkData({
    required this.type,
    this.token,
  });

  @override
  String toString() => 'DeepLinkData(type: $type, token: $token)';
}

/// Deep link servis sınıfı
/// Uygulama içi ve dışı bağlantıları yönetir
class DeepLinkService {
  // Singleton pattern
  static final DeepLinkService _instance = DeepLinkService._internal();
  factory DeepLinkService() => _instance;
  DeepLinkService._internal();

  // App Links instance
  final AppLinks _appLinks = AppLinks();

  // Stream controller for deep links
  final StreamController<DeepLinkData> _deepLinkStreamController =
      StreamController<DeepLinkData>.broadcast();

  /// Deep link stream'i - dinleyiciler için
  Stream<DeepLinkData> get deepLinkStream => _deepLinkStreamController.stream;

  // Subscription for app links
  StreamSubscription? _linkSubscription;

  /// Deep link servisini başlatır
  /// Uygulama başlangıcında çağrılmalıdır
  Future<void> init() async {
    try {
      // Get initial link if app was opened with a link
      final initialLink = await _appLinks.getInitialAppLink();
      if (initialLink != null) {
        debugPrint('🔗 Initial deep link: $initialLink');
        final linkData = _processDeepLink(initialLink);
        _deepLinkStreamController.add(linkData);
      }

      // Listen for links while app is running
      _linkSubscription = _appLinks.uriLinkStream.listen((uri) {
        debugPrint('🔗 Deep link received: $uri');
        final linkData = _processDeepLink(uri);
        _deepLinkStreamController.add(linkData);
      }, onError: (error) {
        debugPrint('❌ Deep link error: $error');
      });

      debugPrint('✅ Deep link service initialized');
    } catch (e) {
      debugPrint('❌ Deep link initialization error: $e');
    }
  }

  /// Deep link'i işler ve veri yapısına dönüştürür
  DeepLinkData _processDeepLink(Uri uri) {
    debugPrint('🔗 Processing deep link: $uri');

    // Check if the URI is for student invite
    if (_isStudentInviteLink(uri)) {
      final token = _extractToken(uri);
      debugPrint('📚 Student invite detected, token: $token');

      // Token geçerlilik kontrolü
      if (token == null || token.isEmpty || !_isValidUuid(token)) {
        debugPrint('⚠️ Invalid student invite token: $token');
        return DeepLinkData(
          type: DeepLinkType.studentInvite,
          token: null, // Null token geçersiz UUID anlamına gelir
        );
      }

      return DeepLinkData(
        type: DeepLinkType.studentInvite,
        token: token,
      );
    }

    // Check if the URI is for parent invite
    if (_isParentInviteLink(uri)) {
      final token = _extractToken(uri);
      debugPrint('👨‍👩‍👧‍👦 Parent invite detected, token: $token');

      // Token geçerlilik kontrolü
      if (token == null || token.isEmpty || !_isValidUuid(token)) {
        debugPrint('⚠️ Invalid parent invite token: $token');
        return DeepLinkData(
          type: DeepLinkType.parentInvite,
          token: null, // Null token geçersiz UUID anlamına gelir
        );
      }

      return DeepLinkData(
        type: DeepLinkType.parentInvite,
        token: token,
      );
    }

    // Unknown link type
    debugPrint('❓ Unknown deep link type: $uri');
    return DeepLinkData(type: DeepLinkType.unknown);
  }

  /// URI'dan token'ı çıkarır
  String? _extractToken(Uri uri) {
    // Web URL format: https://mezopstudios.com/invite/student/<uuid>
    if (uri.host == 'mezopstudios.com' && uri.pathSegments.length >= 3) {
      if (uri.pathSegments[0] == 'invite' &&
          (uri.pathSegments[1] == 'student' ||
              uri.pathSegments[1] == 'parent')) {
        return Uri.decodeComponent(uri.pathSegments[2]);
      }
    }

    // Custom scheme format: okuz://invite/student/<uuid>
    if (uri.scheme == 'okuz' &&
        uri.host == 'invite' &&
        uri.pathSegments.length >= 2) {
      if (uri.pathSegments[0] == 'student' || uri.pathSegments[0] == 'parent') {
        return Uri.decodeComponent(uri.pathSegments[1]);
      }
    }

    // Alternative format: okuz://student/<uuid>
    if (uri.scheme == 'okuz' &&
        (uri.host == 'student' || uri.host == 'parent') &&
        uri.pathSegments.isNotEmpty) {
      return Uri.decodeComponent(uri.pathSegments[0]);
    }

    // Query parameter format
    if (uri.queryParameters.containsKey('token')) {
      return Uri.decodeComponent(uri.queryParameters['token']!);
    }

    return null;
  }

  /// UUID formatı geçerli mi kontrol eder
  bool _isValidUuid(String uuid) {
    // UUID formatı: 8-4-4-4-12 karakter (36 karakter toplam)
    // Örnek: 123e4567-e89b-12d3-a456-426614174000
    final uuidRegex = RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      caseSensitive: false,
    );

    // Regex kontrolü
    return uuidRegex.hasMatch(uuid);
  }

  /// URI öğrenci daveti için mi kontrol eder
  bool _isStudentInviteLink(Uri uri) {
    // Web URL format: https://mezopstudios.com/invite/student/<uuid>
    if (uri.host == 'mezopstudios.com' && uri.pathSegments.length >= 3) {
      return uri.pathSegments[0] == 'invite' &&
          uri.pathSegments[1] == 'student';
    }

    // Custom scheme format: okuz://invite/student/<uuid>
    if (uri.scheme == 'okuz' &&
        uri.host == 'invite' &&
        uri.pathSegments.isNotEmpty) {
      return uri.pathSegments[0] == 'student';
    }

    // Alternative format: okuz://student/<uuid>
    if (uri.scheme == 'okuz' && uri.host == 'student') {
      return true;
    }

    return false;
  }

  /// URI veli daveti için mi kontrol eder
  bool _isParentInviteLink(Uri uri) {
    // Web URL format: https://mezopstudios.com/invite/parent/<uuid>
    if (uri.host == 'mezopstudios.com' && uri.pathSegments.length >= 3) {
      return uri.pathSegments[0] == 'invite' && uri.pathSegments[1] == 'parent';
    }

    // Custom scheme format: okuz://invite/parent/<uuid>
    if (uri.scheme == 'okuz' &&
        uri.host == 'invite' &&
        uri.pathSegments.isNotEmpty) {
      return uri.pathSegments[0] == 'parent';
    }

    // Alternative format: okuz://parent/<uuid>
    if (uri.scheme == 'okuz' && uri.host == 'parent') {
      return true;
    }

    return false;
  }

  /// Öğrenci daveti linki oluşturur
  String createStudentInviteLink(String token) {
    // URL encode the token to handle special characters
    final encodedToken = Uri.encodeComponent(token);
    return 'https://mezopstudios.com/invite/student/$encodedToken';
  }

  /// Veli daveti linki oluşturur
  String createParentInviteLink(String token) {
    // URL encode the token to handle special characters
    final encodedToken = Uri.encodeComponent(token);
    return 'https://mezopstudios.com/invite/parent/$encodedToken';
  }

  /// Öğrenci daveti paylaşır
  Future<void> shareStudentInvite(String token, {String? message}) async {
    final link = createStudentInviteLink(token);
    final shareMessage =
        message ?? 'Okuz AI uygulamasına öğrenci olarak davet edildiniz: $link';

    try {
      await Share.share(shareMessage, subject: 'Okuz AI Öğrenci Daveti');
      debugPrint('✅ Student invite shared: $link');
    } catch (e) {
      debugPrint('❌ Error sharing student invite: $e');
      // Alternatif olarak panoya kopyala
      await Clipboard.setData(ClipboardData(text: shareMessage));
      debugPrint('📋 Student invite copied to clipboard');
    }
  }

  /// Veli daveti paylaşır
  Future<void> shareParentInvite(String token, {String? message}) async {
    final link = createParentInviteLink(token);
    final shareMessage =
        message ?? 'Okuz AI uygulamasına veli olarak davet edildiniz: $link';

    try {
      await Share.share(shareMessage, subject: 'Okuz AI Veli Daveti');
      debugPrint('✅ Parent invite shared: $link');
    } catch (e) {
      debugPrint('❌ Error sharing parent invite: $e');
      // Alternatif olarak panoya kopyala
      await Clipboard.setData(ClipboardData(text: shareMessage));
      debugPrint('📋 Parent invite copied to clipboard');
    }
  }

  /// Kaynakları temizler
  void dispose() {
    _linkSubscription?.cancel();
    _deepLinkStreamController.close();
  }
}
