# ErrorDisplayWidget Documentation

## Overview

The `ErrorDisplayWidget` is a reusable Flutter widget designed to display error messages consistently across the app. It provides a standardized way to show errors with user-friendly messages, appropriate icons, and retry functionality.

## Features

- **Consistent Design**: Standardized error display across the app
- **Multiple Variants**: Different widget types for different use cases
- **ApiError Integration**: Seamless integration with the ApiError model
- **Customizable**: Flexible styling and behavior options
- **Accessibility**: Proper contrast and readable text
- **Turkish Support**: User-friendly Turkish error messages

## Widget Variants

### 1. ErrorDisplayWidget (Main Widget)

The primary error display widget with full customization options.

```dart
ErrorDisplayWidget(
  errorMessage: 'Bir hata oluştu',
  onRetry: () => retryOperation(),
  errorIcon: '❌',
  errorColor: Colors.red,
  retryButtonText: 'Yeniden Dene',
  showRetryButton: true,
)
```

### 2. Factory Constructors

Pre-configured widgets for common error types:

```dart
// Network error
ErrorDisplayWidget.networkError(
  onRetry: () => retryOperation(),
)

// Server error
ErrorDisplayWidget.serverError(
  onRetry: () => retryOperation(),
)

// Timeout error
ErrorDisplayWidget.timeoutError(
  onRetry: () => retryOperation(),
)

// Authentication error
ErrorDisplayWidget.authError(
  onRetry: () => navigateToLogin(),
)

// Validation error
ErrorDisplayWidget.validationError(
  field: 'Email',
  message: 'Geçersiz email formatı',
  onRetry: () => fixValidation(),
)
```

### 3. ApiError Integration

Create error widgets directly from ApiError objects:

```dart
ErrorDisplayWidget.fromApiError(
  error: apiError,
  onRetry: () => retryOperation(),
)
```

### 4. Alternative Widgets

#### SimpleErrorWidget
A simplified version for quick usage:

```dart
SimpleErrorWidget(
  message: 'Basit hata mesajı',
  onRetry: () => retryOperation(),
)
```

#### CompactErrorWidget
A compact inline error widget:

```dart
CompactErrorWidget(
  errorMessage: 'Kompakt hata mesajı',
  onRetry: () => retryOperation(),
)
```

#### FullScreenErrorWidget
A full-screen error widget for critical errors:

```dart
FullScreenErrorWidget(
  errorMessage: 'Kritik hata mesajı',
  onRetry: () => retryOperation(),
  title: 'Hata Başlığı',
)
```

## Usage Examples

### 1. Basic Usage

```dart
class MyScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ErrorDisplayWidget(
        errorMessage: 'Bir hata oluştu',
        onRetry: () {
          // Retry logic here
        },
      ),
    );
  }
}
```

### 2. Provider Integration

```dart
class MyScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<MyProvider>(
      builder: (context, provider, child) {
        if (provider.isLoading) {
          return Center(child: CircularProgressIndicator());
        }
        
        if (provider.hasError) {
          return ErrorDisplayWidget(
            errorMessage: provider.error!,
            onRetry: () => provider.retry(),
          );
        }
        
        return MyContent();
      },
    );
  }
}
```

### 3. ApiError Integration

```dart
class MyScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<MyProvider>(
      builder: (context, provider, child) {
        if (provider.hasError) {
          return ErrorDisplayWidget.fromApiError(
            error: provider.apiError!,
            onRetry: () => provider.retry(),
          );
        }
        
        return MyContent();
      },
    );
  }
}
```

### 4. Conditional Error Display

```dart
Widget _buildContent() {
  if (_error != null) {
    return ErrorDisplayWidget(
      errorMessage: _error!,
      onRetry: _loadData,
    );
  }
  
  return MyContent();
}
```

### 5. Custom Styling

```dart
ErrorDisplayWidget(
  errorMessage: 'Özel hata mesajı',
  onRetry: () => retryOperation(),
  errorColor: Colors.purple,
  errorIcon: '🎨',
  padding: EdgeInsets.all(24),
  margin: EdgeInsets.symmetric(vertical: 8),
  retryButtonText: 'Özel Buton',
)
```

## Integration with BaseProvider

The ErrorDisplayWidget works seamlessly with providers that extend BaseProvider:

```dart
class MyProvider extends BaseProvider {
  Future<void> fetchData() async {
    final result = await handleAsyncOperation(() async {
      return await apiService.getData();
    });
    
    if (result != null) {
      // Handle success
    }
    // Error is automatically handled by BaseProvider
  }
}

// In UI
Consumer<MyProvider>(
  builder: (context, provider, child) {
    if (provider.hasError) {
      return ErrorDisplayWidget(
        errorMessage: provider.error!,
        onRetry: () => provider.fetchData(),
      );
    }
    
    return MyContent();
  },
)
```

## Error Types and Icons

