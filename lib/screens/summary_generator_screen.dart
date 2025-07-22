import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/mock_database_service.dart';
import '../widgets/main_layout.dart';

class SummaryGeneratorScreen extends StatefulWidget {
  const SummaryGeneratorScreen({super.key});

  @override
  _SummaryGeneratorScreenState createState() => _SummaryGeneratorScreenState();
}

class _SummaryGeneratorScreenState extends State<SummaryGeneratorScreen> {
  final _textController = TextEditingController();
  String? _summary;
  bool _isLoading = false;

  Future<void> _generateSummary() async {
    if (_textController.text.isEmpty) return;
    setState(() {
      _isLoading = true;
      _summary = null;
    });

    try {
      final dbService =
          Provider.of<MockDatabaseService>(context, listen: false);
      final result = await dbService
          .callCloudFunction('generateSummary', {'text': _textController.text});

      setState(() {
        _summary = result['summary'] ?? 'Özet oluşturulamadı.';
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _summary = 'Bir hata oluştu: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _textController,
              maxLines: 10,
              decoration: const InputDecoration(
                hintText: 'Özetlenecek metni buraya girin...',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _generateSummary,
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Özet Oluştur'),
            ),
            const SizedBox(height: 16),
            if (_summary != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _summary!,
                  style: const TextStyle(fontSize: 16),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
