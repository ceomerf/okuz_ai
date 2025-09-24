import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/providers.dart';
import '../theme/app_theme.dart';
import '../providers/theme_provider.dart';
import 'parent_register_screen.dart';
import 'login_screen.dart';

class ParentInviteCodeScreen extends ConsumerStatefulWidget {
  const ParentInviteCodeScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<ParentInviteCodeScreen> createState() => _ParentInviteCodeScreenState();
}

class _ParentInviteCodeScreenState extends ConsumerState<ParentInviteCodeScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _inviteCodeController = TextEditingController();

  bool _isLoading = false;
  bool _isValidating = false;
  String? _errorMessage;
  String? _successMessage;

  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

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
    _inviteCodeController.dispose();
    super.dispose();
  }

  Future<void> _validateInviteCode() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isValidating = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final apiClient = ref.read(apiClientProvider);
      final response =
          await apiClient.validateInviteCode(_inviteCodeController.text.trim());

      if (response['success'] == true) {
        setState(() {
          _successMessage = 'Davet kodu geçerli! Kayıt bilgilerinizi girin.';
        });

        // 2 saniye sonra kayıt ekranına yönlendir
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) => ParentRegisterScreen(
                  inviteCode: _inviteCodeController.text.trim(),
                  studentInfo: response['studentInfo'],
                ),
              ),
            );
          }
        });
      } else {
        setState(() {
          _errorMessage = response['message'] ?? 'Davet kodu geçersiz';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Bağlantı hatası: $e';
      });
    } finally {
      setState(() {
        _isValidating = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer(builder: (context, ref, _) {
      final isDark = ref.watch(appThemeNotifierProvider).isDarkMode;
      return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
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
          'Veli Kayıt',
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
                    const SizedBox(height: 40),

                    // İkon ve Başlık
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
                        Icons.card_giftcard,
                        size: 60,
                        color: Colors.white,
                      ),
                    ),

                    const SizedBox(height: 32),

                    Text(
                      'Davet Kodunuzu Girin',
                      style: GoogleFonts.figtree(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: isDark
                            ? AppTheme.darkTextPrimaryColor
                            : AppTheme.lightTextPrimaryColor,
                      ),
                      textAlign: TextAlign.center,
                    ),

                    const SizedBox(height: 16),

                    Text(
                      'Öğrencinizin size verdiği davet kodunu girerek veli hesabınızı oluşturun.',
                      style: GoogleFonts.figtree(
                        fontSize: 16,
                        color: isDark
                            ? AppTheme.darkTextSecondaryColor
                            : AppTheme.lightTextSecondaryColor,
                        height: 1.5,
                      ),
                      textAlign: TextAlign.center,
                    ),

                    const SizedBox(height: 40),

                    // Davet Kodu Input
                    Container(
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
                      child: TextFormField(
                        controller: _inviteCodeController,
                        style: GoogleFonts.figtree(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? AppTheme.darkTextPrimaryColor
                              : AppTheme.lightTextPrimaryColor,
                        ),
                        textAlign: TextAlign.center,
                        textCapitalization: TextCapitalization.characters,
                        decoration: InputDecoration(
                          hintText: 'ÖRN: ABC123',
                          hintStyle: GoogleFonts.figtree(
                            fontSize: 18,
                            color: isDark
                                ? AppTheme.darkTextSecondaryColor
                                : AppTheme.lightTextSecondaryColor,
                          ),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 20,
                          ),
                          prefixIcon: Icon(
                            Icons.card_giftcard,
                            color: AppTheme.primaryColor,
                            size: 24,
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Davet kodu gerekli';
                          }
                          if (value.trim().length < 6) {
                            return 'Davet kodu en az 6 karakter olmalı';
                          }
                          return null;
                        },
                        onChanged: (value) {
                          // Otomatik büyük harf yap
                          if (value != value.toUpperCase()) {
                            _inviteCodeController.value = TextEditingValue(
                              text: value.toUpperCase(),
                              selection:
                                  TextSelection.collapsed(offset: value.length),
                            );
                          }
                        },
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Hata Mesajı
                    if (_errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border:
                              Border.all(color: Colors.red.withOpacity(0.3)),
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
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Başarı Mesajı
                    if (_successMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.green.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border:
                              Border.all(color: Colors.green.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.check_circle_outline,
                              color: Colors.green,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _successMessage!,
                                style: GoogleFonts.figtree(
                                  fontSize: 14,
                                  color: Colors.green,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Doğrula Butonu
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _isValidating ? null : _validateInviteCode,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: _isValidating
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : Text(
                                'Davet Kodunu Doğrula',
                                style: GoogleFonts.figtree(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Mevcut Veli Girişi
                    _buildExistingParentLogin(isDark),

                    const SizedBox(height: 24),

                    // Bilgi Kartı
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppTheme.primaryColor.withOpacity(0.3),
                        ),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            Icons.info_outline,
                            color: AppTheme.primaryColor,
                            size: 24,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Davet Kodu Hakkında',
                            style: GoogleFonts.figtree(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '• Davet kodları 6-8 karakter uzunluğundadır\n'
                            '• 48 saat geçerlidir\n'
                            '• Tek kullanımlıktır\n'
                            '• Öğrencinizden almanız gerekir',
                            style: GoogleFonts.figtree(
                              fontSize: 14,
                              color: isDark
                                  ? AppTheme.darkTextSecondaryColor
                                  : AppTheme.lightTextSecondaryColor,
                              height: 1.4,
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
        ),
      ),
      );
    });
  }

  Widget _buildExistingParentLogin(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
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
      child: Column(
        children: [
          Icon(
            Icons.login,
            color: AppTheme.primaryColor,
            size: 32,
          ),
          const SizedBox(height: 12),
          Text(
            'Daha önceden kayıt olmuş muydunuz?',
            style: GoogleFonts.figtree(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: isDark
                  ? AppTheme.darkTextPrimaryColor
                  : AppTheme.lightTextPrimaryColor,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Mevcut veli hesabınızla giriş yapın',
            style: GoogleFonts.figtree(
              fontSize: 14,
              color: isDark
                  ? AppTheme.darkTextSecondaryColor
                  : AppTheme.lightTextSecondaryColor,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => const LoginScreen(accountType: 'parent'),
                  ),
                );
              },
              style: OutlinedButton.styleFrom(
                side: BorderSide(
                  color: AppTheme.primaryColor,
                  width: 1.5,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                backgroundColor: AppTheme.primaryColor.withOpacity(0.05),
              ),
              child: Text(
                'Veli Girişi Yap',
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primaryColor,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
