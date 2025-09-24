import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'dart:math' as math;
import '../models/long_term_plan.dart';

/// Dersler için renk haritası
class SubjectColors {
  static const Map<String, Color> _subjectColors = {
    'Matematik': Color(0xFF2196F3), // Mavi
    'Fizik': Color(0xFFF44336), // Kırmızı
    'Kimya': Color(0xFF4CAF50), // Yeşil
    'Biyoloji': Color(0xFFFF9800), // Turuncu
    'Türk Dili ve Edebiyatı': Color(0xFF9C27B0), // Mor
    'Türkçe': Color(0xFF9C27B0), // Mor
    'Edebiyat': Color(0xFF673AB7), // Derin Mor
    'Tarih': Color(0xFF795548), // Kahverengi
    'Coğrafya': Color(0xFF607D8B), // Gri-Mavi
    'Felsefe': Color(0xFF3F51B5), // İndigo
    'Din Kültürü ve Ahlak Bilgisi': Color(0xFF009688), // Teal
    'İngilizce': Color(0xFFE91E63), // Pembe
    'Almanca': Color(0xFFFFEB3B), // Sarı
    'Fransızca': Color(0xFF00BCD4), // Cyan
    'Geometri': Color(0xFF03A9F4), // Açık Mavi
    'Algebra': Color(0xFF3F51B5), // İndigo
    'Trigonometri': Color(0xFF00E676), // Yeşil Accent
    'Analiz': Color(0xFFFF5722), // Derin Turuncu
    'Sosyoloji': Color(0xFF9E9E9E), // Gri
    'Psikoloji': Color(0xFFE1BEE7), // Açık Mor
    'Mantık': Color(0xFF81C784), // Açık Yeşil
    'Rehberlik': Color(0xFFB39DDB), // Açık Mor
    'Beden Eğitimi': Color(0xFF4DB6AC), // Açık Teal
    'Müzik': Color(0xFFFF8A65), // Açık Turuncu
    'Resim': Color(0xFFAED581), // Açık Yeşil
    'Sanat': Color(0xFFFFAB91), // Peach
    'Teknoloji': Color(0xFF90A4AE), // Açık Gri
    'Bilgisayar': Color(0xFF64B5F6), // Açık Mavi
    'Programlama': Color(0xFF42A5F5), // Mavi
  };

  /// Ders adına göre renk döndürür
  static Color getColorForSubject(String subject) {
    // Direkt eşleşme kontrolü
    if (_subjectColors.containsKey(subject)) {
      return _subjectColors[subject]!;
    }

    // Kısmi eşleşme (büyük/küçük harf duyarsız)
    final lowerSubject = subject.toLowerCase();
    for (final entry in _subjectColors.entries) {
      if (entry.key.toLowerCase().contains(lowerSubject) ||
          lowerSubject.contains(entry.key.toLowerCase())) {
        return entry.value;
      }
    }

    // Hiçbir eşleşme bulunamazsa, subject string'inin hash değerine göre renk oluştur
    return _generateColorFromString(subject);
  }

  /// String'den deterministic renk üretir
  static Color _generateColorFromString(String input) {
    int hash = 0;
    for (int i = 0; i < input.length; i++) {
      hash = input.codeUnitAt(i) + ((hash << 5) - hash);
    }

    // HSV renk uzayında hoş görünen bir renk üret
    final hue = (hash % 360).toDouble();
    const saturation = 0.7; // Doygunluk %70
    const value = 0.8; // Parlaklık %80

    return HSVColor.fromAHSV(1.0, hue, saturation, value).toColor();
  }

  /// Tüm tanımlı renkleri döndürür
  static Map<String, Color> getAllColors() => Map.from(_subjectColors);

  /// Rengin açık/koyu olduğunu belirler
  static bool isLightColor(Color color) {
    final luminance =
        (0.299 * color.red + 0.587 * color.green + 0.114 * color.blue) / 255;
    return luminance > 0.5;
  }

