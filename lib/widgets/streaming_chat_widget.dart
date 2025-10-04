import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/dialogue_provider.dart';

/// Widget that demonstrates streaming chat functionality
class StreamingChatWidget extends ConsumerStatefulWidget {
  const StreamingChatWidget({Key? key}) : super(key: key);

  @override
  ConsumerState<StreamingChatWidget> createState() => _StreamingChatWidgetState();
}

class _StreamingChatWidgetState extends ConsumerState<StreamingChatWidget> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(dialogueNotifierProvider);
    final notifier = ref.read(dialogueNotifierProvider.notifier);
    return Column(
      children: [
        // Chat messages area
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            itemCount: state.chatHistory.length + (state.isStreaming ? 1 : 0),
            itemBuilder: (context, index) {
              if (index == state.chatHistory.length && state.isStreaming) {
                // Show typing indicator with partial response
                return _buildTypingMessage(state.aiTypingResponse);
              }

              final message = state.chatHistory[index];
              return _buildMessageTile(message);
            },
          ),
        ),

        // Suggested replies
        if (state.suggestedReplies.isNotEmpty)
          _buildSuggestedReplies(notifier, state.suggestedReplies),

        // Mode switch dialog
        if (state.pendingModeSwitch != null)
          _buildModeSwitchDialog(notifier),

        // Input area
        _buildInputArea(state.isSendingMessage, notifier),
      ],
    );
  }

  Widget _buildMessageTile(Map<String, String> message) {
    final isUser = message['role'] == 'user';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.75,
            ),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isUser ? Colors.blue[100] : Colors.grey[100],
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              message['content'] ?? '',
              style: const TextStyle(
                color: Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypingMessage(String aiTypingResponse) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.75,
            ),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  aiTypingResponse.isNotEmpty
                      ? aiTypingResponse
                      : 'AI is typing...',
                  style: const TextStyle(color: Colors.black87),
                ),
                if (aiTypingResponse.isNotEmpty) const SizedBox(height: 4),
                if (aiTypingResponse.isNotEmpty)
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuggestedReplies(DialogueNotifier notifier, List<String> replies) {
    return Container(
      height: 60,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: replies.length,
        itemBuilder: (context, index) {
          final reply = replies[index];
          return Container(
            margin: const EdgeInsets.only(right: 8),
            child: ElevatedButton(
              onPressed: () {
                _messageController.text = reply;
                _sendMessage(notifier);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue[50],
                foregroundColor: Colors.blue[700],
              ),
              child: Text(reply),
            ),
          );
        },
      ),
    );
  }

  Widget _buildModeSwitchDialog(DialogueNotifier notifier) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.orange[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.orange[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Mod Değişikliği Önerisi',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: Colors.orange[800],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Görüyorum ki bu konu seni biraz zorluyor. İstersen Sokratik sorgulamaya bir ara verip, konuyu bir arkadaş gibi birlikte gözden geçirelim mi?',
            style: TextStyle(color: Colors.orange[700]),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: () => notifier.acceptModeSwitch(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange[600],
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Evet, Mentor Moduna Geç'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => notifier.declineModeSwitch(),
                  child: const Text('Hayır, Sokrat ile Devam Et'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInputArea(bool isSending, DialogueNotifier notifier) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.2),
            spreadRadius: 1,
            blurRadius: 3,
            offset: const Offset(0, -1),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _messageController,
              decoration: const InputDecoration(
                hintText: 'Mesajınızı yazın...',
                border: OutlineInputBorder(),
              ),
              enabled: !isSending,
              onSubmitted: (_) => _sendMessage(notifier),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            onPressed: isSending ? null : () => _sendMessage(notifier),
            icon: isSending
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.send),
          ),
        ],
      ),
    );
  }

  void _sendMessage(DialogueNotifier notifier) {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;

    _messageController.clear();

    // Use streaming method for real-time response
    notifier.sendMessageStreaming(message);

    // Scroll to bottom
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }
}
