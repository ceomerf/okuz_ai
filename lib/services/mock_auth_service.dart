import 'dart:async';
import '../models/user_account.dart';

class MockAuthService {
  static final MockAuthService _instance = MockAuthService._internal();
  factory MockAuthService() => _instance;
  MockAuthService._internal();

  static MockAuthService get instance => _instance;

  final StreamController<UserAccount?> _authStateController =
      StreamController<UserAccount?>.broadcast();
  UserAccount? _currentUser;

  Stream<UserAccount?> get authStateChanges => _authStateController.stream;

  Future<UserAccount?> signInWithEmail(String email, String password) async {
    // Her zaman başarılı bir giriş simüle edelim
    _currentUser = UserAccount(
        id: 'user1',
        uid: 'user1', // uid alanı eklendi
        email: email,
        fullName: 'Test User');
    _authStateController.add(_currentUser);
    return _currentUser;
  }

  Future<void> signOut() async {
    _currentUser = null;
    _authStateController.add(null);
  }

  UserAccount? get currentUser => _currentUser;

  void dispose() {
    _authStateController.close();
  }
}
