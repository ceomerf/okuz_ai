/// Model to parse structured error responses from NestJS backend
///
/// NestJS typically returns error responses in this format:
/// ```json
/// {
///   "statusCode": 400,
///   "message": "Validation failed",
///   "error": "Bad Request"
/// }
/// ```
class ApiError {
  final int statusCode;
  final String message;
  final String error;
  final Map<String, dynamic>? details;

  const ApiError({
    required this.statusCode,
    required this.message,
    required this.error,
    this.details,
  });

  /// Parse error response from JSON
  factory ApiError.fromJson(Map<String, dynamic> json) {
    return ApiError(
      statusCode: json['statusCode'] ?? 500,
      message: json['message'] ?? 'Bilinmeyen bir sunucu hatası oluştu.',
      error: json['error'] ?? 'Internal Server Error',
      details: json['details'] is Map<String, dynamic> ? json['details'] : null,
    );
  }

  /// Create an ApiError from a generic exception
  factory ApiError.fromException(dynamic exception) {
    if (exception is ApiError) {
      return exception;
    }

    return ApiError(
      statusCode: 500,
      message: exception?.toString() ?? 'Bilinmeyen bir hata oluştu.',
      error: 'Internal Error',
    );
  }

  /// Create a network error
  factory ApiError.networkError() {
    return const ApiError(
      statusCode: 0,
      message: 'İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin.',
      error: 'Network Error',
    );
  }

  /// Create a timeout error
  factory ApiError.timeoutError() {
    return const ApiError(
      statusCode: 408,
      message: 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',
      error: 'Request Timeout',
    );
  }

  /// Create a server error
  factory ApiError.serverError() {
    return const ApiError(
      statusCode: 500,
      message: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
      error: 'Internal Server Error',
    );
  }

  /// Create a validation error
  factory ApiError.validationError(String field, String message) {
    return ApiError(
      statusCode: 400,
      message: '$field: $message',
      error: 'Validation Error',
      details: {'field': field, 'message': message},
    );
  }

  /// Create an authentication error
  factory ApiError.authError() {
    return const ApiError(
      statusCode: 401,
      message: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
      error: 'Unauthorized',
    );
  }

  /// Create a forbidden error
  factory ApiError.forbiddenError() {
    return const ApiError(
      statusCode: 403,
      message: 'Bu işlem için yetkiniz bulunmuyor.',
      error: 'Forbidden',
    );
  }

  /// Create a not found error
  factory ApiError.notFoundError(String resource) {
    return ApiError(
      statusCode: 404,
      message: '$resource bulunamadı.',
      error: 'Not Found',
    );
  }

  /// Check if this is a network error
  bool get isNetworkError => statusCode == 0;

  /// Check if this is a timeout error
  bool get isTimeoutError => statusCode == 408;

  /// Check if this is a server error
  bool get isServerError => statusCode >= 500;

  /// Check if this is a client error (4xx)
  bool get isClientError => statusCode >= 400 && statusCode < 500;

  /// Check if this is an authentication error
  bool get isAuthError => statusCode == 401;

  /// Check if this is a forbidden error
  bool get isForbiddenError => statusCode == 403;

  /// Check if this is a not found error
  bool get isNotFoundError => statusCode == 404;

  /// Check if this is a validation error
  bool get isValidationError => statusCode == 400;

  /// Get user-friendly error message
  String get userFriendlyMessage {
    // Handle specific error types
    if (isNetworkError) {
      return 'İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin.';
    }

    if (isTimeoutError) {
      return 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
    }

    if (isAuthError) {
      return 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
    }

    if (isForbiddenError) {
      return 'Bu işlem için yetkiniz bulunmuyor.';
    }

    if (isServerError) {
      return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
    }

    // Return the message from the server, or a generic message
    return message.isNotEmpty
        ? message
        : 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }

  /// Get error icon for UI
  String get errorIcon {
    if (isNetworkError) return '🌐';
    if (isTimeoutError) return '⏰';
    if (isAuthError) return '🔐';
    if (isForbiddenError) return '🚫';
    if (isServerError) return '🔧';
    if (isValidationError) return '⚠️';
    return '❌';
  }

  /// Get error color for UI
  String get errorColor {
    if (isNetworkError || isTimeoutError) return 'orange';
    if (isAuthError || isForbiddenError) return 'red';
    if (isServerError) return 'red';
    if (isValidationError) return 'yellow';
    return 'grey';
  }

  /// Convert to JSON for debugging
  Map<String, dynamic> toJson() {
    return {
      'statusCode': statusCode,
      'message': message,
      'error': error,
      if (details != null) 'details': details,
    };
  }

  @override
  String toString() {
    return 'ApiError(statusCode: $statusCode, message: $message, error: $error)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ApiError &&
        other.statusCode == statusCode &&
        other.message == message &&
        other.error == error;
  }

  @override
  int get hashCode {
    return statusCode.hashCode ^ message.hashCode ^ error.hashCode;
  }
}

/// Extension to handle API error parsing from HTTP responses
extension ApiErrorExtension on dynamic {
  /// Convert any error to ApiError
  ApiError toApiError() {
    if (this is ApiError) {
      return this as ApiError;
    }

    if (this is Map<String, dynamic>) {
      return ApiError.fromJson(this as Map<String, dynamic>);
    }

    return ApiError.fromException(this);
  }
}

/// Helper class for common API error scenarios
class ApiErrorHelper {
  /// Parse error from HTTP response
  static ApiError parseFromResponse(
      int statusCode, Map<String, dynamic>? body) {
    if (body != null && body.containsKey('statusCode')) {
      return ApiError.fromJson(body);
    }

    // Handle common HTTP status codes
    switch (statusCode) {
      case 400:
        return ApiError(
          statusCode: statusCode,
          message: body?['message'] ?? 'Geçersiz istek.',
          error: 'Bad Request',
        );
      case 401:
        return ApiError.authError();
      case 403:
        return ApiError.forbiddenError();
      case 404:
        return ApiError(
          statusCode: statusCode,
          message: body?['message'] ?? 'Kaynak bulunamadı.',
          error: 'Not Found',
        );
      case 408:
        return ApiError.timeoutError();
      case 500:
        return ApiError.serverError();
      default:
        return ApiError(
          statusCode: statusCode,
          message: body?['message'] ?? 'Bilinmeyen bir hata oluştu.',
          error: 'Unknown Error',
        );
    }
  }

  /// Create error from network exception
  static ApiError fromNetworkException(dynamic exception) {
    final message = exception?.toString() ?? 'Network error';

    if (message.toLowerCase().contains('timeout')) {
      return ApiError.timeoutError();
    }

    if (message.toLowerCase().contains('connection') ||
        message.toLowerCase().contains('network')) {
      return ApiError.networkError();
    }

    return ApiError(
      statusCode: 0,
      message: message,
      error: 'Network Exception',
    );
  }

  /// Get retry suggestion based on error type
  static String getRetrySuggestion(ApiError error) {
    if (error.isNetworkError) {
      return 'İnternet bağlantınızı kontrol edip tekrar deneyin.';
    }

    if (error.isTimeoutError) {
      return 'Bağlantı yavaş olabilir. Lütfen tekrar deneyin.';
    }

    if (error.isServerError) {
      return 'Sunucu geçici olarak meşgul. Birkaç dakika sonra tekrar deneyin.';
    }

    if (error.isAuthError) {
      return 'Oturumunuzu yenileyip tekrar deneyin.';
    }

    return 'Lütfen tekrar deneyin.';
  }
}
