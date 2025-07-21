import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:okuz_ai/screens/onboarding_screen.dart';
import 'package:okuz_ai/screens/plan_display_screen.dart';
import 'package:okuz_ai/services/plan_service.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/auth_service.dart';
import '../providers/loading_provider.dart';
import '../services/error_handler.dart';
import '../screens/profile_selection_screen.dart';
import 'role_selection_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isLoading = false;
  bool _isLogin = true; // true = login, false = register
  bool _isPasswordVisible = false;

  final PlanService _planService = PlanService();

  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _toggleTheme() async {
    final themeProvider = Provider.of<ThemeProvider>(context, listen: false);
    await themeProvider.toggleTheme();
  }

  void _toggleAuthMode() {
    setState(() {
      _isLogin = !_isLogin;
    });
  }

  Future<void> _signInWithGoogle() async {
    final loadingProvider =
        Provider.of<LoadingProvider>(context, listen: false);
    loadingProvider.setLoading('google_login',
        message: 'Google ile giriş yapılıyor...');

    try {
      // Google ile giriş işlemi artık doğrudan backend'e gönderilecek
      final authService = Provider.of<AuthService>(context, listen: false);

      // Backend'e Google ile giriş yap
      final response = await authService.loginWithGoogle();

      // Kullanıcı bilgilerini kontrol et
      await _checkUserAndRedirect(response);

      loadingProvider.setLoaded('google_login');
    } catch (e) {
      // Hata durumunu yönet
      final errorHandler = Provider.of<ErrorHandler>(context, listen: false);
      final errorMessage = errorHandler.getUserFriendlyMessage(e);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: Colors.red,
        ),
      );

      loadingProvider.setError('google_login', e);
    }
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final loadingProvider =
        Provider.of<LoadingProvider>(context, listen: false);
    final authService = Provider.of<AuthService>(context, listen: false);
    final errorHandler = Provider.of<ErrorHandler>(context, listen: false);

    loadingProvider.setLoading(
      'auth_form',
      message: _isLogin ? 'Giriş yapılıyor...' : 'Kayıt olunuyor...',
    );

    try {
      Map<String, dynamic> response;

      if (_isLogin) {
        // Backend'e giriş yap
        response = await authService.login(
          _emailController.text,
          _passwordController.text,
        );
      } else {
        // Şifre kontrolü
        if (_passwordController.text != _confirmPasswordController.text) {
          loadingProvider.setError('auth_form', 'Şifreler eşleşmiyor');
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Şifreler eşleşmiyor'),
              backgroundColor: Colors.red,
            ),
          );
          return;
        }

        // Backend'e kayıt ol
        response = await authService.register(
          _emailController.text,
          _passwordController.text,
          _nameController.text,
        );
      }

      // Kullanıcı bilgilerini kontrol et
      await _checkUserAndRedirect(response);

      loadingProvider.setLoaded('auth_form');
    } catch (e) {
      // Hata durumunu yönet
      final errorMessage = errorHandler.getUserFriendlyMessage(e);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: Colors.red,
        ),
      );

      loadingProvider.setError('auth_form', e);
    }
  }

  Future<void> _checkUserAndRedirect(Map<String, dynamic> userData) async {
    try {
      // Backend'den gelen kullanıcı bilgilerini kontrol et
      final user = userData['user'];

      if (user != null) {
        // Kullanıcı tipini kontrol et
        final isParentAccount = user['isParent'] == true;
        final isStudentAccount = user['isStudent'] == true;

        // SharedPreferences'a kaydet
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool('is_parent_account', isParentAccount);
        await prefs.setBool('is_student_account', isStudentAccount);

        // Onboarding durumunu kontrol et
        final onboardingCompleted = user['onboardingCompleted'] == true;
        await prefs.setBool('onboarding_completed', onboardingCompleted);

        if (mounted) {
          if (!onboardingCompleted) {
            // Onboarding tamamlanmamışsa onboarding ekranına yönlendir
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (context) => const OnboardingScreen()),
            );
          } else if (isParentAccount) {
            // Veli hesabıysa profil seçim ekranına yönlendir
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                  builder: (context) => const ProfileSelectionScreen()),
            );
          } else {
            // Öğrenci hesabıysa plan ekranına yönlendir
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                  builder: (context) => const PlanDisplayScreen()),
            );
          }
        }
      } else {
        // Kullanıcı bilgileri yoksa rol seçim ekranına yönlendir
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
                builder: (context) => const RoleSelectionScreen()),
          );
        }
      }
    } catch (e) {
      print('Kullanıcı kontrolü hatası: $e');

      // Hata durumunda rol seçim ekranına yönlendir
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const RoleSelectionScreen()),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: SafeArea(
        child: Stack(
          children: [
            // Tema değiştirme butonu
            Positioned(
              top: 16,
              right: 16,
              child: Consumer<ThemeProvider>(
                builder: (context, themeProvider, child) {
                  return IconButton(
                    icon: Icon(
                      themeProvider.isDarkMode
                          ? Icons.light_mode
                          : Icons.dark_mode,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                    onPressed: _toggleTheme,
                  );
                },
              ),
            ),

            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Öküz Figürü
                    Animate(
                      effects: const [
                        FadeEffect(duration: Duration(milliseconds: 800)),
                        SlideEffect(
                          begin: Offset(0, -0.2),
                          end: Offset.zero,
                          curve: Curves.easeOut,
                        ),
                      ],
                      child: Container(
                        height: 120,
                        width: 120,
                        margin: const EdgeInsets.only(bottom: 30),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Theme.of(context).brightness == Brightness.dark
                              ? AppTheme.primaryColor.withAlpha(51)
                              : AppTheme.primaryLightColor,
                        ),
                        child: Center(
                          child: Icon(
                            Icons.school,
                            size: 60,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ),
                    ),

                    // Başlık
                    Animate(
                      delay: const Duration(milliseconds: 200),
                      effects: const [
                        FadeEffect(duration: Duration(milliseconds: 600)),
                      ],
                      child: Text(
                        'Öküz AI',
                        style: GoogleFonts.figtree(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),

                    // Alt Başlık
                    Animate(
                      delay: const Duration(milliseconds: 300),
                      effects: const [
                        FadeEffect(duration: Duration(milliseconds: 600)),
                      ],
                      child: Text(
                        _isLogin ? 'Hesabına giriş yap' : 'Yeni hesap oluştur',
                        style: GoogleFonts.figtree(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),

                    const SizedBox(height: 30),

                    // Form
                    Animate(
                      delay: const Duration(milliseconds: 400),
                      effects: const [
                        FadeEffect(duration: Duration(milliseconds: 600)),
                      ],
                      child: Form(
                        key: _formKey,
                        child: Column(
                          children: [
                            // E-posta alanı
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              cursorColor: AppTheme.primaryColor,
                              style: GoogleFonts.figtree(
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                              ),
                              decoration: InputDecoration(
                                labelText: 'E-posta',
                                labelStyle: GoogleFonts.figtree(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                                floatingLabelStyle: GoogleFonts.figtree(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                  color: AppTheme.primaryColor,
                                ),
                                prefixIcon: Icon(
                                  Icons.email_outlined,
                                  color: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.color,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide(
                                    color: AppTheme.primaryColor,
                                    width: 2,
                                  ),
                                ),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Lütfen e-posta adresinizi girin';
                                }
                                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                                    .hasMatch(value)) {
                                  return 'Geçerli bir e-posta adresi girin';
                                }
                                return null;
                              },
                            ),

                            const SizedBox(height: 16),

                            // Şifre alanı
                            TextFormField(
                              controller: _passwordController,
                              obscureText: !_isPasswordVisible,
                              cursorColor: AppTheme.primaryColor,
                              style: GoogleFonts.figtree(
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                              ),
                              decoration: InputDecoration(
                                labelText: 'Şifre',
                                labelStyle: GoogleFonts.figtree(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                                floatingLabelStyle: GoogleFonts.figtree(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                  color: AppTheme.primaryColor,
                                ),
                                prefixIcon: Icon(
                                  Icons.lock_outline,
                                  color: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.color,
                                ),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _isPasswordVisible
                                        ? Icons.visibility_off
                                        : Icons.visibility,
                                    color: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.color,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      _isPasswordVisible = !_isPasswordVisible;
                                    });
                                  },
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide(
                                    color: AppTheme.primaryColor,
                                    width: 2,
                                  ),
                                ),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Lütfen şifrenizi girin';
                                }
                                if (!_isLogin && value.length < 6) {
                                  return 'Şifre en az 6 karakter olmalıdır';
                                }
                                return null;
                              },
                            ),

                            // Şifre onay alanı (sadece kayıt olurken)
                            if (!_isLogin) ...[
                              const SizedBox(height: 16),
                              TextFormField(
                                controller: _confirmPasswordController,
                                obscureText: !_isPasswordVisible,
                                cursorColor: AppTheme.primaryColor,
                                style: GoogleFonts.figtree(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                                decoration: InputDecoration(
                                  labelText: 'Şifre Tekrar',
                                  labelStyle: GoogleFonts.figtree(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  floatingLabelStyle: GoogleFonts.figtree(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w500,
                                    color: AppTheme.primaryColor,
                                  ),
                                  prefixIcon: Icon(
                                    Icons.lock_outline,
                                    color: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.color,
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    borderSide: BorderSide(
                                      color: AppTheme.primaryColor,
                                      width: 2,
                                    ),
                                  ),
                                ),
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Lütfen şifrenizi tekrar girin';
                                  }
                                  if (value != _passwordController.text) {
                                    return 'Şifreler eşleşmiyor';
                                  }
                                  return null;
                                },
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Şifremi Unuttum (sadece giriş yaparken)
                    if (_isLogin)
                      Animate(
                        delay: const Duration(milliseconds: 500),
                        effects: const [
                          FadeEffect(duration: Duration(milliseconds: 600)),
                        ],
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: () {
                              // Şifre sıfırlama işlemi
                              if (_emailController.text.isNotEmpty) {
                                // Backend'e şifre sıfırlama isteği gönder
                                final authService = Provider.of<AuthService>(
                                    context,
                                    listen: false);
                                authService
                                    .sendPasswordResetEmail(
                                  email: _emailController.text.trim(),
                                )
                                    .then((_) {
                                  if (!context.mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                        content: Text(
                                            'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi')),
                                  );
                                }).catchError((error) {
                                  if (!context.mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                        content:
                                            Text('Hata: ${error.toString()}')),
                                  );
                                });
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text(
                                          'Lütfen önce e-posta adresinizi girin')),
                                );
                              }
                            },
                            child: Text(
                              'Şifremi Unuttum',
                              style: GoogleFonts.figtree(
                                color: AppTheme.primaryColor,
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                          ),
                        ),
                      ),

                    const SizedBox(height: 24),

                    // Giriş/Kayıt Butonu
                    Animate(
                      delay: const Duration(milliseconds: 600),
                      effects: const [
                        FadeEffect(duration: Duration(milliseconds: 600)),
                        SlideEffect(
                          begin: Offset(0, 0.2),
                          end: Offset.zero,
                          curve: Curves.easeOut,
                        ),
                      ],
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _submitForm,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          elevation: 0,
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 24,
                                width: 24,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : Text(
                                _isLogin ? 'GİRİŞ YAP' : 'KAYIT OL',
                                style: GoogleFonts.figtree(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // "VEYA" ayırıcısı
                    Animate(
                      delay: const Duration(milliseconds: 650),
                      effects: const [
                        FadeEffect(duration: Duration(milliseconds: 600)),
                      ],
                      child: Row(
                        children: [
                          Expanded(
                            child: Divider(
                              color: Theme.of(context).dividerColor,
                              thickness: 1,
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              'VEYA',
                              style: GoogleFonts.figtree(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Divider(
                              color: Theme.of(context).dividerColor,
                              thickness: 1,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Google ile giriş butonu
                    Animate(
                      delay: const Duration(milliseconds: 675),
                      effects: const [
                        FadeEffect(duration: Duration(milliseconds: 600)),
                        SlideEffect(
                          begin: Offset(0, 0.2),
                          end: Offset.zero,
                          curve: Curves.easeOut,
                        ),
                      ],
                      child: OutlinedButton(
                        onPressed: _isLoading ? null : _signInWithGoogle,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          side: BorderSide(
                            color: Theme.of(context).dividerColor,
                            width: 1,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              height: 24,
                              width: 24,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
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
                            const SizedBox(width: 12),
                            Text(
                              'Google ile ${_isLogin ? 'Giriş Yap' : 'Kayıt Ol'}',
                              style: GoogleFonts.figtree(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Hesap oluştur/Giriş yap butonu
                    Animate(
                      delay: const Duration(milliseconds: 700),
                      effects: const [
                        FadeEffect(duration: Duration(milliseconds: 600)),
                      ],
                      child: TextButton(
                        onPressed: _toggleAuthMode,
                        child: Text(
                          _isLogin
                              ? 'Hesabın yok mu? Kayıt ol'
                              : 'Zaten hesabın var mı? Giriş yap',
                          style: GoogleFonts.figtree(
                            color: AppTheme.primaryColor,
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
