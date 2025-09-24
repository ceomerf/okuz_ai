import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'api_env.dart';
import 'package:flutter/foundation.dart';

class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  WebSocketService._internal();

  IO.Socket? _socket;
  final String _serverUrl = ApiEnv.wsUrl; // Backend URL
  bool _isConnected = false;

  // Stream controllers for real-time updates
  final StreamController<Map<String, dynamic>> _planUpdateController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _sessionCompletedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _progressUpdateController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _userNotificationController =
      StreamController<Map<String, dynamic>>.broadcast();

  // Getters for streams
  Stream<Map<String, dynamic>> get planUpdateStream =>
      _planUpdateController.stream;
  Stream<Map<String, dynamic>> get sessionCompletedStream =>
      _sessionCompletedController.stream;
  Stream<Map<String, dynamic>> get progressUpdateStream =>
      _progressUpdateController.stream;
  Stream<Map<String, dynamic>> get userNotificationStream =>
      _userNotificationController.stream;

  bool get isConnected => _isConnected;

  // Initialize WebSocket connection
  Future<void> initializeSocket() async {
    try {
      debugPrint('🌐 WebSocket bağlantısı başlatılıyor...');

      _socket = IO.io(_serverUrl, <String, dynamic>{
        'transports': ['websocket'],
        'autoConnect': false,
        'forceNew': true,
      });

      _setupSocketListeners();

      _socket!.connect();
      debugPrint('✅ WebSocket bağlantısı başlatıldı');
    } catch (e) {
      debugPrint('❌ WebSocket bağlantı hatası: $e');
    }
  }

  // Setup socket event listeners
  void _setupSocketListeners() {
    _socket!.on('connect', (_) {
      debugPrint('✅ WebSocket bağlandı');
      _isConnected = true;
    });

    _socket!.on('disconnect', (_) {
      debugPrint('❌ WebSocket bağlantısı kesildi');
      _isConnected = false;
    });

    _socket!.on('connect_error', (error) {
      debugPrint('❌ WebSocket bağlantı hatası: $error');
      _isConnected = false;
    });

    // Plan update events
    _socket!.on('plan_updated', (data) {
      debugPrint('📋 Plan güncellemesi alındı: $data');
      _planUpdateController.add(data);
    });

    // Session completed events
    _socket!.on('session_completed', (data) {
      debugPrint('✅ Session tamamlandı: $data');
      _sessionCompletedController.add(data);
    });

    // Progress update events
    _socket!.on('progress_updated', (data) {
      debugPrint('📊 İlerleme güncellemesi: $data');
      _progressUpdateController.add(data);
    });

    // User notification events
    _socket!.on('user_notification', (data) {
      debugPrint('🔔 Kullanıcı bildirimi: $data');
      _userNotificationController.add(data);
    });

    // Error handling
    _socket!.onError((error) {
      debugPrint('❌ WebSocket hatası: $error');
    });
  }

  // Join a plan room
  Future<void> joinPlanRoom(String planId) async {
    if (_socket != null && _isConnected) {
      _socket!.emit('join_plan_room', planId);
      debugPrint('🏠 Plan odasına katılındı: $planId');
    } else {
      debugPrint('⚠️ WebSocket bağlantısı yok, plan odasına katılınamadı');
    }
  }

  // Leave a plan room
  Future<void> leavePlanRoom(String planId) async {
    if (_socket != null && _isConnected) {
      _socket!.emit('leave_plan_room', planId);
      debugPrint('🚪 Plan odasından çıkıldı: $planId');
    }
  }

  // Join user room
  Future<void> joinUserRoom(String userId) async {
    if (_socket != null && _isConnected) {
      _socket!.emit('join_user_room', userId);
      debugPrint('👤 Kullanıcı odasına katılındı: $userId');
    } else {
      debugPrint('⚠️ WebSocket bağlantısı yok, kullanıcı odasına katılınamadı');
    }
  }

  // Send custom event
  Future<void> sendEvent(String event, dynamic data) async {
    if (_socket != null && _isConnected) {
      _socket!.emit(event, data);
      debugPrint('📤 Event gönderildi: $event - $data');
    } else {
      debugPrint('⚠️ WebSocket bağlantısı yok, event gönderilemedi');
    }
  }

  // Disconnect WebSocket
  Future<void> disconnect() async {
    try {
      if (_socket != null) {
        _socket!.disconnect();
        _socket!.dispose();
        _socket = null;
        _isConnected = false;
        debugPrint('🔌 WebSocket bağlantısı kesildi');
      }
    } catch (e) {
      debugPrint('❌ WebSocket bağlantısı kesilirken hata: $e');
    }
  }

  // Dispose resources
  void dispose() {
    disconnect();
    _planUpdateController.close();
    _sessionCompletedController.close();
    _progressUpdateController.close();
    _userNotificationController.close();
  }

  // Reconnect WebSocket
  Future<void> reconnect() async {
    debugPrint('🔄 WebSocket yeniden bağlanıyor...');
    await disconnect();
    await initializeSocket();
  }

  // Check connection status
  bool get connectionStatus => _isConnected && _socket != null;

  // Get socket instance (for advanced usage)
  IO.Socket? get socket => _socket;
}
