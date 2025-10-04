class InviteCode {
  final String id;
  final String code;
  final String type; // 'PARENT_TO_STUDENT' or 'STUDENT_TO_PARENT'
  final String creatorId;
  final String? userId;
  final bool isUsed;
  final DateTime expiresAt;
  final DateTime? usedAt;
  final DateTime createdAt;
  final Map<String, dynamic>? creator;

  InviteCode({
    required this.id,
    required this.code,
    required this.type,
    required this.creatorId,
    this.userId,
    required this.isUsed,
    required this.expiresAt,
    this.usedAt,
    required this.createdAt,
    this.creator,
  });

  factory InviteCode.fromJson(Map<String, dynamic> json) {
    return InviteCode(
      id: json['id'] ?? '',
      code: json['code'] ?? '',
      type: json['type'] ?? 'PARENT_TO_STUDENT',
      creatorId: json['creatorId'] ?? '',
      userId: json['userId'],
      isUsed: json['isUsed'] ?? false,
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'])
          : DateTime.now().add(const Duration(days: 2)),
      usedAt: json['usedAt'] != null ? DateTime.parse(json['usedAt']) : null,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      creator: json['creator'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'type': type,
      'creatorId': creatorId,
      'userId': userId,
      'isUsed': isUsed,
      'expiresAt': expiresAt.toIso8601String(),
      'usedAt': usedAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'creator': creator,
    };
  }

  // Davet kodunun geçerlilik süresini kontrol et
  bool get isValid => !isUsed && expiresAt.isAfter(DateTime.now());

  // Kalan süreyi hesapla
  Duration get remainingTime => expiresAt.difference(DateTime.now());

  // Kalan süreyi insan tarafından okunabilir formatta döndür
  String get formattedRemainingTime {
    final hours = remainingTime.inHours;
    if (hours > 24) {
      final days = hours ~/ 24;
      return '$days gün kaldı';
    } else if (hours > 0) {
      return '$hours saat kaldı';
    } else {
      final minutes = remainingTime.inMinutes;
      return '$minutes dakika kaldı';
    }
  }
}
