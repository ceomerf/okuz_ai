import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/optimized_providers.dart';
import '../widgets/optimized/optimized_list_view.dart';
import '../utils/performance_utils.dart';

/// Example screen showing performance optimization techniques
class PerformanceOptimizationExample extends ConsumerWidget {
  const PerformanceOptimizationExample({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Performance Optimization Example'),
      ),
      body: Column(
        children: [
          // Example 1: Using optimized selectors
          _OptimizedUserInfo(),
          
          // Example 2: Using optimized list view
          Expanded(
            child: _OptimizedStudySessionsList(),
          ),
          
          // Example 3: Using performance monitoring
          _PerformanceStats(),
        ],
      ),
    );
  }
}

/// Example 1: Optimized user info widget using selectors
class _OptimizedUserInfo extends ConsumerWidget {
  const _OptimizedUserInfo();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Using optimized selectors - only rebuilds when specific data changes
    final userName = ref.watch(userNameProvider);
    final userEmail = ref.watch(userEmailProvider);
    final userRole = ref.watch(userRoleProvider);
    final isAdmin = ref.watch(isAdminProvider);

    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'User Information',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            PerformanceUtils.constText('Name: $userName'),
            PerformanceUtils.constText('Email: $userEmail'),
            PerformanceUtils.constText('Role: $userRole'),
            if (isAdmin)
              PerformanceUtils.constText(
                'Admin Access',
                style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
              ),
          ],
        ),
      ),
    );
  }
}

/// Example 2: Optimized study sessions list
class _OptimizedStudySessionsList extends ConsumerWidget {
  const _OptimizedStudySessionsList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Using optimized selectors for better performance
    final completedSessions = ref.watch(completedSessionsProvider);
    final pendingSessions = ref.watch(pendingSessionsProvider);
    final totalStudyTime = ref.watch(totalStudyTimeProvider);
    final averageScore = ref.watch(averageScoreProvider);

    return Column(
      children: [
        // Performance stats
        Card(
          margin: const EdgeInsets.all(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                PerformanceUtils.constText(
                  'Total Study Time: ${totalStudyTime} minutes',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                PerformanceUtils.constText(
                  'Average Score: ${averageScore.toStringAsFixed(1)}',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
          ),
        ),
        
        // Optimized list view
        Expanded(
          child: OptimizedListView(
            items: [...completedSessions, ...pendingSessions],
            itemBuilder: (context, index, session) {
              return OptimizedListItem(
                title: session.subject,
                subtitle: 'Duration: ${session.duration} min, Score: ${session.score}',
                icon: session.isCompleted ? Icons.check_circle : Icons.pending,
                backgroundColor: session.isCompleted ? Colors.green.shade50 : Colors.orange.shade50,
                textColor: session.isCompleted ? Colors.green.shade800 : Colors.orange.shade800,
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Example 3: Performance monitoring
class _PerformanceStats extends ConsumerWidget {
  const _PerformanceStats();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            PerformanceUtils.constText(
              'Performance Statistics',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () {
                // Start timing a performance operation
                PerformanceMonitor.startTiming('button_click');
                
                // Simulate some work
                Future.delayed(const Duration(milliseconds: 100), () {
                  final duration = PerformanceMonitor.endTiming('button_click');
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Operation took: ${duration.inMilliseconds}ms'),
                    ),
                  );
                });
              },
              child: const Text('Test Performance'),
            ),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () {
                final stats = PerformanceMonitor.getAllStats();
                showDialog(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Performance Stats'),
                    content: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: stats.entries.map((entry) {
                        return Text('${entry.key}: ${entry.value.inMilliseconds}ms');
                      }).toList(),
                    ),
                    actions: [
                      TextButton(
                        onPressed: () {
                          PerformanceMonitor.clearStats();
                          Navigator.of(context).pop();
                        },
                        child: const Text('Clear Stats'),
                      ),
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('Close'),
                      ),
                    ],
                  ),
                );
              },
              child: const Text('Show Stats'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Example of how to use memoized widgets
class _MemoizedExample extends ConsumerWidget {
  const _MemoizedExample();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userName = ref.watch(userNameProvider);
    
    return PerformanceUtils.memoizedWidget(
      dependencies: [userName],
      builder: () => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text('Hello, $userName!'),
        ),
      ),
    );
  }
}

/// Example of optimized grid view
class _OptimizedGridView extends ConsumerWidget {
  const _OptimizedGridView();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subjects = ['Math', 'Science', 'History', 'English'];
    
    return OptimizedGridView(
      items: subjects,
      crossAxisCount: 2,
      childAspectRatio: 1.2,
      itemBuilder: (context, index, subject) {
        return OptimizedGridItem(
          title: subject,
          icon: Icons.book,
          color: Colors.blue,
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Selected: $subject')),
            );
          },
        );
      },
    );
  }
}