| Error Type | Icon | Color | Message |
|------------|------|-------|---------|
| Network | 🌐 | Orange | İnternet bağlantısı hatası |
| Server | 🔧 | Red | Sunucu hatası |
| Timeout | ⏰ | Orange | İstek zaman aşımına uğradı |
| Auth | 🔐 | Red | Oturum süreniz dolmuş |
| Validation | ⚠️ | Yellow | Field-specific message |
| Unknown | ❌ | Grey | Generic error message |

## Customization Options

### ErrorDisplayWidget Parameters

- `errorMessage` (required): The error message to display
- `onRetry` (optional): Callback function for retry action
- `errorIcon` (optional): Custom error icon (emoji)
- `errorColor` (optional): Custom error color
- `retryButtonText` (optional): Custom retry button text
- `showRetryButton` (optional): Whether to show retry button
- `padding` (optional): Custom padding
- `margin` (optional): Custom margin

### Styling

The widget automatically adapts to the app's theme:

- Uses theme's error color if no custom color provided
- Responsive design that works on different screen sizes
- Proper contrast ratios for accessibility
- Consistent with Material Design guidelines

## Best Practices

### 1. Use Appropriate Error Types

```dart
// ✅ Use specific error types
ErrorDisplayWidget.networkError(onRetry: retryOperation);
ErrorDisplayWidget.authError(onRetry: navigateToLogin);

// ❌ Don't use generic error for specific cases
ErrorDisplayWidget(errorMessage: 'Network error', onRetry: retryOperation);
```

### 2. Provide Meaningful Retry Actions

```dart
// ✅ Provide specific retry actions
ErrorDisplayWidget(
  errorMessage: 'Network error',
  onRetry: () => checkConnectionAndRetry(),
);

// ❌ Don't provide generic retry actions
ErrorDisplayWidget(
  errorMessage: 'Network error',
  onRetry: () => print('Retry clicked'),
);
```

### 3. Use ApiError Integration

```dart
// ✅ Use ApiError integration for structured errors
ErrorDisplayWidget.fromApiError(
  error: apiError,
  onRetry: () => retryOperation(),
);

// ❌ Don't manually parse error messages
ErrorDisplayWidget(
  errorMessage: 'Error: ${apiError.toString()}',
  onRetry: () => retryOperation(),
);
```

### 4. Handle Different Error Scenarios

```dart
Widget _buildErrorWidget(ApiError error) {
  if (error.isAuthError) {
    return ErrorDisplayWidget.authError(
      onRetry: () => navigateToLogin(),
    );
  }
  
  if (error.isNetworkError) {
    return ErrorDisplayWidget.networkError(
      onRetry: () => checkConnectionAndRetry(),
    );
  }
  
  return ErrorDisplayWidget.fromApiError(
    error: error,
    onRetry: () => retryOperation(),
  );
}
```

## Accessibility

The ErrorDisplayWidget is designed with accessibility in mind:

- Proper contrast ratios
- Semantic error icons
- Clear error messages
- Accessible retry buttons
- Screen reader friendly

## Testing

### Unit Testing

```dart
testWidgets('ErrorDisplayWidget shows error message', (WidgetTester tester) async {
  await tester.pumpWidget(
    MaterialApp(
      home: ErrorDisplayWidget(
        errorMessage: 'Test error',
        onRetry: () {},
      ),
    ),
  );
  
  expect(find.text('Test error'), findsOneWidget);
  expect(find.text('Yeniden Dene'), findsOneWidget);
});
```

### Integration Testing

```dart
testWidgets('ErrorDisplayWidget retry button works', (WidgetTester tester) async {
  bool retryCalled = false;
  
  await tester.pumpWidget(
    MaterialApp(
      home: ErrorDisplayWidget(
        errorMessage: 'Test error',
        onRetry: () => retryCalled = true,
      ),
    ),
  );
  
  await tester.tap(find.text('Yeniden Dene'));
  expect(retryCalled, isTrue);
});
```

## Files

- `error_display_widget.dart` - Main widget and variants
- `error_display_example.dart` - Usage examples
- `error_display_documentation.md` - This documentation

## Migration Guide

### From Custom Error Widgets

**Before:**
```dart
Container(
  padding: EdgeInsets.all(16),
  decoration: BoxDecoration(
    color: Colors.red.withOpacity(0.1),
    borderRadius: BorderRadius.circular(8),
  ),
  child: Column(
    children: [
      Text('Error: $errorMessage'),
      ElevatedButton(
        onPressed: onRetry,
        child: Text('Retry'),
      ),
    ],
  ),
)
```

**After:**
```dart
ErrorDisplayWidget(
  errorMessage: errorMessage,
  onRetry: onRetry,
)
```

### From SnackBar Errors

**Before:**
```dart
ScaffoldMessenger.of(context).showSnackBar(
  SnackBar(
    content: Text('Error: $errorMessage'),
    action: SnackBarAction(
      label: 'Retry',
      onPressed: onRetry,
    ),
  ),
);
```

**After:**
```dart
ErrorDisplayWidget(
  errorMessage: errorMessage,
  onRetry: onRetry,
)
```

The ErrorDisplayWidget provides a consistent, accessible, and user-friendly way to display errors across your Flutter app!