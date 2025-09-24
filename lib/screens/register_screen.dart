import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/production_auth_service.dart';
import '../services/providers.dart';
import '../theme/app_theme.dart';
import '../models/account_type.dart';
import 'onboarding_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'family_portal_screen.dart';
import 'login_screen.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  final String accountType;

  const RegisterScreen({
    Key? key,
    required this.accountType,
  }) : super(key: key);

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _agreeToTerms = false;
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
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_agreeToTerms) {
      setState(() {
        _errorMessage = 'Kullanım şartlarını kabul etmelisiniz';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authService = ref.read(authServiceProvider);
      final accountType = widget.accountType == 'parent' ? 'PARENT' : 'STUDENT';

      print('🔍 Register Debug:');
      print('   Seçilen hesap tipi: $accountType');

      final result = await authService.register(
        _emailController.text.trim(),
        _passwordController.text,
        _nameController.text.trim(),
        accountType,
      );

      if (result['success'] == true) {
        // Hesap tipini kaydet
        final prefs = await SharedPreferences.getInstance();
        final isParentAccount = accountType == 'PARENT';
        await prefs.setBool('is_parent_account', isParentAccount);

        if (isParentAccount) {
          // Veli hesabı için onboarding'i tamamlanmış say
          await prefs.setBool('onboarding_completed', true);
          await prefs.setString('user_role', 'PARENT');

          // Veli hesabı ise Family Portal'a yönlendir
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (context) => const FamilyPortalScreen()),
            (route) => false,
          );
        } else {
          // Öğrenci hesabı için onboarding durumunu kontrol et
          await prefs.setString('user_role', 'STUDENT');
          await prefs.setBool('onboarding_completed', false);

          // Öğrenci hesabı ise Onboarding'e yönlendir
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(
              builder: (context) => OnboardingScreen(
                isStudentAccount: true,
                initialAccountType: AccountType.student,
              ),
            ),
            (route) => false,
          );
        }
      } else {
        setState(() {
          _errorMessage = result['message'] ?? 'Kayıt başarısız';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Kayıt hatası: $e';
      });
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

    return Scaffold(
      backgroundColor:
          isDark ? const Color(0xFF0F0F0F) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark
            ? AppTheme.darkBackgroundColor
            : AppTheme.lightBackgroundColor,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Text(
          widget.accountType == 'student' ? 'Öğrenci Kayıt' : 'Veli Kayıt',
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
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: SlideTransition(
            position: _slideAnimation,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 20),
                    _buildHeader(isDark),
                    const SizedBox(height: 40),
                    _buildRegisterForm(isDark),
                    const SizedBox(height: 24),
                    if (_errorMessage != null) ...[
                      _buildErrorMessage(),
                      const SizedBox(height: 24),
                    ],
                    _buildRegisterButton(isDark),
                    const SizedBox(height: 24),
                    _buildBottomSection(),
                    const SizedBox(height: 40),
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
          widget.accountType == 'student' ? 'Öğrenci Kayıt' : 'Veli Kayıt',
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
              ? 'Hesabınızı oluşturun'
              : 'Hesabınızı oluşturun',
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

  Widget _buildRegisterForm(bool isDark) {
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
      child: Column(
        children: [
          // Form Açıklaması
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.primaryColor.withOpacity(0.3),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline,
                  color: AppTheme.primaryColor,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Lütfen bilgilerinizi doğru alanlara girin',
                    style: GoogleFonts.figtree(
                      fontSize: 14,
                      color: AppTheme.primaryColor,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          // Ad Soyad Input
          TextFormField(
            controller: _nameController,
            style: GoogleFonts.figtree(
              fontSize: 16,
              color: isDark
                  ? AppTheme.darkTextPrimaryColor
                  : AppTheme.lightTextPrimaryColor,
            ),
            decoration: InputDecoration(
              labelText: 'Ad Soyad *',
              hintText: 'Adınızı ve soyadınızı girin',
              labelStyle: GoogleFonts.figtree(
                fontSize: 14,
                color: isDark
                    ? AppTheme.darkTextSecondaryColor
                    : AppTheme.lightTextSecondaryColor,
              ),
              prefixIcon: Icon(
                Icons.person,
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
                return 'Ad soyad gerekli';
              }
              return null;
            },
          ),
          const SizedBox(height: 20),
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
              labelText: 'E-posta Adresi *',
              hintText: 'ornek@email.com',
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
                return 'E-posta adresi gerekli';
              }
              if (!RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
                  .hasMatch(value.trim())) {
                return 'Geçerli bir e-posta adresi girin (örn: kullanici@email.com)';
              }
              return null;
            },
          ),
          const SizedBox(height: 20),
          // Şifre Input
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
              labelText: 'Şifre *',
              hintText: 'En az 6 karakter',
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
              if (value.length < 6) {
                return 'Şifre en az 6 karakter olmalı';
              }
              return null;
            },
          ),
          const SizedBox(height: 20),
          // Şifre Tekrar Input
          TextFormField(
            controller: _confirmPasswordController,
            obscureText: _obscureConfirmPassword,
            style: GoogleFonts.figtree(
              fontSize: 16,
              color: isDark
                  ? AppTheme.darkTextPrimaryColor
                  : AppTheme.lightTextPrimaryColor,
            ),
            decoration: InputDecoration(
              labelText: 'Şifre Tekrar *',
              hintText: 'Şifrenizi tekrar girin',
              labelStyle: GoogleFonts.figtree(
                fontSize: 14,
                color: isDark
                    ? AppTheme.darkTextSecondaryColor
                    : AppTheme.lightTextSecondaryColor,
              ),
              prefixIcon: Icon(
                Icons.lock_outline,
                color: AppTheme.primaryColor,
                size: 20,
              ),
              suffixIcon: IconButton(
                onPressed: () {
                  setState(() {
                    _obscureConfirmPassword = !_obscureConfirmPassword;
                  });
                },
                icon: Icon(
                  _obscureConfirmPassword
                      ? Icons.visibility
                      : Icons.visibility_off,
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
                return 'Şifre tekrarı gerekli';
              }
              if (value != _passwordController.text) {
                return 'Şifreler eşleşmiyor';
              }
              return null;
            },
          ),
          const SizedBox(height: 20),
          // Kullanım Şartları
          _buildTermsCheckbox(isDark),
        ],
      ),
    );
  }

  Widget _buildTermsCheckbox(bool isDark) {
    return Row(
      children: [
        Checkbox(
          value: _agreeToTerms,
          onChanged: (value) {
            setState(() {
              _agreeToTerms = value ?? false;
            });
          },
          activeColor: AppTheme.primaryColor,
        ),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: isDark
                    ? AppTheme.darkTextSecondaryColor
                    : AppTheme.lightTextSecondaryColor,
              ),
              children: [
                const TextSpan(text: 'Kullanım şartlarını ve '),
                TextSpan(
                  text: 'Gizlilik Politikası\'nı',
                  style: GoogleFonts.figtree(
                    color: AppTheme.primaryColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const TextSpan(text: ' kabul ediyorum'),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRegisterButton(bool isDark) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _register,
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
                'Kayıt Ol',
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

  Widget _buildBottomSection() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        TextButton(
          onPressed: () {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) => LoginScreen(
                  accountType: widget.accountType,
                ),
              ),
            );
          },
          child: Text(
            'Zaten hesabım var, giriş yap',
            style: GoogleFonts.figtree(
              fontWeight: FontWeight.w600,
              color: AppTheme.primaryColor,
            ),
          ),
        ),
      ],
    );
  }
}
