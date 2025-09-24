import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'services/mock_auth_service.dart';
import 'services/mock_database_service.dart';
import 'services/family_account_service.dart';
import 'services/production_auth_service.dart';
import 'services/api_client.dart';
import 'services/api_service.dart';
import 'providers/study_data_provider.dart';
import 'providers/subscription_provider.dart';
import 'providers/theme_provider.dart';
import 'providers/smart_tools_provider.dart';
import 'theme/app_theme.dart';
import 'screens/account_type_selection_screen.dart';
import 'screens/family_portal_screen.dart';
import 'screens/student_dashboard_screen.dart';
import 'screens/onboarding_screen.dart';
import 'widgets/main_layout.dart';
import 'models/account_type.dart';
import 'screens/user_plan_screen.dart';
import 'screens/quiz_setup_screen.dart';
import 'screens/quiz_in_progress_screen.dart';
import 'screens/quiz_results_screen.dart';
import 'screens/socratic_ai_screen.dart';
import 'screens/socratic_chat_history_screen.dart';
import 'providers/quiz_provider.dart';
import 'providers/websocket_provider.dart';
import 'providers/socket_service_provider.dart';
import 'providers/plan_detail_provider.dart';
import 'providers/paywall_provider.dart';
// import 'viewmodels/calendar_view_model.dart';
// import 'viewmodels/gamification_view_model.dart';
import 'widgets/auth_expired_handler.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // TR yerellefmesi ifin tarih/saat verilerini yfkleyin
  Intl.defaultLocale = 'tr_TR';
  await initializeDateFormatting('tr_TR');

  runApp(
    ProviderScope(
      child: const MyApp(),
    ),
  );
}

class MyApp extends ConsumerStatefulWidget {
  const MyApp({super.key});

  @override
  ConsumerState<MyApp> createState() => _MyAppState();
}

class _MyAppState extends ConsumerState<MyApp> {
  bool _isLoading = true;
  Widget _currentScreen = const Scaffold(
    body: Center(
      child: CircularProgressIndicator(),
    ),
  );

