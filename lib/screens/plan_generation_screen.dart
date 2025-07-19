import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/services/plan_service.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:lottie/lottie.dart';
import 'package:okuz_ai/screens/user_plan_screen.dart';
import 'package:okuz_ai/screens/family_portal_screen.dart';
import 'package:okuz_ai/services/family_account_service.dart';
import 'package:okuz_ai/models/student_profile.dart';
import 'package:provider/provider.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class PlanGenerationScreen extends StatefulWidget {
  final OnboardingData? onboardingData;
  final String? planType; // 'regular', 'holiday_review' etc.
  final bool isHolidayPlan;
  final String? holidayPlanType;

  const PlanGenerationScreen({
    Key? key,
    this.onboardingData,
    this.planType = 'regular', // Varsayılan değer
    this.isHolidayPlan = false,
    this.holidayPlanType,
  }) : super(key: key);

  @override
  _PlanGenerationScreenState createState() => _PlanGenerationScreenState();
}

class _PlanGenerationScreenState extends State<PlanGenerationScreen> {
  Future<Map<String, dynamic>>? _planFuture;
  Map<String, dynamic>? _userProfile;

  @override
  void initState() {
    super.initState();
    _loadUserProfile().then((_) {
      _planFuture = _generatePlan();
    });
  }

  Future<void> _loadUserProfile() async {
    if (!widget.isHolidayPlan)
      return; // Tatil planı değilse profil yüklemesine gerek yok

    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception("Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.");
      }

      final profileDoc = await FirebaseFirestore.instance
          .doc('users/${user.uid}/privateProfile/profile')
          .get();

      if (profileDoc.exists) {
        setState(() {
          _userProfile = profileDoc.data() as Map<String, dynamic>;
        });
      } else {
        throw Exception("Kullanıcı profili bulunamadı.");
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Profil yüklenemedi: ${e.toString()}')),
        );
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> _generatePlan() async {
    final planService = context.read<PlanService>();

    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception("Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.");
      }
      await user.getIdToken(true);

