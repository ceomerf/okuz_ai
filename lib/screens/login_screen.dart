import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:okuz_ai/screens/onboarding_screen.dart';
import 'package:okuz_ai/screens/plan_display_screen.dart';
import 'package:okuz_ai/services/plan_service.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isDarkMode = false;
  bool _isLoading = false;
  bool _isLogin = true; // true = login, false = register
  bool _isPasswordVisible = false;

  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final PlanService _planService = PlanService();

  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _loadThemePreference();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _loadThemePreference() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _isDarkMode = prefs.getBool('isDarkMode') ?? false;
      AppTheme.themeNotifier.value =
          _isDarkMode ? ThemeMode.dark : ThemeMode.light;
    });
  }

  Future<void> _saveThemePreference(bool isDark) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isDarkMode', isDark);
  }

  void _toggleTheme() {
    setState(() {
      _isDarkMode = !_isDarkMode;
      AppTheme.themeNotifier.value =
          _isDarkMode ? ThemeMode.dark : ThemeMode.light;
      _saveThemePreference(_isDarkMode);
    });
  }

  void _toggleAuthMode() {
    setState(() {
      _isLogin = !_isLogin;
    });
  }

  // Kullanıcı dokümanını oluştur veya güncelle
  Future<void> _createUserDocument(User user) async {
    try {
      // Kullanıcı dokümanını kontrol et
      final docRef = _firestore.collection('users').doc(user.uid);
      final docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        // Yeni kullanıcı için Firestore'da bir döküman oluştur
        await docRef.set({
          'email': user.email,
          'createdAt': FieldValue.serverTimestamp(),
          'onboardingCompleted': false
        });
      }
    } catch (e) {
      print('Kullanıcı dokümanı oluşturma hatası: $e');
      // Hata durumunda bile devam et
    }
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      UserCredential userCredential;

      if (_isLogin) {
        // Giriş işlemi
        userCredential = await _auth.signInWithEmailAndPassword(
          email: _emailController.text.trim(),
          password: _passwordController.text.trim(),
        );
      } else {
        // Kayıt işlemi
        userCredential = await _auth.createUserWithEmailAndPassword(
          email: _emailController.text.trim(),
          password: _passwordController.text.trim(),
        );

        // Kullanıcı kaydı başarılı olduktan sonra token'ı yenile
        await userCredential.user!.reload();
        await userCredential.user!.getIdToken(true);

        // Kullanıcı dokümanını oluştur
        await _createUserDocument(userCredential.user!);
      }

      if (mounted && userCredential.user != null) {
        // Kullanıcı oturum açtıktan sonra idToken'ı yenile
        await userCredential.user!.reload();
        await userCredential.user!.getIdToken(true);

        // Giriş yapan kullanıcı için de doküman kontrolü yap
        await _createUserDocument(userCredential.user!);

        // Onboarding durumunu kontrol et
        final hasCompletedOnboarding =
            await _planService.checkOnboardingStatus();

        if (mounted) {
          if (hasCompletedOnboarding) {
            // Onboarding tamamlanmışsa plan ekranına yönlendir
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                  builder: (context) => const PlanDisplayScreen()),
            );
          } else {
            // Onboarding tamamlanmamışsa onboarding ekranına yönlendir
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (context) => const OnboardingScreen()),
            );
          }
        }
      }
    } on FirebaseAuthException catch (e) {
      String errorMessage = 'Bir hata oluştu';

      if (e.code == 'user-not-found') {
        errorMessage = 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.';
      } else if (e.code == 'wrong-password') {
        errorMessage = 'Hatalı şifre girdiniz.';
      } else if (e.code == 'email-already-in-use') {
        errorMessage = 'Bu e-posta adresi zaten kullanılıyor.';
      } else if (e.code == 'weak-password') {
        errorMessage = 'Şifre çok zayıf.';
      } else if (e.code == 'invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi.';
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorMessage)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Hata: ${e.toString()}')),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Stack(
          children: [
            // Tema değiştirme butonu
            Positioned(
              top: 16,
              right: 16,
              child: IconButton(
                icon: Icon(
                  _isDarkMode ? Icons.light_mode : Icons.dark_mode,
                  color: AppTheme.textPrimaryColor,
                ),
                onPressed: _toggleTheme,
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
                          color: _isDarkMode
                              ? AppTheme.primaryColor.withOpacity(0.2)
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
                        style:
                            Theme.of(context).textTheme.displayMedium?.copyWith(
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
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: AppTheme.textSecondaryColor,
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
                              decoration: InputDecoration(
                                labelText: 'E-posta',
                                prefixIcon: Icon(
                                  Icons.email_outlined,
                                  color: AppTheme.textSecondaryColor,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
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
                              decoration: InputDecoration(
                                labelText: 'Şifre',
                                prefixIcon: Icon(
                                  Icons.lock_outline,
                                  color: AppTheme.textSecondaryColor,
                                ),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _isPasswordVisible
                                        ? Icons.visibility_off
                                        : Icons.visibility,
                                    color: AppTheme.textSecondaryColor,
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
                                decoration: InputDecoration(
                                  labelText: 'Şifre Tekrar',
                                  prefixIcon: Icon(
                                    Icons.lock_outline,
                                    color: AppTheme.textSecondaryColor,
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(16),
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
                                _auth
                                    .sendPasswordResetEmail(
                                        email: _emailController.text.trim())
                                    .then((_) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                        content: Text(
                                            'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi')),
                                  );
                                }).catchError((error) {
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
                              style: TextStyle(
                                color: AppTheme.primaryColor,
                                fontWeight: FontWeight.w600,
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
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
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
                          style: TextStyle(
                            color: AppTheme.primaryColor,
                            fontWeight: FontWeight.w600,
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
