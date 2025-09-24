import 'package:flutter/material.dart';

/// Abstract base class for all providers that handles common state logic
/// like loading states and error handling to reduce boilerplate code.
///
/// Usage:
/// ```dart
/// class MyProvider extends BaseProvider {
///   Future<void> fetchData() async {
///     setLoading(true);
///     try {
///       // Your async operation
///       await someApiCall();
///       setError(null); // Clear any previous errors
///     } catch (e) {
///       setError('Failed to fetch data: $e');
///     } finally {
///       setLoading(false);
///     }
///   }
/// }
/// ```
abstract class BaseProvider with ChangeNotifier {
  bool _isLoading = false;
  String? _error;

  /// Returns the current loading state
  bool get isLoading => _isLoading;

  /// Returns the current error message, null if no error
  String? get error => _error;

  /// Returns true if there is an error
  bool get hasError => _error != null;

  /// Sets the loading state and notifies listeners
  /// Use this method instead of directly setting _isLoading
  @protected
  void setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }

  /// Sets the error message and notifies listeners
  /// Use this method instead of directly setting _error
  @protected
  void setError(String? message) {
    _error = message;
    notifyListeners();
  }

  /// Clears the current error and notifies listeners
  void clearError() {
    _error = null;
    notifyListeners();
  }

  /// Convenience method to handle async operations with automatic
  /// loading and error state management
  @protected
  Future<T?> handleAsyncOperation<T>(Future<T> Function() operation) async {
    setLoading(true);
    clearError();

    try {
      final result = await operation();
      return result;
    } catch (e) {
      setError(e.toString());
      return null;
    } finally {
      setLoading(false);
    }
  }

  /// Convenience method to handle async operations with custom error handling
  @protected
  Future<T?> handleAsyncOperationWithCustomError<T>(
    Future<T> Function() operation,
    String Function(dynamic error) errorHandler,
  ) async {
    setLoading(true);
    clearError();

    try {
      final result = await operation();
      return result;
    } catch (e) {
      setError(errorHandler(e));
      return null;
    } finally {
      setLoading(false);
    }
  }
}
