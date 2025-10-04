import 'package:flutter/material.dart';
import '../models/api_error_model.dart';

/// A reusable widget to display error messages consistently across the app
///
/// This widget provides a standardized way to show errors with:
/// - Error icon based on error type
/// - User-friendly error message
/// - Retry button with customizable callback
/// - Consistent styling and layout
class ErrorDisplayWidget extends StatelessWidget {
  /// The error message to display
  final String errorMessage;

  /// Callback function to execute when retry button is pressed
  final VoidCallback? onRetry;

  /// Optional custom error icon (emoji)
  final String? errorIcon;

  /// Optional custom error color
  final Color? errorColor;

  /// Optional custom retry button text
  final String retryButtonText;

  /// Whether to show the retry button
  final bool showRetryButton;

  /// Optional custom padding
  final EdgeInsetsGeometry? padding;

  /// Optional custom margin
  final EdgeInsetsGeometry? margin;

  const ErrorDisplayWidget({
    Key? key,
    required this.errorMessage,
    this.onRetry,
    this.errorIcon,
    this.errorColor,
    this.retryButtonText = 'Yeniden Dene',
    this.showRetryButton = true,
    this.padding,
    this.margin,
  }) : super(key: key);

  /// Create an ErrorDisplayWidget from an ApiError object
  factory ErrorDisplayWidget.fromApiError({
    Key? key,
    required ApiError error,
    VoidCallback? onRetry,
    String retryButtonText = 'Yeniden Dene',
    bool showRetryButton = true,
    EdgeInsetsGeometry? padding,
    EdgeInsetsGeometry? margin,
  }) {
    return ErrorDisplayWidget(
      key: key,
      errorMessage: error.userFriendlyMessage,
      onRetry: onRetry,
      errorIcon: error.errorIcon,
      errorColor: _getErrorColor(error.errorColor),
      retryButtonText: retryButtonText,
      showRetryButton: showRetryButton,
      padding: padding,
      margin: margin,
    );
  }

  /// Create a network error widget
  factory ErrorDisplayWidget.networkError({
    Key? key,
    VoidCallback? onRetry,
    String retryButtonText = 'Yeniden Dene',
    EdgeInsetsGeometry? padding,
    EdgeInsetsGeometry? margin,
  }) {
    return ErrorDisplayWidget(
      key: key,
      errorMessage:
          'İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin.',
      onRetry: onRetry,
      errorIcon: '🌐',
      errorColor: Colors.orange,
      retryButtonText: retryButtonText,
      padding: padding,
      margin: margin,
    );
  }

  /// Create a server error widget
  factory ErrorDisplayWidget.serverError({
    Key? key,
    VoidCallback? onRetry,
    String retryButtonText = 'Yeniden Dene',
    EdgeInsetsGeometry? padding,
    EdgeInsetsGeometry? margin,
  }) {
    return ErrorDisplayWidget(
      key: key,
      errorMessage: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
      onRetry: onRetry,
      errorIcon: '🔧',
      errorColor: Colors.red,
      retryButtonText: retryButtonText,
      padding: padding,
      margin: margin,
    );
  }

  /// Create a timeout error widget
  factory ErrorDisplayWidget.timeoutError({
    Key? key,
    VoidCallback? onRetry,
    String retryButtonText = 'Yeniden Dene',
    EdgeInsetsGeometry? padding,
    EdgeInsetsGeometry? margin,
  }) {
    return ErrorDisplayWidget(
      key: key,
      errorMessage: 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',
      onRetry: onRetry,
      errorIcon: '⏰',
      errorColor: Colors.orange,
      retryButtonText: retryButtonText,
      padding: padding,
      margin: margin,
    );
  }

  /// Create an authentication error widget
  factory ErrorDisplayWidget.authError({
    Key? key,
    VoidCallback? onRetry,
    String retryButtonText = 'Giriş Yap',
    EdgeInsetsGeometry? padding,
    EdgeInsetsGeometry? margin,
  }) {
    return ErrorDisplayWidget(
      key: key,
      errorMessage: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
      onRetry: onRetry,
      errorIcon: '🔐',
      errorColor: Colors.red,
      retryButtonText: retryButtonText,
      padding: padding,
      margin: margin,
    );
  }

