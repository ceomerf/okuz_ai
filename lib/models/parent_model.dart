class ParentModel {
  final String? id;
  final String name;
  final String relation;
  final String phone;
  final String? studentId;
  final DateTime? createdAt;

  ParentModel({
    this.id,
    required this.name,
    required this.relation,
    required this.phone,
    this.studentId,
    this.createdAt,
  });

  factory ParentModel.fromJson(Map<String, dynamic> json) {
    return ParentModel(
      id: json['id'],
      name: json['name'] ?? '',
      relation: json['relation'] ?? '',
      phone: json['phone'] ?? '',
      studentId: json['studentId'],
      createdAt:
          json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'relation': relation,
      'phone': phone,
      'studentId': studentId,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}
