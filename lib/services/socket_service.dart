import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'api_env.dart';
import 'package:flutter/foundation.dart';

class SocketService {
  // Singleton pattern setup
  SocketService._internal();
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;

  IO.Socket? _socket;
  bool _isInitialized = false;
  String? _currentToken;

  // Getters
  IO.Socket get socket {
    if (_socket == null) {
      throw Exception("Socket not initialized. Call initSocket() first.");
    }
    return _socket!;
  }

  bool get isInitialized => _isInitialized;
  bool get isConnected => _socket?.connected ?? false;
  String? get currentToken => _currentToken;

  // Initialize socket with token
  void initSocket(String token) {
    if (_isInitialized && _currentToken == token) {
      debugPrint('🔌 Socket zaten başlatılmış ve aynı token ile bağlı');
      return;
    }

    debugPrint('🌐 Socket başlatılıyor...');
    debugPrint('   Token: ${token.substring(0, 10)}...');

    // Disconnect existing socket if any
    if (_socket != null) {
      _socket!.disconnect();
      _socket!.dispose();
    }

    _socket = IO.io(ApiEnv.wsUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
      'forceNew': true,
      'auth': {'token': token}
    });

    _setupSocketListeners();
    _socket!.connect();

    _currentToken = token;
    _isInitialized = true;

    debugPrint('✅ Socket başlatıldı');
  }

  // Setup socket event listeners
  void _setupSocketListeners() {
    _socket!.on('connect', (_) {
      debugPrint('✅ Flutter Client Connected');
    });

    _socket!.on('disconnect', (_) {
      debugPrint('❌ Flutter Client Disconnected');
    });

    _socket!.on('connect_error', (error) {
      debugPrint('❌ Socket bağlantı hatası: $error');
    });

    _socket!.on('error', (error) {
      debugPrint('❌ Socket hatası: $error');
    });

    // Custom event listeners
    _socket!.on('plan_updated', (data) {
      debugPrint('📋 Plan güncellemesi alındı: $data');
    });

    _socket!.on('session_completed', (data) {
      debugPrint('✅ Session tamamlandı: $data');
    });

    _socket!.on('progress_updated', (data) {
      debugPrint('📊 İlerleme güncellemesi: $data');
    });

    _socket!.on('user_notification', (data) {
      debugPrint('🔔 Kullanıcı bildirimi: $data');
    });
  }

  // Disconnect socket
  void disconnect() {
    if (_socket != null) {
      debugPrint('🔌 Socket bağlantısı kesiliyor...');
      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
      _isInitialized = false;
      _currentToken = null;
      debugPrint('✅ Socket bağlantısı kesildi');
    }
  }

  // Reconnect socket
  void reconnect() {
    if (_currentToken != null) {
      debugPrint('🔄 Socket yeniden bağlanıyor...');
      disconnect();
      initSocket(_currentToken!);
    } else {
      debugPrint('⚠️ Token yok, yeniden bağlanılamadı');
    }
  }

  // Join a room
  void joinRoom(String roomName) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('join_room', roomName);
      debugPrint('🏠 Odaya katılındı: $roomName');
    } else {
      debugPrint('⚠️ Socket bağlantısı yok, odaya katılınamadı');
    }
  }

  // Leave a room
  void leaveRoom(String roomName) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('leave_room', roomName);
      debugPrint('🚪 Odadan çıkıldı: $roomName');
    }
  }

  // Send custom event
  void sendEvent(String event, dynamic data) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit(event, data);
      debugPrint('📤 Event gönderildi: $event - $data');
    } else {
      debugPrint('⚠️ Socket bağlantısı yok, event gönderilemedi');
    }
  }

  // Get connection status as string
  String get connectionStatus {
    if (!_isInitialized) return 'Başlatılmadı';
    if (_socket?.connected ?? false) return 'Bağlı';
    return 'Bağlantı yok';
  }

  // Check if socket is ready for use
  bool get isReady => _isInitialized && (_socket?.connected ?? false);

  // Dispose resources
  void dispose() {
    disconnect();
  }
}
