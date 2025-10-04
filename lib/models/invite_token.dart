// JWT Backend için basit Invite Token modeli
// Firebase bağımlılıkları tamamen kaldırıldı

class InviteToken {
  final String id;
  final String token;
  final String type; // 'student' veya 'parent'
  final String createdBy;
  final String? usedBy;
  final DateTime createdAt;
  final DateTime? usedAt;
  final bool isUsed;
  final String? parentId; // Added parentId field
  final Map<String, dynamic>? metadata;

  InviteToken({
    required this.id,
    required this.token,
    required this.type,
    required this.createdBy,
    this.usedBy,
    required this.createdAt,
    this.usedAt,
    required this.isUsed,
    this.parentId, // Added parentId to constructor
    this.metadata,
  });

  factory InviteToken.fromJson(Map<String, dynamic> json) {
    return InviteToken(
      id: json['id'] ?? '',
      token: json['token'] ?? '',
      type: json['type'] ?? 'student',
      createdBy: json['createdBy'] ?? '',
      usedBy: json['usedBy'],
      createdAt: json['createdAt'] is String
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      usedAt: json['usedAt'] is String ? DateTime.parse(json['usedAt']) : null,
      isUsed: json['isUsed'] ?? false,
      parentId: json['parentId'], // Added parentId from json
      metadata: json['metadata'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'token': token,
      'type': type,
      'createdBy': createdBy,
      'usedBy': usedBy,
      'createdAt': createdAt.toIso8601String(),
      'usedAt': usedAt?.toIso8601String(),
      'isUsed': isUsed,
      'parentId': parentId, // Added parentId to json
      'metadata': metadata,
    };
  }
}
