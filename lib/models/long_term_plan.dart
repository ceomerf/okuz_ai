// Firebase bağımlılığı kaldırıldı - JWT backend kullanılıyor

class LongTermPlan {
  final String id;
  final String title;
  final String description;
  final DateTime startDate;
  final DateTime endDate;
  final List<String> goals;
  final List<Week>? _weeks;

  LongTermPlan({
    required this.id,
    required this.title,
    required this.description,
    required this.startDate,
    required this.endDate,
    required this.goals,
    List<Week>? weeks,
  }) : _weeks = weeks;

  List<Week> get weeks => _weeks ?? [];

  factory LongTermPlan.fromJson(Map<String, dynamic> json) {
    // Backend'den gelen veri yapısını kontrol et ve uygun şekilde işle
    List<Week>? weeks;
    
    // Eğer 'weeks' anahtarı varsa direkt kullan
    if (json.containsKey('weeks') && json['weeks'] != null) {
      weeks = (json['weeks'] as List<dynamic>?)
          ?.map((weekMap) => Week.fromMap(weekMap as Map<String, dynamic>))
          .toList();
    }
    // Eğer 'structure' anahtarı varsa ve içinde 'weeklyPlans' varsa
    else if (json.containsKey('structure') && json['structure'] != null) {
      final structure = json['structure'] as Map<String, dynamic>;
      if (structure.containsKey('weeklyPlans')) {
        final weeklyPlans = structure['weeklyPlans'] as List<dynamic>;
        weeks = weeklyPlans.map((weekData) {
          // Backend'den gelen weeklyPlans yapısını Week'e dönüştür
          return Week.fromBackendStructure(weekData as Map<String, dynamic>);
        }).toList();
      }
    }
    // Eğer 'metadata' içinde 'planStructure' varsa
    else if (json.containsKey('metadata') && json['metadata'] != null) {
      final metadata = json['metadata'] as Map<String, dynamic>;
      if (metadata.containsKey('planStructure')) {
        final planStructure = metadata['planStructure'] as Map<String, dynamic>;
        if (planStructure.containsKey('weeklyPlans')) {
          final weeklyPlans = planStructure['weeklyPlans'] as List<dynamic>;
          weeks = weeklyPlans.map((weekData) {
            return Week.fromBackendStructure(weekData as Map<String, dynamic>);
          }).toList();
        }
      }
    }
    
    return LongTermPlan(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      startDate: json['startDate'] is String
          ? DateTime.parse(json['startDate'])
          : DateTime.now(),
      endDate: json['endDate'] is String
          ? DateTime.parse(json['endDate'])
          : DateTime.now(),
      goals: List<String>.from(json['goals'] ?? []),
      weeks: weeks,
    );
  }

  factory LongTermPlan.fromMap(Map<String, dynamic> map) {
    return LongTermPlan.fromJson(map);
  }

  /// Tatil planı (holiday plan) yapısından `LongTermPlan` üretir
  /// Beklenen holiday şeması: {
  ///   title, description, duration, dailySchedule: [ { date, sessions: [ { subject, topic, durationInMinutes, isCompleted } ] } ]
  /// }
  factory LongTermPlan.fromHolidayPlan(Map<String, dynamic> holiday) {
    final List<dynamic> dailySchedule = holiday['dailySchedule'] as List<dynamic>? ?? [];

    DateTime? firstDate;
    DateTime? lastDate;
    final List<Day> days = [];

    for (final dynamic dayEntry in dailySchedule) {
      if (dayEntry is Map<String, dynamic>) {
        final String dateStr = dayEntry['date']?.toString() ?? '';
        DateTime? parsedDate;
        try {
          if (dateStr.isNotEmpty) {
            parsedDate = DateTime.parse(dateStr);
          }
        } catch (_) {
          parsedDate = null;
        }

        if (parsedDate != null) {
          firstDate ??= parsedDate;
          lastDate = parsedDate;
        }

        final List<dynamic> sessions = dayEntry['sessions'] as List<dynamic>? ?? [];
        final List<DailyTask> tasks = sessions
            .whereType<Map<String, dynamic>>()
            .map((session) {
              final dynamic rawDur = session['durationInMinutes'] ?? session['duration'] ?? session['minutes'];
              final int dur = (rawDur is num)
                  ? rawDur.toInt()
                  : int.tryParse(rawDur?.toString() ?? '') ?? 0;
              return DailyTask(
                subject: session['subject']?.toString() ?? '',
                topic: session['topic']?.toString() ?? '',
                durationInMinutes: dur,
                isCompleted: (session['isCompleted'] as bool?) ?? false,
                feynman: null,
              );
            })
            .toList();

        days.add(
          Day(
            day: parsedDate?.weekday.toString() ?? '',
            date: parsedDate?.toIso8601String() ?? dateStr,
            isRestDay: (dayEntry['isRestDay'] as bool?) ?? false,
            dailyTasks: tasks,
          ),
        );
      }
    }

    final week = Week(weekNumber: 1, days: days);

    return LongTermPlan(
      id: holiday['id']?.toString() ?? '',
      title: holiday['title']?.toString() ?? 'Tatil Çalışma Planı',
      description: holiday['description']?.toString() ?? '',
      startDate: firstDate ?? DateTime.now(),
      endDate: lastDate ?? DateTime.now(),
      goals: List<String>.from(holiday['goals'] as List<dynamic>? ?? const []),
      weeks: [week],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'goals': goals,
      'weeks': weeks.map((week) => week.toMap()).toList(),
    };
  }
}

