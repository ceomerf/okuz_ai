import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Global theme notifier
final ValueNotifier<ThemeMode> themeNotifier = ValueNotifier(ThemeMode.system);

class ThemeProvider extends ChangeNotifier {
  static final ThemeProvider _instance = ThemeProvider._internal();
  factory ThemeProvider() => _instance;
  ThemeProvider._internal();

  ThemeMode _themeMode = ThemeMode.system;
  ThemeMode get themeMode => _themeMode;

  bool get isDarkMode {
    if (_themeMode == ThemeMode.system) {
      return WidgetsBinding.instance.platformDispatcher.platformBrightness ==
          Brightness.dark;
    }
    return _themeMode == ThemeMode.dark;
  }

  bool get isLightMode => _themeMode == ThemeMode.light;
  bool get isSystemMode => _themeMode == ThemeMode.system;

  Future<void> initTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final themeModeIndex = prefs.getInt('theme_mode') ?? 0;
    _themeMode = ThemeMode.values[themeModeIndex];
    themeNotifier.value = _themeMode;
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    themeNotifier.value = mode;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('theme_mode', mode.index);

    notifyListeners();
  }

  Future<void> toggleTheme() async {
    if (_themeMode == ThemeMode.light) {
      await setThemeMode(ThemeMode.dark);
    } else {
      await setThemeMode(ThemeMode.light);
    }
  }
}

class AppTheme {
  // Ana renkler - Turuncu Tema
  static const Color primaryColor = Color(0xFFF57C00); // Koyu Turuncu
  static const Color primaryDarkColor = Color(0xFFE65100); // Daha Koyu Turuncu
  static const Color primaryLightColor = Color(0xFFFFE0B2); // Açık Turuncu
  static const Color accentColor = Color(0xFFFFAB40); // Vurgu Turuncusu

  // Açık tema renkleri
  static const Color lightBackgroundColor = Color(0xFFFDFDFD);
  static const Color lightCardColor = Colors.white;
  static const Color lightDividerColor = Color(0xFFE0E0E0);
  static const Color lightTextPrimaryColor = Color(0xFF212121);
  static const Color lightTextSecondaryColor = Color(0xFF757575);
  static const Color lightTextLightColor = Color(0xFFBDBDBD);

  // Koyu tema renkleri - AI araçları tarzı lacivertimsi tema
  static const Color darkBackgroundColor =
      Color(0xFF0F1419); // Çok koyu lacivert
  static const Color darkCardColor = Color(0xFF1A1F29); // Koyu mavi-gri
  static const Color darkDividerColor = Color(0xFF2C3E50); // Orta lacivert
  static const Color darkTextPrimaryColor =
      Color(0xFFE8EAF6); // Açık mavi-beyaz
  static const Color darkTextSecondaryColor =
      Color(0xFFC5CAE9); // Orta mavi-gri
  static const Color darkTextLightColor = Color(0xFF9FA8DA); // Açık mavi-gri

  // Durum renkleri
  static const Color successColor = Color(0xFF4CAF50);
  static const Color errorColor = Color(0xFFD32F2F);
  static const Color warningColor = Color(0xFFFFC107);
  static const Color infoColor = Color(0xFF0288D1);

