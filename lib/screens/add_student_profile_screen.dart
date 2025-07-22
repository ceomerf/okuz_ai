import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/mock_database_service.dart';
import '../models/student_profile.dart';
import '../models/user_account.dart';

class AddStudentProfileScreen extends StatefulWidget {
  final Function(UserAccount)? onStudentAdded;

  const AddStudentProfileScreen({
    super.key,
    this.onStudentAdded,
  });

  @override
  State<AddStudentProfileScreen> createState() =>
      _AddStudentProfileScreenState();
}

class _AddStudentProfileScreenState extends State<AddStudentProfileScreen> {
  final _nameController = TextEditingController();
  final _avatarUrlController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Öğrenci Profili Ekle'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Profil Adı'),
            ),
            TextField(
              controller: _avatarUrlController,
              decoration: const InputDecoration(labelText: 'Avatar URL'),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () async {
                final profile = StudentProfile(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  profileName: _nameController.text,
                  studentName: _nameController.text, // studentName eklendi
                  avatarUrl: _avatarUrlController.text,
                  lastActive: DateTime.now(),
                );
                await Provider.of<MockDatabaseService>(context, listen: false)
                    .addStudent(profile);

                // Callback'i çağır
                if (widget.onStudentAdded != null) {
                  final userAccount = UserAccount(
                    id: profile.id,
                    uid: profile.id, // uid eklendi
                    email: '',
                    fullName: profile.profileName,
                  );
                  widget.onStudentAdded!(userAccount);
                }

                Navigator.of(context).pop();
              },
              child: const Text('Ekle'),
            ),
          ],
        ),
      ),
    );
  }
}
