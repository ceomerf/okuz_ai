import 'account_type.dart';

class OnboardingData {
  AccountType accountType;
  String? studentName;
  String? targetExam;
  String? grade;
  String? field;
  String? selectedField;
  int? currentScore;
  int? targetScore;
  String? studyGoal;
  List<String> subjects;
  List<String> weakTopics;
  List<String> lastTopics;
  String? parentName;
  String? relationshipToStudent;
  String? planScope;
  String? studyTime;
  String? sessionDuration;
  String? difficultyLevel;
  String? planType;
  String? startingPoint;
  List<String> selectedConfidenceLevels;
  String? dailyGoal;
  String? holidayPlanType;
  List<String> selectedSubjects;
  String? targetUniversity;
  String? fullName;
  int? preferredSessionDuration;
  List<String> preferredStudyTimes;
  String? startPoint;
  bool isConfirmed;
  Map<String, String> confidenceLevels;
  double? dailyGoalInHours;
  List<int> workDays;
  String? academicTrack;
  Map<String, dynamic> holidayWorkPreferences;
  Map<String, String> lastCompletedTopics;
  String? learningStyle;
  bool needsSubjectSelection;
  List<int> studyDays; // Eksik alan eklendi

  OnboardingData({
    this.accountType = AccountType.student,
    this.studentName,
    this.targetExam,
    this.grade,
    this.field,
    this.selectedField,
    this.currentScore,
    this.targetScore,
    this.studyGoal,
    this.subjects = const [],
    this.weakTopics = const [],
    this.lastTopics = const [],
    this.parentName,
    this.relationshipToStudent,
    this.planScope,
    this.studyTime,
    this.sessionDuration,
    this.difficultyLevel,
    this.planType,
    this.startingPoint,
    this.selectedConfidenceLevels = const [],
    this.dailyGoal,
    this.holidayPlanType,
    this.selectedSubjects = const [],
    this.targetUniversity,
    this.fullName,
    this.preferredSessionDuration,
    this.preferredStudyTimes = const [],
    this.startPoint,
    this.isConfirmed = false,
    this.confidenceLevels = const {},
    this.dailyGoalInHours,
    this.workDays = const [],
    this.academicTrack,
    this.holidayWorkPreferences = const {},
    this.lastCompletedTopics = const {},
    this.learningStyle,
    this.needsSubjectSelection = false,
    this.studyDays = const [],
  });

  Map<String, dynamic> toJson() {
    return {
      'accountType': accountType.name,
      'studentName': studentName,
      'targetExam': targetExam,
      'grade': grade,
      'field': field,
      'selectedField': selectedField,
      'currentScore': currentScore,
      'targetScore': targetScore,
      'studyGoal': studyGoal,
      'subjects': subjects,
      'weakTopics': weakTopics,
      'lastTopics': lastTopics,
      'parentName': parentName,
      'relationshipToStudent': relationshipToStudent,
      'planScope': planScope,
      'studyTime': studyTime,
      'sessionDuration': sessionDuration,
      'difficultyLevel': difficultyLevel,
      'planType': planType,
      'startingPoint': startingPoint,
      'selectedConfidenceLevels': selectedConfidenceLevels,
      'dailyGoal': dailyGoal,
      'holidayPlanType': holidayPlanType,
      'selectedSubjects': selectedSubjects,
      'targetUniversity': targetUniversity,
      'fullName': fullName,
      'preferredSessionDuration': preferredSessionDuration,
      'preferredStudyTimes': preferredStudyTimes,
      'startPoint': startPoint,
      'isConfirmed': isConfirmed,
      'confidenceLevels': confidenceLevels,
      'dailyGoalInHours': dailyGoalInHours,
      'workDays': workDays,
      'academicTrack': academicTrack,
      'holidayWorkPreferences': holidayWorkPreferences,
      'lastCompletedTopics': lastCompletedTopics,
      'learningStyle': learningStyle,
      'needsSubjectSelection': needsSubjectSelection,
      'studyDays': studyDays,
    };
  }

