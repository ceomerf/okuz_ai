import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/production_auth_service.dart';
import '../theme/app_theme.dart';
import '../providers/theme_provider.dart';
import '../services/providers.dart';
import '../models/account_type.dart';
import 'onboarding_screen.dart';
import 'student_dashboard_screen.dart';
import 'family_portal_screen.dart';
import 'register_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  final String accountType;

  const LoginScreen({
    Key? key,
    required this.accountType,
  }) : super(key: key);

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  // Google Sign In kaldırıldı - kendi authentication sistemimizi kullanıyoruz

  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _rememberMe = false;
  String? _errorMessage;

  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1200),
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
    _loadRememberMeState();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // Beni Hatırla durumunu yükle
  Future<void> _loadRememberMeState() async {
    final prefs = await SharedPreferences.getInstance();
    final rememberedEmail = prefs.getString('remembered_email');
    final rememberMe = prefs.getBool('remember_me') ?? false;

    if (mounted) {
      setState(() {
        _rememberMe = rememberMe;
        if (rememberedEmail != null && rememberMe) {
          _emailController.text = rememberedEmail;
        }
      });
    }
  }

  // Beni Hatırla durumunu kaydet
  Future<void> _saveRememberMeState() async {
    final prefs = await SharedPreferences.getInstance();
    if (_rememberMe) {
      await prefs.setString('remembered_email', _emailController.text.trim());
      await prefs.setBool('remember_me', true);
    } else {
      await prefs.remove('remembered_email');
      await prefs.setBool('remember_me', false);
    }
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await _saveRememberMeState();

      final authService = ref.read(authServiceProvider);
      final result = await authService.login(
        _emailController.text.trim(),
        _passwordController.text,
      );

      if (result['success'] == true) {
        // Backend'den gelen kullanıcı rolünü kontrol et
        final userRole = result['user']['role'];
        final expectedRole =
            widget.accountType == 'student' ? 'STUDENT' : 'PARENT';

        if (userRole != expectedRole) {
          setState(() {
            _errorMessage =
                'Bu hesap ${expectedRole == 'STUDENT' ? 'öğrenci' : 'veli'} hesabı değil.';
          });
          return;
        }

        // Hesap tipini kaydet
        final prefs = await SharedPreferences.getInstance();
        final isParentAccount = userRole == 'PARENT';
        await prefs.setBool('is_parent_account', isParentAccount);

        // Başarılı giriş - Onboarding durumunu kontrol et
        final onboardingCompleted =
            prefs.getBool('onboarding_completed') ?? false;

        if (isParentAccount) {
          // Veli hesabı ise Family Portal'a yönlendir
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => const FamilyPortalScreen()),
          );
        } else if (!onboardingCompleted) {
          // Öğrenci hesabı ve onboarding tamamlanmamışsa onboarding'e yönlendir
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => OnboardingScreen(
                isStudentAccount: true,
                initialAccountType: AccountType.student,
              ),
            ),
          );
        } else {
          // Öğrenci hesabı ve onboarding tamamlanmışsa Student Dashboard'a yönlendir
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
                builder: (context) => const StudentDashboardScreen()),
          );
        }
      } else {
        setState(() {
          _errorMessage = result['message'] ?? 'Giriş başarısız';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Giriş hatası: $e';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  // Google Sign In metodu kaldırıldı - kendi authentication sistemimizi kullanıyoruz

  @override
  Widget build(BuildContext context) {
    final isDark = ref.watch(appThemeNotifierProvider).isDarkMode;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: isDark
            ? AppTheme.darkBackgroundColor
            : AppTheme.lightBackgroundColor,
        elevation: 0,
        automaticallyImplyLeading: false,
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: Icon(
            Icons.arrow_back_ios,
            color: isDark
                ? AppTheme.darkTextPrimaryColor
                : AppTheme.lightTextPrimaryColor,
          ),
        ),
        title: Text(
          widget.accountType == 'student' ? 'Öğrenci Girişi' : 'Veli Girişi',
          style: GoogleFonts.figtree(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: isDark
                ? AppTheme.darkTextPrimaryColor
                : AppTheme.lightTextPrimaryColor,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Stack(
          children: [
            NotificationListener<OverscrollIndicatorNotification>(
              onNotification: (overscroll) {
                overscroll.disallowIndicator();
                return true;
              },
              child: ScrollConfiguration(
                behavior: const _NoGlowBehavior(),
                child: SingleChildScrollView(
                  physics: const ClampingScrollPhysics(),
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(height: 20),
                      _buildHeader(isDark),
                      const SizedBox(height: 40),
                      _buildLoginForm(isDark),
                      const SizedBox(height: 24),
                      if (_errorMessage != null) ...[
                        _buildErrorMessage(),
                        const SizedBox(height: 24),
                      ],
                      _buildLoginButton(isDark),
                      const SizedBox(height: 24),
                      // Sadece öğrenci hesapları için kayıt ol butonu göster
                      if (widget.accountType == 'student') ...[
                        _buildRegisterButton(isDark),
                        const SizedBox(height: 24),
                      ],
                    ],
                  ),
                ),
              ),
            ),
            // Tema değiştirme butonu - Sağ üst köşe
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
  }

  Widget _buildHeader(bool isDark) {
    return Column(
      children: [
        // Logo
        Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppTheme.primaryColor,
                AppTheme.primaryColor.withOpacity(0.8),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(30),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primaryColor.withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Icon(
            widget.accountType == 'student'
                ? Icons.school
                : Icons.family_restroom,
            size: 60,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 24),
        Text(
          widget.accountType == 'student' ? 'Öğrenci Hesabı' : 'Veli Hesabı',
          style: GoogleFonts.figtree(
            fontSize: 28,
            fontWeight: FontWeight.w700,
            color: isDark
                ? AppTheme.darkTextPrimaryColor
                : AppTheme.lightTextPrimaryColor,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          widget.accountType == 'student'
              ? 'Hesabınıza giriş yapın'
              : 'Hesabınıza giriş yapın',
          style: GoogleFonts.figtree(
            fontSize: 16,
            color: isDark
                ? AppTheme.darkTextSecondaryColor
                : AppTheme.lightTextSecondaryColor,
          ),
        ),
      ],
    );
  }

  Widget _buildLoginForm(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          children: [
            // Email Input
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              style: GoogleFonts.figtree(
                fontSize: 16,
                color: isDark
                    ? AppTheme.darkTextPrimaryColor
                    : AppTheme.lightTextPrimaryColor,
              ),
              decoration: InputDecoration(
                labelText: 'E-posta',
                labelStyle: GoogleFonts.figtree(
                  fontSize: 14,
                  color: isDark
                      ? AppTheme.darkTextSecondaryColor
                      : AppTheme.lightTextSecondaryColor,
                ),
                prefixIcon: Icon(
                  Icons.email,
                  color: AppTheme.primaryColor,
                  size: 20,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDark
                        ? AppTheme.darkDividerColor
                        : AppTheme.lightDividerColor,
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDark
                        ? AppTheme.darkDividerColor
                        : AppTheme.lightDividerColor,
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: AppTheme.primaryColor,
                    width: 2,
                  ),
                ),
                filled: true,
                fillColor: isDark
                    ? AppTheme.darkBackgroundColor
                    : AppTheme.lightBackgroundColor,
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'E-posta gerekli';
                }
                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                    .hasMatch(value)) {
                  return 'Geçerli bir e-posta adresi girin';
                }
                return null;
              },
            ),
            const SizedBox(height: 20),
            // Password Input
            TextFormField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              style: GoogleFonts.figtree(
                fontSize: 16,
                color: isDark
                    ? AppTheme.darkTextPrimaryColor
                    : AppTheme.lightTextPrimaryColor,
              ),
              decoration: InputDecoration(
                labelText: 'Şifre',
                labelStyle: GoogleFonts.figtree(
                  fontSize: 14,
                  color: isDark
                      ? AppTheme.darkTextSecondaryColor
                      : AppTheme.lightTextSecondaryColor,
                ),
                prefixIcon: Icon(
                  Icons.lock,
                  color: AppTheme.primaryColor,
                  size: 20,
                ),
                suffixIcon: IconButton(
                  onPressed: () {
                    setState(() {
                      _obscurePassword = !_obscurePassword;
                    });
                  },
                  icon: Icon(
                    _obscurePassword ? Icons.visibility : Icons.visibility_off,
                    color: isDark
                        ? AppTheme.darkTextSecondaryColor
                        : AppTheme.lightTextSecondaryColor,
                  ),
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDark
                        ? AppTheme.darkDividerColor
                        : AppTheme.lightDividerColor,
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: isDark
                        ? AppTheme.darkDividerColor
                        : AppTheme.lightDividerColor,
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(
                    color: AppTheme.primaryColor,
                    width: 2,
                  ),
                ),
                filled: true,
                fillColor: isDark
                    ? AppTheme.darkBackgroundColor
                    : AppTheme.lightBackgroundColor,
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Şifre gerekli';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            // Remember Me & Forgot Password
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Checkbox(
                      value: _rememberMe,
                      onChanged: (value) {
                        setState(() {
                          _rememberMe = value ?? false;
                        });
                      },
                      activeColor: AppTheme.primaryColor,
                    ),
                    Text(
                      'Beni hatırla',
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        color: isDark
                            ? AppTheme.darkTextSecondaryColor
                            : AppTheme.lightTextSecondaryColor,
                      ),
                    ),
                  ],
                ),
                TextButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content:
                            Text('Şifremi unuttum özelliği yakında eklenecek'),
                        backgroundColor: AppTheme.primaryColor,
                      ),
                    );
                  },
                  child: Text(
                    'Şifremi unuttum',
                    style: GoogleFonts.figtree(
                      fontSize: 14,
                      color: AppTheme.primaryColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoginButton(bool isDark) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _login,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2,
                ),
              )
            : Text(
                'Giriş Yap',
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }

  Widget _buildRegisterButton(bool isDark) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.green.withOpacity(0.3),
        ),
      ),
      child: TextButton.icon(
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) =>
                  RegisterScreen(accountType: widget.accountType),
            ),
          );
        },
        icon: Icon(
          Icons.person_add,
          color: Colors.green,
        ),
        label: Text(
          'Hesap Oluştur',
          style: GoogleFonts.figtree(
            fontWeight: FontWeight.w600,
            color: Colors.green,
            fontSize: 16,
          ),
        ),
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }

  Widget _buildErrorMessage() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(
            Icons.error_outline,
            color: Colors.red,
            size: 20,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _errorMessage!,
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: Colors.red,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider(bool isDark) {
    return Row(
      children: [
        Expanded(
          child: Container(
            height: 1,
            color:
                isDark ? AppTheme.darkDividerColor : AppTheme.lightDividerColor,
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'veya',
            style: GoogleFonts.figtree(
              fontSize: 14,
              color: isDark
                  ? AppTheme.darkTextSecondaryColor
                  : AppTheme.lightTextSecondaryColor,
            ),
          ),
        ),
        Expanded(
          child: Container(
            height: 1,
            color:
                isDark ? AppTheme.darkDividerColor : AppTheme.lightDividerColor,
          ),
        ),
      ],
    );
  }

  // Google Sign In butonu kaldırıldı - kendi authentication sistemimizi kullanıyoruz

}

class _NoGlowBehavior extends ScrollBehavior {
  const _NoGlowBehavior();

  @override
  Widget buildOverscrollIndicator(
    BuildContext context,
    Widget child,
    ScrollableDetails details,
  ) {
    return child;
  }
}