  /// Create a validation error widget
  factory ErrorDisplayWidget.validationError({
    Key? key,
    required String field,
    required String message,
    VoidCallback? onRetry,
    String retryButtonText = 'Düzelt',
    EdgeInsetsGeometry? padding,
    EdgeInsetsGeometry? margin,
  }) {
    return ErrorDisplayWidget(
      key: key,
      errorMessage: '$field: $message',
      onRetry: onRetry,
      errorIcon: '⚠️',
      errorColor: Colors.amber,
      retryButtonText: retryButtonText,
      padding: padding,
      margin: margin,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    // Use provided error color or default to theme error color
    final effectiveErrorColor = errorColor ?? colorScheme.error;

    // Use provided error icon or default to ❌
    final effectiveErrorIcon = errorIcon ?? '❌';

    return Container(
      padding: padding ?? EdgeInsets.all(16),
      margin: margin ?? EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: effectiveErrorColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: effectiveErrorColor.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Error icon and message row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Error icon
              Container(
                margin: EdgeInsets.only(right: 12),
                child: Text(
                  effectiveErrorIcon,
                  style: TextStyle(fontSize: 24),
                ),
              ),

              // Error message
              Expanded(
                child: Text(
                  errorMessage,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: effectiveErrorColor,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),

          // Retry button (if enabled and callback provided)
          if (showRetryButton && onRetry != null) ...[
            SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: onRetry,
                icon: Icon(Icons.refresh, size: 18),
                label: Text(
                  retryButtonText,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: effectiveErrorColor,
                  foregroundColor: Colors.white,
                  padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// Helper method to convert error color string to Color
  static Color _getErrorColor(String colorString) {
    switch (colorString) {
      case 'red':
        return Colors.red;
      case 'orange':
        return Colors.orange;
      case 'yellow':
        return Colors.amber;
      case 'grey':
        return Colors.grey;
      default:
        return Colors.red;
    }
  }
}

/// A simplified error widget for quick usage
class SimpleErrorWidget extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  final String retryText;

  const SimpleErrorWidget({
    Key? key,
    required this.message,
    this.onRetry,
    this.retryText = 'Yeniden Dene',
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ErrorDisplayWidget(
      errorMessage: message,
      onRetry: onRetry,
      retryButtonText: retryText,
    );
  }
}

/// A full-screen error widget for when the entire screen should show an error
class FullScreenErrorWidget extends StatelessWidget {
  final String errorMessage;
  final VoidCallback? onRetry;
  final String retryButtonText;
  final String? title;

  const FullScreenErrorWidget({
    Key? key,
    required this.errorMessage,
    this.onRetry,
    this.retryButtonText = 'Yeniden Dene',
    this.title,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Error icon
              Container(
                margin: EdgeInsets.only(bottom: 24),
                child: Text(
                  '❌',
                  style: TextStyle(fontSize: 64),
                ),
              ),

              // Title (optional)
              if (title != null) ...[
                Text(
                  title!,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.error,
                      ),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 16),
              ],

              // Error message
              Text(
                errorMessage,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.7),
                    ),
                textAlign: TextAlign.center,
              ),

              // Retry button
              if (onRetry != null) ...[
                SizedBox(height: 32),
                ElevatedButton.icon(
                  onPressed: onRetry,
                  icon: Icon(Icons.refresh),
                  label: Text(retryButtonText),
                  style: ElevatedButton.styleFrom(
                    padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// A compact error widget for inline usage
class CompactErrorWidget extends StatelessWidget {
  final String errorMessage;
  final VoidCallback? onRetry;
  final String retryText;

  const CompactErrorWidget({
    Key? key,
    required this.errorMessage,
    this.onRetry,
    this.retryText = 'Tekrar Dene',
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.error.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: Theme.of(context).colorScheme.error.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.error_outline,
            color: Theme.of(context).colorScheme.error,
            size: 20,
          ),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              errorMessage,
              style: TextStyle(
                color: Theme.of(context).colorScheme.error,
                fontSize: 14,
              ),
            ),
          ),
          if (onRetry != null) ...[
            SizedBox(width: 8),
            TextButton(
              onPressed: onRetry,
              child: Text(
                retryText,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
