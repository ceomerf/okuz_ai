import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import '../models/student_profile.dart';
import 'package:flutter/widgets.dart'; // Added for WidgetsBinding

/// Esnek aile/öğrenci hesap sistemini yöneten servis
class FamilyAccountService extends ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  UserAccount? _currentAccount;
  String? _selectedStudentId; // For parents viewing specific student data
  bool _isLoading = false;

  // Getters
  UserAccount? get currentAccount => _currentAccount;
  String? get selectedStudentId => _selectedStudentId;
  bool get isLoading => _isLoading;

  bool get isLoggedIn => _currentAccount != null;
  bool get isStudent => _currentAccount?.isStudent ?? false;
  bool get isParent => _currentAccount?.isParent ?? false;
  bool get hasParent => _currentAccount?.hasParent ?? false;
  bool get hasStudents => _currentAccount?.hasStudents ?? false;
  bool get isOnboardingCompleted =>
      _currentAccount?.isOnboardingCompleted ?? false;

  // Backward compatibility getters
  AccountType get accountType =>
      _currentAccount?.accountType ?? AccountType.student;
  bool get isFamilyAccount => isParent;
  String? get selectedProfileId => _selectedStudentId;

  // StudentProfile nesneleri döndüren getter
  List<StudentProfile> get studentProfiles {
    if (_currentAccount?.studentProfiles == null) return [];

    // Referansları gerçek profillere dönüştür
    return _currentAccount!.studentProfiles!
        .map((ref) => StudentProfile.fromStudentReference(ref))
        .toList();
  }

  /// Kullanıcı hesap verilerini yükle
  Future<UserAccount?> loadAccountData() async {
    _isLoading = true;
    // notifyListeners()'ı hemen çağırmayalım, build sırasında çakışma yaratabilir

    final user = _auth.currentUser;
    if (user == null) {
      _currentAccount = null;
      _isLoading = false;
      // Build tamamlandıktan sonra notify et
      WidgetsBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
      return null;
    }

    try {
      final doc = await _firestore.collection('users').doc(user.uid).get();

      if (doc.exists) {
        _currentAccount = UserAccount.fromMap({
          'userId': user.uid,
          ...doc.data()!,
        });

        // Eğer veli hesabıysa, öğrenci profillerini gerçek verilerle zenginleştir
        if (_currentAccount!.isParent &&
            _currentAccount!.studentProfiles != null) {
          // Öğrenci profilleri için gerçek verileri yükle
          await _enrichStudentProfiles();
        }
      } else {
        // Kullanıcı dokümanı yoksa, önce Cloud Functions'ın oluşturmasını bekle
        // Bu genellikle onboarding sırasında oluşur
        debugPrint(
            '⚠️ Kullanıcı dokümanı bulunamadı, onboarding tamamlanmamış olabilir');
        _currentAccount = null;
      }

      _isLoading = false;
      // Build tamamlandıktan sonra notify et
      WidgetsBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
      return _currentAccount;
    } catch (e) {
      debugPrint('Hesap verileri yüklenirken hata: $e');
      _currentAccount = null;
      _isLoading = false;
      // Build tamamlandıktan sonra notify et
      WidgetsBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
      return null;
    }
  }

  /// Öğrenci profillerini gerçek verilerle zenginleştir
  Future<void> _enrichStudentProfiles() async {
    if (_currentAccount == null ||
        !_currentAccount!.isParent ||
        _currentAccount!.studentProfiles == null) {
      return;
    }

    final updatedProfiles = <StudentReference>[];

    for (final ref in _currentAccount!.studentProfiles!) {
      try {
        // Öğrenci verileri
        final studentDoc =
            await _firestore.collection('users').doc(ref.studentUserId).get();
        if (!studentDoc.exists) {
          updatedProfiles.add(ref);
          continue;
        }

        // Gamification verileri
        final gamificationDoc = await _firestore
            .collection('users')
            .doc(ref.studentUserId)
            .collection('gamification')
            .doc('data')
            .get();

        // Çalışma verileri
        final studyStatsDoc = await _firestore
            .collection('users')
            .doc(ref.studentUserId)
            .collection('study_tracking')
            .doc('stats')
            .get();

        // Performans verileri
        final performanceDoc = await _firestore
            .collection('users')
            .doc(ref.studentUserId)
            .collection('performance_analytics')
            .doc('summary')
            .get();

        // Son aktivite zamanı
        final lastActiveDoc = await _firestore
            .collection('users')
            .doc(ref.studentUserId)
            .collection('activity')
            .doc('last_seen')
            .get();

        // Çalışma alışkanlıkları
        final habitsDoc = await _firestore
            .collection('users')
            .doc(ref.studentUserId)
            .collection('learning_habits')
            .doc('summary')
            .get();

        // Güncel durum
        final statusDoc = await _firestore
            .collection('users')
            .doc(ref.studentUserId)
            .collection('activity')
            .doc('current_status')
            .get();

        // Referansa ek verileri ekle
        final enrichedRef = StudentReference(
          studentUserId: ref.studentUserId,
          studentName: ref.studentName,
          studentEmail: ref.studentEmail,
          grade: ref.grade,
          addedAt: ref.addedAt,
          isActive: ref.isActive,
        );

        // Zenginleştirilmiş referansı ekle
        updatedProfiles.add(enrichedRef);
      } catch (e) {
        debugPrint(
            'Öğrenci profili zenginleştirme hatası (${ref.studentName}): $e');
        updatedProfiles.add(ref);
      }
    }

    // Güncellenmiş profilleri kaydet
    _currentAccount =
        _currentAccount!.copyWith(studentProfiles: updatedProfiles);
  }

  /// Yeni hesap oluştur (onboarding sonrası)
  Future<void> createAccount({
    required String fullName,
    required AccountType accountType,
    String? grade,
    String? targetUniversity,
    String? learningStyle,
    String? parentTitle,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('Kullanıcı oturum açmamış');

    _currentAccount = UserAccount(
      userId: user.uid,
      email: user.email ?? '',
      fullName: fullName,
      accountType: accountType,
      createdAt: DateTime.now(),
      grade: grade,
      targetUniversity: targetUniversity,
      learningStyle: learningStyle,
      parentTitle: parentTitle,
    );

    await _firestore
        .collection('users')
        .doc(user.uid)
        .set(_currentAccount!.toMap());
    notifyListeners();
  }

  /// Öğrenci hesabına veli ekle
  Future<void> connectParent({
    required String parentUserId,
    required String parentEmail,
    required String parentName,
  }) async {
    if (!isStudent) throw Exception('Sadece öğrenci hesabına veli eklenebilir');

    final user = _auth.currentUser;
    if (user == null) throw Exception('Kullanıcı oturum açmamış');

    // Update student's parent info
    final parentInfo = ParentInfo(
      parentUserId: parentUserId,
      parentEmail: parentEmail,
      parentName: parentName,
      connectedAt: DateTime.now(),
    );

    _currentAccount = _currentAccount!.copyWith(parentInfo: parentInfo);

    await _firestore.collection('users').doc(user.uid).update({
      'parentInfo': parentInfo.toMap(),
    });

    // Add student to parent's profile
    final studentRef = StudentReference(
      studentUserId: user.uid,
      studentName: _currentAccount!.fullName,
      studentEmail: _currentAccount!.email,
      grade: _currentAccount!.grade ?? '',
      addedAt: DateTime.now(),
    );

    await _firestore.collection('users').doc(parentUserId).update({
      'studentProfiles': FieldValue.arrayUnion([studentRef.toMap()]),
    });

    notifyListeners();
  }

  /// Veli hesabına öğrenci ekle
  Future<void> addStudent({
    required String studentUserId,
    required String studentName,
    required String studentEmail,
    required String grade,
  }) async {
    if (!isParent) throw Exception('Sadece veli hesabına öğrenci eklenebilir');

    final user = _auth.currentUser;
    if (user == null) throw Exception('Kullanıcı oturum açmamış');

    // Create student reference
    final studentRef = StudentReference(
      studentUserId: studentUserId,
      studentName: studentName,
      studentEmail: studentEmail,
      grade: grade,
      addedAt: DateTime.now(),
    );

    // Update parent's student list
    final updatedStudents =
        List<StudentReference>.from(_currentAccount?.studentProfiles ?? []);
    updatedStudents.add(studentRef);

    _currentAccount =
        _currentAccount!.copyWith(studentProfiles: updatedStudents);

    await _firestore.collection('users').doc(user.uid).update({
      'studentProfiles': updatedStudents.map((s) => s.toMap()).toList(),
    });

    // Update student's parent info
    final parentInfo = ParentInfo(
      parentUserId: user.uid,
      parentEmail: _currentAccount!.email,
      parentName: _currentAccount!.fullName,
      connectedAt: DateTime.now(),
    );

    await _firestore.collection('users').doc(studentUserId).update({
      'parentInfo': parentInfo.toMap(),
    });

    notifyListeners();
  }

  /// Veli tarafından belirli bir öğrenciyi seç
  void selectStudent(String studentUserId) {
    if (!isParent) throw Exception('Sadece veli hesabı öğrenci seçebilir');

    final hasStudent = _currentAccount?.studentProfiles?.any(
          (s) => s.studentUserId == studentUserId,
        ) ??
        false;

    if (!hasStudent) throw Exception('Bu öğrenci bu veli hesabına bağlı değil');

    _selectedStudentId = studentUserId;
    notifyListeners();
  }

  /// Seçili öğrenciyi temizle
  void clearSelectedStudent() {
    _selectedStudentId = null;
    notifyListeners();
  }

  /// Hesap tipini al (backward compatibility)
  Future<AccountType> getAccountType(String userId) async {
    try {
      final doc = await _firestore.collection('users').doc(userId).get();
      if (doc.exists) {
        final data = doc.data()!;
        return AccountType.values.firstWhere(
          (e) => e.name == data['accountType'],
          orElse: () => AccountType.student,
        );
      }
      return AccountType.student;
    } catch (e) {
      debugPrint('Hesap tipi alınırken hata: $e');
      return AccountType.student;
    }
  }

  /// Kullanıcı verilerini güncelle
  Future<void> updateUserData(Map<String, dynamic> updates) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('Kullanıcı oturum açmamış');

    await _firestore.collection('users').doc(user.uid).update(updates);
    await loadAccountData(); // Refresh data
  }

  /// Hesaptan çıkış
  Future<void> signOut() async {
    _currentAccount = null;
    _selectedStudentId = null;
    notifyListeners();
  }

  /// Veli kontrol paneli için verileri topla
  Future<Map<String, dynamic>> getParentDashboardData({
    required String profileId,
  }) async {
    if (!isParent)
      throw Exception('Sadece veli hesabı dashboard verilerine erişebilir');

    try {
      // Temel profil verilerini al
      final profileDoc =
          await _firestore.collection('users').doc(profileId).get();

      if (!profileDoc.exists) {
        throw Exception('Öğrenci profili bulunamadı');
      }

      final profileData = profileDoc.data()!;

      // Gamification verilerini al
      Map<String, dynamic>? gamificationData;
      try {
        final gamificationDoc = await _firestore
            .collection('users')
            .doc(profileId)
            .collection('gamification')
            .doc('data')
            .get();

        if (gamificationDoc.exists) {
          gamificationData = gamificationDoc.data();
        }
      } catch (e) {
        debugPrint('Gamification verileri alınamadı: $e');
      }

      // Haftalık istatistikleri hesapla
      final weekStart =
          DateTime.now().subtract(Duration(days: DateTime.now().weekday - 1));
      final weekEnd = weekStart.add(const Duration(days: 6));

      Map<String, dynamic> weeklyStats = {
        'completedTasks': 0,
        'totalStudyTime': 0,
        'averageScore': 0,
        'streak': gamificationData?['streak'] ?? 0,
      };

      // Son oturumları al (örnek veri - gerçekte plan verilerinden alınacak)
      List<dynamic> recentSessions = [
        {
          'subject': 'Matematik',
          'topic': 'Türev',
          'duration': 45,
          'completedAt': DateTime.now()
              .subtract(const Duration(hours: 2))
              .toIso8601String(),
          'score': 85,
        },
        {
          'subject': 'Fizik',
          'topic': 'Hareket',
          'duration': 30,
          'completedAt': DateTime.now()
              .subtract(const Duration(hours: 5))
              .toIso8601String(),
          'score': 78,
        },
      ];

      return {
        'profile': profileData,
        'gamification': gamificationData,
        'weeklyStats': weeklyStats,
        'recentSessions': recentSessions,
      };
    } catch (e) {
      debugPrint('Dashboard verileri alınırken hata: $e');
      rethrow;
    }
  }

  /// Hesap türünü değiştir (özel durumlar için)
  Future<void> changeAccountType(AccountType newType) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('Kullanıcı oturum açmamış');

    await _firestore.collection('users').doc(user.uid).update({
      'accountType': newType.name,
    });

    await loadAccountData();
  }

  /// Öğrenci-veli bağlantısını kaldır
  Future<void> disconnectParent() async {
    if (!isStudent || !hasParent) {
      throw Exception('Öğrenci hesabında veli bağlantısı yok');
    }

    final user = _auth.currentUser;
    if (user == null) throw Exception('Kullanıcı oturum açmamış');

    final parentUserId = _currentAccount!.parentInfo!.parentUserId!;

    // Remove parent info from student
    await _firestore.collection('users').doc(user.uid).update({
      'parentInfo': FieldValue.delete(),
    });

    // Remove student from parent's list
    await _firestore.collection('users').doc(parentUserId).update({
      'studentProfiles': FieldValue.arrayRemove([
        {
          'studentUserId': user.uid,
          'studentName': _currentAccount!.fullName,
          'studentEmail': _currentAccount!.email,
          'grade': _currentAccount!.grade ?? '',
          'addedAt':
              _currentAccount!.parentInfo!.connectedAt!.millisecondsSinceEpoch,
        }
      ]),
    });

    await loadAccountData();
  }

  /// Profil değiştir (veli için öğrenci seçimi)
  Future<void> switchToProfile(String profileId) async {
    if (!isParent) {
      debugPrint('❌ Sadece veli hesapları profil değiştirebilir');
      return;
    }

    // Check if the profile exists
    final profileExists = _currentAccount?.studentProfiles
            ?.any((profile) => profile.studentUserId == profileId) ??
        false;

    if (!profileExists) {
      debugPrint('❌ Profil bulunamadı: $profileId');
      return;
    }

    _selectedStudentId = profileId;
    notifyListeners();
    debugPrint('✅ Profil değiştirildi: $profileId');
  }

  /// Hesap tipini güncelle
  Future<void> updateAccountType(AccountType accountType) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturumu bulunamadı');
    }

    await _firestore.doc('users/${user.uid}').update({
      'accountType': accountType.name,
    });

    // Local state'i güncelle
    if (_currentAccount != null) {
      _currentAccount = UserAccount(
        userId: _currentAccount!.userId,
        email: _currentAccount!.email,
        fullName: _currentAccount!.fullName,
        accountType: accountType,
        createdAt: _currentAccount!.createdAt,
        parentInfo: _currentAccount!.parentInfo,
        grade: _currentAccount!.grade,
        targetUniversity: _currentAccount!.targetUniversity,
        learningStyle: _currentAccount!.learningStyle,
        studentProfiles: _currentAccount!.studentProfiles,
        parentTitle: _currentAccount!.parentTitle,
      );
      notifyListeners();
    }

    debugPrint('✅ Hesap tipi güncellendi: ${accountType.name}');
  }

  /// Veli bilgilerini güncelle
  Future<void> updateParentInfo({
    required String fullName,
    String? parentTitle,
  }) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturumu bulunamadı');
    }

    await _firestore.doc('users/${user.uid}').update({
      'fullName': fullName,
      'parentTitle': parentTitle,
    });

    // Local state'i güncelle
    if (_currentAccount != null) {
      _currentAccount = UserAccount(
        userId: _currentAccount!.userId,
        email: _currentAccount!.email,
        fullName: fullName,
        accountType: _currentAccount!.accountType,
        createdAt: _currentAccount!.createdAt,
        parentInfo: _currentAccount!.parentInfo,
        grade: _currentAccount!.grade,
        targetUniversity: _currentAccount!.targetUniversity,
        learningStyle: _currentAccount!.learningStyle,
        studentProfiles: _currentAccount!.studentProfiles,
        parentTitle: parentTitle,
      );
      notifyListeners();
    }

    debugPrint('✅ Veli bilgileri güncellendi');
  }
}
