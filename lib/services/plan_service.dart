import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'dart:developer' as developer;

class PlanService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseFunctions _functions = FirebaseFunctions.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Kimlik doğrulama kontrolü için yardımcı metod
  Future<String?> _ensureAuthenticated() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Bu işlemi gerçekleştirmek için giriş yapmanız gerekiyor.');
    }
    
    // Önce kullanıcı nesnesini yenile, ardından token'ı al
    try {
      // Kullanıcı bilgilerini sunucudan yenile
      await user.reload();
      
      // Yenilenen kullanıcı nesnesini al
      final refreshedUser = _auth.currentUser;
      if (refreshedUser == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      // Yeni token'ı al (forceRefresh=true ile)
      final token = await refreshedUser.getIdToken(true);
      developer.log('Kimlik doğrulama token\'ı başarıyla yenilendi');
      return token;
    } catch (e) {
      developer.log('Token yenileme hatası: $e');
      throw Exception('Kimlik doğrulama hatası: $e');
    }
  }

  /// Kullanıcının onboarding verilerine göre kişiselleştirilmiş bir aylık çalışma planı oluşturur
  ///
  /// [grade]: Öğrencinin sınıf seviyesi (örn. "9", "10", "11", "12")
  /// [targetExam]: Hedeflenen sınav (opsiyonel, örn. "YKS", "LGS", null)
  /// [dailyHours]: Günlük çalışma saati
  /// [planScope]: Plan kapsamı ("full" = tüm müfredat, "custom" = seçilen dersler)
  /// [selectedSubjects]: Seçilen dersler listesi (planScope "custom" ise zorunlu)
  Future<Map<String, dynamic>> generateInitialLongTermPlan({
    required String grade,
    String? targetExam,
    required int dailyHours,
    required String planScope,
    required List<String> selectedSubjects,
    String? planType = 'regular',
  }) async {
    try {
      // Token'ı yenile ve al
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }
      
      // Güncel kullanıcı bilgisini al
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      // Kullanıcı dokümanının var olduğundan emin ol
      await _ensureUserDocumentExists(user);
      
      // Cloud Function'a gönderilecek verileri hazırla
      final data = {
        'grade': grade,
        'targetExam': targetExam,
        'dailyHours': dailyHours,
        'planScope': planScope,
        'selectedSubjects': selectedSubjects,
        'planType': planType,
        'uid': user.uid, // Kullanıcı ID'sini ekle
      };
      
      developer.log('Plan oluşturma isteği gönderiliyor: $data');
      
      // Firebase Functions'a istek gönder
      final callable = _functions.httpsCallable('generateInitialLongTermPlan');
      
      // İsteği gönder ve sonucu bekle
      final result = await callable.call(data);
      
      developer.log('Plan başarıyla oluşturuldu');
      return result.data;
    } catch (e) {
      developer.log('Plan oluşturma hatası: $e');
      throw Exception('Plan oluşturulamadı: $e');
    }
  }

  /// Kullanıcı dokümanının var olduğundan emin olur, yoksa oluşturur
  Future<void> _ensureUserDocumentExists(User user) async {
    try {
      final docRef = _firestore.doc('users/${user.uid}');
      final docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        await docRef.set({
          'email': user.email,
          'createdAt': FieldValue.serverTimestamp(),
          'onboardingCompleted': false
        });
      }
    } catch (e) {
      print('Kullanıcı dokümanı kontrol hatası: $e');
    }
  }

  /// Mevcut tarihin okul tatil dönemine denk gelip gelmediğini kontrol eder.
  /// Yeni checkHolidayStatus Cloud Function'ını kullanır.
  Future<Map<String, dynamic>> checkHolidayStatus() async {
    try {
      // Token'ı yenile
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }
      
      // Güncel kullanıcı bilgisini al
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      // Kullanıcı dokümanının var olduğundan emin ol
      await _ensureUserDocumentExists(user);

      final callable = _functions.httpsCallable('checkHolidayStatus');
      final result = await callable.call();

      // Fonksiyon sonucu direkt olarak tatil bilgilerini içerir
      return result.data as Map<String, dynamic>;
    } catch (e) {
      developer.log('Tatil durumu kontrol hatası (istemci): $e');
      // Hata durumunda, varsayılan değer döndür
      return {'isHoliday': false};
    }
  }

  /// Kullanıcının mevcut çalışma planını Firestore'dan getirir
  Future<Map<String, dynamic>?> getUserPlan() async {
    try {
      // Token'ı yenile
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }
      
      // Güncel kullanıcı bilgisini al
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      // Kullanıcı dokümanının var olduğundan emin ol
      await _ensureUserDocumentExists(user);

      // Plan dökümanını getir
      final snapshot =
          await _firestore.doc('users/${user.uid}/plan/user_plan').get();

      if (!snapshot.exists) {
        print('Kullanıcı için plan bulunamadı.');
        return null; // Plan yoksa null döndür
      }

      // Döküman verisini Map olarak döndür
      return snapshot.data() as Map<String, dynamic>;
    } catch (e) {
      print('Plan getirme hatası: $e');
      throw Exception('Çalışma planınız getirilirken bir hata oluştu: $e');
    }
  }

  /// Kullanıcının planını günceller
  Future<Map<String, dynamic>> updatePlan(Map<String, dynamic> currentPlan,
      Map<String, dynamic> modifications) async {
    try {
      // Token'ı yenile
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }
      
      // Güncel kullanıcı bilgisini al
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      // Kullanıcı dokümanının var olduğundan emin ol
      await _ensureUserDocumentExists(user);

      final callable = _functions.httpsCallable('updateUserPlan');
      final result = await callable.call({
        'currentPlan': currentPlan,
        'modifications': modifications,
        'uid': user.uid // Kullanıcı ID'sini ekle
      });

      if (result.data['success'] == true) {
        return result.data['updatedPlan'] as Map<String, dynamic>;
      } else {
        throw Exception('Plan güncelleme başarısız: ${result.data['error']}');
      }
    } on FirebaseFunctionsException catch (e) {
      print('Firebase Function Hatası (updatePlan): ${e.message}');
      throw Exception('Plan güncellenirken bir hata oluştu: ${e.message}');
    } catch (e) {
      print('Beklenmeyen Hata (updatePlan): $e');
      throw Exception('Beklenmeyen bir hata oluştu: $e');
    }
  }

  /// Belirli bir görevi tamamlandı olarak işaretle
  Future<void> markTaskAsCompleted(String taskId, bool isCompleted) async {
    try {
      // Token'ı yenile
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }
      
      // Güncel kullanıcı bilgisini al
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      // Kullanıcı dokümanının var olduğundan emin ol
      await _ensureUserDocumentExists(user);

      // Görevi güncelle
      await _firestore
          .doc('users/${user.uid}/plan/$taskId')
          .update({'completed': isCompleted});
    } catch (e) {
      print('Görev güncelleme hatası: $e');
      throw Exception('Görev güncellenirken bir hata oluştu: $e');
    }
  }

  /// Kullanıcının onboarding durumunu kontrol et
  Future<bool> checkOnboardingStatus() async {
    try {
      // Kullanıcının oturum açtığından emin ol
      final user = _auth.currentUser;
      if (user == null) {
        return false; // Giriş yapmamış kullanıcı onboarding'i tamamlamamış sayılır
      }

      // Kullanıcı token'ını yenile
      await user.reload();
      await user.getIdToken(true);

      // Kullanıcı dokümanını getir
      final doc = await _firestore.doc('users/${user.uid}').get();

      // Kullanıcı dökümanı yoksa oluştur
      if (!doc.exists) {
        await _firestore.doc('users/${user.uid}').set({
          'email': user.email,
          'createdAt': FieldValue.serverTimestamp(),
          'onboardingCompleted': false
        });
        return false;
      }

      // onboardingCompleted alanını kontrol et
      return (doc.data()?['onboardingCompleted'] as bool?) ?? false;
    } catch (e) {
      print('Onboarding durumu kontrol hatası: $e');
      return false; // Hata durumunda varsayılan olarak onboarding'i tamamlamamış say
    }
  }

  /// Onboarding durumunu güncelle
  Future<void> updateOnboardingStatus(bool completed) async {
    try {
      // Token'ı yenile
      final token = await _ensureAuthenticated();
      if (token == null) {
        throw Exception('Kimlik doğrulama token\'ı alınamadı.');
      }
      
      // Güncel kullanıcı bilgisini al
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu kapanmış. Lütfen tekrar giriş yapın.');
      }
      
      // Kullanıcı dokümanının var olduğundan emin ol
      await _ensureUserDocumentExists(user);

      // Kullanıcı dökümanını güncelle
      await _firestore
          .doc('users/${user.uid}')
          .update({'onboardingCompleted': completed});
    } catch (e) {
      print('Onboarding durumu güncelleme hatası: $e');
      throw Exception('Onboarding durumu güncellenirken bir hata oluştu: $e');
    }
  }
}
