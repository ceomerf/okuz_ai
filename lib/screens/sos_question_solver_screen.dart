import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/mock_database_service.dart';
import '../widgets/main_layout.dart';
import 'package:image_picker/image_picker.dart';

class SOSQuestionSolverScreen extends StatefulWidget {
  const SOSQuestionSolverScreen({super.key});

  @override
  _SOSQuestionSolverScreenState createState() =>
      _SOSQuestionSolverScreenState();
}

class _SOSQuestionSolverScreenState extends State<SOSQuestionSolverScreen> {
  File? _image;
  final ImagePicker _picker = ImagePicker();
  String? _solution;
  bool _isLoading = false;

  Future<void> _pickImage() async {
    final pickedFile = await _picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      setState(() {
        _image = File(pickedFile.path);
      });
    }
  }

  Future<void> _solveQuestion() async {
    if (_image == null) return;
    setState(() {
      _isLoading = true;
      _solution = null;
    });

    try {
      final dbService =
          Provider.of<MockDatabaseService>(context, listen: false);
      final imageUrl = await dbService.uploadImage(_image!);
      final result = await dbService
          .callCloudFunction('solveQuestion', {'imageUrl': imageUrl});

      setState(() {
        _solution = result['solution'] ?? 'Çözüm bulunamadı.';
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _solution = 'Bir hata oluştu: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Soru Çözücü'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_image != null)
              Image.file(_image!, height: 300)
            else
              Container(
                height: 300,
                color: Colors.grey[300],
                child: const Center(child: Text('Lütfen bir resim seçin')),
              ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _pickImage,
              child: const Text('Resim Seç'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _solveQuestion,
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Soruyu Çöz'),
            ),
            const SizedBox(height: 16),
            if (_solution != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _solution!,
                  style: const TextStyle(fontSize: 16),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
