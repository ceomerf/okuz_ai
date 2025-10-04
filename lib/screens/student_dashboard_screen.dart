import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
// shared_preferences kullanımı provider'a taşındı
import '../theme/app_theme.dart';
import '../providers/study_dashboard_provider.dart';
import '../models/state/study_dashboard_state.dart';
import '../providers/goals_provider.dart';
import '../providers/paywall_notifier.dart';
import '../models/state/paywall_state.dart';
import '../services/api_client.dart';
import 'dart:convert';
import '../screens/onboarding_screen.dart';
import '../screens/user_plan_screen.dart';
import '../screens/calendar_view_screen.dart';
import '../screens/smart_tools_screen.dart';
import '../screens/performance_dashboard_screen.dart';
import '../screens/focus_mode_screen.dart';
import '../screens/exam_simulator_screen.dart';
import '../screens/flashcards_deck_screen.dart';
import '../screens/achievements_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/login_screen.dart';
import '../screens/invite_parent_screen.dart';
import '../screens/plan_display_screen.dart';
import '../models/account_type.dart';
import '../screens/paywall_screen.dart';
import '../widgets/dashboard/dashboard_header.dart';
import '../widgets/dashboard/weekly_overview_card.dart';
import '../widgets/dashboard/quick_access_section.dart';
import '../widgets/dashboard/subject_card.dart';
// DatabaseService kullanımını kaldırıyoruz; tek servis katmanı olarak ApiClient kullanılacak
import '../services/api_client.dart';
import '../widgets/main_layout.dart';

class StudentDashboardScreen extends ConsumerStatefulWidget {
  const StudentDashboardScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<StudentDashboardScreen> createState() => _StudentDashboardScreenState();
}

class _StudentDashboardScreenState extends ConsumerState<StudentDashboardScreen> {

