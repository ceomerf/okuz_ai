import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:okuz_ai/models/long_term_plan.dart';
import 'package:okuz_ai/services/plan_service.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:okuz_ai/screens/feynman_cycle_screen.dart';

class PlanDisplayScreen extends StatefulWidget {
  const PlanDisplayScreen({Key? key}) : super(key: key);

  @override
  State<PlanDisplayScreen> createState() => _PlanDisplayScreenState();
}

class _PlanDisplayScreenState extends State<PlanDisplayScreen> {
  late Future<LongTermPlan?> _planFuture;
  final PlanService _planService = PlanService();
  LongTermPlan? _currentPlan;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _planFuture = _fetchPlan();
  }

  Future<LongTermPlan?> _fetchPlan() async {
    try {
      final planData = await _planService.getUserPlan();
      if (planData != null) {
        _currentPlan = LongTermPlan.fromMap(planData, 'user_plan');
        return _currentPlan;
      }
      return null;
    } catch (e) {
      // Hata durumunu ele al
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Plan yüklenemedi: ${e.toString()}')),
      );
      return null;
    }
  }

  Future<void> _deleteTask(Day day, DailyTask task) async {
    if (_currentPlan == null) return;

    // Onay al
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Görevi Sil'),
        content: Text(
            '"${task.topic}" görevini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('İptal')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sil', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() {
        _isLoading = true;
      });

      try {
        // Değişiklik objesini oluştur
        final modifications = {
          'deleteTask': {
            'date': day.date,
            'topic': task.topic,
          }
        };

        final planMap =
            _currentPlan!.weeks.fold<Map<String, dynamic>>({}, (prev, week) {
          // Bu kısım planı servise göndermek için tekrar map'e çeviriyor.
          // Daha verimli bir yöntem bulunabilir.
          return prev;
        });

        // Servisi çağır
        // final updatedPlanMap = await _planService.updatePlan(planMap, modifications);

        // UI'ı güncellemek için geçici çözüm: Lokal olarak silme
        setState(() {
          day.dailyTasks.remove(task);
          // _currentPlan = LongTermPlan.fromMap(updatedPlanMap, 'user_plan');
          _isLoading = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text(
                  'Görev silindi ve plan yeniden düzenleniyor... (Simülasyon)')),
        );
      } catch (e) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Hata: ${e.toString()}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Aylık Çalışma Planın'),
        backgroundColor: AppTheme.backgroundColor,
        elevation: 0,
        centerTitle: true,
      ),
      body: FutureBuilder<LongTermPlan?>(
        future: _planFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError || !snapshot.hasData || snapshot.data == null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Planın henüz oluşturulmamış.'),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () {
                      // TODO: Onboarding'e yönlendirme veya plan oluşturma tetikleme
                    },
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(200, 48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      backgroundColor: AppTheme.primaryColor,
                      elevation: 0,
                    ),
                    child: const Text('Hemen Plan Oluştur'),
                  ),
                ],
              ),
            );
          }

          final plan = snapshot.data!;
          return Stack(
            children: [
              _buildPlanView(plan),
              if (_isLoading)
                Container(
                  color: Colors.black.withOpacity(0.5),
                  child: const Center(
                    child: CircularProgressIndicator(),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildPlanView(LongTermPlan plan) {
    // Tüm günleri tek bir listeye topla
    final allDays = plan.weeks.expand((week) => week.days).toList();

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      itemCount: allDays.length,
      itemBuilder: (context, index) {
        final day = allDays[index];
        return _buildDayCard(day, context)
            .animate()
            .fadeIn(duration: 500.ms)
            .slideY(begin: 0.5);
      },
    );
  }

  Widget _buildDayCard(Day day, BuildContext context) {
    DateTime parsedDate;
    try {
      parsedDate = DateFormat('yyyy-MM-dd').parse(day.date);
    } catch (e) {
      parsedDate = DateTime.now(); // Hata durumunda bugünün tarihi
    }

    final String formattedDate =
        DateFormat('d MMMM, EEEE', 'tr_TR').format(parsedDate);

    return Card(
      margin: const EdgeInsets.only(bottom: 16.0),
      elevation: 2,
      shadowColor: Colors.black.withOpacity(0.1),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: day.isRestDay ? AppTheme.restDayCardColor : AppTheme.cardColor,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              formattedDate,
              style: GoogleFonts.montserrat(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color:
                    day.isRestDay ? Colors.white70 : AppTheme.textPrimaryColor,
              ),
            ),
            const SizedBox(height: 12),
            if (day.isRestDay)
              _buildRestDayContent()
            else
              _buildTasksContent(day, context),
          ],
        ),
      ),
    );
  }

  Widget _buildRestDayContent() {
    return Row(
      children: [
        const Icon(Icons.bedtime_outlined, color: Colors.white70, size: 28),
        const SizedBox(width: 12),
        Text(
          'Dinlenme Günü',
          style: GoogleFonts.lato(fontSize: 16, color: Colors.white),
        ),
      ],
    );
  }

  Widget _buildTasksContent(Day day, BuildContext context) {
    return Column(
      children: [
        ...day.dailyTasks.map((task) => _buildTaskTile(day, task)),
        const SizedBox(height: 16),
        Align(
          alignment: Alignment.centerRight,
          child: ElevatedButton.icon(
            icon: const Icon(Icons.check_circle_outline, size: 18),
            label: const Text('Tamamla'),
            onPressed: () {
              // TODO: Günü tamamlama mantığı
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        )
      ],
    );
  }

  Widget _buildTaskTile(Day day, DailyTask task) {
    return InkWell(
      onTap: () {
        if (task.feynman != null) {
          Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (context) => FeynmanCycleScreen(task: task)));
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content:
                    Text('Bu görev için detaylı öğrenme adımı bulunmuyor.')),
          );
        }
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4.0),
        child: Row(
          children: [
            IconButton(
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              icon: Icon(
                task.isCompleted
                    ? Icons.check_box
                    : Icons.check_box_outline_blank,
                color: task.isCompleted ? AppTheme.primaryColor : Colors.grey,
              ),
              onPressed: () {
                // TODO: Görev tamamlama state yönetimi
              },
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    task.topic,
                    style: GoogleFonts.lato(
                        fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  Text(
                    '${task.subject} • ${task.durationInMinutes} dakika',
                    style:
                        GoogleFonts.lato(fontSize: 14, color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
            IconButton(
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              icon: Icon(Icons.delete_outline, color: Colors.red.shade300),
              onPressed: () {
                _deleteTask(day, task);
              },
            ),
          ],
        ),
      ),
    );
  }
}
