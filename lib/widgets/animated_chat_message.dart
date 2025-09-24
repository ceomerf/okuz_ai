import 'package:flutter/material.dart';

/// An animated chat message widget that slides in from the bottom with fade effect
class AnimatedChatMessage extends StatelessWidget {
  final Map<String, String> message;
  final bool isUser;
  final Animation<double> animation;

  const AnimatedChatMessage({
    Key? key,
    required this.message,
    required this.isUser,
    required this.animation,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(0, 0.3),
        end: Offset.zero,
      ).animate(CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
      )),
      child: FadeTransition(
        opacity: animation,
        child: _ChatMessageTile(
          message: message,
          isUser: isUser,
        ),
      ),
    );
  }
}

/// Individual chat message tile widget
class _ChatMessageTile extends StatelessWidget {
  final Map<String, String> message;
  final bool isUser;

  const _ChatMessageTile({
    required this.message,
    required this.isUser,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(
          isUser ? Icons.person : Icons.smart_toy,
          color: isUser ? Colors.blue : Colors.green,
        ),
        title: Text(
          message['content'] ?? '',
          style: TextStyle(
            fontWeight: isUser ? FontWeight.w500 : FontWeight.normal,
          ),
        ),
        subtitle: Text(
          isUser ? 'You' : 'AI Assistant',
          style: const TextStyle(fontSize: 12),
        ),
      ),
    );
  }
}
