import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

enum DeepLinkType { studentInvite, parentInvite, unknown }

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
  Stream<DeepLinkData> get deepLinkStream => _deepLinkStreamController.stream;

  // Subscription for app links
  StreamSubscription? _linkSubscription;

  // Initialize deep linking
  Future<void> init() async {
    try {
      // Get initial link if app was opened with a link
      final initialLink = await _appLinks.getInitialAppLink();
      if (initialLink != null) {
        final linkData = _processDeepLink(initialLink);
        _deepLinkStreamController.add(linkData);
      }

      // Listen for links while app is running
      _linkSubscription = _appLinks.uriLinkStream.listen((uri) {
        final linkData = _processDeepLink(uri);
        _deepLinkStreamController.add(linkData);
      }, onError: (error) {
        debugPrint('Deep link error: $error');
      });

      debugPrint('✅ Deep link service initialized');
    } catch (e) {
      debugPrint('❌ Deep link initialization error: $e');
    }
  }

  // Process deep link and extract data
  DeepLinkData _processDeepLink(Uri uri) {
    debugPrint('🔗 Processing deep link: $uri');

    // Check if the URI is for student invite
    if (_isStudentInviteLink(uri)) {
      final token = uri.queryParameters['token'];
      return DeepLinkData(
        type: DeepLinkType.studentInvite,
        token: token,
      );
    }

    // Check if the URI is for parent invite
    if (_isParentInviteLink(uri)) {
      final token = uri.queryParameters['token'];
      return DeepLinkData(
        type: DeepLinkType.parentInvite,
        token: token,
      );
    }

    // Unknown link type
    return DeepLinkData(type: DeepLinkType.unknown);
  }

  // Check if the URI is for student invite
  bool _isStudentInviteLink(Uri uri) {
    return (uri.host == 'okuz.app' && uri.path == '/invite/student') ||
        (uri.scheme == 'okuzai' &&
            uri.host == 'invite' &&
            uri.path == '/student');
  }

  // Check if the URI is for parent invite
  bool _isParentInviteLink(Uri uri) {
    return (uri.host == 'okuz.app' && uri.path == '/invite/parent') ||
        (uri.scheme == 'okuzai' &&
            uri.host == 'invite' &&
            uri.path == '/parent');
  }

  // Create student invite link
  String createStudentInviteLink(String token) {
    return 'https://okuz.app/invite/student?token=$token';
  }

  // Create parent invite link
  String createParentInviteLink(String token) {
    return 'https://okuz.app/invite/parent?token=$token';
  }

  // Dispose resources
  void dispose() {
    _linkSubscription?.cancel();
    _deepLinkStreamController.close();
  }
}
