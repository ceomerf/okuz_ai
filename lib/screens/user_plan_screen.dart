import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:okuz_ai/services/plan_service.dart';
import 'package:okuz_ai/screens/plan_generation_status_screen.dart';
import 'package:okuz_ai/screens/plan_display_screen.dart';
import 'package:okuz_ai/widgets/modern_loading_screen.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert'; // jsonEncode için
import 'package:okuz_ai/providers/plan_provider.dart';

class UserPlanScreen extends ConsumerStatefulWidget {
  const UserPlanScreen({super.key});

  @override
  ConsumerState<UserPlanScreen> createState() => _UserPlanScreenState();
}

class _UserPlanScreenState extends ConsumerState<UserPlanScreen>
    with TickerProviderStateMixin {
  bool _isLoading = false;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  DateTime? _holidayStart;
  DateTime? _holidayEnd;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutCubic,
    ));

    _animationController.forward();

    // Önce mevcut planları kontrol et
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkExistingPlans();
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _checkExistingPlans() async {
    setState(() {
      _isLoading = true;
    });

    try {
      debugPrint('🔍 Plan kontrolü başlatılıyor...');

      // Önce tatil planı var mı kontrol et
      final prefs = await SharedPreferences.getInstance();
      final hasHolidayPlan = prefs.getBool('has_holiday_plan') ?? false;
      final holidayPlanJson = prefs.getString('holiday_plan');

      if (hasHolidayPlan && holidayPlanJson != null) {
        debugPrint(
            '✅ Tatil planı bulundu, PlanDisplayScreen\'e yönlendiriliyor...');
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => const PlanDisplayScreen(planId: '_holiday'),
            ),
          );
        }
        return;
      }

      // Tatil planı yoksa normal planları kontrol et
      final planService = ref.read(planServiceProvider);
      final plans = await planService.getUserPlans();

      debugPrint('📋 Gelen planlar: $plans');
      debugPrint('📋 Plan sayısı: ${plans?.length ?? 0}');

      if (plans != null && plans.isNotEmpty) {
        debugPrint(
            '✅ Normal plan bulundu, PlanDisplayScreen\'e yönlendiriliyor...');
        // Plan varsa, plan gösterim ekranına git
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => PlanDisplayScreen(planId: plans.first.id),
            ),
          );
        }
      } else {
        debugPrint(
            '❌ Hiç plan bulunamadı, plan oluşturma ekranı gösteriliyor...');
        // Plan yoksa, plan oluşturma ekranını göster
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('❌ Plan kontrolü hatası: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _createPlan() async {
    setState(() {
      _isLoading = true;
    });

    try {
      debugPrint('🚀 Plan oluşturma işlemi başlatılıyor...');

      final prefs = await SharedPreferences.getInstance();
      final planService = ref.read(planServiceProvider);

      // Önce tatil planı var mı kontrol et
      final hasHolidayPlan = prefs.getBool('has_holiday_plan') ?? false;
      final holidayPlanType = prefs.getString('holiday_plan_type');

      if (hasHolidayPlan || holidayPlanType != null) {
        debugPrint('🏖️ Tatil planı oluşturuluyor...');

        // Onboarding verilerini al
        final studentName = prefs.getString('student_name') ?? '';
        final studentGrade = prefs.getString('student_grade') ?? '11';
        final academicTrack = prefs.getString('academic_track') ?? 'sayisal';
        final targetExam = prefs.getString('student_target') ?? 'YKS';
        final selectedSubjects = prefs.getStringList('selected_subjects') ?? [];
        final dailyHours = prefs.getDouble('daily_hours') ?? 2.0;

        // Tatil süresini dinamik hesapla
        final start = _holidayStart ?? DateTime.now();
        final end = _holidayEnd ?? DateTime.now().add(const Duration(days: 27));
        final days = end.difference(start).inDays + 1;
        final durationDays = days.clamp(1, 60);

        // Tatil planı oluştur
        final result = await planService.createHolidayPlan(
          holidayType: holidayPlanType ?? 'balanced_tyt_ayt',
          duration: durationDays,
          goals: ['Tatil döneminde verimli çalışma'],
          grade: studentGrade,
          academicTrack: academicTrack,
          targetExam: targetExam,
          selectedSubjects: selectedSubjects,
          dailyHours: dailyHours,
          confidenceLevels: {}, // Varsayılan
          holidayWorkPreferences: {},
          approach: 'automatic',
          priority: 'both',
          followSchool: false,
          hasTYTKnowledge: false,
          topicTracking: 'from_scratch',
        );

        debugPrint('✅ Tatil planı oluşturuldu: ${result['success']}');

        // Tatil planını kaydet
        await prefs.setString('holiday_plan', jsonEncode(result));
        await prefs.setBool('has_holiday_plan', true);
      } else {
        debugPrint('📚 Normal plan oluşturuluyor...');
        // Onboarding plan süresini dinamik belirle (ör: tercih/amaçlara göre)
        final pacing = prefs.getString('plan_pacing') ?? 'standard'; // 'easy'|'standard'|'intense'
        final planDurationDays = pacing == 'easy' ? 3 : pacing == 'intense' ? 14 : 7;
        final result = await planService.createPlanFromOnboarding(planDurationDays: planDurationDays);
      }

      if (mounted) {
        // Plan oluşturma durumu ekranına git
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => const PlanGenerationStatusScreen(
              useOnboardingData: true,
            ),
          ),
        );
      }
    } catch (e) {
      debugPrint('❌ Plan oluşturma hatası: $e');
      setState(() {
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Plan oluşturulurken hata oluştu: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final plansAsyncValue = ref.watch(plansProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: plansAsyncValue.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Bir hata oluştu: $err')),
        data: (plans) => _isLoading
            ? const ModernLoadingScreen(
                title: 'Planınız Hazırlanıyor',
                subtitle:
                    'Onboarding verileriniz kullanılarak kişiselleştirilmiş bir çalışma planı oluşturuluyor...',
                loadingText: 'AI analiz ediyor...',
              )
            : FadeTransition(
              opacity: _fadeAnimation,
              child: SlideTransition(
                position: _slideAnimation,
                child: Stack(
                  children: [
                    // Arkaplanda modern dairesel gradient süsler
                    Positioned(
                      top: -60,
                      left: -40,
                      child: Container(
                        width: 180,
                        height: 180,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            colors: [
                              AppTheme.primaryColor.withOpacity(0.2),
                              AppTheme.primaryDarkColor.withOpacity(0.08),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: -50,
                      right: -30,
                      child: Container(
                        width: 160,
                        height: 160,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            colors: [
                              AppTheme.primaryDarkColor.withOpacity(0.16),
                              AppTheme.primaryColor.withOpacity(0.08),
                            ],
                          ),
                        ),
                      ),
                    ),

                    // İçerik
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final horizontalPadding = constraints.maxWidth > 640 ? (constraints.maxWidth - 540) / 2 : 24.0;
                        final contentMinHeight = (constraints.maxHeight - 48).clamp(0.0, double.infinity);
                        return SingleChildScrollView(
                          padding: EdgeInsets.fromLTRB(horizontalPadding, 24, horizontalPadding, 24),
                          child: ConstrainedBox(
                            constraints: BoxConstraints(maxWidth: 540, minHeight: contentMinHeight),
                            child: Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  const SizedBox(height: 24),
                          // Hero kartı
                          Container(
                            padding: const EdgeInsets.all(28),
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardColor,
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(
                                color: Theme.of(context).dividerColor,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.primaryColor.withOpacity(0.08),
                                  blurRadius: 20,
                                  offset: const Offset(0, 10),
                                ),
                              ],
                            ),
                            child: Column(
                              children: [
                                Container(
                                  width: 84,
                                  height: 84,
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [
                                        AppTheme.primaryColor,
                                        AppTheme.primaryDarkColor,
                                      ],
                                    ),
                                    borderRadius: BorderRadius.circular(22),
                                  ),
                                  child: const Icon(
                                    Icons.school_rounded,
                                    color: Colors.white,
                                    size: 42,
                                  ),
                                ),
                                const SizedBox(height: 22),
                                Text(
                                  'Hoş Geldiniz!',
                                  style: TextStyle(
                                    fontSize: 30,
                                    fontWeight: FontWeight.w800,
                                    color: Theme.of(context)
                                        .textTheme
                                        .headlineSmall
                                        ?.color,
                                    fontFamily: 'Figtree',
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  'Kişiselleştirilmiş öğrenme deneyiminiz başlıyor',
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.color,
                                    height: 1.4,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 28),

                                  // Mevcut planlar listesi (Riverpod üzerinden)
                                  if (plans.isNotEmpty) ...[
                                    Align(
                                      alignment: Alignment.centerLeft,
                                      child: Text(
                                        'Mevcut Planlarınız',
                                        style: TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.w700,
                                          color: Theme.of(context).textTheme.titleLarge?.color,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    ListView.builder(
                                      shrinkWrap: true,
                                      physics: const NeverScrollableScrollPhysics(),
                                      itemCount: plans.length,
                                      itemBuilder: (context, index) {
                                        final plan = plans[index];
                                        return Container(
                                          margin: const EdgeInsets.only(bottom: 12),
                                          decoration: BoxDecoration(
                                            color: Theme.of(context).cardColor,
                                            borderRadius: BorderRadius.circular(12),
                                            border: Border.all(color: Theme.of(context).dividerColor),
                                          ),
                                          child: ListTile(
                                            title: Text(plan.title.isNotEmpty ? plan.title : 'Plan ${index + 1}'),
                                            subtitle: Text('${plan.typeDisplayName} • ${plan.progressText} • ${plan.sessionsText}'),
                                            trailing: const Icon(Icons.chevron_right),
                                            onTap: () {
                                              Navigator.of(context).push(
                                                MaterialPageRoute(
                                                  builder: (context) => PlanDisplayScreen(planId: plans.first.id),
                                                ),
                                              );
                                            },
                                          ),
                                        );
                                      },
                                    ),
                                    const SizedBox(height: 16),
                                  ],

                          // Basit tatil tarih seçimi
                          Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardColor,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Theme.of(context).dividerColor),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: TextButton.icon(
                                    onPressed: () async {
                                      final now = DateTime.now();
                                      final picked = await showDatePicker(
                                        context: context,
                                        initialDate: _holidayStart ?? now,
                                        firstDate: now.subtract(const Duration(days: 0)),
                                        lastDate: now.add(const Duration(days: 365)),
                                      );
                                      if (picked != null) setState(() => _holidayStart = picked);
                                    },
                                    icon: const Icon(Icons.calendar_today, size: 18),
                                    label: Text(_holidayStart == null
                                        ? 'Tatil Başlangıç Tarihi'
                                        : 'Başlangıç: ${_holidayStart!.toIso8601String().split('T').first}'),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: TextButton.icon(
                                    onPressed: () async {
                                      final base = _holidayStart ?? DateTime.now();
                                      final picked = await showDatePicker(
                                        context: context,
                                        initialDate: _holidayEnd ?? base.add(const Duration(days: 6)),
                                        firstDate: base,
                                        lastDate: base.add(const Duration(days: 365)),
                                      );
                                      if (picked != null) setState(() => _holidayEnd = picked);
                                    },
                                    icon: const Icon(Icons.event, size: 18),
                                    label: Text(_holidayEnd == null
                                        ? 'Tatil Bitiş Tarihi'
                                        : 'Bitiş: ${_holidayEnd!.toIso8601String().split('T').first}'),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // CTA butonu
                          Container(
                            width: double.infinity,
                            height: 56,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [AppTheme.primaryColor, AppTheme.primaryDarkColor],
                                begin: Alignment.centerLeft,
                                end: Alignment.centerRight,
                              ),
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.primaryColor.withOpacity(0.25),
                                  blurRadius: 18,
                                  offset: const Offset(0, 6),
                                ),
                              ],
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: _createPlan,
                                borderRadius: BorderRadius.circular(16),
                                child: const Center(
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.auto_awesome, color: Colors.white, size: 22),
                                      SizedBox(width: 10),
                                      Text(
                                        'Planımı Oluştur',
                                        style: TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white,
                                          fontFamily: 'Figtree',
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 22),

                          // Özellikler
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Expanded(
                                        child: _buildInfoCard(
                                          icon: Icons.psychology,
                                          title: 'AI Destekli',
                                          subtitle: 'Kişiselleştirilmiş öneriler',
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: _buildInfoCard(
                                          icon: Icons.trending_up,
                                          title: 'Adaptif',
                                          subtitle: 'Hızınıza göre ayarlanır',
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
      ),
    );
  }

  Widget _buildInfoCard({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).dividerColor,
          width: 1,
        ),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            color: const Color(0xFFF57C00),
            size: 24,
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Theme.of(context).textTheme.bodyLarge?.color,
              fontFamily: 'Figtree',
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).textTheme.bodyMedium?.color,
              fontFamily: 'Figtree',
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
