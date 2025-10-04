import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:okuz_ai/services/providers.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:okuz_ai/services/api_client.dart';
import 'package:okuz_ai/screens/socratic_ai_screen.dart';

class SocraticChatHistoryScreen extends ConsumerStatefulWidget {
  static const routeName = '/socratic-chat-history';

  const SocraticChatHistoryScreen({Key? key}) : super(key: key);

  @override
  _SocraticChatHistoryScreenState createState() =>
      _SocraticChatHistoryScreenState();
}

class _SocraticChatHistoryScreenState extends ConsumerState<SocraticChatHistoryScreen> {
  late final ApiClient _apiClient = ref.read(apiClientProvider);
  List<ChatHistoryItem> _chats = [];
  bool _isLoading = true;
  bool _isRefreshing = false;

  // Renk paletleri
  final Map<String, Color> _lightColors = {
    'background': const Color(0xFFF8F5F0),
    'card': Colors.white,
    'accent': const Color(0xFFBFA47B),
    'text': const Color(0xFF2D3748),
    'lightText': const Color(0xFF6B7280),
  };

  final Map<String, Color> _darkColors = {
    'background': const Color(0xFF121826),
    'card': const Color(0xFF1F2937),
    'accent': const Color(0xFF60A5FA),
    'text': Colors.white,
    'lightText': const Color(0xFFD1D5DB),
  };

  @override
  void initState() {
    super.initState();
    _loadChatHistory();
  }

  Future<void> _loadChatHistory() async {
    try {
      // Backend'de bu endpoint mevcut değil, geçici olarak boş liste döndür
      final response = [];

      // Backend'de bu endpoint mevcut değil, geçici olarak boş liste döndür
      setState(() {
        _chats = [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Chat geçmişi yüklenirken hata oluştu: $e')),
      );
    }
  }

  Future<void> _refreshChatHistory() async {
    setState(() {
      _isRefreshing = true;
    });
    await _loadChatHistory();
    setState(() {
      _isRefreshing = false;
    });
  }

  Future<void> _deleteChat(String chatId) async {
    try {
      // Backend'de bu endpoint mevcut değil, geçici olarak başarılı döndür
      final response = {'success': true};

      if (response['success'] == true) {
        setState(() {
          _chats.removeWhere((chat) => chat.id == chatId);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Chat başarıyla silindi')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Chat silinirken hata oluştu')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Chat silinirken hata oluştu: $e')),
      );
    }
  }

  Future<void> _createNewChat() async {
    try {
      // Backend'de bu endpoint mevcut değil, geçici olarak başarılı döndür
      final response = {'success': true, 'chatId': 'temp-chat-id'};

      if (response['success'] == true) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => SocraticAIScreen(chatId: response['chatId'] as String),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Yeni chat oluşturulurken hata oluştu')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Yeni chat oluşturulurken hata oluştu: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final colors = isDark ? _darkColors : _lightColors;

    return Scaffold(
      backgroundColor: colors['background'],
      appBar: AppBar(
        backgroundColor: colors['background'],
        foregroundColor: colors['text'],
        elevation: 0,
        title: Text(
          'Sokratik Diyaloglar',
          style: GoogleFonts.lora(
            textStyle: TextStyle(
              color: colors['text'],
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(
              Icons.refresh,
              color: colors['accent'],
            ),
            onPressed: _isRefreshing ? null : _refreshChatHistory,
          ),
        ],
      ),
      body: _isLoading
          ? Center(
              child: CircularProgressIndicator(
                color: colors['accent'],
              ),
            )
          : RefreshIndicator(
              onRefresh: _refreshChatHistory,
              color: colors['accent'],
              child: _chats.isEmpty
                  ? _buildEmptyState(colors)
                  : _buildChatList(colors),
            ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: colors['accent'],
        foregroundColor: Colors.white,
        onPressed: _createNewChat,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildEmptyState(Map<String, Color> colors) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.chat_bubble_outline,
            size: 80,
            color: colors['lightText'],
          ),
          const SizedBox(height: 16),
          Text(
            'Henüz Sokratik diyalog yok',
            style: GoogleFonts.lora(
              textStyle: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: colors['text'],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'İlk diyaloğunuzu başlatmak için + butonuna tıklayın',
            style: GoogleFonts.lora(
              textStyle: TextStyle(
                fontSize: 14,
                color: colors['lightText'],
              ),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildChatList(Map<String, Color> colors) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _chats.length,
      itemBuilder: (context, index) {
        final chat = _chats[index];
        return _buildChatCard(chat, colors, index);
      },
    );
  }

  Widget _buildChatCard(
      ChatHistoryItem chat, Map<String, Color> colors, int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (context) => SocraticAIScreen(chatId: chat.id),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        chat.title,
                        style: GoogleFonts.lora(
                          textStyle: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: colors['text'],
                          ),
                        ),
                      ),
                    ),
                    PopupMenuButton<String>(
                      icon: Icon(
                        Icons.more_vert,
                        color: colors['lightText'],
                      ),
                      onSelected: (value) {
                        if (value == 'delete') {
                          _showDeleteDialog(chat);
                        }
                      },
                      itemBuilder: (context) => [
                        PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete, color: Colors.red),
                              const SizedBox(width: 8),
                              Text('Sil'),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (chat.lastMessage != null) ...[
                  Text(
                    chat.lastMessage!,
                    style: GoogleFonts.lora(
                      textStyle: TextStyle(
                        fontSize: 14,
                        color: colors['lightText'],
                      ),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                ],
                Row(
                  children: [
                    Icon(
                      Icons.message,
                      size: 16,
                      color: colors['accent'],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${chat.messageCount} mesaj',
                      style: GoogleFonts.lora(
                        textStyle: TextStyle(
                          fontSize: 12,
                          color: colors['accent'],
                        ),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      _formatDate(chat.updatedAt),
                      style: GoogleFonts.lora(
                        textStyle: TextStyle(
                          fontSize: 12,
                          color: colors['lightText'],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(
          duration: 400.ms,
          delay: (index * 100).ms,
        )
        .slideY(begin: 0.2, end: 0);
  }

  void _showDeleteDialog(ChatHistoryItem chat) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Chat\'i Sil'),
        content: Text(
            '"${chat.title}" chat\'ini silmek istediğinizden emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _deleteChat(chat.id);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Sil'),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays > 0) {
      return '${difference.inDays} gün önce';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} saat önce';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} dakika önce';
    } else {
      return 'Az önce';
    }
  }
}

class ChatHistoryItem {
  final String id;
  final String title;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int messageCount;
  final String? lastMessage;

  ChatHistoryItem({
    required this.id,
    required this.title,
    required this.createdAt,
    required this.updatedAt,
    required this.messageCount,
    this.lastMessage,
  });
}
