import 'package:share_plus/share_plus.dart';
import '../models/invite_code.dart';
import '../services/api_client.dart';

class InviteCodeService {
  final ApiClient _apiClient;
  InviteCodeService(this._apiClient);

  // Veli -> Öğrenci davet kodu oluştur
  Future<InviteCode> createParentToStudentInviteCode() async {
    try {
      final response = await _apiClient.createInviteCode('PARENT_TO_STUDENT');
      return InviteCode.fromJson(response);
    } catch (e) {
      throw Exception('Öğrenci davet kodu oluşturma hatası: $e');
    }
  }

  // Öğrenci -> Veli davet kodu oluştur
  Future<InviteCode> createStudentToParentInviteCode() async {
    try {
      final response = await _apiClient.createInviteCode('STUDENT_TO_PARENT');
      return InviteCode.fromJson(response);
    } catch (e) {
      throw Exception('Veli davet kodu oluşturma hatası: $e');
    }
  }

  // Davet kodunu doğrula
  Future<InviteCode> verifyInviteCode(String code) async {
    try {
      final response = await _apiClient.verifyInviteCode(code);
      return InviteCode.fromJson(response);
    } catch (e) {
      throw Exception('Davet kodu doğrulama hatası: $e');
    }
  }

  // Davet kodunu kabul et
  Future<InviteCode> acceptInviteCode(String code) async {
    try {
      final response = await _apiClient.acceptInviteCode(code);
      return InviteCode.fromJson(response);
    } catch (e) {
      throw Exception('Davet kodu kabul hatası: $e');
    }
  }

  // Kullanıcının tüm davet kodlarını getir
  Future<List<InviteCode>> getInviteCodes() async {
    try {
      final response = await _apiClient.getInviteCodes();
      return (response as List)
          .map((item) => InviteCode.fromJson(item))
          .toList();
    } catch (e) {
      throw Exception('Davet kodları getirme hatası: $e');
    }
  }

  // Davet kodunu paylaş
  Future<void> shareInviteCode(String code, String type) async {
    try {
      String message;

      if (type == 'PARENT_TO_STUDENT') {
        message =
            'Okuz.ai uygulamasına davet edildim! Öğrenci hesabını oluşturmak için bu kodu kullan: $code';
      } else {
        message =
            'Okuz.ai uygulamasına davet edildim! Veli hesabını oluşturmak için bu kodu kullan: $code';
      }

      await Share.share(message);
    } catch (e) {
      throw Exception('Davet kodu paylaşma hatası: $e');
    }
  }
}
