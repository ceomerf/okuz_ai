import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:async';
import '../models/gamification.dart';
import '../services/study_tracking_service.dart';
import '../services/gamification_service.dart';
import '../services/family_account_service.dart';
import '../models/student_profile.dart'; // AccountType için eklendi

/// Ana uygulama için real-time veri ve state management Provider'ı
///
/// Bu provider hem Firestore stream'lerini dinler hem de
/// Cloud Function çağrılarından sonra immediate UI güncellemeleri sağlar
class StudyDataProvider extends ChangeNotifier {
  final StudyTrackingService _studyTrackingService = StudyTrackingService();
  final GamificationService _gamificationService = GamificationService();
  final FamilyAccountService _familyAccountService = FamilyAccountService();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Stream subscriptions
  StreamSubscription<DocumentSnapshot>? _gamificationSubscription;
  StreamSubscription<DocumentSnapshot>? _performanceSubscription;
  StreamSubscription<DocumentSnapshot>? _performanceAnalyticsSubscription;
  StreamSubscription<User?>? _authSubscription;

  // Cached data for immediate updates
  Gamification? _cachedGamification;
  Map<String, dynamic>? _cachedPerformanceData;
  Map<String, dynamic>? _cachedPerformanceAnalytics;
  bool _isInitialized = false;
  bool _isLoading = true;

  // Dynamic Theme variables
  Map<String, dynamic>? _currentTheme;
  Map<String, dynamic>? _userMood;
  bool _isThemeLoading = false;
  DateTime? _lastThemeUpdate;

  // Getters for UI
  Gamification? get gamificationData => _cachedGamification;
  Map<String, dynamic>? get performanceData => _cachedPerformanceData;
  Map<String, dynamic>? get performanceAnalytics => _cachedPerformanceAnalytics;
  bool get isInitialized => _isInitialized;
  bool get isLoading => _isLoading;

  // Dynamic Theme getters
  Map<String, dynamic>? get currentTheme => _currentTheme;
  Map<String, dynamic>? get userMood => _userMood;
  bool get isThemeLoading => _isThemeLoading;
  bool get hasActiveTheme => _currentTheme != null;
  String get themeType => _currentTheme?['themeType'] ?? 'focused';

  // Computed properties
  int get totalXP => _cachedGamification?.xp ?? 0;
  int get currentLevel => _cachedGamification?.level ?? 1;
  int get currentStreak => _cachedGamification?.streak ?? 0;
  int get weeklyStudyMinutes =>
      _cachedPerformanceData?['weeklyStudyTimeMinutes'] ?? 0;
  int get totalStudyMinutes =>
      _cachedPerformanceData?['totalStudyTimeMinutes'] ?? 0;

  // Analytics computed properties
  int get averageSessionDuration =>
      _cachedPerformanceAnalytics?['averageSessionDuration'] ?? 25;
  int get totalFocusMinutes =>
      _cachedPerformanceAnalytics?['totalFocusMinutes'] ?? 0;
  int get totalManualMinutes =>
      _cachedPerformanceAnalytics?['totalManualMinutes'] ?? 0;
  int get totalSessions => _cachedPerformanceAnalytics?['totalSessions'] ?? 0;

  // En çok çalışılan ders
  String get mostStudiedSubject {
    final timeBySubject =
        _cachedPerformanceAnalytics?['timeBySubject'] as Map<String, dynamic>?;
    if (timeBySubject == null || timeBySubject.isEmpty) return 'Henüz veri yok';

    String topSubject = '';
    int maxTime = 0;
    timeBySubject.forEach((subject, time) {
      if (time is int && time > maxTime) {
        maxTime = time;
        topSubject = subject;
      }
    });
    return topSubject.isEmpty ? 'Henüz veri yok' : topSubject;
  }

  // Odak modu vs manuel kayıt tercihi
  String get studyPreference {
    if (totalFocusMinutes == 0 && totalManualMinutes == 0)
      return 'Henüz veri yok';
    if (totalFocusMinutes > totalManualMinutes * 2) return 'Odak Modu Odaklı';
    if (totalManualMinutes > totalFocusMinutes * 2)
      return 'Manuel Kayıt Odaklı';
    return 'Dengeli Kullanım';
  }

  // Haftalık süreyi saat ve dakika olarak formatlanmış döndür
  String get weeklyTimeFormatted {
    final hours = weeklyStudyMinutes ~/ 60;
    final minutes = weeklyStudyMinutes % 60;
    return '${hours}s ${minutes}dk';
  }

