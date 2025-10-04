enum CurriculumPreference {
  schoolBased('okul_odakli'),
  examBased('sinav_odakli');

  const CurriculumPreference(this.value);
  final String value;

  String get displayName {
    switch (this) {
      case CurriculumPreference.schoolBased:
        return 'Okul Odaklı';
      case CurriculumPreference.examBased:
        return 'Sınav Odaklı';
    }
  }

  String get description {
    switch (this) {
      case CurriculumPreference.schoolBased:
        return 'Konular MEB 12. sınıf müfredatına göre sıralı ve paralel ilerler. Okul temposu ile uyumlu çalışma.';
      case CurriculumPreference.examBased:
        return 'YKS sınav önceligine göre konular yeniden sıralanır. TYT + AYT harmanlanarak en etkili şekilde çalışılır.';
    }
  }

  static CurriculumPreference fromString(String value) {
    return CurriculumPreference.values.firstWhere(
      (e) => e.value == value,
      orElse: () => CurriculumPreference.schoolBased,
    );
  }
}

// YKS akademik alanları
enum AcademicTrack {
  numerical('sayisal'),
  equalWeight('esit_agirlik'),
  verbal('sozel'),
  language('dil');

  const AcademicTrack(this.value);
  final String value;

  String get displayName {
    switch (this) {
      case AcademicTrack.numerical:
        return 'Sayısal';
      case AcademicTrack.equalWeight:
        return 'Eşit Ağırlık';
      case AcademicTrack.verbal:
        return 'Sözel';
      case AcademicTrack.language:
        return 'Dil';
    }
  }

  List<String> get defaultSubjects {
    switch (this) {
      case AcademicTrack.numerical:
        return ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'];
      case AcademicTrack.equalWeight:
        return ['Matematik', 'Türk Dili ve Edebiyatı', 'Tarih', 'Coğrafya'];
      case AcademicTrack.verbal:
        return ['Türk Dili ve Edebiyatı', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü'];
      case AcademicTrack.language:
        return ['İngilizce'];
    }
  }

  List<String> get tytSubjects {
    return ['Türkçe', 'Sosyal Bilimler', 'Temel Matematik', 'Fen Bilimleri'];
  }

  static AcademicTrack fromString(String value) {
    return AcademicTrack.values.firstWhere(
      (e) => e.value == value,
      orElse: () => AcademicTrack.numerical,
    );
  }
}

// YKS plan kapsamı
enum PlanScope {
  standard('standard'),
  custom('custom');

  const PlanScope(this.value);
  final String value;

  String get displayName {
    switch (this) {
      case PlanScope.standard:
        return 'AI Önerisi';
      case PlanScope.custom:
        return 'Kendim Seçeceğim';
    }
  }

  String get description {
    switch (this) {
      case PlanScope.standard:
        return 'Sınıf ve alanına göre AI otomatik derslerini belirler';
      case PlanScope.custom:
        return 'Çalışmak istediğin dersleri kendin seçersin';
    }
  }

  static PlanScope fromString(String value) {
    return PlanScope.values.firstWhere(
      (e) => e.value == value,
      orElse: () => PlanScope.standard,
    );
  }
} 