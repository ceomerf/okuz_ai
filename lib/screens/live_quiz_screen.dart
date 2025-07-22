import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:permission_handler/permission_handler.dart';
import '../theme/app_theme.dart';
import '../services/mock_database_service.dart';

class LiveQuizScreen extends StatefulWidget {
  final String subject;
  final String topic;

  const LiveQuizScreen({
    Key? key,
    required this.subject,
    required this.topic,
  }) : super(key: key);

  @override
  State<LiveQuizScreen> createState() => _LiveQuizScreenState();
}

class _LiveQuizScreenState extends State<LiveQuizScreen>
    with TickerProviderStateMixin {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final stt.SpeechToText _speech = stt.SpeechToText();

  List<ChatMessage> _messages = [];
  String? _dialogueId;
  bool _isLoading = false;
  bool _isListening = false;
  bool _speechEnabled = false;
  bool _dialogueStarted = false;

  late AnimationController _typingAnimationController;
  late AnimationController _pulseAnimationController;
  late Animation<double> _typingAnimation;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _initializeSpeech();
    _startDialogue();
  }

  void _initializeAnimations() {
    _typingAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _pulseAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );

    _typingAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
          parent: _typingAnimationController, curve: Curves.easeInOut),
    );
    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.2).animate(
      CurvedAnimation(
          parent: _pulseAnimationController, curve: Curves.elasticInOut),
    );
  }

  Future<void> _initializeSpeech() async {
    try {
      final permission = await Permission.microphone.request();
      if (permission == PermissionStatus.granted) {
        _speechEnabled = await _speech.initialize(
          onStatus: (status) {
            setState(() {
              _isListening = status == 'listening';
            });
          },
          onError: (error) {
            print('Speech error: $error');
            setState(() {
              _isListening = false;
            });
          },
        );
      }
    } catch (e) {
      print('Speech initialization error: $e');
      setState(() {
        _speechEnabled = false;
      });
    }
  }

  Future<void> _startDialogue() async {
    setState(() {
      _isLoading = true;
    });

    _typingAnimationController.repeat(reverse: true);

    try {
      final mockDbService =
          Provider.of<MockDatabaseService>(context, listen: false);
      final result =
          await mockDbService.callCloudFunction('startSocraticDialogue', {
        'subject': widget.subject,
        'topic': widget.topic,
      });

      if (result['success'] == true) {
        setState(() {
          _dialogueId = result['dialogueId'];
          _dialogueStarted = true;
          _isLoading = false;
        });

        _typingAnimationController.stop();
        _pulseAnimationController.repeat(reverse: true);

        // Add initial message
        _addMessage(
          'AI',
          result['initialMessage'] ??
              'Merhaba! ${widget.topic} konusunda size yardımcı olmaya hazırım. Hangi konuda zorlanıyorsunuz?',
          false,
        );
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      _typingAnimationController.stop();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Diyalog başlatılamadı: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty) return;

    final message = _messageController.text.trim();
    _messageController.clear();

    _addMessage('Sen', message, true);

    setState(() {
      _isLoading = true;
    });

    _typingAnimationController.repeat(reverse: true);

    try {
      final mockDbService =
          Provider.of<MockDatabaseService>(context, listen: false);
      final result =
          await mockDbService.callCloudFunction('startSocraticDialogue', {
        'dialogueId': _dialogueId,
        'message': message,
      });

      if (result['success'] == true) {
        setState(() {
          _isLoading = false;
        });

        _typingAnimationController.stop();

        _addMessage(
          'AI',
          result['response'] ??
              'Anlıyorum. Bu konuda daha detaylı açıklama yapabilirim.',
          false,
        );
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      _typingAnimationController.stop();

      _addMessage(
        'AI',
        'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        false,
      );
    }
  }

  Future<void> _startListening() async {
    if (!_speechEnabled) {
      _showErrorSnackBar('Mikrofon izni gerekli');
      return;
    }

    if (!_isListening) {
      bool available = await _speech.listen(
        onResult: (result) {
          setState(() {
            _messageController.text = result.recognizedWords;
          });
        },
        listenFor: const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 3),
        partialResults: true,
      );

      if (!available) {
        _showErrorSnackBar('Mikrofon kullanılamıyor');
      }
    } else {
      await _speech.stop();
    }
  }

  Future<void> _endDialogue() async {
    if (_dialogueId == null) return;

    try {
      final mockDbService =
          Provider.of<MockDatabaseService>(context, listen: false);
      await mockDbService.callCloudFunction('endSocraticDialogue', {
        'dialogueId': _dialogueId,
      });

      _addMessage(
        'AI',
        'Diyalog sonlandırıldı. Öğrendiklerinizi pekiştirmek için pratik yapmayı unutmayın!',
        false,
      );
    } catch (e) {
      print('Error ending dialogue: $e');
    }
  }

  void _addMessage(String sender, String content, bool isUser) {
    final message = ChatMessage(
      content: content,
      isUser: isUser,
      timestamp: DateTime.now(),
    );
    setState(() {
      _messages.add(message);
    });
    _scrollToBottom();
  }

  void _scrollToBottom() {
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

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.errorColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  void dispose() {
    _typingAnimationController.dispose();
    _pulseAnimationController.dispose();
    _messageController.dispose();
    _scrollController.dispose();
    _speech.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('AI Sokrates'),
            Text(
              '${widget.subject} • ${widget.topic}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (_dialogueStarted)
            IconButton(
              icon: const Icon(Icons.stop_circle),
              onPressed: _endDialogue,
              tooltip: 'Diyalogu Bitir',
            ),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppTheme.primaryColor.withValues(alpha: 0.05),
              theme.scaffoldBackgroundColor,
            ],
          ),
        ),
        child: Column(
          children: [
            // Chat messages
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: _messages.length + (_isLoading ? 1 : 0),
                itemBuilder: (context, index) {
                  if (index == _messages.length && _isLoading) {
                    return _buildTypingIndicator();
                  }

                  final message = _messages[index];
                  return _buildMessageBubble(message);
                },
              ),
            ),

            // Input area
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.cardColor,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  // Voice input button
                  if (_speechEnabled)
                    AnimatedBuilder(
                      animation: _pulseAnimation,
                      builder: (context, child) {
                        return Transform.scale(
                          scale: _isListening ? _pulseAnimation.value : 1.0,
                          child: IconButton(
                            icon: Icon(
                              _isListening ? Icons.mic : Icons.mic_none,
                              color: _isListening
                                  ? AppTheme.primaryColor
                                  : theme.colorScheme.onSurface
                                      .withOpacity(0.6),
                            ),
                            onPressed: _startListening,
                          ),
                        );
                      },
                    ),

                  // Text input
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surface,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: theme.dividerColor,
                          width: 1,
                        ),
                      ),
                      child: TextField(
                        controller: _messageController,
                        decoration: const InputDecoration(
                          hintText: 'Cevabınızı yazın...',
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                        ),
                        maxLines: 3,
                        minLines: 1,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (text) => _sendMessage(),
                        enabled: !_isLoading && _dialogueStarted,
                      ),
                    ),
                  ),

                  const SizedBox(width: 8),

                  // Send button
                  Container(
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.send, color: Colors.white),
                      onPressed: (!_isLoading && _dialogueStarted)
                          ? () => _sendMessage()
                          : null,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage message) {
    final theme = Theme.of(context);
    final isUser = message.isUser;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: AppTheme.primaryColor,
              child: const Icon(
                Icons.psychology,
                size: 16,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isUser ? AppTheme.primaryColor : theme.cardColor,
                borderRadius: BorderRadius.circular(18),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 5,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    message.content,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color:
                          isUser ? Colors.white : theme.colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatTime(message.timestamp),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: isUser
                          ? Colors.white.withValues(alpha: 0.7)
                          : theme.colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 16,
              backgroundColor: AppTheme.accentColor,
              child: const Icon(
                Icons.person,
                size: 16,
                color: Colors.white,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTypingIndicator() {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: AppTheme.primaryColor,
            child: const Icon(
              Icons.psychology,
              size: 16,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: theme.cardColor,
              borderRadius: BorderRadius.circular(18),
            ),
            child: AnimatedBuilder(
              animation: _typingAnimation,
              builder: (context, child) {
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildDot(0),
                    const SizedBox(width: 4),
                    _buildDot(1),
                    const SizedBox(width: 4),
                    _buildDot(2),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDot(int index) {
    final opacity = (_typingAnimation.value + index * 0.3) % 1.0;
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withValues(alpha: opacity),
        shape: BoxShape.circle,
      ),
    );
  }

  String _formatTime(DateTime time) {
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }
}

class ChatMessage {
  final String content;
  final bool isUser;
  final DateTime timestamp;

  ChatMessage({
    required this.content,
    required this.isUser,
    required this.timestamp,
  });
}
