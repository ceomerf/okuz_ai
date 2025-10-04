import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_client.dart';
import '../screens/account_type_selection_screen.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/providers.dart';

/// 401 hatası yakalandığında kullanıcıyı otomatik olarak login ekranına yönlendiren widget
class AuthExpiredHandler extends ConsumerStatefulWidget {
  final Widget child;

  const AuthExpiredHandler({
    Key? key,
    required this.child,
  }) : super(key: key);

  @override
  ConsumerState<AuthExpiredHandler> createState() => _AuthExpiredHandlerState();
}

class _AuthExpiredHandlerState extends ConsumerState<AuthExpiredHandler> {
  @override
  void initState() {
    super.initState();
    // Auth expired stream'ini dinle
    print('🔍 AuthExpiredHandler: Stream dinlemeye başlıyor...');
    ApiClient.authExpiredStream.listen((_) {
      print('🔍 AuthExpiredHandler: Auth expired event yakalandı!');
      _handleAuthExpired();
    });
    
    // Alternatif: Her 2 saniyede bir token kontrolü yap
    _startTokenCheck();
  }
  
  void _startTokenCheck() {
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        _checkTokenExpiry(); // Token süresini kontrol et
        _startTokenCheck(); // Tekrar et
      }
    });
  }
  
  void _checkTokenStatus() async {
    try {
      // Basit bir API çağrısı yap
      final apiClient = ref.read(apiClientProvider);
      await apiClient.healthCheck();
    } catch (e) {
      // Eğer 401 hatası varsa, direkt yönlendirme yap
      if (e.toString().contains('401') || e.toString().contains('Unauthorized')) {
        print('🔍 AuthExpiredHandler: 401 hatası tespit edildi, yönlendirme yapılıyor...');
        _handleAuthExpired();
      }
    }
  }
  
  // Alternatif: Token süresini kontrol et
  void _checkTokenExpiry() async {
    try {
      final secureStorage = const FlutterSecureStorage();
      final token = await secureStorage.read(key: 'jwt_token');
      
      if (token != null) {
        // JWT token'ı decode et ve süresini kontrol et
        final parts = token.split('.');
        if (parts.length == 3) {
          final payload = parts[1];
          final normalized = base64Url.normalize(payload);
          final resp = utf8.decode(base64Url.decode(normalized));
          final payloadMap = json.decode(resp);
          
          final exp = payloadMap['exp'];
          if (exp != null) {
            final expiryDate = DateTime.fromMillisecondsSinceEpoch(exp * 1000);
            final now = DateTime.now();
            
            if (now.isAfter(expiryDate)) {
              print('🔍 AuthExpiredHandler: Token süresi dolmuş, yönlendirme yapılıyor...');
              _handleAuthExpired();
            }
          }
        }
      }
    } catch (e) {
      print('🔍 AuthExpiredHandler: Token kontrol hatası: $e');
    }
  }

  void _handleAuthExpired() async {
    if (mounted) {
      // Token'ları temizle
      final prefs = await SharedPreferences.getInstance();
      final secureStorage = const FlutterSecureStorage();
      await secureStorage.deleteAll();
      await prefs.clear();

      // Kullanıcıya bilgi ver
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text(
            'Oturum süresi doldu. Lütfen yeniden giriş yapın.',
            style: TextStyle(color: Colors.white),
          ),
          backgroundColor: Colors.orange,
          duration: const Duration(seconds: 3),
          action: SnackBarAction(
            label: 'Tamam',
            textColor: Colors.white,
            onPressed: () {
              ScaffoldMessenger.of(context).hideCurrentSnackBar();
            },
          ),
        ),
      );

      // Hesap tipi seçim ekranına yönlendir
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (context) => const AccountTypeSelectionScreen(),
        ),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