  void _showPaywall(BuildContext context, String? reason) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => PaywallScreen(
            reason: reason,
          ),
        ),
      );
    });
  }

  // _loadStudentData StudyDataProvider'a taşındı

  // Navigation artık MainLayout tarafından yönetiliyor

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final studyDashboardState = ref.watch(studyDashboardNotifierProvider);
    final weeklyGoalsAsync = ref.watch(weeklyGoalsProvider);
    final paywallState = ref.watch(paywallNotifierProvider);

    ref.listen<PaywallState>(paywallNotifierProvider, (previous, next) {
      if (next.shouldShowPaywall) {
        _showPaywall(context, next.paywallReason);
        ref.read(paywallNotifierProvider.notifier).hidePaywall();
      }
    });

    if (studyDashboardState.isLoading) {
      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (studyDashboardState.errorMessage != null) {
      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  studyDashboardState.errorMessage!,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.figtree(
                    fontSize: 16,
                    color: AppTheme.getPrimaryTextColor(context),
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.read(studyDashboardNotifierProvider.notifier).fetchDashboardData(),
                  child: const Text('Yeniden Dene'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DashboardHeader(
                    studentName: studyDashboardState.studentName,
                    studyStreak: studyDashboardState.studyStreak,
                    isDark: isDark,
                  ),
                  const SizedBox(height: 24),
                  _buildWeeklyOverviewCard(isDark, studyDashboardState),
                  const SizedBox(height: 20),
                  _buildTodayFocusCard(isDark, studyDashboardState.todayTasks),
                  const SizedBox(height: 20),
                  QuickAccessSection(isDark: isDark),
                  const SizedBox(height: 20),
                  _buildSubjectCardsWithState(isDark, studyDashboardState),
                  const SizedBox(height: 20),
                  _buildWeeklyGoalsCardWithProvider(isDark, weeklyGoalsAsync),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
          floatingActionButton: FloatingActionButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const MainLayout(
                    child: UserPlanScreen(),
                  ),
                ),
              );
            },
            backgroundColor: AppTheme.primaryColor,
            child: const Icon(
              Icons.add,
              color: Colors.white,
              size: 28,
            ),
          ),
          // bottomNavigationBar: _buildBottomNavigation(isDark), // MainLayout kullanılacak
        );
  }

  Widget _buildWeeklyGoalsCardWithProvider(bool isDark, AsyncValue<List<dynamic>> weeklyGoalsAsync) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blue.withOpacity(0.15), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Haftalık Hedefler',
                style: GoogleFonts.figtree(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.getPrimaryTextColor(context),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          weeklyGoalsAsync.when(
            loading: () => const LinearProgressIndicator(minHeight: 3),
            error: (err, stack) => Row(
              children: [
                Expanded(child: Text(err.toString(), style: GoogleFonts.figtree(fontSize: 13, color: Colors.red))),
              ],
            ),
            data: (goals) {
              if (goals.isEmpty) {
                return Text('Bu hafta için hedef bulunmuyor', style: GoogleFonts.figtree(fontSize: 14, color: AppTheme.getSecondaryTextColor(context)));
              }
              return Column(
                children: goals.take(4).map((g) {
                  final title = g['title']?.toString() ?? 'Hedef';
                  final unit = g['unit']?.toString() ?? '';
                  final current = (g['current'] ?? 0) as num;
                  final target = (g['target'] ?? 0) as num;
                  final progress = ((g['progress'] ?? 0) as num).clamp(0, 100).toInt();
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(title, style: GoogleFonts.figtree(fontSize: 14, fontWeight: FontWeight.w600)),
                            ),
                            Text('$current/$target $unit', style: GoogleFonts.figtree(fontSize: 12, color: AppTheme.getSecondaryTextColor(context))),
                          ],
                        ),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: progress / 100,
                            minHeight: 8,
                            backgroundColor: isDark ? Colors.grey[800] : Colors.grey[200],
                            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  // _buildHeader çıkarıldı; DashboardHeader kullanılmakta

  Widget _buildWeeklyOverviewCard(bool isDark, StudyDashboardState dashboardState) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: isDark 
                ? Colors.black.withOpacity(0.3)
                : Colors.black.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Haftalık Bakış',
                style: GoogleFonts.figtree(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.getPrimaryTextColor(context),
                ),
              ),
              TextButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const MainLayout(
                        currentIndex: 3,
                        child: PerformanceDashboardScreen(),
                      ),
                    ),
                  );
                },
                icon: Icon(
                  Icons.trending_up,
                  size: 18,
                  color: AppTheme.primaryColor,
                ),
                label: Text(
                  'Tümünü Gör',
                  style: GoogleFonts.figtree(
                    color: AppTheme.primaryColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Progress Circle
          Row(
            children: [
              SizedBox(
                width: 120,
                height: 120,
                child: Stack(
                  children: [
                    Center(
                      child: SizedBox(
                        width: 100,
                        height: 100,
                        child: CircularProgressIndicator(
                          value: dashboardState.weeklyProgress,
                          strokeWidth: 8,
                          backgroundColor: isDark 
                              ? Colors.grey[700] 
                              : Colors.grey[200],
                          valueColor: AlwaysStoppedAnimation<Color>(
                            AppTheme.primaryColor,
                          ),
                        ),
                      ),
                    ),
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '${(dashboardState.weeklyProgress * 100).toInt()}%',
                            style: GoogleFonts.figtree(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                          Text(
                            'Tamamlandı',
                            style: GoogleFonts.figtree(
                              fontSize: 12,
                              color: AppTheme.getSecondaryTextColor(context),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 24),

              // Stats
              Expanded(
                child: Column(
                  children: [
                    _buildStatItem(
                      Icons.star,
                      '${dashboardState.totalXP}',
                      'Toplam XP',
                      Colors.amber,
                      isDark,
                    ),
                    const SizedBox(height: 16),
                    _buildStatItem(
                      Icons.local_fire_department,
                      '${dashboardState.studyStreak} gün',
                      'Çalışma Serisi',
                      Colors.orange,
                      isDark,
                    ),
                    const SizedBox(height: 16),
                    _buildStatItem(
                      Icons.trending_up,
                      '${dashboardState.currentLevel}',
                      'Seviye',
                      Colors.green,
                      isDark,
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          Text(
            'Bu Haftaki Görevlerin',
            style: GoogleFonts.figtree(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.getPrimaryTextColor(context),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '0/120 görevi tamamladın',
            style: GoogleFonts.figtree(
              fontSize: 13,
              color: AppTheme.getSecondaryTextColor(context),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(IconData icon, String value, String label, Color color, bool isDark) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            icon,
            color: color,
            size: 20,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.getPrimaryTextColor(context),
                ),
              ),
              Text(
                label,
                style: GoogleFonts.figtree(
                  fontSize: 12,
                  color: AppTheme.getSecondaryTextColor(context),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTodayFocusCard(bool isDark, int todayTasks) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: isDark 
                ? Colors.black.withOpacity(0.3)
                : Colors.black.withOpacity(0.06),
            blurRadius: 15,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.calendar_today,
              color: AppTheme.primaryColor,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bugünkü Odak Noktan',
                  style: GoogleFonts.figtree(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.getPrimaryTextColor(context),
                  ),
                ),
                Text(
                '$todayTasks görev seni bekliyor',
                  style: GoogleFonts.figtree(
                    fontSize: 14,
                    color: AppTheme.getSecondaryTextColor(context),
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.arrow_forward_ios,
            color: AppTheme.getSecondaryTextColor(context),
            size: 16,
          ),
        ],
      ),
    );
  }

  Widget _buildQuickAccessSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Hızlı Erişim',
          style: GoogleFonts.figtree(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppTheme.getPrimaryTextColor(context),
          ),
        ),
        const SizedBox(height: 16),
        
        // İlk satır
        Row(
          children: [
            Expanded(
              child: _buildQuickAccessCard(
                icon: Icons.assignment_turned_in,
                title: 'Planım',
                color: Colors.blue,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const MainLayout(),
                    ),
                  );
                },
                isDark: isDark,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildQuickAccessCard(
                icon: Icons.center_focus_strong,
                title: 'Odak Modu',
                color: Colors.orange,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const FocusModeScreen(),
                    ),
                  );
                },
                isDark: isDark,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        
        // İkinci satır
        Row(
          children: [
            Expanded(
              child: _buildQuickAccessCard(
                icon: Icons.quiz,
                title: 'Sınav',
                color: Colors.red,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const ExamSimulatorScreen(),
                    ),
                  );
                },
                isDark: isDark,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildQuickAccessCard(
                icon: Icons.style,
                title: 'Kartlar',
                color: Colors.teal,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const FlashcardsDeckScreen(),
                    ),
                  );
                },
                isDark: isDark,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickAccessCard({
    required IconData icon,
    required String title,
    required Color color,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: color.withOpacity(0.2),
            width: 1,
          ),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: color,
                size: 24,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: GoogleFonts.figtree(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppTheme.getPrimaryTextColor(context),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSubjectCardsWithState(bool isDark, StudyDashboardState studyState) {
    final schedule = studyState.dailySchedule;
    if (schedule.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Bugünkü Dersler',
            style: GoogleFonts.figtree(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppTheme.getPrimaryTextColor(context),
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: Colors.grey.withOpacity(0.2),
                width: 1,
              ),
            ),
            child: Text(
              'Bugün için planlanmış ders bulunmuyor',
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: Colors.grey,
              ),
            ),
          ),
        ],
      );
    }
    // Varsayılan basit listeleme: schedule listesinde doğrudan oturumlar varsa kullan
    final sessions = <Map<String, dynamic>>[];
    for (final item in schedule) {
      if (item is Map<String, dynamic>) {
        final subject = item['subject'] ?? item['name'] ?? 'Ders';
        sessions.add({
          'name': subject,
          'duration': '${item['durationInMinutes'] ?? 45} dk',
          'topic': item['topic'] ?? 'Konu belirtilmemiş',
          'color': _getSubjectColor(subject.toString()),
          'completed': item['isCompleted'] ?? false,
          'startTime': item['startTime'],
          'sessionId': item['id'],
        });
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (studyState.dailySchedule is Map<String, dynamic> && (studyState.dailySchedule as Map<String, dynamic>)['hasActivePlan'] == true) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppTheme.primaryColor.withOpacity(0.3),
                width: 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.calendar_today,
                      color: AppTheme.primaryColor,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        (studyState.dailySchedule as Map<String, dynamic>)['planTitle'] ?? 'Aktif Program',
                        style: GoogleFonts.figtree(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'İlerleme: ${(studyState.dailySchedule as Map<String, dynamic>)['completedPlanSessions'] ?? 0}/${(studyState.dailySchedule as Map<String, dynamic>)['totalPlanSessions'] ?? 0} seans',
                            style: GoogleFonts.figtree(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                          const SizedBox(height: 4),
                          LinearProgressIndicator(
                            value: ((studyState.dailySchedule as Map<String, dynamic>)['planProgress'] ?? 0) / 100,
                            backgroundColor: Colors.grey[300],
                            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${(studyState.dailySchedule as Map<String, dynamic>)['planProgress'] ?? 0}%',
                        style: GoogleFonts.figtree(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        Text(
          'Bugünkü Dersler',
          style: GoogleFonts.figtree(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppTheme.getPrimaryTextColor(context),
          ),
        ),
        const SizedBox(height: 16),
        if (sessions.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: Colors.grey.withOpacity(0.2),
                width: 1,
              ),
            ),
            child: Text(
              'Bugün için planlanmış ders bulunmuyor',
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: Colors.grey,
              ),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: sessions.length,
            itemBuilder: (context, index) {
              final subject = sessions[index];
              return SubjectCard(subject: subject, isDark: isDark);
            },
          ),
      ],
    );
  }

  // _buildSubjectCard çıkarıldı; SubjectCard kullanılmakta

  // _buildBottomNavigation kaldırıldı - MainLayout kullanılıyor

  // _buildNavItem kaldırıldı - MainLayout kullanılıyor

  // _loadDailySchedule StudyDataProvider'a taşındı

  Color _getSubjectColor(String subject) {
    switch (subject.toLowerCase()) {
      case 'matematik':
      case 'math':
        return const Color(0xFFE91E63);
      case 'fizik':
      case 'physics':
        return const Color(0xFF9C27B0);
      case 'kimya':
      case 'chemistry':
        return const Color(0xFF3F51B5);
      case 'biyoloji':
      case 'biology':
        return const Color(0xFF4CAF50);
      case 'türkçe':
      case 'turkish':
        return const Color(0xFF2196F3);
      case 'tarih':
      case 'history':
        return const Color(0xFFFF9800);
      case 'coğrafya':
      case 'geography':
        return const Color(0xFF795548);
      case 'felsefe':
      case 'philosophy':
        return const Color(0xFF607D8B);
      case 'ingilizce':
      case 'english':
        return const Color(0xFF00BCD4);
      default:
        return const Color(0xFF9E9E9E);
    }
  }
}
