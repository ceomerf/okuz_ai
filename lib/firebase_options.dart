import 'package:firebase_core/firebase_core.dart';

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    // Android için Firebase seçenekleri
    return const FirebaseOptions(
      apiKey: 'AIzaSyCqfVxul9rWTMiDogvvGWfEr6CpznWpkRA',
      appId: '1:123456789012:android:1234567890123456789012',
      messagingSenderId: '123456789012',
      projectId: 'okuz-ai',
      storageBucket: 'okuz-ai.appspot.com',
    );
  }
} 