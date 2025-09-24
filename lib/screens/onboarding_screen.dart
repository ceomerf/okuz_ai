import 'package:dots_indicator/dots_indicator.dart';
import 'package:flutter/material.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/models/onboarding_page_type.dart';
import 'package:okuz_ai/models/account_type.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:flutter/cupertino.dart';
import 'package:okuz_ai/widgets/onboarding/daily_goal_page.dart';
import 'package:okuz_ai/widgets/onboarding/field_selection_page.dart';
import 'package:okuz_ai/widgets/onboarding/grade_selection_page.dart';
import 'package:okuz_ai/widgets/onboarding/plan_scope_page.dart';
import 'package:okuz_ai/widgets/onboarding/subject_selection_page.dart';
import 'package:okuz_ai/widgets/onboarding/summary_page.dart';
import 'package:okuz_ai/widgets/onboarding/welcome_page.dart';
import 'package:okuz_ai/screens/academic_background_page.dart'; // Yeni import
import 'package:okuz_ai/screens/weakness_identification_page.dart'; // Yeni import

import 'package:okuz_ai/services/plan_service.dart';
import 'package:okuz_ai/services/api_env.dart';
import 'package:okuz_ai/services/providers.dart';
// Yeni sayfalar için importlar
import 'package:okuz_ai/widgets/onboarding/name_and_target_page.dart';
import 'package:okuz_ai/widgets/onboarding/learning_style_page.dart';
import 'package:okuz_ai/widgets/onboarding/preferred_study_times_page.dart';
import 'package:okuz_ai/widgets/onboarding/preferred_session_duration_page.dart'; // 🚀 YENİ
import 'package:okuz_ai/widgets/onboarding/holiday_plan_type_page.dart';
import 'package:okuz_ai/widgets/onboarding/starting_point_page.dart';
import 'package:okuz_ai/widgets/onboarding/curriculum_preference_page.dart'; // 🚀 YENİ: Müfredat tercihi
import 'package:okuz_ai/widgets/onboarding/last_topics_selection_page.dart';
import 'package:okuz_ai/screens/user_plan_screen.dart';
import 'package:okuz_ai/screens/onboarding_completion_screen.dart';
import 'package:okuz_ai/screens/profile_selection_screen.dart';
import 'package:okuz_ai/screens/plan_generation_status_screen.dart'; // 🚀 YENİ: Queue status ekranı
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:okuz_ai/services/api_env.dart';
// import 'package:okuz_ai/screens/plan_setup_screen.dart'; // 🚀 KALDIRILDI: İnteraktif plan kurulum
import '../services/family_account_service.dart';
import '../services/mock_auth_service.dart';
import '../services/production_auth_service.dart';
import '../services/providers.dart';
import 'package:okuz_ai/models/student_profile.dart';
import 'parent_invite_screen.dart';
import 'package:okuz_ai/screens/family_portal_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:okuz_ai/screens/holiday_plan_choice_screen.dart';
import 'package:okuz_ai/screens/profile_screen.dart';
import 'package:okuz_ai/screens/parent_dashboard_screen.dart';
import 'package:okuz_ai/screens/student_dashboard_screen.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  final bool isStudentAccount; // Öğrenci hesabı mı oluşturuluyor?
  final AccountType? initialAccountType; // Başlangıç hesap tipi

  const OnboardingScreen({
    Key? key,
    this.isStudentAccount = false,
    this.initialAccountType,
  }) : super(key: key);

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final OnboardingData _onboardingData = OnboardingData();
  late final PlanService _planService;
  int _currentPage = 0;
  bool _isLoading = false;
  // UI'ı yenilemek için kullanacağımız değişken
  int _refreshCounter = 0;
  // Sayfa listesini cache'leyerek gereksiz yeniden oluşturmayı önleyelim
  List<Widget>? _cachedPages;
  AccountType? _lastAccountType;

  // Tatil durumu kontrol değişkenleri
  bool _isHoliday = false;
  String _holidayReason = '';
  bool _holidayCheckLoading = true;

  @override
  void initState() {
    super.initState();
    // DI: ApiClient üzerinden PlanService oluştur
    _planService = PlanService(ref.read(apiClientProvider));
    // Eğer öğrenci hesabı oluşturuluyorsa veya initialAccountType parametresi verilmişse, hesap tipini ayarla
    if (widget.isStudentAccount) {
      _onboardingData.accountType = AccountType.student;
    } else if (widget.initialAccountType != null) {
      _onboardingData.accountType = widget.initialAccountType!;
    }

    // Geçici verileri temizle
    _cleanTempData();

    // Sadece öğrenci hesabı için tatil durumunu kontrol et
    if (widget.isStudentAccount ||
        widget.initialAccountType == AccountType.student ||
        _onboardingData.accountType == AccountType.student) {
      _checkHolidayStatus();
    } else {
      // Veli hesabı için tatil kontrolü yapmadan direkt false olarak ayarla
      setState(() {
        _holidayCheckLoading = false;
        _isHoliday = false;
      });
    }
  }

  // Geçici verileri temizle
  void _cleanTempData() {
    // Geçici confidence levels'ı temizle
    if (_onboardingData.confidenceLevels.containsKey('temp')) {
      _onboardingData.confidenceLevels.remove('temp');
    }
    
    // Geçici weaknesses'ları temizle
    if (_onboardingData.weaknesses?.contains('temp') == true) {
      _onboardingData.weaknesses?.remove('temp');
    }
    
    // Boş olan confidence levels ve weaknesses'ları temizle
    if (_onboardingData.confidenceLevels.isEmpty) {
      _onboardingData.confidenceLevels = {};
    }
    
    if (_onboardingData.weaknesses?.isEmpty == true) {
      _onboardingData.weaknesses = [];
    }

    print('🧹 Geçici veriler temizlendi');
    print('   Confidence Levels: ${_onboardingData.confidenceLevels}');
    print('   Weaknesses: ${_onboardingData.weaknesses}');
  }

  Future<void> _checkHolidayStatus() async {
    try {
      // Önce backend'den kontrol etmeyi dene
      final productionAuthService = ref.read(authServiceProvider);
      final currentUser = await productionAuthService.getCurrentUser();

      if (currentUser != null) {
        // ProductionAuthService ile giriş yapılmış
        final token = await productionAuthService.getToken();
        if (token != null) {
          try {
            final response = await http.get(
              Uri.parse('${ApiEnv.baseUrl}/planning/check-holiday-status'),
              headers: {
                'Authorization': 'Bearer $token',
              },
            ).timeout(const Duration(seconds: 5));

            if (response.statusCode == 200) {
              final result = jsonDecode(response.body);
              if (mounted) {
                setState(() {
                  _isHoliday = result['isHoliday'] ?? false;
                  _holidayReason = result['message'] ?? '';
                  _holidayCheckLoading = false;
                });
              }
              return;
            }
          } catch (e) {
            print(
                'Backend tatil kontrolü başarısız, yerel kontrol kullanılıyor: $e');
          }
        }
      }

      // MockAuthService ile de dene
      final user = MockAuthService.instance.currentUser;
      if (user != null) {
        try {
          final token = user.id; // Mock token
          final response = await http.get(
            Uri.parse('${ApiEnv.baseUrl}/planning/check-holiday-status'),
            headers: {
              'Authorization': 'Bearer $token',
            },
          ).timeout(const Duration(seconds: 5));

          if (response.statusCode == 200) {
            final result = jsonDecode(response.body);
            if (mounted) {
              setState(() {
                _isHoliday = result['isHoliday'] ?? false;
                _holidayReason = result['message'] ?? '';
                _holidayCheckLoading = false;
              });
            }
            return;
          }
        } catch (e) {
          print('Mock auth ile backend kontrolü başarısız: $e');
        }
      }

      // Backend çalışmıyorsa yerel kontrol yap
      _checkHolidayStatusLocally();
    } catch (e) {
      print('Tatil durumu kontrol hatası: $e');
      _checkHolidayStatusLocally();
    }
  }

  void _checkHolidayStatusLocally() {
    final now = DateTime.now();
    final currentMonth = now.month;
    final currentDay = now.day;

    // Türkiye'deki tatil dönemleri (2024-2025 eğitim yılı)
    bool isHoliday = false;
    String holidayReason = '';

    // Yaz tatili (14 Haziran - 15 Eylül)
    if ((currentMonth == 6 && currentDay >= 14) ||
        (currentMonth >= 7 && currentMonth <= 8) ||
        (currentMonth == 9 && currentDay <= 15)) {
      isHoliday = true;
      holidayReason = 'Yaz tatili dönemi - Okullar kapalı';
    }
    // Kış tatili (20 Ocak - 3 Şubat)
    else if ((currentMonth == 1 && currentDay >= 20) ||
        (currentMonth == 2 && currentDay <= 3)) {
      isHoliday = true;
      holidayReason = 'Kış tatili dönemi - Yarıyıl tatili';
    }
    // Bahar tatili (15-30 Nisan)
    else if (currentMonth == 4 && currentDay >= 15 && currentDay <= 30) {
      isHoliday = true;
      holidayReason = 'Bahar tatili dönemi - Nisan tatili';
    } else {
      isHoliday = false;
      holidayReason = 'Okul dönemi';
    }

    if (mounted) {
      setState(() {
        _isHoliday = isHoliday;
        _holidayReason = holidayReason;
        _holidayCheckLoading = false;
      });
    }
  }

  @override
  void dispose() {
    super.dispose();
  }

  void _onEdit(OnboardingPageType pageType) {
    final pages = _getPages();
    Type targetWidgetType;

    switch (pageType) {
      case OnboardingPageType.nameAndTarget:
        targetWidgetType = NameAndTargetPage;
        break;
      case OnboardingPageType.grade:
        targetWidgetType = GradeSelectionPage;
        break;
      case OnboardingPageType.field:
        targetWidgetType = FieldSelectionPage;
        break;
      case OnboardingPageType.planScope:
        targetWidgetType = PlanScopePage;
        break;
      case OnboardingPageType.subject:
        targetWidgetType = SubjectSelectionPage;
        break;
      case OnboardingPageType.dailyGoal:
        targetWidgetType = DailyGoalPage;
        break;
      case OnboardingPageType.preferredStudyTimes:
        targetWidgetType = PreferredStudyTimesPage;
        break;
      case OnboardingPageType.preferredSessionDuration:
        targetWidgetType = PreferredSessionDurationPage;
        break;
      case OnboardingPageType.learningStyle:
        targetWidgetType = LearningStylePage;
        break;
      case OnboardingPageType.confidenceLevels:
        targetWidgetType = AcademicBackgroundPage;
        break;
      case OnboardingPageType.holidayPlanType:
        targetWidgetType = HolidayPlanTypePage;
        break;
      case OnboardingPageType.curriculumPreference:
        targetWidgetType = CurriculumPreferencePage;
        break;
      case OnboardingPageType.startingPoint:
        targetWidgetType = StartingPointPage;
        break;
      case OnboardingPageType.lastTopics:
        targetWidgetType = LastTopicsSelectionPage;
        break;
      case OnboardingPageType.start:
        // Bu artık kullanılmıyor ama hatayı önlemek için eklendi.
        return; // Fonksiyondan çık, hatayı önle
    }

    final index = pages.indexWhere((p) => p.runtimeType == targetWidgetType);
    if (index != -1) {
      // Sayfa değişirken güvenli animasyon
      if (mounted) {
        setState(() {
          _currentPage = index;
        });
      }
    }
  }

  void _nextPage() {
    final pages = _getPages();

    if (_currentPage == pages.length - 1) {
      // Son sayfadaysak, plan oluşturma veya tatil ekranına yönlendirme mantığını çalıştır
      _handleCompletion();
    } else {
      int nextPageIndex = _currentPage + 1;

      // Öğrenci hesabı için sayfa atlama mantığı
      if (_onboardingData.accountType == AccountType.student) {
        nextPageIndex = _getNextValidPageIndex(nextPageIndex);
      }

      if (nextPageIndex < pages.length) {
        setState(() {
          _currentPage = nextPageIndex;
        });
      } else {
        _handleCompletion();
      }
    }
  }

  int _getNextValidPageIndex(int startIndex) {
    final pages = _getPages();

    for (int i = startIndex; i < pages.length; i++) {
      if (_shouldShowPage(i)) {
        return i;
      }
    }

    return pages.length; // Son sayfaya git
  }

  bool _shouldShowPage(int pageIndex) {
    final pages = _getPages();
    if (pageIndex >= pages.length) return false;

    final page = pages[pageIndex];

    // Öğrenci hesabı için sayfaları kontrol et
    if (_onboardingData.accountType == AccountType.student) {
      // FieldSelectionPage - sadece 11. sınıf ve üzeri için
      if (page.key.toString().contains('field_selection')) {
        return (_onboardingData.grade?.isNotEmpty ?? false) &&
            ((int.tryParse(_onboardingData.grade ?? '') ?? 0) >= 11 ||
                (_onboardingData.grade ?? '') == 'Mezun');
      }

      // PlanScopePage - sınıf seçildikten sonra
      if (page.key.toString().contains('plan_scope')) {
        return (_onboardingData.grade?.isNotEmpty ?? false);
      }

      // SubjectSelectionPage - plan kapsamı seçildikten sonra her zaman
      if (page.key == const Key('subject_selection')) {
        return (_onboardingData.planScope?.isNotEmpty ?? false);
      }

      // LastTopicsSelectionPage - subject selection tamamlandıktan sonra (hem normal hem tatil döneminde)
      if (page.key.toString().contains('last_topics')) {
        return !_holidayCheckLoading &&
            _onboardingData.selectedSubjects.isNotEmpty;
      }

      // DailyGoalPage - plan kapsamı seçildikten sonra
      if (page.key.toString().contains('daily_goal')) {
        return (_onboardingData.planScope?.isNotEmpty ?? false);
      }

      // PreferredStudyTimesPage - günlük hedef belirlendikten sonra
      if (page.key.toString().contains('study_times')) {
        return (_onboardingData.dailyGoalInHours ?? 0) > 0;
      }

      // PreferredSessionDurationPage - çalışma saatleri seçildikten sonra
      if (page.key.toString().contains('session_duration')) {
        return _onboardingData.preferredStudyTimes.isNotEmpty;
      }

      // LearningStylePage - ideal çalışma süresi belirlendikten sonra
      if (page.key.toString().contains('learning_style')) {
        return (_onboardingData.preferredSessionDuration ?? 0) > 0;
      }

      // ConfidenceLevelsPage - öğrenme stili seçildikten sonra
      if (page.key.toString().contains('confidence_levels')) {
        return (_onboardingData.learningStyle?.isNotEmpty ?? false);
      }

      // StartingPointPage - sadece normal dönemde ve güven seviyeleri belirlendikten sonra
      if (page.key.toString().contains('starting_point')) {
        final shouldShow = !_isHoliday &&
            !_holidayCheckLoading &&
            _onboardingData.confidenceLevels.isNotEmpty;
        print(
            'StartingPointPage gösterilmeli mi: $shouldShow (isHoliday: $_isHoliday, loading: $_holidayCheckLoading)');
        return shouldShow;
      }

      // HolidayPlanTypePage - sadece tatil döneminde ve güven seviyeleri belirlendikten sonra
      if (page.key.toString().contains('holiday_plan_type')) {
        final shouldShow = _isHoliday &&
            !_holidayCheckLoading &&
            _onboardingData.confidenceLevels.isNotEmpty;
        print(
            'HolidayPlanTypePage gösterilmeli mi: $shouldShow (isHoliday: $_isHoliday, loading: $_holidayCheckLoading)');
        return shouldShow;
      }

      // SummaryPage - güven seviyeleri belirlendikten sonra (tatilde ise plan türü, normal dönemde ise starting point seçilmeli)
      if (page.key == const Key('summary_student')) {
        if (_isHoliday && !_holidayCheckLoading) {
          final shouldShow = _onboardingData.confidenceLevels.isNotEmpty &&
              (_onboardingData.holidayPlanType?.isNotEmpty ?? false);
          print(
              'SummaryPage (tatil) gösterilmeli mi: $shouldShow (holidayPlanType: ${_onboardingData.holidayPlanType})');
          return shouldShow;
        } else if (!_isHoliday && !_holidayCheckLoading) {
          final shouldShow = _onboardingData.confidenceLevels.isNotEmpty &&
              (_onboardingData.startPoint?.isNotEmpty ?? false);
          print(
              'SummaryPage (normal) gösterilmeli mi: $shouldShow (startPoint: ${_onboardingData.startPoint})');
          return shouldShow;
        }
        return _onboardingData.confidenceLevels.isNotEmpty;
      }
    }

    // Diğer sayfalar her zaman gösterilir
    return true;
  }

  void _previousPage() {
    if (_currentPage > 0) {
      setState(() {
        _currentPage = _currentPage - 1;
      });
    }
  }

  // UI'ı yenilemek için kullanacağımız metod
  void _refreshUI() {
    setState(() {
      _refreshCounter++;
      // Cache'i sadece gerektiğinde temizle
      if (_lastAccountType != _onboardingData.accountType) {
        _cachedPages = null;
        _lastAccountType = null;
      }
    });
  }

  Future<void> _navigateBasedOnAccountType() async {
    // Widget dispose edilmişse işlemi durdur
    if (!mounted) return;

    try {
      // Veli hesabı için doğrudan Family Portal'a git
      // Bu noktada onboarding tamamlanmış ve hesap tipi belli
      if (_onboardingData.accountType == AccountType.parent) {
        debugPrint('✅ Veli hesabı - direkt Family Portal\'a yönlendiriliyor');
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const FamilyPortalScreen()),
        );
        return;
      }

      // Öğrenci hesabı için service'den kontrol et
      final familyService = ref.read(familyAccountNotifierProvider.notifier);
      await familyService.loadAccountData();

      // Widget hâlâ mounted mı kontrol et
      if (!mounted) return;

      final accountType = ref.read(familyAccountNotifierProvider).accountType;

      if (accountType == AccountType.parent) {
        // Veli hesabı - family portal'a git
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const FamilyPortalScreen()),
        );
      } else {
        // 🚀 Öğrenci hesabı - direkt hazır plana git (3 günlük demo)
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const UserPlanScreen()),
        );
      }
    } catch (e) {
      debugPrint('⚠️ navigateBasedOnAccountType hatası: $e');
      // Widget mounted mı kontrol et
      if (mounted) {
        // Veli hesabı ise hata olsa bile Family Portal'a git
        if (_onboardingData.accountType == AccountType.parent) {
          debugPrint(
              '✅ Hata durumunda veli hesabı - Family Portal\'a yönlendiriliyor');
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => const FamilyPortalScreen()),
          );
        } else {
          // 🚀 Öğrenci hesabı - hata durumunda hazır plana yönlendir
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => const UserPlanScreen()),
          );
        }
      }
    }
  }

  // Onboarding tamamlandığında çağrılır
  Future<void> _handleCompletion() async {
    setState(() => _isLoading = true);

    try {
      // Onboarding verilerini kaydet
      await _saveOnboardingData();

      // Onboarding tamamlandı olarak işaretle
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('onboarding_completed', true);

      // Hesap tipini kaydet
      if (_onboardingData.accountType == AccountType.parent) {
        await prefs.setBool('is_parent_account', true);

        // Veli bilgilerini kaydet
        await prefs.setString('parent_name', _onboardingData.fullName ?? '');
        await prefs.setString(
            'parent_student_name', _onboardingData.studentName ?? '');
        await prefs.setString(
            'parent_relationship', _onboardingData.relationshipToStudent ?? '');
        await prefs.setString('parent_account_type', 'parent');

        debugPrint('💾 Veli bilgileri kaydedildi: ${_onboardingData.fullName}');

        // Veli için direkt Family Portal'a yönlendir
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => const FamilyPortalScreen()),
          );
        }
        return;
      } else {
        await prefs.setBool('is_parent_account', false);

        // Öğrenci bilgilerini kaydet
        await prefs.setString('student_name', _onboardingData.fullName ?? '');
        await prefs.setString('student_grade', _onboardingData.grade ?? '');
        await prefs.setString(
            'academic_track', _onboardingData.academicTrack ?? 'sayısal');
        await prefs.setString(
            'student_target', _onboardingData.targetExam ?? '');
        await prefs.setString('student_target_university',
            _onboardingData.targetUniversity ?? '');
        await prefs.setStringList(
            'selected_subjects', _onboardingData.selectedSubjects);
        await prefs.setDouble(
            'daily_hours', _onboardingData.dailyGoalInHours ?? 2.0);

        // Tatil plan tipini kaydet
        if (_onboardingData.holidayPlanType != null) {
          await prefs.setString(
              'holiday_plan_type', _onboardingData.holidayPlanType!);
        }

        await prefs.setBool('student_onboarding_completed', true);

        debugPrint(
            '💾 Öğrenci bilgileri kaydedildi: ${_onboardingData.fullName}');
      }

      // Öğrenci için tatil döneminde ise tatil planı oluştur
      if (_isHoliday && _onboardingData.holidayPlanType != null) {
        await _createHolidayPlan();
      }

      // Öğrenci için direkt UserPlanScreen'e git
      if (mounted) {
        await _navigateBasedOnAccountType();
      }
    } catch (e) {
      debugPrint('Onboarding tamamlanırken hata: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Bir hata oluştu: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _createHolidayPlan() async {
    try {
      print('🏖️ Tatil planı oluşturuluyor...');

      // Temp verileri temizle
      final cleanConfidenceLevels =
          Map<String, String>.from(_onboardingData.confidenceLevels);
      cleanConfidenceLevels.remove('temp');

      final cleanWeaknesses = _onboardingData.weaknesses
              ?.where((item) => item != 'temp')
              .toList() ??
          [];

      // Eğer seçili dersler boşsa, akademik alana göre otomatik dersler ekle
      List<String> selectedSubjects = _onboardingData.selectedSubjects;
      if (selectedSubjects.isEmpty &&
          _onboardingData.academicTrack?.isNotEmpty == true) {
        selectedSubjects =
            _getDefaultSubjectsForTrack(_onboardingData.academicTrack!);
        print(
            '📚 Akademik alana göre otomatik dersler eklendi: $selectedSubjects');
      }

      final planService = PlanService(ref.read(apiClientProvider));

      // Onboarding verilerinden tatil planı verilerini hazırla
      final result = await planService.createHolidayPlan(
        holidayType: _onboardingData.holidayPlanType!,
        duration: 28, // 4 hafta varsayılan
        goals: ['Tatil döneminde verimli çalışma'],
        grade: _onboardingData.grade,
        academicTrack: _onboardingData.academicTrack,
        targetExam: _onboardingData.targetExam,
        selectedSubjects: selectedSubjects,
        dailyHours: _onboardingData.dailyGoalInHours,
        confidenceLevels: cleanConfidenceLevels,
        holidayWorkPreferences:
            _onboardingData.holidayWorkPreferences.cast<String, bool>(),
        approach: 'automatic',
        priority: 'both',
        followSchool: false,
        hasTYTKnowledge: false, // Onboarding'de bu veri yok, varsayılan false
        topicTracking: 'from_scratch',
      );

      print('✅ Tatil planı oluşturuldu: ${result['success']}');

      // Tatil planını SharedPreferences'e kaydet
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('holiday_plan', jsonEncode(result));
      await prefs.setBool('has_holiday_plan', true);
    } catch (e) {
      print('❌ Tatil planı oluşturma hatası: $e');
      // Hata durumunda da devam et, kullanıcıyı engelleme
    }
  }

  Future<void> _proceedToPlanGeneration() async {
    // Widget zaten dispose edilmişse işlemi durdur
    if (!mounted) return;

    setState(() => _isLoading = true);

    try {
      // 🚀 Direkt interaktif plan kurulum ekranına yönlendir
      debugPrint('✅ İnteraktif plan kurulum ekranına yönlendiriliyor');

      // Widget hâlâ mounted mı kontrol et
      if (mounted) {
        // 🚀 Yeni yaklaşım: Direkt hazır plana git (3 günlük demo)
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const UserPlanScreen()),
        );
      }
    } catch (e) {
      debugPrint('💥 Plan kurulum yönlendirmesinde hata: $e');
      if (mounted) {
        // Hata olsa bile hazır plana git
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const UserPlanScreen()),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _saveOnboardingData() async {
    // Önce ProductionAuthService'i dene
      final productionAuthService = ref.read(authServiceProvider);
    final currentUser = await productionAuthService.getCurrentUser();
    final token = await productionAuthService.getToken();

    String userId = '';

    if (currentUser != null && token != null) {
      // ProductionAuthService ile giriş yapılmış
      userId = currentUser['id'] ?? '';
    } else {
      // MockAuthService'i dene
      final user = MockAuthService.instance.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturum açmamış');
      }
      userId = user.id;
    }

    // Hesap tipine göre gerekli verileri kontrol et
    if ((_onboardingData.fullName?.trim() ?? '').isEmpty) {
      throw Exception('Lütfen adını gir');
    }

    // Veli hesabı için sadece temel bilgiler gerekli
    if (_onboardingData.accountType == AccountType.parent) {
      // Veli için ek kontroller gerekmez
    } else {
      // Öğrenci hesabı için tüm bilgiler gerekli
      if ((_onboardingData.grade?.isEmpty ?? true)) {
        throw Exception('Lütfen sınıfını seç');
      }
      if ((_onboardingData.targetUniversity?.trim() ?? '').isEmpty) {
        throw Exception('Lütfen hedef üniversiteni gir');
      }
      if ((_onboardingData.learningStyle?.isEmpty ?? true)) {
        throw Exception('Lütfen öğrenme stilini seç');
      }
      if (_onboardingData.preferredStudyTimes.isEmpty) {
        throw Exception('Lütfen çalışma saatlerini seç');
      }
      if ((_onboardingData.dailyGoalInHours ?? 0) <= 0) {
        throw Exception('Lütfen günlük hedefini belirle');
      }
    }

    // 9. ve 10. sınıf öğrencileri için varsayılan değerler ayarla
    String academicTrack = _onboardingData.academicTrack ?? '';
    String targetExam = _onboardingData.targetExam ?? '';

    if (_onboardingData.grade == '9' || _onboardingData.grade == '10') {
      // 9. ve 10. sınıf öğrencileri için varsayılan değerler
      if (targetExam.isEmpty) {
        targetExam = 'genel'; // Genel eğitim
      }
      if (academicTrack.isEmpty) {
        academicTrack = 'genel'; // Genel akademik izleme
      }
    }

    // Mock servis'e gönderilecek veriyi hazırla
    final data = {
      'fullName': (_onboardingData.fullName?.trim() ?? ''),
      'accountType': _onboardingData.accountType.name, // Hesap tipini ekle
      'isNewProfile': false, // Bu yeni bir profil değil, ana kullanıcı
      'userId': userId, // Kullanıcı ID'sini ekle
    };

    // Geçici değerleri temizle
    Map<String, String> cleanConfidenceLevels = {};
    if (_onboardingData.confidenceLevels.isNotEmpty) {
      cleanConfidenceLevels = Map<String, String>.fromEntries(
        _onboardingData.confidenceLevels.entries.where((entry) => 
          entry.value != 'temp' && 
          entry.value.isNotEmpty &&
          entry.key != 'temp' &&
          entry.key.isNotEmpty &&
          !entry.key.toLowerCase().contains('temp') &&
          !entry.value.toLowerCase().contains('temp')
        )
      );
    }

    List<String> cleanWeaknesses = [];
    if (_onboardingData.weaknesses != null && _onboardingData.weaknesses!.isNotEmpty) {
      cleanWeaknesses = _onboardingData.weaknesses!
          .where((weakness) => 
            weakness != 'temp' && 
            weakness.isNotEmpty &&
            !weakness.toLowerCase().contains('temp') &&
            weakness.toLowerCase() != 'novice' &&
            weakness.toLowerCase() != 'beginner' &&
            weakness.toLowerCase() != 'intermediate' &&
            weakness.toLowerCase() != 'low' &&
            weakness.toLowerCase() != 'medium' &&
            weakness.toLowerCase() != 'high'
          )
          .toList();
    }

    Map<String, String> cleanLastTopics = {};
    if (_onboardingData.lastCompletedTopics.isNotEmpty) {
      cleanLastTopics = Map<String, String>.fromEntries(
        _onboardingData.lastCompletedTopics.entries.where((entry) => 
          entry.value != 'temp' && 
          entry.value.isNotEmpty &&
          entry.key != 'temp' &&
          entry.key.isNotEmpty &&
          !entry.key.toLowerCase().contains('temp') &&
          !entry.value.toLowerCase().contains('temp') &&
          entry.value.toLowerCase() != 'novice' &&
          entry.value.toLowerCase() != 'beginner' &&
          entry.value.toLowerCase() != 'intermediate' &&
          entry.value.toLowerCase() != 'low' &&
          entry.value.toLowerCase() != 'medium' &&
          entry.value.toLowerCase() != 'high'
        )
      );
    }

    // Öğrenci hesabı için veri hazırla
    if (_onboardingData.accountType == AccountType.student) {
      data.addAll({
        'fullName': (_onboardingData.fullName?.trim() ?? ''),
        'accountType': 'student',
        'isNewProfile': false,
        'userId': userId,
        'grade': _onboardingData.grade ?? '',
        'academicTrack': academicTrack,
        'targetUniversity': (_onboardingData.targetUniversity?.trim() ?? ''),
        'targetExam': targetExam,
        'learningStyle': _onboardingData.learningStyle ?? '',
        'confidenceLevels': cleanConfidenceLevels,
        'preferredStudyTimes': _onboardingData.preferredStudyTimes,
        'preferredSessionDuration':
            (_onboardingData.preferredSessionDuration ?? 0),
        'studyDays': _onboardingData.studyDays,
        'dailyHours': (_onboardingData.dailyGoalInHours?.toInt() ?? 0),
        'selectedSubjects': _onboardingData.selectedSubjects,
        'lastCompletedTopics': cleanLastTopics,
        'weaknesses': cleanWeaknesses,
      });
    } else {
      // Veli hesabı için varsayılan değerler
      data.addAll({
        'parentName': (_onboardingData.fullName?.trim() ??
            ''), // Veli adını parentName olarak gönder
        'grade': '', // Veli için sınıf bilgisi yok
        'academicTrack': 'parent',
        'targetUniversity': '', // Veli için üniversite bilgisi yok
        'targetExam': 'parent',
        'learningStyle': 'parent',
        'confidenceLevels': {},
        'preferredStudyTimes': [],
        'studyDays': [],
        'dailyHours': 0,
      });
    }

    // Kullanıcı verilerini API'ye kaydet
    try {
      // Onboarding verilerini yerelde de sakla (plan oluşturma için PlanService bunları okuyor)
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('student_name', _onboardingData.fullName ?? '');
      await prefs.setString('student_grade', _onboardingData.grade ?? '');
      await prefs.setString('academic_track', _onboardingData.academicTrack ?? '');
      await prefs.setString('student_target', _onboardingData.targetExam ?? '');
      await prefs.setString('target_university', _onboardingData.targetUniversity ?? '');
      await prefs.setStringList('selected_subjects', _onboardingData.selectedSubjects);
      if ((_onboardingData.dailyGoalInHours ?? 0) > 0) {
        await prefs.setDouble('daily_hours', _onboardingData.dailyGoalInHours!);
      }
      if ((_onboardingData.preferredStudyTimes).isNotEmpty) {
        await prefs.setStringList('preferred_study_times', _onboardingData.preferredStudyTimes);
      }
      if ((_onboardingData.studyDays).isNotEmpty) {
        // studyDays'i String listesi olarak saklıyoruz; PlanService int'e çevirecek
        await prefs.setStringList('study_days', _onboardingData.studyDays.map((e) => e.toString()).toList());
      }
      if ((_onboardingData.preferredSessionDuration ?? 0) > 0) {
        await prefs.setInt('preferred_session_duration', _onboardingData.preferredSessionDuration!);
      }
      if (_onboardingData.learningStyle != null && _onboardingData.learningStyle!.isNotEmpty) {
        await prefs.setString('learning_style', _onboardingData.learningStyle!);
      }
      final cleanConfidenceLevels = Map<String, String>.from(_onboardingData.confidenceLevels)..remove('temp');
      if (cleanConfidenceLevels.isNotEmpty) {
        await prefs.setString('confidence_levels_json', jsonEncode(cleanConfidenceLevels));
      }
      final cleanWeaknesses = _onboardingData.weaknesses?.where((w) => w != 'temp' && w.trim().isNotEmpty).toList() ?? [];
      if (cleanWeaknesses.isNotEmpty) {
        await prefs.setStringList('weaknesses', cleanWeaknesses);
      }
      if (_onboardingData.lastCompletedTopics.isNotEmpty) {
        await prefs.setString('last_completed_topics_json', jsonEncode(_onboardingData.lastCompletedTopics));
      }

      // API'ye gönder
      String authToken = 'mock_token';
      String apiUrl =
          '${ApiEnv.baseUrl}/api/users/complete-onboarding'; // API endpoint'i

      // ProductionAuthService ile giriş yapılmışsa gerçek token kullan
      if (currentUser != null && token != null) {
        authToken = token;
      }

      debugPrint('🔄 Onboarding API isteği gönderiliyor: $apiUrl');
      debugPrint('📤 Request data: $data');
      debugPrint('🔑 Auth token: ${authToken.substring(0, 20)}...');
      debugPrint('📋 SelectedSubjects: ${_onboardingData.selectedSubjects}');
      debugPrint(
          '📋 PreferredStudyTimes: ${_onboardingData.preferredStudyTimes}');
      debugPrint('📋 DailyGoalInHours: ${_onboardingData.dailyGoalInHours}');
      debugPrint('📋 LearningStyle: ${_onboardingData.learningStyle}');
      debugPrint('📋 ConfidenceLevels (Cleaned): $cleanConfidenceLevels');
      debugPrint('📋 Weaknesses (Cleaned): $cleanWeaknesses');
      debugPrint('📋 LastTopics (Cleaned): $cleanLastTopics');

      final response = await http.post(
        Uri.parse(apiUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode(data),
      ).timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw Exception('API isteği zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edin.');
        },
      );

      debugPrint('📥 Response status: ${response.statusCode}');
      debugPrint('📥 Response body: ${response.body}');

      // Response body'yi parse et
      final responseData = jsonDecode(response.body);

      // Hem status code hem de success field'ını kontrol et
      if ((response.statusCode != 200 && response.statusCode != 201) ||
          responseData['success'] != true) {
        debugPrint('❌ API Error: $responseData');
        throw Exception(
            'Kayıt başarısız: ${responseData['message'] ?? responseData['error'] ?? 'Bilinmeyen hata'}');
      }

      debugPrint('✅ Onboarding API başarılı!');

      // Öğrenci hesabı için aile hesabına ekleme işlemi
      if (_onboardingData.accountType == AccountType.student) {
        debugPrint('✅ Öğrenci hesabı oluşturuldu: $userId');

        // Bu öğrenci hesabını mevcut veli hesabına ekle
        try {
          final familyService = ref.read(familyAccountNotifierProvider.notifier);
          await familyService.addStudent(
            (_onboardingData.fullName?.trim() ?? ''),
            _onboardingData.grade ?? '',
          );
          debugPrint('✅ Öğrenci aile hesabına eklendi');
        } catch (e) {
          debugPrint('⚠️ Öğrenci aile hesabına eklenirken hata: $e');
          // Bu hata kritik değil, devam edebiliriz
        }
      }

      // Express API kayıt işlemi başarılı
      debugPrint('✅ Onboarding tamamlandı!');
    } catch (e) {
      debugPrint('❌ Express API kayıt hatası: $e');
      debugPrint('❌ Hata detayı: ${e.toString()}');
      debugPrint('❌ Hata stack trace: ${StackTrace.current}');
      throw Exception('Kayıt sırasında bir hata oluştu: $e');
    }
  }

  List<Widget> _getPages() {
    // Hesap tipini kontrol et
    final accountType = _onboardingData.accountType;

    // Önemli: Onboarding adımlarında değerler sık sık değiştiği için
    // cache kullanmak SummaryPage gibi ekranlarda güncel veriyi göstermeyi engelliyor.
    // Bu nedenle sayfaları her build'te yeniden oluşturuyoruz.

    // Veli hesabı seçildiyse sadece isim al ve direkt dashboard'a yönlendir
    if (accountType == AccountType.parent) {
      final parentPages = [
        WelcomePage(
            key: Key('welcome_parent_$_refreshCounter'),
            onNext: _refreshUI,
            isStudentAccount: false),
        // Veli için sadece isim alma sayfası
        NameAndTargetPage(
          key: Key('name_target_parent_$_refreshCounter'),
          onboardingData: _onboardingData,
          onNext: _refreshUI,
          isParentMode: true, // Veli modu
        ),
      ];

    // Cache kullanımı devre dışı; her seferinde taze oluştur
    return parentPages;
    }

    // Öğrenci hesabı için tam onboarding akışı (eski hali)
    final studentPages = [
      WelcomePage(
          key: Key('welcome_student_$_refreshCounter'),
          onNext: _refreshUI,
          isStudentAccount: widget.isStudentAccount),

      NameAndTargetPage(
        key: Key('name_target_student_$_refreshCounter'),
        onboardingData: _onboardingData,
        onNext: _refreshUI,
      ),
      GradeSelectionPage(
        key: Key('grade_selection_$_refreshCounter'),
        onboardingData: _onboardingData,
        onSelectionChanged: (grade) {
          setState(() {
            if (_onboardingData.grade != grade) {
              _onboardingData.targetExam = '';
              _onboardingData.planScope = '';
              _onboardingData.needsSubjectSelection = false;
            }
            _onboardingData.grade = grade;
          });
        },
      ),
      FieldSelectionPage(
        key: Key('field_selection_$_refreshCounter'),
        onboardingData: _onboardingData,
        onSelectionChanged: (field) =>
            setState(() => _onboardingData.academicTrack = field),
      ),
      PlanScopePage(
        key: Key('plan_scope_$_refreshCounter'),
        onboardingData: _onboardingData,
        onSelectionChanged: (planType) {
          setState(() {
            _onboardingData.planScope = planType;
            // Sadece custom seçildiğinde ders seçimi gerekli
            _onboardingData.needsSubjectSelection = planType == 'custom';
          });
        },
      ),
      // Ders seçimi sayfasını sadece custom seçildiğinde göster
      if (_onboardingData.planScope == 'custom')
        SubjectSelectionPage(
          key: const Key('subject_selection'),
          onboardingData: _onboardingData,
          onSelectionChanged: (subjects) {
            print('Ders seçimi değişti: $subjects');
            setState(() => _onboardingData.selectedSubjects = subjects);
          },
        ),
      // Akademik seviye sayfası - ders seçiminden sonra
      AcademicBackgroundPage(
        key: Key('academic_background_$_refreshCounter'),
        onboardingData: _onboardingData,
        onNext: () {
          // Veri kaydet ve sonraki sayfaya geç
          // Geçici değeri temizle
          if (_onboardingData.confidenceLevels?.containsKey('temp') == true) {
            _onboardingData.confidenceLevels?.remove('temp');
          }
          _nextPage();
        },
        onSelectionChanged: (hasSelection) {
          // İlerle butonunun aktif olması için state güncelle
          setState(() {
            // Geçici olarak confidenceLevels'i güncelle
            if (hasSelection) {
              // Gerçek seçimler varsa onları kullan, yoksa geçici değer
              // Geçici veri oluşturma kaldırıldı - sadece gerçek veriler kullanılacak
            } else {
              _onboardingData.confidenceLevels = {};
            }
          });
        },
      ),
      // Zayıf halka belirleme sayfası
      WeaknessIdentificationPage(
        key: Key('weakness_identification_$_refreshCounter'),
        onboardingData: _onboardingData,
        onNext: () {
          // Veri kaydet ve sonraki sayfaya geç
          // Geçici değeri temizle
          if (_onboardingData.weaknesses?.contains('temp') == true) {
            _onboardingData.weaknesses?.remove('temp');
          }
          _nextPage();
        },
        onSelectionChanged: (hasSelection) {
          // İlerle butonunun aktif olması için state güncelle
          setState(() {
            // Geçici veri oluşturma kaldırıldı - sadece gerçek veriler kullanılacak
          });
        },
      ),
      LastTopicsSelectionPage(
        key: Key('last_topics_$_refreshCounter'),
        onboardingData: _onboardingData,
        onNext: _refreshUI,
      ),
      DailyGoalPage(
        key: Key('daily_goal_$_refreshCounter'),
        onboardingData: _onboardingData,
        onSelectionChanged: (goal) =>
            setState(() => _onboardingData.dailyGoalInHours = goal),
        onWorkDaysChanged: (days) =>
            setState(() => _onboardingData.workDays = days),
      ),
      PreferredStudyTimesPage(
        key: Key('study_times_$_refreshCounter'),
        onboardingData: _onboardingData,
        onNext: _refreshUI,
      ),
      PreferredSessionDurationPage(
        key: Key('session_duration_$_refreshCounter'),
        onboardingData: _onboardingData,
        onNext: _refreshUI,
      ),
      LearningStylePage(
        key: Key('learning_style_$_refreshCounter'),
        onboardingData: _onboardingData,
        onNext: _refreshUI,
      ),
      // Müfredat tercihi - sadece 12. sınıf ve mezun için
      if ((_onboardingData.grade == '12' || _onboardingData.grade == 'Mezun'))
        CurriculumPreferencePage(
          key: Key('curriculum_preference_$_refreshCounter'),
          onboardingData: _onboardingData,
          onNext: _refreshUI,
          onSelectionChanged: (preference) {
            setState(() {
              _onboardingData.curriculumPreference = preference;
            });
          },
        ),
      // Normal dönemde başlangıç noktası seçimi
      if (!_isHoliday && !_holidayCheckLoading)
        StartingPointPage(
          key: Key('starting_point_$_refreshCounter'),
          onboardingData: _onboardingData,
          onSelectionChanged: (startingPoint) =>
              setState(() => _onboardingData.startPoint = startingPoint),
        ),
      SummaryPage(
        key: Key('summary_student_$_refreshCounter'),
        onboardingData: _onboardingData,
        onConfirmationChanged: (isConfirmed) {
          print('🔍 OnboardingScreen - Onay durumu değişti: $isConfirmed');
          setState(() {
            _onboardingData.isConfirmed = isConfirmed;
            // Cache'i temizle ki sayfalar yeniden oluşturulsun
            _cachedPages = null;
          });
        },
        onEdit: _onEdit,
      ),
      // Tatil döneminde plan türü seçimi - Summary'den sonra
      if (_isHoliday && !_holidayCheckLoading)
        HolidayPlanTypePage(
          key: Key('holiday_plan_type_$_refreshCounter'),
          onboardingData: _onboardingData,
          holidayReason: _holidayReason,
          onSelectionChanged: (planType) {
            print(
                '🎯 OnboardingScreen - Mevcut sınıf: ${_onboardingData.grade}');
            print(
                '🎯 OnboardingScreen - Akademik alan: ${_onboardingData.academicTrack}');
            setState(() {
              _onboardingData.holidayPlanType = planType;
              print('Tatil plan türü seçildi: $planType');
            });
          },
        ),
    ];

    // Cache kullanımı devre dışı bırakıldı; her seferinde güncel verilerle oluştur
    return studentPages;
  }

  bool _isNextEnabled(List<Widget> pages) {
    if (pages.isEmpty || _currentPage >= pages.length) return false;

    final currentPageWidget = pages[_currentPage];
    if (currentPageWidget is WelcomePage) return true;
    if (currentPageWidget is NameAndTargetPage) {
      // Veli modu için sadece isim gerekli
      if (_onboardingData.accountType == AccountType.parent) {
        return (_onboardingData.fullName?.isNotEmpty ?? false);
      }
      // Öğrenci modu için sadece üniversite gerekli
      return (_onboardingData.targetUniversity?.isNotEmpty ?? false);
    }
    if (currentPageWidget is GradeSelectionPage)
      return (_onboardingData.grade?.isNotEmpty ?? false);
    if (currentPageWidget is FieldSelectionPage)
      return (_onboardingData.academicTrack?.isNotEmpty ?? false);
    if (currentPageWidget is PlanScopePage)
      return (_onboardingData.planScope?.isNotEmpty ?? false);
    if (currentPageWidget is SubjectSelectionPage)
      return _onboardingData.selectedSubjects.isNotEmpty ||
          _onboardingData.planScope == 'standard';
    if (currentPageWidget is AcademicBackgroundPage) {
      // En az bir ders için seviye seçilmiş olmalı
      // Geçici 'temp' değeri varsa da kabul et
      return _onboardingData.confidenceLevels?.isNotEmpty == true;
    }
    if (currentPageWidget is WeaknessIdentificationPage) {
      // En az bir zayıf alan seçilmiş olmalı
      // Geçici 'temp' değeri varsa da kabul et
      return _onboardingData.weaknesses?.isNotEmpty == true;
    }
    if (currentPageWidget is LastTopicsSelectionPage)
      return _onboardingData.lastCompletedTopics.isNotEmpty;
    if (currentPageWidget is DailyGoalPage)
      return (_onboardingData.dailyGoalInHours ?? 0) > 0;
    if (currentPageWidget is PreferredStudyTimesPage)
      return _onboardingData.preferredStudyTimes.isNotEmpty;
    if (currentPageWidget is PreferredSessionDurationPage)
      return (_onboardingData.preferredSessionDuration ?? 0) > 0;
    if (currentPageWidget is LearningStylePage)
      return (_onboardingData.learningStyle?.isNotEmpty ?? false);
    if (currentPageWidget is CurriculumPreferencePage)
      return (_onboardingData.planScope?.isNotEmpty ?? false);
    if (currentPageWidget is StartingPointPage) {
      final isEnabled = (_onboardingData.startPoint?.isNotEmpty ?? false);
      print(
          'StartingPointPage next enabled: $isEnabled (startPoint: ${_onboardingData.startPoint})');
      return isEnabled;
    }
    if (currentPageWidget is HolidayPlanTypePage) {
      final isEnabled = (_onboardingData.holidayPlanType?.isNotEmpty ?? false);
      print(
          'HolidayPlanTypePage next enabled: $isEnabled (holidayPlanType: ${_onboardingData.holidayPlanType})');
      return isEnabled;
    }
    if (currentPageWidget is SummaryPage) return _onboardingData.isConfirmed;

    return false;
  }

  // Progressive Dots Indicator - Kullanıcı ilerledikçe gösterilir
  Widget _buildProgressiveDots(int totalPages) {
    // Sadece mevcut sayfa + 1 kadar dot göster (max 3 tane)
    int visibleDots = (_currentPage + 2).clamp(2, totalPages).clamp(2, 5);

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(visibleDots, (index) {
        bool isActive = index == _currentPage;
        bool isPast = index < _currentPage;
        bool isFuture = index > _currentPage;

        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: isActive ? 24 : 8,
          height: 8,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),
            color: isActive
                ? AppTheme.primaryColor
                : isPast
                    ? AppTheme.primaryColor.withValues(alpha: 0.5)
                    : Theme.of(context).dividerColor,
          ),
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pages = _getPages();
    final isEnabled = _isNextEnabled(pages);
    final isFirstPage = _currentPage == 0;
    final isLastPage = _currentPage == pages.length - 1;

    // Build onboarding screen with current page state

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.only(
                bottom: 100.0), // Buton ve gösterge için boşluk
            child: IndexedStack(
              index: _currentPage < pages.length ? _currentPage : 0,
              children: pages,
            ),
          ),
          if (_isLoading)
            const Center(
              child: CupertinoActivityIndicator(radius: 20),
            ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 30),
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                boxShadow: [
                  BoxShadow(
                    color:
                        Theme.of(context).shadowColor.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -5),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildProgressiveDots(pages.length),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      // Geri butonu - ilk sayfada görünmez
                      if (!isFirstPage)
                        Container(
                          margin: const EdgeInsets.only(right: 12),
                          decoration: BoxDecoration(
                            color: Theme.of(context).cardColor,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                                color: Theme.of(context).dividerColor),
                          ),
                          child: IconButton(
                            icon: const Icon(Icons.arrow_back_ios_rounded,
                                size: 18),
                            onPressed: _previousPage,
                            color: AppTheme.getPrimaryTextColor(context),
                          ),
                        ),
                      // İleri butonu - minimal tasarım
                      Expanded(
                        child: ElevatedButton(
                          onPressed:
                              isEnabled && !_isLoading ? _nextPage : null,
                          style: ElevatedButton.styleFrom(
                            minimumSize: const Size(double.infinity, 48),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            backgroundColor: isEnabled
                                ? AppTheme.primaryColor
                                : Theme.of(context).disabledColor,
                            elevation: 0,
                          ),
                          child: Text(
                            _currentPage == pages.length - 1
                                ? 'Bitir'
                                : 'İlerle',
                            style: const TextStyle(
                              fontFamily: 'Figtree',
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  // Akademik alana göre varsayılan dersleri döndüren metod
  List<String> _getDefaultSubjectsForTrack(String academicTrack) {
    // TYT dersleri - tüm alanlar için ortak
    final tytSubjects = [
      'TYT Matematik',
      'TYT Türkçe',
      'TYT Fizik',
      'TYT Kimya',
      'TYT Biyoloji',
      'TYT Tarih',
      'TYT Coğrafya',
      'TYT Felsefe',
    ];

    switch (academicTrack.toLowerCase()) {
      case 'sayısal':
        return [
          ...tytSubjects, // Tüm TYT dersleri
          'AYT Matematik',
          'AYT Fizik',
          'AYT Kimya',
          'AYT Biyoloji',
        ];
      case 'sözel':
        return [
          ...tytSubjects, // Tüm TYT dersleri
          'AYT Türk Dili ve Edebiyatı',
          'AYT Tarih-1',
          'AYT Tarih-2',
          'AYT Coğrafya-1',
          'AYT Coğrafya-2',
          'AYT Felsefe Grubu',
          'AYT Din Kültürü ve Ahlak Bilgisi',
        ];
      case 'eşit ağırlık':
        return [
          ...tytSubjects, // Tüm TYT dersleri
          'AYT Matematik',
          'AYT Türk Dili ve Edebiyatı',
          'AYT Tarih-1',
          'AYT Coğrafya-1',
        ];
      case 'dil':
        return [
          ...tytSubjects, // Tüm TYT dersleri
          'AYT Yabancı Dil',
        ];
      case 'sadece tyt':
        return tytSubjects; // Sadece TYT dersleri
      default:
        return tytSubjects; // Varsayılan olarak TYT dersleri
    }
  }
}
