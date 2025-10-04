import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:okuz_ai/screens/feynman_cycle_screen.dart';
import 'package:okuz_ai/screens/calendar_view_screen.dart';
import 'package:okuz_ai/widgets/main_layout.dart';
import 'package:okuz_ai/widgets/locked_day_card.dart';
import 'package:okuz_ai/screens/paywall_screen.dart';
import 'package:okuz_ai/providers/plan_provider.dart';
import 'package:okuz_ai/models/plan_detail_model.dart';
import 'package:okuz_ai/providers/subscription_provider.dart';

class PlanDisplayScreen extends ConsumerWidget {
  final String planId;
  const PlanDisplayScreen({Key? key, required this.planId}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subState = ref.watch(subscriptionNotifierProvider);
    final planDetailAsync = ref.watch(planDetailProvider(planId));
    return planDetailAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (err, stack) => Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.assignment_outlined,
                size: 64,
                color: Colors.grey,
              ),
              const SizedBox(height: 16),
              Text('Plan yüklenemedi: $err'),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pushReplacementNamed('/user-plan');
                },
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(200, 48),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  backgroundColor: AppTheme.primaryColor,
                  elevation: 0,
                ),
                child: const Text('Plan Oluştur'),
              ),
            ],
          ),
        ),
      ),
      data: (PlanDetailModel plan) {
        final isPremium = subState.canAccessPremiumFeatures;
        return Scaffold(
          backgroundColor: Theme.of(context).colorScheme.surface,
          body: _buildPlanView(context, plan, isPremium),
        );
      },
    );
  }

  Widget _buildPlanView(BuildContext context, PlanDetailModel plan, bool isPremium) {
    final nested = plan.plan;
    final isHolidayPlan = nested != null && 
        (nested['type'] == 'exam_focused' || 
         nested['type'] == 'tyt_review' || 
         nested['type'] == 'holiday_plan' ||
         nested['dailySchedule'] != null);

    if (isHolidayPlan) {
      debugPrint('🏖️ Tatil planı render ediliyor...');
      return _buildHolidayPlanView(context, nested!, isPremium);
    }

    debugPrint('📚 Normal plan render ediliyor...');
    return _buildNormalPlanView(context, plan, isPremium);
  }

  Widget _buildNormalPlanView(BuildContext context, PlanDetailModel plan, bool isPremium) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isPremium) _buildPremiumBanner(context),
          const SizedBox(height: 16),
          _buildPlanHeader(context, plan),
          const SizedBox(height: 24),
          _buildPlanStats(context, plan),
          const SizedBox(height: 24),
          if (plan.nextSession != null) _buildNextSession(context, plan.nextSession!),
          const SizedBox(height: 24),
          // Semantics/parentData hatalarına yol açmaması için listeleri
          // tek bir Column altında statik olarak üretip builder ile render ediyoruz
          _buildSubjectsSection(context, plan),
          const SizedBox(height: 24),
          _buildGoalsSection(context, plan.plan ?? {}),
        ],
      ),
    );
  }

  Widget _buildHolidayPlanView(BuildContext context, Map<String, dynamic> holidayPlan, bool isPremium) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isPremium) _buildPremiumBanner(context),
          const SizedBox(height: 16),
          _buildHolidayPlanHeader(context, holidayPlan),
          const SizedBox(height: 24),
          _buildHolidayPlanStats(context, holidayPlan),
          const SizedBox(height: 24),
          _buildWeeklyPlansSection(context, holidayPlan),
        ],
      ),
    );
  }

  Widget _buildPremiumBanner(BuildContext? context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFF6B35), Color(0xFFFF8E53)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFF6B35).withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          const Icon(
            Icons.star,
            color: Colors.white,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Premium\'a Yükselt',
                  style: GoogleFonts.figtree(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                Text(
                  'Daha fazla özellik için premium üye olun',
                  style: GoogleFonts.figtree(
                    fontSize: 12,
                    color: Colors.white.withOpacity(0.8),
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.push(
                context!,
                MaterialPageRoute(
                  builder: (context) => const PaywallScreen(
                    reason: 'Premium özelliklere erişmek için abone olun',
                  ),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: const Color(0xFFFF6B35),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('Yükselt'),
          ),
        ],
      ),
    );
  }

  Widget _buildHolidayPlanHeader(BuildContext context, Map<String, dynamic> holidayPlan) {
    final title = holidayPlan['title'] ?? 'Tatil Çalışma Planı';
    final duration = holidayPlan['duration'] ?? 28;
    final type = holidayPlan['type'] ?? 'exam_focused';
    final dailyHours = holidayPlan['dailyHours'] ?? 6;

    final typeDescription = {
          'exam_focused': 'Sınav Hazırlık Programı',
          'tyt_review': 'TYT Tekrar Programı',
          'holiday_plan': 'Tatil Çalışma Programı',
        }[type] ??
        'Tatil Çalışma Programı';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor,
            AppTheme.primaryColor.withOpacity(0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.beach_access,
                color: Colors.white,
                size: 28,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.figtree(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            '$duration günlük kişiselleştirilmiş tatil planınız hazır!',
            style: GoogleFonts.figtree(
              fontSize: 16,
              color: Colors.white.withOpacity(0.9),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildPlanFeature(Icons.schedule, 'Günde ${dailyHours.toStringAsFixed(1)} saat'),
              const SizedBox(width: 16),
              _buildPlanFeature(Icons.auto_awesome, 'AI Destekli'),
              const SizedBox(width: 16),
              _buildPlanFeature(Icons.trending_up, 'Kişisel'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPlanFeature(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.white.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 16,
            color: Colors.white,
          ),
          const SizedBox(width: 6),
          Text(
            text,
            style: GoogleFonts.figtree(
              fontSize: 12,
              color: Colors.white,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHolidayPlanStats(BuildContext context, Map<String, dynamic> holidayPlan) {
    final dailySchedule = List<Map<String, dynamic>>.from(holidayPlan['dailySchedule'] ?? []);
    final duration = holidayPlan['duration'] ?? 28;
    final dailyHours = holidayPlan['dailyHours'] ?? 6;

    // Backend'den gelen duration değerini kullan
    int totalDays = duration;
    int totalSessions = 0;
    double totalHours = (totalDays * dailyHours).toDouble();

    for (final day in dailySchedule) {
      final sessions = List<Map<String, dynamic>>.from(day['sessions'] ?? []);
      totalSessions += sessions.length;
    }

    return Row(
      children: [
        Expanded(
          child: _buildStatCard(context, 'Toplam Gün', '$totalDays', Icons.calendar_today),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(context, 'Toplam Seans', '$totalSessions', Icons.play_circle_outline),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(context, 'Toplam Saat', '${totalHours.toStringAsFixed(1)}', Icons.access_time),
        ),
      ],
    );
  }

  Widget _buildStatCard(BuildContext context, String title, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.primaryColor.withOpacity(0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(
            icon,
            color: AppTheme.primaryColor,
            size: 24,
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.figtree(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppTheme.getPrimaryTextColor(context),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: GoogleFonts.figtree(
              fontSize: 12,
              color: AppTheme.getSecondaryTextColor(context),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildWeeklyPlansSection(BuildContext context, Map<String, dynamic> holidayPlan) {
    final dailySchedule = List<Map<String, dynamic>>.from(holidayPlan['dailySchedule'] ?? []);
    final weeklyGoals = List<Map<String, dynamic>>.from(holidayPlan['weeklyGoals'] ?? []);

    if (dailySchedule.isEmpty) {
      return const Center(
        child: Text(
          'Henüz günlük plan oluşturulmamış.',
          style: TextStyle(
            fontSize: 16,
            color: Colors.grey,
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Günlük Planlarınız',
          style: GoogleFonts.figtree(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppTheme.getPrimaryTextColor(context),
          ),
        ),
        const SizedBox(height: 16),
        ...dailySchedule.asMap().entries.map((entry) {
          final dayIndex = entry.key + 1;
          final dayPlan = entry.value;
          return _buildDayPlanCard(context, dayIndex, dayPlan);
        }).toList(),
      ],
    );
  }

  Widget _buildDayPlanCard(BuildContext context, int dayNumber, Map<String, dynamic> dayPlan) {
    final dateString = dayPlan['date'] ?? '';
    final sessions = List<Map<String, dynamic>>.from(dayPlan['sessions'] ?? []);
    
    // Tarihi formatla
    String formattedDate = 'Gün $dayNumber';
    if (dateString.isNotEmpty) {
      try {
        final date = DateTime.parse(dateString);
        final formatter = DateFormat('dd MMM yyyy', 'tr_TR');
        formattedDate = formatter.format(date);
      } catch (e) {
        formattedDate = 'Gün $dayNumber';
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppTheme.primaryColor.withOpacity(0.2),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ExpansionTile(
        initiallyExpanded: dayNumber == 1,
        tilePadding: const EdgeInsets.all(20),
        childrenPadding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        backgroundColor: Colors.transparent,
        collapsedBackgroundColor: Colors.transparent,
        iconColor: AppTheme.primaryColor,
        collapsedIconColor: AppTheme.primaryColor,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Gün $dayNumber',
                    style: GoogleFonts.figtree(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    formattedDate,
                    style: GoogleFonts.figtree(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.getPrimaryTextColor(context),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${sessions.length} seans',
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: AppTheme.getSecondaryTextColor(context),
              ),
            ),
          ],
        ),
        children: [
          ...sessions.map((session) => _buildSessionCard(context, session)).toList(),
        ],
      ),
    );
  }

  Widget _buildSessionCard(BuildContext context, Map<String, dynamic> sessionData) {
    final time = sessionData['time'] ?? '09:00-10:30';
    final subject = sessionData['subject'] ?? 'Ders';
    final topic = sessionData['topic'] ?? 'Konu';
    final activity = sessionData['activity'] ?? 'Aktivite';
    final type = sessionData['type'] ?? 'study';
    final difficulty = sessionData['difficulty'] ?? 'medium';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.primaryColor.withOpacity(0.1),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.schedule,
                size: 18,
                color: AppTheme.primaryColor,
              ),
              const SizedBox(width: 8),
              Text(
                time,
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.getPrimaryTextColor(context),
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  subject,
                  style: GoogleFonts.figtree(
                    fontSize: 12,
                    color: AppTheme.primaryColor,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            topic,
            style: GoogleFonts.figtree(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.getPrimaryTextColor(context),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            activity,
            style: GoogleFonts.figtree(
              fontSize: 13,
              color: AppTheme.getSecondaryTextColor(context),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: _getDifficultyColor(difficulty).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  difficulty.toUpperCase(),
                  style: GoogleFonts.figtree(
                    fontSize: 10,
                    color: _getDifficultyColor(difficulty),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: _getTypeColor(type).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  type.toUpperCase(),
                  style: GoogleFonts.figtree(
                    fontSize: 10,
                    color: _getTypeColor(type),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _getDifficultyColor(String difficulty) {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return Colors.green;
      case 'medium':
        return Colors.orange;
      case 'hard':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Color _getTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'study':
        return Colors.blue;
      case 'practice':
        return Colors.purple;
      case 'review':
        return Colors.teal;
      case 'project':
        return Colors.indigo;
      default:
        return Colors.grey;
    }
  }

  Widget _buildPlanHeader(BuildContext context, PlanDetailModel plan) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor,
            AppTheme.primaryColor.withOpacity(0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.school,
                color: Colors.white,
                size: 28,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  plan.title,
                  style: GoogleFonts.figtree(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            plan.description ?? 'Kişiselleştirilmiş çalışma planınız',
            style: GoogleFonts.figtree(
              fontSize: 16,
              color: Colors.white.withOpacity(0.9),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlanStats(BuildContext context, PlanDetailModel plan) {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(context, 'Toplam Gün', '${plan.totalDays ?? 0}', Icons.calendar_today),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(context, 'Tamamlanan', '${plan.completedDays ?? 0}', Icons.check_circle),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(context, 'İlerleme', '${plan.progress ?? 0}%', Icons.trending_up),
        ),
      ],
    );
  }

  Widget _buildNextSession(BuildContext context, Map<String, dynamic> session) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.primaryColor.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.play_circle_outline,
                color: AppTheme.primaryColor,
                size: 24,
              ),
              const SizedBox(width: 12),
              Text(
                'Sonraki Seans',
                style: GoogleFonts.figtree(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.getPrimaryTextColor(context),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            session['subject'] ?? 'Ders',
            style: GoogleFonts.figtree(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.getPrimaryTextColor(context),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            session['topic'] ?? 'Konu',
            style: GoogleFonts.figtree(
              fontSize: 14,
              color: AppTheme.getSecondaryTextColor(context),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubjectsSection(BuildContext context, PlanDetailModel plan) {
    final dynamic rawSubjects = plan.subjects;
    final List<Map<String, dynamic>> subjects = <Map<String, dynamic>>[];

    if (rawSubjects is List) {
      for (final dynamic item in rawSubjects) {
        if (item is String) {
          subjects.add({'name': item, 'progress': 0});
        } else if (item is Map) {
          final mapItem = Map<String, dynamic>.from(item as Map);
          subjects.add({
            'name': mapItem['name'] ?? mapItem['subject'] ?? 'Ders',
            'progress': (mapItem['progress'] is num)
                ? (mapItem['progress'] as num).toInt()
                : 0,
          });
        } else {
          subjects.add({'name': item.toString(), 'progress': 0});
        }
      }
    }

    return Column(
      key: const ValueKey('subjects-section'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Dersler',
          style: GoogleFonts.figtree(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppTheme.getPrimaryTextColor(context),
          ),
        ),
        const SizedBox(height: 16),
        ListView.builder(
          key: const PageStorageKey('subjects-list'),
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: subjects.length,
          itemBuilder: (context, index) {
            return _buildSubjectCard(context, subjects[index]);
          },
        ),
      ],
    );
  }

  Widget _buildSubjectCard(BuildContext context, Map<String, dynamic> subject) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.primaryColor.withOpacity(0.1),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.book,
              color: AppTheme.primaryColor,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  subject['name'] ?? 'Ders',
                  style: GoogleFonts.figtree(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.getPrimaryTextColor(context),
                  ),
                ),
                Text(
                  '${subject['progress'] ?? 0}% tamamlandı',
                  style: GoogleFonts.figtree(
                    fontSize: 14,
                    color: AppTheme.getSecondaryTextColor(context),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            width: 120,
            child: LinearProgressIndicator(
              minHeight: 6,
              value: (subject['progress'] ?? 0) / 100,
              backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
              valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGoalsSection(BuildContext context, Map<String, dynamic> plan) {
    final dynamic rawGoals = plan['goals'];
    final List<String> goals = <String>[];
    if (rawGoals is List) {
      for (final dynamic g in rawGoals) {
        goals.add(g?.toString() ?? '');
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Hedefler',
          style: GoogleFonts.figtree(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppTheme.getPrimaryTextColor(context),
          ),
        ),
        const SizedBox(height: 16),
        ListView.builder(
          key: const PageStorageKey('goals-list'),
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: goals.length,
          itemBuilder: (context, index) {
            return _buildGoalCard(context, goals[index]);
          },
        ),
      ],
    );
  }

  Widget _buildGoalCard(BuildContext context, String goal) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppTheme.primaryColor.withOpacity(0.1),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.flag,
            color: AppTheme.primaryColor,
            size: 16,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              goal,
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: AppTheme.getPrimaryTextColor(context),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