  /// Renk üzerinde kullanılacak metin rengini belirler
  static Color getTextColorForBackground(Color backgroundColor) {
    return isLightColor(backgroundColor) ? Colors.black87 : Colors.white;
  }
}

/// Takvim için yardımcı fonksiyonlar
class CalendarHelpers {
  /// Plan günlerini takvim için uygun formata dönüştürür
  static Map<DateTime, List<DailyTask>> getEventsForDays(List<Day> planDays) {
    final Map<DateTime, List<DailyTask>> events = {};

    for (var day in planDays) {
      try {
        // Tarih string'ini DateTime'a dönüştür
        final date = DateFormat('yyyy-MM-dd').parse(day.date);
        // Saat bilgisini sıfırlayarak sadece tarih kısmını al
        final dateOnly = DateTime(date.year, date.month, date.day);

        if (events[dateOnly] == null) {
          events[dateOnly] = [];
        }

        // Bu günün tüm görevlerini ekle
        for (var task in day.dailyTasks) {
          events[dateOnly]!.add(task);
        }
      } catch (e) {
        debugPrint('⚠️ Tarih parse hatası: ${day.date}, Hata: $e');
        continue;
      }
    }

    return events;
  }

  /// Belirli bir tarih için görevleri döndürür
  static List<DailyTask> getTasksForDate(
      DateTime date, Map<DateTime, List<DailyTask>> events) {
    final dateOnly = DateTime(date.year, date.month, date.day);
    return events[dateOnly] ?? [];
  }

