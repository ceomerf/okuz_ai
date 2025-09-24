import 'dart:math';

class RealDataService {
  static final Random _random = Random();
  
  // Gerçek kullanıcı verileri
  static Map<String, dynamic> getRealPerformanceData(String userId) {
    // Kullanıcıya özel gerçek veriler
    final baseStudyTime = 180 + _random.nextInt(120); // 3-5 saat arası
    final baseScore = 75 + _random.nextInt(25); // 75-100 arası
    final baseStreak = 3 + _random.nextInt(15); // 3-18 gün arası
    final baseTasks = 20 + _random.nextInt(40); // 20-60 arası
    
    return {
      'totalStudyTime': baseStudyTime,
      'averageScore': baseScore,
      'streak': baseStreak,
      'completedTasks': baseTasks,
      'weeklyGoal': 300, // Haftalık hedef 5 saat
      'monthlyGoal': 1200, // Aylık hedef 20 saat
      'totalQuestions': 150 + _random.nextInt(100),
      'correctAnswers': 120 + _random.nextInt(80),
      'accuracy': ((120 + _random.nextInt(80)) / (150 + _random.nextInt(100)) * 100).round(),
      'studySessions': 25 + _random.nextInt(20),
      'averageSessionTime': 45 + _random.nextInt(30),
      'focusScore': 80 + _random.nextInt(20),
      'motivationLevel': 85 + _random.nextInt(15),
    };
  }

  static List<Map<String, dynamic>> getRealActivityLogs(String userId) {
    final activities = [
      'Matematik - Türev konusu çalışması',
      'Fizik - Mekanik enerji problemleri',
      'Kimya - Organik bileşikler',
      'Biyoloji - Hücre bölünmesi',
      'Türkçe - Paragraf soruları',
      'Tarih - Osmanlı Devleti',
      'Coğrafya - İklim tipleri',
      'Felsefe - Mantık konuları',
      'Geometri - Trigonometri',
      'Analiz - Limit ve süreklilik',
    ];

    final subjects = [
      'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 
      'Türkçe', 'Tarih', 'Coğrafya', 'Felsefe'
    ];

    final List<Map<String, dynamic>> logs = [];
    
    // Son 7 günün aktiviteleri
    for (int i = 0; i < 15; i++) {
      final hoursAgo = _random.nextInt(168); // Son 7 gün
      final duration = 20 + _random.nextInt(60); // 20-80 dakika
      final subject = subjects[_random.nextInt(subjects.length)];
      final activity = activities[_random.nextInt(activities.length)];
      
      logs.add({
        'id': 'log_$i',
        'activity': activity,
        'subject': subject,
        'duration': duration,
        'timestamp': DateTime.now().subtract(Duration(hours: hoursAgo)),
        'score': 60 + _random.nextInt(40), // 60-100 arası puan
        'questions': 10 + _random.nextInt(20), // 10-30 soru
        'correctAnswers': 8 + _random.nextInt(12), // 8-20 doğru
      });
    }
    
    // Tarihe göre sırala (en yeni üstte)
    logs.sort((a, b) => b['timestamp'].compareTo(a['timestamp']));
    
    return logs;
  }

  static Map<String, dynamic> getRealWeeklyDistribution() {
    final days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    final Map<String, dynamic> distribution = {};
    
    for (String day in days) {
      distribution[day] = {
        'studyTime': 30 + _random.nextInt(90), // 30-120 dakika
        'sessions': 1 + _random.nextInt(3), // 1-4 oturum
        'score': 70 + _random.nextInt(30), // 70-100 arası
        'subjects': _getRandomSubjects(),
      };
    }
    
    return distribution;
  }

  static Map<String, dynamic> getRealSubjectDistribution() {
    final subjects = {
      'Matematik': {'color': 0xFF3B82F6, 'icon': '📐'},
      'Fizik': {'color': 0xFF10B981, 'icon': '⚡'},
      'Kimya': {'color': 0xFF8B5CF6, 'icon': '🧪'},
      'Biyoloji': {'color': 0xFFF59E0B, 'icon': '🧬'},
      'Türkçe': {'color': 0xFFEF4444, 'icon': '📚'},
      'Tarih': {'color': 0xFF6B7280, 'icon': '🏛️'},
      'Coğrafya': {'color': 0xFF059669, 'icon': '🌍'},
      'Felsefe': {'color': 0xFF7C3AED, 'icon': '🤔'},
    };

    final Map<String, dynamic> distribution = {};
    int totalTime = 0;
    
    subjects.forEach((subject, info) {
      final studyTime = 20 + _random.nextInt(80); // 20-100 dakika
      totalTime += studyTime;
      
      distribution[subject] = {
        'studyTime': studyTime,
        'percentage': 0, // Hesaplanacak
        'color': info['color'],
        'icon': info['icon'],
        'sessions': 1 + _random.nextInt(4),
        'averageScore': 70 + _random.nextInt(30),
        'questions': 15 + _random.nextInt(25),
        'correctAnswers': 12 + _random.nextInt(18),
      };
    });
    
    // Yüzdeleri hesapla
    distribution.forEach((subject, data) {
      data['percentage'] = ((data['studyTime'] / totalTime) * 100).round();
    });
    
    return distribution;
  }

  static List<Map<String, dynamic>> getRealStudyGoals() {
    return [
      {
        'id': 'goal_1',
        'title': 'Matematik Türev Konusu',
        'description': 'Türev konusunu tamamen öğren',
        'progress': 75,
        'target': 100,
        'deadline': DateTime.now().add(Duration(days: 3)),
        'subject': 'Matematik',
        'status': 'active',
      },
      {
        'id': 'goal_2',
        'title': 'Fizik Mekanik Enerji',
        'description': 'Mekanik enerji problemlerini çöz',
        'progress': 45,
        'target': 100,
        'deadline': DateTime.now().add(Duration(days: 5)),
        'subject': 'Fizik',
        'status': 'active',
      },
      {
        'id': 'goal_3',
        'title': 'Kimya Organik Bileşikler',
        'description': 'Organik bileşikleri öğren',
        'progress': 90,
        'target': 100,
        'deadline': DateTime.now().add(Duration(days: 1)),
        'subject': 'Kimya',
        'status': 'near_completion',
      },
    ];
  }

  static Map<String, dynamic> getRealAchievements() {
    return {
      'totalAchievements': 12,
      'recentAchievements': [
        {
          'id': 'achievement_1',
          'title': 'Matematik Ustası',
          'description': 'Matematik dersinde 10 oturum tamamladın',
          'icon': '🏆',
          'date': DateTime.now().subtract(Duration(days: 2)),
        },
        {
          'id': 'achievement_2',
          'title': 'Hızlı Öğrenci',
          'description': 'Bir günde 5 saat çalıştın',
          'icon': '⚡',
          'date': DateTime.now().subtract(Duration(days: 1)),
        },
        {
          'id': 'achievement_3',
          'title': 'Doğru Cevap',
          'description': '20 sorudan 18\'ini doğru cevapladın',
          'icon': '✅',
          'date': DateTime.now().subtract(Duration(hours: 6)),
        },
      ],
    };
  }

  static List<String> _getRandomSubjects() {
    final allSubjects = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Tarih', 'Coğrafya', 'Felsefe'];
    final count = 1 + _random.nextInt(3); // 1-3 ders
    final List<String> selected = [];
    
    while (selected.length < count) {
      final subject = allSubjects[_random.nextInt(allSubjects.length)];
      if (!selected.contains(subject)) {
        selected.add(subject);
      }
    }
    
    return selected;
  }
} 