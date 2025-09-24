import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:okuz_ai/services/providers.dart';
import '../providers/smart_tools_provider.dart';
import '../widgets/modern_loading_screen.dart';
import '../services/voice_service.dart';

class AISokratesScreen extends ConsumerStatefulWidget {
  const AISokratesScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<AISokratesScreen> createState() => _AISokratesScreenState();
}

class _AISokratesScreenState extends ConsumerState<AISokratesScreen> {
  final TextEditingController _questionController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  
  // Voice service for STT and TTS
  final VoiceService _voiceService = VoiceService();
  // Kullanıcı tercihi: TTS açık/kapalı
  bool _isVoiceEnabled = false;
  // Aynı tamamlanan cevabı tekrar işlememek için
  String? _lastProcessedResponse;
  
  List<Map<String, dynamic>> _messages = [];
  String _selectedSubject = 'Matematik';
  int _selectedGrade = 12;
  
  // Konuşma geçmişini tutmak için
  List<String> _conversationHistory = [];
  
  // AI'nın sorduğu soruları tutmak için
  List<String> _aiQuestions = [];
  final Set<String> _aiQuestionsSet = {};

  final List<String> _subjects = [
    'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 
    'Türkçe', 'Tarih', 'Coğrafya', 'Felsefe'
  ];

