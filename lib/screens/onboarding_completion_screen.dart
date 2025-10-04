import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:okuz_ai/screens/user_plan_screen.dart';

class OnboardingCompletionScreen extends StatefulWidget {
  final String userName;
  final String targetUniversity;
  final String grade;

  const OnboardingCompletionScreen({
    Key? key,
    required this.userName,
    required this.targetUniversity,
    required this.grade,
  }) : super(key: key);

  @override
  State<OnboardingCompletionScreen> createState() =>
      _OnboardingCompletionScreenState();
}

class _OnboardingCompletionScreenState
    extends State<OnboardingCompletionScreen> {
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              const SizedBox(height: 40),

              // Başarı ikonu
              Animate(
                effects: const [
                  FadeEffect(duration: Duration(milliseconds: 800)),
                  ScaleEffect(
                      begin: Offset(0.5, 0.5),
                      end: Offset.zero,
                      curve: Curves.elasticOut)
                ],
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppTheme.primaryColor.withAlpha(51),
                  ),
                  child: Icon(
                    Icons.check_circle,
                    size: 80,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ),

              const SizedBox(height: 40),

              // Başlık
              Animate(
                delay: const Duration(milliseconds: 300),
                effects: const [
                  FadeEffect(duration: Duration(milliseconds: 600))
                ],
                child: Text(
                  'Tebrikler! 🎉',
                  style: GoogleFonts.figtree(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.getPrimaryTextColor(context),
                  ),
                  textAlign: TextAlign.center,
                ),
              ),

              const SizedBox(height: 16),

              // Alt başlık
              Animate(
                delay: const Duration(milliseconds: 500),
                effects: const [
                  FadeEffect(duration: Duration(milliseconds: 600))
                ],
                child: Text(
                  'Profilini başarıyla tamamladın',
                  style: GoogleFonts.figtree(
                    fontSize: 18,
                    color: AppTheme.getSecondaryTextColor(context),
                  ),
                  textAlign: TextAlign.center,
                ),
              ),

              const SizedBox(height: 40),

              // Kullanıcı bilgileri kartı
              Animate(
                delay: const Duration(milliseconds: 700),
                effects: const [
                  FadeEffect(duration: Duration(milliseconds: 600)),
                  SlideEffect(begin: Offset(0, 0.3), end: Offset.zero)
                ],
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppTheme.primaryColor.withAlpha(51),
                      width: 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      // Kullanıcı adı
                      Row(
                        children: [
                          Icon(
                            Icons.person_outline,
                            color: AppTheme.primaryColor,
                            size: 24,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Ad Soyad',
                                  style: GoogleFonts.figtree(
                                    fontSize: 14,
                                    color:
                                        AppTheme.getSecondaryTextColor(context),
                                  ),
                                ),
                                Text(
                                  widget.userName,
                                  style: GoogleFonts.figtree(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color:
                                        AppTheme.getPrimaryTextColor(context),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // Sınıf
                      Row(
                        children: [
                          Icon(
                            Icons.school_outlined,
                            color: AppTheme.primaryColor,
                            size: 24,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Sınıf',
                                  style: GoogleFonts.figtree(
                                    fontSize: 14,
                                    color:
                                        AppTheme.getSecondaryTextColor(context),
                                  ),
                                ),
                                Text(
                                  '${widget.grade}. Sınıf',
                                  style: GoogleFonts.figtree(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color:
                                        AppTheme.getPrimaryTextColor(context),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // Hedef üniversite
                      Row(
                        children: [
                          Icon(
                            Icons.location_on_outlined,
                            color: AppTheme.primaryColor,
                            size: 24,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Hedef Üniversite',
                                  style: GoogleFonts.figtree(
                                    fontSize: 14,
                                    color:
                                        AppTheme.getSecondaryTextColor(context),
                                  ),
                                ),
                                Text(
                                  widget.targetUniversity,
                                  style: GoogleFonts.figtree(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color:
                                        AppTheme.getPrimaryTextColor(context),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 40),

              // Açıklama
              Animate(
                delay: const Duration(milliseconds: 900),
                effects: const [
                  FadeEffect(duration: Duration(milliseconds: 600))
                ],
                child: Text(
                  'Artık kişiselleştirilmiş öğrenme planını oluşturabiliriz!',
                  style: GoogleFonts.figtree(
                    fontSize: 16,
                    color: AppTheme.getSecondaryTextColor(context),
                  ),
                  textAlign: TextAlign.center,
                ),
              ),

              const Spacer(),

              // Devam et butonu
              Animate(
                delay: const Duration(milliseconds: 1100),
                effects: const [
                  FadeEffect(duration: Duration(milliseconds: 600)),
                  SlideEffect(begin: Offset(0, 0.3), end: Offset.zero)
                ],
                child: SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _proceedToPlan,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 0,
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : Text(
                            'Planımı Oluştur',
                            style: GoogleFonts.figtree(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _proceedToPlan() async {
    setState(() {
      _isLoading = true;
    });

    // Kısa bir gecikme ekleyelim
    await Future.delayed(const Duration(milliseconds: 500));

    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => const UserPlanScreen(),
        ),
      );
    }
  }
}
