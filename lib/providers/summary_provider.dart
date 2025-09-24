import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_file/open_file.dart';
import 'package:permission_handler/permission_handler.dart';
import '../models/summary_models.dart';
import '../services/summary_api_service.dart';
import '../services/providers.dart';

// API Service Provider
final summaryApiServiceProvider = Provider<SummaryApiService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return SummaryApiService(apiClient);
});

// API Client Provider
// ApiClient provider merkezi dosyaya taşındı (services/providers.dart)

// Summary State
abstract class SummaryState {}

class SummaryInitial extends SummaryState {}

class SummaryLoading extends SummaryState {}

class SummaryLoaded extends SummaryState {
  final GenerateSummaryResponse response;
  SummaryLoaded(this.response);
}

class SummaryError extends SummaryState {
  final String message;
  SummaryError(this.message);
}

// Summary Notifier
class SummaryNotifier extends StateNotifier<SummaryState> {
  final SummaryApiService _apiService;

  SummaryNotifier(this._apiService) : super(SummaryInitial());

  Future<void> generateSummary({
    required SummarySourceType sourceType,
    String? sourceText,
    String? sourceUrl,
    File? sourceFile,
    required SummaryFormat format,
    required SummaryLength length,
  }) async {
    // Input validation
    switch (sourceType) {
      case SummarySourceType.text:
        if (sourceText == null || sourceText.trim().isEmpty) {
          state = SummaryError('Özetlenecek metin boş olamaz.');
          return;
        }
        break;
      case SummarySourceType.url:
        if (sourceUrl == null || sourceUrl.trim().isEmpty) {
          state = SummaryError('Geçerli bir URL girilmelidir.');
          return;
        }
        break;
      case SummarySourceType.pdf:
        if (sourceFile == null) {
          state = SummaryError('PDF dosyası seçilmelidir.');
          return;
        }
        break;
    }

    state = SummaryLoading();
    
    try {
      final response = await _apiService.generateSummary(
        sourceType: sourceType,
        sourceText: sourceText,
        sourceUrl: sourceUrl,
        sourceFile: sourceFile,
        format: format,
        length: length,
      );
      
      state = SummaryLoaded(response);
    } catch (e) {
      state = SummaryError('Özet oluşturulurken bir hata oluştu: ${e.toString()}');
    }
  }

  // PDF Export Function
  Future<String?> exportToPdf(String summaryText, String topic) async {
    // Check and request storage permission
    var status = await Permission.storage.status;
    if (!status.isGranted) {
      status = await Permission.storage.request();
      if (!status.isGranted) {
        return "Dosya kaydetme izni verilmedi.";
      }
    }

    try {
      final pdfData = await _apiService.exportToPdf(summaryText, topic);
      
      // Get documents directory
      final dir = await getApplicationDocumentsDirectory();
      final fileName = '${topic.replaceAll(' ', '_').replaceAll(RegExp(r'[^\w\s-]'), '')}-ozet.pdf';
      final file = File('${dir.path}/$fileName');
      
      // Write PDF data to file
      await file.writeAsBytes(pdfData);
      
      // Open the file
      await OpenFile.open(file.path);
      
      return null; // Success
    } catch (e) {
      return "PDF indirilirken bir hata oluştu: ${e.toString()}";
    }
  }

  void reset() {
    state = SummaryInitial();
  }
}

// Summary Provider
final summaryProvider = StateNotifierProvider<SummaryNotifier, SummaryState>((ref) {
  final apiService = ref.watch(summaryApiServiceProvider);
  return SummaryNotifier(apiService);
}); 