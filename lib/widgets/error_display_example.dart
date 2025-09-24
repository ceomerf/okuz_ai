import 'package:flutter/material.dart';
import 'error_display_widget.dart';
import '../models/api_error_model.dart';
import '../providers/base_provider.dart';

/// Example widget demonstrating how to use ErrorDisplayWidget
/// This shows different usage patterns and integration with providers
class ErrorDisplayExample extends StatefulWidget {
  @override
  _ErrorDisplayExampleState createState() => _ErrorDisplayExampleState();
}

class _ErrorDisplayExampleState extends State<ErrorDisplayExample> {
  String? _currentError;
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Error Display Examples'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Basic usage examples
            _buildSectionTitle('Basic Usage'),
            SizedBox(height: 16),

            // Simple error widget
            ErrorDisplayWidget(
              errorMessage: 'Bu bir basit hata mesajıdır.',
              onRetry: () => _showSnackBar('Retry clicked!'),
            ),

            SizedBox(height: 16),

            // Error without retry button
            ErrorDisplayWidget(
              errorMessage: 'Bu hata için retry butonu yok.',
              onRetry: null,
              showRetryButton: false,
            ),

            SizedBox(height: 24),

            // Factory constructors
            _buildSectionTitle('Factory Constructors'),
            SizedBox(height: 16),

            // Network error
            ErrorDisplayWidget.networkError(
              onRetry: () => _showSnackBar('Network retry!'),
            ),

            SizedBox(height: 16),

            // Server error
            ErrorDisplayWidget.serverError(
              onRetry: () => _showSnackBar('Server retry!'),
            ),

            SizedBox(height: 16),

            // Timeout error
            ErrorDisplayWidget.timeoutError(
              onRetry: () => _showSnackBar('Timeout retry!'),
            ),

            SizedBox(height: 16),

            // Auth error
            ErrorDisplayWidget.authError(
              onRetry: () => _showSnackBar('Auth retry!'),
            ),

            SizedBox(height: 16),

            // Validation error
            ErrorDisplayWidget.validationError(
              field: 'Email',
              message: 'Geçersiz email formatı',
              onRetry: () => _showSnackBar('Validation retry!'),
            ),

            SizedBox(height: 24),

            // ApiError integration
            _buildSectionTitle('ApiError Integration'),
            SizedBox(height: 16),

            // From ApiError object
            ErrorDisplayWidget.fromApiError(
              error: ApiError.networkError(),
              onRetry: () => _showSnackBar('ApiError retry!'),
            ),

            SizedBox(height: 16),

            // Custom ApiError
            ErrorDisplayWidget.fromApiError(
              error: ApiError(
                statusCode: 400,
                message: 'Özel hata mesajı',
                error: 'Custom Error',
              ),
              onRetry: () => _showSnackBar('Custom error retry!'),
            ),

            SizedBox(height: 24),

            // Alternative widgets
            _buildSectionTitle('Alternative Widgets'),
            SizedBox(height: 16),

            // Simple error widget
            SimpleErrorWidget(
              message: 'Basit hata widget\'ı',
              onRetry: () => _showSnackBar('Simple retry!'),
            ),

            SizedBox(height: 16),

            // Compact error widget
            CompactErrorWidget(
              errorMessage: 'Kompakt hata widget\'ı',
              onRetry: () => _showSnackBar('Compact retry!'),
            ),

            SizedBox(height: 24),

            // Provider integration example
            _buildSectionTitle('Provider Integration'),
            SizedBox(height: 16),

            // Simulate provider state
            _buildProviderExample(),

            SizedBox(height: 24),

            // Custom styling
            _buildSectionTitle('Custom Styling'),
            SizedBox(height: 16),

            ErrorDisplayWidget(
              errorMessage: 'Özel renk ve padding ile hata mesajı',
              onRetry: () => _showSnackBar('Custom styled retry!'),
              errorColor: Colors.purple,
              errorIcon: '🎨',
              padding: EdgeInsets.all(24),
              margin: EdgeInsets.symmetric(vertical: 8),
              retryButtonText: 'Özel Buton',
            ),

            SizedBox(height: 24),

