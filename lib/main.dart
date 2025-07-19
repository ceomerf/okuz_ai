import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:okuz_ai/firebase_options.dart';
import 'package:okuz_ai/services/family_account_service.dart';
import 'package:okuz_ai/services/subscription_service.dart';
import 'package:okuz_ai/services/deep_link_service.dart';
import 'package:okuz_ai/screens/student_invite_register_screen.dart';
import 'package:okuz_ai/screens/parent_invite_register_screen.dart';
import 'package:okuz_ai/screens/onboarding_screen.dart';
import 'package:okuz_ai/screens/login_screen.dart';
import 'package:okuz_ai/screens/profile_screen.dart';
import 'package:okuz_ai/screens/family_portal_screen.dart';
import 'package:okuz_ai/theme/app_theme.dart';

/// Ana fonksiyon - Uygulama başlangıç noktası
/// Firebase ve Flutter framework'ü burada başlatılır
void main() async {
  // Flutter framework'ün tamamen başlatılmasını bekle
  // Bu satır Firebase ve diğer native servislerin kullanılabilmesi için gerekli
  WidgetsFlutterBinding.ensureInitialized();

  // Firebase'i güvenli şekilde başlat
  await _initializeFirebase();

  // Flutter uygulamasını başlat
  runApp(const MyApp());
}

/// Firebase'i güvenli şekilde başlatan fonksiyon
/// Bu fonksiyon Firebase'in sadece bir kez başlatılmasını garanti eder
Future<void> _initializeFirebase() async {
  try {
    // Önce Firebase'in zaten başlatılıp başlatılmadığını kontrol et
    if (Firebase.apps.isNotEmpty) {
      debugPrint(
          'ℹ️ Firebase zaten başlatılmış (${Firebase.apps.length} app), tekrar başlatma atlandı');
      return;
    }

    // Firebase'i ilk kez başlat
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    debugPrint('✅ Firebase başarıyla başlatıldı');
  } catch (e) {
    // Firebase başlatma sırasında beklenmeyen bir hata oluştu
    debugPrint('❌ Firebase başlatma hatası: $e');

    // Eğer hata "duplicate-app" hatasıysa, Firebase zaten başlatılmış demektir
    if (e.toString().toLowerCase().contains('duplicate-app') ||
        e.toString().toLowerCase().contains('already exists')) {
      debugPrint(
          'ℹ️ Firebase duplicate app hatası yakalandı, devam ediliyor...');
      return; // Hata fırlatma, normal akışa devam et
    }

    // Diğer kritik hataları fırlat
    rethrow;
  }
}

/// Ana uygulama widget'ı
/// Provider'lar, tema ve routing burada yapılandırılır
class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> with WidgetsBindingObserver {
  // Deep Link servisi - Singleton pattern kullanılır
  late final DeepLinkService _deepLinkService;

  // Navigator için global key - Deep link routing için gerekli
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();

    // Uygulama lifecycle olaylarını dinlemeye başla
    WidgetsBinding.instance.addObserver(this);

