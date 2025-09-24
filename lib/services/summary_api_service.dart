import 'dart:io';
import 'dart:typed_data';
import '../models/summary_models.dart';
import 'api_client.dart';

class SummaryApiService {
  final ApiClient _apiClient;

  SummaryApiService(this._apiClient);

  /// Generate summary from text, URL, or PDF file
  Future<GenerateSummaryResponse> generateSummary({
    required SummarySourceType sourceType,
    String? sourceText,
    String? sourceUrl,
    File? sourceFile,
    required SummaryFormat format,
    required SummaryLength length,
  }) async {
    try {
      final response = await _apiClient.generateSummary(
        sourceType: sourceType.value,
        textToSummarize: sourceText,
        sourceUrl: sourceUrl,
        sourceFile: sourceFile,
        format: format.value,
        length: length.value,
      );

      return GenerateSummaryResponse.fromJson(response);
    } catch (e) {
      throw Exception('Özet oluşturulurken bir hata oluştu: $e');
    }
  }

  /// Export summary as PDF
  Future<Uint8List> exportToPdf(String summaryText, String topic) async {
    try {
      return await _apiClient.exportSummaryAsPdf(summaryText, topic);
    } catch (e) {
      throw Exception('PDF indirilirken bir hata oluştu: $e');
    }
  }
} 