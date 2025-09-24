import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/dialogue_provider.dart';
import '../services/dialogue_api_service.dart';
import '../models/api_error_model.dart';
import '../widgets/error_display_widget.dart';
import '../widgets/typing_indicator.dart';
import '../widgets/animated_chat_message.dart';
import '../services/voice_service.dart';

/// Optimized dialogue screen with const widgets for better performance
class OptimizedDialogueScreen extends ConsumerWidget {
  const OptimizedDialogueScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: const _DialogueAppBar(),
      body: const _DialogueBody(),
    );
  }
}

/// Constant AppBar widget that never changes
class _DialogueAppBar extends StatelessWidget implements PreferredSizeWidget {
  const _DialogueAppBar();

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: const Text('AI Dialogue'),
      backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      actions: const [
        _DialogueAppBarActions(),
      ],
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

/// Constant AppBar actions widget
class _DialogueAppBarActions extends ConsumerWidget {
  const _DialogueAppBarActions();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(dialogueNotifierProvider);
    final notifier = ref.read(dialogueNotifierProvider.notifier);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          onPressed: state.isSendingMessage ? null : () => notifier.clearConversation(),
          icon: const Icon(Icons.clear_all),
          tooltip: 'Clear Conversation',
        ),
        IconButton(
          onPressed: state.isSendingMessage ? null : () => _showSettings(context),
          icon: const Icon(Icons.settings),
          tooltip: 'Settings',
        ),
      ],
    );
  }

  void _showSettings(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => const _DialogueSettingsDialog(),
    );
  }
}

/// Constant settings dialog widget
class _DialogueSettingsDialog extends StatelessWidget {
  const _DialogueSettingsDialog();

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Dialogue Settings'),
      content: const Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ModeSelectionWidget(),
          SizedBox(height: 16),
          _AdvancedSettingsWidget(),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Close'),
        ),
      ],
    );
  }
}

/// Constant mode selection widget
class _ModeSelectionWidget extends ConsumerWidget {
  const _ModeSelectionWidget();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(dialogueNotifierProvider);
    final notifier = ref.read(dialogueNotifierProvider.notifier);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Dialogue Mode',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: ElevatedButton(
                onPressed: () => notifier.setDialogueMode('socratic'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: state.currentDialogueMode == 'socratic'
                      ? Theme.of(context).colorScheme.primary
                      : null,
                  foregroundColor:
                      state.currentDialogueMode == 'socratic' ? Colors.white : null,
                ),
                child: const Text('Socratic'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ElevatedButton(
                onPressed: () => notifier.setDialogueMode('companion'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: state.currentDialogueMode == 'companion'
                      ? Theme.of(context).colorScheme.primary
                      : null,
                  foregroundColor:
                      state.currentDialogueMode == 'companion' ? Colors.white : null,
                ),
                child: const Text('Companion'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// Constant advanced settings widget
class _AdvancedSettingsWidget extends StatelessWidget {
  const _AdvancedSettingsWidget();

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Advanced Settings',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        SizedBox(height: 8),
        Text('Additional settings will be added here'),
      ],
    );
  }
}

/// Main dialogue body widget
class _DialogueBody extends StatelessWidget {
  const _DialogueBody();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          _DialogueHeader(),
          SizedBox(height: 16),
          Expanded(
            child: _ChatHistorySection(),
          ),
          SizedBox(height: 16),
          _ErrorDisplaySection(),
          SizedBox(height: 16),
          _MessageInputSection(),
          SizedBox(height: 16),
          _ActionButtonsSection(),
        ],
      ),
    );
  }
}

/// Constant dialogue header widget
class _DialogueHeader extends ConsumerWidget {
  const _DialogueHeader();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(dialogueNotifierProvider);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'AI Dialogue',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.chat_bubble_outline, size: 16),
                const SizedBox(width: 8),
                Text('Mode: ${state.currentDialogueMode}'),
                const Spacer(),
                if (state.conversationId != null)
                  Text(
                    'Conversation: ${state.conversationId!.substring(0, 8)}...',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Chat history section widget
class _ChatHistorySection extends ConsumerStatefulWidget {
  const _ChatHistorySection();

  @override
  ConsumerState<_ChatHistorySection> createState() => _ChatHistorySectionState();
}

class _ChatHistorySectionState extends ConsumerState<_ChatHistorySection> {
  final GlobalKey<AnimatedListState> _listKey = GlobalKey<AnimatedListState>();

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(dialogueNotifierProvider);
    if (state.chatHistory.isEmpty) {
      return const _EmptyChatWidget();
    }
    return Column(
      children: [
        Expanded(
          child: _AnimatedChatHistoryList(
            chatHistory: state.chatHistory,
            listKey: _listKey,
          ),
        ),
        if (state.isSendingMessage)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: const TypingIndicator(),
          ),
      ],
    );
  }
}

