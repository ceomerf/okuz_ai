import 'package:flutter/material.dart';
import 'base_provider.dart';

/// Example provider that demonstrates how to use BaseProvider
/// This shows how to reduce boilerplate code for loading and error handling
class ExampleProvider extends BaseProvider {
  List<String> _items = [];
  String? _selectedItem;

  List<String> get items => _items;
  String? get selectedItem => _selectedItem;

  /// Example method using the base loading and error handling
  Future<void> fetchItems() async {
    // Using the convenience method from BaseProvider
    final result = await handleAsyncOperation(() async {
      // Simulate API call
      await Future.delayed(Duration(seconds: 2));

      // Simulate potential error
      if (DateTime.now().millisecond % 3 == 0) {
        throw Exception('Random error occurred');
      }

      return ['Item 1', 'Item 2', 'Item 3', 'Item 4'];
    });

    if (result != null) {
      _items = result;
      notifyListeners();
    }
  }

  /// Example method using custom error handling
  Future<void> fetchItemsWithCustomError() async {
    final result = await handleAsyncOperationWithCustomError(
      () async {
        // Simulate API call
        await Future.delayed(Duration(seconds: 1));

        // Simulate network error
        if (DateTime.now().millisecond % 2 == 0) {
          throw Exception('Network error');
        }

        return ['Custom Item 1', 'Custom Item 2'];
      },
      (error) => 'Custom error message: ${error.toString()}',
    );

    if (result != null) {
      _items = result;
      notifyListeners();
    }
  }

  /// Example method using manual loading/error handling
  Future<void> fetchItemsManual() async {
    setLoading(true);
    clearError();

    try {
      // Simulate API call
      await Future.delayed(Duration(seconds: 1));

      // Simulate success
      _items = ['Manual Item 1', 'Manual Item 2', 'Manual Item 3'];
      notifyListeners();
    } catch (e) {
      setError('Manual error handling: $e');
    } finally {
      setLoading(false);
    }
  }

  /// Example method that doesn't need loading state
  void selectItem(String item) {
    _selectedItem = item;
    notifyListeners();
  }

  /// Example method that clears data
  void clearItems() {
    _items.clear();
    _selectedItem = null;
    clearError(); // Clear any previous errors
    notifyListeners();
  }
}
