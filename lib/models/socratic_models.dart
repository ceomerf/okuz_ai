class SocraticMessage {
  final String role; // 'user' veya 'model'
  final String content;
  final DateTime createdAt;

  SocraticMessage({
    required this.role,
    required this.content,
    required this.createdAt,
  });

  factory SocraticMessage.fromJson(Map<String, dynamic> json) {
    return SocraticMessage(
      role: json['role'] ?? '',
      content: json['content'] ?? '',
      createdAt: DateTime.parse(json['createdAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'role': role,
      'content': content,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class SocraticChatState {
  final String? conversationId;
  final List<SocraticMessage> messages;
  final List<String> suggestedReplies;
  final bool isLoading;
  final String? error;

  SocraticChatState({
    this.conversationId,
    this.messages = const [],
    this.suggestedReplies = const [],
    this.isLoading = false,
    this.error,
  });

  SocraticChatState copyWith({
    String? conversationId,
    List<SocraticMessage>? messages,
    List<String>? suggestedReplies,
    bool? isLoading,
    String? error,
  }) {
    return SocraticChatState(
      conversationId: conversationId ?? this.conversationId,
      messages: messages ?? this.messages,
      suggestedReplies: suggestedReplies ?? this.suggestedReplies,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// API Request/Response modelleri
class SocraticChatRequest {
  final String? conversationId;
  final String message;

  SocraticChatRequest({
    this.conversationId,
    required this.message,
  });

  Map<String, dynamic> toJson() {
    return {
      if (conversationId != null) 'conversationId': conversationId,
      'message': message,
    };
  }
}

class SocraticChatResponse {
  final String conversationId;
  final String aiResponse;
  final List<String> suggestedReplies;

  SocraticChatResponse({
    required this.conversationId,
    required this.aiResponse,
    required this.suggestedReplies,
  });

  factory SocraticChatResponse.fromJson(Map<String, dynamic> json) {
    return SocraticChatResponse(
      conversationId: json['conversationId'] ?? '',
      aiResponse: json['aiResponse'] ?? '',
      suggestedReplies: List<String>.from(json['suggestedReplies'] ?? []),
    );
  }
}