            // Test buttons
            _buildSectionTitle('Test Buttons'),
            SizedBox(height: 16),

            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ElevatedButton(
                  onPressed: () =>
                      _setError('Network Error', ApiError.networkError()),
                  child: Text('Network Error'),
                ),
                ElevatedButton(
                  onPressed: () =>
                      _setError('Server Error', ApiError.serverError()),
                  child: Text('Server Error'),
                ),
                ElevatedButton(
                  onPressed: () =>
                      _setError('Auth Error', ApiError.authError()),
                  child: Text('Auth Error'),
                ),
                ElevatedButton(
                  onPressed: () =>
                      _setError('Timeout Error', ApiError.timeoutError()),
                  child: Text('Timeout Error'),
                ),
                ElevatedButton(
                  onPressed: () => _setError('Validation Error',
                      ApiError.validationError('Email', 'Geçersiz format')),
                  child: Text('Validation Error'),
                ),
                ElevatedButton(
                  onPressed: () => _clearError(),
                  child: Text('Clear Error'),
                ),
              ],
            ),

            SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: Theme.of(context).colorScheme.primary,
      ),
    );
  }

  Widget _buildProviderExample() {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Provider State Simulation:',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          SizedBox(height: 8),
          Text('Error: ${_currentError ?? "None"}'),
          Text('Loading: $_isLoading'),
          SizedBox(height: 16),

          // Simulate provider error display
          if (_currentError != null)
            ErrorDisplayWidget.fromApiError(
              error: _parseError(_currentError!),
              onRetry: () {
                setState(() {
                  _isLoading = true;
                  _currentError = null;
                });

                // Simulate loading
                Future.delayed(Duration(seconds: 2), () {
                  setState(() {
                    _isLoading = false;
                  });
                  _showSnackBar('Retry successful!');
                });
              },
            ),

          if (_isLoading)
            Padding(
              padding: EdgeInsets.only(top: 16),
              child: Row(
                children: [
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  SizedBox(width: 12),
                  Text('Loading...'),
                ],
              ),
            ),
        ],
      ),
    );
  }

  void _setError(String type, ApiError error) {
    setState(() {
      _currentError = type;
    });
  }

  void _clearError() {
    setState(() {
      _currentError = null;
    });
  }

  ApiError _parseError(String errorType) {
    switch (errorType) {
      case 'Network Error':
        return ApiError.networkError();
      case 'Server Error':
        return ApiError.serverError();
      case 'Auth Error':
        return ApiError.authError();
      case 'Timeout Error':
        return ApiError.timeoutError();
      case 'Validation Error':
        return ApiError.validationError('Email', 'Geçersiz format');
      default:
        return ApiError(
          statusCode: 500,
          message: 'Bilinmeyen hata: $errorType',
          error: 'Unknown Error',
        );
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: Duration(seconds: 2),
      ),
    );
  }
}

/// Example of how to use ErrorDisplayWidget in a real screen
class ExampleScreen extends StatefulWidget {
  @override
  _ExampleScreenState createState() => _ExampleScreenState();
}

class _ExampleScreenState extends State<ExampleScreen> {
  bool _isLoading = false;
  String? _error;
  List<String> _data = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Example Screen'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Veriler yükleniyor...'),
          ],
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: ErrorDisplayWidget(
          errorMessage: _error!,
          onRetry: _loadData,
        ),
      );
    }

    if (_data.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('Veri bulunamadı'),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadData,
              child: Text('Yenile'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: EdgeInsets.all(16),
      itemCount: _data.length,
      itemBuilder: (context, index) {
        return Card(
          margin: EdgeInsets.only(bottom: 8),
          child: ListTile(
            title: Text(_data[index]),
            leading: Icon(Icons.check_circle, color: Colors.green),
          ),
        );
      },
    );
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Simulate API call
      await Future.delayed(Duration(seconds: 2));

      // Simulate random error
      if (DateTime.now().millisecond % 3 == 0) {
        throw Exception('Simulated error');
      }

      setState(() {
        _data = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Veriler yüklenirken hata oluştu: ${e.toString()}';
        _isLoading = false;
      });
    }
  }
}