  @override
  void initState() {
    super.initState();
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final secureStorage = FlutterSecureStorage();

      // Hem SharedPreferences hem de FlutterSecureStorage'dan JWT token kontrolü
      final jwtTokenPrefs = prefs.getString('jwt_token');
      final jwtTokenSecure = await secureStorage.read(key: 'jwt_token');
      // Uygulama silinip yeniden kurulunca iOS Keychain kalabilir.
      // Prefs boş ama Secure dolu ise eski tokenları temizleyip sıfırdan başla.
      if (jwtTokenPrefs == null && jwtTokenSecure != null) {
        await secureStorage.delete(key: 'jwt_token');
        await secureStorage.delete(key: 'refresh_token');
      }

      final freshSecureToken = await secureStorage.read(key: 'jwt_token');
      final isLoggedIn = jwtTokenPrefs != null || freshSecureToken != null;

      final userRole = prefs.getString('user_role');
      final isParentAccount = prefs.getBool('is_parent_account') ?? false;
      final onboardingCompleted =
          prefs.getBool('onboarding_completed') ?? false;

      print('🔍 Auth Status Check:');
      print('   JWT Token (Prefs): ${jwtTokenPrefs != null ? 'Var' : 'Yok'}');
      print('   JWT Token (Secure): ${jwtTokenSecure != null ? 'Var' : 'Yok'}');
      print('   User Role: $userRole');
      print('   Is Parent Account: $isParentAccount');
      print('   Onboarding Completed: $onboardingCompleted');

      Widget targetScreen;

      if (isLoggedIn) {
        // Veli hesabı kontrolü - hem userRole hem de isParentAccount ile
        if (userRole == 'PARENT' || isParentAccount) {
          // Veli hesabı - direkt Family Portal'a yönlendir
          print(
              '   → Veli hesabı tespit edildi, Family Portal\'a yönlendiriliyor');
          targetScreen = const FamilyPortalScreen();
        } else if (userRole == 'STUDENT' || !isParentAccount) {
          // Öğrenci hesabı kontrolü
          if (onboardingCompleted) {
            // Öğrenci hesabı ve onboarding tamamlanmış - MainLayout'a yönlendir
            print(
                '   → Öğrenci hesabı tespit edildi, MainLayout\'a yönlendiriliyor');
            targetScreen = const MainLayout(currentIndex: 0);
          } else {
            // Öğrenci hesabı ama onboarding tamamlanmamış - Onboarding'e yönlendir
            print(
                '   → Öğrenci hesabı ama onboarding tamamlanmamış, Onboarding\'e yönlendiriliyor');
            // Kullanıcı onboarding sırasında restart yaparsa; önce onboarding'e yönlendir,
            // ardından plan başlangıç sayfasına (UserPlanScreen) erişimi kolaylaştırmak için
            // varsayılan akış korunur.
            targetScreen = OnboardingScreen(
              isStudentAccount: true,
              initialAccountType: AccountType.student,
            );
          }
        } else {
          // Rol belirsiz ama giriş yapılmış - varsayılan olarak öğrenci hesabı kabul et
          print(
              '   → Rol belirsiz ama giriş yapılmış, öğrenci hesabı olarak kabul ediliyor');
          if (onboardingCompleted) {
            print(
                '   → Onboarding tamamlanmış, MainLayout\'a yönlendiriliyor');
            targetScreen = const MainLayout(currentIndex: 0);
          } else {
            print(
                '   → Onboarding tamamlanmamış, Onboarding\'e yönlendiriliyor');
            targetScreen = OnboardingScreen(
              isStudentAccount: true,
              initialAccountType: AccountType.student,
            );
          }
        }
      } else {
        // Giriş yapılmamış - Hesap tipi seçim ekranına yönlendir
        print(
            '   → Giriş yapılmamış, Hesap tipi seçim ekranına yönlendiriliyor');
        // Eğer onboarding sırasında restart olursa ve token yoksa; doğrudan
        // onboarding giriş akışına gidilsin.
        targetScreen = const AccountTypeSelectionScreen();
      }

      if (mounted) {
        setState(() {
          _currentScreen = targetScreen;
          _isLoading = false;
        });
      }
    } catch (e) {
      print('❌ Auth status check error: $e');
      if (mounted) {
        setState(() {
          _currentScreen = const AccountTypeSelectionScreen();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final appThemeState = ref.watch(appThemeNotifierProvider);
    return MaterialApp(
          title: 'Öküz AI',
          debugShowCheckedModeBanner: false,
          locale: const Locale('tr', 'TR'),
          scrollBehavior: const NoGlowScrollBehavior(),
          supportedLocales: const [
            Locale('tr', 'TR'),
            Locale('en', 'US'),
          ],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          theme: ThemeData(
            useMaterial3: true,
            primarySwatch: Colors.blue,
            brightness: Brightness.light,
            colorScheme: ColorScheme.fromSeed(
              seedColor: AppTheme.primaryColor,
              brightness: Brightness.light,
            ).copyWith(
              surface: Colors.white,
              background: AppTheme.lightBackgroundColor,
              surfaceTint: Colors.transparent,
            ),
            scaffoldBackgroundColor: AppTheme.lightBackgroundColor,
            cardColor: Colors.white,
            cardTheme: const CardThemeData(
              surfaceTintColor: Colors.transparent,
            ),
            dialogTheme: const DialogThemeData(
              surfaceTintColor: Colors.transparent,
            ),
            bottomSheetTheme: const BottomSheetThemeData(
              surfaceTintColor: Colors.transparent,
            ),
            visualDensity: VisualDensity.adaptivePlatformDensity,
            appBarTheme: AppBarTheme(
              backgroundColor: AppTheme.lightBackgroundColor,
              elevation: 0,
              iconTheme:
                  const IconThemeData(color: AppTheme.lightTextPrimaryColor),
              titleTextStyle: TextStyle(
                color: AppTheme.lightTextPrimaryColor,
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
            elevatedButtonTheme: ElevatedButtonThemeData(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
            inputDecorationTheme: InputDecorationTheme(
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide:
                    const BorderSide(color: AppTheme.primaryColor, width: 2),
              ),
            ),
          ),
          darkTheme: ThemeData(
            primarySwatch: Colors.blue,
            brightness: Brightness.dark,
            scaffoldBackgroundColor: AppTheme.darkBackgroundColor,
            appBarTheme: AppBarTheme(
              backgroundColor: AppTheme.darkBackgroundColor,
              elevation: 0,
              iconTheme:
                  const IconThemeData(color: AppTheme.darkTextPrimaryColor),
              titleTextStyle: TextStyle(
                color: AppTheme.darkTextPrimaryColor,
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
            elevatedButtonTheme: ElevatedButtonThemeData(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
            inputDecorationTheme: InputDecorationTheme(
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide:
                    const BorderSide(color: AppTheme.primaryColor, width: 2),
              ),
            ),
          ),
          themeMode: appThemeState.themeMode,
          home: AuthExpiredHandler(
            child: _currentScreen,
          ),
          routes: {
            QuizSetupScreen.routeName: (context) => const QuizSetupScreen(),
            QuizInProgressScreen.routeName: (context) =>
                const QuizInProgressScreen(),
            QuizResultsScreen.routeName: (context) => const QuizResultsScreen(),
            SocraticAIScreen.routeName: (context) => const SocraticAIScreen(),
            SocraticChatHistoryScreen.routeName: (context) =>
                const SocraticChatHistoryScreen(),
            '/user-plan': (context) => const UserPlanScreen(),
          },
        );
  }
}

class LoadingScreen extends StatelessWidget {
  const LoadingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.lightBackgroundColor,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryColor,
                    AppTheme.primaryColor.withValues(alpha: 0.7),
                  ],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(
                Icons.school_rounded,
                color: Colors.white,
                size: 40,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Öküz AI',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Yükleniyor...',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Uygulama genelinde overscroll parlamasını (mor/primary glow) kaldırmak için
class NoGlowScrollBehavior extends ScrollBehavior {
  const NoGlowScrollBehavior();

  @override
  Widget buildOverscrollIndicator(
    BuildContext context,
    Widget child,
    ScrollableDetails details,
  ) {
    return child;
  }
}