  /// Bir tarihin plan kapsamında olup olmadığını kontrol eder
  static bool isDateInPlan(DateTime date, List<Day> planDays) {
    final dateOnly = DateTime(date.year, date.month, date.day);

    for (var day in planDays) {
      try {
        final dayDate = DateFormat('yyyy-MM-dd').parse(day.date);
        final dayDateOnly = DateTime(dayDate.year, dayDate.month, dayDate.day);

        if (dateOnly.isAtSameMomentAs(dayDateOnly)) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    return false;
  }

  /// Plan başlangıç ve bitiş tarihlerini hesaplar
  static DateTimeRange? getPlanDateRange(List<Day> planDays) {
    if (planDays.isEmpty) return null;

    DateTime? earliest;
    DateTime? latest;

    for (var day in planDays) {
      try {
        final date = DateFormat('yyyy-MM-dd').parse(day.date);

        if (earliest == null || date.isBefore(earliest)) {
          earliest = date;
        }

        if (latest == null || date.isAfter(latest)) {
          latest = date;
        }
      } catch (e) {
        continue;
      }
    }

    if (earliest != null && latest != null) {
      return DateTimeRange(start: earliest, end: latest);
    }

    return null;
  }

  /// Görev için kısaltılmış başlık oluşturur
  static String getTaskShortTitle(DailyTask task) {
    if (task.topic.length <= 15) {
      return task.topic;
    }
    return '${task.topic.substring(0, 12)}...';
  }

  /// Görev süresini dakika cinsinden formatlar
  static String formatDuration(int minutes) {
    if (minutes < 60) {
      return '${minutes}dk';
    } else {
      final hours = minutes ~/ 60;
      final remainingMinutes = minutes % 60;
      if (remainingMinutes == 0) {
        return '${hours}sa';
      } else {
        return '${hours}sa ${remainingMinutes}dk';
      }
    }
  }

  /// Tarihi Türkçe olarak formatlar
  static String formatDateTurkish(DateTime date) {
    return DateFormat('d MMMM, EEEE', 'tr_TR').format(date);
  }

  /// Aynı haftanın günleri olup olmadığını kontrol eder
  static bool isSameWeek(DateTime date1, DateTime date2) {
    // Pazartesi günü ile hafta başlangıcını hesapla
    int getDayOfWeek(DateTime date) => (date.weekday - 1) % 7;

    final startOfWeek1 = date1.subtract(Duration(days: getDayOfWeek(date1)));
    final startOfWeek2 = date2.subtract(Duration(days: getDayOfWeek(date2)));

    return startOfWeek1.year == startOfWeek2.year &&
        startOfWeek1.month == startOfWeek2.month &&
        startOfWeek1.day == startOfWeek2.day;
  }

  /// Günün toplam görev süresini hesaplar
  static int getTotalDurationForDay(List<DailyTask> tasks) {
    return tasks.fold(0, (sum, task) => sum + task.durationInMinutes);
  }

  /// Günün tamamlanan görev sayısını hesaplar
  static int getCompletedTasksForDay(List<DailyTask> tasks) {
    return tasks.where((task) => task.isCompleted).length;
  }

  /// Günün tamamlanma yüzdesini hesaplar
  static double getCompletionPercentageForDay(List<DailyTask> tasks) {
    if (tasks.isEmpty) return 0.0;
    final completed = getCompletedTasksForDay(tasks);
    return completed / tasks.length;
  }

  /// Belirli bir gün için toplam çalışma süresini dakika cinsinden hesaplar
  static int getTotalDurationForDate(
      DateTime date, Map<DateTime, List<DailyTask>> events) {
    final tasksForDate = getTasksForDate(date, events);
    int totalDuration = 0;

    for (final task in tasksForDate) {
      totalDuration += task.durationInMinutes;
    }

    return totalDuration;
  }

  /// Belirli bir gün için görev tamamlanma oranını hesaplar (0.0 - 1.0 arası)
  static double getCompletionRateForDate(
      DateTime date, Map<DateTime, List<DailyTask>> events) {
    final tasksForDate = getTasksForDate(date, events);

    if (tasksForDate.isEmpty) return 0.0;

    final completedTasks =
        tasksForDate.where((task) => task.isCompleted).length;
    return completedTasks / tasksForDate.length;
  }

  /// Çalışma süresine göre yoğunluk rengi döndürür (heatmap için)
  static Color getIntensityColorForDuration(int durationInMinutes) {
    // 0-60 dakika: Çok açık mavi
    // 60-120 dakika: Açık mavi
    // 120-180 dakika: Orta mavi
    // 180-240 dakika: Koyu mavi
    // 240+ dakika: Çok koyu mavi

    if (durationInMinutes == 0) {
      return Colors.grey.shade100; // Görev yok
    } else if (durationInMinutes <= 60) {
      return Colors.blue.shade100; // 1 saat ve altı
    } else if (durationInMinutes <= 120) {
      return Colors.blue.shade200; // 1-2 saat
    } else if (durationInMinutes <= 180) {
      return Colors.blue.shade300; // 2-3 saat
    } else if (durationInMinutes <= 240) {
      return Colors.blue.shade400; // 3-4 saat
    } else {
      return Colors.blue.shade500; // 4+ saat
    }
  }

  /// Tamamlanma oranına göre progress bar rengi döndürür
  static Color getProgressColorForRate(double completionRate) {
    if (completionRate == 0.0) {
      return Colors.grey.shade400; // Hiç başlamamış
    } else if (completionRate < 0.3) {
      return Colors.red.shade400; // Az ilerleme
    } else if (completionRate < 0.7) {
      return Colors.orange.shade400; // Orta ilerleme
    } else if (completionRate < 1.0) {
      return Colors.blue.shade400; // İyi ilerleme
    } else {
      return Colors.green.shade400; // Tamamlanmış
    }
  }

  /// Haftalık çalışma yoğunluğunu analiz eder
  static Map<String, dynamic> getWeeklyIntensityAnalysis(List<Day> days) {
    int totalMinutes = 0;
    int totalTasks = 0;
    int completedTasks = 0;
    Map<String, int> subjectDistribution = {};

    for (final day in days) {
      if (!day.isRestDay) {
        for (final task in day.dailyTasks) {
          totalMinutes += task.durationInMinutes;
          totalTasks++;
          if (task.isCompleted) completedTasks++;

          // Ders dağılımını hesapla
          subjectDistribution[task.subject] =
              (subjectDistribution[task.subject] ?? 0) + task.durationInMinutes;
        }
      }
    }

    return {
      'totalHours': (totalMinutes / 60).round(),
      'totalMinutes': totalMinutes,
      'totalTasks': totalTasks,
      'completedTasks': completedTasks,
      'completionRate': totalTasks > 0 ? (completedTasks / totalTasks) : 0.0,
      'subjectDistribution': subjectDistribution,
      'averageDailyMinutes':
          days.isNotEmpty ? (totalMinutes / days.length).round() : 0,
    };
  }

  /// Belirli bir gün için tüm görevlerin tamamlanıp tamamlanmadığını kontrol eder
  static bool isDayCompleted(
      DateTime date, Map<DateTime, List<DailyTask>> events) {
    final tasksForDate = getTasksForDate(date, events);

    if (tasksForDate.isEmpty) return false;

    // Dinlenme günü kontrolü (tasksForDate'ten kontrol edilebilir)
    // Eğer sadece dinlenme günü görevleri varsa, true döndür

    // Tüm görevler tamamlandı mı?
    return tasksForDate.every((task) => task.isCompleted);
  }

  /// Güncel streak (art arda tamamlanan gün sayısı) hesaplar
  static int calculateCurrentStreak(List<Day> allDays) {
    if (allDays.isEmpty) return 0;

    // Günleri tarihe göre sırala (en yeniden en eskiye)
    final sortedDays = allDays.where((day) => day.date.isNotEmpty).toList()
      ..sort((a, b) {
        try {
          final dateA = DateTime.parse(a.date);
          final dateB = DateTime.parse(b.date);
          return dateB.compareTo(dateA); // Desc order
        } catch (e) {
          return 0;
        }
      });

    int streak = 0;
    final today = DateTime.now();

    for (final day in sortedDays) {
      try {
        final dayDate = DateTime.parse(day.date);

        // Gelecek günleri atla
        if (dayDate.isAfter(today)) continue;

        // Dinlenme günleri streak'i bozmaz
        if (day.isRestDay) {
          continue;
        }

        // Bu günün tamamlanma durumunu kontrol et
        final isCompleted = day.dailyTasks.isNotEmpty &&
            day.dailyTasks.every((task) => task.isCompleted);

        if (isCompleted) {
          streak++;
        } else {
          // İlk tamamlanmamış gün, streak'i kırar
          break;
        }
      } catch (e) {
        continue;
      }
    }

    return streak;
  }

  /// En uzun streak (tüm zamanların rekoru) hesaplar
  static int calculateLongestStreak(List<Day> allDays) {
    if (allDays.isEmpty) return 0;

    // Günleri tarihe göre sırala
    final sortedDays = allDays.where((day) => day.date.isNotEmpty).toList()
      ..sort((a, b) {
        try {
          final dateA = DateTime.parse(a.date);
          final dateB = DateTime.parse(b.date);
          return dateA.compareTo(dateB); // Asc order
        } catch (e) {
          return 0;
        }
      });

    int longestStreak = 0;
    int currentStreak = 0;

    for (final day in sortedDays) {
      try {
        // Dinlenme günleri streak'i bozmaz ama sayılmaz da
        if (day.isRestDay) {
          continue;
        }

        final isCompleted = day.dailyTasks.isNotEmpty &&
            day.dailyTasks.every((task) => task.isCompleted);

        if (isCompleted) {
          currentStreak++;
          longestStreak = math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      } catch (e) {
        continue;
      }
    }

    return longestStreak;
  }

  /// Streak flame seviyesini belirler (1-5 arası)
  static int getStreakFlameLevel(int streakCount) {
    if (streakCount >= 30) return 5; // Efsane
    if (streakCount >= 21) return 4; // Ustasınız
    if (streakCount >= 14) return 3; // İyi
    if (streakCount >= 7) return 2; // Başlangıç
    if (streakCount >= 1) return 1; // İlk adım
    return 0; // Hiç streak yok
  }

  /// Streak flame emoji ve rengini döndürür
  static Map<String, dynamic> getStreakFlameDisplay(int streakCount) {
    final level = getStreakFlameLevel(streakCount);

    switch (level) {
      case 5:
        return {
          'emoji': '🔥',
          'color': Colors.purple,
          'title': 'Efsane Streak!',
          'description': '$streakCount gün art arda! Mükemmelsin!',
          'size': 28.0,
        };
      case 4:
        return {
          'emoji': '🔥',
          'color': Colors.red,
          'title': 'Usta Seviye!',
          'description': '$streakCount gün harika bir performans!',
          'size': 24.0,
        };
      case 3:
        return {
          'emoji': '🔥',
          'color': Colors.orange,
          'title': 'İyi Gidiyorsun!',
          'description': '$streakCount gün devam ediyor!',
          'size': 20.0,
        };
      case 2:
        return {
          'emoji': '🔥',
          'color': Colors.yellow.shade700,
          'title': 'Güzel Başlangıç!',
          'description': '$streakCount gün, böyle devam!',
          'size': 18.0,
        };
      case 1:
        return {
          'emoji': '🔥',
          'color': Colors.blue,
          'title': 'İlk Adım!',
          'description': 'Harika, streak başladı!',
          'size': 16.0,
        };
      default:
        return {
          'emoji': '',
          'color': Colors.grey,
          'title': 'Streak Yok',
          'description': 'Bir streak başlatmaya ne dersin?',
          'size': 0.0,
        };
    }
  }

  /// Bu haftanın istatistiklerini hesaplar (Pazar-Cumartesi)
  static Map<String, dynamic> calculateWeeklyStats(List<Day> allDays) {
    final now = DateTime.now();
    final startOfWeek = now.subtract(Duration(days: now.weekday % 7)); // Pazar
    final endOfWeek = startOfWeek.add(Duration(days: 6)); // Cumartesi

    final weekDays = allDays.where((day) {
      try {
        final dayDate = DateTime.parse(day.date);
        return dayDate.isAfter(startOfWeek.subtract(Duration(days: 1))) &&
            dayDate.isBefore(endOfWeek.add(Duration(days: 1)));
      } catch (e) {
        return false;
      }
    }).toList();

    int totalMinutes = 0;
    int totalTasks = 0;
    int completedTasks = 0;
    int streakDays = 0;
    Map<String, int> subjectMinutes = {};
    Map<String, int> subjectTaskCounts = {};

    for (final day in weekDays) {
      bool dayCompleted = false;

      if (!day.isRestDay) {
        int dayTasks = 0;
        int dayCompletedTasks = 0;

        for (final task in day.dailyTasks) {
          totalMinutes += task.durationInMinutes;
          totalTasks++;
          dayTasks++;

          if (task.isCompleted) {
            completedTasks++;
            dayCompletedTasks++;
          }

          // Ders dağılımı
          subjectMinutes[task.subject] =
              (subjectMinutes[task.subject] ?? 0) + task.durationInMinutes;
          subjectTaskCounts[task.subject] =
              (subjectTaskCounts[task.subject] ?? 0) + 1;
        }

        // Gün tamamen tamamlandıysa streak sayısını artır
        if (dayTasks > 0 && dayTasks == dayCompletedTasks) {
          streakDays++;
          dayCompleted = true;
        }
      } else {
        // Dinlenme günleri streak'e dahil edilir (otomatik tamamlanmış sayılır)
        streakDays++;
        dayCompleted = true;
      }
    }

    // En çok çalışılan dersi bul
    String topSubject = 'Yok';
    int maxMinutes = 0;
    subjectMinutes.forEach((subject, minutes) {
      if (minutes > maxMinutes) {
        maxMinutes = minutes;
        topSubject = subject;
      }
    });

    return {
      'totalHours': (totalMinutes / 60).toDouble(),
      'totalMinutes': totalMinutes,
      'totalTasks': totalTasks,
      'completedTasks': completedTasks,
      'completionRate': totalTasks > 0 ? (completedTasks / totalTasks) : 0.0,
      'streakDays': streakDays,
      'topSubject': topSubject,
      'topSubjectMinutes': maxMinutes,
      'subjectDistribution': subjectMinutes,
      'subjectTaskCounts': subjectTaskCounts,
      'weekStart': startOfWeek,
      'weekEnd': endOfWeek,
    };
  }

  /// Badge/rozet kazanma koşullarını kontrol eder
  static List<String> checkEarnedBadges(
      Map<String, dynamic> weeklyStats, int currentStreak, int longestStreak) {
    List<String> newBadges = [];

    // Haftalık rozetler
    if (weeklyStats['completionRate'] >= 1.0) {
      newBadges.add('perfect_week');
    }
    if (weeklyStats['totalHours'] >= 20) {
      newBadges.add('study_machine');
    }
    if (weeklyStats['streakDays'] >= 7) {
      newBadges.add('week_warrior');
    }

    // Streak rozetleri
    if (currentStreak >= 7) {
      newBadges.add('week_streak');
    }
    if (currentStreak >= 14) {
      newBadges.add('fortnight_hero');
    }
    if (currentStreak >= 30) {
      newBadges.add('month_master');
    }

    // Özel rozetler
    if (longestStreak >= 50) {
      newBadges.add('legend');
    }

    return newBadges;
  }

  /// Badge bilgilerini döndürür
  static Map<String, dynamic> getBadgeInfo(String badgeId) {
    final badges = {
      'perfect_week': {
        'name': 'Mükemmel Hafta',
        'description': 'Haftanın tüm görevlerini tamamladın!',
        'emoji': '⭐',
        'color': Colors.yellow,
        'rarity': 'Epic',
      },
      'study_machine': {
        'name': 'Çalışma Makinesi',
        'description': 'Bir haftada 20+ saat çalıştın!',
        'emoji': '🤖',
        'color': Colors.blue,
        'rarity': 'Rare',
      },
      'week_warrior': {
        'name': 'Hafta Savaşçısı',
        'description': '7 gün art arda hedefine ulaştın!',
        'emoji': '⚔️',
        'color': Colors.red,
        'rarity': 'Epic',
      },
      'week_streak': {
        'name': 'Hafta Streak',
        'description': '7 günlük streak tamamladın!',
        'emoji': '🔥',
        'color': Colors.orange,
        'rarity': 'Common',
      },
      'fortnight_hero': {
        'name': 'İki Hafta Kahramanı',
        'description': '14 günlük streak! İnanılmaz!',
        'emoji': '🦸',
        'color': Colors.purple,
        'rarity': 'Epic',
      },
      'month_master': {
        'name': 'Ay Ustası',
        'description': '30 günlük streak! Efsanesin!',
        'emoji': '👑',
        'color': Colors.amber.shade600,
        'rarity': 'Legendary',
      },
      'legend': {
        'name': 'Efsane',
        'description': '50+ günlük streak! Sen bir efsanesin!',
        'emoji': '🏆',
        'color': Colors.pink,
        'rarity': 'Mythic',
      },
    };

    return badges[badgeId] ??
        {
          'name': 'Bilinmeyen Rozet',
          'description': 'Gizli bir başarı!',
          'emoji': '❓',
          'color': Colors.grey,
          'rarity': 'Unknown',
        };
  }
}
