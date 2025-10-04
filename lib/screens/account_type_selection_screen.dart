import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_theme.dart';
import '../providers/theme_provider.dart';
import 'login_screen.dart';
import 'parent_invite_code_screen.dart';

class AccountTypeSelectionScreen extends StatefulWidget {
  const AccountTypeSelectionScreen({Key? key}) : super(key: key);

  @override
  State<AccountTypeSelectionScreen> createState() =>
      _AccountTypeSelectionScreenState();
}

class _AccountTypeSelectionScreenState extends State<AccountTypeSelectionScreen>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOut,
    ));

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutCubic,
    ));

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _selectAccountType(String type) {
    if (type == 'student') {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => const LoginScreen(accountType: 'student'),
        ),
      );
    } else {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => const ParentInviteCodeScreen(),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer(builder: (context, ref, _) {
      final isDark = ref.watch(appThemeNotifierProvider).isDarkMode;
      return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            // Background gradient
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: isDark
                      ? [
                          AppTheme.darkBackgroundColor,
                          AppTheme.darkBackgroundColor.withOpacity(0.8),
                        ]
                      : [
                          AppTheme.lightBackgroundColor,
                          AppTheme.lightBackgroundColor.withOpacity(0.8),
                        ],
                ),
              ),
            ),

            // Content
            FadeTransition(
              opacity: _fadeAnimation,
              child: SlideTransition(
                position: _slideAnimation,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 60),

                      // Logo ve Başlık
                      Container(
                        width: 140,
                        height: 140,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              AppTheme.primaryColor,
                              AppTheme.primaryColor.withOpacity(0.8),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(35),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primaryColor.withOpacity(0.3),
                              blurRadius: 25,
                              offset: const Offset(0, 15),
                            ),
                          ],
                        ),
                        child: Icon(
                          Icons.school,
                          size: 70,
                          color: Colors.white,
                        ),
                      ),

                      const SizedBox(height: 40),

                      Text(
                        'Öküz AI',
                        style: GoogleFonts.figtree(
                          fontSize: 36,
                          fontWeight: FontWeight.w800,
                          color: isDark
                              ? AppTheme.darkTextPrimaryColor
                              : AppTheme.lightTextPrimaryColor,
                        ),
                        textAlign: TextAlign.center,
                      ),

                      const SizedBox(height: 8),

                      Text(
                        'Akıllı Öğrenme Asistanı',
                        style: GoogleFonts.figtree(
                          fontSize: 18,
                          color: isDark
                              ? AppTheme.darkTextSecondaryColor
                              : AppTheme.lightTextSecondaryColor,
                        ),
                        textAlign: TextAlign.center,
                      ),

                      const SizedBox(height: 60),

                      Text(
                        'Hesap Tipinizi Seçin',
                        style: GoogleFonts.figtree(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: isDark
                              ? AppTheme.darkTextPrimaryColor
                              : AppTheme.lightTextPrimaryColor,
                        ),
                        textAlign: TextAlign.center,
                      ),

                      const SizedBox(height: 40),

                      // Öğrenci Seçeneği
                      _buildAccountTypeCard(
                        title: 'Öğrenci',
                        subtitle: 'Kendi hesabınızla giriş yapın',
                        icon: Icons.school,
                        color: AppTheme.primaryColor,
                        onTap: () => _selectAccountType('student'),
                        isDark: isDark,
                      ),

                      const SizedBox(height: 20),

                      // Veli Seçeneği
                      _buildAccountTypeCard(
                        title: 'Veli',
                        subtitle: 'Davet kodu ile bağlanın',
                        icon: Icons.family_restroom,
                        color: Colors.green,
                        onTap: () => _selectAccountType('parent'),
                        isDark: isDark,
                      ),

                      const SizedBox(height: 40),

                      // Bilgi Kartı
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppTheme.darkCardColor
                              : AppTheme.lightCardColor,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            Icon(
                              Icons.info_outline,
                              color: AppTheme.primaryColor,
                              size: 28,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Nasıl Çalışır?',
                              style: GoogleFonts.figtree(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: isDark
                                    ? AppTheme.darkTextPrimaryColor
                                    : AppTheme.lightTextPrimaryColor,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '• Öğrenciler kendi hesabını oluşturur\n'
                              '• Veliler öğrencinin davet kodu ile bağlanır\n'
                              '• Maksimum 2 veli öğrenciye bağlanabilir',
                              style: GoogleFonts.figtree(
                                fontSize: 14,
                                color: isDark
                                    ? AppTheme.darkTextSecondaryColor
                                    : AppTheme.lightTextSecondaryColor,
                                height: 1.5,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ),

            // Tema değiştirme butonu
            Positioned(
              top: 16,
              right: 16,
              child: Container(
                decoration: BoxDecoration(
                  color:
                      isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: IconButton(
                  onPressed: () {
                    ref.read(appThemeNotifierProvider.notifier).toggleTheme();
                  },
                  icon: Icon(
                    isDark ? Icons.light_mode : Icons.dark_mode,
                    color: AppTheme.primaryColor,
                    size: 24,
                  ),
                  tooltip: isDark ? 'Açık temaya geç' : 'Koyu temaya geç',
                ),
              ),
            ),
          ],
        ),
      ),
    );
    });
  }

  Widget _buildAccountTypeCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 15,
              offset: const Offset(0, 8),
            ),
          ],
          border: Border.all(
            color: color.withOpacity(0.2),
            width: 2,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                icon,
                color: color,
                size: 28,
              ),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.figtree(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: isDark
                          ? AppTheme.darkTextPrimaryColor
                          : AppTheme.lightTextPrimaryColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: GoogleFonts.figtree(
                      fontSize: 14,
                      color: isDark
                          ? AppTheme.darkTextSecondaryColor
                          : AppTheme.lightTextSecondaryColor,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios,
              color: color,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
