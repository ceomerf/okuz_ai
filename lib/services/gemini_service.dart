import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/services/api_key.dart';

class GeminiService {
  /// Kullanıcı verilerinden Gemini için detaylı ve kurallı bir prompt oluşturur.
  String generateStudyPrompt(OnboardingData data) {
    final String selectedSubjects = data.selectedSubjects.isEmpty
        ? 'ilgili tüm dersler'
        : data.selectedSubjects.join(', ');

    final String currentDate = DateFormat('d MMMM yyyy', 'tr_TR').format(DateTime.now());
    final bool followSchool = data.startPoint == 'school';

    return '''
Sen bir eğitim danışmanısın ve kullanıcılara okul dersleriyle paralel ilerleyen bireysel ders çalışma planları hazırlıyorsun. Lütfen aşağıdaki kullanıcı bilgilerine ve kurallara göre JSON formatında bir ders planı oluştur:

KULLANICI BİLGİLERİ:
- Sınıf: ${data.grade}. sınıf
- Alan: ${data.targetExam.isNotEmpty ? data.targetExam : 'Belirtilmemiş'}
- Odaklanılacak Dersler: [$selectedSubjects]
- Günlük Ortalama Çalışma Süresi: ${data.dailyGoalInHours} saat
- Plan Başlangıç Tarihi: [$currentDate]
- Okul Müfredatına Paralel mi: [${followSchool ? 'Evet' : 'Hayır'}]

KURALLAR:
1. Plan, başlangıç tarihinden itibaren TAM OLARAK 1 AYLIK (yaklaşık 4 hafta) bir süreyi kapsamalıdır.
2. Plan, kullanıcının sınıf seviyesine ve seçtiği derslere uygun, gerçekçi ve dengeli bir konu dağılımı içermelidir.
3. Kullanıcı "Okul Müfredatına Paralel" seçeneğini işaretlediyse, planı o ay okulda işlenmesi beklenen konulara göre oluştur. Tatil aylarında (Haziran, Temmuz, Ağustos) genel tekrar ve özet konularına odaklan.
4. "Okul Müfredatına Paralel" seçilmediyse ("En Baştan Başla"), konuları en temelden başlayarak sırayla ele alan bir plan yap.
5. Her gün için ayrılan toplam süre, kullanıcının belirttiği günlük çalışma süresini aşmamalıdır.
6. Yanıt olarak SADECE ve SADECE aşağıda belirtilen yapıda bir JSON nesnesi döndür. Başka hiçbir metin, açıklama, selamlama veya ```json ``` gibi işaretçiler ekleme. Yanıtın doğrudan '{' karakteri ile başlamalıdır.

İSTENEN JSON FORMATI:
{
  "planTitle": "Temmuz Ayı Çalışma Planı",
  "weeks": [
    {
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
  ]
}
''';
  }

  /// Oluşturulan prompt'u kullanarak Gemini API'sinden ders planını alır.
  Future<String> getStudyPlanFromGemini(String prompt) async {
    const String model = 'gemini-1.5-pro';
    final Uri url = Uri.parse('https://generativelanguage.googleapis.com/v1/models/$model:generateContent?key=$geminiApiKey');

    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'contents': [
            {'parts': [{'text': prompt}]}
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
        final text = decodedResponse['candidates'][0]['content']['parts'][0]['text'];
        return text;
      } else {
        final errorBody = response.body;
        print('API Hatası Detayı: $errorBody');
        throw Exception('API\'den Hatalı Durum Kodu Döndü: ${response.statusCode}. Detay: $errorBody');
      }
    } catch (e) {
      print('Gemini API Hatası: $e');
      throw Exception('Ders planı oluşturulurken bir hata oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
    }
  }
} 