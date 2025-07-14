import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

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
  
  // Koyu tema renkleri
  static const Color darkBackgroundColor = Color(0xFF121212);
  static const Color darkCardColor = Color(0xFF1E1E1E);
  static const Color darkDividerColor = Color(0xFF323232);
  static const Color darkTextPrimaryColor = Color(0xFFECEFF1);
  static const Color darkTextSecondaryColor = Color(0xFFB0BEC5);
  static const Color darkTextLightColor = Color(0xFF78909C);
  
  // Durum renkleri
  static const Color successColor = Color(0xFF4CAF50);
  static const Color errorColor = Color(0xFFD32F2F); // Daha belirgin bir kırmızı
  static const Color warningColor = Color(0xFFFFC107); // Amber
  static const Color infoColor = Color(0xFF0288D1); // Açık Mavi
  
  // Mevcut tema için renkler
  static bool get _isDarkMode => themeNotifier.value == ThemeMode.dark;
  static Color get backgroundColor => _isDarkMode ? darkBackgroundColor : lightBackgroundColor;
  static Color get cardColor => _isDarkMode ? darkCardColor : lightCardColor;
  static Color get restDayCardColor => _isDarkMode ? AppTheme.primaryColor.withOpacity(0.4) : AppTheme.primaryLightColor;
  static Color get dividerColor => _isDarkMode ? darkDividerColor : lightDividerColor;
  static Color get textPrimaryColor => _isDarkMode ? darkTextPrimaryColor : lightTextPrimaryColor;
  static Color get textSecondaryColor => _isDarkMode ? darkTextSecondaryColor : lightTextSecondaryColor;
  static Color get textLightColor => _isDarkMode ? darkTextLightColor : lightTextLightColor;
  // Hataları düzeltmek için eski 'textColor' yerine bunu kullanalım
  static Color get textColor => textPrimaryColor;

  // Tema modu için ValueNotifier
  static final ValueNotifier<ThemeMode> themeNotifier = ValueNotifier(ThemeMode.light);
  
  // Tema modunu değiştir
  static void toggleTheme() {
    themeNotifier.value = themeNotifier.value == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
  }

  // Açık tema
  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      primaryColor: primaryColor,
      primaryColorDark: primaryDarkColor,
      primaryColorLight: primaryLightColor,
      colorScheme: ColorScheme.light(
        primary: primaryColor,
        secondary: accentColor,
        background: lightBackgroundColor,
        error: errorColor,
        surface: lightCardColor,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onBackground: lightTextPrimaryColor,
        onSurface: lightTextPrimaryColor,
        onError: Colors.white,
      ),
      scaffoldBackgroundColor: lightBackgroundColor,
      cardColor: lightCardColor,
      dividerColor: lightDividerColor,
      
      // Appbar teması
      appBarTheme: const AppBarTheme(
        backgroundColor: lightCardColor,
        elevation: 0,
        iconTheme: IconThemeData(color: lightTextPrimaryColor),
        titleTextStyle: TextStyle(
          color: lightTextPrimaryColor,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
      
      // Buton teması
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 0,
          disabledBackgroundColor: Colors.grey.shade300,
          disabledForegroundColor: Colors.grey.shade500,
        ),
      ),
      
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primaryColor,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        ),
      ),
      
      // Metin teması
      textTheme: GoogleFonts.poppinsTextTheme().copyWith(
        displayLarge: GoogleFonts.poppins(
          color: lightTextPrimaryColor,
          fontSize: 26,
          fontWeight: FontWeight.bold,
        ),
        displayMedium: GoogleFonts.poppins(
          color: lightTextPrimaryColor,
          fontSize: 22,
          fontWeight: FontWeight.bold,
        ),
        displaySmall: GoogleFonts.poppins(
          color: lightTextPrimaryColor,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        headlineMedium: GoogleFonts.poppins(
          color: lightTextPrimaryColor,
          fontSize: 16,
          fontWeight: FontWeight.bold,
        ),
        headlineSmall: GoogleFonts.poppins(
          color: lightTextPrimaryColor,
          fontSize: 14,
          fontWeight: FontWeight.bold,
        ),
        titleLarge: GoogleFonts.poppins(
          color: lightTextPrimaryColor,
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
        titleMedium: GoogleFonts.poppins(
          color: lightTextSecondaryColor,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
        bodyLarge: GoogleFonts.poppins(
          color: lightTextPrimaryColor,
          fontSize: 16,
        ),
        bodyMedium: GoogleFonts.poppins(
          color: lightTextSecondaryColor,
          fontSize: 14,
        ),
        bodySmall: GoogleFonts.poppins(
          color: lightTextLightColor,
          fontSize: 12,
        ),
      ),
      
      // Kart teması
      cardTheme: CardTheme(
        color: lightCardColor,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        shadowColor: Colors.black.withOpacity(0.1),
      ),
      
      // Input teması
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
          borderSide: BorderSide(color: primaryColor, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: errorColor, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
    );
  }
  
  // Koyu tema
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: primaryColor,
      primaryColorDark: primaryDarkColor,
      primaryColorLight: primaryLightColor,
      colorScheme: ColorScheme.dark(
        primary: primaryColor,
        secondary: accentColor,
        background: darkBackgroundColor,
        error: errorColor,
        surface: darkCardColor,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onBackground: darkTextPrimaryColor,
        onSurface: darkTextPrimaryColor,
        onError: Colors.white,
      ),
      scaffoldBackgroundColor: darkBackgroundColor,
      cardColor: darkCardColor,
      dividerColor: darkDividerColor,
      
      // Appbar teması
      appBarTheme: const AppBarTheme(
        backgroundColor: darkCardColor,
        elevation: 0,
        iconTheme: IconThemeData(color: darkTextPrimaryColor),
        titleTextStyle: TextStyle(
          color: darkTextPrimaryColor,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
      
      // Buton teması
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 0,
          disabledBackgroundColor: Colors.grey.shade700,
          disabledForegroundColor: Colors.grey.shade500,
        ),
      ),
      
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primaryLightColor,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        ),
      ),
      
      // Metin teması
      textTheme: GoogleFonts.poppinsTextTheme().copyWith(
        displayLarge: GoogleFonts.poppins(
          color: darkTextPrimaryColor,
          fontSize: 26,
          fontWeight: FontWeight.bold,
        ),
        displayMedium: GoogleFonts.poppins(
          color: darkTextPrimaryColor,
          fontSize: 22,
          fontWeight: FontWeight.bold,
        ),
        displaySmall: GoogleFonts.poppins(
          color: darkTextPrimaryColor,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        headlineMedium: GoogleFonts.poppins(
          color: darkTextPrimaryColor,
          fontSize: 16,
          fontWeight: FontWeight.bold,
        ),
        headlineSmall: GoogleFonts.poppins(
          color: darkTextPrimaryColor,
          fontSize: 14,
          fontWeight: FontWeight.bold,
        ),
        titleLarge: GoogleFonts.poppins(
          color: darkTextPrimaryColor,
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
        titleMedium: GoogleFonts.poppins(
          color: darkTextSecondaryColor,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
        bodyLarge: GoogleFonts.poppins(
          color: darkTextPrimaryColor,
          fontSize: 16,
        ),
        bodyMedium: GoogleFonts.poppins(
          color: darkTextSecondaryColor,
          fontSize: 14,
        ),
        bodySmall: GoogleFonts.poppins(
          color: darkTextLightColor,
          fontSize: 12,
        ),
      ),
      
      // Kart teması
      cardTheme: CardTheme(
        color: darkCardColor,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        shadowColor: Colors.black.withOpacity(0.3),
      ),
      
      // Input teması
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
          borderSide: BorderSide(color: accentColor, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: errorColor, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
    );
  }
  
  // Mevcut tema
  static ThemeData get currentTheme => _isDarkMode ? darkTheme : lightTheme;
} 