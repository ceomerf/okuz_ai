import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/services/api_key.dart';
import 'api_client.dart';

class GeminiService {
  final ApiClient _apiClient = ApiClient();

  // Singleton pattern
  static final GeminiService _instance = GeminiService._internal();
  factory GeminiService() => _instance;
  GeminiService._internal();

  /// Kullanıcı verilerinden Gemini için detaylı ve kurallı bir prompt oluşturur.
  String generateStudyPrompt(OnboardingData data) {
    final String selectedSubjects = data.selectedSubjects.isEmpty
        ? 'ilgili tüm dersler'
        : data.selectedSubjects.join(', ');

    final String currentDate =
        DateFormat('d MMMM yyyy', 'tr_TR').format(DateTime.now());
    final bool followSchool = data.startPoint == 'school';

    return '''
Sen bir eğitim danışmanısın ve kullanıcılara okul dersleriyle paralel ilerleyen bireysel ders çalışma planları hazırlıyorsun. Lütfen aşağıdaki kullanıcı bilgilerine ve kurallara göre JSON formatında bir ders planı oluştur:

KULLANICI BİLGİLERİ:
- Sınıf: ${data.grade}. sınıf
- Alan: ${data.targetExam?.isNotEmpty == true ? data.targetExam : 'Belirtilmemiş'}
- Odaklanılacak Dersler: [$selectedSubjects]
- Günlük Ortalama Çalışma Süresi: ${data.dailyGoalInHours} saat
- Plan Başlangıç Tarihi: [$currentDate]
- Okul Müfredatına Paralel mi: [${followSchool ? 'Evet' : 'Hayır'}]

KURALLAR:
1. Plan, başlangıç tarihinden itibaren TAM OLARAK 1 HAFTALIK bir süreyi kapsamalıdır.
2. Plan, kullanıcının sınıf seviyesine ve seçtiği derslere uygun, gerçekçi ve dengeli bir konu dağılımı içermelidir.
3. Kullanıcı "Okul Müfredatına Paralel" seçeneğini işaretlediyse, planı o hafta okulda işlenmesi beklenen konulara göre oluştur. Tatil dönemlerinde genel tekrar ve özet konularına odaklan.
4. "Okul Müfredatına Paralel" seçilmediyse ("En Baştan Başla"), konuları en temelden başlayarak sırayla ele alan bir plan yap.
5. Her gün için ayrılan toplam süre, kullanıcının belirttiği günlük çalışma süresini aşmamalıdır.
6. Yanıt olarak SADECE ve SADECE aşağıda belirtilen yapıda bir JSON nesnesi döndür. Başka hiçbir metin, açıklama, selamlama veya ```json ``` gibi işaretçiler ekleme. Yanıtın doğrudan '{' karakteri ile başlamalıdır.

İSTENEN JSON FORMATI:
{
  "planTitle": "1. Hafta Çalışma Planı",
  "week": {
    "weekNumber": 1,
    "days": [
        {
          "day": "Pazartesi",
          "date": "2024-07-22",
          "isRestDay": false,
          "dailyTasks": [
            {
              "subject": "Matematik",
              "topic": "Sayılar",
              "durationInMinutes": 60,
              "isCompleted": false
            },
            {
              "subject": "Türkçe",
              "topic": "Sözcükte Anlam",
              "durationInMinutes": 45,
              "isCompleted": false
            }
          ]
        },
        {
          "day": "Salı",
          "date": "2024-07-23",
          "isRestDay": false,
          "dailyTasks": [
            {
              "subject": "Fizik",
              "topic": "Vektörler",
              "durationInMinutes": 75,
              "isCompleted": false
            }
          ]
        },
        {
          "day": "Çarşamba",
          "date": "2024-07-24",
          "isRestDay": true,
          "dailyTasks": []
        }
    ]
  }
}
''';
  }