    // Deep link servisini başlat
    _initializeDeepLinks();
  }

  @override
  void dispose() {
    // Uygulama lifecycle olaylarını dinlemeyi durdur
    WidgetsBinding.instance.removeObserver(this);

    // Deep link servisini temizle
    _deepLinkService.dispose();

    super.dispose();
  }

  /// Deep link işlemlerini başlatan fonksiyon
  /// Bu fonksiyon uygulama başlarken çağrılır
  Future<void> _initializeDeepLinks() async {
    try {
      // Deep link servisini başlat
      _deepLinkService = DeepLinkService();
      await _deepLinkService.init();

      // Deep link stream'ini dinle
      // Uygulama açıkken gelen deep link'leri yakala
      _deepLinkService.deepLinkStream.listen(
        _handleDeepLink,
        onError: (error) {
          debugPrint('❌ Deep link stream hatası: $error');
        },
      );

      debugPrint('✅ Deep link servisi başarıyla başlatıldı');
    } catch (e) {
      debugPrint('❌ Deep link servisi başlatma hatası: $e');
    }
  }

  /// Gelen deep link'leri işleyen fonksiyon
  /// Token varsa ilgili kayıt ekranına yönlendirir
  void _handleDeepLink(DeepLinkData data) {
    // Token yoksa işlem yapma
    if (data.token == null || data.token!.isEmpty) {
      debugPrint('⚠️ Deep link token bulunamadı');
      return;
    }

    debugPrint('🔗 Deep link işleniyor: ${data.type}, Token: ${data.token}');

    // Navigator mevcut değilse işlem yapma
    if (_navigatorKey.currentState == null) {
      debugPrint('⚠️ Navigator mevcut değil, deep link işlenemedi');
      return;
    }

    // Deep link tipine göre yönlendirme yap
    switch (data.type) {
      case DeepLinkType.studentInvite:
        // Öğrenci davet bağlantısı - Öğrenci kayıt ekranına git
        _navigatorKey.currentState!.push(
          MaterialPageRoute(
            builder: (context) => StudentInviteRegisterScreen(
              token: data.token!,
            ),
          ),
        );
        break;

      case DeepLinkType.parentInvite:
        // Veli davet bağlantısı - Veli kayıt ekranına git
        _navigatorKey.currentState!.push(
          MaterialPageRoute(
            builder: (context) => ParentInviteRegisterScreen(
              token: data.token!,
            ),
          ),
        );
        break;

      case DeepLinkType.unknown:
        // Bilinmeyen link tipi - Kullanıcıyı bilgilendir
        debugPrint('⚠️ Bilinmeyen deep link tipi');
        _showSnackBar('Geçersiz davet bağlantısı');
        break;
    }
  }

  /// Kullanıcıya bilgi mesajı gösteren fonksiyon
  void _showSnackBar(String message) {
    final context = _navigatorKey.currentContext;
    if (context != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  /// Uygulama lifecycle olaylarını dinleyen fonksiyon
  /// Hot reload sırasında Firebase'in tekrar başlatılmasını önler
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);

    switch (state) {
      case AppLifecycleState.resumed:
        debugPrint('🔄 Uygulama ön plana geçti');
        break;
      case AppLifecycleState.paused:
        debugPrint('⏸️ Uygulama arka plana geçti');
        break;
      case AppLifecycleState.detached:
        debugPrint('🔌 Uygulama sistemden ayrıldı');
        break;
      case AppLifecycleState.inactive:
        debugPrint('😴 Uygulama pasif durumda');
        break;
      case AppLifecycleState.hidden:
        debugPrint('🫥 Uygulama gizlendi');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      // Provider'ları burada tanımla
      // Bu provider'lar tüm uygulama boyunca erişilebilir
      providers: [
        // Family Account Service - Aile hesabı yönetimi
        ChangeNotifierProvider(
          create: (_) => FamilyAccountService(),
        ),

        // Subscription Service - Abonelik yönetimi
        Provider(
          create: (_) => SubscriptionService(),
        ),
      ],
      child: MaterialApp(
        // Uygulama başlığı
        title: 'OKUZ AI - Akıllı Eğitim Asistanı',

        // Debug banner'ını kaldır
        debugShowCheckedModeBanner: false,

        // Tema ayarları
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system, // Sistem temasını takip et

        // Navigator key - Deep linking için gerekli
        navigatorKey: _navigatorKey,

        // Ana ekran - Auth kontrolü
        home: const AuthWrapper(),

        // Uygulama genelinde kullanılacak route'lar
        routes: {
          '/student-invite': (context) {
            final args = ModalRoute.of(context)?.settings.arguments
                as Map<String, dynamic>?;
            final token = args?['token'] as String?;

            if (token != null) {
              return StudentInviteRegisterScreen(token: token);
            }

            return const LoginScreen();
          },
          '/parent-invite': (context) {
            final args = ModalRoute.of(context)?.settings.arguments
                as Map<String, dynamic>?;
            final token = args?['token'] as String?;

            if (token != null) {
              return ParentInviteRegisterScreen(token: token);
            }

            return const LoginScreen();
          },
        },
      ),
    );
  }
}

