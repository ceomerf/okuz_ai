import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'api_error_model.dart';

/// Example service showing how to use ApiError for structured error handling
class ExampleApiService {
  static const String baseUrl = 'https://api.example.com';

  /// Example method showing proper error handling with ApiError
  Future<Map<String, dynamic>> fetchData() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/data'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token',
        },
      ).timeout(Duration(seconds: 30));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        // Parse structured error response
        final errorBody = jsonDecode(response.body);
        throw ApiErrorHelper.parseFromResponse(response.statusCode, errorBody);
      }
    } on http.ClientException catch (e) {
      // Handle network errors
      throw ApiErrorHelper.fromNetworkException(e);
    } on TimeoutException catch (e) {
      // Handle timeout errors
      throw ApiError.timeoutError();
    } catch (e) {
      // Handle any other errors
      throw e.toApiError();
    }
  }

  /// Example method showing validation error handling
  Future<void> createUser(Map<String, dynamic> userData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/users'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(userData),
      );

      if (response.statusCode == 201) {
        return;
      } else {
        final errorBody = jsonDecode(response.body);
        final apiError =
            ApiErrorHelper.parseFromResponse(response.statusCode, errorBody);

        // Handle specific validation errors
        if (apiError.isValidationError && apiError.details != null) {
          final field = apiError.details!['field'] as String?;
          final message = apiError.details!['message'] as String?;

          if (field != null && message != null) {
            throw ApiError.validationError(field, message);
          }
        }

        throw apiError;
      }
    } catch (e) {
      throw e.toApiError();
    }
  }

  /// Example method showing authentication error handling
  Future<Map<String, dynamic>> getProtectedData() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/protected'),
        headers: {
          'Authorization': 'Bearer invalid_token',
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        final errorBody = jsonDecode(response.body);
        final apiError =
            ApiErrorHelper.parseFromResponse(response.statusCode, errorBody);

        // Handle authentication errors specifically
        if (apiError.isAuthError) {
          // Could trigger re-authentication here
          throw ApiError.authError();
        }

        throw apiError;
      }
    } catch (e) {
      throw e.toApiError();
    }
  }
}

/// Example provider showing how to handle ApiError in state management
class ExampleProvider {
  Map<String, dynamic>? _data;
  ApiError? _error;
  bool _isLoading = false;

  Map<String, dynamic>? get data => _data;
  ApiError? get error => _error;
  bool get isLoading => _isLoading;
  bool get hasError => _error != null;

  final ExampleApiService _apiService = ExampleApiService();

  /// Fetch data with proper error handling
  Future<void> fetchData() async {
    _isLoading = true;
    _error = null;
    // notifyListeners(); // If using ChangeNotifier

    try {
      _data = await _apiService.fetchData();
    } on ApiError catch (e) {
      _error = e;
    } catch (e) {
      _error = e.toApiError();
    } finally {
      _isLoading = false;
      // notifyListeners();
    }
  }

  /// Create user with validation error handling
  Future<void> createUser(Map<String, dynamic> userData) async {
    _isLoading = true;
    _error = null;
    // notifyListeners();

    try {
      await _apiService.createUser(userData);
      // Success - could refresh data or navigate
    } on ApiError catch (e) {
      _error = e;
    } catch (e) {
      _error = e.toApiError();
    } finally {
      _isLoading = false;
      // notifyListeners();
    }
  }

  /// Clear error
  void clearError() {
    _error = null;
    // notifyListeners();
  }

  /// Get user-friendly error message
  String get userFriendlyErrorMessage {
    return _error?.userFriendlyMessage ?? '';
  }

  /// Get error icon for UI
  String get errorIcon {
    return _error?.errorIcon ?? '❌';
  }

  /// Get retry suggestion
  String get retrySuggestion {
    return _error != null ? ApiErrorHelper.getRetrySuggestion(_error!) : '';
  }
}

/// Example widget showing how to display ApiError in UI
class ExampleErrorWidget extends StatelessWidget {
  final ApiError error;
  final VoidCallback? onRetry;

  const ExampleErrorWidget({
    Key? key,
    required this.error,
    this.onRetry,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      margin: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _getErrorColor(context).withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _getErrorColor(context)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                error.errorIcon,
                style: TextStyle(fontSize: 20),
              ),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  error.userFriendlyMessage,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: _getErrorColor(context),
                  ),
                ),
              ),
            ],
          ),
          if (ApiErrorHelper.getRetrySuggestion(error).isNotEmpty) ...[
            SizedBox(height: 8),
            Text(
              ApiErrorHelper.getRetrySuggestion(error),
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
          ],
          if (onRetry != null) ...[
            SizedBox(height: 12),
            ElevatedButton(
              onPressed: onRetry,
              child: Text('Tekrar Dene'),
            ),
          ],
        ],
      ),
    );
  }

  Color _getErrorColor(BuildContext context) {
    switch (error.errorColor) {
      case 'red':
        return Colors.red;
      case 'orange':
        return Colors.orange;
      case 'yellow':
        return Colors.amber;
      case 'grey':
        return Colors.grey;
      default:
        return Theme.of(context).colorScheme.error;
    }
  }
}

/// Example of how to use ApiError in a complete widget
class ExampleScreen extends StatefulWidget {
  @override
  _ExampleScreenState createState() => _ExampleScreenState();
}

class _ExampleScreenState extends State<ExampleScreen> {
  final ExampleProvider _provider = ExampleProvider();

  @override
  void initState() {
    super.initState();
    _provider.fetchData();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('API Error Example')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_provider.isLoading) {
      return Center(child: CircularProgressIndicator());
    }

    if (_provider.hasError) {
      return Center(
        child: ExampleErrorWidget(
          error: _provider.error!,
          onRetry: () {
            _provider.clearError();
            _provider.fetchData();
          },
        ),
      );
    }

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('Data loaded successfully!'),
          SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => _provider.fetchData(),
            child: Text('Refresh Data'),
          ),
        ],
      ),
    );
  }
}
