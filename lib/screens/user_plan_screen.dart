import 'package:flutter/material.dart';
import 'package:okuz_ai/services/plan_service.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';

class UserPlanScreen extends StatefulWidget {
  const UserPlanScreen({Key? key}) : super(key: key);

  @override
  State<UserPlanScreen> createState() => _UserPlanScreenState();
}

class _UserPlanScreenState extends State<UserPlanScreen>
    with SingleTickerProviderStateMixin {
  final PlanService _planService = PlanService();
  final List<Map<String, dynamic>> _planData = [];
  bool _isLoading = true;
  String? _errorMessage;
  late TabController _tabController;
  Map<int, List<Map<String, dynamic>>> _planByDay = {};
  int _totalTasks = 0;
  int _completedTasks = 0;
  StreamSubscription<User?>? _authSubscription;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _authSubscription = FirebaseAuth.instance.authStateChanges().listen((user) {
      if (user != null) {
        _loadPlan();
      } else {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _errorMessage = "Planınızı görmek için giriş yapmalısınız.";
          });
        }
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _authSubscription?.cancel();
    super.dispose();
  }

  Future<void> _loadPlan() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final planDocument = await _planService.getUserPlan();

      if (planDocument == null) {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _planData.clear();
          });
        }
        return;
      }
      
      final List<dynamic> tasksRaw = planDocument['tasks'] ?? [];
      final planData = tasksRaw.map((task) => Map<String, dynamic>.from(task as Map)).toList();


      // Planı günlere göre grupla
      final planByDay = <int, List<Map<String, dynamic>>>{};

      for (var task in planData) {
        final day = task['day'] as int;

        if (!planByDay.containsKey(day)) {
          planByDay[day] = [];
        }

        planByDay[day]!.add(task);
      }

      // Tamamlanan görev sayısını hesapla
      int completedCount = 0;
      for (var task in planData) {
        if (task['completed'] == true) {
          completedCount++;
        }
      }
      if (!mounted) return;
      setState(() {
        _planData.clear();
        _planData.addAll(planData);
        _planByDay = planByDay;
        _totalTasks = planData.length;
        _completedTasks = completedCount;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _toggleTaskCompletion(String taskId, bool currentValue) async {
    try {
      await _planService.markTaskAsCompleted(taskId, !currentValue);

      // Yerel durum güncellemesi
      setState(() {
        for (var task in _planData) {
          if (task['id'] == taskId) {
            task['completed'] = !currentValue;
            _completedTasks += currentValue ? -1 : 1;
            break;
          }
        }
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Görev güncellenirken hata: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Günlük Planım'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadPlan,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Günlük Plan'),
            Tab(text: 'Dersler'),
          ],
        ),
      ),
      body: _buildBody(),
      bottomNavigationBar: BottomAppBar(
        elevation: 8,
        shape: const CircularNotchedRectangle(),
        notchMargin: 8,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            // Plan butonu (aktif)
            _buildNavItem(
              icon: Icons.calendar_today,
              label: 'Plan',
              isActive: true,
              onTap: () {}, // Zaten bu ekrandayız
            ),
            // Başarılar butonu
            _buildNavItem(
              icon: Icons.emoji_events,
              label: 'Başarılar',
              isActive: false,
              onTap: () {
                Navigator.pushNamed(context, '/gamification');
              },
            ),
            // Orta boşluk (FAB için)
            const SizedBox(width: 40),
            // Zihinsel Destek butonu
            _buildNavItem(
              icon: Icons.psychology,
              label: 'Destek',
              isActive: false,
              onTap: () {
                Navigator.pushNamed(context, '/mental_support');
              },
            ),
            // Araçlar butonu
            _buildNavItem(
              icon: Icons.auto_awesome,
              label: 'Araçlar',
              isActive: false,
              onTap: () {
                Navigator.pushNamed(context, '/smart_tools');
              },
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.pushNamed(context, '/performance_dashboard');
        },
        child: const Icon(Icons.insights),
        tooltip: 'Performans Analizi',
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 48),
            const SizedBox(height: 16),
            Text(
              'Bir hata oluştu',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40),
              child: Text(
                _errorMessage!,
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loadPlan,
              child: const Text('Tekrar Dene'),
            ),
          ],
        ),
      );
    }

    if (_planData.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.schedule, color: Colors.grey, size: 64),
            const SizedBox(height: 16),
            Text(
              'Henüz bir çalışma planınız yok',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                // Onboarding ekranına yönlendir
                // Navigator.of(context).pushReplacement(
                //   MaterialPageRoute(builder: (context) => const OnboardingScreen()),
                // );
              },
              child: const Text('Plan Oluştur'),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        _buildProgressCard(),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildDailyPlanTab(),
              _buildSubjectsTab(),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildProgressCard() {
    final completionPercentage =
        _totalTasks > 0 ? (_completedTasks / _totalTasks * 100).round() : 0;

    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircularPercentIndicator(
              radius: 45.0,
              lineWidth: 10.0,
              animation: true,
              percent: _completedTasks / (_totalTasks > 0 ? _totalTasks : 1),
              center: Text(
                '%$completionPercentage',
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.bold,
                ),
              ),
              circularStrokeCap: CircularStrokeCap.round,
              progressColor: Colors.green,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Genel İlerleme',
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$_completedTasks / $_totalTasks görev tamamlandı',
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${_planByDay.length} günlük plan',
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.grey,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.2, end: 0);
  }

  Widget _buildDailyPlanTab() {
    if (_planByDay.isEmpty) {
      return const Center(
        child: Text('Plan verisi bulunamadı'),
      );
    }

    // Gün sayısına göre liste oluştur
    final days = _planByDay.keys.toList()..sort();

    return ListView.builder(
      itemCount: days.length,
      padding: const EdgeInsets.only(bottom: 100),
      itemBuilder: (context, index) {
        final day = days[index];
        final tasks = _planByDay[day]!;

        // O gün için tamamlanan görev sayısını hesapla
        final completedTasksForDay =
            tasks.where((task) => task['completed'] == true).length;

        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: ExpansionTile(
            title: Text(
              'Gün $day',
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.bold,
              ),
            ),
            subtitle: Text(
              '$completedTasksForDay / ${tasks.length} görev tamamlandı',
              style: const TextStyle(fontSize: 12),
            ),
            leading: CircleAvatar(
              backgroundColor: completedTasksForDay == tasks.length
                  ? Colors.green
                  : completedTasksForDay > 0
                      ? Colors.orange
                      : Colors.grey,
              child: Text(
                '$day',
                style: const TextStyle(color: Colors.white),
              ),
            ),
            children: tasks.map((task) => _buildTaskItem(task)).toList(),
          ),
        ).animate().fadeIn(delay: (50 * index).ms).slideX();
      },
    );
  }

  Widget _buildTaskItem(Map<String, dynamic> task) {
    final isCompleted = task['completed'] == true;

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      title: Text(
        task['konu'] ?? 'Başlıksız görev',
        style: TextStyle(
          decoration: isCompleted ? TextDecoration.lineThrough : null,
          color: isCompleted ? Colors.grey : null,
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${task['ders']} - ${task['unite']}'),
          Text('${task['sure']} dakika'),
        ],
      ),
      trailing: Checkbox(
        value: isCompleted,
        onChanged: (value) {
          _toggleTaskCompletion(task['id'], isCompleted);
        },
      ),
      onTap: () {
        _toggleTaskCompletion(task['id'], isCompleted);
      },
    );
  }

  Widget _buildSubjectsTab() {
    // Dersleri grupla
    final subjectGroups = <String, List<Map<String, dynamic>>>{};

    for (var task in _planData) {
      final subject = task['ders'] as String;

      if (!subjectGroups.containsKey(subject)) {
        subjectGroups[subject] = [];
      }

      subjectGroups[subject]!.add(task);
    }

    final subjects = subjectGroups.keys.toList();

    return ListView.builder(
      itemCount: subjects.length,
      padding: const EdgeInsets.only(bottom: 100),
      itemBuilder: (context, index) {
        final subject = subjects[index];
        final tasks = subjectGroups[subject]!;

        // Ders için tamamlanan görev sayısını hesapla
        final completedTasksForSubject =
            tasks.where((task) => task['completed'] == true).length;

        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: ExpansionTile(
            title: Text(
              subject,
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.bold,
              ),
            ),
            subtitle: Text(
              '$completedTasksForSubject / ${tasks.length} görev tamamlandı',
              style: const TextStyle(fontSize: 12),
            ),
            leading: CircleAvatar(
              backgroundColor: _getSubjectColor(subject),
              child: Text(
                subject.substring(0, 1),
                style: const TextStyle(color: Colors.white),
              ),
            ),
            children: [
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: tasks.length,
                itemBuilder: (context, taskIndex) {
                  return _buildTaskItem(tasks[taskIndex]);
                },
              ),
            ],
          ),
        ).animate().fadeIn(delay: (50 * index).ms).slideX();
      },
    );
  }

  Color _getSubjectColor(String subject) {
    // Her ders için farklı bir renk ata
    final colors = [
      Colors.blue,
      Colors.red,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.teal,
      Colors.pink,
      Colors.indigo,
      Colors.amber,
    ];

    // Basit bir hash fonksiyonu kullanarak string'den renk indeksi oluştur
    int hashCode = 0;
    for (var i = 0; i < subject.length; i++) {
      hashCode += subject.codeUnitAt(i);
    }

    return colors[hashCode % colors.length];
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isActive ? Theme.of(context).primaryColor : Colors.grey,
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: isActive ? Theme.of(context).primaryColor : Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
