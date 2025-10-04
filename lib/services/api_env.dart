// Ortam değişkenleri --dart-define ile yönetilir
// Örnek:
// flutter run --dart-define=API_BASE_URL=https://api-dev.example.com --dart-define=WS_BASE_URL=wss://api-dev.example.com

class ApiEnv {
  static const String _prodUrl = 'http://37.60.224.91';
  // Mobil platforma göre doğru localhost adresini seç (Android emülatörü: 10.0.2.2)
  static String get baseUrl {
    const env = String.fromEnvironment('API_BASE_URL');
    if (env.isNotEmpty) return env;

    // Varsayılan: üretim sunucusu (hem debug hem release). Yereli kullanmak istersen
    // --dart-define=API_BASE_URL=... ile override et.
    return _prodUrl;
  }

  static String get wsUrl {
    const env = String.fromEnvironment('WS_BASE_URL');
    if (env.isNotEmpty) return env;
    return baseUrl.replaceFirst('http', 'ws');
  }
}

