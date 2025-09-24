import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:okuz_ai/services/providers.dart';
import 'package:okuz_ai/services/dialogue_api_service.dart';
/*
// import 'package:flutter_riverpod/flutter_riverpod.dart';
// Disabled demo imports for build stability
// import '../providers/dialogue_provider.dart';
// import '../services/dialogue_api_service.dart';
// import '../models/api_error_model.dart';
// import '../widgets/error_display_widget.dart';

/// BEFORE OPTIMIZATION - Poor Performance
/// This example shows how NOT to structure the dialogue UI
class UnoptimizedDialogueScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        // ❌ Missing const - will rebuild
        title: Text('AI Dialogue'), // ❌ Missing const - will rebuild
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          IconButton(
            // ❌ Missing const - will rebuild
            onPressed: () {}, // ❌ No provider access
            icon: Icon(Icons.clear_all), // ❌ Missing const - will rebuild
            tooltip: 'Clear Conversation',
          ),
          IconButton(
            // ❌ Missing const - will rebuild
            onPressed: () {}, // ❌ No provider access
            icon: Icon(Icons.settings), // ❌ Missing const - will rebuild
            tooltip: 'Settings',
          ),
        ],
      ),
      body: Consumer(
        // ❌ Entire body rebuilds on any state change
        builder: (context, ref, child) {
          return Padding(
            // ❌ Missing const - will rebuild
            padding: EdgeInsets.all(16), // ❌ Missing const - will rebuild
            child: Column(
              // ❌ Missing const - will rebuild
              children: [
                // ❌ ALL these widgets rebuild on ANY state change
                Card(
                  // ❌ Missing const - will rebuild
                  child: Padding(
                    // ❌ Missing const - will rebuild
                    padding:
                        EdgeInsets.all(16), // ❌ Missing const - will rebuild
                    child: Column(
                      // ❌ Missing const - will rebuild
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          // ❌ Missing const - will rebuild
                          'AI Dialogue',
                          style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight
                                  .bold), // ❌ Missing const - will rebuild
                        ),
                        SizedBox(height: 8), // ❌ Missing const - will rebuild
                        Row(
                          // ❌ Missing const - will rebuild
                          children: [
                            Icon(Icons.chat_bubble_outline,
                                size: 16), // ❌ Missing const - will rebuild
                            SizedBox(
                                width: 8), // ❌ Missing const - will rebuild
                            Text('Mode: socratic'),
                            Spacer(), // ❌ Missing const - will rebuild
                            if (false)
                              Text(
                                'Conversation: abcdef12...',
                                style: TextStyle(
                                    fontSize: 12,
                                    color: Colors
                                        .grey), // ❌ Missing const - will rebuild
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 16), // ❌ Missing const - will rebuild
                Expanded(
                  child: _buildChatHistoryPlaceholder(), // ❌ Complex method call
                ),
                SizedBox(height: 16), // ❌ Missing const - will rebuild
                _buildErrorDisplayPlaceholder(), // ❌ Complex method call
                SizedBox(height: 16), // ❌ Missing const - will rebuild
                _buildMessageInputPlaceholder(), // ❌ Complex method call
                SizedBox(height: 16), // ❌ Missing const - will rebuild
                _buildActionButtonsPlaceholder(), // ❌ Complex method call
              ],
            ),
          );
        },
      ),
    );
  }

  // ❌ Large methods that rebuild entire sections
  Widget _buildChatHistoryPlaceholder() {
    final bool isLoading = false;
    if (isLoading) {
      return Center(
        // ❌ Missing const - will rebuild
        child: Column(
          // ❌ Missing const - will rebuild
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(), // ❌ Missing const - will rebuild
            SizedBox(height: 16), // ❌ Missing const - will rebuild
            Text('Sending message...'), // ❌ Missing const - will rebuild
          ],
        ),
      );
    }

    final List<Map<String, String>> chatHistory = const [];
    if (chatHistory.isEmpty) {
      return Center(
        // ❌ Missing const - will rebuild
        child: Column(
          // ❌ Missing const - will rebuild
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.chat_bubble_outline,
                size: 64, color: Colors.grey), // ❌ Missing const - will rebuild
            SizedBox(height: 16), // ❌ Missing const - will rebuild
            Text('No messages yet'), // ❌ Missing const - will rebuild
            SizedBox(height: 8), // ❌ Missing const - will rebuild
            Text(
                'Start a conversation by sending a message'), // ❌ Missing const - will rebuild
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: chatHistory.length,
      itemBuilder: (context, index) {
        final message = chatHistory[index];
        final isUser = message['role'] == 'user';

        return Card(
          // ❌ Missing const - will rebuild
          margin: EdgeInsets.only(bottom: 8), // ❌ Missing const - will rebuild
          child: ListTile(
            // ❌ Missing const - will rebuild
            leading: Icon(
              // ❌ Missing const - will rebuild
              isUser ? Icons.person : Icons.smart_toy,
              color: isUser ? Colors.blue : Colors.green,
            ),
            title: Text(message['content'] ?? ''),
            subtitle: Text(
              isUser ? 'You' : 'AI Assistant',
              style: TextStyle(fontSize: 12), // ❌ Missing const - will rebuild
            ),
          ),
        );
      },
    );
  }

  Widget _buildErrorDisplayPlaceholder() {
    final bool hasError = false;
    if (!hasError)
      return SizedBox.shrink(); // ❌ Missing const - will rebuild

    return const SizedBox.shrink();
  }

  Widget _buildMessageInputPlaceholder() {
    return Row(
      // ❌ Missing const - will rebuild
      children: [
        Expanded(
          child: TextField(
            // ❌ Missing const - will rebuild
            decoration: InputDecoration(
              // ❌ Missing const - will rebuild
              hintText: 'Type your message...',
              border: OutlineInputBorder(), // ❌ Missing const - will rebuild
            ),
            onSubmitted: (_) {},
          ),
        ),
        SizedBox(width: 8), // ❌ Missing const - will rebuild
        ElevatedButton(
          // ❌ Missing const - will rebuild
          onPressed: () {},
          child: Icon(Icons.send), // ❌ Missing const - will rebuild
        ),
      ],
    );
  }

  Widget _buildActionButtonsPlaceholder() {
    return Wrap(
      // ❌ Missing const - will rebuild
      spacing: 8,
      runSpacing: 8,
      children: [
        ElevatedButton.icon(
          // ❌ Missing const - will rebuild
          onPressed: () {},
          icon: Icon(Icons.message), // ❌ Missing const - will rebuild
          label: Text('Test Message'), // ❌ Missing const - will rebuild
        ),
        ElevatedButton.icon(
          // ❌ Missing const - will rebuild
          onPressed: () {},
          icon: Icon(Icons.error), // ❌ Missing const - will rebuild
          label: Text('Test Error'), // ❌ Missing const - will rebuild
        ),
        // ... many more buttons
      ],
    );
  }
}

/// AFTER OPTIMIZATION - High Performance
/// This example shows the optimized dialogue UI structure
class OptimizedDialogueScreen extends StatelessWidget {
  const OptimizedDialogueScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const _DialogueAppBar(), // ✅ Const - never rebuilds
      body: ChangeNotifierProvider(
        create: (context) => DialogueProvider(
          apiService: DialogueApiService(),
        ),
        child: const _DialogueBody(), // ✅ Const - never rebuilds
      ),
    );
  }
}

/// ✅ OPTIMIZED - Constant AppBar widget that never changes
class _DialogueAppBar extends StatelessWidget implements PreferredSizeWidget {
  const _DialogueAppBar();

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: const Text('AI Dialogue'), // ✅ Const text
      backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      actions: const [
        _DialogueAppBarActions(), // ✅ Const actions
      ],
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

/// ✅ OPTIMIZED - Constant AppBar actions widget
class _DialogueAppBarActions extends StatelessWidget {
  const _DialogueAppBarActions();

  @override
  Widget build(BuildContext context) {
    return Consumer<DialogueProvider>(
      builder: (context, provider, child) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              onPressed: provider.isLoading
                  ? null
                  : () => provider.clearConversation(),
              icon: const Icon(Icons.clear_all), // ✅ Const icon
              tooltip: 'Clear Conversation',
            ),
            IconButton(
              onPressed:
                  provider.isLoading ? null : () => _showSettings(context),
              icon: const Icon(Icons.settings), // ✅ Const icon
              tooltip: 'Settings',
            ),
          ],
        );
      },
    );
  }

  void _showSettings(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => const _DialogueSettingsDialog(), // ✅ Const dialog
    );
  }
}

/// ✅ OPTIMIZED - Constant settings dialog widget
class _DialogueSettingsDialog extends StatelessWidget {
  const _DialogueSettingsDialog();

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Dialogue Settings'), // ✅ Const text
      content: const Column(
        // ✅ Const column
        mainAxisSize: MainAxisSize.min,
        children: [
          _ModeSelectionWidget(), // ✅ Const widget
          SizedBox(height: 16), // ✅ Const spacing
          _AdvancedSettingsWidget(), // ✅ Const widget
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Close'), // ✅ Const text
        ),
      ],
    );
  }
}

/// ✅ OPTIMIZED - Constant mode selection widget
class _ModeSelectionWidget extends StatelessWidget {
  const _ModeSelectionWidget();

  @override
  Widget build(BuildContext context) {
    return Consumer<DialogueProvider>(
      builder: (context, provider, child) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              // ✅ Const text
              'Dialogue Mode',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8), // ✅ Const spacing
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => provider.setDialogueMode('socratic'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          provider.currentDialogueMode == 'socratic'
                              ? Theme.of(context).colorScheme.primary
                              : null,
                      foregroundColor:
                          provider.currentDialogueMode == 'socratic'
                              ? Colors.white
                              : null,
                    ),
                    child: const Text('Socratic'), // ✅ Const text
                  ),
                ),
                const SizedBox(width: 8), // ✅ Const spacing
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => provider.setDialogueMode('companion'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          provider.currentDialogueMode == 'companion'
                              ? Theme.of(context).colorScheme.primary
                              : null,
                      foregroundColor:
                          provider.currentDialogueMode == 'companion'
                              ? Colors.white
                              : null,
                    ),
                    child: const Text('Companion'), // ✅ Const text
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}

/// ✅ OPTIMIZED - Constant advanced settings widget
class _AdvancedSettingsWidget extends StatelessWidget {
  const _AdvancedSettingsWidget();

  @override
  Widget build(BuildContext context) {
    return const Column(
      // ✅ Const column
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          // ✅ Const text
          'Advanced Settings',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        SizedBox(height: 8), // ✅ Const spacing
        Text('Additional settings will be added here'), // ✅ Const text
      ],
    );
  }
}

/// ✅ OPTIMIZED - Main dialogue body widget
class _DialogueBody extends StatelessWidget {
  const _DialogueBody();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      // ✅ Const padding
      padding: _DialoguePadding.all, // ✅ Const padding utility
      child: Column(
        // ✅ Const column
        children: [
          _DialogueHeader(), // ✅ Only rebuilds when mode changes
          _DialogueSpacing.medium, // ✅ Never rebuilds
          Expanded(
            child:
                _ChatHistorySection(), // ✅ Only rebuilds when history changes
          ),
          _DialogueSpacing.medium, // ✅ Never rebuilds
          _ErrorDisplaySection(), // ✅ Only rebuilds when error changes
          _DialogueSpacing.medium, // ✅ Never rebuilds
          _MessageInputSection(), // ✅ Only rebuilds when loading changes
          _DialogueSpacing.medium, // ✅ Never rebuilds
          _ActionButtonsSection(), // ✅ Only rebuilds when loading changes
        ],
      ),
    );
  }
}

/// ✅ OPTIMIZED - Constant dialogue header widget
class _DialogueHeader extends StatelessWidget {
  const _DialogueHeader();

  @override
  Widget build(BuildContext context) {
    return Consumer<DialogueProvider>(
      builder: (context, provider, child) {
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16), // ✅ Const padding
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  // ✅ Const text
                  'AI Dialogue',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8), // ✅ Const spacing
                Row(
                  children: [
                    const Icon(Icons.chat_bubble_outline,
                        size: 16), // ✅ Const icon
                    const SizedBox(width: 8), // ✅ Const spacing
                    Text(
                        'Mode: ${provider.currentDialogueMode}'), // Only this text rebuilds
                    const Spacer(), // ✅ Const spacer
                    if (provider.conversationId != null)
                      Text(
                        'Conversation: ${provider.conversationId!.substring(0, 8)}...',
                        style: const TextStyle(
                            fontSize: 12, color: Colors.grey), // ✅ Const style
                      ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// ✅ OPTIMIZED - Chat history section widget
class _ChatHistorySection extends StatelessWidget {
  const _ChatHistorySection();

  @override
  Widget build(BuildContext context) {
    return Consumer<DialogueProvider>(
      builder: (context, provider, child) {
        if (provider.isLoading) {
          return const _LoadingWidget(); // ✅ Const widget
        }

        if (provider.chatHistory.isEmpty) {
          return const _EmptyChatWidget(); // ✅ Const widget
        }

        return _ChatHistoryList(chatHistory: provider.chatHistory);
      },
    );
  }
}

/// ✅ OPTIMIZED - Constant loading widget
class _LoadingWidget extends StatelessWidget {
  const _LoadingWidget();

  @override
  Widget build(BuildContext context) {
    return const Center(
      // ✅ Const center
      child: Column(
        // ✅ Const column
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(), // ✅ Const widget
          SizedBox(height: 16), // ✅ Const spacing
          Text('Sending message...'), // ✅ Const text
        ],
      ),
    );
  }
}

/// ✅ OPTIMIZED - Constant empty chat widget
class _EmptyChatWidget extends StatelessWidget {
  const _EmptyChatWidget();

  @override
  Widget build(BuildContext context) {
    return const Center(
      // ✅ Const center
      child: Column(
        // ✅ Const column
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.chat_bubble_outline,
              size: 64, color: Colors.grey), // ✅ Const icon
          SizedBox(height: 16), // ✅ Const spacing
          Text('No messages yet'), // ✅ Const text
          SizedBox(height: 8), // ✅ Const spacing
          Text('Start a conversation by sending a message'), // ✅ Const text
        ],
      ),
    );
  }
}

/// ✅ OPTIMIZED - Chat history list widget
class _ChatHistoryList extends StatelessWidget {
  final List<Map<String, String>> chatHistory;

  const _ChatHistoryList({required this.chatHistory});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: chatHistory.length,
      itemBuilder: (context, index) {
        final message = chatHistory[index];
        final isUser = message['role'] == 'user';

        return _ChatMessageTile(
          // ✅ Const constructor
          message: message,
          isUser: isUser,
        );
      },
    );
  }
}

/// ✅ OPTIMIZED - Individual chat message tile widget
class _ChatMessageTile extends StatelessWidget {
  final Map<String, String> message;
  final bool isUser;

  const _ChatMessageTile({
    // ✅ Const constructor
    required this.message,
    required this.isUser,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8), // ✅ Const margin
      child: ListTile(
        leading: Icon(
          isUser ? Icons.person : Icons.smart_toy,
          color: isUser ? Colors.blue : Colors.green,
        ),
        title: Text(message['content'] ?? ''),
        subtitle: Text(
          isUser ? 'You' : 'AI Assistant',
          style: const TextStyle(fontSize: 12), // ✅ Const style
        ),
      ),
    );
  }
}

/// ✅ OPTIMIZED - Error display section widget
class _ErrorDisplaySection extends StatelessWidget {
  const _ErrorDisplaySection();

  @override
  Widget build(BuildContext context) {
    return Consumer<DialogueProvider>(
      builder: (context, provider, child) {
        if (!provider.hasError)
          return const SizedBox.shrink(); // ✅ Const widget

        return ErrorDisplayWidget.fromApiError(
          error: provider.error!.toApiError(),
          onRetry: () => _retryLastMessage(provider),
        );
      },
    );
  }

  void _retryLastMessage(DialogueProvider provider) {
    final lastUserMessage = provider.lastUserMessage;
    if (lastUserMessage != null) {
      provider.sendMessageStreaming(lastUserMessage);
    }
  }
}

/// ✅ OPTIMIZED - Message input section widget
class _MessageInputSection extends StatefulWidget {
  const _MessageInputSection();

  @override
  _MessageInputSectionState createState() => _MessageInputSectionState();
}

class _MessageInputSectionState extends State<_MessageInputSection> {
  final TextEditingController _messageController = TextEditingController();

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<DialogueProvider>(
      builder: (context, provider, child) {
        return Row(
          children: [
            Expanded(
              child: TextField(
                controller: _messageController,
                decoration: const InputDecoration(
                  // ✅ Const decoration
                  hintText: 'Type your message...',
                  border: OutlineInputBorder(),
                ),
                onSubmitted: (_) => _sendMessageStreaming(provider),
              ),
            ),
            const SizedBox(width: 8), // ✅ Const spacing
            ElevatedButton(
              onPressed: provider.isLoading
                  ? null
                  : () => _sendMessageStreaming(provider),
              child: const Icon(Icons.send), // ✅ Const icon
            ),
          ],
        );
      },
    );
  }

  void _sendMessageStreaming(DialogueProvider provider) {
    final message = _messageController.text.trim();
    if (message.isNotEmpty) {
      provider.sendMessageStreaming(message);
      _messageController.clear();
    }
  }
}

/// ✅ OPTIMIZED - Action buttons section widget
class _ActionButtonsSection extends StatelessWidget {
  const _ActionButtonsSection();

  @override
  Widget build(BuildContext context) {
    return Consumer<DialogueProvider>(
      builder: (context, provider, child) {
        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _ActionButton(
              // ✅ Const widget
              onPressed: provider.isLoading
                  ? null
                  : () => _sendTestMessage(provider, 'Hello'),
              icon: Icons.message,
              label: 'Test Message',
            ),
            _ActionButton(
              // ✅ Const widget
              onPressed: provider.isLoading
                  ? null
                  : () => _sendTestMessage(provider, 'error'),
              icon: Icons.error,
              label: 'Test Error',
            ),
            _ActionButton(
              // ✅ Const widget
              onPressed: provider.isLoading
                  ? null
                  : () => _sendTestMessage(provider, 'network'),
              icon: Icons.wifi_off,
              label: 'Test Network Error',
            ),
            _ActionButton(
              // ✅ Const widget
              onPressed: provider.isLoading
                  ? null
                  : () => _sendTestMessage(provider, 'timeout'),
              icon: Icons.timer,
              label: 'Test Timeout',
            ),
            _ActionButton(
              // ✅ Const widget
              onPressed: provider.isLoading
                  ? null
                  : () => _sendTestMessage(provider, 'auth'),
              icon: Icons.lock,
              label: 'Test Auth Error',
            ),
            _ActionButton(
              // ✅ Const widget
              onPressed: provider.isLoading
                  ? null
                  : () => _sendTestMessage(provider, 'server'),
              icon: Icons.dns,
              label: 'Test Server Error',
            ),
            _ActionButton(
              // ✅ Const widget
              onPressed: provider.isLoading
                  ? null
                  : () => provider.clearConversation(),
              icon: Icons.clear,
              label: 'Clear Chat',
            ),
            _ActionButton(
              // ✅ Const widget
              onPressed:
                  provider.isLoading ? null : () => _switchMode(provider),
              icon: Icons.swap_horiz,
              label: 'Switch Mode',
            ),
          ],
        );
      },
    );
  }

  void _sendTestMessage(DialogueProvider provider, String message) {
    provider.sendMessageStreaming(message);
  }

  void _switchMode(DialogueProvider provider) {
    final newMode =
        provider.currentDialogueMode == 'socratic' ? 'companion' : 'socratic';
    provider.switchMode(newMode);
  }
}

/// ✅ OPTIMIZED - Constant action button widget
class _ActionButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final IconData icon;
  final String label;

  const _ActionButton({
    // ✅ Const constructor
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

/// ✅ OPTIMIZED - Constant spacing widgets for better performance
class _DialogueSpacing {
  static const SizedBox small = SizedBox(height: 8);
  static const SizedBox medium = SizedBox(height: 16);
  static const SizedBox large = SizedBox(height: 24);
}

/// ✅ OPTIMIZED - Constant padding widgets
class _DialoguePadding {
  static const EdgeInsets all = EdgeInsets.all(16);
  static const EdgeInsets horizontal = EdgeInsets.symmetric(horizontal: 16);
  static const EdgeInsets vertical = EdgeInsets.symmetric(vertical: 16);
}

/// Performance comparison demonstration
class DialoguePerformanceComparison extends StatelessWidget {
  const DialoguePerformanceComparison({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Performance Comparison'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'Dialogue UI Performance Comparison',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            Text(
              'This example shows the difference between unoptimized and optimized dialogue UI implementations.',
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 24),
            Text(
              'Key Performance Improvements:',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text('• Const widgets prevent unnecessary rebuilds'),
            Text('• Widget splitting enables selective updates'),
            Text('• Consumer optimization reduces rebuild scope'),
            Text('• Const utilities improve memory efficiency'),
            Text('• Better frame rates and smoother animations'),
          ],
        ),
      ),
    );
  }
}
*/

class DialoguePerformanceComparison extends ConsumerWidget {
  const DialoguePerformanceComparison({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final apiClient = ref.read(apiClientProvider);
    final _ = DialogueApiService(apiClient: apiClient);
    return const Scaffold(
      appBar: AppBar(title: Text('Performance Comparison')),
      body: Center(child: Text('Demo disabled for build stability.')),
    );
  }
}
