import 'package:share_plus/share_plus.dart';
import 'dart:async';
import '../services/api_client.dart';
import '../models/parent_invite_token.dart';
import '../services/deep_link_service.dart';

class StudentInviteService {
  // Singleton pattern
  static final StudentInviteService _instance =
      StudentInviteService._internal();
  factory StudentInviteService() => _instance;
  StudentInviteService._internal();

  // API istemcisi
  final ApiClient _apiClient = ApiClient();

  // Deep Link servisi
  final DeepLinkService _deepLinkService = DeepLinkService();

  // Veli davet bağlantısı oluştur
  Future<String> createParentInviteLink() async {
    try {
      final token = await _apiClient.createParentInviteToken();
      // Deep link oluştur
      return _deepLinkService.createParentInviteLink(token.token);
    } catch (e) {
      throw Exception('Veli davet bağlantısı oluşturma hatası: $e');
    }
  }

  // Veli davet bağlantısını paylaş
  Future<void> shareParentInviteLink() async {
    try {
      final link = await createParentInviteLink();

      // Paylaşım mesajı
      const String message =
          'Okuz.ai uygulamasına davet edildim! Veli hesabını oluşturmak için bu bağlantıyı kullan:';

      // Bağlantıyı paylaş
      await Share.share('$message\n\n$link');
    } catch (e) {
      throw Exception('Veli daveti paylaşma hatası: $e');
    }
  }
}