/// Constant empty chat widget
class _EmptyChatWidget extends StatelessWidget {
  const _EmptyChatWidget();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey),
          SizedBox(height: 16),
          Text('No messages yet'),
          SizedBox(height: 8),
          Text('Start a conversation by sending a message'),
        ],
      ),
    );
  }
}

/// Animated chat history list widget
class _AnimatedChatHistoryList extends StatefulWidget {
  final List<Map<String, String>> chatHistory;
  final GlobalKey<AnimatedListState> listKey;

  const _AnimatedChatHistoryList({
    required this.chatHistory,
    required this.listKey,
  });

  @override
  State<_AnimatedChatHistoryList> createState() =>
      _AnimatedChatHistoryListState();
}

class _AnimatedChatHistoryListState extends State<_AnimatedChatHistoryList> {
  late List<Map<String, String>> _messages;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _messages = List.from(widget.chatHistory);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(_AnimatedChatHistoryList oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Check for new messages
    if (widget.chatHistory.length > _messages.length) {
      final newMessages = widget.chatHistory.skip(_messages.length).toList();
      for (final message in newMessages) {
        _messages.add(message);
        final index = _messages.length - 1;
        widget.listKey.currentState?.insertItem(index);
      }

      // Auto-scroll to bottom after a short delay to allow animation to start
      Future.delayed(const Duration(milliseconds: 100), () {
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

  @override
  Widget build(BuildContext context) {
    return AnimatedList(
      key: widget.listKey,
      controller: _scrollController,
      initialItemCount: _messages.length,
      itemBuilder: (context, index, animation) {
        if (index >= _messages.length) {
          return const SizedBox.shrink();
        }

        final message = _messages[index];
        final isUser = message['role'] == 'user';

        return AnimatedChatMessage(
          message: message,
          isUser: isUser,
          animation: animation,
        );
      },
    );
  }
}

/// Error display section widget
class _ErrorDisplaySection extends ConsumerWidget {
  const _ErrorDisplaySection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(dialogueNotifierProvider);
    final notifier = ref.read(dialogueNotifierProvider.notifier);
    if (state.error == null) return const SizedBox.shrink();
    return ErrorDisplayWidget.fromApiError(
      error: state.error!,
      onRetry: () {
        final lastUser = notifier.lastUserMessage;
        if (lastUser != null) notifier.sendMessageStreaming(lastUser);
      },
    );
  }
}

/// Message input section widget
class _MessageInputSection extends ConsumerStatefulWidget {
  const _MessageInputSection();

  @override
  _MessageInputSectionState createState() => _MessageInputSectionState();
}

class _MessageInputSectionState extends ConsumerState<_MessageInputSection> {
  final TextEditingController _messageController = TextEditingController();

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(dialogueNotifierProvider);
    final notifier = ref.read(dialogueNotifierProvider.notifier);
        // Voice state aware microphone button
        IconData micIcon = Icons.mic_none;
        Color micColor = Colors.grey;
        
        if (notifier.voiceState == VoiceState.listening) {
          micIcon = Icons.mic;
          micColor = Colors.red;
        } else if (notifier.voiceState == VoiceState.processing) {
          micIcon = Icons.settings_voice;
          micColor = Colors.grey.withOpacity(0.5); // Disabled look
        }

        return Row(
          children: [
            Expanded(
              child: TextField(
                controller: _messageController,
                enabled: !state.isSendingMessage,
                decoration: const InputDecoration(
                  hintText: 'Type your message...',
                  border: OutlineInputBorder(),
                ),
                onSubmitted: (_) => _sendMessageStreaming(notifier),
              ),
            ),
            const SizedBox(width: 8),
            // Microphone button
            IconButton(
              icon: Icon(micIcon),
              color: micColor,
              iconSize: 30,
              // Disable the button while processing or speaking
              onPressed: (notifier.voiceState == VoiceState.processing || state.isSendingMessage) 
                ? null 
                : () => notifier.toggleVoiceListening(),
            ),
            const SizedBox(width: 8),
            // Send button
            ElevatedButton(
              onPressed: state.isSendingMessage
                  ? null
                  : () => _sendMessageStreaming(notifier),
              child: const Icon(Icons.send),
            ),
          ],
        );
  }

  void _sendMessageStreaming(DialogueNotifier notifier) {
    final message = _messageController.text.trim();
    if (message.isNotEmpty) {
      notifier.sendMessageStreaming(message);
      _messageController.clear();
    }
  }
}

/// Action buttons section widget
class _ActionButtonsSection extends ConsumerWidget {
  const _ActionButtonsSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(dialogueNotifierProvider);
    final notifier = ref.read(dialogueNotifierProvider.notifier);
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _ActionButton(
          onPressed: state.isSendingMessage
              ? null
              : () => notifier.sendMessageStreaming('Hello'),
              icon: Icons.message,
              label: 'Test Message',
            ),
        _ActionButton(
              onPressed: state.isSendingMessage
                  ? null
                  : () => notifier.sendMessageStreaming('error'),
              icon: Icons.error,
              label: 'Test Error',
            ),
        _ActionButton(
              onPressed: state.isSendingMessage
                  ? null
                  : () => notifier.sendMessageStreaming('network'),
              icon: Icons.wifi_off,
              label: 'Test Network Error',
            ),
        _ActionButton(
              onPressed: state.isSendingMessage
                  ? null
                  : () => notifier.sendMessageStreaming('timeout'),
              icon: Icons.timer,
              label: 'Test Timeout',
            ),
        _ActionButton(
              onPressed: state.isSendingMessage
                  ? null
                  : () => notifier.sendMessageStreaming('auth'),
              icon: Icons.lock,
              label: 'Test Auth Error',
            ),
        _ActionButton(
              onPressed: state.isSendingMessage
                  ? null
                  : () => notifier.sendMessageStreaming('server'),
              icon: Icons.dns,
              label: 'Test Server Error',
            ),
        _ActionButton(
              onPressed: state.isSendingMessage
                  ? null
                  : () => notifier.clearConversation(),
              icon: Icons.clear,
              label: 'Clear Chat',
            ),
        _ActionButton(
              onPressed: state.isSendingMessage
                  ? null
                  : () => _switchMode(ref),
              icon: Icons.swap_horiz,
              label: 'Switch Mode',
            ),
        _ActionButton(
              onPressed: state.isSendingMessage
                  ? null
                  : () => ref.read(dialogueNotifierProvider.notifier).addTestMessage('This is a test message to demonstrate the animation! 🎉'),
              icon: Icons.animation,
              label: 'Test Animation',
            ),
      ],
    );
  }

  void _switchMode(WidgetRef ref) {
    final state = ref.read(dialogueNotifierProvider);
    final newMode = state.currentDialogueMode == 'socratic' ? 'companion' : 'socratic';
    ref.read(dialogueNotifierProvider.notifier).switchMode(newMode);
  }
}

