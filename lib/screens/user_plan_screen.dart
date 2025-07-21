import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:ui';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:okuz_ai/services/plan_service.dart';
import 'package:okuz_ai/services/gamification_service.dart';
import 'package:cloud_functions/cloud_functions.dart'; // Queue API için
import 'package:okuz_ai/providers/study_data_provider.dart';
import 'package:provider/provider.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:async';
import 'dart:math' as math;
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:okuz_ai/screens/calendar_view_screen.dart';
import 'package:okuz_ai/screens/focus_mode_screen.dart';
import 'package:okuz_ai/widgets/manual_study_bottom_sheet.dart';
import 'package:okuz_ai/models/gamification.dart';
import 'package:okuz_ai/screens/plan_generation_screen.dart';
import 'package:intl/intl.dart';
import 'package:okuz_ai/screens/gamification_screen.dart';
import 'package:okuz_ai/screens/smart_tools_screen.dart';
import 'package:okuz_ai/screens/growth_hub_screen.dart';
import 'package:okuz_ai/screens/settings_screen.dart';
import 'package:okuz_ai/screens/profile_screen.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:okuz_ai/providers/subscription_provider.dart';
import 'package:okuz_ai/screens/subscription_screen.dart';
import 'package:okuz_ai/services/subscription_service.dart';
import 'package:okuz_ai/screens/family_portal_screen.dart';
import 'package:okuz_ai/widgets/coming_soon_dialog.dart'; // 🚀 YENİ: Coming Soon Dialog

class UserPlanScreen extends StatefulWidget {
  const UserPlanScreen({Key? key}) : super(key: key);

  @override
  State<UserPlanScreen> createState() => _UserPlanScreenState();
}

