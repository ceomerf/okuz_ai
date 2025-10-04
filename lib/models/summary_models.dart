// Summary Models for Flutter Frontend
// Based on backend DTOs from smart-tools.dto.ts

// Request Models
class GenerateSummaryRequest {
  final String sourceType; // 'text', 'url', 'pdf'
  final String? sourceText;
  final String? sourceUrl;
  final String format; // 'paragraph', 'list', 'keywords'
  final String length; // 'short', 'medium', 'long'

  GenerateSummaryRequest({
    required this.sourceType,
    this.sourceText,
    this.sourceUrl,
    required this.format,
    required this.length,
  });

  Map<String, dynamic> toJson() {
    return {
      'sourceType': sourceType,
      if (sourceText != null) 'sourceText': sourceText,
      if (sourceUrl != null) 'sourceUrl': sourceUrl,
      'format': format,
      'length': length,
    };
  }

  factory GenerateSummaryRequest.fromJson(Map<String, dynamic> json) {
    return GenerateSummaryRequest(
      sourceType: json['sourceType'],
      sourceText: json['sourceText'],
      sourceUrl: json['sourceUrl'],
      format: json['format'],
      length: json['length'],
    );
  }
}

class ExportPdfRequest {
  final String summaryText;
  final String topic;

  ExportPdfRequest({
    required this.summaryText,
    required this.topic,
  });

  Map<String, dynamic> toJson() {
    return {
      'summaryText': summaryText,
      'topic': topic,
    };
  }

  factory ExportPdfRequest.fromJson(Map<String, dynamic> json) {
    return ExportPdfRequest(
      summaryText: json['summaryText'],
      topic: json['topic'],
    );
  }
}

// Response Models
class GenerateSummaryResponse {
  final String summary;
  final String type;
  final int originalLength;
  final int summaryLength;
  final bool success;

  GenerateSummaryResponse({
    required this.summary,
    required this.type,
    required this.originalLength,
    required this.summaryLength,
    required this.success,
  });

  factory GenerateSummaryResponse.fromJson(Map<String, dynamic> json) {
    return GenerateSummaryResponse(
      summary: json['summary'] ?? '',
      type: json['type'] ?? 'paragraph',
      originalLength: json['originalLength'] ?? 0,
      summaryLength: json['summaryLength'] ?? 0,
      success: json['success'] ?? false,
    );
  }

  // Backward compatibility için eski alanları hesapla
  int get originalWordCount => summary.split(' ').length;
  int get summaryWordCount => summary.split(' ').length;
  double get reductionPercentage {
    if (originalLength == 0) return 0.0;
    return ((originalLength - summaryLength) / originalLength) * 100;
  }
}

// Enums for better type safety
enum SummarySourceType {
  text,
  url,
  pdf,
}

enum SummaryFormat {
  paragraph,
  list,
  keywords,
}

enum SummaryLength {
  short,
  medium,
  long,
}

// Extension methods for enum to string conversion
extension SummarySourceTypeExtension on SummarySourceType {
  String get value {
    switch (this) {
      case SummarySourceType.text:
        return 'text';
      case SummarySourceType.url:
        return 'url';
      case SummarySourceType.pdf:
        return 'pdf';
    }
  }
}

extension SummaryFormatExtension on SummaryFormat {
  String get value {
    switch (this) {
      case SummaryFormat.paragraph:
        return 'paragraph';
      case SummaryFormat.list:
        return 'list';
      case SummaryFormat.keywords:
        return 'keywords';
    }
  }

  String get displayName {
    switch (this) {
      case SummaryFormat.paragraph:
        return 'Paragraf';
      case SummaryFormat.list:
        return 'Liste';
      case SummaryFormat.keywords:
        return 'Anahtar Kelimeler';
    }
  }
}

extension SummaryLengthExtension on SummaryLength {
  String get value {
    switch (this) {
      case SummaryLength.short:
        return 'short';
      case SummaryLength.medium:
        return 'medium';
      case SummaryLength.long:
        return 'long';
    }
  }

  String get displayName {
    switch (this) {
      case SummaryLength.short:
        return 'Kısa';
      case SummaryLength.medium:
        return 'Orta';
      case SummaryLength.long:
        return 'Uzun';
    }
  }
} 