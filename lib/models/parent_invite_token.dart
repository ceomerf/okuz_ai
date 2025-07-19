import 'package:cloud_firestore/cloud_firestore.dart';

class ParentInviteToken {
  final String token;
  final String studentId;
  final DateTime createdAt;
  final bool isUsed;
  final DateTime? usedAt;
  final String? parentId; // Davet edilen velinin ID'si (kullanıldıysa)

  ParentInviteToken({
    required this.token,
    required this.studentId,
    required this.createdAt,
    this.isUsed = false,
    this.usedAt,
    this.parentId,
  });

  factory ParentInviteToken.fromJson(Map<String, dynamic> json) {
    return ParentInviteToken(
      token: json['token'] ?? '',
      studentId: json['studentId'] ?? '',
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
      parentId: json['parentId'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'studentId': studentId,
      'createdAt': createdAt.toIso8601String(),
      'isUsed': isUsed,
      'usedAt': usedAt?.toIso8601String(),
      'parentId': parentId,
    };
  }
}
