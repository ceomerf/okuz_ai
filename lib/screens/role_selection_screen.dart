import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';
import '../services/family_account_service.dart';
import '../models/student_profile.dart';
import '../models/account_type.dart';
import 'onboarding_screen.dart';
import 'parent_info_screen.dart';

/// Rol Seçimi Ekranı - Kullanıcı öğrenci mi veli mi olduğunu seçer
class RoleSelectionScreen extends StatefulWidget {
  const RoleSelectionScreen({Key? key}) : super(key: key);

  @override
  State<RoleSelectionScreen> createState() => _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends State<RoleSelectionScreen> {
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              const Color(0xFFE3F2FD), // blue.shade50
              const Color(0xFFF3E5F5), // purple.shade50
              const Color(0xFFFCE4EC), // pink.shade50
            ],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              children: [
                const SizedBox(height: 40),

                // Başlık ve açıklama
                _buildHeader()
                    .animate()
                    .fadeIn(duration: 600.ms)
                    .slideY(begin: -0.3),

                const SizedBox(height: 60),

                // Rol seçim kartları
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Öğrenci kartı
                      _buildRoleCard(
                        title: "Öğrenciyim",
                        description:
                            "Kendi planımı oluşturmak ve hedeflerime ulaşmak için buradayım.",
                        icon: Icons.school,
                        color: Colors.blue,
                        onTap: () => _selectRole(AccountType.student),
                      )
                          .animate(delay: 200.ms)
                          .fadeIn(duration: 600.ms)
                          .slideX(begin: -0.3),

                      const SizedBox(height: 24),

                      // Veli kartı
                      _buildRoleCard(
                        title: "Veliyim",
                        description:
                            "Çocuğumun akademik yolculuğunu desteklemek ve gelişimini takip etmek için buradayım.",
                        icon: Icons.family_restroom,
                        color: Colors.purple,
                        onTap: () => _selectRole(AccountType.parent),
                      )
                          .animate(delay: 400.ms)
                          .fadeIn(duration: 600.ms)
                          .slideX(begin: 0.3),
                    ],
                  ),
                ),

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Colors.blue.shade400, Colors.purple.shade400],
            ),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Colors.blue.withValues(alpha: 0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: const Icon(
            Icons.person_outline,
            size: 40,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Hesap Türünü Seçin',
          style: GoogleFonts.poppins(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: Colors.grey.shade800,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Size en uygun deneyimi sunabilmemiz için\nhesap türünüzü belirleyin',
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            fontSize: 16,
            color: Colors.grey.shade600,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _buildRoleCard({
    required String title,
    required String description,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Container(
      width: double.infinity,
      height: 160,
      child: Card(
        elevation: 8,
        shadowColor: color.withValues(alpha: 0.3),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        child: InkWell(
          onTap: _isLoading ? null : onTap,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  color.withValues(alpha: 0.1),
                  color.withValues(alpha: 0.05),
                ],
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Row(
                children: [
                  // İkon
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: color.withValues(alpha: 0.3),
                        width: 2,
                      ),
                    ),
                    child: Icon(
                      icon,
                      size: 30,
                      color: color.withValues(alpha: 0.8),
                    ),
                  ),

                  const SizedBox(width: 20),

                  // Metin içeriği
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          title,
                          style: GoogleFonts.poppins(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: color.withValues(alpha: 0.8),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          description,
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            color: Colors.grey.shade600,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Ok işareti
                  Icon(
                    Icons.arrow_forward_ios,
                    color: color.withValues(alpha: 0.7),
                    size: 20,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _selectRole(AccountType accountType) async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final familyService =
          Provider.of<FamilyAccountService>(context, listen: false);

      // Hesap tipini Firestore'a kaydet
      await familyService.updateAccountType(accountType);

      // SharedPreferences'a hesap tipini kaydet
      final prefs = await SharedPreferences.getInstance();

      if (accountType == AccountType.parent) {
        await prefs.setBool('is_parent_account', true);
        await prefs.setBool('is_student_account', false);
        // Veli hesabı için onboarding'i tamamlanmış say
        await prefs.setBool('onboarding_completed', true);
        debugPrint('✅ Veli hesabı ayarları kaydedildi');
      } else {
        await prefs.setBool('is_parent_account', false);
        await prefs.setBool('is_student_account', true);
        await prefs.setBool('onboarding_completed', false);
        debugPrint('✅ Öğrenci hesabı ayarları kaydedildi');
      }

      if (mounted) {
        if (accountType == AccountType.student) {
          // Öğrenci onboarding akışına yönlendir
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => const OnboardingScreen(),
            ),
          );
        } else {
          // Veli bilgi ekranına yönlendir
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => const ParentInfoScreen(),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Bir hata oluştu: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }
}
