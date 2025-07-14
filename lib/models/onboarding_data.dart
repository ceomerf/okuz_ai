class OnboardingData {
  // Seçilen sınıf (9, 10, 11, 12, Mezun)
  String grade = '';
  
  // Hedeflenen sınav alanı (sayisal, esit, sozel, dil, tyt)
  String targetExam = '';
  
  // Başlangıç noktası (school: okulla birlikte, beginner: en baştan)
  String startPoint = '';
  
  // Plan türü (recommended: standart plan, custom: kişiselleştirilmiş)
  @Deprecated('Use planScope instead')
  String planType = '';

  // Plan kapsamı (full: tüm müfredat, custom: seçilen dersler)
  String planScope = '';
  
  // Günlük hedef (dakika cinsinden)
  double dailyGoalInHours = 2.0; // Varsayılan 2 saat
  
  // Kullanıcının haftalık çalışma günleri (1: Pazartesi, 2: Salı, 3: Çarşamba, 4: Perşembe, 5: Cuma, 6: Cumartesi, 7: Pazar)
  List<int> workDays = [1, 2, 3, 4, 5]; // Pazartesi'den Cuma'ya
  
  // Seçilen dersler
  List<String> selectedSubjects = [];
  
  // Bu bayrak, kullanıcının ders seçimi yapması gerekip gerekmediğini belirler.
  bool needsSubjectSelection = false;
  
  // Özet sayfasındaki onay durumu için
  bool isConfirmed = false;
  
  String fullName = '';
  String targetUniversity = '';
  String learningStyle = '';
  Map<String, String> confidenceLevels = {};
  List<String> preferredStudyTimes = [];
  
  // Sınava yönelik bir öğrenci mi? (11. sınıf, 12. sınıf veya Mezun)
  bool get isExamStudent => 
    grade == '11' || grade == '12' || grade == 'Mezun';
  
  // 9. sınıf, 10. sınıf veya 11. sınıf mı?
  bool get isIntermediateStudent =>
    grade == '9' || grade == '10' || grade == '11';
  
  // Firebase'e kaydedilecek verileri hazırlar
  Map<String, dynamic> toJson() {
    return {
      'grade': grade,
      'targetExam': targetExam,
      'startPoint': startPoint,
      'planScope': planScope,
      'dailyGoalInHours': dailyGoalInHours,
      'workDays': workDays,
      'selectedSubjects': selectedSubjects,
      'isConfirmed': isConfirmed,
      'fullName': fullName,
      'targetUniversity': targetUniversity,
      'learningStyle': learningStyle,
      'confidenceLevels': confidenceLevels,
      'preferredStudyTimes': preferredStudyTimes,
    };
  }
  
  // Firebase'den gelen verileri yükler
  void fromJson(Map<String, dynamic> json) {
    grade = json['grade'] ?? '';
    targetExam = json['targetExam'] ?? '';
    startPoint = json['startPoint'] ?? '';
    planScope = json['planScope'] ?? '';
    selectedSubjects = List<String>.from(json['selectedSubjects'] ?? []);
    dailyGoalInHours = json['dailyGoalInHours'] ?? 2.0;
    workDays = List<int>.from(json['workDays'] ?? [1, 2, 3, 4, 5]);
    needsSubjectSelection = json['needsSubjectSelection'] ?? false;
    isConfirmed = json['isConfirmed'] ?? false;
    fullName = json['fullName'] ?? '';
    targetUniversity = json['targetUniversity'] ?? '';
    learningStyle = json['learningStyle'] ?? '';
    confidenceLevels = Map<String, String>.from(json['confidenceLevels'] ?? {});
    preferredStudyTimes = List<String>.from(json['preferredStudyTimes'] ?? []);
  }
} 