import 'package:speech_to_text/speech_to_text.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:flutter/foundation.dart';

// Enum to manage the state of the voice service
enum VoiceState { idle, listening, processing }

class VoiceService {
  final SpeechToText _speechToText = SpeechToText();
  final FlutterTts _flutterTts = FlutterTts();

  // A ValueNotifier to broadcast the current state
  final ValueNotifier<VoiceState> state = ValueNotifier(VoiceState.idle);

  bool _isInitialized = false;

  Future<void> initialize() async {
    print('🎤 VoiceService initialize başladı');
    if (_isInitialized) {
      print('🎤 VoiceService zaten başlatılmış');
      return;
    }

    try {
      // Initialize STT first (this is more important)
      print('🎤 STT başlatılıyor...');
      await _speechToText.initialize();
      
      // Try to configure TTS (optional - might fail on simulator)
      try {
        print('🎤 TTS yapılandırılıyor...');
        await _flutterTts.setLanguage("tr-TR");
        await _flutterTts.setSpeechRate(0.7); // Biraz daha hızlı konuşma
        await _flutterTts.setPitch(1.0); // Normal ton
        await _flutterTts.setVolume(1.0); // Tam ses
        _flutterTts.setCompletionHandler(() {
          print('🎤 TTS tamamlandı');
          state.value = VoiceState.idle; // Mark as idle after speaking finishes
        });
        print('🎤 TTS başarıyla yapılandırıldı');
      } catch (ttsError) {
        print('🎤 TTS yapılandırma hatası (simulator olabilir): $ttsError');
        // TTS hatası olsa bile devam et
      }
      
      _isInitialized = true;
      print('🎤 VoiceService başarıyla başlatıldı!');
    } catch (e) {
      print('🎤 VoiceService başlatma hatası: $e');
      rethrow;
    }
  }

  // Starts listening and provides results via a callback
  Future<void> startListening({required Function(String) onResult}) async {
    print('🎤 startListening çağrıldı');
    print('🎤 _isInitialized: $_isInitialized');
    print('🎤 state.value: ${state.value}');
    
    if (!_isInitialized || state.value == VoiceState.listening) {
      print('🎤 startListening iptal edildi - başlatılmamış veya zaten dinliyor');
      return;
    }

    try {
      print('🎤 Dinleme başlatılıyor...');
      state.value = VoiceState.listening;
      await _speechToText.listen(
        onResult: (result) {
          print('🎤 STT sonucu: ${result.recognizedWords}');
          print('🎤 finalResult: ${result.finalResult}');
          if (result.finalResult) {
            state.value = VoiceState.processing;
            onResult(result.recognizedWords);
          }
        },
        localeId: "tr-TR",
      );
      print('🎤 Dinleme başarıyla başlatıldı');
    } catch (e) {
      print('🎤 startListening hatası: $e');
      state.value = VoiceState.idle;
      rethrow;
    }
  }

  // Stops the listening process
  Future<void> stopListening() async {
    if (state.value == VoiceState.listening) {
      await _speechToText.stop();
      state.value = VoiceState.idle;
    }
  }

  // Speaks the given text out loud
  Future<void> speak(String text) async {
    if (text.isEmpty) return;
    
    try {
      state.value = VoiceState.processing; // Mark as busy while preparing to speak
      await _flutterTts.speak(text);
    } catch (e) {
      print('🎤 TTS konuşma hatası (simulator olabilir): $e');
      // TTS hatası olsa bile state'i idle yap
      state.value = VoiceState.idle;
    }
  }

  // Stop speaking immediately
  Future<void> stopSpeaking() async {
    try {
      await _flutterTts.stop();
      state.value = VoiceState.idle;
      print('🎤 TTS durduruldu');
    } catch (e) {
      print('🎤 TTS durdurma hatası: $e');
    }
  }
} 