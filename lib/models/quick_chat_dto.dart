class QuickChatDto {
  final String message;
  final String? subject;
  final String? grade;

  QuickChatDto({
    required this.message,
    this.subject,
    this.grade,
  });

  Map<String, dynamic> toJson() {
    return {
      'message': message,
      if (subject != null) 'subject': subject,
      if (grade != null) 'grade': grade,
    };
  }

  factory QuickChatDto.fromJson(Map<String, dynamic> json) {
    return QuickChatDto(
      message: json['message'] as String,
      subject: json['subject'] as String?,
      grade: json['grade'] as String?,
    );
  }
}
