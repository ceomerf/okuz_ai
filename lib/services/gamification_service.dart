import '../models/gamification.dart';
import 'api_client.dart';

class GamificationService {
  final ApiClient _apiClient = ApiClient();

  // Singleton pattern
  static final GamificationService _instance = GamificationService._internal();
  factory GamificationService() => _instance;
  GamificationService._internal();

  // Kullanıcı ilerleme bilgisini al
  Future<GamificationProgress> getProgress() async {
    try {
      return await _apiClient.getProgress();
    } catch (e) {
      throw Exception('İlerleme bilgisi alınamadı: $e');
    }
  }

  // Seviye bilgisini al
  Future<LevelInfo> getLevelInfo() async {
    try {
      return await _apiClient.getLevelInfo();
    } catch (e) {
      throw Exception('Seviye bilgisi alınamadı: $e');
    }
  }

  // Enerji durumunu al
  Future<EnergyStatus> getEnergyStatus() async {
    try {
      return await _apiClient.getEnergyStatus();
    } catch (e) {
      throw Exception('Enerji durumu alınamadı: $e');
    }
  }

  // Liderlik tablosunu al
  Future<Leaderboard> getLeaderboard() async {
    try {
      final data = await _apiClient.getLeaderboard();
      return Leaderboard.fromJson(data);
    } catch (e) {
      throw Exception('Liderlik tablosu alınamadı: $e');
    }
  }

  // Başarımları al
  Future<List<Achievement>> getAchievements() async {
    try {
      final data = await _apiClient.getAchievements();
      return data.map((item) => Achievement.fromJson(item)).toList();
    } catch (e) {
      throw Exception('Başarımlar alınamadı: $e');
    }
  }

  // Görev tamamla
  Future<Map<String, dynamic>> completeTask(
      String taskId, String taskType, int performance) async {
    try {
      final response = await _apiClient.post(
        '/gamification/complete-task',
        {
          'taskId': taskId,
          'taskType': taskType,
          'performance': performance,
        },
      );
      return response;
    } catch (e) {
      throw Exception('Görev tamamlanamadı: $e');
    }
  }

  // Enerji kullan
  Future<Map<String, dynamic>> useEnergy(
      String activityType, int energyCost) async {
    try {
      final response = await _apiClient.post(
        '/gamification/use-energy',
        {
          'activityType': activityType,
          'energyCost': energyCost,
        },
      );
      return response;
    } catch (e) {
      throw Exception('Enerji kullanılamadı: $e');
    }
  }

  // XP ekle
  Future<Map<String, dynamic>> addXP(int amount, {String? subject}) async {
    try {
      final data = <String, dynamic>{
        'amount': amount,
      };

      if (subject != null) {
        data['subject'] = subject;
      }

      return await _apiClient.post('/gamification/add-xp', data);
    } catch (e) {
      throw Exception('XP eklenemedi: $e');
    }
  }

  // Seriyi güncelle
  Future<Map<String, dynamic>> updateStreak() async {
    try {
      return await _apiClient.post('/gamification/update-streak', {});
    } catch (e) {
      throw Exception('Seri güncellenemedi: $e');
    }
  }

  // Başarım ilerlemesini güncelle
  Future<Map<String, dynamic>> updateAchievementProgress(
      String achievementId, int progress) async {
    try {
      return await _apiClient.post(
        '/gamification/update-achievement',
        {
          'achievementId': achievementId,
          'progress': progress,
        },
      );
    } catch (e) {
      throw Exception('Başarım ilerlemesi güncellenemedi: $e');
    }
  }

  // Kullanıcı gamification bilgilerini al (eski API için uyumluluk)
  Future<Gamification> getUserGamification() async {
    try {
      final progress = await getProgress();
      final levelInfo = await getLevelInfo();
      final energyStatus = await getEnergyStatus();

      // Yeni API'den eski modele dönüştür
      return Gamification(
        userId: 'current',
        xp: levelInfo.totalXP,
        level: levelInfo.currentLevel,
        streak: 0, // API'den alınamıyor, varsayılan değer
        badges: [],
        subjectXP: {},
        achievements: [],
      );
    } catch (e) {
      throw Exception('Kullanıcı gamification bilgileri alınamadı: $e');
    }
  }
}
