import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:okuz_ai/services/providers.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:okuz_ai/services/api_client.dart';
import 'package:okuz_ai/theme/app_theme.dart';

class SocraticAIScreen extends ConsumerStatefulWidget {
  static const routeName = '/socratic-ai';
  final String? chatId;

  const SocraticAIScreen({Key? key, this.chatId}) : super(key: key);

  @override
  _SocraticAIScreenState createState() => _SocraticAIScreenState();
}

class _SocraticAIScreenState extends ConsumerState<SocraticAIScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _messageController = TextEditingController();
  final FocusNode _messageFocusNode = FocusNode();
  final _scrollController = ScrollController();

  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  bool _isLoading = false;
  String _conversationState = 'INITIAL';
  List<ChatMessage> _messages = [];
  List<String> _suggestedReplies = [];
  String? _detectedTopic;
  String _userUnderstandingLevel = 'unknown';
  String? _identifiedGap;
  String? _pedagogicalGoal;
  late final ApiClient _apiClient = ref.read(apiClientProvider);
  String? _currentChatId;

  // Renk paletleri
  final Map<String, Color> _lightColors = {
    'background': const Color(0xFFF8F5F0),
    'aiChatBubble': Colors.white,
    'userChatBubble': const Color(0xFFE3F2FD),
    'accent': const Color(0xFFBFA47B),
    'text': const Color(0xFF2D3748),
    'lightText': const Color(0xFF6B7280),
  };

  final Map<String, Color> _darkColors = {
    'background': const Color(0xFF121826),
    'aiChatBubble': const Color(0xFF1F2937),
    'userChatBubble': const Color(0xFF1E3A8A),
    'accent': const Color(0xFF60A5FA),
    'text': Colors.white,
    'lightText': const Color(0xFFD1D5DB),
  };

  // Anlama seviyesi renkleri
  final Map<String, Color> _understandingLevelColors = {
    'unknown': Colors.grey,
    'novice': Colors.orange,
    'intermediate': Colors.blue,
    'confirmed': Colors.green,
  };

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    );
    _animationController.forward();
    _initializeChat();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _messageFocusNode.dispose();
    _scrollController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  void _initializeChat() async {
    if (widget.chatId != null) {
      // Mevcut chat'i yükle
      await _loadExistingChat(widget.chatId!);
    } else {
      // Yeni chat oluştur
      await _createNewChat();
    }
  }

  Future<void> _createNewChat() async {
    try {
      // Backend'de bu endpoint mevcut değil, geçici olarak başarılı döndür
      final response = {'success': true, 'chatId': 'temp-chat-id'};
      
      if (response['success'] == true) {
        setState(() {
          _currentChatId = response['chatId'] as String;
        });
        // Yeni chat için ilk mesajı gönder
        _sendSocraticRequest('', 'INITIAL');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Yeni chat oluşturulurken hata oluştu: $e')),
      );
    }
  }

  Future<void> _loadExistingChat(String chatId) async {
    try {
      // Backend'de bu endpoint mevcut değil, geçici olarak boş döndür
      final response = {'messages': []};
      
      if (response['success'] == true && response['chat'] != null) {
        final chat = response['chat'] as Map<String, dynamic>;
        setState(() {
          _currentChatId = chatId;
          _messages = (chat['messages'] as List).map((msg) => ChatMessage(
            text: msg['text'] as String,
            isUser: msg['role'] == 'user',
            timestamp: DateTime.parse(msg['timestamp'] as String),
          )).toList();
        });
        _scrollToBottom();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Chat yüklenirken hata oluştu: $e')),
      );
    }
  }

  Future<void> _handleUserInput(String text) async {
    if (text.trim().isEmpty) return;

    setState(() {
      _messages.add(ChatMessage(
        text: text,
        isUser: true,
        timestamp: DateTime.now(),
      ));
      _messageController.clear();
      _isLoading = true;
    });

    // Scroll to bottom after adding the message
    _scrollToBottom();

    // Send the message to the API
    if (_currentChatId != null) {
      await _sendSocraticRequestToChat(text, _conversationState);
    } else {
      await _sendSocraticRequest(text, _conversationState);
    }
  }

  Future<void> _sendSocraticRequest(String message, String state) async {
    try {
      // Convert chat history to expected format
      final chatHistory = _messages
          .map((msg) =>
              {'role': msg.isUser ? 'user' : 'model', 'text': msg.text})
          .toList();

      final response = await _apiClient.post(
        '/smart-tools/socratic/evaluate',
        {
          'conversationState': state,
          'currentUserMessage': message,
          'chatHistory': chatHistory,
        },
      );

      setState(() {
        _isLoading = false;
        _conversationState = response['nextState'] ?? 'IN_DISCUSSION';
        _suggestedReplies =
            List<String>.from(response['suggestedReplies'] ?? []);

        // Yeni bilgi durumu ve pedagojik hedef alanlarını güncelle
        if (response['knowledgeState'] != null) {
          _detectedTopic = response['knowledgeState']['detectedTopic'];
          _userUnderstandingLevel =
              response['knowledgeState']['userUnderstandingLevel'] ?? 'unknown';
          _identifiedGap = response['knowledgeState']['identifiedGap'];
        }

        _pedagogicalGoal = response['pedagogicalGoal'];

        // Add Socrates' response to messages
        if (response['aiResponse'] != null) {
          _messages.add(ChatMessage(
            text: response['aiResponse'],
            isUser: false,
            timestamp: DateTime.now(),
          ));
        }
      });

      // Scroll to bottom after adding the response
      _scrollToBottom();
    } catch (e) {
      setState(() {
        _isLoading = false;
        _messages.add(ChatMessage(
          text: 'Şu anda yanıt oluşturulamadı. Lütfen tekrar deneyin.',
          isUser: false,
          isError: true,
          timestamp: DateTime.now(),
        ));
      });
      _scrollToBottom();
    }
  }

  Future<void> _sendSocraticRequestToChat(String message, String state) async {
    try {
      // Convert chat history to expected format
      final chatHistory = _messages
          .map((msg) =>
              {'role': msg.isUser ? 'user' : 'model', 'text': msg.text})
          .toList();

      final response = await _apiClient.post(
        '/smart-tools/socratic-evaluation',
        {
          'conversationState': state,
          'currentUserMessage': message,
          'chatHistory': chatHistory,
        },
      );

      setState(() {
        _isLoading = false;
        _conversationState = response['nextState'] ?? 'IN_DISCUSSION';
        _suggestedReplies =
            List<String>.from(response['suggestedReplies'] ?? []);

        // Yeni bilgi durumu ve pedagojik hedef alanlarını güncelle
        if (response['knowledgeState'] != null) {
          _detectedTopic = response['knowledgeState']['detectedTopic'];
          _userUnderstandingLevel =
              response['knowledgeState']['userUnderstandingLevel'] ?? 'unknown';
          _identifiedGap = response['knowledgeState']['identifiedGap'];
        }

        _pedagogicalGoal = response['pedagogicalGoal'];

        // Add Socrates' response to messages
        if (response['aiResponse'] != null) {
          _messages.add(ChatMessage(
            text: response['aiResponse'],
            isUser: false,
            timestamp: DateTime.now(),
          ));
        }
      });

      // Scroll to bottom after adding the response
      _scrollToBottom();
    } catch (e) {
      setState(() {
        _isLoading = false;
        _messages.add(ChatMessage(
          text: 'Şu anda yanıt oluşturulamadı. Lütfen tekrar deneyin.',
          isUser: false,
          isError: true,
          timestamp: DateTime.now(),
        ));
      });
      _scrollToBottom();
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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final colors = isDark ? _darkColors : _lightColors;

    return Scaffold(
      backgroundColor: colors['background'],
      appBar: _buildAppBar(isDark, colors),
      body: FadeTransition(
        opacity: _fadeAnimation,
        child: Column(
          children: [
            // Bilgi durumu göstergesi
            _buildKnowledgeStateIndicator(isDark, colors),

            // Chat messages
            Expanded(
              child: Container(
                color: colors['background'],
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length + (_isLoading ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (_isLoading && index == _messages.length) {
                      return _buildTypingIndicator(isDark, colors);
                    }

                    final message = _messages[index];
                    return AnimatedChatBubble(
                      message: message,
                      isDark: isDark,
                      colors: colors,
                      index: index,
                    );
                  },
                ),
              ),
            ),

            // Suggested replies
            if (_suggestedReplies.isNotEmpty)
              _buildSuggestedReplies(isDark, colors),

            // Message input
            _buildMessageInput(isDark, colors),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(bool isDark, Map<String, Color> colors) {
    return AppBar(
      backgroundColor: colors['background'],
      foregroundColor: colors['text'],
      elevation: 0,
      leading: IconButton(
        icon: Icon(
          Icons.arrow_back,
          color: colors['text'],
        ),
        onPressed: () {
          Navigator.pushReplacementNamed(context, '/socratic-chat-history');
        },
      ),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Modern Sokrat',
            style: GoogleFonts.lora(
              textStyle: TextStyle(
                color: colors['text'],
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          if (_detectedTopic != null)
            Text(
              _detectedTopic!,
              style: GoogleFonts.lora(
                textStyle: TextStyle(
                  color: colors['lightText'],
                  fontSize: 12,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
        ],
      ),
      actions: [
        IconButton(
          icon: Icon(
            Icons.history,
            color: colors['accent'],
          ),
          onPressed: () {
            Navigator.pushReplacementNamed(context, '/socratic-chat-history');
          },
        ),
        IconButton(
          icon: Icon(
            Icons.info_outline,
            color: colors['accent'],
          ),
          onPressed: () => _showInfoDialog(context, isDark, colors),
        ),
      ],
    );
  }

  // Bilgi durumu göstergesi widget'ı
  Widget _buildKnowledgeStateIndicator(bool isDark, Map<String, Color> colors) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: colors['background'],
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 5,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.psychology,
                size: 18,
                color: colors['accent'],
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Konu: ${_detectedTopic ?? 'Henüz belirlenmedi'}',
                  style: GoogleFonts.lora(
                    textStyle: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: colors['text'],
                    ),
                  ),
                ),
              ),
              _buildUnderstandingLevelChip(isDark, colors),
            ],
          ),
          if (_identifiedGap != null) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(
                  Icons.error_outline,
                  size: 16,
                  color: _understandingLevelColors['novice'],
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _identifiedGap!,
                    style: GoogleFonts.lora(
                      textStyle: TextStyle(
                        fontSize: 12,
                        fontStyle: FontStyle.italic,
                        color: _understandingLevelColors['novice'],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
          if (_pedagogicalGoal != null) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(
                  Icons.school,
                  size: 16,
                  color: colors['accent'],
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _pedagogicalGoal!,
                    style: GoogleFonts.lora(
                      textStyle: TextStyle(
                        fontSize: 12,
                        color: colors['accent'],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 500.ms, delay: 200.ms)
        .slideY(begin: -0.2, end: 0);
  }

  // Anlama seviyesi için renkli gösterge
  Widget _buildUnderstandingLevelChip(bool isDark, Map<String, Color> colors) {
    String levelText;
    Color chipColor =
        _understandingLevelColors[_userUnderstandingLevel] ?? Colors.grey;

    switch (_userUnderstandingLevel) {
      case 'novice':
        levelText = 'Başlangıç';
        break;
      case 'intermediate':
        levelText = 'Orta';
        break;
      case 'confirmed':
        levelText = 'İleri';
        break;
      case 'unknown':
      default:
        levelText = 'Bilinmiyor';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: chipColor.withOpacity(isDark ? 0.2 : 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: chipColor.withOpacity(isDark ? 0.5 : 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.insights,
            size: 12,
            color: chipColor,
          ),
          const SizedBox(width: 4),
          Text(
            levelText,
            style: GoogleFonts.lora(
              textStyle: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: chipColor,
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms, delay: 400.ms);
  }

  // Yazıyor göstergesi
  Widget _buildTypingIndicator(bool isDark, Map<String, Color> colors) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: colors['aiChatBubble'],
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 5,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '...',
              style: GoogleFonts.lora(
                textStyle: TextStyle(
                  fontSize: 16,
                  color: colors['accent'],
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Önerilen cevaplar widget'ı
  Widget _buildSuggestedReplies(bool isDark, Map<String, Color> colors) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      color: colors['background'],
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: _suggestedReplies.asMap().entries.map((entry) {
            final index = entry.key;
            final reply = entry.value;

            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ActionChip(
                backgroundColor:
                    colors['accent']?.withOpacity(isDark ? 0.2 : 0.1),
                side: BorderSide(
                  color: colors['accent']?.withOpacity(isDark ? 0.5 : 0.3) ??
                      Colors.transparent,
                ),
                label: Text(
                  reply,
                  style: GoogleFonts.lora(
                    textStyle: TextStyle(
                      color: colors['accent'],
                      fontSize: 13,
                    ),
                  ),
                ),
                onPressed: () => _handleUserInput(reply),
              )
                  .animate()
                  .fadeIn(
                    duration: 400.ms,
                    delay: (300 + (index * 100)).ms,
                  )
                  .slideY(begin: 0.5, end: 0),
            );
          }).toList(),
        ),
      ),
    );
  }

  // Mesaj giriş alanı
  Widget _buildMessageInput(bool isDark, Map<String, Color> colors) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: colors['background'],
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 5,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: isDark ? colors['aiChatBubble'] : Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: colors['accent']?.withOpacity(0.3) ?? Colors.transparent,
                  width: 1,
                ),
              ),
              child: TextField(
                controller: _messageController,
                focusNode: _messageFocusNode,
                style: GoogleFonts.lora(
                  textStyle: TextStyle(
                    color: colors['text'],
                    fontSize: 16,
                  ),
                ),
                decoration: InputDecoration(
                  hintText: 'Bir soru sor veya bir fikir paylaş...',
                  hintStyle: GoogleFonts.lora(
                    textStyle: TextStyle(
                      color: colors['lightText'],
                      fontSize: 16,
                    ),
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                ),
                textInputAction: TextInputAction.send,
                onSubmitted: _handleUserInput,
              ),
            ),
          ),
          const SizedBox(width: 8),
          AnimatedBuilder(
            animation: _messageController,
            builder: (context, child) {
              return AnimatedOpacity(
                opacity: _messageController.text.isEmpty ? 0.5 : 1.0,
                duration: const Duration(milliseconds: 200),
                child: Material(
                  color: colors['accent'] ?? Colors.blue,
                  borderRadius: BorderRadius.circular(24),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(24),
                    onTap: _messageController.text.isEmpty
                        ? null
                        : () => _handleUserInput(_messageController.text),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      child: Icon(
                        Icons.send_rounded,
                        color: isDark ? Colors.white : Colors.white,
                        size: 22,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  // Bilgi diyaloğu
  void _showInfoDialog(
      BuildContext context, bool isDark, Map<String, Color> colors) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: colors['background'],
        title: Text(
          'Modern Sokrat Hakkında',
          style: GoogleFonts.lora(
            textStyle: TextStyle(
              color: colors['text'],
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Modern Sokrat, Sokratik yöntemi kullanarak öğrenmenizi destekleyen bir yapay zeka asistanıdır.',
                style: GoogleFonts.lora(
                  textStyle: TextStyle(
                    color: colors['text'],
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Nasıl Çalışır:',
                style: GoogleFonts.lora(
                  textStyle: TextStyle(
                    color: colors['text'],
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              _buildInfoItem(
                '• Doğrudan bilgi vermek yerine sorular sorarak düşünmenizi sağlar',
                colors['text']!,
              ),
              _buildInfoItem(
                '• Bilgi seviyenizi ve kavram yanılgılarınızı tespit eder',
                colors['text']!,
              ),
              _buildInfoItem(
                '• Adım adım doğru bilgiye ulaşmanıza yardımcı olur',
                colors['text']!,
              ),
              const SizedBox(height: 12),
              Text(
                'İpucu: Bir konuyu öğrenmek istediğinizde, "X nedir?" yerine "X konusunu öğrenmek istiyorum" şeklinde başlayın.',
                style: GoogleFonts.lora(
                  textStyle: TextStyle(
                    color: colors['accent'],
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              'Anladım',
              style: GoogleFonts.lora(
                textStyle: TextStyle(
                  color: colors['accent'],
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoItem(String text, Color textColor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Text(
        text,
        style: GoogleFonts.lora(
          textStyle: TextStyle(
            color: textColor,
          ),
        ),
      ),
    );
  }
}

class AnimatedChatBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isDark;
  final Map<String, Color> colors;
  final int index;

  const AnimatedChatBubble({
    Key? key,
    required this.message,
    required this.isDark,
    required this.colors,
    required this.index,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: message.isUser
              ? colors['userChatBubble']
              : (message.isError
                  ? (isDark ? Colors.red.shade900 : Colors.red.shade100)
                  : colors['aiChatBubble']),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 5,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message.text,
              style: GoogleFonts.lora(
                textStyle: TextStyle(
                  color: message.isUser
                      ? (isDark ? Colors.white : Colors.black87)
                      : (message.isError
                          ? Colors.red.shade300
                          : colors['text']),
                  fontSize: 16,
                  fontStyle:
                      message.isUser ? FontStyle.italic : FontStyle.normal,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.bottomRight,
              child: Text(
                _formatTime(message.timestamp),
                style: GoogleFonts.lora(
                  textStyle: TextStyle(
                    color: colors['lightText'],
                    fontSize: 10,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 400.ms, delay: (index * 50).ms)
        .slideY(begin: 0.2, end: 0);
  }

  String _formatTime(DateTime timestamp) {
    final hour = timestamp.hour.toString().padLeft(2, '0');
    final minute = timestamp.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }
}

class ChatMessage {
  final String text;
  final bool isUser;
  final bool isError;
  final DateTime timestamp;

  ChatMessage({
    required this.text,
    required this.isUser,
    this.isError = false,
    required this.timestamp,
  });
}
