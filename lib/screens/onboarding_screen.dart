import 'package:dots_indicator/dots_indicator.dart';
import 'package:flutter/material.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/models/onboarding_page_type.dart';
import 'package:okuz_ai/screens/holiday_plan_choice_screen.dart';
import 'package:okuz_ai/screens/plan_generation_screen.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:flutter/cupertino.dart';
import 'package:okuz_ai/widgets/onboarding/daily_goal_page.dart';
import 'package:okuz_ai/widgets/onboarding/field_selection_page.dart';
import 'package:okuz_ai/widgets/onboarding/grade_selection_page.dart';
import 'package:okuz_ai/widgets/onboarding/plan_scope_page.dart';
import 'package:okuz_ai/widgets/onboarding/subject_selection_page.dart';
import 'package:okuz_ai/widgets/onboarding/summary_page.dart';
import 'package:okuz_ai/widgets/onboarding/welcome_page.dart';
import 'package:okuz_ai/services/plan_service.dart';
import 'package:provider/provider.dart';
// Yeni sayfalar için importlar
import 'package:okuz_ai/widgets/onboarding/name_and_target_page.dart';
import 'package:okuz_ai/widgets/onboarding/learning_style_page.dart';
import 'package:okuz_ai/widgets/onboarding/confidence_levels_page.dart';
import 'package:okuz_ai/widgets/onboarding/preferred_study_times_page.dart';
import 'package:okuz_ai/screens/advanced_profile_screen.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({Key? key}) : super(key: key);

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
      case OnboardingPageType.learningStyle:
        targetWidgetType = LearningStylePage;
        break;
      case OnboardingPageType.confidenceLevels:
        targetWidgetType = ConfidenceLevelsPage;
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
    if (_currentPage == _getPages().length - 1) {
      // Son sayfadaysak, plan oluşturma veya tatil ekranına yönlendirme mantığını çalıştır
      _handleCompletion();
    } else {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    }
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
    });
  }

  Future<void> _handleCompletion() async {
    setState(() => _isLoading = true);

    try {
      // Onboarding verilerini Firebase'e kaydet
      await _saveOnboardingData();
      
      // Gelişmiş profil ekranına yönlendir
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const AdvancedProfileScreen(),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Hata: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _saveOnboardingData() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturum açmamış');
    }

    // Cloud Functions'a gönder
    final callable = FirebaseFunctions.instance.httpsCallable('completeOnboardingProfile');
    await callable.call({
      'fullName': _onboardingData.fullName,
      'grade': _onboardingData.grade,
      'academicTrack': _onboardingData.academicTrack,
      'targetUniversity': _onboardingData.targetUniversity,
      'targetExam': _onboardingData.targetExam,
      'learningStyle': _onboardingData.learningStyle,
      'confidenceLevels': _onboardingData.confidenceLevels,
      'preferredStudyTimes': _onboardingData.preferredStudyTimes,
      'studyDays': _onboardingData.studyDays,
      'dailyHours': _onboardingData.dailyGoalInHours.toInt(),
    });
  }

  List<Widget> _getPages() {
    return [
      WelcomePage(onNext: _refreshUI), // UI'ı yenilemek için _refreshUI çağır
      NameAndTargetPage(
        onboardingData: _onboardingData,
        onNext: _refreshUI, // UI'ı yenilemek için _refreshUI çağır
      ),
      GradeSelectionPage(
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
      if (_onboardingData.grade.isNotEmpty &&
          ((int.tryParse(_onboardingData.grade) ?? 0) >= 11 ||
              _onboardingData.grade == 'Mezun'))
        FieldSelectionPage(
          onboardingData: _onboardingData,
          onSelectionChanged: (field) =>
              setState(() => _onboardingData.targetExam = field),
        ),
      if (_onboardingData.grade.isNotEmpty)
        PlanScopePage(
          onboardingData: _onboardingData,
          onSelectionChanged: (planType) {
            setState(() {
              _onboardingData.planScope = planType;
              _onboardingData.needsSubjectSelection = (planType == 'custom');
            });
          },
        ),
      if (_onboardingData.needsSubjectSelection)
        SubjectSelectionPage(
          onboardingData: _onboardingData,
          onSelectionChanged: (subjects) =>
              setState(() => _onboardingData.selectedSubjects = subjects),
        ),
      if (_onboardingData.planScope.isNotEmpty)
        DailyGoalPage(
          onboardingData: _onboardingData,
          onSelectionChanged: (goal) =>
              setState(() => _onboardingData.dailyGoalInHours = goal),
          onWorkDaysChanged: (days) =>
              setState(() => _onboardingData.workDays = days),
        ),
      if (_onboardingData.dailyGoalInHours > 0)
        PreferredStudyTimesPage(
          onboardingData: _onboardingData,
          onNext: _refreshUI, // UI'ı yenilemek için _refreshUI çağır
        ),
      if (_onboardingData.preferredStudyTimes.isNotEmpty)
        LearningStylePage(
          onboardingData: _onboardingData,
          onNext: _refreshUI, // UI'ı yenilemek için _refreshUI çağır
        ),
      if (_onboardingData.learningStyle.isNotEmpty)
        ConfidenceLevelsPage(
          onboardingData: _onboardingData,
          onNext: _refreshUI, // UI'ı yenilemek için _refreshUI çağır
        ),
      if (_onboardingData.confidenceLevels.isNotEmpty)
        SummaryPage(
          onboardingData: _onboardingData,
          onConfirmationChanged: (isConfirmed) =>
              setState(() => _onboardingData.isConfirmed = isConfirmed),
          onEdit: _onEdit,
        ),
    ];
  }

  bool _isNextEnabled(List<Widget> pages) {
    if (pages.isEmpty || _currentPage >= pages.length) return false;

    final currentPageWidget = pages[_currentPage];
    if (currentPageWidget is WelcomePage) return true;
    if (currentPageWidget is NameAndTargetPage) 
      return _onboardingData.fullName.isNotEmpty && _onboardingData.targetUniversity.isNotEmpty;
    if (currentPageWidget is GradeSelectionPage)
      return _onboardingData.grade.isNotEmpty;
    if (currentPageWidget is FieldSelectionPage)
      return _onboardingData.targetExam.isNotEmpty;
    if (currentPageWidget is PlanScopePage)
      return _onboardingData.planScope.isNotEmpty;
    if (currentPageWidget is SubjectSelectionPage)
      return _onboardingData.selectedSubjects.isNotEmpty;
    if (currentPageWidget is DailyGoalPage)
      return _onboardingData.dailyGoalInHours > 0;
    if (currentPageWidget is PreferredStudyTimesPage) 
      return _onboardingData.preferredStudyTimes.isNotEmpty;
    if (currentPageWidget is LearningStylePage) 
      return _onboardingData.learningStyle.isNotEmpty;
    if (currentPageWidget is ConfidenceLevelsPage) 
      return _onboardingData.confidenceLevels.isNotEmpty;
    if (currentPageWidget is SummaryPage) 
      return _onboardingData.isConfirmed;

    return false;
  }

  @override
  Widget build(BuildContext context) {
    final pages = _getPages();
    final isEnabled = _isNextEnabled(pages);
    final isFirstPage = _currentPage == 0;

    // Debug bilgisi yazdır
    print('Current page: $_currentPage, isEnabled: $isEnabled');
    print('FullName: ${_onboardingData.fullName}, Target: ${_onboardingData.targetUniversity}');
    print('LearningStyle: ${_onboardingData.learningStyle}');
    print('PreferredStudyTimes: ${_onboardingData.preferredStudyTimes}');

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.only(
                bottom: 100.0), // Buton ve gösterge için boşluk
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(), // Kaydırmayı devre dışı bırak
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
                color: AppTheme.backgroundColor,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -5),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DotsIndicator(
                    dotsCount: pages.length,
                    position: _currentPage,
                    decorator: DotsDecorator(
                      size: const Size.square(8.0),
                      activeSize: const Size(24.0, 8.0),
                      activeShape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(5.0)),
                      color: Colors.grey.shade400,
                      activeColor: AppTheme.primaryColor,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      // Geri butonu - ilk sayfada görünmez
                      if (!isFirstPage)
                        Container(
                          margin: const EdgeInsets.only(right: 12),
                          decoration: BoxDecoration(
                            color: AppTheme.cardColor,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade300),
                          ),
                          child: IconButton(
                            icon: const Icon(Icons.arrow_back_ios_rounded,
                                size: 18),
                            onPressed: _previousPage,
                            color: AppTheme.textPrimaryColor,
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
                                : Colors.grey.shade400,
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
