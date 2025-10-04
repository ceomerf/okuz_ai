// JWT Backend için basit Family Account servisi
// Firebase bağımlılığı tamamen kaldırıldı

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers.dart';
import 'api_client.dart';
import '../models/student_profile.dart';
import '../models/user_account.dart';
import '../models/account_type.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FamilyAccountState {
  final List<Map<String, dynamic>> familyMembers;
  final List<StudentProfile> studentProfiles;
  final String? selectedProfileId;
  final bool isLoading;
  final bool isFamilyAccount;
  final AccountType? accountType;
  const FamilyAccountState({
    this.familyMembers = const [],
    this.studentProfiles = const [],
    this.selectedProfileId,
    this.isLoading = false,
    this.isFamilyAccount = false,
    this.accountType,
  });

  FamilyAccountState copyWith({
    List<Map<String, dynamic>>? familyMembers,
    List<StudentProfile>? studentProfiles,
    String? selectedProfileId,
    bool? isLoading,
    bool? isFamilyAccount,
    AccountType? accountType,
  }) {
    return FamilyAccountState(
      familyMembers: familyMembers ?? this.familyMembers,
      studentProfiles: studentProfiles ?? this.studentProfiles,
      selectedProfileId: selectedProfileId ?? this.selectedProfileId,
      isLoading: isLoading ?? this.isLoading,
      isFamilyAccount: isFamilyAccount ?? this.isFamilyAccount,
      accountType: accountType ?? this.accountType,
    );
  }
}

class FamilyAccountService extends Notifier<FamilyAccountState> {
  late final ApiClient _apiClient;

  @override
  FamilyAccountState build() {
    _apiClient = ref.read(apiClientProvider);
    return const FamilyAccountState();
  }

  Future<UserAccount?> loadAccountData() async {
    state = state.copyWith(isLoading: true);

    try {
      // SharedPreferences'tan hesap tipini belirle
      final prefs = await SharedPreferences.getInstance();
      final isParentAccount = prefs.getBool('is_parent_account') ?? false;

      // Hesap tipini set et
      final determinedType = isParentAccount ? AccountType.parent : AccountType.student;

      // Gerçek veli/öğrenci bilgilerini al
      final parentName =
          prefs.getString('user_name') ?? 'Değerli Veli'; // user_name'i kullan
      final parentStudentName = prefs.getString('parent_student_name') ?? '';
      final parentRelationship = prefs.getString('parent_relationship') ?? '';

      // Gerçek öğrenci profillerini oluştur
      List<StudentProfile> profiles = [];

      // Eğer öğrenci adı varsa, gerçek profil oluştur
      if (parentStudentName.isNotEmpty) {
        profiles.add(
          StudentProfile(
            id: 'student_${DateTime.now().millisecondsSinceEpoch}',
            profileName: parentStudentName,
            studentName: parentStudentName,
            lastActive: DateTime.now(),
          ),
        );
      }

      final isFam = profiles.length > 1;
      final selectedId = profiles.isNotEmpty ? profiles.first.id : null;
      state = state.copyWith(
        studentProfiles: profiles,
        isFamilyAccount: isFam,
        selectedProfileId: selectedId,
        accountType: determinedType,
      );

      // Gerçek UserAccount döndür
      return UserAccount(
        id: 'parent_${DateTime.now().millisecondsSinceEpoch}',
        uid: 'parent_${DateTime.now().millisecondsSinceEpoch}',
        email: 'veli@okuz.ai', // Gerçek email için API'den alınabilir
        fullName: parentName,
        accountType: AccountType.parent,
        studentProfiles: profiles,
      );
    } catch (e) {
      // Hata durumunda listeyi temizle
      state = state.copyWith(studentProfiles: []);
      return null;
    } finally {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> switchToProfile(String profileId) async {
    try {
      state = state.copyWith(selectedProfileId: profileId);
      // Gerçek uygulamada API'ye profil değiştirme isteği gönderilir
    } catch (e) {
      // yut
    }
  }

  Future<void> updateAccountType(AccountType accountType) async {
    try {
      // Gerçek uygulamada API'ye hesap tipi güncelleme isteği gönderilir
      state = state.copyWith(accountType: accountType);
    } catch (e) {
      // yut
    }
  }

  Future<void> loadFamilyMembers() async {
    state = state.copyWith(isLoading: true);

    try {
      final response = await _apiClient.get('/family/members');
      final members = List<Map<String, dynamic>>.from(response['members'] ?? []);
      state = state.copyWith(familyMembers: members);
    } catch (e) {
      state = state.copyWith(familyMembers: []);
    } finally {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<bool> addFamilyMember(String email, String role) async {
    try {
      await _apiClient.post('/family/add-member', {
        'email': email,
        'role': role,
      });
      await loadFamilyMembers(); // Listeyi yenile
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> addStudent(String name, String grade) async {
    try {
      // Mock implementation
      final newStudent = StudentProfile(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        profileName: name,
        studentName: name,
        lastActive: DateTime.now(),
      );
      final updated = List<StudentProfile>.from(state.studentProfiles)..add(newStudent);
      state = state.copyWith(studentProfiles: updated);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> removeFamilyMember(String memberId) async {
    try {
      await _apiClient.post('/family/remove-member', {
        'memberId': memberId,
      });
      await loadFamilyMembers(); // Listeyi yenile
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> updateParentInfo({
    required String fullName,
    String? parentTitle,
  }) async {
    try {
      await _apiClient.post('/family/update-parent-info', {
        'fullName': fullName,
        'parentTitle': parentTitle,
      });
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getParentDashboardData({String? profileId}) async {
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

// Not: Provider tanımı services/providers.dart içine taşındı.
