# ApiError Model Documentation

## Overview

The `ApiError` model provides structured error handling for NestJS backend responses. It parses JSON error responses and provides user-friendly error messages with appropriate UI indicators.

## Features

- **Structured Error Parsing**: Parses NestJS error responses
- **User-Friendly Messages**: Turkish error messages for better UX
- **Error Type Detection**: Automatic detection of error types (network, auth, validation, etc.)
- **UI Integration**: Built-in icons and colors for error display
- **Retry Suggestions**: Context-aware retry suggestions
- **Extension Methods**: Easy conversion from any error to ApiError

## Basic Usage

### 1. Parse Error from JSON Response

```dart
// NestJS error response
final errorJson = {
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
};

final apiError = ApiError.fromJson(errorJson);
print(apiError.userFriendlyMessage); // "Validation failed"
```

### 2. Handle HTTP Response Errors

```dart
try {
  final response = await http.get(Uri.parse('$baseUrl/data'));
  
  if (response.statusCode == 200) {
    return jsonDecode(response.body);
  } else {
    final errorBody = jsonDecode(response.body);
    throw ApiErrorHelper.parseFromResponse(response.statusCode, errorBody);
  }
} on ApiError catch (e) {
  // Handle structured error
  print(e.userFriendlyMessage);
} catch (e) {
  // Convert any other error to ApiError
  throw e.toApiError();
}
```

### 3. Create Specific Error Types

```dart
// Network error
final networkError = ApiError.networkError();

// Timeout error
final timeoutError = ApiError.timeoutError();

// Authentication error
final authError = ApiError.authError();

// Validation error
final validationError = ApiError.validationError('email', 'Invalid email format');

// Not found error
final notFoundError = ApiError.notFoundError('User');

// Server error
final serverError = ApiError.serverError();
```

## Error Type Detection

The `ApiError` class provides boolean getters to check error types:

```dart
final error = ApiError.fromJson(errorJson);

if (error.isNetworkError) {
  // Handle network issues
}

if (error.isAuthError) {
  // Handle authentication issues
}

if (error.isValidationError) {
  // Handle validation issues
}

if (error.isServerError) {
  // Handle server issues
}
```

## UI Integration

### Error Widget Example

```dart
class ErrorDisplayWidget extends StatelessWidget {
  final ApiError error;
  final VoidCallback? onRetry;

  const ErrorDisplayWidget({
    required this.error,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _getErrorColor(context).withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _getErrorColor(context)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Text(error.errorIcon), // 🌐, ⏰, 🔐, etc.
              SizedBox(width: 8),
              Expanded(
                child: Text(error.userFriendlyMessage),
              ),
            ],
          ),
          if (onRetry != null)
            ElevatedButton(
              onPressed: onRetry,
              child: Text('Tekrar Dene'),
            ),
        ],
      ),
    );
  }

  Color _getErrorColor(BuildContext context) {
    switch (error.errorColor) {
      case 'red': return Colors.red;
      case 'orange': return Colors.orange;
      case 'yellow': return Colors.amber;
      default: return Colors.grey;
    }
  }
}
```

### Provider Integration

```dart
class MyProvider extends ChangeNotifier {
  ApiError? _error;
  bool _isLoading = false;

  ApiError? get error => _error;
  bool get hasError => _error != null;
  bool get isLoading => _isLoading;

  Future<void> fetchData() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // API call
      await apiService.getData();
    } on ApiError catch (e) {
      _error = e;
    } catch (e) {
      _error = e.toApiError();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
```

## Error Messages

### Turkish Error Messages

The model provides Turkish error messages for better user experience:

- **Network Error**: "İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin."
- **Timeout Error**: "İstek zaman aşımına uğradı. Lütfen tekrar deneyin."
- **Auth Error**: "Oturum süreniz dolmuş. Lütfen tekrar giriş yapın."
- **Server Error**: "Sunucu hatası. Lütfen daha sonra tekrar deneyin."
- **Validation Error**: Field-specific messages like "email: Geçersiz email formatı"

### Error Icons

Each error type has a corresponding emoji icon:

- 🌐 Network errors
- ⏰ Timeout errors
- 🔐 Authentication errors
- 🚫 Forbidden errors
- 🔧 Server errors
- ⚠️ Validation errors
- ❌ Unknown errors

## Retry Suggestions

The `ApiErrorHelper` provides context-aware retry suggestions:

```dart
final suggestion = ApiErrorHelper.getRetrySuggestion(error);
// Returns appropriate suggestion based on error type
```

## Integration with BaseProvider

The `ApiError` model works seamlessly with the `BaseProvider`:

```dart
class MyProvider extends BaseProvider {
  Future<void> fetchData() async {
    final result = await handleAsyncOperation(() async {
      // API call that might throw ApiError
      return await apiService.getData();
    });

    if (result != null) {
      // Handle success
    }
    // Error is automatically handled by BaseProvider
  }
}
```

## Best Practices

### 1. Always Use Structured Error Handling

```dart
// ❌ Don't do this
try {
  await apiCall();
} catch (e) {
  print('Error: $e'); // Generic error handling
}

// ✅ Do this
try {
  await apiCall();
} catch (e) {
  final apiError = e.toApiError();
  // Handle specific error types
  if (apiError.isAuthError) {
    // Handle auth error
  } else if (apiError.isNetworkError) {
    // Handle network error
  }
}
```

### 2. Provide User-Friendly Messages

```dart
// ❌ Don't show raw error messages
Text('Error: ${error.toString()}')

// ✅ Show user-friendly messages
Text(error.userFriendlyMessage)
```

### 3. Use Error Icons and Colors

```dart
// ✅ Provide visual feedback
Container(
  color: _getErrorColor(error),
  child: Row(
    children: [
      Text(error.errorIcon),
      Text(error.userFriendlyMessage),
    ],
  ),
)
```

### 4. Handle Specific Error Types

```dart
if (error.isAuthError) {
  // Navigate to login
  Navigator.pushNamed(context, '/login');
} else if (error.isNetworkError) {
  // Show network error widget
  showNetworkErrorDialog(context);
} else if (error.isValidationError) {
  // Show field-specific validation error
  showValidationError(context, error);
}
```

## Error Response Format

The model expects NestJS error responses in this format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

## Files

- `api_error_model.dart` - Main ApiError class and helpers
- `api_error_example.dart` - Usage examples and widgets
- `api_error_documentation.md` - This documentation

## Migration Guide

### From Generic Error Handling

**Before:**
```dart
try {
  await apiCall();
} catch (e) {
  setError('Bir hata oluştu: $e');
}
```

**After:**
```dart
try {
  await apiCall();
} on ApiError catch (e) {
  setError(e.userFriendlyMessage);
} catch (e) {
  setError(e.toApiError().userFriendlyMessage);
}
```

### From String Error Messages

**Before:**
```dart
String errorMessage = 'Unknown error';
if (statusCode == 401) errorMessage = 'Auth error';
if (statusCode == 404) errorMessage = 'Not found';
```

**After:**
```dart
final apiError = ApiErrorHelper.parseFromResponse(statusCode, body);
String errorMessage = apiError.userFriendlyMessage;
```

This structured error handling provides better user experience and more maintainable code!