  StudyDataProvider() {
    _initializeAuth();
  }

  /// Ana uygulama başlatıldığında çağrılır
  Future<void> initialize() async {
    final user = _auth.currentUser;
    if (user == null) return;

    _isLoading = true;
    notifyListeners();

    try {
      // Temel başlatma işlemleri
      _isInitialized = true;
    } catch (e) {
      debugPrint('StudyDataProvider başlatma hatası: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Authentication state'ini dinle ve kullanıcı değişikliklerini handle et
  void _initializeAuth() {
    _authSubscription = _auth.authStateChanges().listen(_onAuthStateChanged);
  }

  /// Kullanıcı oturumu değişikliklerini handle et
  void _onAuthStateChanged(User? user) {
    debugPrint('🔄 Auth state changed: User ${user?.uid}');

    if (user != null && user.uid.isNotEmpty && user.uid.length >= 8) {
      // Geçerli kullanıcı - minimal gecikme ile stream'leri kur
      Future.delayed(const Duration(milliseconds: 500), () {
        final currentUser = _auth.currentUser;
        if (currentUser != null &&
            currentUser.uid.isNotEmpty &&
            currentUser.uid == user.uid) {
          debugPrint(
              '✅ Auth state stable, setting up streams for: ${user.uid}');
          _setupDataStreams();
        } else {
          debugPrint('⚠️  Auth state changed during delay, skipping setup');
        }
      });
    } else {
      debugPrint('🚪 User logged out or invalid, cleaning up streams');
      _cleanup();
    }
  }

  /// Real-time data stream'lerini setup et
  void _setupDataStreams() async {
    final user = _auth.currentUser;

    // KORUMA KALKANI: userId'nin geçerli olduğundan emin ol
    if (user == null || user.uid.isEmpty || user.uid.length < 8) {
      debugPrint(
          'HATA: _setupDataStreams geçersiz bir userId ile çağrıldı. User: $user, UID: ${user?.uid}');
      debugPrint('İşlem durduruldu - Firebase stream\'leri kurulmayacak');
      _isLoading = false;
      notifyListeners();
      return; // Fonksiyondan erken çık
    }

    debugPrint('✅ Veri akışları ayarlanıyor: Kullanıcı ID: ${user.uid}');

    _isLoading = true;
    notifyListeners();

    try {
      // Hesap verilerini yükle
      await _familyAccountService.loadAccountData();

      // Hesap türünü ve seçili profili al
      final accountType = _familyAccountService.accountType;
      final selectedProfileId = _familyAccountService.selectedProfileId;

      debugPrint(
          '✅ Hesap tipi: $accountType, Seçili profil: $selectedProfileId');

      // Veri yollarını hesap tipine göre belirle
      String gamificationPath;
      String performancePath;
      String performanceAnalyticsPath;

      if (accountType == AccountType.parent && selectedProfileId != null) {
        // Aile hesabı - yeni yapı
        gamificationPath =
            'users/${user.uid}/studentProfiles/$selectedProfileId/gamification/data';
        performancePath =
            'users/${user.uid}/studentProfiles/$selectedProfileId/performance/summary';
        performanceAnalyticsPath =
            'users/${user.uid}/studentProfiles/$selectedProfileId/performance_analytics/summary';
        debugPrint('✅ Aile hesabı stream\'leri kuruluyor: $selectedProfileId');
      } else {
        // Tek kullanıcı hesabı - eski yapı (document path'leri düzeltildi)
        gamificationPath = 'users/${user.uid}/gamification/data';
        performancePath = 'users/${user.uid}/performance/summary';
        performanceAnalyticsPath =
            'users/${user.uid}/performance_analytics/summary';
        debugPrint('✅ Tek kullanıcı stream\'leri kuruluyor');
      }

      // Gamification data stream
      _gamificationSubscription =
          _firestore.doc(gamificationPath).snapshots().listen(
        (snapshot) {
          if (snapshot.exists) {
            try {
              final data = snapshot.data() as Map<String, dynamic>;
              _cachedGamification = Gamification.fromJson({
                'userId': user.uid,
                ...data,
              });

              if (!_isInitialized) {
                _isInitialized = true;
                _isLoading = false;
              }

              notifyListeners();
            } catch (e) {
              debugPrint('Gamification data parse error: $e');
              // Varsayılan gamification verisi oluştur
              _createDefaultGamification(user.uid);
            }
          } else {
            // Dokument mevcut değilse varsayılan veriyi oluştur
            _createDefaultGamification(user.uid);
          }
        },
        onError: (error) {
          debugPrint('Gamification stream error: $error');
          _createDefaultGamification(user.uid);
          _isLoading = false;
          notifyListeners();
        },
      );

      // Performance data stream
      _performanceSubscription =
          _firestore.doc(performancePath).snapshots().listen(
        (snapshot) {
          if (snapshot.exists) {
            _cachedPerformanceData = snapshot.data() as Map<String, dynamic>?;
            notifyListeners();
          }
        },
        onError: (error) {
          debugPrint('Performance stream error: $error');
        },
      );

      // Performance Analytics stream
      _performanceAnalyticsSubscription =
          _firestore.doc(performanceAnalyticsPath).snapshots().listen(
        (snapshot) {
          if (snapshot.exists) {
            _cachedPerformanceAnalytics =
                snapshot.data() as Map<String, dynamic>?;
            notifyListeners();
          }
        },
        onError: (error) {
          debugPrint('Performance Analytics stream error: $error');
        },
      );

      debugPrint('✅ Tüm stream\'ler başarıyla kuruldu');
    } catch (e) {
      debugPrint('❌ Stream ayarlanırken hata oluştu: $e');
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Çalışma seansı kaydettikten sonra immediate UI güncellemesi
  ///
  /// Bu method logStudySession çağrısından hemen sonra çağrılarak
  /// Firebase stream'in güncellenmesini beklemeden UI'ın anında tepki vermesini sağlar
  Future<void> updateAfterStudySession(Map<String, dynamic> studyResult) async {
    if (_cachedGamification == null || _cachedPerformanceData == null) return;

    try {
      // XP ve level güncellemelerini anında yansıt
      final xpGained = studyResult['xpGained'] as int? ?? 0;
      final newTotalXP =
          studyResult['totalXP'] as int? ?? _cachedGamification!.xp;
      final levelInfo = studyResult['levelInfo'] as Map<String, dynamic>? ?? {};
      final newLevel =
          levelInfo['newLevel'] as int? ?? _cachedGamification!.level;

      // Gamification cache'ini güncelle
      _cachedGamification = Gamification(
        userId: _cachedGamification!.userId,
        xp: newTotalXP,
        level: newLevel,
        streak: _cachedGamification!.streak,
        badges: _cachedGamification!.badges,
        subjectXP: _cachedGamification!.subjectXP,
        achievements: _cachedGamification!.achievements,
        lastCompletedDate: _cachedGamification!.lastCompletedDate,
      );

      // Performance cache'ini güncelle
      final durationInMinutes =
          studyResult['session']?['durationInMinutes'] as int? ?? 0;
      final isManualEntry =
          studyResult['session']?['isManualEntry'] as bool? ?? false;
      final subject = studyResult['session']?['subject'] as String? ?? 'Genel';

      if (_cachedPerformanceData != null) {
        _cachedPerformanceData =
            Map<String, dynamic>.from(_cachedPerformanceData!);
        _cachedPerformanceData!['totalStudyTimeMinutes'] =
            (_cachedPerformanceData!['totalStudyTimeMinutes'] as int? ?? 0) +
                durationInMinutes;
        _cachedPerformanceData!['weeklyStudyTimeMinutes'] =
            (_cachedPerformanceData!['weeklyStudyTimeMinutes'] as int? ?? 0) +
                durationInMinutes;
      }

      // Performance Analytics cache'ini güncelle (Optimistic UI için)
      if (_cachedPerformanceAnalytics != null) {
        _cachedPerformanceAnalytics =
            Map<String, dynamic>.from(_cachedPerformanceAnalytics!);

        // Toplam süre ve session sayılarını güncelle
        final currentTotalMinutes =
            _cachedPerformanceAnalytics!['totalMinutesStudied'] as int? ?? 0;
        final currentTotalSessions =
            _cachedPerformanceAnalytics!['totalSessions'] as int? ?? 0;
        final currentManualMinutes =
            _cachedPerformanceAnalytics!['totalManualMinutes'] as int? ?? 0;
        final currentFocusMinutes =
            _cachedPerformanceAnalytics!['totalFocusMinutes'] as int? ?? 0;

        // Yeni değerleri hesapla
        final newTotalMinutes = currentTotalMinutes + durationInMinutes;
        final newTotalSessions = currentTotalSessions + 1;
        final newManualMinutes = isManualEntry
            ? currentManualMinutes + durationInMinutes
            : currentManualMinutes;
        final newFocusMinutes = isManualEntry
            ? currentFocusMinutes
            : currentFocusMinutes + durationInMinutes;

        // Ortalama session süresini yeniden hesapla
        final newAverageSessionDuration = newTotalSessions > 0
            ? (newTotalMinutes / newTotalSessions).round()
            : 25;

        // Ders bazında verileri güncelle
        final timeBySubject = Map<String, dynamic>.from(
            _cachedPerformanceAnalytics!['timeBySubject']
                    as Map<String, dynamic>? ??
                {});
        final sessionsBySubject = Map<String, dynamic>.from(
            _cachedPerformanceAnalytics!['sessionsBySubject']
                    as Map<String, dynamic>? ??
                {});

        timeBySubject[subject] =
            (timeBySubject[subject] as int? ?? 0) + durationInMinutes;
        sessionsBySubject[subject] =
            (sessionsBySubject[subject] as int? ?? 0) + 1;

        // Cache'i güncelle
        _cachedPerformanceAnalytics!.addAll({
          'totalMinutesStudied': newTotalMinutes,
          'totalManualMinutes': newManualMinutes,
          'totalFocusMinutes': newFocusMinutes,
          'totalSessions': newTotalSessions,
          'averageSessionDuration': newAverageSessionDuration,
          'timeBySubject': timeBySubject,
          'sessionsBySubject': sessionsBySubject,
          'lastSessionDuration': durationInMinutes,
          'lastSessionSubject': subject,
          'lastSessionType': isManualEntry ? 'manual' : 'focus',
          'lastUpdated': DateTime.now().millisecondsSinceEpoch,
        });
      }

      // UI'ı immediate olarak güncelle
      notifyListeners();

      debugPrint('StudyDataProvider: Immediate state update completed');
      debugPrint('- New XP: $newTotalXP (+$xpGained)');
      debugPrint('- New Level: $newLevel');
      debugPrint('- Added Minutes: $durationInMinutes');
    } catch (e) {
      debugPrint('StudyDataProvider: Immediate update error: $e');
    }
  }

  /// Manual XP update (manuel test için)
  void updateXP(int newXP, int newLevel) {
    if (_cachedGamification != null) {
      _cachedGamification = Gamification(
        userId: _cachedGamification!.userId,
        xp: newXP,
        level: newLevel,
        streak: _cachedGamification!.streak,
        badges: _cachedGamification!.badges,
        subjectXP: _cachedGamification!.subjectXP,
        achievements: _cachedGamification!.achievements,
        lastCompletedDate: _cachedGamification!.lastCompletedDate,
      );
      notifyListeners();
    }
  }

  /// Streak güncelleme sonrası immediate update
  void updateStreak(int newStreak) {
    if (_cachedGamification != null) {
      _cachedGamification = Gamification(
        userId: _cachedGamification!.userId,
        xp: _cachedGamification!.xp,
        level: _cachedGamification!.level,
        streak: newStreak,
        badges: _cachedGamification!.badges,
        subjectXP: _cachedGamification!.subjectXP,
        achievements: _cachedGamification!.achievements,
        lastCompletedDate: DateTime.now(),
      );
      notifyListeners();
    }
  }

  /// Haftalık statistics stream - StreamBuilder'lar için
  Stream<Map<String, dynamic>> get weeklyStatsStream {
    final user = _auth.currentUser;
    if (user == null) {
      return Stream.value({});
    }

    // Hesap tipine göre doğru path'i belirle
    final accountType = _familyAccountService.accountType;
    final selectedProfileId = _familyAccountService.selectedProfileId;

    String performancePath;
    if (accountType == AccountType.parent && selectedProfileId != null) {
      performancePath =
          'users/${user.uid}/studentProfiles/$selectedProfileId/performance/summary';
    } else {
      performancePath = 'users/${user.uid}/performance/summary';
    }

    return _firestore.doc(performancePath).snapshots().map((snapshot) {
      if (snapshot.exists) {
        return snapshot.data() ?? {};
      }
      return {};
    });
  }

  /// Gamification data stream - StreamBuilder'lar için
  Stream<Gamification?> get gamificationStream {
    final user = _auth.currentUser;
    if (user == null) {
      return Stream.value(null);
    }

    // Hesap tipine göre doğru path'i belirle
    final accountType = _familyAccountService.accountType;
    final selectedProfileId = _familyAccountService.selectedProfileId;

    String gamificationPath;
    if (accountType == AccountType.parent && selectedProfileId != null) {
      gamificationPath =
          'users/${user.uid}/studentProfiles/$selectedProfileId/gamification/data';
    } else {
      gamificationPath = 'users/${user.uid}/gamification/data';
    }

    return _firestore.doc(gamificationPath).snapshots().map((snapshot) {
      if (snapshot.exists) {
        try {
          final data = snapshot.data() as Map<String, dynamic>;
          return Gamification.fromJson({
            'userId': user.uid,
            ...data,
          });
        } catch (e) {
          debugPrint('Gamification parsing error: $e');
          return null;
        }
      }
      return null;
    });
  }

  /// Provider'ı manuel olarak refresh et
  Future<void> refresh() async {
    final user = _auth.currentUser;
    if (user == null) return;

    _isLoading = true;
    notifyListeners();

    try {
      // Hesap verilerini yükle
      await _familyAccountService.loadAccountData();

      // Hesap türünü ve seçili profili al
      final accountType = _familyAccountService.accountType;
      final selectedProfileId = _familyAccountService.selectedProfileId;

      // Veri yollarını hesap tipine göre belirle
      String gamificationPath;
      String performancePath;
      String performanceAnalyticsPath;

      if (accountType == AccountType.parent && selectedProfileId != null) {
        // Aile hesabı - yeni yapı
        gamificationPath =
            'users/${user.uid}/studentProfiles/$selectedProfileId/gamification/data';
        performancePath =
            'users/${user.uid}/studentProfiles/$selectedProfileId/performance/summary';
        performanceAnalyticsPath =
            'users/${user.uid}/studentProfiles/$selectedProfileId/performance_analytics/summary';
      } else {
        // Tek kullanıcı hesabı - eski yapı (document path'leri düzeltildi)
        gamificationPath = 'users/${user.uid}/gamification/data';
        performancePath = 'users/${user.uid}/performance/summary';
        performanceAnalyticsPath =
            'users/${user.uid}/performance_analytics/summary';
      }

      // Gamification data'yı manual fetch et
      final gamificationDoc = await _firestore.doc(gamificationPath).get();

      if (gamificationDoc.exists) {
        final data = gamificationDoc.data() as Map<String, dynamic>;
        _cachedGamification = Gamification.fromJson({
          'userId': user.uid,
          ...data,
        });
      }

      // Performance data'yı manual fetch et
      final performanceDoc = await _firestore.doc(performancePath).get();

      if (performanceDoc.exists) {
        _cachedPerformanceData = performanceDoc.data() as Map<String, dynamic>?;
      }

      // Performance Analytics data'yı manual fetch et
      final performanceAnalyticsDoc =
          await _firestore.doc(performanceAnalyticsPath).get();

      if (performanceAnalyticsDoc.exists) {
        _cachedPerformanceAnalytics =
            performanceAnalyticsDoc.data() as Map<String, dynamic>?;
      }

      _isInitialized = true;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      debugPrint('StudyDataProvider refresh error: $e');
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Cleanup when disposing
  void _cleanup() {
    _gamificationSubscription?.cancel();
    _performanceSubscription?.cancel();
    _performanceAnalyticsSubscription?.cancel();
    _cachedGamification = null;
    _cachedPerformanceData = null;
    _cachedPerformanceAnalytics = null;
    _isInitialized = false;
    _isLoading = true;
    notifyListeners();
  }

  /// Varsayılan gamification verisi oluştur
  void _createDefaultGamification(String userId) {
    try {
      _cachedGamification = Gamification.fromJson({
        'userId': userId,
        'currentLevel': 1,
        'totalXP': 0,
        'weeklyXP': 0,
        'dailyStreak': 0,
        'totalStudyTime': 0,
        'achievements': <String>[],
        'badges': <String>[],
        'weeklyGoal': 1200, // 20 saat = 1200 dakika
        'lastActiveDate': DateTime.now().toIso8601String(),
      });

      if (!_isInitialized) {
        _isInitialized = true;
        _isLoading = false;
      }

      notifyListeners();
      debugPrint('Default gamification data created for user: $userId');
    } catch (e) {
      debugPrint('Error creating default gamification: $e');
      _isLoading = false;
      notifyListeners();
    }
  }

  // Dynamic Theme methods

  /// Kullanıcının ruh halini analiz eder ve adaptif tema yükler
  Future<void> analyzeAndLoadTheme() async {
    final user = _auth.currentUser;
    if (user == null || user.uid.isEmpty) {
      debugPrint('User not authenticated, skipping theme analysis');
      _setDefaultTheme();
      return;
    }

    // ⚠️ GEÇİCİ: CPU kotası dolduğu için bu fonksiyonlar devre dışı
    // Kota artışı onaylandığında bu yorumları kaldırın
    debugPrint('⚠️ Tema analizi geçici olarak devre dışı (CPU kotası)');
    _setDefaultTheme();
    return;

    // Firebase Auth token'ının geçerliliğini kontrol et
    // try {
    //   await user.reload();
    //   final token = await user.getIdToken(true);
    //   if (token?.isEmpty ?? true) {
    //     debugPrint('No valid auth token, using default theme');
    //     _setDefaultTheme();
    //     return;
    //   }
    // } catch (e) {
    //   debugPrint('Auth token error: $e');
    //   _setDefaultTheme();
    //   return;
    // }

    // // Eğer son 30 dakika içinde güncellenmişse tekrar yükleme
    // if (_lastThemeUpdate != null &&
    //     DateTime.now().difference(_lastThemeUpdate!).inMinutes < 30) {
    //   return;
    // }

    // _isThemeLoading = true;
    // notifyListeners();

    // try {
    //   // Önce ruh hali analizi yap
    //   await _analyzeMood(user.uid);

    //   // Sonra adaptif tema al
    //   await _loadAdaptiveTheme(user.uid);

    //   _lastThemeUpdate = DateTime.now();
    // } catch (e) {
    //   debugPrint('Tema analizi hatası: $e');
    //   _setDefaultTheme();
    // } finally {
    //   _isThemeLoading = false;
    //   notifyListeners();
    // }
  }

  /// Ruh hali analizini tetikler
  Future<void> _analyzeMood(String userId) async {
    // ⚠️ GEÇİCİ: Bu fonksiyon şu anda deploy edilmediği için devre dışı
    debugPrint('⚠️ Ruh hali analizi geçici olarak devre dışı (CPU kotası)');
    _userMood = {
      'energyLevel': 'medium',
      'stressLevel': 'low',
      'motivationLevel': 'high'
    };
    return;

    // try {
    //   // Authentication kontrolü
    //   final user = _auth.currentUser;
    //   if (user == null) throw Exception('User not authenticated');

    //   // Hesap tipini ve seçili profili al
    //   final accountType = _familyAccountService.accountType;
    //   final profileId = _familyAccountService.selectedProfileId;

    //   // Tek kullanıcı hesabında profileId gerekmez
    //   if (accountType == AccountType.parent && profileId == null) {
    //     debugPrint('❌ Aile hesabı için profil ID bulunamadı');
    //     return;
    //   }

    //   // Firebase Cloud Function çağrısı
    //   final callable =
    //       FirebaseFunctions.instance.httpsCallable('analyzeUserMood');

    //   final requestData = {'userId': userId};

    //   // Sadece aile hesabında profileId ekle
    //   if (accountType == AccountType.parent && profileId != null) {
    //     requestData['profileId'] = profileId;
    //   }

    //   final result = await callable.call(requestData);

    //   if (result.data['success'] == true) {
    //     _userMood = Map<String, dynamic>.from(result.data['mood']);
    //     debugPrint('Ruh hali analizi başarılı: ${_userMood?['energyLevel']}');
    //   }
    // } catch (e) {
    //   debugPrint('Ruh hali analizi hatası: $e');
    //   // Hata durumunda varsayılan ruh hali
    //   _userMood = {
    //     'energyLevel': 0.5,
    //     'stressLevel': 0.3,
    //     'motivationLevel': 0.7
    //   };
    // }
  }

  /// Adaptif tema konfigürasyonunu yükler
  Future<void> _loadAdaptiveTheme(String userId) async {
    // ⚠️ GEÇİCİ: Bu fonksiyon şu anda deploy edilmediği için devre dışı
    debugPrint('⚠️ Adaptif tema yükleme geçici olarak devre dışı (CPU kotası)');
    _setDefaultTheme();
    return;

    // try {
    //   // Authentication kontrolü
    //   final user = _auth.currentUser;
    //   if (user == null) throw Exception('User not authenticated');

    //   // Hesap tipini ve seçili profili al
    //   final accountType = _familyAccountService.accountType;
    //   final profileId = _familyAccountService.selectedProfileId;

    //   // Tek kullanıcı hesabında profileId gerekmez
    //   if (accountType == AccountType.parent && profileId == null) {
    //     debugPrint('❌ Aile hesabı için profil ID bulunamadı');
    //     _setDefaultTheme();
    //     return;
    //   }

    //   // Firebase Cloud Function çağrısı
    //   final callable =
    //       FirebaseFunctions.instance.httpsCallable('getAdaptiveTheme');

    //   final requestData = {'userId': userId};

    //   // Sadece aile hesabında profileId ekle
    //   if (accountType == AccountType.parent && profileId != null) {
    //     requestData['profileId'] = profileId;
    //   }

    //   final result = await callable.call(requestData);

    //   if (result.data['success'] == true) {
    //     _currentTheme = Map<String, dynamic>.from(result.data['theme']);
    //     debugPrint('Adaptif tema yüklendi: ${_currentTheme?['themeType']}');
    //   } else {
    //     _setDefaultTheme();
    //   }
    // } catch (e) {
    //   debugPrint('Adaptif tema yükleme hatası: $e');
    //   // Hata durumunda varsayılan tema
    //   _setDefaultTheme();
    // }
  }

  /// Varsayılan tema ayarla
  void _setDefaultTheme() {
    _currentTheme = {
      'primaryColor': '#5E35B1',
      'accentColor': '#7E57C2',
      'backgroundColor': '#EDE7F6',
      'cardColor': '#FFFFFF',
      'textColor': '#4527A0',
      'buttonColor': '#673AB7',
      'energyEffectIntensity': 0.4,
      'animationSpeed': 1.0,
      'gradientIntensity': 0.4,
      'themeType': 'focused',
      'effectsEnabled': false
    };
  }

  /// Manuel tema güncellemesi (kullanıcı ayarlarından)
  Future<void> forceThemeUpdate() async {
    _lastThemeUpdate = null;
    await analyzeAndLoadTheme();
  }

  /// Tema efektlerinin aktif olup olmadığını kontrol eder
  bool get areEffectsEnabled {
    if (_currentTheme == null) return false;
    return _currentTheme!['effectsEnabled'] == true;
  }

  /// Enerji efekti yoğunluğunu döndürür (0.0 - 1.0)
  double get energyEffectIntensity {
    if (_currentTheme == null) return 0.4;
    return (_currentTheme!['energyEffectIntensity'] as num?)?.toDouble() ?? 0.4;
  }

  /// Animasyon hızını döndürür (0.5 - 2.0)
  double get animationSpeed {
    if (_currentTheme == null) return 1.0;
    return (_currentTheme!['animationSpeed'] as num?)?.toDouble() ?? 1.0;
  }

  /// Gradient yoğunluğunu döndürür (0.0 - 1.0)
  double get gradientIntensity {
    if (_currentTheme == null) return 0.4;
    return (_currentTheme!['gradientIntensity'] as num?)?.toDouble() ?? 0.4;
  }

  /// Tükenmişlik riski kontrolü
  bool get hasBurnoutRisk {
    if (_userMood == null) return false;
    return _userMood!['burnoutRisk'] == 'high';
  }

  /// Motivasyon seviyesi
  String get motivationLevel {
    if (_userMood == null) return 'medium';
    return _userMood!['motivationLevel'] ?? 'medium';
  }

  /// Enerji seviyesi
  String get energyLevel {
    if (_userMood == null) return 'medium';
    return _userMood!['energyLevel'] ?? 'medium';
  }

  /// Ruh hali özetini döndürür
  String getMoodSummary() {
    if (_userMood == null) return 'Ruh halin analiz ediliyor...';

    final energy = _userMood!['energyLevel'];
    final motivation = _userMood!['motivationLevel'];
    final stress = _userMood!['stressLevel'];

    if (energy == 'high' && motivation == 'high') {
      return '🔥 Yüksek enerji ve motivasyon!';
    } else if (stress == 'high') {
      return '😌 Biraz rahatlamaya odaklan';
    } else if (energy == 'low' && motivation == 'low') {
      return '💪 Motivasyonunu artırma zamanı!';
    } else {
      return '⚖️ Dengeli bir ruh halinde';
    }
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    _cleanup();
    super.dispose();
  }
}
