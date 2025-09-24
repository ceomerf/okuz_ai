import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/socket_service_provider.dart';

class SocketStatusWidget extends ConsumerWidget {
  const SocketStatusWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final socketState = ref.watch(socketServiceNotifierProvider);
    final notifier = ref.read(socketServiceNotifierProvider.notifier);
    return Card(
      margin: const EdgeInsets.all(8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Socket Service Durumu',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: socketState.isConnected ? Colors.green : Colors.red,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    socketState.connectionStatusText,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('Durum: ${socketState.connectionStatusText}') ,
            Text('Oda: ${socketState.currentRoomInfo}') ,
            Text('Hazır: ${socketState.isInitialized ? "Evet" : "Hayır"}'),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: socketState.isInitialized ? null : () => notifier.initializeWithStoredToken(),
                    child: const Text('Başlat'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: socketState.isConnected ? () => notifier.reconnect() : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                    ),
                    child: const Text('Yeniden Bağlan'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: socketState.isConnected ? () => notifier.disconnect() : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                    ),
                    child: const Text('Bağlantıyı Kes'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'Test Butonları:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: socketState.isConnected ? () => notifier.joinRoom('test-room-123') : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                    ),
                    child: const Text('Test Odası'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: socketState.isConnected
                        ? () => notifier.sendEvent('test_event', {
                              'message': 'Test mesajı',
                              'timestamp': DateTime.now().toIso8601String(),
                            })
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.teal,
                    ),
                    child: const Text('Test Event'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: socketState.currentRoom != null ? () => notifier.leaveCurrentRoom() : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey,
                    ),
                    child: const Text('Odadan Çık'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: socketState.isConnected
                        ? () => notifier.sendEvent('plan_join', {
                              'planId': 'test-plan-456',
                              'userId': 'test-user-789',
                            })
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.purple,
                    ),
                    child: const Text('Plan Join'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