class _UserPlanScreenState extends State<UserPlanScreen>
    with SingleTickerProviderStateMixin {
  final PlanService _planService = PlanService();
  final GamificationService _gamificationService = GamificationService();
  final List<Map<String, dynamic>> _planData = [];
  bool _isLoading = true;
  bool _isDataLoaded = false;

  // 🎯 Yeni sistem: 3 günlük ücretsiz AI + premium abonelik
  bool _isFreeTrialMode = true; // İlk 3 gün ücretsiz AI
  int _currentDay =
      1; // Güncel gün (1-10 arası, ilk 3 demo, sonraki 7 asıl plan)
  String? _errorMessage;
  Map<int, List<Map<String, dynamic>>> _planByDay = {};
  int _totalTasks = 0;
  int _completedTasks = 0;
  int _currentStreak = 0;
  int _weeklyProgress = 0;
  StreamSubscription<User?>? _authSubscription;

  // Real-time gamification data
  Gamification? _gamificationData;
  StreamSubscription<DocumentSnapshot>? _gamificationSubscription;

  // Today's focus section accordion state
  bool _isTodayFocusExpanded = false;

  // 🚀 ASENKRON QUEUE SİSTEMİ - Plan oluşturma durumu
  String?
      _queueStatus; // 'pending', 'processing', 'completed', 'failed', 'not_found'
  int? _queuePosition;
  String? _queueMessage;
  Timer? _queueCheckTimer;

  // Animasyon kontrolcüsü
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutCubic,
    ));

    // Animasyonu hemen başlat - her durumda animasyon hazır olsun
    _animationController.forward();

    // Hafta sonu kontrolü - test amaçlı her zaman çalıştır
    _checkWeekEndAndShowNewPlanDialog();

    _authSubscription = FirebaseAuth.instance.authStateChanges().listen((user) {
      if (user != null) {
        // 🎯 Yeni sistem: Demo veya gerçek plan yükle
        _loadAppropriateData();
        _setupGamificationStream();
        _checkFounderCampaign();
      } else {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _errorMessage = "Planınızı görmek için giriş yapmalısınız.";
          });
        }
      }
    });
  }

  // 🎯 Demo veya gerçek plan yükle
  Future<void> _loadAppropriateData() async {
    try {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });

      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      // Kullanıcının hangi gününde olduğunu kontrol et
      final userDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .get();

      if (userDoc.exists) {
        final userData = userDoc.data() as Map<String, dynamic>;
        final createdAt = userData['createdAt'] as Timestamp?;

        if (createdAt != null) {
          final daysSinceCreation =
              DateTime.now().difference(createdAt.toDate()).inDays + 1;
          _currentDay = daysSinceCreation.clamp(1, 10);
          _isFreeTrialMode = _currentDay <= 3;
        }
      }

      if (_isFreeTrialMode) {
        _loadFreeTrialPlan();
      } else {
        _showPremiumRequired();
      }
    } catch (e) {
      debugPrint('❌ _loadAppropriateData hatası: $e');
      // Hata durumunda free trial kullan
      _loadFreeTrialPlan();
    }
  }

  // 🎯 İlk 3 gün için ücretsiz AI plan
  void _loadFreeTrialPlan() {
    // Normal plan yükleme işlemini yap ama ücretsiz
    _loadPlan();
  }

  // 🎯 Premium abonelik gerekli ekranı
  void _showPremiumRequired() {
    setState(() {
      _isLoading = false;
      _isDataLoaded = false;
      _errorMessage = "🎯 3 günlük ücretsiz deneme süreniz doldu!\n\n"
          "AI destekli özel planlarınıza devam etmek için Premium abonelik gereklidir.\n\n"
          "✨ Premium'a geçin ve öğrenme yolculuğunuza devam edin!";
    });
  }

  Future<void> _checkFounderCampaign() async {
    try {
      final subscriptionService = SubscriptionService();
      final data = await subscriptionService.getFounderMemberCount();
      if (data != null && data['isCampaignActive'] == true && mounted) {
        final remainingSlots = data['remainingSlots'] ?? 0;
        if (remainingSlots > 0 && remainingSlots <= 50) {
          _showFounderCampaignNotification(remainingSlots);
        }
      }
    } catch (e) {
      print('Kurucu üye kampanyası kontrol hatası: $e');
    }
  }

  void _showFounderCampaignNotification(int remainingSlots) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.star, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Sadece $remainingSlots kurucu üye slotu kaldı! Özel fırsatı kaçırma!',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.orange,
        duration: const Duration(seconds: 5),
        action: SnackBarAction(
          label: 'İNCELE',
          textColor: Colors.white,
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (context) => const SubscriptionScreen()),
            );
          },
        ),
      ),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    _authSubscription?.cancel();
    _gamificationSubscription?.cancel();
    _stopQueueCheckTimer(); // 🚀 Queue timer'ını temizle
    super.dispose();
  }

  /// Real-time gamification data stream kurulumu
  void _setupGamificationStream() {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    final docRef =
        FirebaseFirestore.instance.doc('users/${user.uid}/gamification/data');

    _gamificationSubscription = docRef.snapshots().listen(
      (snapshot) {
        if (snapshot.exists && mounted) {
          try {
            final data = snapshot.data() as Map<String, dynamic>;
            final gamification = Gamification.fromJson({
              'userId': user.uid,
              ...data,
            });

            setState(() {
              _gamificationData = gamification;
              _currentStreak = gamification.streak;
            });
          } catch (e) {
            print('Gamification data parse hatası: $e');
          }
        }
      },
      onError: (error) {
        print('Gamification stream hatası: $error');
      },
    );
  }

  void _openFocusMode(Map<String, dynamic> task) {
    final subject = task['ders'] ?? 'Ders';
    final topic = task['konu'] ?? 'Konu';
    final duration = task['sure'] ?? 25; // Default 25 minutes
    final taskId = task['id'];

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => FocusModeScreen(
          taskSubject: subject,
          taskTopic: topic,
          taskDurationMinutes: duration,
          taskId: taskId,
        ),
      ),
    );
  }

  /// Premium özelliklere erişim kontrolü
  bool _canAccessPremiumFeatures(BuildContext context) {
    final subscriptionProvider =
        Provider.of<SubscriptionProvider>(context, listen: false);
    return subscriptionProvider.canAccessPremiumFeatures;
  }

  /// 🚀 ASENKRON QUEUE SİSTEMİ - Plan oluşturma durumunu kontrol eder
  Future<void> _checkPlanGenerationStatus() async {
    try {
      final token = await FirebaseAuth.instance.currentUser?.getIdToken();
      if (token == null) {
        print('❌ Token bulunamadı');
        return;
      }

      final response = await http.get(
        Uri.parse('http://89.116.38.173:3000/api/v1/planning/queue-status'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        if (data['success'] == true) {
          setState(() {
            _queueStatus = data['status'];
            _queuePosition = data['queuePosition'];
            _queueMessage = data['message'];
          });

          // Eğer plan tamamlandıysa gerçek planı yükle ve timer'ı durdur
          if (_queueStatus == 'completed') {
            _queueCheckTimer?.cancel();
            _loadPlan(); // Gerçek planı yükle
          }
          // Eğer hâlâ beklemede veya işleniyor ise timer'ı sürdür
          else if (_queueStatus == 'pending' || _queueStatus == 'processing') {
            _startQueueCheckTimer();
          }
          // Eğer hata varsa timer'ı durdur
          else if (_queueStatus == 'failed') {
            _queueCheckTimer?.cancel();
          }
        }
      } else {
        print('❌ Queue status API hatası: ${response.statusCode}');
        // API hatası durumunda normal plan yüklemeyi dene
        _loadPlan();
      }
    } catch (e) {
      print('Queue durumu kontrol hatası: $e');
      // Queue kontrolü başarısız olursa normal plan yüklemeyi dene
      _loadPlan();
    }
  }

  /// Queue durumunu periyodik olarak kontrol eden timer
  void _startQueueCheckTimer() {
    _queueCheckTimer?.cancel(); // Mevcut timer'ı iptal et
    _queueCheckTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      _checkPlanGenerationStatus();
    });
  }

  /// Queue timer'ını durdur
  void _stopQueueCheckTimer() {
    _queueCheckTimer?.cancel();
    _queueCheckTimer = null;
  }

  /// Bulanık gün widget'ı
  Widget _buildBlurredDayCard(Map<String, dynamic> dayData, int dayNumber) {
    return GestureDetector(
      onTap: () {
        // Premium erişim yoksa subscription ekranını göster
        if (!_canAccessPremiumFeatures(context)) {
          _showSubscriptionDialog();
        }
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            colors: [
              Colors.grey.shade200,
              Colors.grey.shade100,
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.3),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Gün $dayNumber',
                        style: GoogleFonts.figtree(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey.shade600,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.orange.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.lock,
                              size: 16,
                              color: Colors.orange.shade700,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Premium',
                              style: GoogleFonts.figtree(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Colors.orange.shade700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Bu günün planına erişmek için premium abonelik gereklidir',
                    style: GoogleFonts.figtree(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.orange.shade400,
                          Colors.orange.shade600,
                        ],
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        'Premium\'a Geç',
                        style: GoogleFonts.figtree(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// Subscription dialog'unu göster
  void _showSubscriptionDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const SubscriptionScreen(),
    );
  }

  Future<void> _loadPlan() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _isDataLoaded = false;
      _errorMessage = null;
      _queueStatus = null; // Queue durumunu sıfırla
    });

    try {
      final planDocument = await _planService.getUserPlan();

      if (planDocument == null) {
        // Plan yoksa queue durumunu kontrol et
        print('📋 Plan bulunamadı, queue durumu kontrol ediliyor...');
        await _checkPlanGenerationStatus();

        if (mounted) {
          setState(() {
            _isLoading = false;
            _isDataLoaded = true;
            _planData.clear();
          });
        }
        return;
      }

      // Yeni plan formatını işle (weeks -> tasks dönüşümü)
      final List<Map<String, dynamic>> planData = [];
      final planByDay = <int, List<Map<String, dynamic>>>{};

      if (planDocument['weeks'] != null) {
        print(
            'Plan weeks formatında bulundu, tasks formatına dönüştürülüyor...');
        final List<dynamic> weeks = planDocument['weeks'];

        int dayCounter = 1;
        for (var week in weeks) {
          if (week['days'] != null) {
            final List<dynamic> days = week['days'];
            for (var day in days) {
              if (day['dailyTasks'] != null && day['dailyTasks'] is List) {
                final List<dynamic> dailyTasks = day['dailyTasks'];

                // Her task'ı planData'ya ekle
                for (var task in dailyTasks) {
                  final taskMap = Map<String, dynamic>.from(task as Map);
                  taskMap['day'] = dayCounter;
                  taskMap['dayName'] = day['day'];
                  taskMap['date'] = day['date'];
                  taskMap['isRestDay'] = day['isRestDay'] ?? false;
                  taskMap['completed'] = taskMap['isCompleted'] ?? false;

                  // Yeni format -> eski format field mapping
                  taskMap['ders'] = taskMap['subject'] ?? 'Bilinmeyen Ders';
                  taskMap['konu'] = taskMap['topic'] ?? 'Bilinmeyen Konu';
                  taskMap['unite'] = taskMap['unit'] ?? '';
                  taskMap['sure'] = taskMap['durationInMinutes'] ?? 30;
                  // Task ID formatını week_index ile oluştur
                  final weekIndex = weeks.indexOf(week);
                  taskMap['id'] = taskMap['id'] ??
                      '${weekIndex}_${taskMap['subject']}_${taskMap['topic']}'
                          .replaceAll(' ', '_');

                  planData.add(taskMap);

                  // Günlere göre grupla
                  if (!planByDay.containsKey(dayCounter)) {
                    planByDay[dayCounter] = [];
                  }
                  planByDay[dayCounter]!.add(taskMap);
                }
              }
              dayCounter++;
            }
          }
        }
        print('Plan dönüştürüldü: ${planData.length} görev bulundu');
      } else {
        print('Plan weeks formatında değil, eski format kontrol ediliyor...');
        // Eski format için fallback
        final List<dynamic> tasksRaw = planDocument['tasks'] ?? [];
        planData.addAll(tasksRaw
            .map((task) => Map<String, dynamic>.from(task as Map))
            .toList());

        // Günlere göre grupla
        for (var task in planData) {
          final day = task['day'] as int;
          if (!planByDay.containsKey(day)) {
            planByDay[day] = [];
          }
          planByDay[day]!.add(task);
        }
      }

      // Tamamlanan görev sayısını hesapla
      int completedCount = 0;
      for (var task in planData) {
        if (task['completed'] == true || task['isCompleted'] == true) {
          completedCount++;
        }
      }

      // Basit streak hesaplama (gerçek hesaplama için daha karmaşık mantık gerekir)
      int streak = 0;
      for (int i = 1; i <= 7; i++) {
        final dayTasks = planByDay[i] ?? [];
        final completedInDay =
            dayTasks.where((t) => t['completed'] == true).length;
        if (completedInDay > 0) {
          streak++;
        } else {
          break;
        }
      }

      if (!mounted) return;

      setState(() {
        _planData.clear();
        _planData.addAll(planData);
        _planByDay = planByDay;
        _totalTasks = planData.length;
        _completedTasks = completedCount;
        _currentStreak = streak;
        _weeklyProgress = ((completedCount / planData.length) * 100).round();
        _isLoading = false;
        _isDataLoaded = true;
      });

      // Veri yüklendikten sonra UI güncellemesi için küçük gecikme
      await Future.delayed(const Duration(milliseconds: 200));
    } catch (e) {
      print('Plan yüklenirken hata: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isDataLoaded = true;
          _errorMessage = e.toString();
        });
      }
    }
  }

  Future<void> _createPlan() async {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const PlanGenerationScreen(
          planType: 'regular',
          isHolidayPlan: false,
        ),
      ),
    );
  }

  Future<void> _toggleTaskCompletion(String taskId, bool currentStatus) async {
    try {
      final newStatus = !currentStatus;

      // Önce haptic feedback ver
      HapticFeedback.lightImpact();

      // Yerel state'i güncelle
      setState(() {
        final taskIndex = _planData.indexWhere((task) => task['id'] == taskId);
        if (taskIndex != -1) {
          _planData[taskIndex]['completed'] = newStatus;

          // İstatistikleri güncelle
          if (newStatus) {
            _completedTasks++;
          } else {
            _completedTasks--;
          }
        }
      });

      // Backend'e kaydet
      await _planService.markTaskAsCompleted(taskId, newStatus.toString());

      // Eğer görev tamamlandıysa gamification sistemini güncelle
      if (newStatus) {
        try {
          // XP ekle (30 dakikalık görev = 50 XP)
          final task = _planData.firstWhere((t) => t['id'] == taskId);
          final subject = task['ders'];
          await _gamificationService.addXP(50, subject: subject);

          // Streak'i güncelle
          await _gamificationService.updateStreak();

          // Başarım ilerlemesini güncelle
          await _gamificationService.updateAchievementProgress(
            'daily_tasks_completed',
            1,
          );

          // Başarı haptic feedback'i
          HapticFeedback.mediumImpact();
        } catch (gamificationError) {
          print('Gamification güncellemesi hatası: $gamificationError');
          // Gamification hatası ana işlemi etkilemez
        }
      }

      // Başarı feedback'i göster
      if (mounted && context.mounted) {
        try {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(
                    newStatus ? Icons.check_circle : Icons.undo,
                    color: Colors.white,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      newStatus
                          ? 'Harika! Görev tamamlandı! 🎉'
                          : 'Görev işaretlemesi kaldırıldı',
                      style: GoogleFonts.figtree(
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  if (newStatus)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '+50 XP',
                        style: GoogleFonts.figtree(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                ],
              ),
              duration: const Duration(seconds: 3),
              backgroundColor: newStatus ? Colors.green : Colors.orange,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              margin: const EdgeInsets.all(16),
            ),
          );
        } catch (snackbarError) {
          print('SnackBar gösterme hatası: $snackbarError');
        }
      }
    } catch (e) {
      print('Görev güncelleme hatası: $e');

      // Hata durumunda UI'ı geri al
      setState(() {
        final taskIndex = _planData.indexWhere((task) => task['id'] == taskId);
        if (taskIndex != -1) {
          _planData[taskIndex]['completed'] = currentStatus;
          if (currentStatus) {
            _completedTasks++;
          } else {
            _completedTasks--;
          }
        }
      });

      // Hata haptic feedback'i
      HapticFeedback.heavyImpact();

      if (mounted && context.mounted) {
        try {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(
                    Icons.error_outline,
                    color: Colors.white,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Görev güncellenemedi: ${e.toString()}',
                      style: GoogleFonts.figtree(
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              backgroundColor: Colors.red,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              margin: const EdgeInsets.all(16),
            ),
          );
        } catch (snackbarError) {
          print('Hata SnackBar gösterme hatası: $snackbarError');
        }
      }
    }
  }

  // Onboarding data'sını kontrol et
  Future<bool> _checkOnboardingData() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return false;

    try {
      // Cloud Functions'ın kaydettiği path'den oku: users/{userId}/privateProfile/profile
      final doc = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('privateProfile')
          .doc('profile')
          .get();

      if (!doc.exists) {
        print('Firebase\'de kullanıcı profil dokümanı bulunamadı');
        return false;
      }

      final data = doc.data() as Map<String, dynamic>;
      print('Firebase\'den okunan tüm veriler: $data');
      print('Firebase\'deki alan adları: ${data.keys.toList()}');

      // Zorunlu alanları kontrol et
      final requiredFields = [
        'fullName',
        'grade',
        'targetUniversity',
        'learningStyle',
        'preferredStudyTimes',
        'dailyHours'
      ];

      for (String field in requiredFields) {
        final value = data[field];
        print(
            'Kontrol edilen alan: $field, değer: $value, tip: ${value.runtimeType}');

        if (!data.containsKey(field) ||
            data[field] == null ||
            (data[field] is String && (data[field] as String).isEmpty) ||
            (data[field] is List && (data[field] as List).isEmpty) ||
            (data[field] is num && (data[field] as num) <= 0)) {
          print('Eksik alan: $field');
          return false;
        }
      }

      print('Tüm gerekli alanlar mevcut, onboarding data kontrolü başarılı');
      return true;
    } catch (e) {
      print('Onboarding data kontrolü hatası: $e');
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Consumer<SubscriptionProvider>(
      builder: (context, subscriptionProvider, child) {
        if (_isLoading) {
          return Scaffold(
            backgroundColor:
                isDark ? const Color(0xFF1A1F29) : const Color(0xFFFAFAFA),
            body: _buildModernShimmerLoading(isDark),
          );
        }

        if (_errorMessage != null) {
          return Scaffold(
            backgroundColor:
                isDark ? const Color(0xFF1A1F29) : const Color(0xFFFAFAFA),
            body: _buildModernErrorState(isDark),
          );
        }

        if (_planData.isEmpty) {
          return Scaffold(
            backgroundColor:
                isDark ? const Color(0xFF1A1F29) : const Color(0xFFFAFAFA),
            body: _buildModernEmptyState(isDark),
          );
        }

        // Modern Scaffold with gradient background
        return Scaffold(
          backgroundColor:
              isDark ? const Color(0xFF1A1F29) : const Color(0xFFFAFAFA),
          extendBodyBehindAppBar: true,
          body: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: isDark
                    ? [
                        const Color(
                            0xFF1A1F29), // AI araçları tarzı koyu mavi-gri
                        const Color(0xFF0F1419), // Çok koyu lacivert
                        const Color(0xFF0B0E11), // En koyu ton
                      ]
                    : [
                        const Color(0xFFFFFBE6),
                        const Color(0xFFFAF8F0),
                        const Color(0xFFF5F5F5),
                      ],
                stops: const [0.0, 0.5, 1.0],
              ),
            ),
            child: _buildModernDashboardBody(isDark),
          ),
          floatingActionButton: _buildCompactFloatingActionButton(isDark),
          floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
        );
      },
    );
  }

  Widget _buildModernShimmerLoading(bool isDark) {
    return SafeArea(
      child: Column(
        children: [
          // Modern App Bar Shimmer
          Container(
            height: 200,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isDark
                    ? [const Color(0xFF1A1F29), const Color(0xFF0F1419)]
                    : [const Color(0xFFF57C00), const Color(0xFFFFAB40)],
              ),
            ),
            child: Shimmer.fromColors(
              baseColor: isDark
                  ? const Color(0xFF2C3E50)
                  : Colors.white.withOpacity(0.3),
              highlightColor: isDark
                  ? const Color(0xFF34495E)
                  : Colors.white.withOpacity(0.6),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Container(
                      height: 16,
                      width: 120,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      height: 24,
                      width: 200,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          // Content Shimmer
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: 6,
              itemBuilder: (context, index) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  child: Shimmer.fromColors(
                    baseColor: isDark
                        ? const Color(0xFF1A1F29)
                        : const Color(0xFFE8EAF6),
                    highlightColor: isDark
                        ? const Color(0xFF2C3E50)
                        : const Color(0xFFF3F4F6),
                    child: Container(
                      height: index == 0 ? 200 : (index == 1 ? 120 : 80),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModernErrorState(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.red.withOpacity(0.1),
                    Colors.red.withOpacity(0.05),
                  ],
                ),
                borderRadius: BorderRadius.circular(30),
                border: Border.all(
                  color: Colors.red.withOpacity(0.2),
                  width: 2,
                ),
              ),
              child: Icon(
                Icons.error_outline,
                size: 64,
                color: Colors.red[400],
              ),
            ),
            const SizedBox(height: 32),
            Text(
              'Bir Sorun Oluştu',
              style: GoogleFonts.figtree(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _errorMessage ?? 'Beklenmeyen bir hata oluştu',
              textAlign: TextAlign.center,
              style: GoogleFonts.figtree(
                fontSize: 16,
                color: isDark
                    ? const Color(0xFF9FA8DA)
                    : const Color(
                        0xFF5D6D7E), // AI araçları tarzı açık mavi-gri
                height: 1.5,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: _loadPlan,
              icon: const Icon(Icons.refresh),
              label: const Text('Tekrar Dene'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF57C00),
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 8,
                shadowColor: const Color(0xFFF57C00).withOpacity(0.3),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModernEmptyState(bool isDark) {
    // 🚀 ASENKRON QUEUE SİSTEMİ - Duruma göre farklı UI göster
    if (_queueStatus != null) {
      return _buildQueueStatusView(isDark);
    }

    // Varsayılan plan oluşturma UI'sı
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFFF57C00).withOpacity(0.15),
                    const Color(0xFFFFAB40).withOpacity(0.1),
                  ],
                ),
                borderRadius: BorderRadius.circular(30),
                border: Border.all(
                  color: const Color(0xFFF57C00).withOpacity(0.3),
                  width: 2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFF57C00).withOpacity(0.2),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: const Icon(
                Icons.school_outlined,
                size: 64,
                color: Color(0xFFF57C00),
              ),
            ),
            const SizedBox(height: 32),
            Text(
              'Henüz Planın Yok',
              style: GoogleFonts.figtree(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Sana özel bir çalışma planı oluşturmak için\nonboarding sürecini tamamlaman gerekiyor.',
              textAlign: TextAlign.center,
              style: GoogleFonts.figtree(
                fontSize: 16,
                color:
                    isDark ? const Color(0xFF9FA8DA) : const Color(0xFF5D6D7E),
                height: 1.5,
              ),
            ),
            const SizedBox(height: 40),
            ElevatedButton.icon(
              onPressed: _createPlan,
              icon: const Icon(Icons.add),
              label: const Text('Plan Oluştur'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF57C00),
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 8,
                shadowColor: const Color(0xFFF57C00).withOpacity(0.3),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 🚀 ASENKRON QUEUE SİSTEMİ - Queue durumunu gösteren UI
  Widget _buildQueueStatusView(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Durum ikonu ve animasyon
            _buildQueueStatusIcon(),

            const SizedBox(height: 32),

            // Durum başlığı
            Text(
              _getQueueStatusTitle(),
              style: GoogleFonts.figtree(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black87,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 16),

            // Durum mesajı
            if (_queueMessage != null)
              Text(
                _queueMessage!,
                textAlign: TextAlign.center,
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  color: isDark
                      ? const Color(0xFF9FA8DA)
                      : const Color(0xFF5D6D7E),
                  height: 1.5,
                ),
              ),

            // Sıra pozisyonu (pending durumunda)
            if (_queueStatus == 'pending' && _queuePosition != null) ...[
              const SizedBox(height: 24),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF57C00).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: const Color(0xFFF57C00).withOpacity(0.3),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.queue,
                      color: Color(0xFFF57C00),
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Sıradaki Pozisyon: ${_queuePosition}',
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFFF57C00),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // İlerleme çubuğu
            if (_queueStatus == 'pending' || _queueStatus == 'processing') ...[
              const SizedBox(height: 40),
              Container(
                width: double.infinity,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark
                      ? const Color(0xFF2C3E50)
                      : const Color(0xFFE8EAF6),
                  borderRadius: BorderRadius.circular(2),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: LinearProgressIndicator(
                    backgroundColor: Colors.transparent,
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      Color(0xFFF57C00),
                    ),
                  ),
                ),
              ),
            ],

            // Hata durumunda yeniden deneme butonu
            if (_queueStatus == 'failed') ...[
              const SizedBox(height: 40),
              ElevatedButton.icon(
                onPressed: _createPlan,
                icon: const Icon(Icons.refresh),
                label: const Text('Tekrar Dene'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF57C00),
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// Queue durumuna göre icon widget'ı
  Widget _buildQueueStatusIcon() {
    switch (_queueStatus) {
      case 'pending':
        return Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.blue.withOpacity(0.15),
                Colors.blue.withOpacity(0.1),
              ],
            ),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(
              color: Colors.blue.withOpacity(0.3),
              width: 2,
            ),
          ),
          child: const Icon(
            Icons.hourglass_empty,
            size: 64,
            color: Colors.blue,
          ),
        )
            .animate(onPlay: (controller) => controller.repeat())
            .shimmer(duration: 2000.ms);

      case 'processing':
        return Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                const Color(0xFFF57C00).withOpacity(0.15),
                const Color(0xFFF57C00).withOpacity(0.1),
              ],
            ),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(
              color: const Color(0xFFF57C00).withOpacity(0.3),
              width: 2,
            ),
          ),
          child: const Icon(
            Icons.auto_awesome,
            size: 64,
            color: Color(0xFFF57C00),
          ),
        )
            .animate(onPlay: (controller) => controller.repeat())
            .rotate(duration: 3000.ms);

      case 'failed':
        return Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.red.withOpacity(0.15),
                Colors.red.withOpacity(0.1),
              ],
            ),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(
              color: Colors.red.withOpacity(0.3),
              width: 2,
            ),
          ),
          child: const Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.red,
          ),
        );

      default:
        return Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                const Color(0xFFF57C00).withOpacity(0.15),
                const Color(0xFFFFAB40).withOpacity(0.1),
              ],
            ),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(
              color: const Color(0xFFF57C00).withOpacity(0.3),
              width: 2,
            ),
          ),
          child: const Icon(
            Icons.school_outlined,
            size: 64,
            color: Color(0xFFF57C00),
          ),
        );
    }
  }

  /// Queue durumuna göre başlık
  String _getQueueStatusTitle() {
    switch (_queueStatus) {
      case 'pending':
        return 'Planın Sıraya Alındı';
      case 'processing':
        return 'Planın Hazırlanıyor';
      case 'failed':
        return 'Plan Hazırlanamadı';
      default:
        return 'Planın Hazırlanıyor';
    }
  }

  Widget _buildModernDashboardBody(bool isDark) {
    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        // Modern Header with Profile and Greeting
        _buildModernSliverAppBar(isDark),

        // Weekly Insight Card - Birleşik İstatistik Kartı
        SliverToBoxAdapter(
          child: _buildWeeklyInsightCard(isDark),
        ),

        // Today's Focus Section with Horizontal Scroll
        SliverToBoxAdapter(
          child: _buildInteractiveTodayFocusSection(isDark),
        ),

        // Smart Quick Actions with Pop-ups
        SliverToBoxAdapter(
          child: _buildSmartQuickActions(isDark),
        ),

        // Performance Overview (Keep existing but refined)
        SliverToBoxAdapter(
          child: _buildRefinedPerformanceOverview(isDark),
        ),

        // Bottom padding for navbar with extra space
        const SliverToBoxAdapter(
          child: SizedBox(height: 140),
        ),
      ],
    );
  }

  Widget _buildOldSliverAppBar(bool isDark) {
    final user = FirebaseAuth.instance.currentUser;
    final userName =
        user?.displayName ?? user?.email?.split('@')[0] ?? 'Öğrenci';

    return SliverAppBar(
      expandedHeight: 180,
      floating: true,
      pinned: true,
      elevation: 0,
      backgroundColor: Colors.transparent,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                const Color(0xFFF57C00), // App's primary color
                const Color(0xFFE65100), // App's primary dark
                const Color(0xFFFFAB40), // App's accent color
              ],
              stops: const [0.0, 0.6, 1.0],
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFF57C00).withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _getGreeting(),
                              style: GoogleFonts.figtree(
                                color: Colors.white.withOpacity(0.9),
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 0.5,
                              ),
                            )
                                .animate()
                                .fadeIn(delay: 200.ms, duration: 800.ms)
                                .slideX(begin: -0.2, end: 0),
                            Text(
                              userName.toUpperCase(),
                              style: GoogleFonts.figtree(
                                color: Colors.white,
                                fontSize: 28,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.2,
                                shadows: [
                                  Shadow(
                                    color: Colors.black.withOpacity(0.3),
                                    offset: const Offset(0, 2),
                                    blurRadius: 4,
                                  ),
                                ],
                              ),
                            )
                                .animate()
                                .fadeIn(delay: 400.ms, duration: 800.ms)
                                .slideX(begin: -0.3, end: 0),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: Colors.white.withOpacity(0.3),
                                  width: 1,
                                ),
                              ),
                              child: Text(
                                _isFreeTrialMode
                                    ? '🎁 Ücretsiz Deneme - ${4 - _currentDay} gün kaldı!'
                                    : '🚀 Bugün muhteşem başarılara uçacaksın!',
                                style: GoogleFonts.figtree(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            )
                                .animate()
                                .fadeIn(delay: 600.ms, duration: 800.ms)
                                .slideY(begin: 0.3, end: 0),
                          ],
                        ),
                      ),
                      // Profil Avatarı - Ultra Modern
                      GestureDetector(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          Navigator.pushNamed(context, '/advanced_profile');
                        },
                        child: Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                Colors.white.withOpacity(0.3),
                                Colors.white.withOpacity(0.1),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(30),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.4),
                              width: 2,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.2),
                                blurRadius: 15,
                                offset: const Offset(0, 5),
                              ),
                            ],
                          ),
                          child: user?.photoURL != null
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(28),
                                  child: Image.network(
                                    user!.photoURL!,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) {
                                      return _buildUserInitials(userName);
                                    },
                                  ),
                                )
                              : _buildUserInitials(userName),
                        )
                            .animate()
                            .fadeIn(delay: 800.ms, duration: 800.ms)
                            .scale(
                                begin: const Offset(0.5, 0.5),
                                end: const Offset(1.0, 1.0))
                            .shimmer(delay: 1000.ms, duration: 2000.ms),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.calendar_today_outlined, color: Colors.white),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (context) => const CalendarViewScreen()),
            );
          },
        ),
        IconButton(
          icon: const Icon(Icons.refresh, color: Colors.white),
          onPressed: _loadPlan,
        ),
      ],
    );
  }

  Widget _buildUserInitials(String userName) {
    return Center(
      child: Text(
        userName.isNotEmpty ? userName[0].toUpperCase() : 'Ö',
        style: GoogleFonts.figtree(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildWelcomeCard() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.blueAccent.withOpacity(0.1),
            Colors.blueAccent.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.blueAccent.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blueAccent.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(
                    Icons.wb_sunny_outlined,
                    color: Colors.blueAccent,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _getMotivationalMessage(),
                        style: GoogleFonts.figtree(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context).textTheme.bodyLarge?.color,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _getDateString(),
                        style: GoogleFonts.figtree(
                          fontSize: 14,
                          color: Theme.of(context).textTheme.bodyMedium?.color,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressSummaryCard() {
    final completionPercentage =
        _totalTasks > 0 ? (_completedTasks / _totalTasks) : 0.0;

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Genel İlerleme',
                  style: GoogleFonts.figtree(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).textTheme.bodyLarge?.color,
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${(completionPercentage * 100).round()}%',
                    style: GoogleFonts.figtree(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).primaryColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                // Circular progress indicator
                SizedBox(
                  height: 80,
                  width: 80,
                  child: CircularPercentIndicator(
                    radius: 40.0,
                    lineWidth: 8.0,
                    animation: true,
                    percent: completionPercentage,
                    center: Text(
                      '${(completionPercentage * 100).round()}%',
                      style: GoogleFonts.figtree(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    circularStrokeCap: CircularStrokeCap.round,
                    progressColor: Theme.of(context).primaryColor,
                    backgroundColor: Theme.of(context).dividerColor,
                  ),
                ),
                const SizedBox(width: 24),
                Expanded(
                  child: Column(
                    children: [
                      _buildProgressStat(
                        'Tamamlanan Görevler',
                        _completedTasks.toString(),
                        Icons.check_circle,
                        Colors.green,
                      ),
                      const SizedBox(height: 12),
                      _buildProgressStat(
                        'Toplam Görevler',
                        _totalTasks.toString(),
                        Icons.assignment,
                        Colors.blue,
                      ),
                      const SizedBox(height: 12),
                      _buildProgressStat(
                        'Güncel Seri',
                        '$_currentStreak gün',
                        Icons.local_fire_department,
                        Colors.orange,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressStat(
      String label, String value, IconData icon, Color color) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).textTheme.bodyLarge?.color,
                ),
              ),
              Text(
                label,
                style: GoogleFonts.figtree(
                  fontSize: 12,
                  color: Theme.of(context).textTheme.bodyMedium?.color,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildQuickAccessGrid() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Hızlı Erişim',
          style: GoogleFonts.figtree(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Theme.of(context).textTheme.bodyLarge?.color,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            // Buton 1: Soru Çözdür (SOS)
            Expanded(
              child: _buildQuickAccessButton(
                'Soru Çözdür\n(SOS)',
                'Fotoğraf çek',
                Icons.camera_alt,
                Colors.red,
                () {
                  // SOS özelliğine yönlendir
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('SOS özelliği yakında aktif olacak! 📸'),
                      backgroundColor: Colors.red,
                    ),
                  );
                },
              ),
            ),
            const SizedBox(width: 12),

            // Buton 2: Planımı Gör/Düzenle
            Expanded(
              child: _buildQuickAccessButton(
                'Planımı Gör',
                'Düzenle',
                Icons.calendar_today,
                Colors.blue,
                () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) => const CalendarViewScreen()),
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Buton 3: Gelişim Merkezi
            Expanded(
              child: _buildQuickAccessButton(
                '🏆 Gelişim\nMerkezi',
                'Performans & Başarımlar',
                Icons.trending_up,
                Colors.green,
                () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) => const GrowthHubScreen()),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickAccessButton(
    String title,
    String subtitle,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return Container(
      height: 140,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            HapticFeedback.mediumImpact();
            onTap();
          },
          borderRadius: BorderRadius.circular(20),
          child: Container(
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: color.withOpacity(0.3),
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: color.withOpacity(0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // İkon Konteyneri
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(
                      icon,
                      size: 28,
                      color: color,
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Başlık
                  Text(
                    title,
                    style: GoogleFonts.figtree(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).textTheme.bodyLarge?.color,
                      height: 1.2,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),

                  const SizedBox(height: 4),

                  // Alt başlık
                  Text(
                    subtitle,
                    style: GoogleFonts.figtree(
                      fontSize: 10,
                      color: color,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTodayTasksCard() {
    // Bugünün görevlerini al
    final currentDay = _getCurrentPlanDay();
    final todayTasks = _planByDay[currentDay] ?? [];
    final limitedTasks = todayTasks.take(3).toList();

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Bugünün Görevleri',
                  style: GoogleFonts.figtree(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).textTheme.bodyLarge?.color,
                  ),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (context) => const CalendarViewScreen()),
                    );
                  },
                  child: Text(
                    'Tümünü Gör',
                    style: GoogleFonts.figtree(
                      color: Theme.of(context).primaryColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (limitedTasks.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF2C3E50).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.check_circle_outline,
                      size: 48,
                      color: Color(0xFF5D6D7E),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Bugün için görev yok',
                      style: GoogleFonts.figtree(
                        color: const Color(0xFF7B8794),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              )
            else
              ...limitedTasks
                  .map((task) => _buildTaskPreviewItem(task))
                  .toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskPreviewItem(Map<String, dynamic> task) {
    final isCompleted = task['completed'] == true;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isCompleted
            ? Colors.green.withOpacity(0.1)
            : Theme.of(context).primaryColor.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isCompleted
              ? Colors.green.withOpacity(0.3)
              : Theme.of(context).primaryColor.withOpacity(0.2),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color:
                  isCompleted ? Colors.green : Theme.of(context).primaryColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              isCompleted ? Icons.check : Icons.book,
              color: Colors.white,
              size: 16,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  task['konu'] ?? 'Görev',
                  style: GoogleFonts.figtree(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).textTheme.bodyLarge?.color,
                    decoration: isCompleted ? TextDecoration.lineThrough : null,
                  ),
                ),
                Text(
                  '${task['ders']} • ${task['sure']} dk',
                  style: GoogleFonts.figtree(
                    fontSize: 12,
                    color: Theme.of(context).textTheme.bodyMedium?.color,
                  ),
                ),
              ],
            ),
          ),
          if (!isCompleted)
            InkWell(
              onTap: () => _toggleTaskCompletion(task['id'], isCompleted),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF2C3E50).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.check,
                  size: 16,
                  color: Color(0xFF7B8794),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildWeeklyProgressCard() {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Haftalık Başarı',
              style: GoogleFonts.figtree(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.bodyLarge?.color,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(7, (index) {
                final dayNames = [
                  'Pzt',
                  'Sal',
                  'Çar',
                  'Per',
                  'Cum',
                  'Cmt',
                  'Paz'
                ];
                final isCompleted = index < 4; // Örnek data

                return Column(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: isCompleted
                            ? Theme.of(context).primaryColor
                            : const Color(0xFF2C3E50).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Center(
                        child: Icon(
                          isCompleted ? Icons.check : Icons.circle,
                          color: isCompleted
                              ? Colors.white
                              : const Color(0xFF5D6D7E),
                          size: isCompleted ? 20 : 8,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      dayNames[index],
                      style: GoogleFonts.figtree(
                        fontSize: 12,
                        color: Theme.of(context).textTheme.bodyMedium?.color,
                      ),
                    ),
                  ],
                );
              }),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.trending_up,
                    color: Theme.of(context).primaryColor,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Bu hafta harika gidiyorsun! 4/7 gün hedefini tamamladın.',
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        color: Theme.of(context).primaryColor,
                        fontWeight: FontWeight.w500,
                      ),
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

  Widget _buildErrorState() {
    // Premium gerekli mesajı mı?
    bool isPremiumRequired =
        _errorMessage?.contains('3 günlük ücretsiz deneme') ?? false;

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
              isPremiumRequired ? Icons.workspace_premium : Icons.error_outline,
              color: isPremiumRequired ? AppTheme.primaryColor : Colors.red,
              size: 64),
          const SizedBox(height: 24),
          Text(
            isPremiumRequired ? 'Premium Gerekli' : 'Bir hata oluştu',
            style: GoogleFonts.poppins(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: isPremiumRequired ? AppTheme.primaryColor : Colors.red,
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                fontSize: 16,
                height: 1.5,
                color: Colors.grey.shade700,
              ),
            ),
          ),
          const SizedBox(height: 32),
          if (isPremiumRequired) ...[
            ElevatedButton.icon(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                      builder: (context) => const SubscriptionScreen()),
                );
              },
              icon: const Icon(Icons.workspace_premium, color: Colors.white),
              label: Text(
                'Premium\'a Geç',
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                padding:
                    const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () {
                // Deneme süresi kontrolünü yenile
                _loadAppropriateData();
              },
              child: Text(
                'Deneme Süresini Kontrol Et',
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  color: AppTheme.primaryColor,
                ),
              ),
            ),
          ] else ...[
            ElevatedButton(
              onPressed: _loadAppropriateData,
              child: const Text('Tekrar Dene'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.schedule, color: const Color(0xFF5D6D7E), size: 64),
          const SizedBox(height: 16),
          Text(
            'Henüz bir çalışma planınız yok',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              'Size özel bir çalışma planı oluşturmak için aşağıdaki butona tıklayın.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF7B8794),
                  ),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _createPlan,
            icon: const Icon(Icons.auto_awesome),
            label: const Text('Plan Oluştur'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              textStyle: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
              alignment: Alignment.center,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNavigation() {
    return BottomAppBar(
      elevation: 8,
      shape: const CircularNotchedRectangle(),
      notchMargin: 8,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildNavItem(
            icon: Icons.calendar_today,
            label: 'Plan',
            isActive: true,
            onTap: () {},
          ),
          _buildNavItem(
            icon: Icons.emoji_events,
            label: 'Başarılar',
            isActive: false,
            onTap: () => Navigator.pushNamed(context, '/gamification'),
          ),
          const SizedBox(width: 40),
          _buildNavItem(
            icon: Icons.psychology,
            label: 'Destek',
            isActive: false,
            onTap: () => Navigator.pushNamed(context, '/mental_support'),
          ),
          _buildNavItem(
            icon: Icons.auto_awesome,
            label: 'Araçlar',
            isActive: false,
            onTap: () => Navigator.pushNamed(context, '/smart_tools'),
          ),
        ],
      ),
    );
  }

  // Helper metodlar
  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Günaydın,';
    if (hour < 17) return 'İyi günler,';
    return 'İyi akşamlar,';
  }

  String _getMotivationalMessage() {
    final messages = [
      'Bugün harika şeyler başaracaksın!',
      'Her adım seni hedefe yaklaştırıyor.',
      'Bugün de planına sadık kalmanın zamanı.',
      'Başarı, günlük küçük adımların toplamıdır.',
      'Bugün kendini geliştirmek için yeni bir fırsat!',
    ];
    final randomIndex = DateTime.now().day % messages.length;
    return messages[randomIndex];
  }

  String _getDateString() {
    final now = DateTime.now();
    final formatter = DateFormat('d MMMM yyyy, EEEE', 'tr_TR');
    return formatter.format(now);
  }

  String _formatLastStudied(DateTime lastStudied) {
    final now = DateTime.now();
    final difference = now.difference(lastStudied);

    if (difference.inMinutes < 1) {
      return 'Şimdi';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} dk önce';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} sa önce';
    } else if (difference.inDays == 1) {
      return 'Dün';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} gün önce';
    } else {
      return DateFormat('dd/MM/yyyy').format(lastStudied);
    }
  }

  // Bugünün plan gününü hesapla
  int _getCurrentPlanDay() {
    if (_planByDay.isEmpty) return 1;

    final today = DateTime.now();
    final dayOfWeek = today.weekday; // 1 = Pazartesi, 7 = Pazar

    // Eğer plan verilerinde date bilgisi varsa ona göre hesapla
    for (var entry in _planByDay.entries) {
      final tasks = entry.value;
      if (tasks.isNotEmpty) {
        final taskDate = tasks.first['date'];
        if (taskDate != null) {
          try {
            final parsedDate = DateTime.parse(taskDate);
            if (parsedDate.day == today.day &&
                parsedDate.month == today.month &&
                parsedDate.year == today.year) {
              return entry.key;
            }
          } catch (e) {
            // Date parse hatası durumunda devam et
          }
        }
      }
    }

    // Fallback: hafta günü bazlı hesaplama
    // Plan genelde Pazartesi başlar, bu yüzden Pazartesi = 1
    return dayOfWeek;
  }

  Widget _buildDailyPlanTab() {
    if (_planByDay.isEmpty) {
      return const Center(
        child: Text('Plan verisi bulunamadı'),
      );
    }

    // Gün sayısına göre liste oluştur
    final days = _planByDay.keys.toList()..sort();

    return ListView.builder(
      itemCount: days.length,
      padding: const EdgeInsets.only(bottom: 100),
      itemBuilder: (context, index) {
        final day = days[index];
        final tasks = _planByDay[day]!;

        // Premium erişim kontrolü - 8. günden sonrası için
        final subscriptionProvider =
            Provider.of<SubscriptionProvider>(context, listen: false);
        final canAccessPremiumFeatures =
            subscriptionProvider.canAccessPremiumFeatures;

        // 8. günden sonrası için premium kontrolü
        if (day > 7 && !canAccessPremiumFeatures) {
          return _buildBlurredDayCard({'day': day, 'tasks': tasks}, day);
        }

        // O gün için tamamlanan görev sayısını hesapla
        final completedTasksForDay =
            tasks.where((task) => task['completed'] == true).length;

        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: ExpansionTile(
            title: Text(
              'Gün $day',
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.bold,
              ),
            ),
            subtitle: Text(
              '$completedTasksForDay / ${tasks.length} görev tamamlandı',
              style: const TextStyle(fontSize: 12),
            ),
            leading: CircleAvatar(
              backgroundColor: completedTasksForDay == tasks.length
                  ? Colors.green
                  : completedTasksForDay > 0
                      ? Colors.orange
                      : const Color(0xFF5D6D7E),
              child: Text(
                '$day',
                style: const TextStyle(color: Colors.white),
              ),
            ),
            children: tasks.map((task) => _buildTaskItem(task)).toList(),
          ),
        ).animate().fadeIn(delay: (50 * index).ms).slideX();
      },
    );
  }

  Widget _buildTaskItem(Map<String, dynamic> task) {
    final isCompleted = task['completed'] == true;

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      title: Text(
        task['konu'] ?? 'Başlıksız görev',
        style: TextStyle(
          decoration: isCompleted ? TextDecoration.lineThrough : null,
          color: isCompleted ? const Color(0xFF5D6D7E) : null,
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${task['ders']} - ${task['unite']}'),
          Text('${task['sure']} dakika'),
        ],
      ),
      trailing: Checkbox(
        value: isCompleted,
        onChanged: (value) {
          _toggleTaskCompletion(task['id'], isCompleted);
        },
      ),
      onTap: () {
        _toggleTaskCompletion(task['id'], isCompleted);
      },
    );
  }

  Widget _buildSubjectsTab() {
    // Dersleri grupla
    final subjectGroups = <String, List<Map<String, dynamic>>>{};

    for (var task in _planData) {
      final subject = task['ders'] as String;

      if (!subjectGroups.containsKey(subject)) {
        subjectGroups[subject] = [];
      }

      subjectGroups[subject]!.add(task);
    }

    final subjects = subjectGroups.keys.toList();

    return ListView.builder(
      itemCount: subjects.length,
      padding: const EdgeInsets.only(bottom: 100),
      itemBuilder: (context, index) {
        final subject = subjects[index];
        final tasks = subjectGroups[subject]!;

        // Ders için tamamlanan görev sayısını hesapla
        final completedTasksForSubject =
            tasks.where((task) => task['completed'] == true).length;

        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: ExpansionTile(
            title: Text(
              subject,
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.bold,
              ),
            ),
            subtitle: Text(
              '$completedTasksForSubject / ${tasks.length} görev tamamlandı',
              style: const TextStyle(fontSize: 12),
            ),
            leading: CircleAvatar(
              backgroundColor: _getSubjectColor(subject),
              child: Text(
                subject.substring(0, 1),
                style: const TextStyle(color: Colors.white),
              ),
            ),
            children: [
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: tasks.length,
                itemBuilder: (context, taskIndex) {
                  return _buildTaskItem(tasks[taskIndex]);
                },
              ),
            ],
          ),
        ).animate().fadeIn(delay: (50 * index).ms).slideX();
      },
    );
  }

  Color _getSubjectColor(String subject) {
    // Her ders için farklı bir renk ata
    final colors = [
      Colors.blue,
      Colors.red,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.teal,
      Colors.pink,
      Colors.indigo,
      Colors.amber,
    ];

    // Basit bir hash fonksiyonu kullanarak string'den renk indeksi oluştur
    int hashCode = 0;
    for (var i = 0; i < subject.length; i++) {
      hashCode += subject.codeUnitAt(i);
    }

    return colors[hashCode % colors.length];
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 20,
              color: isActive
                  ? Theme.of(context).primaryColor
                  : const Color(0xFF5D6D7E),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: GoogleFonts.figtree(
                fontSize: 10,
                color: isActive
                    ? Theme.of(context).primaryColor
                    : const Color(0xFF5D6D7E),
                fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Modern performans özeti widget'ı - tamamen yeniden tasarlandı
  Widget _buildPerformanceOverview() {
    return Consumer<StudyDataProvider>(
      builder: (context, studyProvider, child) {
        return Container(
          margin: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Theme.of(context).colorScheme.primary.withOpacity(0.1),
                Theme.of(context).colorScheme.secondary.withOpacity(0.05),
              ],
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: Theme.of(context).colorScheme.outline.withOpacity(0.1),
              width: 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Section
              _buildPerformanceHeader(studyProvider),

              // Stats Grid
              _buildStatsGrid(studyProvider),

              // Quick Insights
              _buildQuickInsights(studyProvider),

              // Action Buttons
              _buildActionButtons(),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPerformanceHeader(StudyDataProvider studyProvider) {
    final currentLevel = studyProvider.currentLevel;
    final totalXP = studyProvider.totalXP;
    final weeklyMinutes = studyProvider.weeklyStudyMinutes;

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          // Level Badge
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Theme.of(context).colorScheme.primary,
                  Theme.of(context).colorScheme.secondary,
                ],
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Center(
              child: Text(
                'L$currentLevel',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          // Title & Stats
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Performans Özeti',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Bu hafta ${weeklyMinutes ~/ 60}s ${weeklyMinutes % 60}dk çalıştın',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withOpacity(0.7),
                      ),
                ),
                const SizedBox(height: 8),
                // XP Progress Bar
                Container(
                  height: 6,
                  decoration: BoxDecoration(
                    color:
                        Theme.of(context).colorScheme.outline.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(3),
                  ),
                  child: FractionallySizedBox(
                    alignment: Alignment.centerLeft,
                    widthFactor: _calculateXPProgress(totalXP, currentLevel),
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            Theme.of(context).colorScheme.primary,
                            Theme.of(context).colorScheme.secondary,
                          ],
                        ),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsGrid(StudyDataProvider studyProvider) {
    final analytics = studyProvider.performanceAnalytics;
    final totalSessions = analytics?['totalSessions'] ?? 0;
    final avgDuration = analytics?['averageSessionDuration'] ?? 25;
    final focusMinutes = studyProvider.totalFocusMinutes;
    final manualMinutes = studyProvider.totalManualMinutes;
    final studyPreference = studyProvider.studyPreference;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          // İlk satır
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  icon: Icons.analytics_outlined,
                  title: 'Toplam Seans',
                  value: '$totalSessions',
                  subtitle: 'Bu aya kadar',
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  icon: Icons.timer_outlined,
                  title: 'Ortalama Süre',
                  value: '${avgDuration}dk',
                  subtitle: 'Seans başına',
                  color: Theme.of(context).colorScheme.secondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // İkinci satır
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  icon: Icons.psychology_outlined,
                  title: 'Odak Modu',
                  value:
                      '${(focusMinutes + manualMinutes > 0 ? (focusMinutes / (focusMinutes + manualMinutes) * 100) : 0).toInt()}%',
                  subtitle: 'Tercih oranı',
                  color: Theme.of(context).colorScheme.tertiary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  icon: Icons.trending_up,
                  title: 'Streak',
                  value: '$_currentStreak',
                  subtitle: 'Günlük seri',
                  color: Colors.orange,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String title,
    required String value,
    required String subtitle,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: color.withOpacity(0.2),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: color,
                  size: 20,
                ),
              ),
              const Spacer(),
              Text(
                value,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color:
                      Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickInsights(StudyDataProvider studyProvider) {
    final analytics = studyProvider.performanceAnalytics;
    final mostStudiedSubject = studyProvider.mostStudiedSubject;
    final avgDuration = analytics?['averageSessionDuration'] ?? 25;

    String insightText = '';
    IconData insightIcon = Icons.lightbulb_outline;
    Color insightColor = Theme.of(context).colorScheme.primary;

    if (analytics == null || (analytics['totalSessions'] ?? 0) < 3) {
      insightText =
          'Daha fazla çalışma verisi toplamak için birkaç seans daha tamamla!';
      insightIcon = Icons.trending_up;
      insightColor = Theme.of(context).colorScheme.secondary;
    } else if (avgDuration < 20) {
      insightText = 'Odaklanma süren kısa. Daha uzun seanslar deneyebilirsin.';
      insightIcon = Icons.schedule;
      insightColor = Colors.orange;
    } else if (avgDuration > 50) {
      insightText = 'Çok uzun seanslar yapıyorsun. Daha sık mola vermeyi dene.';
      insightIcon = Icons.self_improvement;
      insightColor = Colors.blue;
    } else if (mostStudiedSubject != 'Henüz veri yok') {
      insightText = 'En çok çalıştığın ders: $mostStudiedSubject. Harika!';
      insightIcon = Icons.emoji_events;
      insightColor = Colors.green;
    } else {
      insightText = 'Dengeli bir çalışma ritmin var. Bu şekilde devam et!';
      insightIcon = Icons.balance;
      insightColor = Theme.of(context).colorScheme.primary;
    }

    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: insightColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: insightColor.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: insightColor.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              insightIcon,
              color: insightColor,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AI İçgörü',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: insightColor,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  insightText,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        height: 1.3,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton.icon(
              onPressed: () => showComingSoonDialog(
                context,
                featureName: 'Detaylı Performans Analizi',
                description:
                    'Kapsamlı performans analizi ve raporlama sistemi hazırlanıyor. Çalışma verilerini derinlemesine analiz edebileceksin.',
                icon: Icons.analytics,
                color: Theme.of(context).colorScheme.primary,
              ),
              icon: const Icon(Icons.analytics, size: 20),
              label: const Text('Detaylı Analiz'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 2,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () {
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  backgroundColor: Colors.transparent,
                  builder: (context) => const ManualStudyBottomSheet(),
                );
              },
              icon: const Icon(Icons.add, size: 20),
              label: const Text('Manuel Kayıt'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                side: BorderSide(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  double _calculateXPProgress(int currentXP, int level) {
    // Basit level sistemi: her level 100 XP
    final currentLevelXP = (level - 1) * 100;
    final nextLevelXP = level * 100;
    final progressXP = currentXP - currentLevelXP;
    final levelRange = nextLevelXP - currentLevelXP;

    return (progressXP / levelRange).clamp(0.0, 1.0);
  }

  Widget _buildModernSliverAppBar(bool isDark) {
    final user = FirebaseAuth.instance.currentUser;
    final userName =
        user?.displayName ?? user?.email?.split('@')[0] ?? 'Öğrenci';

    return SliverAppBar(
      automaticallyImplyLeading: false,
      expandedHeight: 180,
      pinned: true,
      elevation: 0,
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      shadowColor: Colors.transparent,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: isDark
                  ? [const Color(0xFF1A1F29), const Color(0xFF0F1419)]
                  : [const Color(0xFFFFFBE6), const Color(0xFFFAF8F0)],
            ),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 60, 24, 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Profil Avatarı
                Container(
                  decoration: BoxDecoration(
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.10),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                    shape: BoxShape.circle,
                  ),
                  child: CircleAvatar(
                    radius: 36,
                    backgroundColor: const Color(0xFFF57C00),
                    backgroundImage: user?.photoURL != null
                        ? NetworkImage(user!.photoURL!)
                        : null,
                    child: user?.photoURL == null
                        ? Text(
                            userName.substring(0, 1).toUpperCase(),
                            style: GoogleFonts.figtree(
                              fontSize: 32,
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          )
                        : null,
                  ),
                ),
                const SizedBox(width: 24),
                // Kullanıcı adı ve selamlama
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _getGreeting(),
                        style: GoogleFonts.figtree(
                          fontSize: 16,
                          color: isDark ? Colors.white70 : Colors.grey[700],
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        userName,
                        style: GoogleFonts.figtree(
                          fontSize: 38,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black87,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                // Ayarlar butonu
                IconButton(
                  icon: Icon(Icons.settings,
                      color: isDark ? Colors.white : Colors.black87, size: 28),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const SettingsScreen(),
                      ),
                    );
                  },
                  tooltip: 'Ayarlar',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeroStatsSection(bool isDark) {
    return Consumer<StudyDataProvider>(
      builder: (context, provider, child) {
        return Container(
          margin: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: isDark
                  ? [
                      const Color(
                          0xFF1A1F29), // AI araçları tarzı koyu mavi-gri
                      const Color(0xFF0F1419), // Çok koyu lacivert
                    ]
                  : [
                      Colors.white,
                      const Color(0xFFFFFBF0),
                    ],
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: isDark
                  ? const Color(0xFF2C3E50).withOpacity(0.3) // Lacivert border
                  : const Color(0xFFF57C00).withOpacity(0.1),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: isDark
                    ? const Color(0xFF0F1419)
                        .withOpacity(0.4) // Lacivert shadow
                    : const Color(0xFFF57C00).withOpacity(0.1),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
              children: [
                // XP Circle
                Expanded(
                  child: _buildStatCircle(
                    icon: Icons.auto_awesome,
                    value: provider.totalXP.toString(),
                    label: 'Toplam XP',
                    color: const Color(0xFFF57C00),
                    progress: (provider.totalXP % 1000) / 1000,
                  ),
                ),
                const SizedBox(width: 20),
                // Level Circle
                Expanded(
                  child: _buildStatCircle(
                    icon: Icons.trending_up,
                    value: provider.currentLevel.toString(),
                    label: 'Seviye',
                    color: const Color(0xFF4CAF50),
                    progress: 0.8,
                  ),
                ),
                const SizedBox(width: 20),
                // Weekly Minutes
                Expanded(
                  child: _buildStatCircle(
                    icon: Icons.schedule,
                    value: '${provider.weeklyStudyMinutes}dk',
                    label: 'Bu Hafta',
                    color: const Color(0xFF2196F3),
                    progress: (provider.weeklyStudyMinutes % 300) / 300,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatCircle({
    required IconData icon,
    required String value,
    required String label,
    required Color color,
    required double progress,
  }) {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          child: CircularPercentIndicator(
            radius: 40,
            lineWidth: 6,
            percent: progress.clamp(0.0, 1.0),
            center: Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                color: color,
                size: 24,
              ),
            ),
            progressColor: color,
            backgroundColor: color.withOpacity(0.1),
            circularStrokeCap: CircularStrokeCap.round,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          value,
          style: GoogleFonts.figtree(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.figtree(
            fontSize: 12,
            color: const Color(0xFF7B8794),
          ),
        ),
      ],
    );
  }

  Widget _buildInteractiveTodayFocusSection(bool isDark) {
    final currentDay = _getCurrentPlanDay();
    final todayTasks = _planByDay[currentDay] ?? [];
    final dayTheme = _getDayThemeInfo(currentDay);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Header with Day Theme
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      (dayTheme['color'] as Color).withOpacity(0.2),
                      (dayTheme['color'] as Color).withOpacity(0.1),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  dayTheme['icon'],
                  color: dayTheme['color'],
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          dayTheme['emoji'],
                          style: const TextStyle(fontSize: 18),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            dayTheme['theme'],
                            style: GoogleFonts.figtree(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : Colors.black87,
                            ),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      dayTheme['description'],
                      style: GoogleFonts.figtree(
                        fontSize: 13,
                        color: const Color(0xFF7B8794),
                      ),
                    ),
                    Text(
                      '${todayTasks.length} görev seni bekliyor',
                      style: GoogleFonts.figtree(
                        fontSize: 12,
                        color: dayTheme['color'],
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Horizontal Scrollable Task Cards
          if (todayTasks.isEmpty)
            _buildEmptyTodayState()
          else
            SizedBox(
              height: 240,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 4),
                itemCount: _isTodayFocusExpanded
                    ? todayTasks.length
                    : math.min(todayTasks.length, 3),
                itemBuilder: (context, index) {
                  final task = todayTasks[index];
                  return _buildModernTaskCard(task, index, isDark);
                },
              ),
            ),

          // Show More/Less Button for horizontal scroll
          if (todayTasks.length > 3) const SizedBox(height: 16),
          if (todayTasks.length > 3)
            Center(child: _buildExpandCollapseButton(todayTasks.length)),
        ],
      ),
    );
  }

  Widget _buildModernTaskCard(
      Map<String, dynamic> task, int index, bool isDark) {
    final subject = task['ders'] ?? 'Ders';
    final topic = task['konu'] ?? 'Konu';
    final isCompleted = task['completed'] == true;
    final duration = task['sure'] ?? 30;
    final currentDay = _getCurrentPlanDay();

    // Kısmen tamamlanan görev bilgileri
    final completedMinutes = task['completedMinutes'] ?? 0;
    final remainingMinutes = task['remainingMinutes'] ?? duration;
    final isPartiallyCompleted = task['isPartiallyCompleted'] ?? false;
    final lastStudiedAt = task['lastStudiedAt'] != null
        ? DateTime.parse(task['lastStudiedAt'])
        : null;

    // İlerleme yüzdesi hesapla
    final progressPercentage = duration > 0 ? completedMinutes / duration : 0.0;

    // 7. gün AI Performans Raporu görevini kontrol et
    final isAIReportTask =
        currentDay == 7 && topic.contains('AI Performans Raporu');

    // Derse göre renk atama
    final subjectColor =
        isAIReportTask ? const Color(0xFFFF6B6B) : _getSubjectColor(subject);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: 280,
      margin: const EdgeInsets.only(right: 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isCompleted
              ? [
                  const Color(0xFF4CAF50).withOpacity(0.1),
                  const Color(0xFF4CAF50).withOpacity(0.05),
                ]
              : [
                  subjectColor.withOpacity(0.1),
                  subjectColor.withOpacity(0.05),
                ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isCompleted
              ? const Color(0xFF4CAF50).withOpacity(0.3)
              : subjectColor.withOpacity(0.3),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isCompleted
                ? const Color(0xFF4CAF50).withOpacity(0.1)
                : subjectColor.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Task Header - Kompakt
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: isCompleted ? const Color(0xFF4CAF50) : subjectColor,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    isCompleted ? Icons.check : Icons.book_outlined,
                    color: Colors.white,
                    size: 14,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        subject,
                        style: GoogleFonts.figtree(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: isCompleted
                              ? const Color(0xFF4CAF50)
                              : subjectColor,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        '${duration} dk',
                        style: GoogleFonts.figtree(
                          fontSize: 11,
                          color: const Color(0xFF7B8794),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Task Content - 2 Satır için optimize edildi
            Container(
              height: 70, // Sabit yükseklik 2 satır için
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Konu:',
                    style: GoogleFonts.figtree(
                      fontSize: 11,
                      color: const Color(0xFF7B8794),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Expanded(
                    child: Text(
                      topic,
                      style: GoogleFonts.figtree(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black87,
                        decoration:
                            isCompleted ? TextDecoration.lineThrough : null,
                        height: 1.3, // Satır yüksekliği
                      ),
                      maxLines: 3, // 3 satıra kadar izin
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Action Buttons - Kompakt
            if (!isCompleted) ...[
              Row(
                children: [
                  // Complete Button or AI Report Button
                  Expanded(
                    child: isAIReportTask
                        ? ElevatedButton.icon(
                            onPressed: () {
                              HapticFeedback.mediumImpact();
                              _showAIPerformanceReport();
                            },
                            icon: const Icon(Icons.analytics, size: 14),
                            label: Text(
                              'Raporu Gör',
                              style: GoogleFonts.figtree(fontSize: 12),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: subjectColor,
                              foregroundColor: Colors.white,
                              elevation: 2,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              minimumSize: const Size(0, 36),
                            ),
                          )
                        : OutlinedButton.icon(
                            onPressed: () =>
                                _toggleTaskCompletion(task['id'], isCompleted),
                            icon: const Icon(Icons.check, size: 14),
                            label: Text(
                              'Tamamla',
                              style: GoogleFonts.figtree(fontSize: 12),
                            ),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: subjectColor,
                              side: BorderSide(
                                  color: subjectColor.withOpacity(0.5)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              minimumSize: const Size(0, 36),
                            ),
                          ),
                  ),
                  const SizedBox(width: 6),
                  // Focus Button with Animation
                  Expanded(
                    child: AnimatedScale(
                      scale: 1.0,
                      duration: const Duration(milliseconds: 150),
                      child: ElevatedButton.icon(
                        onPressed: () {
                          HapticFeedback.mediumImpact();
                          _openFocusMode(task);
                        },
                        icon: const Icon(Icons.psychology, size: 14),
                        label: Text(
                          'Odaklan',
                          style: GoogleFonts.figtree(fontSize: 12),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: subjectColor,
                          foregroundColor: Colors.white,
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          minimumSize: const Size(0, 36),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ] else ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF4CAF50).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: const Color(0xFF4CAF50).withOpacity(0.3),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.celebration,
                      color: Color(0xFF4CAF50),
                      size: 14,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Tamamlandı! 🎉',
                      style: GoogleFonts.figtree(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF4CAF50),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Kısmen tamamlanan görev için ilerleme bilgisi
            if (isPartiallyCompleted || completedMinutes > 0) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: Colors.blue.withOpacity(0.3),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'İlerleme',
                          style: GoogleFonts.figtree(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Colors.blue[700],
                          ),
                        ),
                        Text(
                          '${completedMinutes}/${duration} dk',
                          style: GoogleFonts.figtree(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: Colors.blue[600],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    LinearProgressIndicator(
                      value: progressPercentage,
                      backgroundColor: Colors.blue.withOpacity(0.2),
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.blue),
                      minHeight: 4,
                    ),
                    if (lastStudiedAt != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Son çalışma: ${_formatLastStudied(lastStudiedAt)}',
                        style: GoogleFonts.figtree(
                          fontSize: 10,
                          color: Colors.blue[600],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyTodayState() {
    return Container(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF4CAF50).withOpacity(0.2),
                  const Color(0xFF4CAF50).withOpacity(0.1),
                ],
              ),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.celebration,
              size: 40,
              color: Color(0xFF4CAF50),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Tüm görevler tamamlandı! 🎉',
            style: GoogleFonts.figtree(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF4CAF50),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Bugünkü planın başarıyla tamamlandı. Harika iş!',
            textAlign: TextAlign.center,
            style: GoogleFonts.figtree(
              fontSize: 14,
              color: const Color(0xFF7B8794),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExpandCollapseButton(int totalTasks) {
    final remainingTasks = totalTasks - 3;

    return AnimatedSize(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
      child: GestureDetector(
        onTap: () {
          HapticFeedback.lightImpact();
          setState(() {
            _isTodayFocusExpanded = !_isTodayFocusExpanded;
          });
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                const Color(0xFFF57C00).withOpacity(0.1),
                const Color(0xFFFFAB40).withOpacity(0.05),
              ],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: const Color(0xFFF57C00).withOpacity(0.3),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFF57C00).withOpacity(0.1),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                _isTodayFocusExpanded
                    ? Icons.keyboard_arrow_up
                    : Icons.keyboard_arrow_down,
                color: const Color(0xFFF57C00),
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                _isTodayFocusExpanded
                    ? 'Daha Az Göster'
                    : '+$remainingTasks görev daha',
                style: GoogleFonts.figtree(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFFF57C00),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActionsGrid(bool isDark) {
    return Container(
      margin: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Hızlı Eylemler',
            style: GoogleFonts.figtree(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 1.2,
            children: [
              _buildQuickActionCard(
                icon: Icons.psychology,
                title: 'AI Araçlar',
                subtitle: 'Akıllı öğrenme',
                color: const Color(0xFF6366F1),
                onTap: () => showComingSoonDialog(
                  context,
                  featureName: 'Yapay Zeka Öğrenme Araçları',
                  description:
                      'Sokratik diyalog, kişiselleştirilmiş öğrenme yolları ve akıllı konu haritaları gibi gelişmiş AI araçları çok yakında! Bu araçlar öğrenme deneyimini bir üst seviyeye taşıyacak.',
                  icon: Icons.psychology,
                  color: const Color(0xFF6366F1),
                ),
                isDark: isDark,
              ),
              _buildQuickActionCard(
                icon: Icons.analytics,
                title: 'Performans',
                subtitle: 'Analiz ve raporlar',
                color: const Color(0xFF10B981),
                onTap: () => showComingSoonDialog(
                  context,
                  featureName: 'Gelişmiş Performans Analizi',
                  description:
                      'Yapay zeka destekli detaylı performans analizi şu anda hazırlanıyor. Bu özellik aktif olduğunda, ilerlemeni detaylı grafiklerle takip edebilecek ve kişisel analiz raporları alabileceksin.',
                  icon: Icons.analytics,
                  color: const Color(0xFF10B981),
                ),
                isDark: isDark,
              ),
              _buildQuickActionCard(
                icon: Icons.emoji_events,
                title: 'Oyunlaştırma',
                subtitle: 'Rozetler ve XP',
                color: const Color(0xFFEF4444),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) => const GamificationScreen()),
                ),
                isDark: isDark,
              ),
              _buildQuickActionCard(
                icon: Icons.add_circle,
                title: 'Manuel Kayıt',
                subtitle: 'Çalışma ekle',
                color: const Color(0xFFF59E0B),
                onTap: () => showManualStudyBottomSheet(context),
                isDark: isDark,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? [
                    const Color(0xFF1A1F29), // AI araçları tarzı koyu mavi-gri
                    const Color(0xFF0F1419), // Çok koyu lacivert
                  ]
                : [
                    Colors.white,
                    color.withOpacity(0.05),
                  ],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: color.withOpacity(0.2),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.1),
              blurRadius: 15,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: color,
                  size: 24,
                ),
              ),
              const Spacer(),
              Text(
                title,
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: GoogleFonts.figtree(
                  fontSize: 12,
                  color: const Color(0xFF7B8794),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProgressOverview(bool isDark) {
    return Container(
      margin: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  const Color(0xFF1A1F29), // AI araçları tarzı koyu mavi-gri
                  const Color(0xFF0F1419), // Çok koyu lacivert
                ]
              : [
                  Colors.white,
                  const Color(0xFFFFFBF0),
                ],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark
              ? const Color(0xFF2C3E50).withOpacity(0.3) // Lacivert border
              : const Color(0xFFF57C00).withOpacity(0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? const Color(0xFF0F1419).withOpacity(0.4) // Lacivert shadow
                : const Color(0xFFF57C00).withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Haftalık İlerleme',
              style: GoogleFonts.figtree(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
            const SizedBox(height: 20),
            Consumer<StudyDataProvider>(
              builder: (context, provider, child) {
                final completionRate =
                    _totalTasks > 0 ? _completedTasks / _totalTasks : 0.0;
                return Column(
                  children: [
                    CircularPercentIndicator(
                      radius: 60,
                      lineWidth: 12,
                      percent: completionRate.clamp(0.0, 1.0),
                      center: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '${(completionRate * 100).toInt()}%',
                            style: GoogleFonts.figtree(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFFF57C00),
                            ),
                          ),
                          Text(
                            'Tamamlandı',
                            style: GoogleFonts.figtree(
                              fontSize: 12,
                              color: const Color(0xFF7B8794),
                            ),
                          ),
                        ],
                      ),
                      progressColor: const Color(0xFFF57C00),
                      backgroundColor: isDark
                          ? const Color(0xFF2C3E50)
                          : const Color(0xFFE8EAF6)!,
                      circularStrokeCap: CircularStrokeCap.round,
                    ),
                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildProgressStatSimple(
                            'Tamamlanan', _completedTasks.toString()),
                        _buildProgressStatSimple(
                            'Toplam', _totalTasks.toString()),
                        _buildProgressStatSimple('Kalan',
                            (_totalTasks - _completedTasks).toString()),
                      ],
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressStatSimple(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.figtree(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: const Color(0xFFF57C00),
          ),
        ),
        Text(
          label,
          style: GoogleFonts.figtree(
            fontSize: 12,
            color: const Color(0xFF7B8794),
          ),
        ),
      ],
    );
  }

  Widget _buildPerformanceInsights(bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  const Color(0xFF1A1F29), // AI araçları tarzı koyu mavi-gri
                  const Color(0xFF0F1419), // Çok koyu lacivert
                ]
              : [
                  Colors.white,
                  const Color(0xFFFFFBF0),
                ],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark
              ? const Color(0xFF2C3E50).withOpacity(0.3) // Lacivert border
              : const Color(0xFFF57C00).withOpacity(0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? const Color(0xFF0F1419).withOpacity(0.4) // Lacivert shadow
                : const Color(0xFFF57C00).withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFF2196F3).withOpacity(0.2),
                        const Color(0xFF2196F3).withOpacity(0.1),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(
                    Icons.insights,
                    color: Color(0xFF2196F3),
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Performans İçgörüleri',
                        style: GoogleFonts.figtree(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      Text(
                        'AI destekli analiz',
                        style: GoogleFonts.figtree(
                          fontSize: 12,
                          color: const Color(0xFF7B8794),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const GrowthHubScreen()),
                  ),
                  icon: const Icon(Icons.arrow_forward_ios, size: 16),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Consumer<StudyDataProvider>(
              builder: (context, provider, child) {
                return Column(
                  children: [
                    _buildInsightRow(
                      Icons.trending_up,
                      'En Çok Çalışılan Ders',
                      provider.mostStudiedSubject,
                      const Color(0xFF4CAF50),
                    ),
                    const SizedBox(height: 12),
                    _buildInsightRow(
                      Icons.psychology,
                      'Çalışma Tercihi',
                      provider.studyPreference,
                      const Color(0xFF2196F3),
                    ),
                    const SizedBox(height: 12),
                    _buildInsightRow(
                      Icons.schedule,
                      'Ortalama Seans',
                      '${provider.averageSessionDuration} dakika',
                      const Color(0xFFF57C00),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInsightRow(
      IconData icon, String label, String value, Color color) {
    return Row(
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: GoogleFonts.figtree(
              fontSize: 14,
              color: const Color(0xFF7B8794),
            ),
          ),
        ),
        Text(
          value,
          style: GoogleFonts.figtree(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildModernBottomNavigation(bool isDark) {
    return Container(
      height: 70,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: isDark
              ? [
                  const Color(0xFF1A1F29), // AI araçları tarzı koyu mavi-gri
                  const Color(0xFF0F1419), // Çok koyu lacivert
                ]
              : [
                  Colors.white,
                  const Color(0xFFFFFBF0),
                ],
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? const Color(0xFF0F1419).withOpacity(0.4) // Lacivert shadow
                : const Color(0xFF2C3E50).withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildNavigationItem(
            Icons.home,
            'Ana Sayfa',
            true,
            () {}, // Ana sayfa zaten burada
            isDark,
          ),
          _buildNavigationItem(
            Icons.calendar_today,
            'Takvim',
            false,
            () => Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (context) => const CalendarViewScreen()),
            ),
            isDark,
          ),
          _buildNavigationItem(
            Icons.psychology,
            'AI Araçlar',
            false,
            () => Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const SmartToolsScreen()),
            ),
            isDark,
          ),
          _buildNavigationItem(
            Icons.analytics,
            'Performans',
            false,
            () => Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const GrowthHubScreen()),
            ),
            isDark,
          ),
          _buildNavigationItem(
            Icons.emoji_events,
            'Oyunlar',
            false,
            () => Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (context) => const GamificationScreen()),
            ),
            isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildNavigationItem(IconData icon, String label, bool isActive,
      VoidCallback onTap, bool isDark) {
    return Flexible(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: isActive
                    ? BoxDecoration(
                        color: const Color(0xFFF57C00).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      )
                    : null,
                child: Icon(
                  icon,
                  color: isActive
                      ? const Color(0xFFF57C00)
                      : const Color(0xFF5D6D7E),
                  size: 20,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: GoogleFonts.figtree(
                  fontSize: 9,
                  color: isActive
                      ? const Color(0xFFF57C00)
                      : const Color(0xFF5D6D7E),
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCompactFloatingActionButton(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFFF57C00),
            Color(0xFFE65100),
          ],
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFF57C00).withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: FloatingActionButton(
        heroTag: "user_plan_fab",
        onPressed: () {
          HapticFeedback.mediumImpact();
          showManualStudyBottomSheet(context);
        },
        backgroundColor: Colors.transparent,
        elevation: 0,
        tooltip: 'Çevrimdışı Çalışma Ekle',
        child: const Icon(
          Icons.add,
          color: Colors.white,
          size: 24,
        ),
      ),
    );
  }

  // Settings Dialog Methods
  void _showProfileDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.person_outline, color: Color(0xFFF57C00)),
            SizedBox(width: 12),
            Text('Profil'),
          ],
        ),
        content: const Text('Profil ayarları yakında eklenecek.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tamam'),
          ),
        ],
      ),
    );
  }

  void _showNotificationSettings() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.notifications_outlined, color: Color(0xFFF57C00)),
            SizedBox(width: 12),
            Text('Bildirimler'),
          ],
        ),
        content: const Text('Bildirim ayarları yakında eklenecek.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tamam'),
          ),
        ],
      ),
    );
  }

  void _showThemeSettings() {
    showDialog(
      context: context,
      builder: (context) => Consumer<ThemeProvider>(
        builder: (context, provider, child) {
          return AlertDialog(
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Row(
              children: [
                Icon(Icons.palette_outlined, color: Color(0xFFF57C00)),
                SizedBox(width: 12),
                Text('Tema Ayarları'),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: const Icon(Icons.light_mode),
                  title: const Text('Açık Tema'),
                  trailing: provider.isLightMode
                      ? const Icon(Icons.check, color: Color(0xFFF57C00))
                      : null,
                  onTap: () async {
                    await provider.setThemeMode(ThemeMode.light);
                    if (mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Açık tema aktif edildi'),
                          backgroundColor: Color(0xFFF57C00),
                        ),
                      );
                    }
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.dark_mode),
                  title: const Text('Koyu Tema'),
                  trailing: provider.isDarkMode && !provider.isSystemMode
                      ? const Icon(Icons.check, color: Color(0xFFF57C00))
                      : null,
                  onTap: () async {
                    await provider.setThemeMode(ThemeMode.dark);
                    if (mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Koyu tema aktif edildi'),
                          backgroundColor: Color(0xFFF57C00),
                        ),
                      );
                    }
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.auto_mode),
                  title: const Text('Sistem Teması'),
                  subtitle: const Text('Cihaz ayarını takip eder'),
                  trailing: provider.isSystemMode
                      ? const Icon(Icons.check, color: Color(0xFFF57C00))
                      : null,
                  onTap: () async {
                    await provider.setThemeMode(ThemeMode.system);
                    if (mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Sistem teması aktif edildi'),
                          backgroundColor: Color(0xFFF57C00),
                        ),
                      );
                    }
                  },
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('İptal'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showHelpDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.help_outline, color: Color(0xFFF57C00)),
            SizedBox(width: 12),
            Text('Yardım'),
          ],
        ),
        content: const Text('Yardım ve destek özellikleri yakında eklenecek.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tamam'),
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.logout, color: Colors.red),
            SizedBox(width: 12),
            Text('Çıkış Yap'),
          ],
        ),
        content:
            const Text('Uygulamadan çıkış yapmak istediğinizden emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);

              try {
                // Önce tüm stream'leri temizle
                final studyProvider =
                    Provider.of<StudyDataProvider>(context, listen: false);
                studyProvider.dispose();

                // Firebase Auth'tan çıkış yap
                await FirebaseAuth.instance.signOut();

                // Login ekranına yönlendir
                if (mounted) {
                  Navigator.of(context).pushNamedAndRemoveUntil(
                    '/login',
                    (route) => false,
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Çıkış yapılırken hata oluştu: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            child: const Text('Çıkış Yap', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Widget _buildWeeklyInsightCard(bool isDark) {
    return Consumer<StudyDataProvider>(
      builder: (context, provider, child) {
        final weeklyProgress = (_completedTasks > 0 && _totalTasks > 0)
            ? (_completedTasks / _totalTasks)
            : 0.0;

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: isDark
                        ? [
                            const Color(0xFF1A1F29)
                                .withOpacity(0.8), // Glassmorphism için opacity
                            const Color(0xFF0F1419).withOpacity(0.6),
                          ]
                        : [
                            Colors.white.withOpacity(0.9),
                            const Color(0xFFFFFBF0).withOpacity(0.7),
                          ],
                  ),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(
                    color: isDark
                        ? const Color(0xFF2C3E50).withOpacity(0.4)
                        : const Color(0xFFF57C00).withOpacity(0.2),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: isDark
                          ? const Color(0xFF0F1419).withOpacity(0.5)
                          : const Color(0xFFF57C00).withOpacity(0.15),
                      blurRadius: 30,
                      offset: const Offset(0, 15),
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      // Header with "Tümünü Gör" button
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Haftalık Bakış',
                            style: GoogleFonts.figtree(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : Colors.black87,
                            ),
                          ),
                          TextButton.icon(
                            onPressed: () =>
                                Navigator.pushNamed(context, '/performance'),
                            icon: const Icon(Icons.trending_up, size: 16),
                            label: const Text(
                              'Tümünü Gör',
                              style: TextStyle(fontSize: 12),
                            ),
                            style: TextButton.styleFrom(
                              foregroundColor: const Color(0xFFF57C00),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Main Content Row
                      Row(
                        children: [
                          // Sol Taraf - Büyük Dairesel İlerleme
                          Expanded(
                            flex: 2,
                            child: Column(
                              children: [
                                Stack(
                                  alignment: Alignment.center,
                                  children: [
                                    SizedBox(
                                      width: 120,
                                      height: 120,
                                      child: TweenAnimationBuilder<double>(
                                        duration:
                                            const Duration(milliseconds: 1500),
                                        curve: Curves.easeOutCubic,
                                        tween: Tween(
                                            begin: 0.0,
                                            end:
                                                weeklyProgress.clamp(0.0, 1.0)),
                                        builder: (context, value, _) =>
                                            CircularProgressIndicator(
                                          value: value,
                                          strokeWidth: 8,
                                          backgroundColor: isDark
                                              ? const Color(0xFF2C3E50)
                                                  .withOpacity(0.3)
                                              : Colors.grey[300],
                                          valueColor:
                                              AlwaysStoppedAnimation<Color>(
                                            const Color(0xFFF57C00),
                                          ),
                                        ),
                                      ),
                                    ),
                                    Column(
                                      children: [
                                        AnimatedSwitcher(
                                          duration:
                                              const Duration(milliseconds: 800),
                                          transitionBuilder: (Widget child,
                                              Animation<double> animation) {
                                            return SlideTransition(
                                              position: animation.drive(Tween(
                                                begin: const Offset(0.0, 0.5),
                                                end: Offset.zero,
                                              ).chain(CurveTween(
                                                  curve: Curves.easeOutBack))),
                                              child: FadeTransition(
                                                opacity: animation,
                                                child: child,
                                              ),
                                            );
                                          },
                                          child: Text(
                                            '${(weeklyProgress * 100).toInt()}%',
                                            key: ValueKey(
                                                '${(weeklyProgress * 100).toInt()}%'),
                                            style: GoogleFonts.figtree(
                                              fontSize: 24,
                                              fontWeight: FontWeight.bold,
                                              color: const Color(0xFFF57C00),
                                            ),
                                          ),
                                        ),
                                        Text(
                                          'Tamamlandı',
                                          style: GoogleFonts.figtree(
                                            fontSize: 12,
                                            color: isDark
                                                ? Colors.white70
                                                : Colors.grey[600],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'Bu Haftaki Görevlerin',
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.figtree(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color:
                                        isDark ? Colors.white : Colors.black87,
                                  ),
                                ),
                                Text(
                                  '${_completedTasks}/${_totalTasks} görevi tamamladın',
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.figtree(
                                    fontSize: 12,
                                    color: const Color(0xFF7B8794),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(width: 20),

                          // Sağ Taraf - Dikey İstatistikler
                          Expanded(
                            flex: 3,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildStatRow(
                                  icon: Icons.auto_awesome,
                                  label: 'Toplam XP',
                                  value: '${provider.totalXP}',
                                  color: const Color(0xFFF57C00),
                                  isDark: isDark,
                                ),
                                const SizedBox(height: 16),
                                _buildStatRow(
                                  icon: Icons.local_fire_department,
                                  label: 'Çalışma Serisi',
                                  value: '${_currentStreak} gün',
                                  color: const Color(0xFFE65100),
                                  isDark: isDark,
                                ),
                                const SizedBox(height: 16),
                                _buildStatRow(
                                  icon: Icons.trending_up,
                                  label: 'Seviye',
                                  value: '${provider.currentLevel}',
                                  color: const Color(0xFF4CAF50),
                                  isDark: isDark,
                                ),
                                const SizedBox(height: 16),
                                _buildStatRow(
                                  icon: Icons.schedule,
                                  label: 'Bu Hafta',
                                  value: '${provider.weeklyStudyMinutes}dk',
                                  color: const Color(0xFF2196F3),
                                  isDark: isDark,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatRow({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
    required bool isDark,
  }) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            color: color,
            size: 20,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 600),
                transitionBuilder: (Widget child, Animation<double> animation) {
                  return SlideTransition(
                    position: animation.drive(Tween(
                      begin: const Offset(0.0, -0.3),
                      end: Offset.zero,
                    ).chain(CurveTween(curve: Curves.easeOut))),
                    child: FadeTransition(
                      opacity: animation,
                      child: child,
                    ),
                  );
                },
                child: Text(
                  value,
                  key: ValueKey(value),
                  style: GoogleFonts.figtree(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
              ),
              Text(
                label,
                style: GoogleFonts.figtree(
                  fontSize: 12,
                  color: const Color(0xFF7B8794),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSmartQuickActions(bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Akıllı Eylemler',
            style: GoogleFonts.figtree(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 1.2,
            children: [
              _buildSmartActionCard(
                icon: Icons.auto_awesome,
                title: 'Hızlı Özet',
                subtitle: 'AI ile özet oluştur',
                color: const Color(0xFF6366F1),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) => const SmartToolsScreen()),
                ),
                isDark: isDark,
              ),
              _buildSmartActionCard(
                icon: Icons.analytics,
                title: 'Son Analiz',
                subtitle: 'Deneme sonuçların',
                color: const Color(0xFF10B981),
                onTap: () => showComingSoonDialog(
                  context,
                  featureName: 'Akıllı Sınav Analizi',
                  description:
                      'Yapay zeka ile deneme sınav sonuçlarını detaylı analiz etme özelliği hazırlanıyor. Güçlü ve zayıf yönlerini keşfedebileceksin.',
                  icon: Icons.analytics,
                  color: const Color(0xFF10B981),
                ),
                isDark: isDark,
              ),
              _buildSmartActionCard(
                icon: Icons.hub,
                title: 'Kavram Haritası',
                subtitle: 'AI ile konu bağla',
                color: const Color(0xFF8B5CF6),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) => const SmartToolsScreen()),
                ),
                isDark: isDark,
              ),
              _buildSmartActionCard(
                icon: Icons.leaderboard,
                title: 'Haftalık Sıralamam',
                subtitle: 'Konumunu gör',
                color: const Color(0xFFEF4444),
                onTap: () => _showWeeklyRankingDialog(),
                isDark: isDark,
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _checkWeekEndAndShowNewPlanDialog() {
    // TEST AMAÇLI HER ZAMAN GÖSTER
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        _showWeekEndNewPlanDialog();
      }
    });

    // Normal kontrol (şu anda devre dışı)
    // if (_planByDay.isNotEmpty) {
    //   final maxDay = _planByDay.keys.reduce((a, b) => a > b ? a : b);
    //   final completedTasksForLastDay = _planByDay[maxDay]
    //           ?.where((task) => task['completed'] == true)
    //           .length ??
    //       0;
    //   final totalTasksForLastDay = _planByDay[maxDay]?.length ?? 0;

    //   // Son günün tüm görevleri tamamlandıysa göster
    //   if (completedTasksForLastDay == totalTasksForLastDay &&
    //       totalTasksForLastDay > 0) {
    //     Future.delayed(const Duration(seconds: 1), () {
    //       if (mounted) {
    //         _showWeekEndNewPlanDialog();
    //       }
    //     });
    //   }
    // }
  }

  void _showWeekEndNewPlanDialog() {
    // Tema kontrolü
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Dialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(28),
            ),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(28),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: isDark
                      ? [
                          const Color(0xFF1A1F29),
                          const Color(0xFF0F1419),
                        ]
                      : [
                          Colors.white,
                          const Color(0xFFFFF8E1),
                        ],
                ),
                boxShadow: [
                  BoxShadow(
                    color:
                        const Color(0xFFF59E0B).withOpacity(isDark ? 0.5 : 0.3),
                    blurRadius: 30,
                    offset: const Offset(0, 15),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Üst kısım - Gradient arka plan
                  Container(
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(28),
                        topRight: Radius.circular(28),
                      ),
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          const Color(0xFFF59E0B),
                          const Color(0xFFFF9800),
                        ],
                      ),
                    ),
                    child: Column(
                      children: [
                        // Animasyonlu ikon container
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(50),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.3),
                              width: 2,
                            ),
                          ),
                          child: const Icon(
                            Icons.celebration,
                            size: 56,
                            color: Colors.white,
                          ),
                        )
                            .animate()
                            .scale(
                                delay: 200.ms,
                                duration: 800.ms,
                                curve: Curves.elasticOut)
                            .shimmer(
                                delay: 1000.ms,
                                duration: 2500.ms,
                                color: Colors.white.withOpacity(0.6)),

                        const SizedBox(height: 24),

                        // Başlık
                        Text(
                          '🎉 Haftalık Plan Tamamlandı!',
                          style: GoogleFonts.figtree(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: 0.5,
                          ),
                          textAlign: TextAlign.center,
                        )
                            .animate()
                            .fadeIn(delay: 400.ms, duration: 800.ms)
                            .slideY(begin: 0.5, end: 0),
                      ],
                    ),
                  ),

                  // Alt kısım - İçerik
                  Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      children: [
                        // Başarı mesajı
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 20, vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF4CAF50).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: const Color(0xFF4CAF50).withOpacity(0.3),
                              width: 1,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.check_circle,
                                color: Color(0xFF4CAF50),
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Tüm görevler tamamlandı!',
                                style: GoogleFonts.figtree(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF4CAF50),
                                ),
                              ),
                            ],
                          ),
                        )
                            .animate()
                            .fadeIn(delay: 600.ms, duration: 800.ms)
                            .slideY(begin: 0.3, end: 0),

                        const SizedBox(height: 24),

                        // Açıklama
                        Text(
                          'Harika bir hafta geçirdin! Şimdi sonraki hafta için yeni bir çalışma planı oluşturalım mı?',
                          style: GoogleFonts.figtree(
                            fontSize: 16,
                            color: isDark ? Colors.white70 : Colors.grey[700],
                            height: 1.5,
                          ),
                          textAlign: TextAlign.center,
                        )
                            .animate()
                            .fadeIn(delay: 800.ms, duration: 800.ms)
                            .slideY(begin: 0.3, end: 0),

                        const SizedBox(height: 32),

                        // Butonlar
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isDark
                                        ? Colors.grey[600]!
                                        : Colors.grey[300]!,
                                    width: 1,
                                  ),
                                ),
                                child: TextButton(
                                  onPressed: () {
                                    Navigator.pop(context);
                                  },
                                  style: TextButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 18),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                  ),
                                  child: Text(
                                    'Şimdilik Hayır',
                                    style: GoogleFonts.figtree(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: isDark
                                          ? Colors.grey[400]
                                          : Colors.grey[600],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  gradient: LinearGradient(
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                    colors: [
                                      const Color(0xFFF59E0B),
                                      const Color(0xFFFF9800),
                                    ],
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFFF59E0B)
                                          .withOpacity(0.4),
                                      blurRadius: 12,
                                      offset: const Offset(0, 6),
                                    ),
                                  ],
                                ),
                                child: ElevatedButton(
                                  onPressed: () {
                                    Navigator.pop(context);
                                    _showNewWeekPlanDialog();
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.transparent,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.all(18),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    elevation: 0,
                                    shadowColor: Colors.transparent,
                                    alignment: Alignment.center,
                                  ),
                                  child: Text(
                                    'Yeni Plan Oluştur',
                                    style: GoogleFonts.figtree(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        )
                            .animate()
                            .fadeIn(delay: 1000.ms, duration: 800.ms)
                            .slideY(begin: 0.5, end: 0),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildAnimatedNewWeekPlanCard(bool isDark) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.mediumImpact();
        _showNewWeekPlanDialog();
      },
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              const Color(0xFFF59E0B).withOpacity(0.1),
              const Color(0xFFF59E0B).withOpacity(0.05),
            ],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: const Color(0xFFF59E0B).withOpacity(0.3),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFF59E0B).withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.add_circle_outline,
                  color: Color(0xFFF59E0B),
                  size: 20,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Yeni Hafta Planı',
                style: GoogleFonts.figtree(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black87,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                'Sonraki hafta için',
                style: GoogleFonts.figtree(
                  fontSize: 11,
                  color: const Color(0xFF7B8794),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(delay: 200.ms, duration: 800.ms)
        .slideX(begin: 0.3, end: 0)
        .shimmer(
            delay: 1000.ms,
            duration: 2000.ms,
            color: const Color(0xFFF59E0B).withOpacity(0.3));
  }

  Widget _buildSmartActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.mediumImpact();
        onTap();
      },
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              color.withOpacity(0.1),
              color.withOpacity(0.05),
            ],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: color.withOpacity(0.3),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  icon,
                  color: color,
                  size: 20,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                title,
                style: GoogleFonts.figtree(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black87,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: GoogleFonts.figtree(
                  fontSize: 11,
                  color: const Color(0xFF7B8794),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showQuickSummaryDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        String inputText = '';
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.auto_awesome,
                  color: Color(0xFF6366F1),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Hızlı Özet Oluştur',
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                onChanged: (value) => inputText = value,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: 'Metin yapıştırın veya URL girin...',
                  hintStyle: GoogleFonts.figtree(fontSize: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                style: GoogleFonts.figtree(fontSize: 14),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(
                'İptal',
                style: GoogleFonts.figtree(fontSize: 14),
              ),
            ),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                _processQuickSummary(inputText);
              },
              icon: const Icon(Icons.auto_awesome),
              label: Text(
                'Özet Oluştur',
                style: GoogleFonts.figtree(fontSize: 14),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366F1),
                foregroundColor: Colors.white,
              ),
            ),
          ],
        );
      },
    );
  }

  void _showLastAnalysisDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.analytics,
                  color: Color(0xFF10B981),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Son Deneme Analizi',
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildAnalysisRow('Matematik', '85%', const Color(0xFF10B981)),
              _buildAnalysisRow('Fizik', '72%', const Color(0xFFF59E0B)),
              _buildAnalysisRow('Kimya', '90%', const Color(0xFF10B981)),
              _buildAnalysisRow('Biyoloji', '68%', const Color(0xFFEF4444)),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '✨ Genel Ortalama: %79 - Harika gidiyorsun!',
                  style: GoogleFonts.figtree(
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF10B981),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(
                'Kapat',
                style: GoogleFonts.figtree(fontSize: 14),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const GrowthHubScreen(),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
              ),
              child: Text(
                'Detayları Gör',
                style: GoogleFonts.figtree(fontSize: 14),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildAnalysisRow(String subject, String score, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            subject,
            style: GoogleFonts.figtree(fontSize: 14),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              score,
              style: GoogleFonts.figtree(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _processQuickSummary(String inputText) {
    if (inputText.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '✨ AI özet oluşturuluyor...',
            style: GoogleFonts.figtree(fontSize: 14),
          ),
          backgroundColor: const Color(0xFF6366F1),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      // TODO: Implement AI summary generation
    }
  }

  void _showConceptMapDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF8B5CF6).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.hub,
                  color: Color(0xFF8B5CF6),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Kavram Haritası',
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF8B5CF6).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.psychology,
                      color: Color(0xFF8B5CF6),
                      size: 32,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'AI, öğrendiğin konuları birbirine bağlayarak kavram haritası oluşturacak',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        color: const Color(0xFF8B5CF6),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(
                'İptal',
                style: GoogleFonts.figtree(fontSize: 14),
              ),
            ),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/topic-connection');
              },
              icon: const Icon(Icons.hub),
              label: Text(
                'Harita Oluştur',
                style: GoogleFonts.figtree(fontSize: 14),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8B5CF6),
                foregroundColor: Colors.white,
              ),
            ),
          ],
        );
      },
    );
  }

  void _showNewWeekPlanDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.add_circle_outline,
                color: Color(0xFFF59E0B),
              ),
            ),
            const SizedBox(width: 10),
            Text(
              'Yeni Hafta Planı',
              style: GoogleFonts.figtree(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Sonraki hafta için yeni bir çalışma planı oluşturmak istiyor musunuz?',
              style: GoogleFonts.figtree(fontSize: 14),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline,
                          size: 16, color: Colors.orange.shade600),
                      const SizedBox(width: 4),
                      Text(
                        'Yeni Plan Özellikleri:',
                        style: GoogleFonts.figtree(
                          fontWeight: FontWeight.w600,
                          color: Colors.orange.shade800,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '• Mevcut ilerlemenize göre uyarlanmış konular\n'
                    '• Gelecek haftadaki tatil günleri analizi\n'
                    '• Önceki performansınıza göre zorluk ayarı\n'
                    '• Güncellenen müfredat entegrasyonu',
                    style: GoogleFonts.figtree(
                      fontSize: 12,
                      color: Colors.orange.shade700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'İptal',
              style: GoogleFonts.figtree(fontSize: 14),
            ),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(context);
              _generateNewWeekPlan();
            },
            icon: const Icon(Icons.auto_awesome, size: 16),
            label: Text(
              'Plan Oluştur',
              style: GoogleFonts.figtree(fontSize: 14),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFF59E0B),
              foregroundColor: Colors.white,
              alignment: Alignment.center,
            ),
          ),
        ],
      ),
    );
  }

  void _generateNewWeekPlan() {
    // Plan oluşturma ekranına yönlendir
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const PlanGenerationScreen(
          planType: 'weekly',
          isHolidayPlan: false,
        ),
      ),
    );
  }

  void _showWeeklyRankingDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.leaderboard,
                  color: Color(0xFFEF4444),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Haftalık Sıralamam',
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          content: Container(
            width: double.maxFinite,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Ranking List
                Container(
                  constraints: const BoxConstraints(maxWidth: 280),
                  child: Column(
                    children: [
                      _buildRankingRow('🥇', 'Ahmet K.', '2,840 XP', true),
                      _buildRankingRow('🥈', 'Zeynep A.', '2,650 XP', false),
                      _buildRankingRow('🥉', 'Mehmet Y.', '2,420 XP', false),
                      Container(
                        margin: const EdgeInsets.symmetric(vertical: 6),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: const Color(0xFFEF4444).withOpacity(0.3),
                            width: 2,
                          ),
                        ),
                        child: _buildRankingRow('4', 'Sen', '2,380 XP', false),
                      ),
                      _buildRankingRow('5', 'Ayşe D.', '2,290 XP', false),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                // Motivasyon mesajı
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '🎯 3. sıraya çıkmak için 40 XP daha!',
                    style: GoogleFonts.figtree(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFFEF4444),
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(
                'Kapat',
                style: GoogleFonts.figtree(fontSize: 14),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const GamificationScreen(),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                foregroundColor: Colors.white,
              ),
              child: Text(
                'Tam Sıralama',
                style: GoogleFonts.figtree(fontSize: 14),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildRankingRow(
      String rank, String name, String xp, bool isTopThree) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
      child: Row(
        children: [
          // Rank kısmı - sabit genişlik
          SizedBox(
            width: 32,
            child: Text(
              rank,
              style: GoogleFonts.figtree(
                fontSize: isTopThree ? 15 : 13,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(width: 8),
          // Name kısmı - esnek genişlik ama sınırlı
          Expanded(
            flex: 2,
            child: Text(
              name,
              style: GoogleFonts.figtree(
                fontSize: 13,
                fontWeight: name == 'Sen' ? FontWeight.bold : FontWeight.normal,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          // XP kısmı - sabit alan
          Container(
            alignment: Alignment.centerRight,
            width: 65,
            child: Text(
              xp,
              style: GoogleFonts.figtree(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: const Color(0xFFEF4444),
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRefinedPerformanceOverview(bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Performans Özeti',
                style: GoogleFonts.figtree(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
              TextButton.icon(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const GrowthHubScreen(),
                  ),
                ),
                icon: const Icon(Icons.trending_up, size: 16),
                label: const Text(
                  'Detaylar',
                  style: TextStyle(fontSize: 12),
                ),
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFFF57C00),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Performance Cards Row
          Row(
            children: [
              Expanded(
                child: _buildPerformanceCard(
                  title: 'Bu Hafta',
                  value: '${_completedTasks}/${_totalTasks}',
                  subtitle: 'görev tamamlandı',
                  icon: Icons.assignment_turned_in,
                  color: const Color(0xFF10B981),
                  progress:
                      _completedTasks / (_totalTasks > 0 ? _totalTasks : 1),
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildPerformanceCard(
                  title: 'Seri Günler',
                  value: '$_currentStreak',
                  subtitle: 'gün üst üste',
                  icon: Icons.local_fire_department,
                  color: const Color(0xFFEF4444),
                  progress: (_currentStreak / 30).clamp(0.0, 1.0),
                  isDark: isDark,
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildPerformanceCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
    required double progress,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  const Color(0xFF1A1F29),
                  const Color(0xFF0F1419),
                ]
              : [
                  Colors.white,
                  const Color(0xFFFFFBF0),
                ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? const Color(0xFF2C3E50).withOpacity(0.3)
              : color.withOpacity(0.2),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? const Color(0xFF0F1419).withOpacity(0.3)
                : color.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: color,
                  size: 16,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.figtree(
                    fontSize: 12,
                    color: const Color(0xFF7B8794),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: GoogleFonts.figtree(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          Text(
            subtitle,
            style: GoogleFonts.figtree(
              fontSize: 11,
              color: const Color(0xFF7B8794),
            ),
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: progress.clamp(0.0, 1.0),
            backgroundColor: isDark
                ? const Color(0xFF2C3E50).withOpacity(0.3)
                : Colors.grey[300],
            valueColor: AlwaysStoppedAnimation<Color>(color),
            minHeight: 4,
          ),
        ],
      ),
    );
  }

  // Gün temasını getiren helper metod
  Map<String, dynamic> _getDayThemeInfo(int day) {
    switch (day) {
      case 1:
        return {
          'theme': 'Temel Atma Günü',
          'icon': Icons.foundation,
          'color': const Color(0xFF3B82F6),
          'emoji': '🎯',
          'description': 'Güçlü temel oluşturma zamanı'
        };
      case 2:
        return {
          'theme': 'Seviye Belirleme Günü',
          'icon': Icons.assessment,
          'color': const Color(0xFF6366F1),
          'emoji': '📊',
          'description': 'Hangi seviyede olduğunu keşfet'
        };
      case 3:
        return {
          'theme': 'Güven Tazeleme Günü',
          'icon': Icons.psychology,
          'color': const Color(0xFF10B981),
          'emoji': '✨',
          'description': 'Kendine güvenini artır'
        };
      case 4:
        return {
          'theme': 'Başarı Günü',
          'icon': Icons.emoji_events,
          'color': const Color(0xFFF59E0B),
          'emoji': '🏆',
          'description': 'Hızlı kazanımlar elde et'
        };
      case 5:
        return {
          'theme': 'Bağlantı Kurma Günü',
          'icon': Icons.link,
          'color': const Color(0xFF8B5CF6),
          'emoji': '🚀',
          'description': 'Konular arası köprü kur'
        };
      case 6:
        return {
          'theme': 'İlerleme Günü',
          'icon': Icons.trending_up,
          'color': const Color(0xFFEF4444),
          'emoji': '📈',
          'description': 'Yeni ufuklar keşfet'
        };
      case 7:
        return {
          'theme': 'Başarı Kutlama Günü',
          'icon': Icons.celebration,
          'color': const Color(0xFFFF6B6B),
          'emoji': '🎉',
          'description': 'Başarılarını kutla ve ileriye bak'
        };
      default:
        return {
          'theme': 'Çalışma Günü',
          'icon': Icons.book,
          'color': const Color(0xFF64748B),
          'emoji': '📚',
          'description': 'Öğrenmeye devam et'
        };
    }
  }

  // 7. gün AI raporu göster
  void _showAIPerformanceReport() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        contentPadding: EdgeInsets.zero,
        content: Container(
          width: MediaQuery.of(context).size.width * 0.9,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                const Color(0xFFF57C00).withOpacity(0.1),
                Colors.white,
              ],
            ),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            const Color(0xFFF57C00),
                            const Color(0xFFFFAB40),
                          ],
                        ),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.analytics,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      '🎉 Haftalık Performans Raporu',
                      style: GoogleFonts.figtree(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),

              // Content
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Text(
                        'Harika bir hafta geçirdin! 🌟\n\nBu hafta boyunca kendini geliştirdin ve önemli adımlar attın. Bu sadece başlangıç - premium üyelikle bu momentumu devam ettirip hedeflerine daha hızlı ulaşabilirsin.',
                        style: GoogleFonts.figtree(
                          fontSize: 16,
                          height: 1.5,
                          color: Colors.black87,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // İstatistikler
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _buildStatItem('Tamamlanan\nGörevler',
                            '$_completedTasks', Icons.check_circle),
                        _buildStatItem(
                            'Aktif\nGünler', '7', Icons.calendar_today),
                        _buildStatItem('Kazanılan\nXP',
                            '${_completedTasks * 50}', Icons.star),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Premium CTA Button
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Container(
                  width: double.infinity,
                  height: 56,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFFF57C00),
                        const Color(0xFFE65100),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFF57C00).withOpacity(0.3),
                        blurRadius: 12,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pop();
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const SubscriptionScreen(),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.rocket_launch, color: Colors.white),
                        const SizedBox(width: 12),
                        Text(
                          'Premium\'a Geçerek Yolculuğuna Devam Et',
                          style: GoogleFonts.figtree(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Close Button
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(
                  'Daha Sonra',
                  style: GoogleFonts.figtree(
                    fontSize: 14,
                    color: Colors.grey.shade600,
                  ),
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF57C00).withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: const Color(0xFFF57C00),
            size: 24,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: GoogleFonts.figtree(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: const Color(0xFFF57C00),
          ),
        ),
        Text(
          label,
          style: GoogleFonts.figtree(
            fontSize: 12,
            color: Colors.grey.shade600,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
