import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/long_term_plan.dart';
import '../../theme/app_theme.dart';

typedef TaskFormOnSave = Future<void> Function(
  BuildContext context,
  Map<String, dynamic> data,
);

class TaskFormModal extends StatefulWidget {
  final DailyTask? task;
  final TaskFormOnSave onSave;

  const TaskFormModal({super.key, this.task, required this.onSave});

  @override
  State<TaskFormModal> createState() => _TaskFormModalState();
}

class _TaskFormModalState extends State<TaskFormModal> {
  late final TextEditingController _subjectController;
  late final TextEditingController _topicController;
  late int _selectedDuration;

  @override
  void initState() {
    super.initState();
    _subjectController = TextEditingController(text: widget.task?.subject ?? '');
    _topicController = TextEditingController(text: widget.task?.topic ?? '');
    _selectedDuration = widget.task?.durationInMinutes ?? 60;
  }

  @override
  void dispose() {
    _subjectController.dispose();
    _topicController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool isEdit = widget.task != null;

    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(20),
          topRight: Radius.circular(20),
        ),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isEdit ? Icons.edit_rounded : Icons.add_task_rounded,
                  color: isEdit ? Colors.blue.shade600 : AppTheme.primaryColor,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Text(
                  isEdit ? 'Görevi Düzenle' : 'Yeni Görev Ekle',
                  style: GoogleFonts.montserrat(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).textTheme.bodyLarge?.color,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            TextField(
              controller: _subjectController,
              decoration: const InputDecoration(
                labelText: 'Ders',
                hintText: 'Örn. Matematik',
                prefixIcon: Icon(Icons.book_outlined),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _topicController,
              decoration: const InputDecoration(
                labelText: 'Konu',
                hintText: 'Örn. Türev',
                prefixIcon: Icon(Icons.topic_outlined),
              ),
            ),
            const SizedBox(height: 12),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Süre (dk)'),
                DropdownButton<int>(
                  value: _selectedDuration,
                  items: const [30, 45, 60, 75, 90]
                      .map((e) => DropdownMenuItem(value: e, child: Text('$e dk')))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() => _selectedDuration = val);
                    }
                  },
                ),
              ],
            ),
            const SizedBox(height: 20),

            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('İptal'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: () async {
                      if (_subjectController.text.trim().isEmpty ||
                          _topicController.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Lütfen tüm alanları doldurun'),
                            backgroundColor: Colors.red,
                          ),
                        );
                        return;
                      }

                      final data = {
                        'subject': _subjectController.text.trim(),
                        'topic': _topicController.text.trim(),
                        'durationInMinutes': _selectedDuration,
                      };

                      Navigator.pop(context);
                      await widget.onSave(context, data);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          isEdit ? Colors.blue.shade600 : AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(isEdit ? 'Değişiklikleri Kaydet' : 'Görev Ekle'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