      if (widget.isHolidayPlan) {
        // Tatil planı oluşturma
        if (_userProfile == null) {
          throw Exception("Kullanıcı profili yüklenemedi.");
        }

        final result = await planService.generateInitialLongTermPlan(
          grade: _userProfile!['grade'],
          targetExam: _userProfile!['targetExam'],
          dailyHours: _userProfile!['dailyHours'],
          planScope: _userProfile!['planScope'] ?? '4_weeks',
          selectedSubjects:
              List<String>.from(_userProfile!['selectedSubjects'] ?? []),
          planType: widget.holidayPlanType ?? 'holiday_balanced',
        );
        return result;
      } else {
        // Normal plan oluşturma (onboarding sonrası)
        final onboardingData = widget.onboardingData;

        if (onboardingData == null) {
          // Onboarding verisi yoksa Firebase'den kullanıcı profilini oku
          final user = FirebaseAuth.instance.currentUser;
          if (user == null) {
            throw Exception("Kullanıcı oturum açmamış.");
          }

          final profileDoc = await FirebaseFirestore.instance
              .collection('users')
              .doc(user.uid)
              .collection('privateProfile')
              .doc('profile')
              .get();

          if (!profileDoc.exists) {
            throw Exception(
                "Kullanıcı profili bulunamadı. Lütfen onboarding'i tamamlayın.");
          }

          final profileData = profileDoc.data() as Map<String, dynamic>;

          final result = await planService.generateInitialLongTermPlan(
            grade: profileData['grade'] ?? '12',
            targetExam: profileData['targetExam'] ?? 'YKS',
            dailyHours: (profileData['dailyHours'] ?? 2).toInt(),
            planScope: profileData['planScope'] ?? '4_weeks',
            selectedSubjects: List<String>.from(
                profileData['selectedSubjects'] ?? ['Matematik', 'Türkçe']),
            planType: widget.planType ?? 'regular',
          );
          return result;
        }

        final result = await planService.generateInitialLongTermPlan(
          grade: onboardingData.grade,
          targetExam: onboardingData.targetExam,
          dailyHours: onboardingData.dailyGoalInHours.toInt(),
          planScope: onboardingData.planScope,
          selectedSubjects: onboardingData.selectedSubjects,
          planType: widget.planType,
        );
        return result;
      }
    } catch (e) {
      // Hata durumunda kullanıcıya bildir ve hatayı yukarı taşı
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Plan oluşturulamadı: ${e.toString()}')),
        );
      }
      rethrow;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SingleChildScrollView(
        child: FutureBuilder<Map<String, dynamic>>(
          future: _planFuture,
          builder: (context, snapshot) {
            Widget content;
            if (snapshot.connectionState == ConnectionState.waiting) {
              content = _buildStatusContent(
                  'AI Koçun Çalışıyor...',
                  widget.isHolidayPlan
                      ? 'Tatil dönemine özel kişiselleştirilmiş çalışma planınız hazırlanıyor.'
                      : 'AI Koçun, sana özel 1 haftalık stratejik başlangıç planını hazırlıyor...\n\n🎯 Güven seviyelerine göre konu analizi\n✨ Kişiselleştirilmiş görev oluşturma\n🚀 Haftalık başarı stratejisi tasarlama',
                  '');
            } else if (snapshot.hasError) {
              content = _buildStatusContent(
                  'Bir Hata Oluştu',
                  'Planınız oluşturulurken bir sorunla karşılaşıldı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.\n\nHata: ${snapshot.error}',
                  'assets/animations/error.json',
                  isError: true);
            } else if (snapshot.hasData) {
              // Plan başarıyla oluşturuldu, yönlendirme yap.
              WidgetsBinding.instance.addPostFrameCallback((_) async {
                // Hesap tipini kontrol et
                final familyService = context.read<FamilyAccountService>();
                await familyService.loadAccountData();
                final accountType = familyService.accountType;

                if (accountType == AccountType.parent) {
                  // Veli hesabı - Family Portal'a git
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(
                        builder: (context) => const FamilyPortalScreen()),
                    (Route<dynamic> route) => false,
                  );
                } else {
                  // Öğrenci hesabı - User Plan Screen'e git
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(
                        builder: (context) => const UserPlanScreen()),
                    (Route<dynamic> route) => false,
                  );
                }
              });
              content = _buildStatusContent(
                  'Stratejik Planın Hazır! 🎉',
                  widget.isHolidayPlan
                      ? 'Tatilinize özel çalışma planınız başarıyla oluşturuldu. Şimdi sizi planınıza yönlendiriyoruz.'
                      : '1 haftalık stratejik başlangıç planın hazır!\n\n🎯 Her gün için özel tema\n✨ Güven seviyelerine göre kişiselleştirilmiş görevler\n🏆 7. günde performans raporu seni bekliyor',
                  'assets/animations/success.json');
            } else {
              // Başlangıç durumu
              content = _buildStatusContent('Başlatılıyor...',
                  'Plan oluşturma süreci başlatılıyor. Lütfen bekleyin.', '');
            }
            return Center(child: content);
          },
        ),
      ),
    );
  }

  Widget _buildStatusContent(
      String title, String message, String animationAsset,
      {bool isError = false}) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          animationAsset.isEmpty
              ? Container(
                  width: 200,
                  height: 200,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(
                            AppTheme.primaryColor),
                        strokeWidth: 3,
                      ),
                      const SizedBox(height: 20),
                      Icon(
                        Icons.psychology,
                        size: 64,
                        color: AppTheme.primaryColor,
                      ),
                    ],
                  ),
                )
              : Lottie.asset(
                  animationAsset,
                  width: 200,
                  height: 200,
                ),
          const SizedBox(height: 20),
          Text(
            title,
            style: Theme.of(context).textTheme.headlineSmall,
            textAlign: TextAlign.center,
          ).animate().fadeIn(delay: 500.ms),
          const SizedBox(height: 10),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ).animate().fadeIn(delay: 1000.ms),
          ),
          if (isError)
            Padding(
              padding: const EdgeInsets.only(top: 24.0),
              child: ElevatedButton(
                onPressed: () {
                  setState(() {
                    _planFuture = _generatePlan();
                  });
                },
                child: const Text('Tekrar Dene'),
              ),
            ),
        ],
      ),
    );
  }
}
