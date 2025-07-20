import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
import '../models/invite_token.dart';
import '../models/student_model.dart';
import '../models/parent_invite_token.dart';
import '../models/parent_model.dart';

class ApiClient {
  static const String baseUrl = 'http://89.116.38.173:3000/api';

  // Firebase Auth instance
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Singleton pattern
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  // Token alarak header oluştur
  Future<Map<String, String>> _getHeaders() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Kullanıcı oturum açmamış');
    }

    final token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  // Öğrenci davet token'ı oluştur
  Future<InviteToken> createStudentInviteToken() async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturum açmamış');
      }

      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$baseUrl/invite/student'),
        headers: headers,
        body: jsonEncode({
          'parentId': user.uid,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return InviteToken.fromJson(data);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Öğrenci davet token oluşturulamadı');
      }
    } catch (e) {
      throw Exception('Öğrenci davet token oluşturma hatası: $e');
    }
  }

  // Öğrenci davet token'ını kontrol et
  Future<InviteToken> verifyStudentInviteToken(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/invite/student/$token'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return InviteToken.fromJson(data);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Geçersiz öğrenci davet token');
      }
    } catch (e) {
      throw Exception('Öğrenci token doğrulama hatası: $e');
    }
  }

  // Öğrenci kaydı yap
  Future<StudentModel> registerStudent(
      String token, StudentModel student) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/register-student'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'token': token,
          'student': student.toJson(),
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return StudentModel.fromJson(data['student']);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Öğrenci kaydı başarısız');
      }
    } catch (e) {
      throw Exception('Öğrenci kayıt hatası: $e');
    }
  }

  // Veli davet token'ı oluştur
  Future<ParentInviteToken> createParentInviteToken() async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturum açmamış');
      }

      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$baseUrl/invite/parent'),
        headers: headers,
        body: jsonEncode({
          'studentId': user.uid,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ParentInviteToken.fromJson(data);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Veli davet token oluşturulamadı');
      }
    } catch (e) {
      throw Exception('Veli davet token oluşturma hatası: $e');
    }
  }

  // Veli davet token'ını kontrol et
  Future<ParentInviteToken> verifyParentInviteToken(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/invite/parent/$token'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ParentInviteToken.fromJson(data);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Geçersiz veli davet token');
      }
    } catch (e) {
      throw Exception('Veli token doğrulama hatası: $e');
    }
  }

  // Veli kaydı yap
  Future<ParentModel> registerParent(String token, ParentModel parent) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/register-parent'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'token': token,
          'parent': parent.toJson(),
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ParentModel.fromJson(data['parent']);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Veli kaydı başarısız');
      }
    } catch (e) {
      throw Exception('Veli kayıt hatası: $e');
    }
  }
}
