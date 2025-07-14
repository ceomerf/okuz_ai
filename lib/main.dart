import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:provider/provider.dart';
import 'package:okuz_ai/firebase_options.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:okuz_ai/screens/login_screen.dart';
import 'package:okuz_ai/screens/onboarding_screen.dart';
import 'package:okuz_ai/screens/plan_generation_screen.dart';
import 'package:okuz_ai/screens/plan_display_screen.dart';
import 'package:okuz_ai/screens/user_plan_screen.dart';
import 'package:okuz_ai/screens/feynman_cycle_screen.dart';
import 'package:okuz_ai/screens/performance_dashboard_screen.dart';
import 'package:okuz_ai/screens/topic_connection_screen.dart';
import 'package:okuz_ai/services/plan_service.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_functions/firebase_functions.dart';
import 'package:okuz_ai/screens/holiday_plan_choice_screen.dart';
import 'package:okuz_ai/screens/gamification_screen.dart';
import 'package:okuz_ai/screens/mental_support_screen.dart';
import 'package:okuz_ai/screens/smart_tools_screen.dart';
import 'dart:developer' as developer;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (context) => PlanService()),
      ],
      child: const AppWithAuth(),
    );
  }
}

class AppWithAuth extends StatefulWidget {
  const AppWithAuth({super.key});

  @override
  State<AppWithAuth> createState() => _AppWithAuthState();
}

class _AppWithAuthState extends State<AppWithAuth> {
  bool _isChecking = true;
  bool _isHoliday = false;
  String _holidayName = "";
  String _holidayType = "";

  @override
  void initState() {
    super.initState();
    _checkAuthAndHoliday();
  }

  Future<void> _checkAuthAndHoliday() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      
      if (user == null) {
        // Kullanıcı giriş yapmamış
        setState(() {
          _isChecking = false;
        });
        return;
      }
      
      // Kullanıcı giriş yapmış, tatil durumunu kontrol et
      final planService = Provider.of<PlanService>(context, listen: false);
      final holidayData = await planService.checkHolidayStatus();
      
      setState(() {
        _isHoliday = holidayData['isHoliday'] ?? false;
        _holidayName = holidayData['reason'] ?? "";
        _holidayType = holidayData['type'] ?? "";
        _isChecking = false;
      });
      
      developer.log("Tatil durumu: $_isHoliday, $_holidayName, $_holidayType");
    } catch (e) {
      developer.log("Tatil durumu kontrolü sırasında hata: $e");
      setState(() {
        _isChecking = false;
      });
    }
  }

  Widget _buildHomeScreen() {
    final user = FirebaseAuth.instance.currentUser;
    
    if (user == null) {
      // Kullanıcı giriş yapmamış, login ekranına yönlendir
      return const LoginScreen();
    }
    
    // Kullanıcı giriş yapmış ve tatil durumu
    if (_isHoliday) {
      // Tatil ekranını göster
      return HolidayPlanChoiceScreen(
        holidayName: _holidayName,
        holidayType: _holidayType,
      );
    }
    
    // Normal akış için kullanıcı plan ekranına yönlendir
    return const UserPlanScreen();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OKUZ AI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routes: {
        '/login': (context) => const LoginScreen(),
        '/onboarding': (context) => const OnboardingScreen(),
        '/plan_generation': (context) => const PlanGenerationScreen(),
        '/plan_display': (context) => const PlanDisplayScreen(),
        '/user_plan': (context) => const UserPlanScreen(),
        '/feynman_cycle': (context) => const FeynmanCycleScreen(),
        '/performance_dashboard': (context) => const PerformanceDashboardScreen(),
        '/topic_connection': (context) => const TopicConnectionScreen(),
        // Yeni ekranlar
        '/gamification': (context) => const GamificationScreen(),
        '/mental_support': (context) => const MentalSupportScreen(),
        '/smart_tools': (context) => const SmartToolsScreen(),
      },
      home: _isChecking
          ? const Scaffold(
              body: Center(
                child: CircularProgressIndicator(),
              ),
            )
          : _buildHomeScreen(),
    );
  }
}
