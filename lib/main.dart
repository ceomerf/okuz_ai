import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/mock_auth_service.dart';
import 'services/mock_database_service.dart';
import 'services/family_account_service.dart';
import 'services/production_auth_service.dart';
import 'providers/study_data_provider.dart';
import 'providers/subscription_provider.dart';
import 'theme/app_theme.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        Provider<MockAuthService>(create: (_) => MockAuthService()),
        Provider<MockDatabaseService>(create: (_) => MockDatabaseService()),
        Provider<ProductionAuthService>(create: (_) => ProductionAuthService()),
        ChangeNotifierProvider<FamilyAccountService>(
            create: (_) => FamilyAccountService()),
        ChangeNotifierProvider<StudyDataProvider>(
            create: (_) => StudyDataProvider()),
        ChangeNotifierProvider<SubscriptionProvider>(
            create: (_) => SubscriptionProvider()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Okuz AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.blue,
        brightness: Brightness.light,
        scaffoldBackgroundColor: AppTheme.lightBackgroundColor,
        appBarTheme: AppBarTheme(
          backgroundColor: AppTheme.lightBackgroundColor,
          elevation: 0,
          iconTheme: const IconThemeData(color: AppTheme.lightTextPrimaryColor),
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
          iconTheme: const IconThemeData(color: AppTheme.darkTextPrimaryColor),
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
      themeMode: ThemeMode.system, // Sistem temasını kullan
      home: const LoginScreen(),
    );
  }
}
