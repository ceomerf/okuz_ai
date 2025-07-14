class LearningHabits {
  final int focusDuration; // dakika cinsinden ortalama odaklanma süresi
  final int procrastinationLevel; // 1-10 arası erteleme eğilimi (10: çok yüksek)
  final String preferredStudyTime; // 'morning', 'afternoon', 'evening', 'night'
  final String preferredEnvironment; // 'quiet', 'background_noise', 'music', 'outdoors'
  final int breakFrequency; // dakika cinsinden mola sıklığı
  final int breakDuration; // dakika cinsinden mola süresi
  final List<String> distractions; // dikkat dağıtan faktörler
  final String preferredLearningMethod; // 'visual', 'auditory', 'reading', 'practice'
  final int retentionDuration; // gün cinsinden bilgi hatırlama süresi
  final bool needsDeadlines; // son teslim tarihleri motivasyon sağlıyor mu?

  LearningHabits({
    required this.focusDuration,
    required this.procrastinationLevel,
    required this.preferredStudyTime,
    required this.preferredEnvironment,
    required this.breakFrequency,
    required this.breakDuration,
    required this.distractions,
    required this.preferredLearningMethod,
    required this.retentionDuration,
    required this.needsDeadlines,
  });

  Map<String, dynamic> toJson() {
    return {
      'focusDuration': focusDuration,
      'procrastinationLevel': procrastinationLevel,
      'preferredStudyTime': preferredStudyTime,
      'preferredEnvironment': preferredEnvironment,
      'breakFrequency': breakFrequency,
      'breakDuration': breakDuration,
      'distractions': distractions,
      'preferredLearningMethod': preferredLearningMethod,
      'retentionDuration': retentionDuration,
      'needsDeadlines': needsDeadlines,
    };
  }

  factory LearningHabits.fromJson(Map<String, dynamic> json) {
    return LearningHabits(
      focusDuration: json['focusDuration'],
      procrastinationLevel: json['procrastinationLevel'],
      preferredStudyTime: json['preferredStudyTime'],
      preferredEnvironment: json['preferredEnvironment'],
      breakFrequency: json['breakFrequency'],
      breakDuration: json['breakDuration'],
      distractions: List<String>.from(json['distractions']),
      preferredLearningMethod: json['preferredLearningMethod'],
      retentionDuration: json['retentionDuration'],
      needsDeadlines: json['needsDeadlines'],
    );
  }
}

// Anket soruları için yardımcı sınıflar
class LearningHabitsQuestion {
  final String id;
  final String question;
  final String type; // 'slider', 'radio', 'checkbox', 'text'
  final List<String>? options;
  final int? minValue;
  final int? maxValue;
  final String? unit;

  LearningHabitsQuestion({
    required this.id,
    required this.question,
    required this.type,
    this.options,
    this.minValue,
    this.maxValue,
    this.unit,
  });
}

