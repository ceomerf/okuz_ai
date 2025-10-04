import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/websocket_service.dart';

class WebSocketState {
  final bool isConnected;
  final bool isInitialized;
  final String? currentPlanId;
  final String? currentUserId;
  const WebSocketState({
    this.isConnected = false,
    this.isInitialized = false,
    this.currentPlanId,
    this.currentUserId,
  });

  String get connectionStatusText {
    if (!isInitialized) return 'Başlatılıyor...';
    if (isConnected) return 'Bağlı';
    return 'Bağlantı yok';
  }

  String get currentRoomInfo {
    if (currentPlanId != null) return 'Plan: $currentPlanId';
    if (currentUserId != null) return 'Kullanıcı: $currentUserId';
    return 'Oda yok';
  }

  WebSocketState copyWith({
    bool? isConnected,
    bool? isInitialized,
    String? currentPlanId,
    String? currentUserId,
  }) {
    return WebSocketState(
      isConnected: isConnected ?? this.isConnected,
      isInitialized: isInitialized ?? this.isInitialized,
      currentPlanId: currentPlanId ?? this.currentPlanId,
      currentUserId: currentUserId ?? this.currentUserId,
    );
  }
}

class WebSocketNotifier extends StateNotifier<WebSocketState> {
  final WebSocketService _webSocketService = WebSocketService();
  WebSocketNotifier() : super(const WebSocketState());

  Future<void> initialize() async {
    try {
      debugPrint('🌐 WebSocket Provider başlatılıyor...');
      await _webSocketService.initializeSocket();
      state = state.copyWith(isInitialized: true);

      _webSocketService.socket?.on('connect', (_) {
        state = state.copyWith(isConnected: true);
        debugPrint('✅ WebSocket Provider: Bağlantı kuruldu');
      });

      _webSocketService.socket?.on('disconnect', (_) {
        state = state.copyWith(isConnected: false);
        debugPrint('❌ WebSocket Provider: Bağlantı kesildi');
      });

      debugPrint('✅ WebSocket Provider başlatıldı');
    } catch (e) {
      debugPrint('❌ WebSocket Provider başlatma hatası: $e');
    }
  }

  Future<void> joinPlanRoom(String planId) async {
    try {
      await _webSocketService.joinPlanRoom(planId);
      state = state.copyWith(currentPlanId: planId);
      debugPrint('🏠 Plan odasına katılındı: $planId');
    } catch (e) {
      debugPrint('❌ Plan odasına katılma hatası: $e');
    }
  }

  Future<void> leaveCurrentPlanRoom() async {
    if (state.currentPlanId != null) {
      await _webSocketService.leavePlanRoom(state.currentPlanId!);
      state = state.copyWith(currentPlanId: null);
      debugPrint('🚪 Mevcut plan odasından çıkıldı');
    }
  }

  Future<void> joinUserRoom(String userId) async {
    try {
      await _webSocketService.joinUserRoom(userId);
      state = state.copyWith(currentUserId: userId);
      debugPrint('👤 Kullanıcı odasına katılındı: $userId');
    } catch (e) {
      debugPrint('❌ Kullanıcı odasına katılma hatası: $e');
    }
  }

  Future<void> sendEvent(String event, dynamic data) async {
    try {
      await _webSocketService.sendEvent(event, data);
      debugPrint('📤 Event gönderildi: $event');
    } catch (e) {
      debugPrint('❌ Event gönderme hatası: $e');
    }
  }

  Future<void> reconnect() async {
    try {
      await _webSocketService.reconnect();
      debugPrint('🔄 WebSocket yeniden bağlandı');
    } catch (e) {
      debugPrint('❌ WebSocket yeniden bağlanma hatası: $e');
    }
  }

  Future<void> disconnect() async {
    try {
      await _webSocketService.disconnect();
      state = const WebSocketState(isConnected: false, isInitialized: false);
      debugPrint('🔌 WebSocket bağlantısı kesildi');
    } catch (e) {
      debugPrint('❌ WebSocket bağlantısı kesme hatası: $e');
    }
  }

  @override
  void dispose() {
    _webSocketService.dispose();
    super.dispose();
  }
}

final webSocketNotifierProvider =
    StateNotifierProvider<WebSocketNotifier, WebSocketState>((ref) {
  return WebSocketNotifier();
});
