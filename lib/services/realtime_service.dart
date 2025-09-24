import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_env.dart';

class RealtimeService {
  RealtimeService._internal();
  static final RealtimeService _instance = RealtimeService._internal();
  factory RealtimeService() => _instance;

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  IO.Socket? _socket;

  final StreamController<Map<String, dynamic>> _progressController =
      StreamController.broadcast();
  Stream<Map<String, dynamic>> get progressStream => _progressController.stream;

  bool get isConnected => _socket?.connected == true;

  Future<void> connect({required String userId}) async {
    if (_socket != null && _socket!.connected) return;

    final token = await _secureStorage.read(key: 'jwt_token');
    final url = ApiEnv.baseUrl.replaceFirst('http', 'ws');

    _socket = IO.io(
      url,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .build(),
    );

    _socket!.onConnect((_) {
      _socket!.emit('join_user_room', userId);
    });

    _socket!.on('progress_updated', (data) {
      if (data is Map) {
        _progressController.add(Map<String, dynamic>.from(data as Map));
      }
    });

    _socket!.onDisconnect((_) {});
    _socket!.connect();
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }

  void dispose() {
    disconnect();
    _progressController.close();
  }
}

