class StudentModel {
  final String? id;
  final String name;
  final int age;
  final String grade;
  final String? parentId;
  final DateTime? createdAt;

  StudentModel({
    this.id,
    required this.name,
    required this.age,
    required this.grade,
    this.parentId,
    this.createdAt,
  });

  factory StudentModel.fromJson(Map<String, dynamic> json) {
    return StudentModel(
      id: json['id'],
      name: json['name'] ?? '',
      age: json['age'] ?? 0,
      grade: json['grade'] ?? '',
      parentId: json['parentId'],
      createdAt:
          json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'age': age,
      'grade': grade,
      'parentId': parentId,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}
