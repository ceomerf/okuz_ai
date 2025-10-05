import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:okuz_ai/screens/auth_screen.dart';
import 'package:okuz_ai/providers/auth_provider.dart';

void main() {
  group('AuthScreen Widget Tests', () {
    testWidgets('should display login form initially', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: AuthScreen(),
          ),
        ),
      );

      expect(find.text('Giriş Yap'), findsOneWidget);
      expect(find.byType(TextField), findsNWidgets(2)); // Email and password fields
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Şifre'), findsOneWidget);
      expect(find.byType(ElevatedButton), findsOneWidget);
    });

    testWidgets('should switch to register form when register button is tapped', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: AuthScreen(),
          ),
        ),
      );

      // Tap register button
      await tester.tap(find.text('Kayıt Ol'));
      await tester.pumpAndSettle();

      expect(find.text('Kayıt Ol'), findsOneWidget);
      expect(find.byType(TextField), findsNWidgets(3)); // Name, email, password fields
    });

    testWidgets('should validate email field', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: AuthScreen(),
          ),
        ),
      );

      // Enter invalid email
      await tester.enterText(find.byType(TextField).first, 'invalid-email');
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      expect(find.text('Geçerli bir email adresi girin'), findsOneWidget);
    });

    testWidgets('should validate password field', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: AuthScreen(),
          ),
        ),
      );

      // Enter short password
      await tester.enterText(find.byType(TextField).last, '123');
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      expect(find.text('Şifre en az 6 karakter olmalıdır'), findsOneWidget);
    });

    testWidgets('should show loading indicator during login', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: AuthScreen(),
          ),
        ),
      );

      // Enter valid credentials
      await tester.enterText(find.byType(TextField).first, 'test@example.com');
      await tester.enterText(find.byType(TextField).last, 'password123');
      
      // Tap login button
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();

      // Should show loading indicator
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('should handle login success', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: AuthScreen(),
          ),
        ),
      );

      // Enter valid credentials
      await tester.enterText(find.byType(TextField).first, 'test@example.com');
      await tester.enterText(find.byType(TextField).last, 'password123');
      
      // Tap login button
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      // Should navigate to home screen or show success message
      expect(find.text('Giriş başarılı'), findsOneWidget);
    });

    testWidgets('should handle login error', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: AuthScreen(),
          ),
        ),
      );

      // Enter invalid credentials
      await tester.enterText(find.byType(TextField).first, 'invalid@example.com');
      await tester.enterText(find.byType(TextField).last, 'wrongpassword');
      
      // Tap login button
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      // Should show error message
      expect(find.text('Giriş başarısız'), findsOneWidget);
    });

    testWidgets('should toggle password visibility', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: AuthScreen(),
          ),
        ),
      );

      // Find password field
      final passwordField = find.byType(TextField).last;
      
      // Initially password should be obscured
      expect(tester.widget<TextField>(passwordField).obscureText, true);
      
      // Tap visibility toggle
      await tester.tap(find.byIcon(Icons.visibility));
      await tester.pump();
      
      // Password should be visible
      expect(tester.widget<TextField>(passwordField).obscureText, false);
    });
  });
}
