import 'package:cloud_firestore/cloud_firestore.dart';

class InviteToken {
  final String token;
  final String parentId;
  final DateTime createdAt;
  final bool isUsed;
  final DateTime? usedAt;
  final String? studentId; // Davet edilen öğrencinin ID'si (kullanıldıysa)

  InviteToken({
    required this.token,
    required this.parentId,
    required this.createdAt,
    this.isUsed = false,
    this.usedAt,
    this.studentId,
  });

  factory InviteToken.fromJson(Map<String, dynamic> json) {
    return InviteToken(
      token: json['token'] ?? '',
      parentId: json['parentId'] ?? '',
      createdAt: json['createdAt'] != null
          ? (json['createdAt'] is Timestamp
              ? (json['createdAt'] as Timestamp).toDate()
              : DateTime.parse(json['createdAt']))
          : DateTime.now(),
      isUsed: json['isUsed'] ?? false,
      usedAt: json['usedAt'] != null
          ? (json['usedAt'] is Timestamp
              ? (json['usedAt'] as Timestamp).toDate()
              : DateTime.parse(json['usedAt']))
          : null,
      studentId: json['studentId'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'parentId': parentId,
      'createdAt': createdAt.toIso8601String(),
      'isUsed': isUsed,
      'usedAt': usedAt?.toIso8601String(),
      'studentId': studentId,
    };
  }
}
