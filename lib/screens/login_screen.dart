import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../services/production_auth_service.dart';
import '../theme/app_theme.dart';
import 'register_screen.dart';
import 'onboarding_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

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
  }

  @override
  void dispose() {
    _animationController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authService = context.read<ProductionAuthService>();
      final result = await authService.login(
        _emailController.text.trim(),
        _passwordController.text,
      );

      if (mounted) {
        if (result['success'] == true) {
          // Başarılı giriş - Onboarding'e yönlendir
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => const OnboardingScreen()),
          );
        } else {
          setState(() {
            _errorMessage = result['message'] ?? 'Giriş başarısız';
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Bir hata oluştu: $e';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loginWithGoogle() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authService = context.read<ProductionAuthService>();
      final result = await authService.loginWithGoogle();

      if (mounted) {
        if (result['success'] == true) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => const OnboardingScreen()),
          );
        } else {
          setState(() {
            _errorMessage = result['message'] ?? 'Google ile giriş başarısız';
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Google ile giriş hatası: $e';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: AppTheme.getBackgroundColor(context),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Container(
            height: size.height - MediaQuery.of(context).padding.top,
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: SlideTransition(
                position: _slideAnimation,
                child: Column(
                  children: [
                    const SizedBox(height: 60),

                    // Logo ve Başlık
                    _buildHeader(isDark),
                    const SizedBox(height: 60),

                    // Giriş Formu
                    _buildLoginForm(isDark),
                    const SizedBox(height: 30),

                    // Giriş Butonu
                    _buildLoginButton(isDark),
                    const SizedBox(height: 20),

                    // Hata Mesajı
                    if (_errorMessage != null) _buildErrorMessage(),

                    const SizedBox(height: 30),

                    // Ayırıcı
                    _buildDivider(isDark),
                    const SizedBox(height: 30),

                    // Google ile Giriş
                    _buildGoogleLoginButton(isDark),
                    const Spacer(),

                    // Kayıt Ol Linki
                    _buildRegisterLink(isDark),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
          ),
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
                AppTheme.primaryColor.withValues(alpha: 0.8),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(30),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primaryColor.withValues(alpha: 0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: const Icon(
            Icons.school,
            size: 60,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 24),

        // Başlık
        Text(
          'Okuz AI\'ya Hoş Geldiniz',
          style: GoogleFonts.figtree(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: isDark
                ? AppTheme.darkTextPrimaryColor
                : AppTheme.lightTextPrimaryColor,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),

        // Alt başlık
        Text(
          'Akıllı çalışma asistanınızla tanışın',
          style: GoogleFonts.figtree(
            fontSize: 16,
            color: isDark
                ? AppTheme.darkTextSecondaryColor
                : AppTheme.lightTextSecondaryColor,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildLoginForm(bool isDark) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          // Email Alanı
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              style: GoogleFonts.figtree(
                fontSize: 16,
                color: isDark
                    ? AppTheme.darkTextPrimaryColor
                    : AppTheme.lightTextPrimaryColor,
              ),
              decoration: InputDecoration(
                hintText: 'E-posta adresiniz',
                hintStyle: GoogleFonts.figtree(
                  color: isDark
                      ? AppTheme.darkTextSecondaryColor
                      : AppTheme.lightTextSecondaryColor,
                ),
                prefixIcon: Icon(
                  Icons.email_outlined,
                  color: AppTheme.primaryColor,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.transparent,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'E-posta adresi gerekli';
                }
                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                    .hasMatch(value)) {
                  return 'Geçerli bir e-posta adresi girin';
                }
                return null;
              },
            ),
          ),
          const SizedBox(height: 16),

          // Şifre Alanı
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: TextFormField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              style: GoogleFonts.figtree(
                fontSize: 16,
                color: isDark
                    ? AppTheme.darkTextPrimaryColor
                    : AppTheme.lightTextPrimaryColor,
              ),
              decoration: InputDecoration(
                hintText: 'Şifreniz',
                hintStyle: GoogleFonts.figtree(
                  color: isDark
                      ? AppTheme.darkTextSecondaryColor
                      : AppTheme.lightTextSecondaryColor,
                ),
                prefixIcon: Icon(
                  Icons.lock_outlined,
                  color: AppTheme.primaryColor,
                ),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword ? Icons.visibility_off : Icons.visibility,
                    color: AppTheme.primaryColor,
                  ),
                  onPressed: () {
                    setState(() {
                      _obscurePassword = !_obscurePassword;
                    });
                  },
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.transparent,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Şifre gerekli';
                }
                if (value.length < 6) {
                  return 'Şifre en az 6 karakter olmalı';
                }
                return null;
              },
            ),
          ),
          const SizedBox(height: 16),

          // Beni Hatırla ve Şifremi Unuttum
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
                  // Şifremi unuttum sayfasına git
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

  Widget _buildErrorMessage() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
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

  Widget _buildGoogleLoginButton(bool isDark) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: OutlinedButton.icon(
        onPressed: _isLoading ? null : _loginWithGoogle,
        icon: Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),
            gradient: LinearGradient(
              colors: [
                Colors.red.shade400,
                Colors.blue.shade400,
                Colors.green.shade400,
                Colors.yellow.shade400,
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: const Icon(
            Icons.g_mobiledata,
            color: Colors.white,
            size: 20,
          ),
        ),
        label: Text(
          'Google ile Giriş Yap',
          style: GoogleFonts.figtree(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: isDark
                ? AppTheme.darkTextPrimaryColor
                : AppTheme.lightTextPrimaryColor,
          ),
        ),
        style: OutlinedButton.styleFrom(
          side: BorderSide(
            color:
                isDark ? AppTheme.darkDividerColor : AppTheme.lightDividerColor,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }

  Widget _buildRegisterLink(bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'Hesabınız yok mu? ',
          style: GoogleFonts.figtree(
            fontSize: 14,
            color: isDark
                ? AppTheme.darkTextSecondaryColor
                : AppTheme.lightTextSecondaryColor,
          ),
        ),
        TextButton(
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (context) => const RegisterScreen()),
            );
          },
          child: Text(
            'Kayıt Ol',
            style: GoogleFonts.figtree(
              fontSize: 14,
              color: AppTheme.primaryColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
