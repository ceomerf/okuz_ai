import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import '../models/student_profile.dart';

class StudyTrackingService extends ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseFunctions _functions = FirebaseFunctions.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Mevcut seçili profil ID'si
  String? _selectedProfileId;

  /// Profil seçimini ayarla (aile hesabı için)
  void setSelectedProfile(String? profileId) {
    _selectedProfileId = profileId;
  }

  // Authentication helper method
  Future<String?> _ensureAuthenticated() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception(
          'Bu işlemi gerçekleştirmek için giriş yapmanız gerekiyor.');
    }

    try {
      // Kullanıcı bilgilerini sunucudan yenile
      await user.reload();

      // Yenilenen kullanıcı nesnesini al
      final refreshedUser = _auth.currentUser;
      if (refreshedUser == null) {
        throw Exception(
            'Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }

      // Yeni token'ı al (forceRefresh=true ile)
      final token = await refreshedUser.getIdToken(true);
      developer
          .log('Study tracking: Kimlik doğrulama token\'ı başarıyla yenilendi');
      return token;
    } catch (e) {
      developer.log('Study tracking token yenileme hatası: $e');
      throw Exception('Kimlik doğrulama hatası: $e');
    }
  }

  /// Hesap tipini ve aktif profil ID'sini belirler
  Future<Map<String, String?>> _getAccountContext() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturum açmamış');
    }

    final userDoc = await _firestore.doc('users/${user.uid}').get();
    if (!userDoc.exists) {
      throw Exception('Kullanıcı hesabı bulunamadı');
    }

    final userData = userDoc.data()!;
    final accountType = userData['accountType'] ?? 'single';
    final selectedProfileId =
        _selectedProfileId ?? userData['selectedProfileId'];

    return {
      'accountType': accountType,
      'selectedProfileId': selectedProfileId,
    };
  }

  /// Çalışma seansını Firebase Cloud Function üzerinden kaydeder
  ///
  /// [durationInMinutes]: Çalışma süresi (dakika)
  /// [subject]: Çalışılan ders
  /// [topic]: Çalışılan konu
  /// [isManualEntry]: Manuel mi otomatik mi (false = otomatik timer, true = manuel giriş)
  /// [date]: Çalışma tarihi (YYYY-MM-DD formatında)
  /// [additionalData]: Analitik veriler (pauseCount, sessionCompletionState, userFeeling vb.)
  /// [profileId]: Aile hesabı için öğrenci profil ID'si
  Future<Map<String, dynamic>> logStudySession({
    required int durationInMinutes,
    required String subject,
    required String topic,
    required bool isManualEntry,
    required String date,
    Map<String, dynamic>? additionalData,
    String? profileId, // Yeni: aile hesabı için
  }) async {
    try {
      // Kimlik doğrulama
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }

      final user = _auth.currentUser!;

      // Hesap kontekstini belirle
      final context = await _getAccountContext();
      final targetProfileId = profileId ?? context['selectedProfileId'];

      // Cloud Function'a gönderilecek veri
      final sessionData = {
        'durationInMinutes': durationInMinutes,
        'subject': subject,
        'topic': topic,
        'isManualEntry': isManualEntry,
        'date': date,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
        'profileId': targetProfileId, // Aile hesabı için profil ID'si
      };

      // Ek analitik veriler varsa ekle
      if (additionalData != null) {
        sessionData['analytics'] = additionalData;
      }

      developer.log('Çalışma seansı kaydediliyor: $sessionData');

      // Cloud Function'a istek gönder
      final callable = _functions.httpsCallable('logStudySession');
      final result = await callable.call(sessionData);

      developer.log('Çalışma seansı başarıyla kaydedildi: ${result.data}');

      // UI'yı güncelle
      notifyListeners();

      return result.data;
    } catch (e) {
      developer.log('Çalışma seansı kaydetme hatası: $e');
      throw Exception('Çalışma seansı kaydedilemedi: $e');
    }
  }

  /// Kullanıcının günlük çalışma istatistiklerini getirir
  Future<Map<String, dynamic>> getDailyStats(String date,
      {String? profileId}) async {
    try {
      await _ensureAuthenticated();
      final user = _auth.currentUser!;

      // Hesap kontekstini belirle
      final context = await _getAccountContext();
      final targetProfileId = profileId ?? context['selectedProfileId'];

      // Veri yolunu belirle
      String analyticsPath;
      if (context['accountType'] == 'family' && targetProfileId != null) {
        analyticsPath =
            'users/${user.uid}/studentProfiles/$targetProfileId/analytics/daily_logs/sessions';
      } else {
        analyticsPath = 'users/${user.uid}/analytics/daily_logs/sessions';
      }

      final snapshot = await _firestore
          .collection(analyticsPath)
          .where('date', isEqualTo: date)
          .get();

      int totalMinutes = 0;
      int sessionCount = 0;
      Set<String> uniqueSubjects = {};
      Map<String, int> subjectMinutes = {};

      for (var doc in snapshot.docs) {
        final data = doc.data();
        final duration = data['durationInMinutes'] as int? ?? 0;
        final subject = data['subject'] as String? ?? 'Bilinmeyen';

        totalMinutes += duration;
        sessionCount++;
        uniqueSubjects.add(subject);
        subjectMinutes[subject] = (subjectMinutes[subject] ?? 0) + duration;
      }

      return {
        'date': date,
        'totalMinutes': totalMinutes,
        'sessionCount': sessionCount,
        'uniqueSubjects': uniqueSubjects.length,
        'subjectBreakdown': subjectMinutes,
        'averageSessionLength':
            sessionCount > 0 ? totalMinutes / sessionCount : 0,
      };
    } catch (e) {
      developer.log('Günlük istatistik getirme hatası: $e');
      throw Exception('Günlük istatistikler getirilemedi: $e');
    }
  }

  /// Kullanıcının haftalık çalışma istatistiklerini getirir
  Future<Map<String, dynamic>> getWeeklyStats({String? profileId}) async {
    try {
      await _ensureAuthenticated();
      final user = _auth.currentUser!;

      // Hesap kontekstini belirle
      final context = await _getAccountContext();
      final targetProfileId = profileId ?? context['selectedProfileId'];

      // Son 7 günün tarihlerini hesapla
      final now = DateTime.now();
      List<String> dates = [];
      for (int i = 6; i >= 0; i--) {
        final date = now.subtract(Duration(days: i));
        dates.add(
            '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}');
      }

      // Her gün için istatistikleri al
      List<Map<String, dynamic>> dailyStats = [];
      int totalWeeklyMinutes = 0;
      int totalWeeklySessions = 0;
      Map<String, int> weeklySubjectMinutes = {};

      for (String date in dates) {
        final dayStats = await getDailyStats(date, profileId: targetProfileId);
        dailyStats.add(dayStats);

        totalWeeklyMinutes += dayStats['totalMinutes'] as int;
        totalWeeklySessions += dayStats['sessionCount'] as int;

        final subjectBreakdown =
            dayStats['subjectBreakdown'] as Map<String, int>;
        subjectBreakdown.forEach((subject, minutes) {
          weeklySubjectMinutes[subject] =
              (weeklySubjectMinutes[subject] ?? 0) + minutes;
        });
      }

      return {
        'weekStartDate': dates.first,
        'weekEndDate': dates.last,
        'totalMinutes': totalWeeklyMinutes,
        'totalSessions': totalWeeklySessions,
        'dailyStats': dailyStats,
        'subjectBreakdown': weeklySubjectMinutes,
        'averageDailyMinutes': totalWeeklyMinutes / 7,
        'studyDaysCount':
            dailyStats.where((day) => day['sessionCount'] > 0).length,
      };
    } catch (e) {
      developer.log('Haftalık istatistik getirme hatası: $e');
      throw Exception('Haftalık istatistikler getirilemedi: $e');
    }
  }

  /// Manuel çalışma kaydı ekleme (hızlı giriş için)
  Future<Map<String, dynamic>> addQuickStudyLog({
    required int minutes,
    required String subject,
    required String topic,
    String? profileId,
  }) async {
    final today = DateTime.now();
    final dateString =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    return await logStudySession(
      durationInMinutes: minutes,
      subject: subject,
      topic: topic,
      isManualEntry: true,
      date: dateString,
      profileId: profileId,
    );
  }

  /// Fokus modu seansı kaydetme
  Future<Map<String, dynamic>> logFocusSession({
    required int durationInMinutes,
    required String subject,
    required String topic,
    required Map<String, dynamic> focusAnalytics,
    String? profileId,
  }) async {
    final today = DateTime.now();
    final dateString =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    return await logStudySession(
      durationInMinutes: durationInMinutes,
      subject: subject,
      topic: topic,
      isManualEntry: false,
      date: dateString,
      additionalData: focusAnalytics,
      profileId: profileId,
    );
  }

  /// Performans trendlerini hesaplar
  Future<Map<String, dynamic>> getPerformanceTrends({String? profileId}) async {
    try {
      final weeklyStats = await getWeeklyStats(profileId: profileId);
      final dailyStats =
          weeklyStats['dailyStats'] as List<Map<String, dynamic>>;

      // Son 3 günün ortalaması
      final recent3Days =
          dailyStats.skip(dailyStats.length > 3 ? dailyStats.length - 3 : 0);
      final recent3DaysAvg = recent3Days.isNotEmpty
          ? recent3Days
                  .map((day) => day['totalMinutes'] as int)
                  .reduce((a, b) => a + b) /
              recent3Days.length
          : 0;

      // İlk 3 günün ortalaması
      final first3Days = dailyStats.take(3);
      final first3DaysAvg = first3Days
              .map((day) => day['totalMinutes'] as int)
              .reduce((a, b) => a + b) /
          3;

      // Trend hesaplama
      double trendPercentage = 0;
      String trendDirection = 'stable';

      if (first3DaysAvg > 0) {
        trendPercentage =
            ((recent3DaysAvg - first3DaysAvg) / first3DaysAvg) * 100;

        if (trendPercentage > 10) {
          trendDirection = 'improving';
        } else if (trendPercentage < -10) {
          trendDirection = 'declining';
        }
      }

      return {
        'weeklyTotal': weeklyStats['totalMinutes'],
        'dailyAverage': weeklyStats['averageDailyMinutes'],
        'studyDaysCount': weeklyStats['studyDaysCount'],
        'trendPercentage': trendPercentage,
        'trendDirection': trendDirection,
        'mostStudiedSubject':
            _getMostStudiedSubject(weeklyStats['subjectBreakdown']),
        'consistency': _calculateConsistency(dailyStats),
      };
    } catch (e) {
      developer.log('Performans trendi hesaplama hatası: $e');
      throw Exception('Performans trendleri hesaplanamadı: $e');
    }
  }

  String _getMostStudiedSubject(Map<String, int> subjectBreakdown) {
    if (subjectBreakdown.isEmpty) return 'Henüz çalışma kaydı yok';

    return subjectBreakdown.entries
        .reduce((a, b) => a.value > b.value ? a : b)
        .key;
  }

  double _calculateConsistency(List<Map<String, dynamic>> dailyStats) {
    final studyMinutes =
        dailyStats.map((day) => day['totalMinutes'] as int).toList();
    final studyDays = studyMinutes.where((minutes) => minutes > 0).length;

    return studyDays / 7.0; // 0-1 arası, 1 = her gün çalışmış
  }

  /// En çok çalışılan dersleri getirir
  Future<List<Map<String, dynamic>>> getTopSubjects(
      {int limit = 5, String? profileId}) async {
    try {
      await _ensureAuthenticated();
      final user = _auth.currentUser!;

      // Hesap kontekstini belirle
      final context = await _getAccountContext();
      final targetProfileId = profileId ?? context['selectedProfileId'];

      // Veri yolunu belirle
      String analyticsPath;
      if (context['accountType'] == 'family' && targetProfileId != null) {
        analyticsPath =
            'users/${user.uid}/studentProfiles/$targetProfileId/analytics/daily_logs/sessions';
      } else {
        analyticsPath = 'users/${user.uid}/analytics/daily_logs/sessions';
      }

      // Son 30 günün verilerini al
      final thirtyDaysAgo = DateTime.now().subtract(const Duration(days: 30));
      final snapshot = await _firestore
          .collection(analyticsPath)
          .where('timestamp',
              isGreaterThan: thirtyDaysAgo.millisecondsSinceEpoch)
          .get();

      Map<String, int> subjectMinutes = {};
      Map<String, int> subjectSessions = {};

      for (var doc in snapshot.docs) {
        final data = doc.data();
        final subject = data['subject'] as String? ?? 'Bilinmeyen';
        final duration = data['durationInMinutes'] as int? ?? 0;

        subjectMinutes[subject] = (subjectMinutes[subject] ?? 0) + duration;
        subjectSessions[subject] = (subjectSessions[subject] ?? 0) + 1;
      }

      // Dersleri çalışma süresine göre sırala
      final sortedSubjects = subjectMinutes.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));

      return sortedSubjects
          .take(limit)
          .map((entry) => {
                'subject': entry.key,
                'totalMinutes': entry.value,
                'sessionCount': subjectSessions[entry.key] ?? 0,
                'averageSessionDuration': subjectSessions[entry.key] != null &&
                        subjectSessions[entry.key]! > 0
                    ? (entry.value / subjectSessions[entry.key]!).round()
                    : 0,
              })
          .toList();
    } catch (e) {
      developer.log('En çok çalışılan dersler getirme hatası: $e');
      return [];
    }
  }

  /// Günlük çalışma loglarını stream olarak getirir
  Stream<List<Map<String, dynamic>>> getDailyStudyLogs(String date,
      {String? profileId}) async* {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        yield [];
        return;
      }

      // Hesap kontekstini belirle
      final context = await _getAccountContext();
      final targetProfileId = profileId ?? context['selectedProfileId'];

      // Veri yolunu belirle
      String analyticsPath;
      if (context['accountType'] == 'family' && targetProfileId != null) {
        analyticsPath =
            'users/${user.uid}/studentProfiles/$targetProfileId/analytics/daily_logs/sessions';
      } else {
        analyticsPath = 'users/${user.uid}/analytics/daily_logs/sessions';
      }

      yield* _firestore
          .collection(analyticsPath)
          .where('date', isEqualTo: date)
          .orderBy('timestamp', descending: true)
          .snapshots()
          .map((snapshot) {
        return snapshot.docs.map((doc) {
          final data = doc.data();
          return {
            'id': doc.id,
            'subject': data['subject'] ?? 'Bilinmeyen',
            'topic': data['topic'] ?? '',
            'durationInMinutes': data['durationInMinutes'] ?? 0,
            'isManualEntry': data['isManualEntry'] ?? false,
            'timestamp': data['timestamp'] ?? 0,
            'date': data['date'] ?? date,
          };
        }).toList();
      });
    } catch (e) {
      developer.log('Günlük çalışma logları stream hatası: $e');
      yield [];
    }
  }

  /// Haftalık istatistikleri stream olarak getirir
  Stream<Map<String, dynamic>> getWeeklyStatsStream(
      {String? profileId}) async* {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        yield {};
        return;
      }

      // Her değişiklikte haftalık istatistikleri yeniden hesapla
      while (true) {
        try {
          final stats = await getWeeklyStats(profileId: profileId);
          yield stats;

          // 5 dakikada bir güncelle (realtime için)
          await Future.delayed(const Duration(minutes: 5));
        } catch (e) {
          developer.log('Haftalık istatistik stream hatası: $e');
          yield {};
          await Future.delayed(const Duration(minutes: 1));
        }
      }
    } catch (e) {
      developer.log('Haftalık istatistik stream başlatma hatası: $e');
      yield {};
    }
  }

  /// Ders bazında çalışma dağılımını stream olarak getirir
  Stream<Map<String, dynamic>> getSubjectBreakdown({String? profileId}) async* {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        yield {};
        return;
      }

      // Hesap kontekstini belirle
      final context = await _getAccountContext();
      final targetProfileId = profileId ?? context['selectedProfileId'];

      // Veri yolunu belirle
      String analyticsPath;
      if (context['accountType'] == 'family' && targetProfileId != null) {
        analyticsPath =
            'users/${user.uid}/studentProfiles/$targetProfileId/analytics/daily_logs/sessions';
      } else {
        analyticsPath = 'users/${user.uid}/analytics/daily_logs/sessions';
      }

      // Son 30 günün verilerini dinle
      final thirtyDaysAgo = DateTime.now().subtract(const Duration(days: 30));

      yield* _firestore
          .collection(analyticsPath)
          .where('timestamp',
              isGreaterThan: thirtyDaysAgo.millisecondsSinceEpoch)
          .snapshots()
          .map((snapshot) {
        Map<String, int> subjectMinutes = {};
        Map<String, int> subjectSessions = {};
        int totalMinutes = 0;

        for (var doc in snapshot.docs) {
          final data = doc.data();
          final subject = data['subject'] as String? ?? 'Bilinmeyen';
          final duration = data['durationInMinutes'] as int? ?? 0;

          subjectMinutes[subject] = (subjectMinutes[subject] ?? 0) + duration;
          subjectSessions[subject] = (subjectSessions[subject] ?? 0) + 1;
          totalMinutes += duration;
        }

        // Yüzdelik hesaplama
        Map<String, double> subjectPercentages = {};
        if (totalMinutes > 0) {
          subjectMinutes.forEach((subject, minutes) {
            subjectPercentages[subject] = (minutes / totalMinutes) * 100;
          });
        }

        return {
          'subjectMinutes': subjectMinutes,
          'subjectSessions': subjectSessions,
          'subjectPercentages': subjectPercentages,
          'totalMinutes': totalMinutes,
          'totalSessions':
              subjectSessions.values.fold(0, (sum, sessions) => sum + sessions),
          'uniqueSubjects': subjectMinutes.keys.length,
        };
      });
    } catch (e) {
      developer.log('Ders dağılımı stream hatası: $e');
      yield {};
    }
  }
}
