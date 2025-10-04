import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/socket_service.dart';
import '../services/api_service.dart';

class SocketState {
  final bool isConnected;
  final bool isInitialized;
  final String? currentRoom;
  const SocketState({this.isConnected = false, this.isInitialized = false, this.currentRoom});

  String get connectionStatusText {
    if (!isInitialized) return 'Başlatılıyor...';
    if (isConnected) return 'Bağlı';
    return 'Bağlantı yok';
  }

  String get currentRoomInfo => currentRoom != null ? 'Oda: $currentRoom' : 'Oda yok';

  SocketState copyWith({bool? isConnected, bool? isInitialized, String? currentRoom}) {
    return SocketState(
      isConnected: isConnected ?? this.isConnected,
      isInitialized: isInitialized ?? this.isInitialized,
      currentRoom: currentRoom ?? this.currentRoom,
    );
  }
}

class SocketServiceNotifier extends StateNotifier<SocketState> {
  final SocketService _socketService = SocketService();
  SocketServiceNotifier() : super(const SocketState());

  Future<void> initializeWithStoredToken() async {
    try {
      debugPrint('🔑 Stored token ile socket başlatılıyor...');
      final token = await ApiService.getToken();
      if (token != null) {
        await initializeWithToken(token);
      } else {
        debugPrint('⚠️ Stored token bulunamadı');
      }
    } catch (e) {
      debugPrint('❌ Stored token ile başlatma hatası: $e');
    }
  }

  Future<void> initializeWithToken(String token) async {
    try {
      debugPrint('🌐 Socket Provider başlatılıyor...');
      _socketService.initSocket(token);
      state = state.copyWith(isInitialized: true);

      _socketService.socket.on('connect', (_) {
        state = state.copyWith(isConnected: true);
        debugPrint('✅ Socket Provider: Bağlantı kuruldu');
      });

      _socketService.socket.on('disconnect', (_) {
        state = state.copyWith(isConnected: false);
        debugPrint('❌ Socket Provider: Bağlantı kesildi');
      });

      debugPrint('✅ Socket Provider başlatıldı');
    } catch (e) {
      debugPrint('❌ Socket Provider başlatma hatası: $e');
    }
  }

  Future<void> joinRoom(String roomName) async {
    try {
      _socketService.joinRoom(roomName);
      state = state.copyWith(currentRoom: roomName);
      debugPrint('🏠 Odaya katılındı: $roomName');
    } catch (e) {
      debugPrint('❌ Odaya katılma hatası: $e');
    }
  }

  Future<void> leaveCurrentRoom() async {
    if (state.currentRoom != null) {
      _socketService.leaveRoom(state.currentRoom!);
      state = state.copyWith(currentRoom: null);
      debugPrint('🚪 Mevcut odadan çıkıldı');
    }
  }

  Future<void> sendEvent(String event, dynamic data) async {
    try {
      _socketService.sendEvent(event, data);
      debugPrint('📤 Event gönderildi: $event');
    } catch (e) {
      debugPrint('❌ Event gönderme hatası: $e');
    }
  }

  Future<void> reconnect() async {
    try {
      _socketService.reconnect();
      debugPrint('🔄 Socket yeniden bağlandı');
    } catch (e) {
      debugPrint('❌ Socket yeniden bağlanma hatası: $e');
    }
  }

  Future<void> disconnect() async {
    try {
      _socketService.disconnect();
      state = const SocketState(isConnected: false, isInitialized: false);
      debugPrint('🔌 Socket bağlantısı kesildi');
    } catch (e) {
      debugPrint('❌ Socket bağlantısı kesme hatası: $e');
    }
  }

  @override
  void dispose() {
    _socketService.dispose();
    super.dispose();
  }

  bool get isReady => _socketService.isReady;
  dynamic get socket => _socketService.isReady ? _socketService.socket : null;
}

final socketServiceNotifierProvider =
    StateNotifierProvider<SocketServiceNotifier, SocketState>((ref) {
  return SocketServiceNotifier();
});
