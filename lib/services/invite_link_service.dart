import 'package:share_plus/share_plus.dart';
import 'dart:async';
import '../services/api_client.dart';
import '../models/invite_token.dart';
import '../services/deep_link_service.dart';

class InviteLinkService {
  // Singleton pattern
  static final InviteLinkService _instance = InviteLinkService._internal();
  factory InviteLinkService() => _instance;
  InviteLinkService._internal();

  // API istemcisi
  final ApiClient _apiClient = ApiClient();

  // Deep Link servisi
  final DeepLinkService _deepLinkService = DeepLinkService();

  // Öğrenci davet bağlantısı oluştur
  Future<String> createStudentInviteLink() async {
    try {
      final token = await _apiClient.createStudentInviteToken();
      // Deep link oluştur
      return _deepLinkService.createStudentInviteLink(token.token);
    } catch (e) {
      throw Exception('Öğrenci davet bağlantısı oluşturma hatası: $e');
    }
  }

  // Öğrenci davet bağlantısını paylaş
  Future<void> shareStudentInviteLink() async {
    try {
      final link = await createStudentInviteLink();

      // Paylaşım mesajı
      const String message =
          'Okuz.ai uygulamasına davet edildim! Öğrenci hesabını oluşturmak için bu bağlantıyı kullan:';

      // Bağlantıyı paylaş
      await Share.share('$message\n\n$link');
    } catch (e) {
      throw Exception('Öğrenci daveti paylaşma hatası: $e');
    }
  }
}
