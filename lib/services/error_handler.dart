import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

enum ErrorType {
  network,
  auth,
  server,
  timeout,
  notFound,
  unknown,
}

class ErrorHandler {
  // Singleton pattern
  static final ErrorHandler _instance = ErrorHandler._internal();
  factory ErrorHandler() => _instance;
  ErrorHandler._internal();

  // Hata tipini belirle
  ErrorType getErrorType(dynamic error) {
    if (error is DioException) {
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return ErrorType.timeout;
        case DioExceptionType.badResponse:
          if (error.response?.statusCode == 401 ||
              error.response?.statusCode == 403) {
            return ErrorType.auth;
          } else if (error.response?.statusCode == 404) {
            return ErrorType.notFound;
          } else if (error.response?.statusCode != null &&
              error.response!.statusCode! >= 500) {
            return ErrorType.server;
          }
          return ErrorType.unknown;
        case DioExceptionType.cancel:
          return ErrorType.unknown;
        default:
          return ErrorType.network;
      }
    }
    return ErrorType.unknown;
  }

  // Kullanıcı dostu hata mesajı
  String getUserFriendlyMessage(dynamic error) {
    final errorType = getErrorType(error);

    switch (errorType) {
      case ErrorType.network:
        return 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
      case ErrorType.auth:
        return 'Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapın.';
      case ErrorType.server:
        return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
      case ErrorType.timeout:
        return 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
      case ErrorType.notFound:
        return 'İstediğiniz kaynak bulunamadı.';
      case ErrorType.unknown:
        if (error is DioException && error.response?.data != null) {
          final message = error.response?.data['message'];
          if (message != null && message is String) {
            return message;
          }
        }
        return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
    }
  }

  // Retry mekanizması
  Future<T> retry<T>(
    Future<T> Function() fn, {
    int maxRetries = 3,
    Duration delay = const Duration(seconds: 1),
  }) async {
    int attempts = 0;

    while (true) {
      try {
        attempts++;
        return await fn();
      } catch (e) {
        if (attempts >= maxRetries) {
          rethrow;
        }

        final errorType = getErrorType(e);

        // Auth hatalarında retry yapma
        if (errorType == ErrorType.auth) {
          rethrow;
        }

        // Network ve timeout hatalarında retry yap
        if (errorType == ErrorType.network || errorType == ErrorType.timeout) {
          await Future.delayed(delay * attempts);
          continue;
        }

        // Diğer hatalarda rethrow
        rethrow;
      }
    }
  }

  // Hata snackbar göster
  void showErrorSnackBar(BuildContext context, dynamic error) {
    final message = getUserFriendlyMessage(error);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red.shade700,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 3),
        action: SnackBarAction(
          label: 'Tamam',
          textColor: Colors.white,
          onPressed: () {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
          },
        ),
      ),
    );
  }
}