/// Constant action button widget
class _ActionButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final IconData icon;
  final String label;

  const _ActionButton({
    required this.onPressed,
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon),
      label: Text(label),
    );
  }
}

/// Constant spacing widgets for better performance
class _DialogueSpacing {
  static const SizedBox small = SizedBox(height: 8);
  static const SizedBox medium = SizedBox(height: 16);
  static const SizedBox large = SizedBox(height: 24);
}

/// Constant padding widgets
class _DialoguePadding {
  static const EdgeInsets all = EdgeInsets.all(16);
  static const EdgeInsets horizontal = EdgeInsets.symmetric(horizontal: 16);
  static const EdgeInsets vertical = EdgeInsets.symmetric(vertical: 16);
}

/// Performance optimized dialogue screen with const widgets
class PerformanceOptimizedDialogueScreen extends ConsumerWidget {
  const PerformanceOptimizedDialogueScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: const _DialogueAppBar(),
      body: const _OptimizedDialogueBody(),
    );
  }
}

/// Optimized dialogue body with const widgets
class _OptimizedDialogueBody extends StatelessWidget {
  const _OptimizedDialogueBody();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: _DialoguePadding.all,
      child: Column(
        children: [
          _DialogueHeader(),
          _DialogueSpacing.medium,
          Expanded(
            child: _ChatHistorySection(),
          ),
          _DialogueSpacing.medium,
          _ErrorDisplaySection(),
          _DialogueSpacing.medium,
          _MessageInputSection(),
          _DialogueSpacing.medium,
          _ActionButtonsSection(),
        ],
      ),
    );
  }
}
