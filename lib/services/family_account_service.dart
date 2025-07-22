// JWT Backend için basit Family Account servisi
// Firebase bağımlılığı tamamen kaldırıldı

import 'package:flutter/material.dart';
import 'api_client.dart';
import '../models/student_profile.dart';
import '../models/user_account.dart';
import '../models/account_type.dart';

class FamilyAccountService extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  List<Map<String, dynamic>> _familyMembers = [];
  List<StudentProfile> _studentProfiles = [];
  String? _selectedProfileId;
  bool _isLoading = false;
  bool _isFamilyAccount = false;

  List<Map<String, dynamic>> get familyMembers => _familyMembers;
  List<StudentProfile> get studentProfiles => _studentProfiles;
  String? get selectedProfileId => _selectedProfileId;
  bool get isLoading => _isLoading;
  bool get isFamilyAccount => _isFamilyAccount;
  AccountType get accountType => AccountType.parent; // Mock implementation

  // Hesap verilerini yükle
  Future<UserAccount?> loadAccountData() async {
    _isLoading = true;
    notifyListeners();

    try {
      // Mock veri - gerçek uygulamada API'den gelecek
      _studentProfiles = [
        StudentProfile(
          id: '1',
          profileName: 'Ali Yılmaz',
          studentName: 'Ali Yılmaz',
          lastActive: DateTime.now(),
        ),
        StudentProfile(
          id: '2',
          profileName: 'Ayşe Yılmaz',
          studentName: 'Ayşe Yılmaz',
          lastActive: DateTime.now().subtract(Duration(hours: 2)),
        ),
      ];
      _isFamilyAccount = _studentProfiles.length > 1;
      _selectedProfileId =
          _studentProfiles.isNotEmpty ? _studentProfiles.first.id : null;

      // Mock UserAccount döndür
      return UserAccount(
        id: 'parent_1',
        uid: 'parent_1',
        email: 'parent@example.com',
        fullName: 'Veli Yılmaz',
        accountType: AccountType.parent,
      );
    } catch (e) {
      debugPrint('Hesap verileri yükleme hatası: $e');
      _studentProfiles = [];
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Profil değiştir
  Future<void> switchToProfile(String profileId) async {
    try {
      _selectedProfileId = profileId;
      notifyListeners();
      // Gerçek uygulamada API'ye profil değiştirme isteği gönderilir
    } catch (e) {
      debugPrint('Profil değiştirme hatası: $e');
    }
  }

  // Hesap tipini güncelle
  Future<void> updateAccountType(AccountType accountType) async {
    try {
      // Gerçek uygulamada API'ye hesap tipi güncelleme isteği gönderilir
      notifyListeners();
    } catch (e) {
      debugPrint('Hesap tipi güncelleme hatası: $e');
    }
  }

  // Aile üyelerini getir
  Future<void> loadFamilyMembers() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiClient.get('/family/members');
      _familyMembers =
          List<Map<String, dynamic>>.from(response['members'] ?? []);
    } catch (e) {
      debugPrint('Aile üyeleri yükleme hatası: $e');
      _familyMembers = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Aile üyesi ekle
  Future<bool> addFamilyMember(String email, String role) async {
    try {
      await _apiClient.post('/family/add-member', {
        'email': email,
        'role': role,
      });
      await loadFamilyMembers(); // Listeyi yenile
      return true;
    } catch (e) {
      debugPrint('Aile üyesi ekleme hatası: $e');
      return false;
    }
  }

  // Öğrenci ekle (mock implementation)
  Future<bool> addStudent(String name, String grade) async {
    try {
      // Mock implementation
      final newStudent = StudentProfile(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        profileName: name,
        studentName: name,
        lastActive: DateTime.now(),
      );
      _studentProfiles.add(newStudent);
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Öğrenci ekleme hatası: $e');
      return false;
    }
  }

  // Aile üyesi kaldır
  Future<bool> removeFamilyMember(String memberId) async {
    try {
      await _apiClient.post('/family/remove-member', {
        'memberId': memberId,
      });
      await loadFamilyMembers(); // Listeyi yenile
      return true;
    } catch (e) {
      debugPrint('Aile üyesi kaldırma hatası: $e');
      return false;
    }
  }

  // Veli bilgilerini güncelle
  Future<void> updateParentInfo({
    required String fullName,
    String? parentTitle,
  }) async {
    try {
      await _apiClient.post('/family/update-parent-info', {
        'fullName': fullName,
        'parentTitle': parentTitle,
      });
      notifyListeners();
    } catch (e) {
      debugPrint('Veli bilgileri güncelleme hatası: $e');
      rethrow;
    }
  }

  // Mock method for parent dashboard data
  Future<Map<String, dynamic>> getParentDashboardData(
      {String? profileId}) async {
    // Mock implementation
    return {
      'studentName': 'Ali Yılmaz',
      'totalStudyTime': 120, // minutes
      'completedTasks': 15,
      'totalTasks': 20,
      'streak': 7,
      'currentLevel': 5,
      'weeklyProgress': 75.0,
    };
  }
}
