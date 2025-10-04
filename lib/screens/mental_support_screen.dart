import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../services/api_client.dart';

class MentalSupportScreen extends StatefulWidget {
  const MentalSupportScreen({Key? key}) : super(key: key);

  @override
  State<MentalSupportScreen> createState() => _MentalSupportScreenState();
}

class _MentalSupportScreenState extends State<MentalSupportScreen>
    with TickerProviderStateMixin {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  bool _isLoading = false;
  bool _isTyping = false;
  List<Map<String, dynamic>> _messages = [];
  String _currentMood = 'neutral';

  late AnimationController _animationController;
  late AnimationController _typingController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;
  late Animation<double> _typingAnimation;

  final List<String> _quickResponses = [
    'Stresli hissediyorum',
    'Motivasyona ihtiyacım var',
    'Endişeli hissediyorum',
    'Odaklanmakta zorlanıyorum',
    'Umutsuz hissediyorum',
    'Başarısız olma korkum var',
  ];

  final List<Map<String, dynamic>> _moodOptions = [
    {'label': 'Harika', 'emoji': '😊', 'color': Colors.green, 'value': 'great'},
    {'label': 'İyi', 'emoji': '🙂', 'color': Colors.blue, 'value': 'good'},
    {
      'label': 'Normal',
      'emoji': '😐',
      'color': Colors.orange,
      'value': 'neutral'
    },
    {'label': 'Kötü', 'emoji': '😔', 'color': Colors.red, 'value': 'bad'},
    {
      'label': 'Çok Kötü',
      'emoji': '😞',
      'color': Colors.purple,
      'value': 'terrible'
    },
  ];

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _typingController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
    _slideAnimation = Tween<double>(begin: 30.0, end: 0.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOutCubic),
    );
    _typingAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _typingController, curve: Curves.easeInOut),
    );
    _animationController.forward();
    _initializeChat();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _typingController.dispose();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _initializeChat() {
    setState(() {
      _messages = [
        {
          'text':
              'Merhaba! Ben senin kişisel zihinsel destek asistanınım. 🌸\n\nBugün nasıl hissediyorsun? Sana nasıl yardımcı olabilirim?',
          'isUser': false,
          'timestamp': DateTime.now(),
          'type': 'welcome',
        }
      ];
    });
  }

  Future<void> _sendMessage(String message) async {
    if (message.trim().isEmpty) return;

    setState(() {
      _messages.add({
        'text': message,
        'isUser': true,
        'timestamp': DateTime.now(),
        'type': 'text',
      });
      _isTyping = true;
    });

    _messageController.clear();
    _scrollToBottom();
    _typingController.repeat();
    HapticFeedback.lightImpact();

    try {
                    final response = await ref.read(apiClientProvider).post('/smart-tools/mental-support', {
         'userId': 'system', // TODO: Real user ID
         'currentMessage': message,
         'history': _messages.length > 5
             ? _messages.sublist(_messages.length - 5).map((m) => {
                 'role': m['isUser'] ? 'user' : 'model',
                 'text': m['text'],
               }).toList()
             : _messages.map((m) => {
                 'role': m['isUser'] ? 'user' : 'model', 
                 'text': m['text'],
               }).toList(),
       });

      await Future.delayed(
          const Duration(milliseconds: 1500)); // Simulate thinking time

      setState(() {
        _isTyping = false;
        _messages.add({
          'text': response['response'] ??
              'Anlıyorum. Bu konuda sana nasıl yardımcı olabilirim?',
          'isUser': false,
          'timestamp': DateTime.now(),
          'type': 'response',
          'suggestions': response['suggestions'] as List?,
        });
      });

      _typingController.stop();
      _scrollToBottom();
      HapticFeedback.heavyImpact();
    } catch (e) {
      setState(() {
        _isTyping = false;
        _messages.add({
          'text':
              'Üzgünüm, şu anda yanıt veremiyorum. Ancak senin için buradayım ve konuşmaya devam edebiliriz.',
          'isUser': false,
          'timestamp': DateTime.now(),
          'type': 'error',
        });
      });
      _typingController.stop();
    }
  }

  void _scrollToBottom() {
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

  void _updateMood(String mood) {
    setState(() {
      _currentMood = mood;
    });
    HapticFeedback.lightImpact();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor:
          isDark ? const Color(0xFF0A0E1A) : const Color(0xFFF0F9FF),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            color: isDark ? Colors.white : Colors.black87,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF06B6D4).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text('💙', style: TextStyle(fontSize: 20)),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Zihinsel Destek',
                  style: TextStyle(
                    color: isDark ? Colors.white : Colors.black87,
                    fontWeight: FontWeight.w800,
                    fontSize: 18,
                  ),
                ),
                Text(
                  'Her zaman senin yanında',
                  style: TextStyle(
                    color: isDark ? Colors.white70 : Colors.black54,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () => _showMoodSelector(),
            icon: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: _getMoodColor().withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                _getMoodEmoji(),
                style: const TextStyle(fontSize: 20),
              ),
            ),
          ),
        ],
      ),
      body: AnimatedBuilder(
        animation: _animationController,
        builder: (context, child) {
          return FadeTransition(
            opacity: _fadeAnimation,
            child: Transform.translate(
              offset: Offset(0, _slideAnimation.value),
              child: Column(
                children: [
                  // Chat messages
                  Expanded(
                    child: ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      itemCount: _messages.length + (_isTyping ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == _messages.length && _isTyping) {
                          return _buildTypingIndicator(isDark);
                        }
                        return _buildMessageBubble(_messages[index], isDark);
                      },
                    ),
                  ),

                  // Quick responses (if no messages yet or after assistant response)
                  if (_messages.length <= 1 ||
                      (!_messages.last['isUser'] && !_isTyping))
                    _buildQuickResponses(isDark),

                  // Message input
                  _buildMessageInput(isDark),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildMessageBubble(Map<String, dynamic> message, bool isDark) {
    final isUser = message['isUser'] as bool;
    final text = message['text'] as String;
    final suggestions = message['suggestions'] as List?;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFF06B6D4),
                    const Color(0xFF0891B2),
                  ],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(
                Icons.psychology,
                color: Colors.white,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
          ],
          if (isUser) const Spacer(),
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isUser
                        ? const Color(0xFF06B6D4)
                        : isDark
                            ? Colors.white.withValues(alpha: 0.05)
                            : Colors.white,
                    borderRadius: BorderRadius.circular(20).copyWith(
                      bottomLeft: isUser
                          ? const Radius.circular(20)
                          : const Radius.circular(4),
                      bottomRight: isUser
                          ? const Radius.circular(4)
                          : const Radius.circular(20),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        text,
                        style: TextStyle(
                          color: isUser
                              ? Colors.white
                              : isDark
                                  ? Colors.white
                                  : Colors.black87,
                          fontSize: 16,
                          height: 1.4,
                        ),
                      ),
                      if (suggestions != null && suggestions.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: suggestions.map((suggestion) {
                            return GestureDetector(
                              onTap: () => _sendMessage(suggestion),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF06B6D4)
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: const Color(0xFF06B6D4)
                                        .withValues(alpha: 0.3),
                                  ),
                                ),
                                child: Text(
                                  suggestion,
                                  style: TextStyle(
                                    color: const Color(0xFF06B6D4),
                                    fontWeight: FontWeight.w500,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _formatTime(message['timestamp']),
                  style: TextStyle(
                    color: Colors.grey,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          if (!isUser) const Spacer(),
          if (isUser) ...[
            const SizedBox(width: 12),
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFF06B6D4).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                Icons.person,
                color: const Color(0xFF06B6D4),
                size: 24,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTypingIndicator(bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF06B6D4),
                  const Color(0xFF0891B2),
                ],
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(
              Icons.psychology,
              color: Colors.white,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color:
                  isDark ? Colors.white.withValues(alpha: 0.05) : Colors.white,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
                bottomRight: Radius.circular(20),
                bottomLeft: Radius.circular(4),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: AnimatedBuilder(
              animation: _typingAnimation,
              builder: (context, child) {
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildTypingDot(0),
                    const SizedBox(width: 4),
                    _buildTypingDot(1),
                    const SizedBox(width: 4),
                    _buildTypingDot(2),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypingDot(int index) {
    final delay = index * 0.33;
    final animation = Tween<double>(
      begin: 0.4,
      end: 1.0,
    ).animate(
      CurvedAnimation(
        parent: _typingController,
        curve: Interval(delay, delay + 0.33, curve: Curves.easeInOut),
      ),
    );

    return AnimatedBuilder(
      animation: animation,
      builder: (context, child) {
        return Opacity(
          opacity: animation.value,
          child: Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: const Color(0xFF06B6D4),
              shape: BoxShape.circle,
            ),
          ),
        );
      },
    );
  }

  Widget _buildQuickResponses(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Hızlı yanıtlar:',
            style: TextStyle(
              color: AppTheme.getSecondaryTextColor(context),
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _quickResponses.map((response) {
              return GestureDetector(
                onTap: () => _sendMessage(response),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.05)
                        : const Color(0xFF06B6D4).withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: const Color(0xFF06B6D4).withValues(alpha: 0.2),
                    ),
                  ),
                  child: Text(
                    response,
                    style: TextStyle(
                      color: const Color(0xFF06B6D4),
                      fontWeight: FontWeight.w500,
                      fontSize: 13,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageInput(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.02)
            : Colors.white.withValues(alpha: 0.9),
        border: Border(
          top: BorderSide(
            color: const Color(0xFF06B6D4).withValues(alpha: 0.1),
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.05)
                    : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: const Color(0xFFE2E8F0).withValues(alpha: 0.5),
                ),
              ),
              child: TextField(
                controller: _messageController,
                maxLines: null,
                decoration: const InputDecoration(
                  hintText: 'Mesajınızı yazın...',
                  border: InputBorder.none,
                  contentPadding:
                      EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                style: Theme.of(context).textTheme.bodyMedium,
                onSubmitted: _sendMessage,
              ),
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: () => _sendMessage(_messageController.text),
            child: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFF06B6D4),
                    const Color(0xFF0891B2),
                  ],
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF06B6D4).withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.send,
                color: Colors.white,
                size: 24,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showMoodSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Theme.of(context).brightness == Brightness.dark
              ? const Color(0xFF1E293B)
              : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Bugün nasıl hissediyorsun?',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 20),
            ...(_moodOptions.map((mood) {
              final isSelected = _currentMood == mood['value'];
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                child: GestureDetector(
                  onTap: () {
                    _updateMood(mood['value']);
                    Navigator.pop(context);
                  },
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? mood['color'].withValues(alpha: 0.1)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? mood['color']
                            : Colors.grey.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Text(
                          mood['emoji'],
                          style: const TextStyle(fontSize: 24),
                        ),
                        const SizedBox(width: 16),
                        Text(
                          mood['label'],
                          style: TextStyle(
                            fontWeight: isSelected
                                ? FontWeight.w600
                                : FontWeight.normal,
                            color: isSelected ? mood['color'] : null,
                          ),
                        ),
                        if (isSelected) ...[
                          const Spacer(),
                          Icon(
                            Icons.check,
                            color: mood['color'],
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            })),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return 'Şimdi';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}dk önce';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}sa önce';
    } else {
      return '${dateTime.day}/${dateTime.month}';
    }
  }

  Color _getMoodColor() {
    final mood = _moodOptions.firstWhere(
      (m) => m['value'] == _currentMood,
      orElse: () => _moodOptions[2],
    );
    return mood['color'];
  }

  String _getMoodEmoji() {
    final mood = _moodOptions.firstWhere(
      (m) => m['value'] == _currentMood,
      orElse: () => _moodOptions[2],
    );
    return mood['emoji'];
  }
}