  factory OnboardingData.fromJson(Map<String, dynamic> json) {
    return OnboardingData(
      accountType: AccountType.values.firstWhere(
        (e) => e.name == json['accountType'],
        orElse: () => AccountType.student,
      ),
      studentName: json['studentName'],
      targetExam: json['targetExam'],
      grade: json['grade'],
      field: json['field'],
      selectedField: json['selectedField'],
      currentScore: json['currentScore'],
      targetScore: json['targetScore'],
      studyGoal: json['studyGoal'],
      subjects: List<String>.from(json['subjects'] ?? []),
      weakTopics: List<String>.from(json['weakTopics'] ?? []),
      lastTopics: List<String>.from(json['lastTopics'] ?? []),
      parentName: json['parentName'],
      relationshipToStudent: json['relationshipToStudent'],
      planScope: json['planScope'],
      studyTime: json['studyTime'],
      sessionDuration: json['sessionDuration'],
      difficultyLevel: json['difficultyLevel'],
      planType: json['planType'],
      startingPoint: json['startingPoint'],
      selectedConfidenceLevels:
          List<String>.from(json['selectedConfidenceLevels'] ?? []),
      dailyGoal: json['dailyGoal'],
      holidayPlanType: json['holidayPlanType'],
      selectedSubjects: List<String>.from(json['selectedSubjects'] ?? []),
      targetUniversity: json['targetUniversity'],
      fullName: json['fullName'],
      preferredSessionDuration: json['preferredSessionDuration'],
      preferredStudyTimes: List<String>.from(json['preferredStudyTimes'] ?? []),
      startPoint: json['startPoint'],
      isConfirmed: json['isConfirmed'],
      confidenceLevels:
          Map<String, String>.from(json['confidenceLevels'] ?? {}),
      dailyGoalInHours: json['dailyGoalInHours'],
      workDays: List<int>.from(json['workDays'] ?? []),
      academicTrack: json['academicTrack'],
      holidayWorkPreferences: json['holidayWorkPreferences'],
      lastCompletedTopics:
          Map<String, String>.from(json['lastCompletedTopics'] ?? {}),
      learningStyle: json['learningStyle'],
      needsSubjectSelection: json['needsSubjectSelection'],
      studyDays: List<int>.from(json['studyDays'] ?? []),
    );
  }

