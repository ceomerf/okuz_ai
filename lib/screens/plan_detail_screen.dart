import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/plan_detail_provider.dart';
import '../models/plan_detail_model.dart';

class PlanDetailScreen extends ConsumerStatefulWidget {
  final String planId;

  const PlanDetailScreen({
    Key? key,
    required this.planId,
  }) : super(key: key);

  @override
  ConsumerState<PlanDetailScreen> createState() => _PlanDetailScreenState();
}

class _PlanDetailScreenState extends ConsumerState<PlanDetailScreen> {
  @override
  void initState() {
    super.initState();
    // Plan detaylarını yükle
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(planDetailNotifierProvider.notifier).fetchPlan(widget.planId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(planDetailNotifierProvider);
    final notifier = ref.read(planDetailNotifierProvider.notifier);
    return Scaffold(
      appBar: AppBar(
        title: Text(state.plan?.title ?? 'Plan Detayları'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          if (state.plan != null)
            IconButton(
              icon: Icon(
                state.plan!.isActive ? Icons.pause : Icons.play_arrow,
              ),
              onPressed: () {
                final newStatus = state.plan!.isActive ? 'paused' : 'active';
                notifier.updatePlanStatus(newStatus);
              },
            ),
        ],
      ),
      body: _buildBody(state, notifier),
    );
  }

  Widget _buildBody(PlanDetailState state, PlanDetailNotifier notifier) {
    if (state.isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Plan detayları yükleniyor...'),
          ],
        ),
      );
    }

    if (state.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Hata: ${state.error}',
              style: const TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                notifier.clearError();
                notifier.fetchPlan(widget.planId);
              },
              child: const Text('Tekrar Dene'),
            ),
          ],
        ),
      );
    }

    if (state.plan == null) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Plan bulunamadı',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return _buildPlanContent(state.plan!, notifier);
  }

  Widget _buildPlanContent(PlanDetail plan, PlanDetailNotifier notifier) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Plan Header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          plan.title,
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: plan.isActive ? Colors.green : Colors.grey,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          plan.isActive ? 'Aktif' : 'Duraklatıldı',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('Tür: ${plan.type}'),
                  Text('Oluşturulma: ${plan.createdAt}'),
                  Text('Bitiş: ${plan.endDate}'),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Progress Section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'İlerleme',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                      ),
                      Text(
                        '${plan.progress}%',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue,
                                ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: plan.progress / 100,
                    backgroundColor: Colors.grey[300],
                    valueColor: AlwaysStoppedAnimation<Color>(
                      plan.progress >= 80
                          ? Colors.green
                          : plan.progress >= 60
                              ? Colors.orange
                              : plan.progress >= 40
                                  ? Colors.yellow
                                  : Colors.red,
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Sessions Section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Çalışma Seansları (${plan.sessions.length})',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 12),
                  ...plan.sessions.map((session) => _buildSessionTile(session)),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Real-time Status
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.wifi, color: Colors.green),
                      const SizedBox(width: 8),
                      Text(
                        'Real-time Bağlantı',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Bu sayfa real-time güncellemeler alıyor. Plan detayları otomatik olarak güncellenecek.',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSessionTile(StudySession session) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: session.isCompleted ? Colors.green : Colors.grey,
          child: Icon(
            session.isCompleted ? Icons.check : Icons.schedule,
            color: Colors.white,
          ),
        ),
        title: Text(session.topic),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Ders: ${session.subject}'),
            Text('Süre: ${session.duration} dakika'),
            if (session.isCompleted && session.performance != null)
              Text('Performans: ${session.performance}%'),
            if (session.notes != null) Text('Not: ${session.notes}'),
          ],
        ),
        trailing: session.isCompleted
            ? const Icon(Icons.check_circle, color: Colors.green)
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.check, color: Colors.green),
                    onPressed: () => _showCompleteSessionDialog(session),
                  ),
                  IconButton(
                    icon: const Icon(Icons.skip_next, color: Colors.orange),
                    onPressed: () => _showSkipSessionDialog(session),
                  ),
                ],
              ),
      ),
    );
  }

  void _showCompleteSessionDialog(StudySession session) {
    int performance = 80;
    String notes = '';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Session Tamamla'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Konu: ${session.topic}'),
            const SizedBox(height: 16),
            const Text('Performansınızı değerlendirin:'),
            Slider(
              value: performance.toDouble(),
              min: 0,
              max: 100,
              divisions: 20,
              label: '$performance%',
              onChanged: (value) {
                performance = value.round();
              },
            ),
            TextField(
              decoration: const InputDecoration(
                labelText: 'Notlar (opsiyonel)',
                border: OutlineInputBorder(),
              ),
              onChanged: (value) {
                notes = value;
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              ref.read(planDetailNotifierProvider.notifier).completeSession(
                    session.id,
                    performance,
                    notes: notes.isNotEmpty ? notes : null,
                  );
            },
            child: const Text('Tamamla'),
          ),
        ],
      ),
    );
  }

  void _showSkipSessionDialog(StudySession session) {
    String reason = '';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Session Ata'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Konu: ${session.topic}'),
            const SizedBox(height: 16),
            TextField(
              decoration: const InputDecoration(
                labelText: 'Atlama sebebi',
                border: OutlineInputBorder(),
              ),
              onChanged: (value) {
                reason = value;
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () {
              if (reason.isNotEmpty) {
                Navigator.of(context).pop();
                ref
                    .read(planDetailNotifierProvider.notifier)
                    .skipSession(session.id, reason);
              }
            },
            child: const Text('Ata'),
          ),
        ],
      ),
    );
  }
}
