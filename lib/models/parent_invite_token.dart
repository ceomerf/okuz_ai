// JWT Backend için basit Parent Invite Token modeli
// Firebase bağımlılıkları tamamen kaldırıldı

class ParentInviteToken {
  final String id;
  final String token;
  final String studentId;
  final String? parentId; // null ise henüz kullanılmamış
  final DateTime createdAt;
  final DateTime? usedAt;
  final bool isUsed;
  final Map<String, dynamic>? metadata;

  ParentInviteToken({
    required this.id,
    required this.token,
    required this.studentId,
    this.parentId,
    required this.createdAt,
    this.usedAt,
    required this.isUsed,
    this.metadata,
  });

  factory ParentInviteToken.fromJson(Map<String, dynamic> json) {
    return ParentInviteToken(
      id: json['id'] ?? '',
      token: json['token'] ?? '',
      studentId: json['studentId'] ?? '',
      parentId: json['parentId'],
      createdAt: json['createdAt'] is String
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      usedAt: json['usedAt'] is String ? DateTime.parse(json['usedAt']) : null,
      isUsed: json['isUsed'] ?? false,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'token': token,
      'studentId': studentId,
      'parentId': parentId,
      'createdAt': createdAt.toIso8601String(),
      'usedAt': usedAt?.toIso8601String(),
      'isUsed': isUsed,
      'metadata': metadata,
    };
  }
}