  /// Oluşturulan prompt'u kullanarak Gemini API'sinden ders planını alır.
  Future<String> getStudyPlanFromGemini(String prompt) async {
    const String model = 'gemini-1.5-pro';
    final Uri url = Uri.parse(
        'https://generativelanguage.googleapis.com/v1/models/$model:generateContent?key=$geminiApiKey');

    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'contents': [
            {
              'parts': [
                {'text': prompt}
              ]
            }
          ],
          "generationConfig": {
            "temperature": 0.3,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 8192,
          },
        }),
      );

      if (response.statusCode == 200) {
        final decodedResponse = jsonDecode(response.body);
        final text =
            decodedResponse['candidates'][0]['content']['parts'][0]['text'];
        return text;
      } else {
        final errorBody = response.body;
        debugPrint('❌ API Hatası Detayı: $errorBody');
        throw Exception(
            'API\'den Hatalı Durum Kodu Döndü: ${response.statusCode}. Detay: $errorBody');
      }
    } catch (e) {
      debugPrint('❌ Gemini API Hatası: $e');
      throw Exception(
          'Ders planı oluşturulurken bir hata oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
    }
  }

  // Araçlar listesi
  Future<Map<String, dynamic>> getToolsList() async {
    try {
      return await _apiClient.getToolsList();
    } catch (e) {
      throw Exception('Araçlar listesi alınamadı: $e');
    }
  }

  // SOS Soru Çözücü
  Future<Map<String, dynamic>> solveQuestion({
    required String question,
    required String subject,
    required int grade,
  }) async {
    try {
      return await _apiClient.solveQuestion(question, subject, grade);
    } catch (e) {
      throw Exception('Soru çözülemedi: $e');
    }
  }

  // Özet Oluşturucu
  Future<Map<String, dynamic>> generateSummary({
    required String content,
    required String type,
  }) async {
    try {
      return await _apiClient.generateSummary(content, type);
    } catch (e) {
      throw Exception('Özet oluşturulamadı: $e');
    }
  }

  // Flashcard Oluşturucu
  Future<Map<String, dynamic>> generateFlashcards({
    required String topic,
    required int count,
  }) async {
    try {
      return await _apiClient.post(
        '/smart-tools/flashcards-generator',
        {
          'topic': topic,
          'count': count,
        },
      );
    } catch (e) {
      throw Exception('Flashcard oluşturulamadı: $e');
    }
  }

  // Kavram Haritası
  Future<Map<String, dynamic>> generateConceptMap({
    required String topic,
    required List<String> connections,
  }) async {
    try {
      return await _apiClient.post(
        '/smart-tools/concept-map',
        {
          'topic': topic,
          'connections': connections,
        },
      );
    } catch (e) {
      throw Exception('Kavram haritası oluşturulamadı: $e');
    }
  }

  // Feynman Döngüsü
  Future<Map<String, dynamic>> feynmanCycle({
    required String topic,
    required String explanation,
  }) async {
    try {
      return await _apiClient.post(
        '/smart-tools/feynman-cycle',
        {
          'topic': topic,
          'explanation': explanation,
        },
      );
    } catch (e) {
      throw Exception('Feynman döngüsü oluşturulamadı: $e');
    }
  }

  // Sokratik Değerlendirme
  Future<Map<String, dynamic>> socraticEvaluation({
    required String answer,
    required String question,
  }) async {
    try {
      return await _apiClient.post(
        '/smart-tools/socratic-evaluation',
        {
          'answer': answer,
          'question': question,
        },
      );
    } catch (e) {
      throw Exception('Sokratik değerlendirme yapılamadı: $e');
    }
  }

  // Canlı Quiz
  Future<Map<String, dynamic>> generateLiveQuiz({
    required String topic,
    required String difficulty,
    required int count,
  }) async {
    try {
      return await _apiClient.post(
        '/smart-tools/live-quiz',
        {
          'topic': topic,
          'difficulty': difficulty,
          'count': count,
        },
      );
    } catch (e) {
      throw Exception('Canlı quiz oluşturulamadı: $e');
    }
  }

  // Sınav Simülatörü
  Future<Map<String, dynamic>> examSimulator({
    required String subject,
    required int grade,
    required int duration,
  }) async {
    try {
      return await _apiClient.post(
        '/smart-tools/exam-simulator',
        {
          'subject': subject,
          'grade': grade,
          'duration': duration,
        },
      );
    } catch (e) {
      throw Exception('Sınav simülatörü oluşturulamadı: $e');
    }
  }

  // Zihinsel Destek
  Future<Map<String, dynamic>> mentalSupport({
    required String issue,
    required String context,
  }) async {
    try {
      return await _apiClient.post(
        '/smart-tools/mental-support',
        {
          'issue': issue,
          'context': context,
        },
      );
    } catch (e) {
      throw Exception('Zihinsel destek alınamadı: $e');
    }
  }
}