/// Kimlik doğrulama ve onboarding durumunu kontrol eden wrapper
/// Bu sınıf kullanıcının hangi ekrana yönlendirileceğini belirler
class AuthWrapper extends StatefulWidget {
  const AuthWrapper({Key? key}) : super(key: key);

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  // Durum değişkenleri
  bool _isLoading = true;
  bool _isLoggedIn = false;
  bool _onboardingCompleted = false;

  @override
  void initState() {
    super.initState();

    // Kimlik doğrulama durumunu kontrol et
    _checkAuthState();
  }

  /// Kimlik doğrulama ve onboarding durumunu kontrol eden fonksiyon
  Future<void> _checkAuthState() async {
    try {
      // SharedPreferences'tan veri al
      final prefs = await SharedPreferences.getInstance();

      // Firebase Auth'tan mevcut kullanıcıyı al
      final user = FirebaseAuth.instance.currentUser;

      // Onboarding durumunu kontrol et
      final onboardingCompleted =
          prefs.getBool('onboarding_completed') ?? false;

      // Hesap türünü kontrol et
      final isParentAccount = prefs.getBool('is_parent_account') ?? false;
      final isStudentAccount = prefs.getBool('is_student_account') ?? false;

      debugPrint(
          '👤 Kullanıcı durumu: ${user != null ? 'Giriş yapmış' : 'Giriş yapmamış'}');
      debugPrint(
          '📋 Onboarding durumu: ${onboardingCompleted ? 'Tamamlanmış' : 'Tamamlanmamış'}');
      debugPrint(
          '👨‍👩‍👧‍👦 Hesap türü: ${isParentAccount ? 'Veli' : isStudentAccount ? 'Öğrenci' : 'Belirsiz'}');

      // Eğer kullanıcı giriş yapmış ve veli hesabıysa, onboarding'i tamamlanmış say
      if (user != null && isParentAccount && !onboardingCompleted) {
        await prefs.setBool('onboarding_completed', true);
        debugPrint('✅ Veli hesabı için onboarding otomatik tamamlandı');
      }

      // Durumu güncelle
      setState(() {
        _isLoggedIn = user != null;
        _onboardingCompleted =
            onboardingCompleted || (isParentAccount && user != null);
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('❌ Auth state kontrolü hatası: $e');

      // Hata durumunda güvenli varsayılanları ayarla
      setState(() {
        _isLoggedIn = false;
        _onboardingCompleted = false;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Yükleme durumunda loading göster
    if (_isLoading) {
      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text(
                'Uygulama başlatılıyor...',
                style: TextStyle(fontSize: 16),
              ),
            ],
          ),
        ),
      );
    }

    // Kullanıcı giriş yapmışsa
    if (_isLoggedIn) {
      // Onboarding tamamlanmışsa doğru ekrana yönlendir
      if (_onboardingCompleted) {
        return _getHomeScreen();
      } else {
        // Onboarding tamamlanmamışsa onboarding ekranına yönlendir
        return const OnboardingScreen();
      }
    } else {
      // Kullanıcı giriş yapmamışsa login ekranına yönlendir
      return const LoginScreen();
    }
  }

  /// Hesap türüne göre doğru ana ekranı döndüren fonksiyon
  Widget _getHomeScreen() {
    // SharedPreferences'tan hesap türünü kontrol et (async olmayan alternatif)
    return FutureBuilder<SharedPreferences>(
      future: SharedPreferences.getInstance(),
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          final prefs = snapshot.data!;
          final isParentAccount = prefs.getBool('is_parent_account') ?? false;
          final isStudentAccount = prefs.getBool('is_student_account') ?? false;

          if (isParentAccount) {
            debugPrint('🏠 Veli ana ekranına yönlendiriliyor: Family Portal');
            return const FamilyPortalScreen();
          } else if (isStudentAccount) {
            debugPrint(
                '🏠 Öğrenci ana ekranına yönlendiriliyor: Profile Screen');
            return const ProfileScreen();
          } else {
            // Hesap türü belirsizse varsayılan olarak profile screen
            debugPrint(
                '🏠 Hesap türü belirsiz, Profile Screen\'e yönlendiriliyor');
            return const ProfileScreen();
          }
        } else {
          // SharedPreferences yüklenirken loading göster
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }
      },
    );
  }
}