  // Light Theme
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        brightness: Brightness.light,
      ).copyWith(
        primary: primaryColor,
        secondary: accentColor,
        surface: lightBackgroundColor,
        background: lightBackgroundColor,
      ),
      scaffoldBackgroundColor: lightBackgroundColor,
      cardColor: lightCardColor,
      dividerColor: lightDividerColor,
      appBarTheme: AppBarTheme(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.figtree(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
      textTheme: TextTheme(
        displayLarge: GoogleFonts.figtree(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: lightTextPrimaryColor,
        ),
        displayMedium: GoogleFonts.figtree(
          fontSize: 28,
          fontWeight: FontWeight.bold,
          color: lightTextPrimaryColor,
        ),
        displaySmall: GoogleFonts.figtree(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          color: lightTextPrimaryColor,
        ),
        headlineLarge: GoogleFonts.figtree(
          fontSize: 22,
          fontWeight: FontWeight.w600,
          color: lightTextPrimaryColor,
        ),
        headlineMedium: GoogleFonts.figtree(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: lightTextPrimaryColor,
        ),
        headlineSmall: GoogleFonts.figtree(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: lightTextPrimaryColor,
        ),
        titleLarge: GoogleFonts.figtree(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: lightTextPrimaryColor,
        ),
        titleMedium: GoogleFonts.figtree(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: lightTextPrimaryColor,
        ),
        titleSmall: GoogleFonts.figtree(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: lightTextPrimaryColor,
        ),
        bodyLarge: GoogleFonts.figtree(
          fontSize: 16,
          fontWeight: FontWeight.normal,
          color: lightTextPrimaryColor,
        ),
        bodyMedium: GoogleFonts.figtree(
          fontSize: 14,
          fontWeight: FontWeight.normal,
          color: lightTextSecondaryColor,
        ),
        bodySmall: GoogleFonts.figtree(
          fontSize: 12,
          fontWeight: FontWeight.normal,
          color: lightTextSecondaryColor,
        ),
      ),
      cardTheme: CardTheme(
        color: lightCardColor,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryColor,
          side: const BorderSide(color: primaryColor),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primaryColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: lightCardColor,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: lightDividerColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: lightDividerColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primaryColor, width: 2),
        ),
        labelStyle: const TextStyle(color: primaryColor),
        floatingLabelStyle: const TextStyle(color: primaryColor),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      textSelectionTheme: const TextSelectionThemeData(
        cursorColor: primaryColor,
        selectionColor: Color(0x66F57C00), // primaryColor with 40% opacity
        selectionHandleColor: primaryColor,
      ),
    );
  }

  // Dark Theme - AI araçları tarzı lacivertimsi tema
  static ThemeData get darkTheme {
    const darkPrimary = Color(0xFF3F51B5); // Koyu mavi primary
    const darkSecondary = Color(0xFF7986CB); // Açık mavi secondary
    const darkAppBarColor = Color(0xFF1A1F29); // AppBar için koyu mavi-gri

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: darkPrimary,
        brightness: Brightness.dark,
      ).copyWith(
        primary: darkPrimary,
        secondary: darkSecondary,
        surface: darkCardColor,
        background: darkBackgroundColor,
        onSurface: darkTextPrimaryColor,
        onBackground: darkTextPrimaryColor,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
      ),
      scaffoldBackgroundColor: darkBackgroundColor,
      cardColor: darkCardColor,
      dividerColor: darkDividerColor,
      appBarTheme: AppBarTheme(
        backgroundColor: darkAppBarColor,
        foregroundColor: darkTextPrimaryColor,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.figtree(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: darkTextPrimaryColor,
        ),
      ),
      textTheme: TextTheme(
        displayLarge: GoogleFonts.figtree(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: darkTextPrimaryColor,
        ),
        displayMedium: GoogleFonts.figtree(
          fontSize: 28,
          fontWeight: FontWeight.bold,
          color: darkTextPrimaryColor,
        ),
        displaySmall: GoogleFonts.figtree(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          color: darkTextPrimaryColor,
        ),
        headlineLarge: GoogleFonts.figtree(
          fontSize: 22,
          fontWeight: FontWeight.w600,
          color: darkTextPrimaryColor,
        ),
        headlineMedium: GoogleFonts.figtree(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: darkTextPrimaryColor,
        ),
        headlineSmall: GoogleFonts.figtree(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: darkTextPrimaryColor,
        ),
        titleLarge: GoogleFonts.figtree(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: darkTextPrimaryColor,
        ),
        titleMedium: GoogleFonts.figtree(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: darkTextPrimaryColor,
        ),
        titleSmall: GoogleFonts.figtree(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: darkTextPrimaryColor,
        ),
        bodyLarge: GoogleFonts.figtree(
          fontSize: 16,
          fontWeight: FontWeight.normal,
          color: darkTextPrimaryColor,
        ),
        bodyMedium: GoogleFonts.figtree(
          fontSize: 14,
          fontWeight: FontWeight.normal,
          color: darkTextSecondaryColor,
        ),
        bodySmall: GoogleFonts.figtree(
          fontSize: 12,
          fontWeight: FontWeight.normal,
          color: darkTextSecondaryColor,
        ),
      ),
      cardTheme: CardTheme(
        color: darkCardColor,
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: darkPrimary,
          foregroundColor: Colors.white,
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: darkSecondary,
          side: BorderSide(color: darkSecondary),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: darkSecondary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: darkCardColor,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: darkDividerColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: darkDividerColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primaryColor, width: 2),
        ),
        labelStyle: const TextStyle(color: primaryColor),
        floatingLabelStyle: const TextStyle(color: primaryColor),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      textSelectionTheme: const TextSelectionThemeData(
        cursorColor: primaryColor,
        selectionColor: Color(0x66F57C00), // primaryColor with 40% opacity
        selectionHandleColor: primaryColor,
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: darkPrimary,
        foregroundColor: Colors.white,
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: darkCardColor,
        selectedItemColor: darkSecondary,
        unselectedItemColor: darkTextSecondaryColor,
        elevation: 8,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: MaterialStateProperty.resolveWith((states) {
          if (states.contains(MaterialState.selected)) {
            return darkSecondary;
          }
          return darkTextSecondaryColor;
        }),
        trackColor: MaterialStateProperty.resolveWith((states) {
          if (states.contains(MaterialState.selected)) {
            return darkSecondary.withOpacity(0.3);
          }
          return darkDividerColor;
        }),
      ),
      tabBarTheme: TabBarTheme(
        labelColor: darkTextPrimaryColor,
        unselectedLabelColor: darkTextSecondaryColor,
        indicatorColor: darkSecondary,
        dividerColor: darkDividerColor,
      ),
    );
  }

  // Helper metodlar - Modern theme system ile context-based kullanım

  // Yeni helper methodlar - Theme context ile kullanım için (Önerilen)
  static Color getBackgroundColor(BuildContext context) {
    return Theme.of(context).scaffoldBackgroundColor;
  }

  static Color getCardColor(BuildContext context) {
    return Theme.of(context).cardColor;
  }

  static Color getPrimaryTextColor(BuildContext context) {
    return Theme.of(context).textTheme.bodyLarge?.color ??
        (Theme.of(context).brightness == Brightness.dark
            ? darkTextPrimaryColor
            : lightTextPrimaryColor);
  }

  static Color getSecondaryTextColor(BuildContext context) {
    return Theme.of(context).textTheme.bodyMedium?.color ??
        (Theme.of(context).brightness == Brightness.dark
            ? darkTextSecondaryColor
            : lightTextSecondaryColor);
  }

  // Theme toggle method - Global kullanım için
  static Future<void> toggleTheme() async {
    await ThemeProvider().toggleTheme();
  }

  // Modern context-based helper metodlar
  static LinearGradient getMainGradient(BuildContext context) {
    return const LinearGradient(
      colors: [primaryColor, primaryDarkColor],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }

  static Color getRestDayCardColor(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark
        ? const Color(0xFF3F51B5).withAlpha(102)
        : AppTheme.primaryLightColor;
  }

  // Dinlenme günü için özel gradient
  static LinearGradient getRestDayGradient(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return LinearGradient(
      colors: isDark
          ? [
              const Color(0xFF3F51B5).withOpacity(0.3),
              const Color(0xFF7986CB).withOpacity(0.1),
            ]
          : [
              primaryLightColor.withOpacity(0.6),
              primaryLightColor.withOpacity(0.2),
            ],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }

  // Eski getter metodları - Geriye uyumluluk için (DEPRECATED - Yeni kodlarda context-based metodları kullanın)
  @Deprecated('Use getBackgroundColor(context) instead')
  static Color get backgroundColor => lightBackgroundColor;

  @Deprecated('Use getCardColor(context) instead')
  static Color get cardColor => lightCardColor;

  @Deprecated('Use getPrimaryTextColor(context) instead')
  static Color get textColor => lightTextPrimaryColor;

  @Deprecated('Use getPrimaryTextColor(context) instead')
  static Color get textPrimaryColor => lightTextPrimaryColor;

  @Deprecated('Use getSecondaryTextColor(context) instead')
  static Color get textSecondaryColor => lightTextSecondaryColor;

  @Deprecated('Use getSecondaryTextColor(context) instead')
  static Color get textLightColor => lightTextLightColor;

  @Deprecated('Use Theme.of(context).dividerColor instead')
  static Color get dividerColor => lightDividerColor;

  // Eksik metodlar - Geriye uyumluluk için
  @Deprecated('Use getRestDayCardColor(context) instead')
  static Color get restDayCardColor => primaryLightColor;

  @Deprecated('Use getMainGradient(context) instead')
  static LinearGradient get mainGradient => const LinearGradient(
        colors: [primaryColor, primaryDarkColor],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );

  @Deprecated('Use Theme.of(context).textTheme.headlineMedium instead')
  static TextStyle get headingStyle => GoogleFonts.figtree(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: lightTextPrimaryColor,
      );

  @Deprecated('Use Theme.of(context).textTheme.bodyMedium instead')
  static TextStyle get bodyStyle => GoogleFonts.figtree(
        fontSize: 14,
        fontWeight: FontWeight.normal,
        color: lightTextSecondaryColor,
      );
}
