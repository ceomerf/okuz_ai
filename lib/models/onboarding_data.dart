import 'package:okuz_ai/models/student_profile.dart';

/// Onboarding sürecinde toplanan veri modeli
class OnboardingData {
  // Temel bilgiler
  String fullName;
  String targetUniversity;

  // Hesap tipi (yeni)
  AccountType accountType;
  String? parentTitle; // Veli için: Dr., Öğretmen, vs.

  // Öğrenci-specific alanlar
  String grade;
  String academicTrack;
  String targetExam;
  String planScope;
  bool needsSubjectSelection;

  // Öğrenme tercihleri
  double dailyGoalInHours;
  List<String> preferredStudyTimes;
  int preferredSessionDuration; // 🚀 YENİ: İdeal çalışma seans süresi (dakika)
  String learningStyle;
  Map<String, String> confidenceLevels;

  // Backward compatibility fields
  List<String> selectedSubjects;
  List<int> workDays;
  String startPoint;

  // Tatil planı türü (sadece tatil döneminde kullanılır)
  String holidayPlanType;

  // Gelecek haftadaki tatil günlerinde çalışma tercihleri (tatil adı -> çalışacak mı)
  Map<String, bool> holidayWorkPreferences;

  // En son tamamlanan konular (ders bazında)
  Map<String, String> lastCompletedTopics;

  // Durum takibi
  bool isConfirmed;

  OnboardingData({
    this.fullName = '',
    this.targetUniversity = '',
    this.accountType = AccountType.student,
    this.parentTitle,
    this.grade = '',
    this.academicTrack = '',
    this.targetExam = '',
    this.planScope = '',
    this.needsSubjectSelection = false,
    this.dailyGoalInHours = 2.0,
    this.preferredStudyTimes = const [],
    this.preferredSessionDuration =
        25, // 🚀 Varsayılan: 25 dakika (Pomodoro standart)
    this.learningStyle = '',
    Map<String, String>? confidenceLevels,
    this.selectedSubjects = const [],
    this.workDays = const [1, 2, 3, 4, 5], // Pazartesi-Cuma
    this.startPoint = '',
    this.holidayPlanType = '',
    Map<String, bool>? holidayWorkPreferences,
    Map<String, String>? lastCompletedTopics,
    this.isConfirmed = false,
  })  : confidenceLevels = confidenceLevels ?? <String, String>{},
        holidayWorkPreferences = holidayWorkPreferences ?? <String, bool>{},
        lastCompletedTopics = lastCompletedTopics ?? <String, String>{};

  /// Onboarding'in tamamlanıp tamamlanmadığını kontrol et
  bool get isComplete {
    // Temel bilgiler
    if (fullName.trim().isEmpty) return false;

    if (accountType == AccountType.student) {
      // Öğrenci için gerekli alanlar
      return grade.isNotEmpty &&
          targetUniversity.trim().isNotEmpty &&
          learningStyle.isNotEmpty &&
          preferredStudyTimes.isNotEmpty &&
          isConfirmed;
    } else {
      // Veli için gerekli alanlar (daha minimal)
      return isConfirmed;
    }
  }

  /// Veli hesabı mı kontrol et
  bool get isParentAccount => accountType == AccountType.parent;

  /// Öğrenci hesabı mı kontrol et
  bool get isStudentAccount => accountType == AccountType.student;

  /// Çalışma günlerini gün adlarına dönüştür (backward compatibility)
  List<String> get studyDays {
    final dayNames = [
      'Pazartesi',
      'Salı',
      'Çarşamba',
      'Perşembe',
      'Cuma',
      'Cumartesi',
      'Pazar'
    ];
    return workDays.map((day) => dayNames[day - 1]).toList();
  }

  /// Onboarding verisini temizle
  void clear() {
    fullName = '';
    targetUniversity = '';
    accountType = AccountType.student;
    parentTitle = null;
    grade = '';
    academicTrack = '';
    targetExam = '';
    planScope = '';
    needsSubjectSelection = false;
    dailyGoalInHours = 2.0;
    preferredStudyTimes = [];
    preferredSessionDuration = 25; // 🚀 Varsayılan değere sıfırla
    learningStyle = '';
    confidenceLevels.clear();
    selectedSubjects = [];
    workDays = [1, 2, 3, 4, 5];
    startPoint = '';
    holidayPlanType = '';
    holidayWorkPreferences.clear();
    lastCompletedTopics = {};
    isConfirmed = false;
  }

  /// Debug için string representasyonu
  @override
  String toString() {
    return 'OnboardingData{fullName: $fullName, accountType: $accountType, grade: $grade, targetUniversity: $targetUniversity, learningStyle: $learningStyle, isComplete: $isComplete}';
  }
}
