import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:showcaseview/showcaseview.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/long_term_plan.dart';
import '../providers/calendar_provider.dart';
// import '../services/plan_service.dart';
import '../services/premium_service.dart';
import '../theme/app_theme.dart';
import '../utils/calendar_helpers.dart';
import '../widgets/locked_day_card.dart';
import '../widgets/calendar/calendar_header_section.dart';
import '../widgets/calendar/premium_calendar_widget.dart';
import '../widgets/calendar/selected_day_details.dart';
import '../widgets/calendar/task_tile.dart';
import '../widgets/calendar/calendar_day_cell.dart';
import '../screens/feynman_cycle_screen.dart';
import '../screens/focus_mode_screen.dart';
import 'settings_screen.dart';
import '../services/providers.dart';
import '../services/api_client.dart';

enum DayCellType {
  normal,
  selected,
  today,
  outside,
}

class CalendarViewScreen extends ConsumerStatefulWidget {
  const CalendarViewScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<CalendarViewScreen> createState() => _CalendarViewScreenState();
}

class _CalendarViewScreenState extends ConsumerState<CalendarViewScreen>
    with TickerProviderStateMixin {
  // ViewModel'e taşındı: plan/premium/loading/focusedDay/selectedDay/events/selectedTasks/isEditMode

  // Onboarding showcase keys - YENİ EKLENEN
  final GlobalKey _calendarKey = GlobalKey();
  final GlobalKey _editButtonKey = GlobalKey();
  final GlobalKey _taskTileKey = GlobalKey();
  final GlobalKey _dayItemKey = GlobalKey();
  bool _hasShownTutorial = false;
  bool _dayItemKeyUsed = false; // Day item key'i sadece bir kez kullanmak için
  bool _taskTileKeyUsed =
      false; // Task tile key'i sadece bir kez kullanmak için

  // Streak bilgileri ViewModel'e taşındı

  // Animasyon kontrolcüleri
  late AnimationController _viewToggleController;
  late AnimationController _taskListController;

  // Riverpod state erişimleri build içinde `ref.watch` ile yapılacak

  // Gün seçimi için ViewModel'e delege eden yardımcı metot
  void _onDaySelected(DateTime selected, DateTime focused) {
    ref.read(calendarNotifierProvider.notifier).setSelectedDay(selected, focused);
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(calendarNotifierProvider.notifier).initialize();
    });
    // Animasyon kontrolcüleri ve tutorial kontrolü burada kalabilir
    _viewToggleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _taskListController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
  }

  // _initializeApp içindeki locale ve animasyon başlatma parçalarını koru

  Future<void> _initializeLocale() async {
    try {
      await initializeDateFormatting('tr_TR', null);
      debugPrint('✅ Türkçe locale başarıyla başlatıldı');
    } catch (e) {
      debugPrint('⚠️ Türkçe locale başlatılamadı, varsayılan kullanılacak: $e');
      try {
        await initializeDateFormatting();
        debugPrint('✅ Varsayılan locale başarıyla başlatıldı');
      } catch (e) {
        debugPrint('❌ Varsayılan locale de başlatılamadı: $e');
      }
    }
  }

  String _getFormattedMonthYear(DateTime date) {
    // Türkçe ay isimleri
    final months = [
      'Ocak',
      'Şubat',
      'Mart',
      'Nisan',
      'Mayıs',
      'Haziran',
      'Temmuz',
      'Ağustos',
      'Eylül',
      'Ekim',
      'Kasım',
      'Aralık'
    ];

    try {
      // Önce Türkçe locale ile deneyelim
      return DateFormat('MMMM yyyy', 'tr_TR').format(date);
    } catch (e) {
      debugPrint('Türkçe DateFormat hatası, manuel format kullanılacak: $e');
      try {
        // Varsayılan locale ile deneyelim
        return DateFormat('MMMM yyyy').format(date);
      } catch (e) {
        debugPrint(
            'DateFormat tamamen başarısız, manuel format kullanılacak: $e');
        // Fallback: Manuel Türkçe format
        return '${months[date.month - 1]} ${date.year}';
      }
    }
  }

  // Haftanın günlerini Türkçe olarak döndür
  List<String> _getTurkishWeekdays() {
    return ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  }

  @override
  void dispose() {
    _viewToggleController.dispose();
    _taskListController.dispose();
    super.dispose();
  }

  // _loadPlan ViewModel'e taşındı

  // _checkPremiumStatus ViewModel'e taşındı

  // İlk kez kullanıcı kontrolü ve tutorial başlatma
  void _checkFirstTimeUser() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final hasSeenTutorial = prefs.getBool('calendar_tutorial_shown') ?? false;

      setState(() {
        _hasShownTutorial = hasSeenTutorial;
      });

      // Eğer tutorial gösterilmediyse ve plan yüklenmişse başlat
      if (!hasSeenTutorial) {
        // Biraz gecikme ile tutorial'i başlat
        Future.delayed(const Duration(milliseconds: 1500), () {
          final calState = ref.read(calendarNotifierProvider);
          if (mounted && calState.currentPlan != null) {
            _startShowcase();
          }
        });
      }
    } catch (e) {
      debugPrint('Tutorial kontrolü başarısız: $e');
    }
  }

  // Tutorial'i başlatan fonksiyon
  void _startShowcase() {
    try {
      ShowCaseWidget.of(context).startShowCase([
        _calendarKey,
        _dayItemKey,
        _taskTileKey,
        _editButtonKey,
      ]);
    } catch (e) {
      debugPrint('Showcase başlatılamadı: $e');
    }
  }

  // Tutorial'i tamamlandı olarak işaretle
  Future<void> _markTutorialAsCompleted() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('calendar_tutorial_shown', true);
      setState(() {
        _hasShownTutorial = true;
      });
    } catch (e) {
      debugPrint('Tutorial tamamlama kaydedilemedi: $e');
    }
  }

  void _loadCalendarEvents(LongTermPlan plan) {
    final Map<DateTime, List<DailyTask>> events = {};

    for (final week in plan.weeks) {
      for (final day in week.days) {
        try {
          final date = DateTime.parse(day.date);
          events[date] = day.dailyTasks;
        } catch (e) {
          debugPrint('Tarih parse hatası: $e');
        }
      }
    }

    // ViewModel artık etkinlikleri yönetiyor; bu eski metod kullanılmıyor
  }

  // _calculateStreakInfo ViewModel'e taşındı

  void _updateSelectedDayTasks() {
    // ViewModel'e taşındı
  }

  // _onDaySelected ViewModel'e taşındı

  // Düzenleme modunu açıp kapatma fonksiyonu
  // _toggleEditMode ViewModel'e taşındı

  void _handleUpgrade() {
    // Test amaçlı premium upgrade
    // ignore: deprecated_member_use
    final apiClient = ref.read(apiClientProvider);
    PremiumService(apiClient).upgradeToPremium().then((_) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('🎉 Premium üyeliğiniz aktif edildi!'),
          backgroundColor: AppTheme.primaryColor,
          action: SnackBarAction(
            label: 'Harika!',
            textColor: Colors.white,
            onPressed: () {},
          ),
        ),
      );
      // Premium durumu ViewModel tarafından yönetiliyor
    }).catchError((error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Hata: $error'),
          backgroundColor: Colors.red,
        ),
      );
    });
  }

  // Kullanıcı işlemlerini yöneten ana fonksiyon ViewModel'e taşındı
  /* Future<void> handleUserAction({
    required String actionType,
    DailyTask? task,
    String? subject,
    String? topic,
    String? unit,
    int? durationInMinutes,
    String? date,
  }) async {
    try {
      setState(() {
        _isLoading = true;
      });

      switch (actionType) {
        case 'ADD_TASK':
          await _addNewTask(
            date: date!,
            subject: subject!,
            topic: topic!,
            unit: unit,
            durationInMinutes: durationInMinutes ?? 60,
          );
          break;

        case 'DELETE_TASK':
          await _deleteTask(task!, date!);
          break;

        case 'UPDATE_TASK':
          await _updateTask(
            task!,
            date!,
            subject: subject,
            topic: topic,
            unit: unit,
            durationInMinutes: durationInMinutes,
          );
          break;

        case 'TOGGLE_COMPLETION':
          await _updateTaskCompletion(task!, date!);
          break;

        default:
          throw Exception('Bilinmeyen işlem türü: $actionType');
      }

      // UI'yı güncelle
      await _refreshPlan();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_getSuccessMessage(actionType)),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Hata: $error'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  } */

  /* String _getSuccessMessage(String actionType) {
    switch (actionType) {
      case 'ADD_TASK':
        return '✅ Yeni görev başarıyla eklendi';
      case 'DELETE_TASK':
        return '🗑️ Görev başarıyla silindi';
      case 'UPDATE_TASK':
        return '✏️ Görev başarıyla güncellendi';
      case 'TOGGLE_COMPLETION':
        return '🎉 Görev durumu güncellendi';
      default:
        return '✅ İşlem başarıyla tamamlandı';
    }
  } */

  /* Future<void> _refreshPlan() async {
    try {
      final planData = await _planService.getUserPlan();
      if (planData != null) {
        final plan = LongTermPlan.fromMap(planData);
        setState(() {
          _currentPlan = plan;
        });
        _loadCalendarEvents(plan);
        _calculateStreakInfo(plan);
      }
    } catch (e) {
      debugPrint('Plan yenilenirken hata: $e');
    }
  } */

  // Görev ekleme dialog'unu gösteren fonksiyon
  void _showAddTaskDialog() {
    ref.read(calendarNotifierProvider.notifier).showTaskFormModal(context);
  }

  // Görev düzenleme dialog'u ViewModel'e taşındı
  void _showEditTaskDialog(DailyTask task) {
    ref.read(calendarNotifierProvider.notifier).showTaskFormModal(context, task: task);
  }

  // Görev silme onay dialog'u ViewModel'e taşındı
  void _confirmDeleteTask(DailyTask task) {
    ref.read(calendarNotifierProvider.notifier).confirmDeleteTask(context, task);
  }

  // Yeni görev ekleme fonksiyonu
  Future<void> _addNewTask({
    required String date,
    required String subject,
    required String topic,
    String? unit,
    required int durationInMinutes,
  }) async {
    try {
      // Yeni görev objesi oluştur
      final newTask = DailyTask(
        subject: subject,
        topic: topic,
        durationInMinutes: durationInMinutes,
        isCompleted: false,
        feynman: FeynmanStep(
          explanation: '$topic konusu için açıklama',
          analogyPrompt: '$topic konusunu günlük hayatta neye benzetebiliriz?',
          quiz: [
            QuizQuestion(
              question: '$topic ile ilgili soru',
              options: ['Seçenek A', 'Seçenek B', 'Seçenek C'],
              correctAnswer: 'Seçenek A',
            ),
          ],
        ),
      );

      // Firestore'a kaydet (backend implementasyonu gerekli - şimdilik placeholder)
      // await _planService.addTaskToDate(date, newTask);

      // Local state'i güncelle
      final dateTime = DateTime.parse(date);
      // Riverpod sürümünde local ekleme Notifier içinde yapılacak
      // Burada yalnızca UI refresh yeterli
      setState(() {});
    } catch (e) {
      rethrow;
    }
  }

  // Görev silme fonksiyonu
  Future<void> _deleteTask(DailyTask task, String date) async {
    try {
      // Firestore'dan sil (backend implementasyonu gerekli - şimdilik placeholder)
      // await _planService.deleteTaskFromDate(date, task);

      // Local state'i güncelle
      final dateTime = DateTime.parse(date);
      setState(() {});
    } catch (e) {
      rethrow;
    }
  }

  // Görev güncelleme fonksiyonu
  Future<void> _updateTask(
    DailyTask task,
    String date, {
    String? subject,
    String? topic,
    String? unit,
    int? durationInMinutes,
  }) async {
    try {
      // Güncellenmiş görev oluştur
      final updatedTask = DailyTask(
        subject: subject ?? task.subject,
        topic: topic ?? task.topic,
        durationInMinutes: durationInMinutes ?? task.durationInMinutes,
        isCompleted: task.isCompleted,
        feynman: task.feynman,
      );

      // Firestore'da güncelle (backend implementasyonu gerekli - şimdilik placeholder)
      // await _planService.updateTaskInDate(date, task, updatedTask);

      // Local state'i güncelle
      final dateTime = DateTime.parse(date);
      setState(() {});
    } catch (e) {
      rethrow;
    }
  }

  // Görev tamamlama durumunu güncelleme fonksiyonu
  Future<void> _updateTaskCompletion(DailyTask task, String date) async {
    try {
      final updatedTask = DailyTask(
        subject: task.subject,
        topic: task.topic,
        durationInMinutes: task.durationInMinutes,
        isCompleted: !task.isCompleted,
        feynman: task.feynman,
      );

      // Firestore'da güncelle (backend implementasyonu gerekli - şimdilik placeholder)
      // await _planService.updateTaskInDate(date, task, updatedTask);

      // Local state'i güncelle
      final dateTime = DateTime.parse(date);
      setState(() {});
    } catch (e) {
      rethrow;
    }
  }

  @override
  Widget build(BuildContext context) {
    final calendarState = ref.watch(calendarNotifierProvider);
    final calendarNotifier = ref.read(calendarNotifierProvider.notifier);
    return Builder(
      builder: (context) {
        if (calendarState.isLoading) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (calendarState.errorMessage != null) {
          return Scaffold(
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(calendarState.errorMessage!),
              ),
            ),
          );
        }

        return ShowCaseWidget(
      onStart: (index, key) {
        debugPrint('onStart: $index, $key');
      },
      onComplete: (index, key) {
        debugPrint('onComplete: $index, $key');
        if (index == 3) {
          // Son showcase tamamlandığında
          _markTutorialAsCompleted();
        }
      },
      blurValue: 1,
      builder: (context) => Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        // AppBar kaldırıldı - MainLayout kullanılıyor
        body: _buildBodyWithViewModel(context),
      ),
    );
  },
);
  }

  Widget _buildBodyWithViewModel(BuildContext context) {
    final calendarState = ref.watch(calendarNotifierProvider);
    final calendarNotifier = ref.read(calendarNotifierProvider.notifier);
    final plan = calendarState.currentPlan;
    if (plan == null) {
      return _buildNoPlanView();
    }
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 500),
      transitionBuilder: (Widget child, Animation<double> animation) {
        return SlideTransition(
          position: animation.drive(
            Tween(begin: const Offset(1.0, 0.0), end: Offset.zero),
          ),
          child: child,
        );
      },
      child: _buildCalendarView(plan),
    );
  }

  Widget _buildNoPlanView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.calendar_today_outlined,
            size: 80,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 24),
          Text(
            'Planın henüz oluşturulmamış',
            style: GoogleFonts.montserrat(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: Theme.of(context).textTheme.bodyLarge?.color,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Çalışma planın oluşturulduktan sonra\ntakvim görünümünü kullanabilirsin',
            textAlign: TextAlign.center,
            style: GoogleFonts.lato(
              fontSize: 16,
              color: Theme.of(context).textTheme.bodyMedium?.color,
            ),
          ),
          const SizedBox(height: 32),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back),
            label: const Text('Geri Dön'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCalendarView(LongTermPlan plan) {
    final allDays = plan.weeks.expand((week) => week.days).toList();

    return Stack(
      children: [
        // Ana kaydırılabilir içerik
        CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // Başlık ve durum paneli
            const SliverToBoxAdapter(
              child: CalendarHeaderSection(),
            ),

            // Premium takvim widget'ı
            SliverToBoxAdapter(
              child: PremiumCalendarWidget(
                allDays: allDays,
                dayCellBuilder: (context, date, days, type) =>
                    CalendarDayCell(date: date, allDays: days, type: type),
              ),
            ),

            // Seçilen günün detay paneli
            const SliverToBoxAdapter(
              child: SelectedDayDetails(),
            ),

            // Alt boşluk (sabit widget için)
            const SliverToBoxAdapter(
              child: SizedBox(height: 100),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildHeaderSection() {
    final calendarState = ref.watch(calendarNotifierProvider);
    final calendarNotifier = ref.read(calendarNotifierProvider.notifier);
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor.withValues(alpha: 0.1),
            AppTheme.primaryColor.withValues(alpha: 0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.calendar_month_rounded,
                  color: AppTheme.primaryColor,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Dijital Ajanda',
                      style: GoogleFonts.montserrat(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: Theme.of(context).textTheme.bodyLarge?.color,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _getMotivationalMessage(),
                      style: GoogleFonts.lato(
                        fontSize: 14,
                        color: Theme.of(context).textTheme.bodyMedium?.color,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (calendarState.currentStreak > 0) ...[
            const SizedBox(height: 20),
            _buildStreakIndicator(),
          ],
        ],
      ),
    );
  }

  String _getMotivationalMessage() {
    final hour = DateTime.now().hour;
    if (hour < 12) {
      return 'Günaydın! Bugün de harika şeyler başaracaksın 🌅';
    } else if (hour < 18) {
      return 'Güzel bir gün geçiriyorsun! Devam et 💪';
    } else {
      return 'Günün nasıl geçti? Yarın için hazırlan 🌙';
    }
  }

  Widget _buildStreakIndicator() {
    final calendarState = ref.watch(calendarNotifierProvider);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? Colors.orange.shade800.withValues(alpha: 0.2)
            : Colors.orange.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.orange.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.orange.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Text(
              '🔥',
              style: TextStyle(fontSize: 20),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${calendarState.currentStreak} günlük seri!',
                  style: GoogleFonts.montserrat(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.orange.shade700,
                  ),
                ),
                Text(
                  'Harika gidiyorsun, bu momentum\'u koru!',
                  style: GoogleFonts.lato(
                    fontSize: 12,
                    color: Colors.orange.shade600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPremiumCalendar(List<Day> allDays) {
    return Showcase(
      key: _calendarKey,
      description:
          'Burası senin kişisel ajandan! Görevlerin olan günler renkli görünecek. Her gün farklı yoğunlukta görevlerin var 📅',
      targetBorderRadius: BorderRadius.circular(24),
      child: Container(
        margin: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 20,
              spreadRadius: 0,
              offset: const Offset(0, 4),
            ),
            BoxShadow(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              blurRadius: 30,
              spreadRadius: -5,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Column(
            children: [
              // Takvim başlığı
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppTheme.primaryColor.withValues(alpha: 0.1),
                      AppTheme.primaryColor.withValues(alpha: 0.05),
                    ],
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.event_note_rounded,
                      color: AppTheme.primaryColor,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _getFormattedMonthYear(ref.watch(calendarNotifierProvider).focusedDay),
                      style: GoogleFonts.montserrat(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).textTheme.bodyLarge?.color,
                      ),
                    ),
                    const Spacer(),
                    // Navigasyon butonları
                    Row(
                      children: [
                        // Önceki ay butonu
                        GestureDetector(
                           onTap: () {
                             final cs = ref.read(calendarNotifierProvider);
                             ref.read(calendarNotifierProvider.notifier).setSelectedDay(cs.focusedDay, DateTime(cs.focusedDay.year, cs.focusedDay.month - 1));
                           },
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Theme.of(context).brightness ==
                                      Brightness.dark
                                  ? Colors.grey[800]
                                  : Colors.grey[100],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              Icons.chevron_left,
                              color:
                                  Theme.of(context).textTheme.bodyMedium?.color,
                              size: 20,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Sonraki ay butonu
                        GestureDetector(
                           onTap: () {
                             final cs = ref.read(calendarNotifierProvider);
                             ref.read(calendarNotifierProvider.notifier).setSelectedDay(cs.focusedDay, DateTime(cs.focusedDay.year, cs.focusedDay.month + 1));
                           },
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Theme.of(context).brightness ==
                                      Brightness.dark
                                  ? Colors.grey[800]
                                  : Colors.grey[100],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              Icons.chevron_right,
                              color:
                                  Theme.of(context).textTheme.bodyMedium?.color,
                              size: 20,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (ref.watch(calendarNotifierProvider).selectedDay != null)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          'Seçili',
                          style: GoogleFonts.lato(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ),
                  ],
                ),
              ),

              // TableCalendar
              Padding(
                padding: const EdgeInsets.all(20),
                child: TableCalendar<DailyTask>(
                  firstDay: DateTime.now().subtract(const Duration(days: 365)),
                  lastDay: DateTime.now().add(const Duration(days: 365)),
                   focusedDay: ref.watch(calendarNotifierProvider).focusedDay,
                   selectedDayPredicate: (day) => isSameDay(ref.watch(calendarNotifierProvider).selectedDay, day),
                   eventLoader: (day) {
                     final cs = ref.watch(calendarNotifierProvider);
                     return CalendarHelpers.getTasksForDate(day, cs.events);
                   },
                  startingDayOfWeek: StartingDayOfWeek.monday,
                  locale: 'tr_TR',

                  // Premium tasarım ayarları
                  rowHeight: 65,
                  daysOfWeekHeight: 45,

                  calendarStyle: CalendarStyle(
                    outsideDaysVisible: false,
                    weekendTextStyle: GoogleFonts.lato(
                      color: Colors.red.shade400,
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),

                    // Varsayılan gün stili
                    defaultTextStyle: GoogleFonts.lato(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                      color: Theme.of(context).textTheme.bodyLarge?.color,
                    ),

                    // Seçili gün - animasyonlu tasarım
                    selectedDecoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppTheme.primaryColor,
                          AppTheme.primaryColor.withValues(alpha: 0.8),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primaryColor.withValues(alpha: 0.4),
                          blurRadius: 8,
                          spreadRadius: 0,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    selectedTextStyle: GoogleFonts.lato(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),

                    // Bugün
                    todayDecoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppTheme.primaryColor.withValues(alpha: 0.5),
                        width: 2,
                      ),
                    ),
                    todayTextStyle: GoogleFonts.lato(
                      color: AppTheme.primaryColor,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),

                    // Marker'lar
                    markerDecoration: BoxDecoration(
                      color: AppTheme.accentColor,
                      shape: BoxShape.circle,
                    ),
                    markersMaxCount: 4,
                    markerSize: 7,
                  ),

                  // Header tasarımı - Tamamen gizle
                  headerVisible: false, // Header'ı tamamen gizle
                  headerStyle: HeaderStyle(
                    formatButtonVisible: false,
                    titleCentered: false,
                    headerPadding: EdgeInsets.zero,
                    titleTextStyle:
                        const TextStyle(fontSize: 0), // Tamamen gizle
                    leftChevronVisible:
                        false, // Kendi butonlarımızı kullanacağız
                    rightChevronVisible:
                        false, // Kendi butonlarımızı kullanacağız
                  ),

                  // Haftanın günleri - Türkçe
                  daysOfWeekStyle: DaysOfWeekStyle(
                    weekdayStyle: GoogleFonts.montserrat(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Theme.of(context).textTheme.bodyMedium?.color,
                      letterSpacing: 0.5,
                    ),
                    weekendStyle: GoogleFonts.montserrat(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Colors.red.shade400,
                      letterSpacing: 0.5,
                    ),
                  ),

                  onDaySelected: (selected, focused) => ref.read(calendarNotifierProvider.notifier).setSelectedDay(selected, focused),

                  // Özel gün tasarımları
                  calendarBuilders: CalendarBuilders(
                    defaultBuilder: (context, date, focusedDay) {
                      return CalendarDayCell(
                          date: date, allDays: allDays, type: DayCellType.normal);
                    },
                    selectedBuilder: (context, date, focusedDay) {
                      return CalendarDayCell(
                          date: date, allDays: allDays, type: DayCellType.selected);
                    },
                    todayBuilder: (context, date, focusedDay) {
                      return CalendarDayCell(
                          date: date, allDays: allDays, type: DayCellType.today);
                    },
                    outsideBuilder: (context, date, focusedDay) {
                      return CalendarDayCell(
                          date: date, allDays: allDays, type: DayCellType.outside);
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Eski liste görünümü kullanılmıyor (modüler takvim ile değiştirildi)

  Widget _buildPremiumBanner() {
    final remainingDays = 7; // Mock implementation

    return Container(
      margin: const EdgeInsets.all(16.0),
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor.withValues(alpha: 0.1),
            AppTheme.primaryColor.withValues(alpha: 0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.star_border,
            color: AppTheme.primaryColor,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ücretsiz Deneme',
                  style: GoogleFonts.montserrat(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimaryColor,
                  ),
                ),
                Text(
                  remainingDays > 0
                      ? '$remainingDays gün kaldı'
                      : 'Premium\'a geçerek tüm plana erişin',
                  style: GoogleFonts.lato(
                    fontSize: 14,
                    color: AppTheme.textSecondaryColor,
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: _handleUpgrade,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              elevation: 2,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: Text(
              'Premium',
              style: GoogleFonts.montserrat(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIntensityLegend() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            spreadRadius: 1,
          ),
        ],
        border: Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.info_outline,
                color: AppTheme.primaryColor,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Görsel Kılavuz',
                style: GoogleFonts.montserrat(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimaryColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Yoğunluk renkleri
          Wrap(
            spacing: 16,
            runSpacing: 8,
            children: [
              _buildLegendItem(
                color: Colors.blue.shade100,
                label: '1h',
                description: 'Az',
              ),
              _buildLegendItem(
                color: Colors.blue.shade200,
                label: '2h',
                description: 'Orta',
              ),
              _buildLegendItem(
                color: Colors.blue.shade300,
                label: '3h',
                description: 'Yoğun',
              ),
              _buildLegendItem(
                color: Colors.blue.shade400,
                label: '4h+',
                description: 'Çok Yoğun',
              ),
            ],
          ),

          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 12),

          // İlerleme göstergeleri
          Row(
            children: [
              // Progress bar örneği
              Container(
                width: 24,
                height: 12,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Stack(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    Container(
                      width: 24 * 0.7,
                      decoration: BoxDecoration(
                        color: Colors.green.shade400,
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'İlerleme Çubuğu',
                style: GoogleFonts.lato(
                  fontSize: 12,
                  color: AppTheme.textSecondaryColor,
                ),
              ),
              const SizedBox(width: 16),

              // Tamamlanma göstergesi
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: Colors.green.shade400,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check,
                  size: 8,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Tamamlandı',
                style: GoogleFonts.lato(
                  fontSize: 12,
                  color: AppTheme.textSecondaryColor,
                ),
              ),
              const SizedBox(width: 16),

              // Yoğunluk göstergesi
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: Colors.red.shade400,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Çok Yoğun',
                style: GoogleFonts.lato(
                  fontSize: 12,
                  color: AppTheme.textSecondaryColor,
                ),
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 600.ms).slideY(begin: -0.3);
  }

  Widget _buildLegendItem({
    required Color color,
    required String label,
    required String description,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(
              color: AppTheme.primaryColor.withValues(alpha: 0.3),
              width: 1,
            ),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: GoogleFonts.lato(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimaryColor,
          ),
        ),
        const SizedBox(width: 4),
        Text(
          description,
          style: GoogleFonts.lato(
            fontSize: 10,
            color: AppTheme.textSecondaryColor,
          ),
        ),
      ],
    );
  }

  Widget _buildSelectedDayDetails() {
    final calendarState = ref.watch(calendarNotifierProvider);
    if (calendarState.selectedDay == null) {
      return Container(
        margin: const EdgeInsets.all(20),
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 15,
              spreadRadius: 0,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.touch_app_rounded,
                size: 32,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Bir gün seçin',
              style: GoogleFonts.montserrat(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).textTheme.bodyLarge?.color,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Takvimden bir gün seçerek o günün\ngörevlerini ve detaylarını görebilirsiniz',
              textAlign: TextAlign.center,
              style: GoogleFonts.lato(
                fontSize: 14,
                color: Theme.of(context).textTheme.bodyMedium?.color,
                height: 1.4,
              ),
            ),
          ],
        ),
      );
    }

    final selected = calendarState.selectedDay;
    if (selected == null) {
      return Container(
        margin: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(20),
        ),
        padding: const EdgeInsets.all(24),
        child: Text(
          'Bir gün seçin',
          style: GoogleFonts.montserrat(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).textTheme.bodyLarge?.color,
          ),
        ),
      );
    }
    final dayTasks = CalendarHelpers.getTasksForDate(selected, calendarState.events);
    final formattedDate = CalendarHelpers.formatDateTurkish(selected);
    final completedTasks = dayTasks.where((task) => task.isCompleted).length;
    final totalDuration = dayTasks.fold<int>(
      0,
      (sum, task) => sum + task.durationInMinutes,
    );

    return Container(
      margin: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            spreadRadius: 0,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Başlık paneli
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.primaryColor.withValues(alpha: 0.1),
                  AppTheme.primaryColor.withValues(alpha: 0.05),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            formattedDate,
                            style: GoogleFonts.montserrat(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color:
                                  Theme.of(context).textTheme.bodyLarge?.color,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${dayTasks.length} görev • ${totalDuration} dakika',
                            style: GoogleFonts.lato(
                              fontSize: 14,
                              color:
                                  Theme.of(context).textTheme.bodyMedium?.color,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // İlerleme göstergesi
                    if (dayTasks.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: completedTasks == dayTasks.length
                              ? Colors.green.withValues(alpha: 0.15)
                              : AppTheme.primaryColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          children: [
                            Text(
                              '$completedTasks/${dayTasks.length}',
                              style: GoogleFonts.montserrat(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: completedTasks == dayTasks.length
                                    ? Colors.green
                                    : AppTheme.primaryColor,
                              ),
                            ),
                            Text(
                              'tamamlandı',
                              style: GoogleFonts.lato(
                                fontSize: 10,
                                color: completedTasks == dayTasks.length
                                    ? Colors.green
                                    : AppTheme.primaryColor,
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

          // Görev listesi
          if (dayTasks.isEmpty)
            Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.beach_access_rounded,
                        size: 32,
                        color: Colors.green,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Dinlenme Günü',
                      style: GoogleFonts.montserrat(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).textTheme.bodyLarge?.color,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Bu gün için planlanmış görev yok.\nKeyifli bir dinlenme günü geçir!',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.lato(
                        fontSize: 14,
                        color: Theme.of(context).textTheme.bodyMedium?.color,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Column(
              children: [
                // Görev listesi
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: dayTasks.length,
                  itemBuilder: (context, index) => TaskTile(task: dayTasks[index]),
                ),

                // Düzenleme modundayken "Yeni Görev Ekle" butonu
                if (ref.watch(calendarNotifierProvider).isEditMode && ref.watch(calendarNotifierProvider).selectedDay != null)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.all(20),
                    child: ElevatedButton.icon(
                      onPressed: () => ref.read(calendarNotifierProvider.notifier).showTaskFormModal(context),
                      icon: const Icon(Icons.add_task_rounded),
                      label: const Text('Yeni Görev Ekle'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 2,
                      ),
                    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.3),
                  ),
              ],
            ),
        ],
      ),
    );
  }

  /* Widget _buildPremiumTaskTile(DailyTask task, int index) {
    Widget taskTile = Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: task.isCompleted
              ? Colors.green.withValues(alpha: 0.05)
              : Theme.of(context).brightness == Brightness.dark
                  ? Colors.grey[850]
                  : Colors.grey[50],
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: task.isCompleted
                ? Colors.green.withValues(alpha: 0.3)
                : Theme.of(context).brightness == Brightness.dark
                    ? Colors.grey[700]!
                    : Colors.grey[200]!,
            width: 1,
          ),
          boxShadow: task.isCompleted
              ? [
                  BoxShadow(
                    color: Colors.green.withValues(alpha: 0.1),
                    blurRadius: 8,
                    spreadRadius: 0,
                    offset: const Offset(0, 2),
                  ),
                ]
              : [],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Özel checkbox
                GestureDetector(
                  onTap: () {
                    HapticFeedback.mediumImpact();
                    _toggleTaskCompletion(task);
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color:
                          task.isCompleted ? Colors.green : Colors.transparent,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: task.isCompleted ? Colors.green : Colors.grey,
                        width: 2,
                      ),
                    ),
                    child: task.isCompleted
                        ? const Icon(
                            Icons.check_rounded,
                            size: 16,
                            color: Colors.white,
                          )
                        : null,
                  ),
                ),

                const SizedBox(width: 12),

                // Ders etiketi - Flexible ile responsive
                Flexible(
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      task.subject,
                      style: GoogleFonts.figtree(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primaryColor,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),

                const Spacer(),

                // Süre ve durum veya düzenleme modunda butonlar
                if (_isEditMode)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Güncelleme butonu
                      IconButton(
                        onPressed: () => ref.read(calendarNotifierProvider.notifier).showTaskFormModal(context, task: task),
                        icon: Icon(
                          Icons.edit_rounded,
                          size: 18,
                          color: Colors.blue.shade600,
                        ),
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(
                          minWidth: 28,
                          minHeight: 28,
                        ),
                        tooltip: 'Düzenle',
                      ),

                      // Silme butonu
                      IconButton(
                        onPressed: () => ref.read(calendarNotifierProvider.notifier).confirmDeleteTask(context, task),
                        icon: Icon(
                          Icons.delete_outline_rounded,
                          size: 18,
                          color: Colors.red.shade600,
                        ),
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(
                          minWidth: 28,
                          minHeight: 28,
                        ),
                        tooltip: 'Sil',
                      ),
                    ],
                  )
                else
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${task.durationInMinutes} dk',
                        style: GoogleFonts.lato(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context).textTheme.bodySmall?.color,
                        ),
                      ),
                      if (task.isCompleted)
                        Container(
                          margin: const EdgeInsets.only(top: 2),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.green.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'Tamamlandı',
                            style: GoogleFonts.lato(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: Colors.green,
                            ),
                          ),
                        ),
                    ],
                  ),
              ],
            ),

            const SizedBox(height: 12),

            // Konu başlığı
            Text(
              task.topic,
              style: GoogleFonts.montserrat(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).textTheme.bodyLarge?.color,
                decoration:
                    task.isCompleted ? TextDecoration.lineThrough : null,
                decorationColor: Colors.green,
              ),
            ),

            if (task.feynman != null) ...[
              const SizedBox(height: 8),
              Text(
                task.feynman!.explanation,
                style: GoogleFonts.lato(
                  fontSize: 14,
                  color: Theme.of(context).textTheme.bodyMedium?.color,
                  height: 1.3,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ),
    );

    // İlk task'a showcase ekle
    if (index == 0 && !_hasShownTutorial && !_taskTileKeyUsed) {
      _taskTileKeyUsed = true; // Key'i kullanıldı olarak işaretle
      return Showcase(
        key: _taskTileKey,
        description:
            'Görevini tamamladığında bu kutucuğa tıklayarak üzerini çizebilirsin. Tıkla ve ilerlemeyi hisset! ✅',
        targetBorderRadius: BorderRadius.circular(16),
        child: taskTile,
      );
    }

    return taskTile;
  } */

  /* Widget _buildCustomDayCell(
      DateTime date, List<Day> allDays, DayCellType type) {
    final dayTasks = CalendarHelpers.getTasksForDate(date, _events);
    final hasEvents = dayTasks.isNotEmpty;
    final isToday = isSameDay(date, DateTime.now());
    final isSelected = _selectedDay != null && isSameDay(date, _selectedDay!);

    // İlk görevli gün için showcase - sadece bir kez göster
    final shouldShowDayShowcase = hasEvents &&
        !_hasShownTutorial &&
        !_dayItemKeyUsed &&
        date.isAfter(DateTime.now().subtract(const Duration(days: 1))) &&
        date.isBefore(DateTime.now().add(const Duration(days: 7)));

    // Gün için tasarım parametreleri
    Color backgroundColor = Colors.transparent;
    Color textColor =
        Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black;
    double elevation = 0;
    List<BoxShadow> shadows = [];
    BorderRadius borderRadius = BorderRadius.circular(12);
    Border? border;
    Gradient? gradient;

    // Tip bazında tasarım
    switch (type) {
      case DayCellType.selected:
        // Seçili gün - animasyonlu gradient tasarım
        gradient = LinearGradient(
          colors: [
            AppTheme.primaryColor,
            AppTheme.primaryColor.withValues(alpha: 0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
        textColor = Colors.white;
        shadows = [
          BoxShadow(
            color: AppTheme.primaryColor.withValues(alpha: 0.4),
            blurRadius: 12,
            spreadRadius: 0,
            offset: const Offset(0, 6),
          ),
        ];
        elevation = 8;
        break;

      case DayCellType.today:
        // Bugün - vurgulu border tasarım
        backgroundColor = AppTheme.primaryColor.withValues(alpha: 0.1);
        textColor = AppTheme.primaryColor;
        border = Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.6),
          width: 2,
        );
        shadows = [
          BoxShadow(
            color: AppTheme.primaryColor.withValues(alpha: 0.2),
            blurRadius: 8,
            spreadRadius: 0,
            offset: const Offset(0, 3),
          ),
        ];
        break;

      case DayCellType.normal:
        // Normal gün - görevli günler için özel tasarım
        if (hasEvents) {
          // Görevli günler - dikey gradient
          gradient = LinearGradient(
            colors: [
              AppTheme.accentColor.withValues(alpha: 0.15),
              AppTheme.accentColor.withValues(alpha: 0.05),
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          );
          border = Border.all(
            color: AppTheme.accentColor.withValues(alpha: 0.3),
            width: 1,
          );
          shadows = [
            BoxShadow(
              color: AppTheme.accentColor.withValues(alpha: 0.1),
              blurRadius: 4,
              spreadRadius: 0,
              offset: const Offset(0, 2),
            ),
          ];
        } else {
          // Boş günler - minimalist
          backgroundColor = Colors.transparent;
          textColor =
              Theme.of(context).textTheme.bodySmall?.color ?? Colors.grey;
        }
        break;

      case DayCellType.outside:
        // Ay dışındaki günler
        backgroundColor = Colors.transparent;
        textColor =
            Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.3) ??
                Colors.grey.shade300;
        break;
    }

    Widget dayCell = AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
      margin: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: gradient == null ? backgroundColor : null,
        gradient: gradient,
        borderRadius: borderRadius,
        border: border,
        boxShadow: shadows,
      ),
      transform: isSelected
          ? Matrix4.translationValues(0, -3, 0) // Seçili gün yukarı çıkar
          : Matrix4.identity(),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: borderRadius,
          onTap: () => _onDaySelected(date, date),
          child: Container(
            width: double.infinity,
            height: double.infinity,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Gün numarası
                Text(
                  '${date.day}',
                  style: GoogleFonts.lato(
                    fontSize: type == DayCellType.selected ? 18 : 16,
                    fontWeight: type == DayCellType.selected ||
                            type == DayCellType.today
                        ? FontWeight.w700
                        : FontWeight.w500,
                    color: textColor,
                  ),
                ),

                // Görev göstergeleri
                if (hasEvents && type != DayCellType.outside) ...[
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (dayTasks.length <= 3)
                        // Az görev - nokta gösterge
                        ...List.generate(
                          dayTasks.length,
                          (index) => Container(
                            margin: const EdgeInsets.symmetric(horizontal: 1),
                            width: 4,
                            height: 4,
                            decoration: BoxDecoration(
                              color: type == DayCellType.selected
                                  ? Colors.white.withValues(alpha: 0.8)
                                  : AppTheme.accentColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                        )
                      else
                        // Çok görev - sayı gösterge
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: type == DayCellType.selected
                                ? Colors.white.withValues(alpha: 0.2)
                                : AppTheme.accentColor.withValues(alpha: 0.8),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '${dayTasks.length}',
                            style: GoogleFonts.lato(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: type == DayCellType.selected
                                  ? Colors.white
                                  : Colors.white,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );

    // Görevli gün için showcase ekle
    if (shouldShowDayShowcase) {
      _dayItemKeyUsed = true; // Key'i kullanıldı olarak işaretle
      return Showcase(
        key: _dayItemKey,
        description:
            'Bir güne tıklayarak o günün görevlerini detaylıca görebilirsin. Hadi bir güne tıkla! 👆',
        targetBorderRadius: BorderRadius.circular(12),
        child: dayCell,
      );
    }

    return dayCell;
  } */

  // _buildDayCard kaldırıldı (kullanılmıyor)

  int? _getDayIndexForDate(DateTime date, List<Day> allDays) {
    for (int i = 0; i < allDays.length; i++) {
      try {
        final dayDate = DateFormat('yyyy-MM-dd').parse(allDays[i].date);
        if (date.year == dayDate.year &&
            date.month == dayDate.month &&
            date.day == dayDate.day) {
          return i;
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  void _startFocusMode(DailyTask task) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => FocusModeScreen(
          taskSubject: task.subject,
          taskTopic: task.topic,
          taskDurationMinutes: task.durationInMinutes,
          taskId: '${task.subject}_${task.topic}', // Benzersiz ID oluşturuyoruz
        ),
      ),
    );
  }

  void _handleTaskAction(String action, DailyTask task) {
    switch (action) {
      case 'focus':
        _startFocusMode(task);
        break;
      case 'ai_reschedule':
        _showAIRescheduleDialog(task);
        break;
      case 'manual_reschedule':
        _showManualRescheduleDialog(task);
        break;
      case 'details':
        _showTaskDetails(task);
        break;
    }
  }

  void _showAIRescheduleDialog(DailyTask task) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.psychology, color: Colors.purple),
            const SizedBox(width: 8),
            Text(
              'AI Koçundan Yardım',
              style: GoogleFonts.montserrat(
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimaryColor,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bu görevi neden ertelemek istiyorsun?',
              style: GoogleFonts.lato(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildReasonChip('Çok yorgunum'),
                _buildReasonChip('Zamanım yok'),
                _buildReasonChip('Konsantre olamıyorum'),
                _buildReasonChip('Başka işlerim var'),
                _buildReasonChip('Konu zor geliyor'),
                _buildReasonChip('Diğer'),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'AI koçun tüm programını analiz edip en uygun alternatifi önerecek.',
              style: GoogleFonts.lato(
                fontSize: 14,
                color: AppTheme.textSecondaryColor,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('İptal'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(context);
              _requestAIReschedule(task, _selectedRescheduleReason);
            },
            icon: Icon(Icons.psychology, size: 16),
            label: const Text('AI\'ya Sor'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.purple,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  String _selectedRescheduleReason = '';

  Widget _buildReasonChip(String reason) {
    final isSelected = _selectedRescheduleReason == reason;
    return FilterChip(
      label: Text(reason),
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          _selectedRescheduleReason = selected ? reason : '';
        });
      },
      selectedColor: Colors.purple.withValues(alpha: 0.2),
      checkmarkColor: Colors.purple,
    );
  }

  void _requestAIReschedule(DailyTask task, String reason) async {
    // AI'dan akıllı öneri iste
    // TODO: Implement AI reschedule request
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content:
            Text('AI koçun analiz ediyor... Bu özellik yakında aktif olacak!'),
        backgroundColor: Colors.purple,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showManualRescheduleDialog(DailyTask task) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Görevi Taşı',
          style: GoogleFonts.montserrat(
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimaryColor,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Bu görevi hangi tarihe taşımak istiyorsun?',
              style: GoogleFonts.lato(fontSize: 16),
            ),
            const SizedBox(height: 16),
            // Basit tarih seçimi - gelecekte daha gelişmiş hale getirilebilir
            ElevatedButton(
              onPressed: () async {
                final pickedDate = await showDatePicker(
                  context: context,
                  initialDate: DateTime.now().add(Duration(days: 1)),
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(Duration(days: 30)),
                );
                if (pickedDate != null) {
                  Navigator.pop(context);
                  // TODO: Implement manual reschedule
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                          'Görev ${pickedDate.toString().split(' ')[0]} tarihine taşınacak (yakında aktif)'),
                      backgroundColor: Colors.orange,
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              },
              child: Text('Tarih Seç'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('İptal'),
          ),
        ],
      ),
    );
  }

  void _showTaskDetails(DailyTask task) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => FeynmanCycleScreen(task: task),
      ),
    );
  }

  Widget _buildStreakDisplayPanel() {
    final currentStreak = ref.watch(calendarNotifierProvider).currentStreak;
    final streakInfo = CalendarHelpers.getStreakFlameDisplay(currentStreak);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            (streakInfo['color'] as Color).withOpacity(0.1),
            Colors.white,
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: (streakInfo['color'] as Color).withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          // Streak flame ikonu
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: (streakInfo['color'] as Color).withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                streakInfo['emoji'],
                style: TextStyle(
                  fontSize: streakInfo['size'] as double,
                ),
              ),
            ),
          )
              .animate(onPlay: (controller) => controller.repeat())
              .shimmer(duration: 2000.ms, color: streakInfo['color'] as Color)
              .then()
              .scale(duration: 500.ms, begin: const Offset(0.9, 0.9)),

          const SizedBox(width: 16),

          // Streak bilgileri
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      streakInfo['title'],
                      style: GoogleFonts.montserrat(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: streakInfo['color'] as Color,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: (streakInfo['color'] as Color).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${ref.watch(calendarNotifierProvider).currentStreak} gün',
                        style: GoogleFonts.lato(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: streakInfo['color'] as Color,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  streakInfo['description'],
                  style: GoogleFonts.lato(
                    fontSize: 14,
                    color: AppTheme.textSecondaryColor,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(
                      Icons.emoji_events,
                      size: 16,
                      color: Colors.amber.shade600,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Rekor: ${ref.watch(calendarNotifierProvider).longestStreak} gün',
                      style: GoogleFonts.lato(
                        fontSize: 12,
                        color: AppTheme.textSecondaryColor,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 800.ms).slideY(begin: -0.3);
  }

  Widget _buildStreakFlame(DateTime date) {
    // Bu tarihe kadar olan streak'i hesapla (basitleştirilmiş)
    final streakInfo = CalendarHelpers.getStreakFlameDisplay(ref.watch(calendarNotifierProvider).currentStreak);

    if (streakInfo['emoji'] == '') {
      return const SizedBox.shrink();
    }

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      child: Container(
        width: 16,
        height: 16,
        decoration: BoxDecoration(
          color: (streakInfo['color'] as Color).withOpacity(0.2),
          shape: BoxShape.circle,
          border: Border.all(
            color: streakInfo['color'] as Color,
            width: 1,
          ),
        ),
        child: Center(
          child: Text(
            streakInfo['emoji'],
            style: TextStyle(
              fontSize: 10,
            ),
          ),
        ),
      ),
    )
        .animate()
        .scale(duration: 200.ms, curve: Curves.elasticOut)
        .then()
        .shimmer(duration: 1500.ms, color: streakInfo['color'] as Color);
  }

  void _checkWeeklyReport() {
    final now = DateTime.now();

    // Pazar günü mü kontrol et (weekday = 7)
    if (now.weekday == 7) {
      // Akşam saatleri mi kontrol et (18:00-23:59)
      if (now.hour >= 18) {}
    }
  }

  /// Modern Dijital Ajanda - Her gün için büyük modern bilgi kartı
  Widget _buildModernDayCard(DateTime date, List<Day> allDays) {
    // Bu gün için görevleri al
    final cs = ref.watch(calendarNotifierProvider);
    final dayTasks = CalendarHelpers.getTasksForDate(date, cs.events);
    final totalDuration =
        CalendarHelpers.getTotalDurationForDate(date, cs.events);

    // Premium kontrolü
    final dayIndex = _getDayIndexForDate(date, allDays);
    final isLocked = false; // Mock implementation

    // Durum kontrolleri
    final isToday = isSameDay(date, DateTime.now());
    final isSelected = isSameDay(date, cs.selectedDay);
    final isDayCompleted = CalendarHelpers.isDayCompleted(date, cs.events);
    final isRestDay = _isRestDay(date, allDays);

    // Bu güne ait benzersiz dersleri al
    final uniqueSubjects = dayTasks
        .map((task) => task.subject)
        .toSet()
        .take(4) // Maksimum 4 ders göster
        .toList();

    return GestureDetector(
      onTap: () {
        // Haptic feedback ekle
        HapticFeedback.lightImpact();
        ref.read(calendarNotifierProvider.notifier).setSelectedDay(date, date);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
        margin: const EdgeInsets.all(4.0), // Daha büyük margin
        decoration: BoxDecoration(
          color: _getDayCardBackgroundColor(
            isToday: isToday,
            isSelected: isSelected,
            isRestDay: isRestDay,
            isLocked: isLocked,
            totalDuration: totalDuration,
          ),
          borderRadius: BorderRadius.circular(12), // Daha büyük border radius
          border: Border.all(
            color: _getDayCardBorderColor(
              isToday: isToday,
              isSelected: isSelected,
              isRestDay: isRestDay,
              isLocked: isLocked,
            ),
            width: isSelected ? 2.5 : 1.2, // Daha kalın border
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppTheme.primaryColor.withValues(alpha: 0.4),
                    blurRadius: 12,
                    spreadRadius: 2,
                    offset: const Offset(0, 2),
                  ),
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
        ),
        child: Container(
          height: 85, // Çok daha büyük yükseklik (60'tan 85'e)
          padding: const EdgeInsets.all(8.0), // Daha büyük padding
          child: Stack(
            children: [
              // Ana içerik
              Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Tarih numarası
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${date.day}',
                        style: GoogleFonts.lato(
                          fontSize: 18, // Büyük font size (14'ten 18'e)
                          fontWeight:
                              isToday ? FontWeight.w800 : FontWeight.w700,
                          color: _getDayTextColor(
                            isToday: isToday,
                            isSelected: isSelected,
                            isRestDay: isRestDay,
                            isLocked: isLocked,
                            totalDuration: totalDuration,
                          ),
                        ),
                      ),
                      // Streak flame (eğer gün tamamlandıysa)
                      if (isDayCompleted &&
                          !isLocked &&
                          !date.isAfter(DateTime.now()))
                        _buildStreakFlame(date),
                    ],
                  ),

                  const SizedBox(height: 4), // Daha fazla boşluk

                  // Ders etiketleri (chips)
                  if (!isRestDay && uniqueSubjects.isNotEmpty)
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Flexible(
                            child: Wrap(
                              spacing: 4, // Daha büyük spacing
                              runSpacing: 3, // Daha büyük run spacing
                              children: [
                                ...uniqueSubjects.take(3).map((subject) =>
                                    _buildSubjectChip(subject, isLocked)),
                                if (uniqueSubjects.length > 3)
                                  _buildOverflowChip(
                                      uniqueSubjects.length - 3, isLocked),
                              ],
                            ),
                          ),
                        ],
                      ),
                    )
                  else if (isRestDay)
                    Expanded(
                      child: Center(
                        child: Icon(
                          Icons.bedtime_outlined,
                          size: 16, // Daha büyük ikon
                          color: Colors.grey.shade400,
                        ),
                      ),
                    )
                  else
                    const Expanded(
                        child: SizedBox()), // Boş günler için esnek boşluk

                  // İlerleme göstergesi (altta kalın çizgi)
                  if (dayTasks.isNotEmpty && !isLocked)
                    Container(
                      height: 3, // Daha kalın progress bar
                      margin: const EdgeInsets.only(top: 4),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(2),
                        color: Colors.grey.shade200,
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(2),
                        child: LinearProgressIndicator(
                          value: CalendarHelpers.getCompletionRateForDate(
                              date, cs.events),
                          backgroundColor: Colors.transparent,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            _getProgressColor(
                                CalendarHelpers.getCompletionRateForDate(
                                    date, cs.events)),
                          ),
                        ),
                      ),
                    ),
                ],
              ),

              // Kilit ikonu (premium olmayan kullanıcılar için)
              if (isLocked)
                Positioned(
                  top: 2,
                  right: 2,
                  child: Container(
                    width: 18, // Daha büyük kilit ikonu
                    height: 18,
                    decoration: BoxDecoration(
                      color: Colors.orange.shade500,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Colors.white,
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.orange.shade500.withValues(alpha: 0.3),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.lock,
                      size: 10,
                      color: Colors.white,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  /// Modern ders etiketi chip'i oluştur
  Widget _buildSubjectChip(String subject, bool isLocked) {
    final color = isLocked
        ? Colors.grey.shade400
        : SubjectColors.getColorForSubject(subject);

    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: 6, vertical: 3), // Daha büyük padding
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8), // Daha yuvarlatılmış köşeler
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 0.8,
        ),
      ),
      child: Text(
        _getSubjectAbbreviation(subject),
        style: GoogleFonts.lato(
          fontSize: 10, // Daha büyük font (8'den 10'a)
          fontWeight: FontWeight.w700,
          color: color,
          letterSpacing: 0.2,
        ),
      ),
    );
  }

  /// Modern taşma chip'i oluştur (fazla dersler için)
  Widget _buildOverflowChip(int count, bool isLocked) {
    final color = isLocked ? Colors.grey.shade400 : Colors.grey.shade700;

    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: 6, vertical: 3), // Daha büyük padding
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8), // Daha yuvarlatılmış köşeler
        border: Border.all(
          color: color.withValues(alpha: 0.25),
          width: 0.8,
        ),
      ),
      child: Text(
        '+$count',
        style: GoogleFonts.lato(
          fontSize: 10, // Daha büyük font (8'den 10'a)
          fontWeight: FontWeight.w700,
          color: color,
          letterSpacing: 0.2,
        ),
      ),
    );
  }

  /// Ders adını kısaltma
  String _getSubjectAbbreviation(String subject) {
    const abbreviations = {
      'Matematik': 'Mat',
      'Fizik': 'Fiz',
      'Kimya': 'Kim',
      'Biyoloji': 'Bio',
      'Türk Dili ve Edebiyatı': 'TDE',
      'Türkçe': 'Tür',
      'Edebiyat': 'Ede',
      'Tarih': 'Tar',
      'Coğrafya': 'Coğ',
      'Felsefe': 'Fel',
      'Din Kültürü ve Ahlak Bilgisi': 'Din',
      'İngilizce': 'İng',
      'Almanca': 'Alm',
      'Fransızca': 'Fra',
      'Geometri': 'Geo',
      'Algebra': 'Alg',
    };

    return abbreviations[subject] ?? subject.substring(0, 3);
  }

  /// Günün arka plan rengini belirle
  Color _getDayCardBackgroundColor({
    required bool isToday,
    required bool isSelected,
    required bool isRestDay,
    required bool isLocked,
    required int totalDuration,
  }) {
    if (isLocked) {
      return Colors.grey.shade200;
    }

    if (isSelected) {
      return AppTheme.primaryColor.withValues(alpha: 0.1);
    }

    if (isToday) {
      return AppTheme.primaryColor.withValues(alpha: 0.05);
    }

    if (isRestDay) {
      return Colors.blue.shade50;
    }

    // Yoğunluğa göre renk
    return CalendarHelpers.getIntensityColorForDuration(totalDuration)
        .withOpacity(0.1);
  }

  /// Günün çerçeve rengini belirle
  Color _getDayCardBorderColor({
    required bool isToday,
    required bool isSelected,
    required bool isRestDay,
    required bool isLocked,
  }) {
    if (isLocked) {
      return Colors.grey.shade300;
    }

    if (isSelected) {
      return AppTheme.primaryColor;
    }

    if (isToday) {
      return AppTheme.primaryColor.withValues(alpha: 0.6);
    }

    if (isRestDay) {
      return Colors.blue.shade200;
    }

    return Colors.grey.shade300;
  }

  /// Gün metin rengini belirle
  Color _getDayTextColor({
    required bool isToday,
    required bool isSelected,
    required bool isRestDay,
    required bool isLocked,
    required int totalDuration,
  }) {
    if (isLocked) {
      return Colors.grey.shade600;
    }

    if (isSelected || isToday) {
      return AppTheme.primaryColor;
    }

    if (isRestDay) {
      return Colors.blue.shade600;
    }

    return AppTheme.textPrimaryColor;
  }

  /// İlerleme çubuğu rengini belirle
  Color _getProgressColor(double completionRate) {
    if (completionRate >= 1.0) return Colors.green.shade400;
    if (completionRate >= 0.7) return Colors.blue.shade400;
    if (completionRate >= 0.3) return Colors.orange.shade400;
    return Colors.grey.shade400;
  }

  /// Günün dinlenme günü olup olmadığını kontrol et
  bool _isRestDay(DateTime date, List<Day> allDays) {
    // Plan yoksa dinlenme günü değil
    if (allDays.isEmpty) return false;
    
    final dayIndex = _getDayIndexForDate(date, allDays);
    if (dayIndex == null) return false;

    try {
      // Sadece plan içindeki günler için isRestDay kontrolü yap
      return allDays[dayIndex].isRestDay;
    } catch (e) {
      // Hata durumunda dinlenme günü değil
      return false;
    }
  }

  /// Modern Boş Durum Tasarımı
  Widget _buildModernEmptyState() {
    final isRestDay = ref.watch(calendarNotifierProvider).selectedDay != null &&
        _isRestDay(ref.watch(calendarNotifierProvider).selectedDay!,
            ref.watch(calendarNotifierProvider).currentPlan?.weeks.expand((week) => week.days).toList() ?? []);

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Animasyonlu ikon
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isRestDay
                    ? [Colors.blue.shade200, Colors.blue.shade400]
                    : [
                        AppTheme.primaryColor.withValues(alpha: 0.2),
                        AppTheme.primaryColor.withValues(alpha: 0.4)
                      ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: (isRestDay ? Colors.blue : AppTheme.primaryColor)
                      .withOpacity(0.2),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Icon(
              isRestDay
                  ? Icons.bedtime
                  : (ref.watch(calendarNotifierProvider).selectedDay != null ? Icons.task_alt : Icons.touch_app),
              size: 40,
              color: isRestDay ? Colors.blue.shade700 : AppTheme.primaryColor,
            ),
          )
              .animate(onPlay: (controller) => controller.repeat(reverse: true))
              .scale(
                duration: 2000.ms,
                begin: const Offset(0.95, 0.95),
                end: const Offset(1.05, 1.05),
                curve: Curves.easeInOut,
              )
              .then()
              .shimmer(
                  duration: 1500.ms,
                  color: Colors.white.withValues(alpha: 0.5)),

          const SizedBox(height: 24),

          // Ana başlık
          Text(
            _getEmptyStateTitle(isRestDay),
            textAlign: TextAlign.center,
            style: GoogleFonts.montserrat(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppTheme.textPrimaryColor,
            ),
          )
              .animate()
              .fadeIn(duration: 600.ms, delay: 200.ms)
              .slideY(begin: 0.3),

          const SizedBox(height: 12),

          // Alt başlık
          Text(
            _getEmptyStateSubtitle(isRestDay),
            textAlign: TextAlign.center,
            style: GoogleFonts.lato(
              fontSize: 16,
              color: AppTheme.textSecondaryColor,
              height: 1.4,
            ),
          )
              .animate()
              .fadeIn(duration: 600.ms, delay: 400.ms)
              .slideY(begin: 0.3),

          if (ref.watch(calendarNotifierProvider).selectedDay != null) ...[
            const SizedBox(height: 16),

            // Tarih göstergesi
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isRestDay
                    ? Colors.blue.shade50
                    : AppTheme.primaryColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isRestDay
                      ? Colors.blue.shade200
                      : AppTheme.primaryColor.withValues(alpha: 0.3),
                  width: 1,
                ),
              ),
              child: Text(
                CalendarHelpers.formatDateTurkish(ref.watch(calendarNotifierProvider).selectedDay!),
                style: GoogleFonts.lato(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color:
                      isRestDay ? Colors.blue.shade700 : AppTheme.primaryColor,
                ),
              ),
            )
                .animate()
                .fadeIn(duration: 600.ms, delay: 600.ms)
                .scale(begin: const Offset(0.8, 0.8)),
          ],

          const SizedBox(height: 32),

          // Motivasyonel mesaj veya aksiyon
          if (isRestDay)
            _buildRestDayMessage()
          else if (ref.watch(calendarNotifierProvider).selectedDay == null)
            _buildSelectDayMessage()
          else
            _buildNoTasksMessage(),
        ],
      ),
    );
  }

  String _getEmptyStateTitle(bool isRestDay) {
    if (isRestDay) return 'Dinlenme Zamanı! ☕';
    if (ref.watch(calendarNotifierProvider).selectedDay == null) return 'Hangi günü incelemek istersin?';
    return 'Bu gün programında boşluk var!';
  }

  String _getEmptyStateSubtitle(bool isRestDay) {
    if (isRestDay)
      return 'Bugün dinlenme günün. Enerjini topla ve yarın için hazırlan!';
    if (ref.watch(calendarNotifierProvider).selectedDay == null)
      return 'Takvimden bir tarih seçerek o günün görevlerini görüntüleyebilirsin.';
    return 'Bu gün için henüz bir görev planlanmamış. Belki de kendine küçük bir mola hakkı kazandın!';
  }

  Widget _buildRestDayMessage() {
    return Column(
      children: [
        // Dinlenme tavsiyeleri
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.blue.shade200),
          ),
          child: Column(
            children: [
              Text(
                '💡 Dinlenme Günü İçin Öneriler',
                style: GoogleFonts.montserrat(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.blue.shade700,
                ),
              ),
              const SizedBox(height: 8),
              ...[
                'Kitap okuma',
                'Hafif spor',
                'Sosyal aktiviteler',
                'Hobi zamanı'
              ]
                  .asMap()
                  .entries
                  .map((entry) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Row(
                          children: [
                            Icon(Icons.check_circle,
                                size: 16, color: Colors.blue.shade400),
                            const SizedBox(width: 8),
                            Text(
                              entry.value,
                              style: GoogleFonts.lato(
                                fontSize: 14,
                                color: Colors.blue.shade600,
                              ),
                            ),
                          ],
                        ),
                      ))
                  .toList(),
            ],
          ),
        ).animate(delay: 800.ms).fadeIn(duration: 600.ms).slideY(begin: 0.3),
      ],
    );
  }

  Widget _buildSelectDayMessage() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor.withValues(alpha: 0.1),
            AppTheme.primaryColor.withValues(alpha: 0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(Icons.touch_app, color: AppTheme.primaryColor, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Takvimden herhangi bir güne dokunarak başla',
              style: GoogleFonts.lato(
                fontSize: 14,
                color: AppTheme.primaryColor,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    )
        .animate(delay: 800.ms)
        .fadeIn(duration: 600.ms)
        .slideY(begin: 0.3)
        .then()
        .shimmer(
            duration: 2000.ms,
            color: AppTheme.primaryColor.withValues(alpha: 0.3));
  }

  Widget _buildNoTasksMessage() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.green.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.green.shade200),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Icon(Icons.celebration,
                      color: Colors.green.shade600, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Tebrikler! 🎉',
                    style: GoogleFonts.montserrat(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.green.shade700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Bu gün için ekstra bir görevin yok. Bu da demek oluyor ki planına sadık kalıyorsun!',
                textAlign: TextAlign.center,
                style: GoogleFonts.lato(
                  fontSize: 14,
                  color: Colors.green.shade600,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Öneri butonu
        ElevatedButton.icon(
          onPressed: () {
            HapticFeedback.lightImpact();
            // Diğer günlere bakma önerisi
            final tomorrow = DateTime.now().add(const Duration(days: 1));
            ref.read(calendarNotifierProvider.notifier).setSelectedDay(tomorrow, tomorrow);
          },
          icon: const Icon(Icons.arrow_forward, size: 16),
          label: const Text('Yarınki Programı Gör'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.green.shade400,
            foregroundColor: Colors.white,
            elevation: 2,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ],
    ).animate(delay: 800.ms).fadeIn(duration: 600.ms).slideY(begin: 0.3);
  }

  /// **ADIM 1: İnteraktif Genişletilebilir Takvim Hücresi**
  /// Bu widget, tıklandığında genişleyerek içindeki görevleri gösteren akıllı bir hücre
  Widget _buildInteractiveDayCell(DateTime date, List<Day> allDays) {
    // Bu gün için görevleri al
    final cs = ref.watch(calendarNotifierProvider);
    final dayTasks = CalendarHelpers.getTasksForDate(date, cs.events);
    final totalDuration =
        CalendarHelpers.getTotalDurationForDate(date, cs.events);

    // Durum kontrolleri
    final isToday = isSameDay(date, DateTime.now());
    final isSelected = isSameDay(date, cs.selectedDay);
    final isDayCompleted = CalendarHelpers.isDayCompleted(date, cs.events);
    final isRestDay = _isRestDay(date, allDays);

    // Premium kontrolü
    final dayIndex = _getDayIndexForDate(date, allDays);
    final isLocked = false; // Mock implementation

    // Bu güne ait benzersiz dersleri al
    final uniqueSubjects =
        dayTasks.map((task) => task.subject).toSet().toList();

    return GestureDetector(
      onTap: () {
        // Haptic feedback - Fiziksel buton hissi için kritik!
        HapticFeedback.lightImpact();
        ref.read(calendarNotifierProvider.notifier).setSelectedDay(date, date);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOutCubic,
        margin: const EdgeInsets.all(2.0),
        decoration: BoxDecoration(
          color: _getDayCardBackgroundColor(
            isToday: isToday,
            isSelected: isSelected,
            isRestDay: isRestDay,
            isLocked: isLocked,
            totalDuration: totalDuration,
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppTheme.primaryColor : Colors.grey.shade300,
            width: isSelected ? 2.5 : 1.0,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppTheme.primaryColor.withValues(alpha: 0.3),
                    blurRadius: 12,
                    spreadRadius: 2,
                    offset: const Offset(0, 3),
                  ),
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
        ),
        child: AnimatedSize(
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeInOutCubic,
          child: Container(
            constraints: BoxConstraints(
              minHeight: 80, // Minimum yükseklik
              maxHeight:
                  isSelected ? 300 : 80, // Seçiliyse çok daha yüksek olabilir
            ),
            padding: const EdgeInsets.all(12.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // **Tarih Başlığı Row**
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Tarih numarası ve gün adı
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${date.day}',
                          style: GoogleFonts.lato(
                            fontSize: isSelected ? 20 : 16,
                            fontWeight:
                                isToday ? FontWeight.w800 : FontWeight.w700,
                            color: _getDayTextColor(
                              isToday: isToday,
                              isSelected: isSelected,
                              isRestDay: isRestDay,
                              isLocked: isLocked,
                              totalDuration: totalDuration,
                            ),
                          ),
                        ),
                        if (isSelected)
                          Text(
                            _getDayNameTurkish(date.weekday),
                            style: GoogleFonts.lato(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey.shade600,
                            ),
                          ),
                      ],
                    ),

                    // Durum ikonları
                    Row(
                      children: [
                        // Streak flame (tamamlanmış günler için)
                        if (isDayCompleted &&
                            !isLocked &&
                            !date.isAfter(DateTime.now()))
                          _buildStreakFlame(date),

                        // Kilit ikonu
                        if (isLocked)
                          Container(
                            width: 18,
                            height: 18,
                            margin: const EdgeInsets.only(left: 4),
                            decoration: BoxDecoration(
                              color: Colors.orange.shade500,
                              shape: BoxShape.circle,
                              border:
                                  Border.all(color: Colors.white, width: 1.5),
                            ),
                            child: const Icon(Icons.lock,
                                size: 10, color: Colors.white),
                          ),
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: 8),

                // **Koşullu İçerik: Seçili mi değil mi?**
                if (!isSelected)
                  // SEÇİLİ DEĞİLSE: Kompakt önizleme
                  _buildCompactPreview(uniqueSubjects, isLocked, isRestDay)
                else
                  // SEÇİLİYSE: Tam görev listesi
                  _buildExpandedTaskList(dayTasks, isRestDay, isLocked),

                // **İlerleme Çubuğu (sadece görevli günlerde)**
                if (dayTasks.isNotEmpty && !isLocked && !isRestDay)
                  Container(
                    height: 4,
                    margin: const EdgeInsets.only(top: 8),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(2),
                      color: Colors.grey.shade200,
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(2),
                      child: LinearProgressIndicator(
                        value: CalendarHelpers.getCompletionRateForDate(
                            date, cs.events),
                        backgroundColor: Colors.transparent,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _getProgressColor(
                              CalendarHelpers.getCompletionRateForDate(
                                  date, cs.events)),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Gün numarasını Türkçe gün adına çeviren yardımcı fonksiyon
  String _getDayNameTurkish(int weekday) {
    const dayNames = [
      'Pazartesi',
      'Salı',
      'Çarşamba',
      'Perşembe',
      'Cuma',
      'Cumartesi',
      'Pazar'
    ];
    return dayNames[weekday - 1]; // weekday 1'den başlar
  }

  /// **Kompakt Önizleme**: Seçili olmayan günler için ders renkli daireleri
  Widget _buildCompactPreview(
      List<String> uniqueSubjects, bool isLocked, bool isRestDay) {
    if (isRestDay) {
      return Center(
        child: Icon(
          Icons.bedtime_outlined,
          size: 18,
          color: Colors.grey.shade400,
        ),
      );
    }

    if (uniqueSubjects.isEmpty) {
      return Center(
        child: Text(
          'Boş',
          style: GoogleFonts.lato(
            fontSize: 10,
            color: Colors.grey.shade500,
            fontWeight: FontWeight.w500,
          ),
        ),
      );
    }

    return Wrap(
      spacing: 4,
      runSpacing: 4,
      children: uniqueSubjects.take(4).map((subject) {
        final color = isLocked
            ? Colors.grey.shade400
            : SubjectColors.getColorForSubject(subject);

        return Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(
              color: color.withValues(alpha: 0.3),
              width: 1,
            ),
          ),
        );
      }).toList(),
    );
  }

  /// **Genişletilmiş Görev Listesi**: Seçili günler için tam görev listesi
  Widget _buildExpandedTaskList(
      List<DailyTask> dayTasks, bool isRestDay, bool isLocked) {
    if (isRestDay) {
      return Container(
        padding: const EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: Colors.blue.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.blue.shade200),
        ),
        child: Column(
          children: [
            Icon(
              Icons.spa_outlined,
              size: 32,
              color: Colors.blue.shade400,
            ),
            const SizedBox(height: 8),
            Text(
              'Dinlenme Günü',
              style: GoogleFonts.lato(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Colors.blue.shade700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Bugün dinlen ve enerjini topla! ☕',
              style: GoogleFonts.lato(
                fontSize: 11,
                color: Colors.blue.shade600,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    if (dayTasks.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: Colors.green.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.green.shade200),
        ),
        child: Column(
          children: [
            Icon(
              Icons.check_circle_outline,
              size: 32,
              color: Colors.green.shade400,
            ),
            const SizedBox(height: 8),
            Text(
              'Görev Yok',
              style: GoogleFonts.lato(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Colors.green.shade700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Bu gün için planlanmış görev bulunmuyor! 🎉',
              style: GoogleFonts.lato(
                fontSize: 11,
                color: Colors.green.shade600,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return Flexible(
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: dayTasks.length,
        separatorBuilder: (context, index) => const SizedBox(height: 6),
        itemBuilder: (context, index) {
          final task = dayTasks[index];
          return _buildInteractiveTaskTile(task, isLocked);
        },
      ),
    );
  }

  /// **ADIM 2: Mükemmel İnteraktif Görev Widget'ı (TaskTile)**
  /// Özel checkbox, üstünü çizme efekti ve akıcı animasyonlarla
  Widget _buildInteractiveTaskTile(DailyTask task, bool isLocked) {
    final subjectColor = isLocked
        ? Colors.grey.shade400
        : SubjectColors.getColorForSubject(task.subject);

    return AnimatedOpacity(
      duration: const Duration(milliseconds: 300),
      opacity: task.isCompleted ? 0.6 : 1.0, // Tamamlanınca soluklaşır
      child: Container(
        padding: const EdgeInsets.all(12.0),
        decoration: BoxDecoration(
          color: task.isCompleted
              ? subjectColor.withValues(alpha: 0.05)
              : subjectColor.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: task.isCompleted
                ? subjectColor.withValues(alpha: 0.3)
                : subjectColor.withValues(alpha: 0.2),
            width: 1.2,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // **Özel Animasyonlu Checkbox**
            GestureDetector(
              onTap: isLocked
                  ? null
                  : () {
                      // Haptic feedback - Görev tamamlama anında fiziksel hiss
                      HapticFeedback.mediumImpact();
                      _toggleTaskCompletion(task);
                    },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeInOutCubic,
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: task.isCompleted
                      ? subjectColor // Tamamlanınca tamamen dolu
                      : Colors.transparent, // Tamamlanmamışsa şeffaf
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: subjectColor,
                    width: 2.5,
                  ),
                  boxShadow: task.isCompleted
                      ? [
                          BoxShadow(
                            color: subjectColor.withValues(alpha: 0.4),
                            blurRadius: 8,
                            spreadRadius: 1,
                          ),
                        ]
                      : null,
                ),
                child: task.isCompleted
                    ? Icon(
                        Icons.check,
                        size: 16,
                        color: Colors.white,
                      )
                    : null,
              ),
            ),

            const SizedBox(width: 12),

            // **Görev Detayları**
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Görev konusu - Üstünü çizme efekti ile
                  AnimatedDefaultTextStyle(
                    duration: const Duration(milliseconds: 300),
                    style: GoogleFonts.lato(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: task.isCompleted
                          ? Colors.grey.shade500 // Tamamlanınca grileşir
                          : subjectColor,
                      decoration: task.isCompleted
                          ? TextDecoration.lineThrough // Üstünü çizer
                          : TextDecoration.none,
                      decorationColor: subjectColor,
                      decorationThickness: 2.0,
                    ),
                    child: Text(
                      task.topic,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),

                  const SizedBox(height: 4),

                  // Ders adı ve süre bilgisi
                  Row(
                    children: [
                      // Ders adı chip'i
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: subjectColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          _getSubjectAbbreviation(task.subject),
                          style: GoogleFonts.lato(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: subjectColor,
                          ),
                        ),
                      ),

                      const SizedBox(width: 8),

                      // Süre bilgisi
                      Text(
                        '${task.durationInMinutes} dk',
                        style: GoogleFonts.lato(
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                          color: Colors.grey.shade600,
                        ),
                      ),

                      const Spacer(),

                      // Görev durumu ikonu
                      if (task.isCompleted)
                        Icon(
                          Icons.check_circle,
                          size: 16,
                          color: subjectColor,
                        ),
                    ],
                  ),
                ],
              ),
            ),

            // **Görev Menüsü (3 nokta)**
            if (!isLocked)
              PopupMenuButton<String>(
                onSelected: (value) {
                  switch (value) {
                    case 'focus':
                      _startFocusMode(task);
                      break;
                    case 'ai_reschedule':
                      _showAIRescheduleDialog(task);
                      break;
                    case 'manual_reschedule':
                      _showManualRescheduleDialog(task);
                      break;
                  }
                },
                icon: Icon(
                  Icons.more_vert,
                  size: 16,
                  color: Colors.grey.shade600,
                ),
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: 'focus',
                    child: Row(
                      children: [
                        Icon(Icons.psychology, size: 16, color: Colors.blue),
                        const SizedBox(width: 8),
                        Text('Odaklanma Modu'),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'ai_reschedule',
                    child: Row(
                      children: [
                        Icon(Icons.auto_fix_high,
                            size: 16, color: Colors.purple),
                        const SizedBox(width: 8),
                        Text('AI Yeniden Planla'),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'manual_reschedule',
                    child: Row(
                      children: [
                        Icon(Icons.schedule, size: 16, color: Colors.orange),
                        const SizedBox(width: 8),
                        Text('Manuel Taşı'),
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

  /// Görev tamamlama durumunu değiştiren yardımcı fonksiyon
  void _toggleTaskCompletion(DailyTask task) {
    setState(() {
      task.isCompleted = !task.isCompleted;
    });

    // TODO: Implement task update in Firestore
    // Şimdilik sadece local state'i güncelliyoruz
    // _updateTaskInFirestore(task);
  }
}
