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
import 'package:okuz_ai/widgets/onboarding/account_type_selection_page.dart';
import 'package:okuz_ai/services/plan_service.dart';
// Yeni sayfalar için importlar
import 'package:okuz_ai/widgets/onboarding/name_and_target_page.dart';
import 'package:okuz_ai/widgets/onboarding/learning_style_page.dart';
import 'package:okuz_ai/widgets/onboarding/confidence_levels_page.dart';
import 'package:okuz_ai/widgets/onboarding/preferred_study_times_page.dart';
import 'package:okuz_ai/widgets/onboarding/preferred_session_duration_page.dart'; // 🚀 YENİ
import 'package:okuz_ai/widgets/onboarding/holiday_plan_type_page.dart';
import 'package:okuz_ai/widgets/onboarding/starting_point_page.dart';
import 'package:okuz_ai/widgets/onboarding/last_topics_selection_page.dart';
import 'package:okuz_ai/screens/user_plan_screen.dart';
import 'package:okuz_ai/screens/profile_selection_screen.dart';
import 'package:okuz_ai/screens/plan_generation_status_screen.dart'; // 🚀 YENİ: Queue status ekranı
// import 'package:okuz_ai/screens/plan_setup_screen.dart'; // 🚀 KALDIRILDI: İnteraktif plan kurulum
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:provider/provider.dart';
import '../services/family_account_service.dart';
import '../services/mock_auth_service.dart';
import '../services/production_auth_service.dart';
import 'package:okuz_ai/models/student_profile.dart';
import 'parent_invite_screen.dart';
import 'package:okuz_ai/screens/family_portal_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:okuz_ai/screens/holiday_plan_choice_screen.dart';
import 'package:okuz_ai/screens/profile_screen.dart';

class OnboardingScreen extends StatefulWidget {
  final bool isStudentAccount; // Öğrenci hesabı mı oluşturuluyor?
  final AccountType? initialAccountType; // Başlangıç hesap tipi

  const OnboardingScreen({
    Key? key,
    this.isStudentAccount = false,
    this.initialAccountType,
  }) : super(key: key);

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  final OnboardingData _onboardingData = OnboardingData();
  final PlanService _planService = PlanService();
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
    // Eğer öğrenci hesabı oluşturuluyorsa veya initialAccountType parametresi verilmişse, hesap tipini ayarla
    if (widget.isStudentAccount) {
      _onboardingData.accountType = AccountType.student;
    } else if (widget.initialAccountType != null) {
      _onboardingData.accountType = widget.initialAccountType!;
    }

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