  OnboardingData copyWith({
    AccountType? accountType,
    String? studentName,
    String? targetExam,
    String? grade,
    String? field,
    String? selectedField,
    int? currentScore,
    int? targetScore,
    String? studyGoal,
    List<String>? subjects,
    List<String>? weakTopics,
    List<String>? lastTopics,
    String? parentName,
    String? relationshipToStudent,
    String? planScope,
    String? studyTime,
    String? sessionDuration,
    String? difficultyLevel,
    String? planType,
    String? startingPoint,
    List<String>? selectedConfidenceLevels,
    String? dailyGoal,
    List<int>? studyDays,
    String? holidayPlanType,
    List<String>? selectedSubjects,
    String? targetUniversity,
    String? fullName,
    int? preferredSessionDuration,
    List<String>? preferredStudyTimes,
    String? startPoint,
    bool? isConfirmed,
    Map<String, String>? confidenceLevels,
    double? dailyGoalInHours,
    List<int>? workDays,
    String? academicTrack,
    Map<String, dynamic>? holidayWorkPreferences,
    Map<String, String>? lastCompletedTopics,
    String? learningStyle,
    bool? needsSubjectSelection,
  }) {
    return OnboardingData(
      accountType: accountType ?? this.accountType,
      studentName: studentName ?? this.studentName,
      targetExam: targetExam ?? this.targetExam,
      grade: grade ?? this.grade,
      field: field ?? this.field,
      selectedField: selectedField ?? this.selectedField,
      currentScore: currentScore ?? this.currentScore,
      targetScore: targetScore ?? this.targetScore,
      studyGoal: studyGoal ?? this.studyGoal,
      subjects: subjects ?? this.subjects,
      weakTopics: weakTopics ?? this.weakTopics,
      lastTopics: lastTopics ?? this.lastTopics,
      parentName: parentName ?? this.parentName,
      relationshipToStudent:
          relationshipToStudent ?? this.relationshipToStudent,
      planScope: planScope ?? this.planScope,
      studyTime: studyTime ?? this.studyTime,
      sessionDuration: sessionDuration ?? this.sessionDuration,
      difficultyLevel: difficultyLevel ?? this.difficultyLevel,
      planType: planType ?? this.planType,
      startingPoint: startingPoint ?? this.startingPoint,
      selectedConfidenceLevels:
          selectedConfidenceLevels ?? this.selectedConfidenceLevels,
      dailyGoal: dailyGoal ?? this.dailyGoal,
      holidayPlanType: holidayPlanType ?? this.holidayPlanType,
      selectedSubjects: selectedSubjects ?? this.selectedSubjects,
      targetUniversity: targetUniversity ?? this.targetUniversity,
      fullName: fullName ?? this.fullName,
      preferredSessionDuration:
          preferredSessionDuration ?? this.preferredSessionDuration,
      preferredStudyTimes: preferredStudyTimes ?? this.preferredStudyTimes,
      startPoint: startPoint ?? this.startPoint,
      isConfirmed: isConfirmed ?? this.isConfirmed,
      confidenceLevels: confidenceLevels ?? this.confidenceLevels,
      dailyGoalInHours: dailyGoalInHours ?? this.dailyGoalInHours,
      workDays: workDays ?? this.workDays,
      academicTrack: academicTrack ?? this.academicTrack,
      holidayWorkPreferences:
          holidayWorkPreferences ?? this.holidayWorkPreferences,
      lastCompletedTopics: lastCompletedTopics ?? this.lastCompletedTopics,
      learningStyle: learningStyle ?? this.learningStyle,
      needsSubjectSelection:
          needsSubjectSelection ?? this.needsSubjectSelection,
      studyDays: studyDays ?? this.studyDays,
    );
  }

  // Getter and Setter for new fields
  List<String> get getSelectedSubjects => selectedSubjects;
  set setSelectedSubjects(List<String> subjects) => selectedSubjects = subjects;

  String? get getTargetUniversity => targetUniversity;
  set setTargetUniversity(String? university) => targetUniversity = university;

  String? get getFullName => fullName;
  set setFullName(String? name) => fullName = name;

  int? get getPreferredSessionDuration => preferredSessionDuration;
  set setPreferredSessionDuration(int? duration) =>
      preferredSessionDuration = duration;

  List<String> get getPreferredStudyTimes => preferredStudyTimes;
  set setPreferredStudyTimes(List<String> times) => preferredStudyTimes = times;

  String? get getStartPoint => startPoint;
  set setStartPoint(String? point) => startPoint = point;

  bool get getIsConfirmed => isConfirmed;
  set setIsConfirmed(bool confirmed) => isConfirmed = confirmed;

  Map<String, String> get getConfidenceLevels => confidenceLevels;
  set setConfidenceLevels(Map<String, String> levels) =>
      confidenceLevels = levels;

  double? get getDailyGoalInHours => dailyGoalInHours;
  set setDailyGoalInHours(double? goal) => dailyGoalInHours = goal;

  List<int> get getWorkDays => workDays;
  set setWorkDays(List<int> days) => workDays = days;

  String? get getAcademicTrack => academicTrack;
  set setAcademicTrack(String? track) => academicTrack = track;

  Map<String, dynamic> get getHolidayWorkPreferences => holidayWorkPreferences;
  set setHolidayWorkPreferences(Map<String, dynamic> preferences) =>
      holidayWorkPreferences = preferences;

  Map<String, String> get getLastCompletedTopics => lastCompletedTopics;
  set setLastCompletedTopics(Map<String, String> topics) =>
      lastCompletedTopics = topics;

  String? get getLearningStyle => learningStyle;
  set setLearningStyle(String? style) => learningStyle = style;

  bool get getNeedsSubjectSelection => needsSubjectSelection;
  set setNeedsSubjectSelection(bool selection) =>
      needsSubjectSelection = selection;
}