  @override
  void initState() {
    super.initState();
    _addMessage("🎤 Merhaba! Ben AI Sokrates. Konuşma modundayım, sorularını sor!", true);
    // Voice service'i başlat
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeVoiceService();
    });
  }

  Future<void> _initializeVoiceService() async {
    print('🎤 Voice service başlatılıyor...');
    try {
      await _voiceService.initialize();
      print('🎤 Voice service başarıyla başlatıldı!');
    } catch (e) {
      print('🎤 Voice service başlatma hatası: $e');
    }
  }

  void _addMessage(String message, bool isAI) {
    setState(() {
      _messages.add({
        'message': message,
        'isAI': isAI,
        'timestamp': DateTime.now(),
      });
    });
    
    // Konuşma geçmişine ekle (daha net format)
    final formattedMessage = '${isAI ? "AI" : "Sen"}: $message';
    _conversationHistory.add(formattedMessage);
    
    _scrollToBottom();
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

  // AI yanıtından soruları çıkar
  void _extractQuestionsFromAIResponse(String response) {
    // Soru işaretleri içeren cümleleri bul
    final questionPattern = RegExp(r'[^.!?]*\?[^.!?]*');
    final matches = questionPattern.allMatches(response);
    
    for (final match in matches) {
      final question = match.group(0)?.trim();
      if (question != null && question.isNotEmpty && !_aiQuestionsSet.contains(question)) {
        _aiQuestionsSet.add(question);
        _aiQuestions.add(question);
        print('🎯 AI sorusu bulundu: $question');
      }
    }
    
    // Soru numaraları içeren cümleleri bul (1. Soru:, 2. Soru: gibi)
    final numberedQuestionPattern = RegExp(r'\d+\.\s*Soru[^.!?]*[^.!?]*');
    final numberedMatches = numberedQuestionPattern.allMatches(response);
    
    for (final match in numberedMatches) {
      final question = match.group(0)?.trim();
      if (question != null && question.isNotEmpty && !_aiQuestionsSet.contains(question)) {
        _aiQuestionsSet.add(question);
        _aiQuestions.add(question);
        print('🎯 Numaralı AI sorusu bulundu: $question');
      }
    }
  }

  @override
  void dispose() {
    // TTS'i durdur ve temizle
    _voiceService.stopListening();
    _voiceService.stopSpeaking(); // TTS'i durdur
    
    _questionController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _askQuestion() async {
    if (_questionController.text.trim().isEmpty) return;

    final question = _questionController.text.trim();
    _addMessage(question, false);
    _questionController.clear();

    // Get the SmartToolsProvider via Riverpod
    final provider = ref.read(smartToolsNotifierProvider.notifier);
    
    // Konuşma geçmişini hazırla (son 10 mesaj)
    final recentHistory = _conversationHistory.length > 10 
        ? _conversationHistory.skip(_conversationHistory.length - 10).join('\n')
        : _conversationHistory.join('\n');
    
    // AI'nın sorduğu soruları hazırla
    final aiQuestionsText = _aiQuestions.isNotEmpty 
        ? 'SENİN SORDUĞUN SORULAR:\n${_aiQuestions.join('\n')}\n'
        : '';
    
    // Konuşma modu için özel talimat ekle
    final conversationPrompt = '''
KONUŞMA MODU: Çok kısa yanıtlar ver! Maksimum 1-2 cümle!
Uzun açıklama yapma! Günlük konuşma tarzında, samimi ol!

HATIRLAMA TALİMATI:
Aşağıdaki geçmiş konuşmayı oku ve ne konuştuğumuzu hatırla:
$recentHistory

$aiQuestionsText

Şimdi bu yeni soruyu cevapla: $question

ÖNEMLİ: Geçmiş konuşmada ne konuştuğumuzu hatırla ve ona göre cevap ver!
Özellikle yukarıda listelenen soruları hatırla!
''';
    
    // Use the streaming method
    await provider.sendMessageAndStreamResponse(
      message: conversationPrompt,
      subject: _selectedSubject,
      grade: '$_selectedGrade. Sınıf',
    );
  }

  Future<void> _toggleVoiceListening() async {
    print('🎤 Mikrofon butonuna basıldı!');
    print('🎤 Mevcut voice state: ${_voiceService.state.value}');
    
    try {
      // VoiceService başlatılmamışsa önce başlat
      await _voiceService.initialize();
      
      if (_voiceService.state.value == VoiceState.listening) {
        print('🎤 Dinlemeyi durduruyor...');
        await _voiceService.stopListening();
      } else {
        print('🎤 Dinlemeyi başlatıyor...');
        await _voiceService.startListening(onResult: (transcribedText) {
          print('🎤 Konuşma tanıma sonucu: $transcribedText');
          if (transcribedText.isNotEmpty) {
            _questionController.text = transcribedText;
            _askQuestion();
          }
        });
      }
    } catch (e) {
      print('🎤 Hata oluştu: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF1A1F29) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.psychology,
                color: Color(0xFF6366F1),
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AI Sokrates',
                  style: GoogleFonts.figtree(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  'Akıllı Soru-Cevap',
                  style: GoogleFonts.figtree(
                    fontSize: 12,
                    color: isDark ? Colors.white70 : Colors.black54,
                  ),
                ),
              ],
            ),
          ],
        ),
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(
          color: isDark ? Colors.white : Colors.black,
        ),
      ),
      body: Consumer(
        builder: (context, ref, child) {
          final state = ref.watch(smartToolsNotifierProvider);
          final notifier = ref.read(smartToolsNotifierProvider.notifier);
          // Update messages when streaming response changes
          if (state.aiResponseText.isNotEmpty && state.isStreaming) {
            // Find the last AI message and update it with streaming text
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (_messages.isNotEmpty && _messages.last['isAI'] == true) {
                setState(() {
                  _messages.last['message'] = state.aiResponseText;
                });
              } else {
                _addMessage(state.aiResponseText, true);
              }
            });
          }

          // Speak AI response when streaming completes
          if (state.aiResponseText.isNotEmpty && !state.isStreaming) {
            WidgetsBinding.instance.addPostFrameCallback((_) async {
              // Aynı tamamlanan yanıtı tekrar işleme
              if (_lastProcessedResponse == state.aiResponseText) {
                return;
              }
              _lastProcessedResponse = state.aiResponseText;

              // Görünen mesajı son metinle kesinleştir
              if (_messages.isNotEmpty && _messages.last['isAI'] == true) {
                setState(() {
                  _messages.last['message'] = state.aiResponseText;
                });
              } else {
                _addMessage(state.aiResponseText, true);
              }

              // Yalnızca kullanıcı açtıysa sesli oku
              if (_isVoiceEnabled) {
                await _voiceService.speak(state.aiResponseText);
              }

              // AI yanıtından soruları çıkar
              _extractQuestionsFromAIResponse(state.aiResponseText);
            });
          }

          // Add follow-up questions when they become available
          if (state.suggestedReplies.isNotEmpty) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              for (String followUp in state.suggestedReplies) {
                if (!_messages.any((msg) => msg['message'] == "🤔 $followUp")) {
                  _addMessage("🤔 $followUp", true);
                }
              }
            });
          }

          return Column(
            children: [
              // Subject & Grade Selection
              Container(
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: const Color(0xFF6366F1).withOpacity(0.2),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedSubject,
                        decoration: InputDecoration(
                          labelText: 'Ders',
                          prefixIcon: const Icon(Icons.subject, color: Color(0xFF6366F1)),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        items: _subjects.map((subject) => DropdownMenuItem(
                          value: subject,
                          child: Text(subject),
                        )).toList(),
                        onChanged: (value) {
                          setState(() {
                            _selectedSubject = value!;
                          });
                        },
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: DropdownButtonFormField<int>(
                        value: _selectedGrade,
                        decoration: InputDecoration(
                          labelText: 'Sınıf',
                          prefixIcon: const Icon(Icons.school, color: Color(0xFF6366F1)),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        items: List.generate(4, (index) => index + 9).map((grade) => DropdownMenuItem(
                          value: grade,
                          child: Text('$grade. Sınıf'),
                        )).toList(),
                        onChanged: (value) {
                          setState(() {
                            _selectedGrade = value!;
                          });
                        },
                      ),
                    ),
                  ],
                ),
              ),

              // Messages
              Expanded(
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _messages.length,
                  itemBuilder: (context, index) {
                    final message = _messages[index];
                    return _buildMessageBubble(message, isDark);
                  },
                ),
              ),

              // Loading indicator
              if (state.isStreaming)
                Container(
                  padding: const EdgeInsets.all(16),
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: const Color(0xFF6366F1).withOpacity(0.2),
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          const CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366F1)),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Text(
                              'AI Sokrates düşünüyor...',
                              style: GoogleFonts.figtree(
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                                color: isDark ? Colors.white : Colors.black87,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'AI Sokrates düşünüyor...',
                        style: GoogleFonts.figtree(
                          fontSize: 12,
                          color: isDark ? Colors.white60 : Colors.black54,
                        ),
                      ),
                    ],
                  ),
                ),

              // Input
              Container(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _questionController,
                        decoration: InputDecoration(
                          hintText: 'Sorunuzu yazın...',
                          prefixIcon: const Icon(Icons.help_outline, color: Color(0xFF6366F1)),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                            borderSide: const BorderSide(color: Color(0xFF6366F1)),
                          ),
                        ),
                        maxLines: null,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _askQuestion(),
                        enabled: !state.isStreaming,
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Microphone button
                    ValueListenableBuilder<VoiceState>(
                      valueListenable: _voiceService.state,
                      builder: (context, voiceState, child) {
                        IconData micIcon = Icons.mic_none;
                        Color micColor = Colors.grey;
                        
                        if (voiceState == VoiceState.listening) {
                          micIcon = Icons.mic;
                          micColor = Colors.red;
                        } else if (voiceState == VoiceState.processing) {
                          micIcon = Icons.settings_voice;
                          micColor = Colors.grey.withOpacity(0.5);
                        }

                        return FloatingActionButton(
                        onPressed: (voiceState == VoiceState.processing || state.isStreaming) 
                            ? null 
                            : () {
                                print('🎤 Buton tıklandı! Voice state: $voiceState');
                                _toggleVoiceListening();
                              },
                          backgroundColor: micColor,
                          mini: true,
                          child: Icon(micIcon, color: Colors.white),
                        );
                      },
                    ),
                    const SizedBox(width: 8),
                    // TTS toggle button (Voice On/Off)
                    Tooltip(
                      message: _isVoiceEnabled ? 'Sesli Okuma: Açık' : 'Sesli Okuma: Kapalı',
                      child: FloatingActionButton(
                        onPressed: state.isStreaming
                            ? null
                            : () {
                                setState(() {
                                  _isVoiceEnabled = !_isVoiceEnabled;
                                });
                              },
                        backgroundColor: _isVoiceEnabled
                            ? const Color(0xFF10B981) // yeşil
                            : Colors.grey,
                        mini: true,
                        child: Icon(
                          _isVoiceEnabled ? Icons.volume_up : Icons.volume_off,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Test button for debugging
                    FloatingActionButton(
                      onPressed: () {
                        print('🧪 Test butonuna basıldı!');
                        _addMessage("🧪 Test mesajı - Mikrofon butonu çalışıyor!", false);
                      },
                      backgroundColor: Colors.orange,
                      mini: true,
                      child: const Icon(Icons.bug_report, color: Colors.white),
                    ),
                    const SizedBox(width: 8),
                    // Send button
                    FloatingActionButton(
                      onPressed: state.isStreaming ? null : _askQuestion,
                      backgroundColor: const Color(0xFF6366F1),
                      mini: true,
                      child: const Icon(Icons.send, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildMessageBubble(Map<String, dynamic> message, bool isDark) {
    final isAI = message['isAI'] as bool;
    
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: isAI ? MainAxisAlignment.start : MainAxisAlignment.end,
        children: [
          if (isAI) ...[
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.psychology,
                color: Color(0xFF6366F1),
                size: 16,
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isAI 
                    ? (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9))
                    : const Color(0xFF6366F1),
                borderRadius: BorderRadius.circular(18),
                border: isAI ? Border.all(
                  color: const Color(0xFF6366F1).withOpacity(0.2),
                ) : null,
              ),
              child: Text(
                message['message'],
                style: GoogleFonts.figtree(
                  color: isAI 
                      ? (isDark ? Colors.white : Colors.black87)
                      : Colors.white,
                  fontSize: 16,
                ),
              ),
            ),
          ),
          if (!isAI) ...[
            const SizedBox(width: 8),
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: Colors.grey.withOpacity(0.2),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                Icons.person,
                color: isDark ? Colors.white70 : Colors.black54,
                size: 16,
              ),
            ),
          ],
        ],
      ),
    );
  }
} 