class Week {
  final int weekNumber;
  final List<Day> days;

  Week({
    required this.weekNumber,
    required this.days,
  });

  factory Week.fromMap(Map<String, dynamic> map) {
    return Week(
      weekNumber: map['weekNumber'] ?? 0,
      days: (map['days'] as List<dynamic>?)
              ?.map((dayMap) => Day.fromMap(dayMap as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  // Backend'den gelen weeklyPlans yapısından Week oluştur
  factory Week.fromBackendStructure(Map<String, dynamic> weekData) {
    final weekNumber = weekData['week'] ?? 1;
    final sessions = weekData['sessions'] as List<dynamic>? ?? [];
    
    // Sessions'ları günlere göre grupla
    final Map<String, List<Map<String, dynamic>>> sessionsByDay = {};
    
    for (final session in sessions) {
      if (session is Map<String, dynamic>) {
        final day = session['day']?.toString() ?? 'Pazartesi';
        if (!sessionsByDay.containsKey(day)) {
          sessionsByDay[day] = [];
        }
        sessionsByDay[day]!.add(session);
      }
    }
    
    // Her gün için Day oluştur
    final List<Day> days = [];
    final dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    
    for (int i = 0; i < 7; i++) {
      final dayName = dayNames[i];
      final daySessions = sessionsByDay[dayName] ?? [];
      
      // Sessions'ları DailyTask'lara dönüştür
      final List<DailyTask> dailyTasks = daySessions.map((session) {
        return DailyTask(
          id: session['id']?.toString(),
          subject: session['subject']?.toString() ?? '',
          topic: session['topic']?.toString() ?? '',
          durationInMinutes: (session['durationInMinutes'] as num?)?.toInt() ?? 0,
          isCompleted: session['isCompleted'] ?? false,
        );
      }).toList();
      
      // Bugünden itibaren tarih hesapla
      final today = DateTime.now();
      final dayDate = today.add(Duration(days: i));
      
      days.add(Day(
        day: (i + 1).toString(),
        date: dayDate.toIso8601String(),
        isRestDay: i >= 5, // Hafta sonu dinlenme günü
        dailyTasks: dailyTasks,
      ));
    }
    
    return Week(
      weekNumber: weekNumber,
      days: days,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'weekNumber': weekNumber,
      'days': days.map((day) => day.toMap()).toList(),
    };
  }
}

class Day {
  final String day;
  final String date;
  final bool isRestDay;
  final List<DailyTask> dailyTasks;

  Day({
    required this.day,
    required this.date,
    required this.isRestDay,
    required this.dailyTasks,
  });

  factory Day.fromMap(Map<String, dynamic> map) {
    return Day(
      day: map['day'] ?? '',
      date: map['date'] ?? '',
      isRestDay: map['isRestDay'] ?? false,
      dailyTasks: (map['dailyTasks'] as List<dynamic>?)
              ?.map((taskMap) =>
                  DailyTask.fromMap(taskMap as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'day': day,
      'date': date,
      'isRestDay': isRestDay,
      'dailyTasks': dailyTasks.map((task) => task.toMap()).toList(),
    };
  }
}

class DailyTask {
  final String? id;
  final String subject;
  final String topic;
  final int durationInMinutes;
  bool isCompleted;
  final FeynmanStep? feynman;

  // Kısmen tamamlanan görevler için süre takibi
  final int completedMinutes; // Tamamlanan dakika
  final int remainingMinutes; // Kalan dakika
  final DateTime? lastStudiedAt; // Son çalışma tarihi
  final bool isPartiallyCompleted; // Kısmen tamamlandı mı?

  DailyTask({
    this.id,
    required this.subject,
    required this.topic,
    required this.durationInMinutes,
    this.isCompleted = false,
    this.feynman,
    this.completedMinutes = 0,
    int? remainingMinutes,
    this.lastStudiedAt,
    this.isPartiallyCompleted = false,
  }) : remainingMinutes = remainingMinutes ?? durationInMinutes;

  factory DailyTask.fromMap(Map<String, dynamic> map) {
    final dynamic rawDuration = map['durationInMinutes'] ?? map['duration'] ?? map['minutes'];
    final int duration = (rawDuration is num)
        ? rawDuration.toInt()
        : int.tryParse(rawDuration?.toString() ?? '') ?? 0;
    final completed = map['completedMinutes'] ?? 0;

    return DailyTask(
      id: (map['id'] ?? map['sessionId'])?.toString(),
      subject: map['subject'] ?? '',
      topic: map['topic'] ?? '',
      durationInMinutes: duration,
      isCompleted: map['isCompleted'] ?? false,
      feynman: map['feynman'] != null
          ? FeynmanStep.fromMap(map['feynman'] as Map<String, dynamic>)
          : null,
      completedMinutes: completed,
      remainingMinutes: map['remainingMinutes'] ?? (duration - completed),
      lastStudiedAt: map['lastStudiedAt'] != null
          ? DateTime.parse(map['lastStudiedAt'])
          : null,
      isPartiallyCompleted: map['isPartiallyCompleted'] ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'subject': subject,
      'topic': topic,
      'durationInMinutes': durationInMinutes,
      'isCompleted': isCompleted,
      'feynman': feynman?.toMap(),
      'completedMinutes': completedMinutes,
      'remainingMinutes': remainingMinutes,
      'lastStudiedAt': lastStudiedAt?.toIso8601String(),
      'isPartiallyCompleted': isPartiallyCompleted,
    };
  }

  /// Görevin tamamlanma yüzdesini hesaplar (0.0 - 1.0 arası)
  double get completionPercentage {
    if (durationInMinutes == 0) return 0.0;
    return (completedMinutes / durationInMinutes).clamp(0.0, 1.0);
  }

  /// Görevin tam olarak tamamlanıp tamamlanmadığını kontrol eder
  bool get isFullyCompleted {
    return isCompleted || completedMinutes >= durationInMinutes;
  }

  /// Kısmen tamamlanan görevi günceller
  DailyTask updateProgress(int studiedMinutes) {
    final newCompletedMinutes =
        (completedMinutes + studiedMinutes).clamp(0, durationInMinutes);
    final newRemainingMinutes = durationInMinutes - newCompletedMinutes;
    final isNowCompleted = newCompletedMinutes >= durationInMinutes;

    return DailyTask(
      subject: subject,
      topic: topic,
      durationInMinutes: durationInMinutes,
      isCompleted: isNowCompleted,
      feynman: feynman,
      completedMinutes: newCompletedMinutes,
      remainingMinutes: newRemainingMinutes,
      lastStudiedAt: DateTime.now(),
      isPartiallyCompleted: newCompletedMinutes > 0 && !isNowCompleted,
    );
  }
}

class FeynmanStep {
  final String explanation;
  final String analogyPrompt;
  final List<QuizQuestion> quiz;

  FeynmanStep({
    required this.explanation,
    required this.analogyPrompt,
    required this.quiz,
  });

  factory FeynmanStep.fromMap(Map<String, dynamic> map) {
    return FeynmanStep(
      explanation: map['explanation'] ?? 'Açıklama bulunamadı.',
      analogyPrompt: map['analogyPrompt'] ?? 'Bu konuyu basitçe anlat.',
      quiz: (map['quiz'] as List<dynamic>?)
              ?.map(
                  (qMap) => QuizQuestion.fromMap(qMap as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'explanation': explanation,
      'analogyPrompt': analogyPrompt,
      'quiz': quiz.map((q) => q.toMap()).toList(),
    };
  }
}

class QuizQuestion {
  final String question;
  final List<String> options;
  final String correctAnswer;

  QuizQuestion({
    required this.question,
    required this.options,
    required this.correctAnswer,
  });

  factory QuizQuestion.fromMap(Map<String, dynamic> map) {
    return QuizQuestion(
      question: map['question'] ?? '',
      options: (map['options'] as List<dynamic>?)?.cast<String>() ?? [],
      correctAnswer: map['correctAnswer'] ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'question': question,
      'options': options,
      'correctAnswer': correctAnswer,
    };
  }
}
