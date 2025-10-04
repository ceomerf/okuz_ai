# DialogueApiService Documentation

## Overview

The `DialogueApiService` abstracts all network communication logic for the dialogue feature, providing a clean separation of concerns between state management (`DialogueProvider`) and API communication.

## Architecture

### Separation of Concerns

#### DialogueProvider (State Management)
- **Responsibility**: Manages UI state, loading states, error states, and user interactions
- **Dependencies**: `DialogueApiService` for API calls
- **Methods**: `sendMessage()`, `switchMode()`, `clearConversation()`, etc.
- **State**: `_chatHistory`, `_suggestedReplies`, `_currentDialogueMode`, etc.

#### DialogueApiService (API Communication)
- **Responsibility**: Handles all HTTP requests to the dialogue backend
- **Dependencies**: `ApiClient` for HTTP operations
- **Methods**: `postMessage()`, `getConversationHistory()`, `switchMode()`, etc.
- **State**: None (stateless service)

## Benefits

### 1. **Single Responsibility Principle**
- Each class has one clear responsibility
- `DialogueProvider`: State management
- `DialogueApiService`: API communication

### 2. **Testability**
- `DialogueProvider` can be tested with mocked `DialogueApiService`
- `DialogueApiService` can be tested independently
- Unit tests are more focused and reliable

### 3. **Maintainability**
- API changes only affect `DialogueApiService`
- UI logic changes only affect `DialogueProvider`
- Easier to debug and modify

### 4. **Reusability**
- `DialogueApiService` can be used by other providers
- API methods can be reused across different UI components

### 5. **Error Handling**
- Centralized error handling in `DialogueApiService`
- Consistent error responses across all API calls
- Better error propagation to UI

## Usage Examples

### Basic Usage

```dart
// Create service
final apiService = DialogueApiService();

// Create provider with service
final provider = DialogueProvider(apiService: apiService);

// Send message
await provider.sendMessage('Hello, how are you?');
```

### Testing

```dart
// Mock service for testing
class MockDialogueApiService extends DialogueApiService {
  @override
  Future<DialogueResponse> postMessage(DialogueRequest request) async {
    // Return mock response
    return DialogueResponse(
      conversationId: 'test_conv_123',
      aiResponse: 'Mock response',
      suggestedReplies: ['Reply 1', 'Reply 2'],
    );
  }
}

// Test provider with mock
final mockService = MockDialogueApiService();
final provider = DialogueProvider(apiService: mockService);
```

### Dependency Injection

```dart
// In your app's dependency injection
final apiService = DialogueApiService();
final provider = DialogueProvider(apiService: apiService);

// Provide to widget tree
ChangeNotifierProvider.value(
  value: provider,
  child: MyDialogueWidget(),
);
```

## API Methods

### Core Methods

#### `postMessage(DialogueRequest request)`
Sends a message to the dialogue API.

```dart
final request = DialogueRequest(
  message: 'Hello',
  conversationId: 'conv_123',
  mode: 'socratic',
);

final response = await apiService.postMessage(request);
```

#### `getConversationHistory(String conversationId)`
Retrieves conversation history.

```dart
final history = await apiService.getConversationHistory('conv_123');
```

#### `switchMode(String conversationId, String newMode)`
Switches dialogue mode (socratic/companion).

```dart
final response = await apiService.switchMode('conv_123', 'companion');
```

#### `clearConversation(String conversationId)`
Clears conversation history.

```dart
await apiService.clearConversation('conv_123');
```

### Utility Methods

#### `getConversationSummary(String conversationId)`
Gets conversation summary.

```dart
final summary = await apiService.getConversationSummary('conv_123');
```

#### `getSuggestedReplies(String conversationId)`
Gets suggested replies for the conversation.

```dart
final suggestions = await apiService.getSuggestedReplies('conv_123');
```

#### `sendFeedback(String conversationId, String messageId, Map<String, dynamic> feedback)`
Sends feedback for a response.