class LearningHabitsQuestionnaire {
  static List<LearningHabitsQuestion> getQuestions() {
    return [
      LearningHabitsQuestion(
        id: 'focusDuration',
        question: 'Ortalama olarak, ara vermeden ne kadar süre odaklanabilirsiniz?',
        type: 'slider',
        minValue: 5,
        maxValue: 120,
        unit: 'dakika',
      ),
      LearningHabitsQuestion(
        id: 'procrastinationLevel',
        question: 'Çalışmayı erteleme eğiliminizi 1-10 arasında puanlayın (10: çok yüksek)',
        type: 'slider',
        minValue: 1,
        maxValue: 10,
      ),
      LearningHabitsQuestion(
        id: 'preferredStudyTime',
        question: 'Hangi zaman diliminde çalışmak sizin için daha verimli?',
        type: 'radio',
        options: ['Sabah (06:00-12:00)', 'Öğleden sonra (12:00-18:00)', 'Akşam (18:00-22:00)', 'Gece (22:00-06:00)'],
      ),
      LearningHabitsQuestion(
        id: 'preferredEnvironment',
        question: 'Hangi ortamda çalışmayı tercih edersiniz?',
        type: 'radio',
        options: ['Sessiz ortam', 'Hafif arka plan gürültüsü', 'Müzik eşliğinde', 'Açık havada'],
      ),
      LearningHabitsQuestion(
        id: 'breakFrequency',
        question: 'Çalışırken ne sıklıkta mola verirsiniz?',
        type: 'slider',
        minValue: 15,
        maxValue: 120,
        unit: 'dakika',
      ),
      LearningHabitsQuestion(
        id: 'breakDuration',
        question: 'Molalarınız genellikle ne kadar sürer?',
        type: 'slider',
        minValue: 5,
        maxValue: 30,
        unit: 'dakika',
      ),
      LearningHabitsQuestion(
        id: 'distractions',
        question: 'Çalışırken sizi en çok ne dağıtır?',
        type: 'checkbox',
        options: ['Telefon bildirimleri', 'Sosyal medya', 'Aile/arkadaşlar', 'Gürültü', 'Açlık/susuzluk', 'Yorgunluk'],
      ),
      LearningHabitsQuestion(
        id: 'preferredLearningMethod',
        question: 'Yeni bir konuyu öğrenirken hangi yöntem sizin için en etkili?',
        type: 'radio',
        options: ['Görsel materyaller (video, grafik)', 'Dinleyerek (podcast, ders)', 'Okuyarak (kitap, makale)', 'Uygulayarak (pratik, deney)'],
      ),
      LearningHabitsQuestion(
        id: 'retentionDuration',
        question: 'Öğrendiğiniz bir bilgiyi tekrar etmeden ne kadar süre hatırlayabilirsiniz?',
        type: 'slider',
        minValue: 1,
        maxValue: 30,
        unit: 'gün',
      ),
      LearningHabitsQuestion(
        id: 'needsDeadlines',
        question: 'Son teslim tarihleri sizin için motivasyon kaynağı mıdır?',
        type: 'radio',
        options: ['Evet', 'Hayır'],
      ),
    ];
  }

  static Map<String, dynamic> processAnswers(Map<String, dynamic> answers) {
    // Cevapları işleyip uygun formata dönüştür
    final Map<String, dynamic> processedAnswers = {};
    
    // focusDuration: doğrudan kullan
    processedAnswers['focusDuration'] = answers['focusDuration'];
    
    // procrastinationLevel: doğrudan kullan
    processedAnswers['procrastinationLevel'] = answers['procrastinationLevel'];
    
    // preferredStudyTime: seçeneği uygun formata dönüştür
    final studyTimeMap = {
      'Sabah (06:00-12:00)': 'morning',
      'Öğleden sonra (12:00-18:00)': 'afternoon',
      'Akşam (18:00-22:00)': 'evening',
      'Gece (22:00-06:00)': 'night',
    };
    processedAnswers['preferredStudyTime'] = studyTimeMap[answers['preferredStudyTime']] ?? 'afternoon';
    
    // preferredEnvironment: seçeneği uygun formata dönüştür
    final environmentMap = {
      'Sessiz ortam': 'quiet',
      'Hafif arka plan gürültüsü': 'background_noise',
      'Müzik eşliğinde': 'music',
      'Açık havada': 'outdoors',
    };
    processedAnswers['preferredEnvironment'] = environmentMap[answers['preferredEnvironment']] ?? 'quiet';
    
    // breakFrequency: doğrudan kullan
    processedAnswers['breakFrequency'] = answers['breakFrequency'];
    
    // breakDuration: doğrudan kullan
    processedAnswers['breakDuration'] = answers['breakDuration'];
    
    // distractions: doğrudan kullan
    processedAnswers['distractions'] = answers['distractions'] ?? [];
    
    // preferredLearningMethod: seçeneği uygun formata dönüştür
    final learningMethodMap = {
      'Görsel materyaller (video, grafik)': 'visual',
      'Dinleyerek (podcast, ders)': 'auditory',
      'Okuyarak (kitap, makale)': 'reading',
      'Uygulayarak (pratik, deney)': 'practice',
    };
    processedAnswers['preferredLearningMethod'] = learningMethodMap[answers['preferredLearningMethod']] ?? 'visual';
    
    // retentionDuration: doğrudan kullan
    processedAnswers['retentionDuration'] = answers['retentionDuration'];
    
    // needsDeadlines: boolean'a dönüştür
    processedAnswers['needsDeadlines'] = answers['needsDeadlines'] == 'Evet';
    
    return processedAnswers;
  }
} 