import 'dart:async';
import '../services/api_service.dart';
import '../models/user_account.dart';

class UserRepository {
  final ApiService _apiService = ApiService();

  // Singleton pattern
  static final UserRepository _instance = UserRepository._internal();
  factory UserRepository() => _instance;
  UserRepository._internal();

  // Stream controller for real-time updates (simulated)
  final StreamController<UserAccount?> _userController =
      StreamController<UserAccount?>.broadcast();

  Stream<UserAccount?> get userStream => _userController.stream;

  // Kullanıcı verilerini getir
  Future<UserAccount?> getUser(String userId) async {
    try {
      final response = await _apiService.getUser(userId);
      final user = UserAccount.fromJson(response);
      _userController.add(user);
      return user;
    } catch (e) {
      _userController.add(null);
      return null;
    }
  }

  // Kullanıcı verilerini güncelle
  Future<UserAccount?> updateUser(
      String userId, Map<String, dynamic> data) async {
    try {
      final response = await _apiService.updateUser(userId, data);
      final user = UserAccount.fromJson(response);
      _userController.add(user);
      return user;
    } catch (e) {
      return null;
    }
  }

  // Stream'i dispose et
  void dispose() {
    _userController.close();
  }
}
