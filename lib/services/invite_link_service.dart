import 'package:share_plus/share_plus.dart';
import 'dart:async';
import '../services/api_client.dart';

class InviteLinkService {
  // API istemcisi
  final ApiClient _apiClient;
  InviteLinkService(this._apiClient);

  // Deep Link servisi
  // final DeepLinkService _deepLinkService = DeepLinkService(); // This line is removed

  // Öğrenci davet bağlantısı oluştur
  Future<String> createStudentInviteLink() async {
    try {
      print('🔄 Öğrenci davet bağlantısı oluşturuluyor...');

      // Yeni API ile davet token'ı oluştur
      final randomEmail =
          'student_${DateTime.now().millisecondsSinceEpoch}@temp.com';
      final response = await _apiClient.createInvite(randomEmail, 'STUDENT');
      final token = response['token'] ?? '';

      if (token.isEmpty) {
        throw Exception('Token oluşturulamadı');
      }

      print('✅ Token başarıyla oluşturuldu: $token');

      // Deep link oluştur
      final inviteUrl = response['inviteUrl'] ??
          ''; // _deepLinkService.createInviteLink(token); // This line is removed
      print('🔗 Davet bağlantısı: $inviteUrl');

      return inviteUrl;
    } catch (e) {
      print('❌ Öğrenci davet bağlantısı oluşturma hatası: $e');
      throw Exception('Öğrenci davet bağlantısı oluşturma hatası: $e');
    }
  }

  // Öğrenci davet bağlantısını paylaş
  Future<void> shareStudentInviteLink() async {
    try {
      print('🔄 Öğrenci davet bağlantısı paylaşılıyor...');
      final link = await createStudentInviteLink();

      // Paylaşım mesajı
      const String message =
          'Okuz.ai uygulamasına davet edildim! Öğrenci hesabını oluşturmak için bu bağlantıyı kullan:';

      // Bağlantıyı paylaş
      await Share.share('$message\n\n$link');
      print('✅ Davet bağlantısı paylaşıldı');
    } catch (e) {
      print('❌ Öğrenci daveti paylaşma hatası: $e');
      throw Exception('Öğrenci daveti paylaşma hatası: $e');
    }
  }

  // Veli davet bağlantısı oluştur
  Future<String> createParentInviteLink() async {
    try {
      print('🔄 Veli davet bağlantısı oluşturuluyor...');

      // Yeni API ile davet token'ı oluştur
      final randomEmail =
          'parent_${DateTime.now().millisecondsSinceEpoch}@temp.com';
      final response = await _apiClient.createInvite(randomEmail, 'PARENT');
      final token = response['token'] ?? '';

      if (token.isEmpty) {
        throw Exception('Token oluşturulamadı');
      }

      print('✅ Token başarıyla oluşturuldu: $token');

      // Deep link oluştur
      final inviteUrl = response['inviteUrl'] ??
          ''; // _deepLinkService.createInviteLink(token); // This line is removed
      print('🔗 Davet bağlantısı: $inviteUrl');

      return inviteUrl;
    } catch (e) {
      print('❌ Veli davet bağlantısı oluşturma hatası: $e');
      throw Exception('Veli davet bağlantısı oluşturma hatası: $e');
    }
  }

  // Veli davet bağlantısını paylaş
  Future<void> shareParentInviteLink() async {
    try {
      print('🔄 Veli davet bağlantısı paylaşılıyor...');
      final link = await createParentInviteLink();

      // Paylaşım mesajı
      const String message =
          'Okuz.ai uygulamasına davet edildim! Veli hesabını oluşturmak için bu bağlantıyı kullan:';

      // Bağlantıyı paylaş
      await Share.share('$message\n\n$link');
      print('✅ Davet bağlantısı paylaşıldı');
    } catch (e) {
      print('❌ Veli daveti paylaşma hatası: $e');
      throw Exception('Veli daveti paylaşma hatası: $e');
    }
  }
}