  Future<void> _checkHolidayStatus() async {
    try {
      // Önce ProductionAuthService'i dene, yoksa MockAuthService'i kullan
      final productionAuthService =
          Provider.of<ProductionAuthService>(context, listen: false);
      final currentUser = await productionAuthService.getCurrentUser();

      if (currentUser != null) {
        // ProductionAuthService ile giriş yapılmış
        final token = await productionAuthService.getToken();
        if (token != null) {
          final response = await http.get(
            Uri.parse(
                'http://89.116.38.173:3002/api/planning/check-holiday-status'),
            headers: {
              'Authorization': 'Bearer $token',
            },
          );

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
        }
      }

      // ProductionAuthService ile giriş yapılmamışsa MockAuthService'i dene
      final mockAuthService =
          Provider.of<MockAuthService>(context, listen: false);
      final user = mockAuthService.currentUser;
      if (user == null) return;

      final token = user.id; // Mock token
      final response = await http.get(
        Uri.parse(
            'http://89.116.38.173:3002/api/planning/check-holiday-status'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _isHoliday = result['isHoliday'] ?? false;
            _holidayReason = result['message'] ?? '';
            _holidayCheckLoading = false;
          });
        }
      } else {
        throw Exception('Tatil durumu kontrol edilemedi');
      }
    } catch (e) {
      print('Tatil durumu kontrol hatası: $e');
      if (mounted) {
        setState(() {
          _isHoliday = false;
          _holidayCheckLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
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
        targetWidgetType = ConfidenceLevelsPage;
        break;
      case OnboardingPageType.holidayPlanType:
        targetWidgetType = HolidayPlanTypePage;
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
      _pageController.animateToPage(
        index,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
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
        _pageController.animateToPage(
          nextPageIndex,
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeInOut,
        );
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
      if (page.key == const Key('field_selection')) {
        return (_onboardingData.grade?.isNotEmpty ?? false) &&
            ((int.tryParse(_onboardingData.grade ?? '') ?? 0) >= 11 ||
                (_onboardingData.grade ?? '') == 'Mezun');
      }

      // PlanScopePage - sınıf seçildikten sonra
      if (page.key == const Key('plan_scope')) {
        return (_onboardingData.grade?.isNotEmpty ?? false);
      }

      // SubjectSelectionPage - sadece custom plan seçildiğinde
      if (page.key == const Key('subject_selection')) {
        return _onboardingData.needsSubjectSelection;
      }

      // LastTopicsSelectionPage - subject selection tamamlandıktan sonra (hem normal hem tatil döneminde)
      if (page.key == const Key('last_topics')) {
        return !_holidayCheckLoading &&
            _onboardingData.selectedSubjects.isNotEmpty;
      }

      // DailyGoalPage - plan kapsamı seçildikten sonra
      if (page.key == const Key('daily_goal')) {
        return (_onboardingData.planScope?.isNotEmpty ?? false);
      }

      // PreferredStudyTimesPage - günlük hedef belirlendikten sonra
      if (page.key == const Key('study_times')) {
        return (_onboardingData.dailyGoalInHours ?? 0) > 0;
      }

      // PreferredSessionDurationPage - çalışma saatleri seçildikten sonra
      if (page.key == const Key('session_duration')) {
        return _onboardingData.preferredStudyTimes.isNotEmpty;
      }

      // LearningStylePage - ideal çalışma süresi belirlendikten sonra
      if (page.key == const Key('learning_style')) {
        return (_onboardingData.preferredSessionDuration ?? 0) > 0;
      }

      // ConfidenceLevelsPage - öğrenme stili seçildikten sonra
      if (page.key == const Key('confidence_levels')) {
        return (_onboardingData.learningStyle?.isNotEmpty ?? false);
      }

      // StartingPointPage - sadece normal dönemde ve güven seviyeleri belirlendikten sonra
      if (page.key == const Key('starting_point')) {
        return !_isHoliday &&
            !_holidayCheckLoading &&
            _onboardingData.confidenceLevels.isNotEmpty;
      }

      // HolidayPlanTypePage - sadece tatil döneminde ve güven seviyeleri belirlendikten sonra
      if (page.key == const Key('holiday_plan_type')) {
        return _isHoliday &&
            !_holidayCheckLoading &&
            _onboardingData.confidenceLevels.isNotEmpty;
      }

      // SummaryPage - güven seviyeleri belirlendikten sonra (tatilde ise plan türü, normal dönemde ise starting point seçilmeli)
      if (page.key == const Key('summary_student')) {
        if (_isHoliday && !_holidayCheckLoading) {
          return _onboardingData.confidenceLevels.isNotEmpty &&
              (_onboardingData.holidayPlanType?.isNotEmpty ?? false);
        } else if (!_isHoliday && !_holidayCheckLoading) {
          return _onboardingData.confidenceLevels.isNotEmpty &&
              (_onboardingData.startPoint?.isNotEmpty ?? false);
        }
        return _onboardingData.confidenceLevels.isNotEmpty;
      }
    }

    // Diğer sayfalar her zaman gösterilir
    return true;
  }

  void _previousPage() {
    if (_currentPage > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    }
  }

  // UI'ı yenilemek için kullanacağımız metod
  void _refreshUI() {
    setState(() {
      _refreshCounter++;
      // Hesap tipi değiştiğinde cache'i temizle
      if (_lastAccountType != _onboardingData.accountType) {
        _cachedPages = null;
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
      final familyService =
          Provider.of<FamilyAccountService>(context, listen: false);
      await familyService.loadAccountData();

      // Widget hâlâ mounted mı kontrol et
      if (!mounted) return;

      final accountType = familyService.accountType;

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
      } else {
        await prefs.setBool('is_parent_account', false);
      }

      // Tatil durumuna göre yönlendirme yap
      if (mounted) {
        if (_isHoliday) {
          // Tatil planı ekranına yönlendir
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => const HolidayPlanChoiceScreen(),
            ),
          );
        } else {
          // Normal plan ekranına yönlendir
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => const ProfileScreen(),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hata: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
        setState(() => _isLoading = false);
      }
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
    final productionAuthService =
        Provider.of<ProductionAuthService>(context, listen: false);
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

    // Öğrenci hesabı için ek veriler
    if (_onboardingData.accountType == AccountType.student) {
      data.addAll({
        'grade': _onboardingData.grade ?? '',
        'academicTrack': academicTrack,
        'targetUniversity': (_onboardingData.targetUniversity?.trim() ?? ''),
        'targetExam': targetExam,
        'learningStyle': _onboardingData.learningStyle ?? '',
        'confidenceLevels': _onboardingData.confidenceLevels,
        'preferredStudyTimes': _onboardingData.preferredStudyTimes,
        'preferredSessionDuration':
            (_onboardingData.preferredSessionDuration ?? 0), // 🚀 YENİ
        'studyDays': _onboardingData.studyDays,
        'dailyHours': (_onboardingData.dailyGoalInHours?.toInt() ?? 0),
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
      // API'ye gönder
      String authToken = 'mock_token';
      String apiUrl = 'http://localhost:3000/api/profile/complete-onboarding';

      // ProductionAuthService ile giriş yapılmışsa gerçek token kullan
      if (currentUser != null && token != null) {
        authToken = token;
        apiUrl = 'http://89.116.38.173:3002/api/users/complete-onboarding';
      }

      final response = await http.post(
        Uri.parse(apiUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode(data),
      );

      if (response.statusCode != 200) {
        final errorData = jsonDecode(response.body);
        throw Exception(
            'Kayıt başarısız: ${errorData['error'] ?? 'Bilinmeyen hata'}');
      }

      // Öğrenci hesabı için aile hesabına ekleme işlemi
      if (_onboardingData.accountType == AccountType.student) {
        debugPrint('✅ Öğrenci hesabı oluşturuldu: $userId');

        // Bu öğrenci hesabını mevcut veli hesabına ekle
        try {
          final familyService =
              Provider.of<FamilyAccountService>(context, listen: false);
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
    } catch (e) {
      debugPrint('❌ Express API kayıt hatası: $e');
      throw Exception('Kayıt sırasında bir hata oluştu: $e');
    }
  }

  List<Widget> _getPages() {
    // Hesap tipini kontrol et
    final accountType = _onboardingData.accountType;

    // Eğer hesap tipi değişmemişse ve cache varsa, cache'i döndür
    if (_cachedPages != null && _lastAccountType == accountType) {
      return _cachedPages!;
    }

    // Veli hesabı seçildiyse sadece veli onboarding sayfalarını göster
    if (accountType == AccountType.parent) {
      final parentPages = [
        WelcomePage(
            key: const Key('welcome_parent'),
            onNext: _refreshUI,
            isStudentAccount: false),
        AccountTypeSelectionPage(
          key: const Key('account_type_parent'),
          data: _onboardingData,
          onNext: _refreshUI,
        ),
        // Veli onboarding akışı - sadece temel bilgiler
        NameAndTargetPage(
          key: const Key('name_target_parent'),
          onboardingData: _onboardingData,
          onNext: _refreshUI,
          isParentMode: true, // Veli modu
        ),
        // Veli için özel özet sayfası
        SummaryPage(
          key: const Key('summary_parent'),
          onboardingData: _onboardingData,
          onConfirmationChanged: (isConfirmed) =>
              setState(() => _onboardingData.isConfirmed = isConfirmed),
          onEdit: _onEdit,
          isParentMode: true, // Veli modu
        ),
      ];

      // Cache'i güncelle
      _cachedPages = parentPages;
      _lastAccountType = accountType;
      return parentPages;
    }

    // Öğrenci hesabı için tam onboarding akışı
    final studentPages = [
      WelcomePage(
          key: const Key('welcome_student'),
          onNext: _refreshUI,
          isStudentAccount: widget.isStudentAccount),
      // Veli tarafından oluşturulan öğrenci hesabı ise AccountTypeSelectionPage'i atla
      if (!widget.isStudentAccount)
        AccountTypeSelectionPage(
          key: const Key('account_type_student'),
          data: _onboardingData,
          onNext: _refreshUI,
        ),
      NameAndTargetPage(
        key: const Key('name_target_student'),
        onboardingData: _onboardingData,
        onNext: _refreshUI,
      ),
      GradeSelectionPage(
        key: const Key('grade_selection'),
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
        key: const Key('field_selection'),
        onboardingData: _onboardingData,
        onSelectionChanged: (field) =>
            setState(() => _onboardingData.targetExam = field),
      ),
      PlanScopePage(
        key: const Key('plan_scope'),
        onboardingData: _onboardingData,
        onSelectionChanged: (planType) {
          setState(() {
            _onboardingData.planScope = planType;
            _onboardingData.needsSubjectSelection = (planType == 'custom');
          });
        },
      ),
      SubjectSelectionPage(
        key: const Key('subject_selection'),
        onboardingData: _onboardingData,
        onSelectionChanged: (subjects) =>
            setState(() => _onboardingData.selectedSubjects = subjects),
      ),
      LastTopicsSelectionPage(
        key: const Key('last_topics'),
        onboardingData: _onboardingData,
        onNext: _refreshUI,
      ),
      DailyGoalPage(
        key: const Key('daily_goal'),
        onboardingData: _onboardingData,
        onSelectionChanged: (goal) =>
            setState(() => _onboardingData.dailyGoalInHours = goal),
        onWorkDaysChanged: (days) =>
            setState(() => _onboardingData.workDays = days),
      ),
      PreferredStudyTimesPage(
        key: const Key('study_times'),
        onboardingData: _onboardingData,
        onNext: _refreshUI,
      ),
      PreferredSessionDurationPage(
        key: const Key('session_duration'),
        onboardingData: _onboardingData,
        onNext: _refreshUI,
      ),
      LearningStylePage(
        key: const Key('learning_style'),
        onboardingData: _onboardingData,
        onNext: _refreshUI,
      ),
      ConfidenceLevelsPage(
        key: const Key('confidence_levels'),
        onboardingData: _onboardingData,
        onNext: _refreshUI,
      ),
      // Normal dönemde başlangıç noktası seçimi
      if (!_isHoliday && !_holidayCheckLoading)
        StartingPointPage(
          key: const Key('starting_point'),
          onboardingData: _onboardingData,
          onSelectionChanged: (startingPoint) =>
              setState(() => _onboardingData.startPoint = startingPoint),
        ),
      // Tatil döneminde plan türü seçimi
      if (_isHoliday && !_holidayCheckLoading)
        HolidayPlanTypePage(
          key: const Key('holiday_plan_type'),
          onboardingData: _onboardingData,
          holidayReason: _holidayReason,
          onSelectionChanged: (planType) =>
              setState(() => _onboardingData.holidayPlanType = planType),
        ),
      SummaryPage(
        key: const Key('summary_student'),
        onboardingData: _onboardingData,
        onConfirmationChanged: (isConfirmed) =>
            setState(() => _onboardingData.isConfirmed = isConfirmed),
        onEdit: _onEdit,
      ),
    ];

    // Cache'i güncelle
    _cachedPages = studentPages;
    _lastAccountType = accountType;
    return studentPages;
  }

  bool _isNextEnabled(List<Widget> pages) {
    if (pages.isEmpty || _currentPage >= pages.length) return false;

    final currentPageWidget = pages[_currentPage];
    if (currentPageWidget is WelcomePage) return true;
    if (currentPageWidget is AccountTypeSelectionPage)
      return _onboardingData.accountType != null; // Hesap tipi seçilince aktif
    if (currentPageWidget is NameAndTargetPage) {
      // Veli modu için sadece isim gerekli
      if (_onboardingData.accountType == AccountType.parent) {
        return (_onboardingData.fullName?.isNotEmpty ?? false);
      }
      // Öğrenci modu için isim ve üniversite gerekli
      return (_onboardingData.fullName?.isNotEmpty ?? false) &&
          (_onboardingData.targetUniversity?.isNotEmpty ?? false);
    }
    if (currentPageWidget is GradeSelectionPage)
      return (_onboardingData.grade?.isNotEmpty ?? false);
    if (currentPageWidget is FieldSelectionPage)
      return (_onboardingData.targetExam?.isNotEmpty ?? false);
    if (currentPageWidget is PlanScopePage)
      return (_onboardingData.planScope?.isNotEmpty ?? false);
    if (currentPageWidget is SubjectSelectionPage)
      return _onboardingData.selectedSubjects.isNotEmpty;
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
    if (currentPageWidget is ConfidenceLevelsPage)
      return _onboardingData.confidenceLevels.isNotEmpty;
    if (currentPageWidget is StartingPointPage)
      return (_onboardingData.startPoint?.isNotEmpty ?? false);
    if (currentPageWidget is HolidayPlanTypePage)
      return (_onboardingData.holidayPlanType?.isNotEmpty ?? false);
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
            child: PageView(
              controller: _pageController,
              physics:
                  const NeverScrollableScrollPhysics(), // Kaydırmayı devre dışı bırak
              onPageChanged: (int page) {
                setState(() {
                  _currentPage = page;
                });
              },
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
}
