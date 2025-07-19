import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// Premium abonelik durumunu yöneten servis sınıfı
class PremiumService {
  static final PremiumService _instance = PremiumService._internal();
  factory PremiumService() => _instance;
  PremiumService._internal();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Kullanıcının premium durumunu kontrol eder
  Future<bool> isPremiumUser() async {
    try {
      final user = _auth.currentUser;
      if (user == null) return false;

      // Firestore'dan kullanıcının premium durumunu çek
      final userDoc = await _firestore.collection('users').doc(user.uid).get();

      if (userDoc.exists) {
        final data = userDoc.data();
        return data?['isPremium'] ?? false;
      }

      return false;
    } catch (e) {
      print('Premium durum kontrolü hatası: $e');
      return false;
    }
  }

  /// Kullanıcının premium durumunu Stream olarak dinler (real-time updates için)
  Stream<bool> premiumStatusStream() {
    final user = _auth.currentUser;
    if (user == null) {
      return Stream.value(false);
    }

    return _firestore.collection('users').doc(user.uid).snapshots().map((doc) {
      if (doc.exists) {
        final data = doc.data();
        return data?['isPremium'] ?? false;
      }
      return false;
    });
  }

  /// Kullanıcıyı premium yapar (test amaçlı)
  Future<void> upgradeToPremium() async {
    try {
      final user = _auth.currentUser;
      if (user == null) throw Exception('Kullanıcı bulunamadı');

      await _firestore.collection('users').doc(user.uid).set({
        'isPremium': true,
        'premiumUpgradeDate': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      print('Kullanıcı premium yapıldı');
    } catch (e) {
      print('Premium upgrade hatası: $e');
      rethrow;
    }
  }

  /// Premium aboneliği iptal eder (test amaçlı)
  Future<void> cancelPremium() async {
    try {
      final user = _auth.currentUser;
      if (user == null) throw Exception('Kullanıcı bulunamadı');

      await _firestore.collection('users').doc(user.uid).set({
        'isPremium': false,
        'premiumCancelDate': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      print('Premium abonelik iptal edildi');
    } catch (e) {
      print('Premium iptal hatası: $e');
      rethrow;
    }
  }

  /// Kullanıcının premium olmayan durumda erişebileceği gün sayısını döndürür
  int getFreeDaysLimit() {
    return 3; // İlk 3 gün ücretsiz
  }

  /// Belirtilen gün indeksinin kilitli olup olmadığını kontrol eder
  bool isDayLocked(int dayIndex, bool isPremium) {
    if (isPremium)
      return false; // Premium kullanıcılar için hiçbir gün kilitli değil
    return dayIndex >= getFreeDaysLimit(); // 3. günden sonrası kilitli
  }

  /// Kullanıcının kaç gün kalan ücretsiz erişimi olduğunu hesaplar
  int getRemainingFreeDays(int currentDayIndex, bool isPremium) {
    if (isPremium) return -1; // Premium kullanıcılar için sınırsız
    final freeDaysLimit = getFreeDaysLimit();
    final remaining = freeDaysLimit - currentDayIndex;
    return remaining > 0 ? remaining : 0;
  }

  /// Premium olmayan kullanıcı için uyarı mesajı oluşturur
  String getUpgradeMessage(int dayIndex) {
    final remainingDays = getRemainingFreeDays(dayIndex, false);
    if (remainingDays > 0) {
      return 'Ücretsiz deneme sürenizin $remainingDays günü kaldı. Premium\'a geçerek tüm plana erişebilirsiniz.';
    } else {
      return 'Tüm çalışma planınıza erişmek için Premium\'a geçin. İlk 3 gün ücretsizdir!';
    }
  }
}