```dart
await apiService.sendFeedback('conv_123', 'msg_456', {
  'rating': 5,
  'comment': 'Great response!',
});
```

#### `getDialogueAnalytics(String conversationId)`
Gets dialogue analytics.

```dart
final analytics = await apiService.getDialogueAnalytics('conv_123');
```

## Data Models

### DialogueRequest
```dart
class DialogueRequest {
  final String message;
  final String? conversationId;
  final String mode; // 'socratic' or 'companion'
  final Map<String, dynamic>? context;
}
```

### DialogueResponse
```dart
class DialogueResponse {
  final String conversationId;
  final String aiResponse;
  final List<String> suggestedReplies;
  final String? modeSwitchSuggestion;
  final String? pedagogicalGoal;
  final String? detectedSentiment;
  final String? detectedCommand;
  final String? visualAidSuggestion;
  final String? followUpSuggestion;
  final Map<String, dynamic>? metadata;
}
```

## Error Handling

The service uses the `ApiError` model for consistent error handling:

```dart
try {
  final response = await apiService.postMessage(request);
  // Handle success
} on ApiError catch (e) {
  // Handle specific error types
  if (e.isNetworkError) {
    // Handle network error
  } else if (e.isAuthError) {
    // Handle auth error
  }
} catch (e) {
  // Handle unexpected errors
}
```

## Extension Methods

The service provides extension methods for easier usage:

```dart
// Simple message
final response = await apiService.sendMessage('Hello');

// Message with mode
final response = await apiService.sendMessageWithMode('Hello', 'companion');

// Message with context
final response = await apiService.sendMessageWithContext('Hello', {
  'topic': 'math',
  'difficulty': 'intermediate',
});
```

## Migration Guide

### From Direct API Calls

**Before:**
```dart
class DialogueProvider extends ChangeNotifier {
  Future<void> sendMessage(String message) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/dialogue/message'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'message': message}),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        // Handle response
      }
    } catch (e) {
      // Handle error
    }
  }
}
```

**After:**
```dart
class DialogueProvider extends BaseProvider {
  final DialogueApiService _apiService;
  
  Future<void> sendMessage(String message) async {
    final result = await handleAsyncOperation(() async {
      final request = DialogueRequest(message: message);
      return await _apiService.postMessage(request);
    });
    
    if (result != null) {
      _processSuccessfulResponse(message, result);
    }
  }
}
```

### Benefits of Migration

1. **Cleaner Code**: No HTTP boilerplate in providers
2. **Better Error Handling**: Centralized error handling
3. **Easier Testing**: Mock the service instead of HTTP calls
4. **Type Safety**: Strongly typed request/response models
5. **Reusability**: Service can be used by multiple providers

## Best Practices

### 1. Use Dependency Injection
```dart
// ✅ Good
final provider = DialogueProvider(apiService: DialogueApiService());

// ❌ Avoid
final provider = DialogueProvider(); // Creates service internally
```

### 2. Handle Errors Appropriately
```dart
// ✅ Good
try {
  final response = await apiService.postMessage(request);
} on ApiError catch (e) {
  // Handle specific error
}

// ❌ Avoid
try {
  final response = await apiService.postMessage(request);
} catch (e) {
  // Generic error handling
}
```

### 3. Use Strongly Typed Models
```dart
// ✅ Good
final request = DialogueRequest(
  message: message,
  mode: 'socratic',
);

// ❌ Avoid
final request = {
  'message': message,
  'mode': 'socratic',
};
```

### 4. Test with Mocks
```dart
// ✅ Good
class MockDialogueApiService extends DialogueApiService {
  @override
  Future<DialogueResponse> postMessage(DialogueRequest request) async {
    return DialogueResponse(/* mock data */);
  }
}

// ❌ Avoid
// Testing with real HTTP calls
```

This separation of concerns makes the code more maintainable, testable, and follows SOLID principles!
also we have a georgeful ai editor and study assistant 