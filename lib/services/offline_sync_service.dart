import 'dart:async';
import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

class OfflineSyncService {
  // Singleton pattern
  static final OfflineSyncService _instance = OfflineSyncService._internal();
  factory OfflineSyncService() => _instance;
  OfflineSyncService._internal();

  // Connectivity
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<ConnectivityResult>? _connectivitySubscription;

  // Kuyruk anahtarları
  static const String _queueKey = 'offline_sync_queue';

  // Senkronizasyon durumu
  bool _isSyncing = false;

  // Senkronizasyon callback
  Function(Map<String, dynamic>)? _syncCallback;

  // Servis başlat
  Future<void> init(Function(Map<String, dynamic>) syncCallback) async {
    _syncCallback = syncCallback;

    // Bağlantı değişikliklerini dinle
    _connectivitySubscription =
        _connectivity.onConnectivityChanged.listen(_handleConnectivityChange);

    // Başlangıçta bağlantı kontrolü
    final connectivityResult = await _connectivity.checkConnectivity();
    if (connectivityResult != ConnectivityResult.none) {
      _syncPendingRequests();
    }
  }

  // Bağlantı değişikliklerini işle
  void _handleConnectivityChange(ConnectivityResult result) {
    if (result != ConnectivityResult.none) {
      _syncPendingRequests();
    }
  }

  // Çevrimdışı istek ekle
  Future<void> addOfflineRequest(
      String endpoint, String method, Map<String, dynamic> data) async {
    final prefs = await SharedPreferences.getInstance();

    // Mevcut kuyruğu al
    final queueString = prefs.getString(_queueKey) ?? '[]';
    final queue = jsonDecode(queueString) as List;

    // Yeni istek ekle
    queue.add({
      'id': const Uuid().v4(),
      'endpoint': endpoint,
      'method': method,
      'data': data,
      'timestamp': DateTime.now().toIso8601String(),
    });

    // Kuyruğu kaydet
    await prefs.setString(_queueKey, jsonEncode(queue));
  }

  // Bekleyen istekleri senkronize et
  Future<void> _syncPendingRequests() async {
    // Zaten senkronizasyon yapılıyorsa çık
    if (_isSyncing) return;

    _isSyncing = true;

    try {
      final prefs = await SharedPreferences.getInstance();

      // Mevcut kuyruğu al
      final queueString = prefs.getString(_queueKey) ?? '[]';
      final queue = jsonDecode(queueString) as List;

      if (queue.isEmpty) {
        _isSyncing = false;
        return;
      }

      // Her isteği işle
      final successfulIds = <String>[];

      for (final request in queue) {
        try {
          // Callback ile isteği işle
          if (_syncCallback != null) {
            await _syncCallback!(request);
            successfulIds.add(request['id']);
          }
        } catch (e) {
          print('Senkronizasyon hatası: $e');
          // Hata durumunda diğer isteklere devam et
        }
      }

      // Başarılı istekleri kuyruktan kaldır
      if (successfulIds.isNotEmpty) {
        final newQueue = queue
            .where((request) => !successfulIds.contains(request['id']))
            .toList();
        await prefs.setString(_queueKey, jsonEncode(newQueue));
      }
    } finally {
      _isSyncing = false;
    }
  }

  // Manuel senkronizasyon
  Future<void> syncNow() async {
    final connectivityResult = await _connectivity.checkConnectivity();
    if (connectivityResult != ConnectivityResult.none) {
      await _syncPendingRequests();
    }
  }

  // Bekleyen istek sayısını al
  Future<int> getPendingRequestCount() async {
    final prefs = await SharedPreferences.getInstance();
    final queueString = prefs.getString(_queueKey) ?? '[]';
    final queue = jsonDecode(queueString) as List;
    return queue.length;
  }

  // Servisi temizle
  void dispose() {
    _connectivitySubscription?.cancel();
  }
}
