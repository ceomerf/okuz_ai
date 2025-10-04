import 'package:flutter/material.dart';
import '../models/plan_summary_model.dart';
import '../widgets/plan_summary_card.dart';
import '../utils/sample_data.dart';
import '../services/api_service.dart';
import '../widgets/websocket_status_widget.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/websocket_provider.dart';
import '../widgets/socket_status_widget.dart';
import '../providers/socket_service_provider.dart';
import 'plan_detail_screen.dart';

class PlanSummaryTestScreen extends StatefulWidget {
  const PlanSummaryTestScreen({Key? key}) : super(key: key);

  @override
  State<PlanSummaryTestScreen> createState() => _PlanSummaryTestScreenState();
}

class _PlanSummaryTestScreenState extends State<PlanSummaryTestScreen> {
  List<PlanSummary> plans = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSampleData();
  }

  void _loadSampleData() {
    // Simulate API call delay
    Future.delayed(const Duration(seconds: 1), () {
      setState(() {
        plans = SampleData.getSamplePlans();
        isLoading = false;
      });
    });
  }

  void _testJsonParsing() {
    final jsonData = SampleData.getSampleJson();
    final plan = PlanSummary.fromJson(jsonData);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('JSON parsing test successful: ${plan.title}'),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _testJsonListParsing() {
    final jsonList = SampleData.getSampleJsonList();
    final parsedPlans =
        jsonList.map((json) => PlanSummary.fromJson(json)).toList();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
            'JSON list parsing test successful: ${parsedPlans.length} plans'),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _testApiIntegration() async {
    try {
      setState(() {
        isLoading = true;
      });

      // API'den gerçek veri çek
      final apiService = ApiService();
      final userId = await apiService.getUserId();

      if (userId != null) {
        final apiPlans = await apiService.getUserPlans(userId);

        setState(() {
          plans = apiPlans;
          isLoading = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('API entegrasyonu başarılı: ${apiPlans.length} plan'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        setState(() {
          isLoading = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Kullanıcı kimliği bulunamadı'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } catch (e) {
      setState(() {
        isLoading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('API hatası: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Plan Summary Test'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              setState(() {
                isLoading = true;
              });
              _loadSampleData();
            },
          ),
          IconButton(
            icon: const Icon(Icons.code),
            onPressed: _testJsonParsing,
          ),
          IconButton(
            icon: const Icon(Icons.list),
            onPressed: _testJsonListParsing,
          ),
          IconButton(
            icon: const Icon(Icons.cloud),
            onPressed: _testApiIntegration,
          ),
        ],
      ),
      body: isLoading
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Loading sample plans...'),
                ],
              ),
            )
          : plans.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.inbox_outlined, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text(
                        'No plans found',
                        style: TextStyle(fontSize: 18, color: Colors.grey),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // WebSocket Status Widget
                    const WebSocketStatusWidget(),

                    // Socket Service Status Widget
                    const SocketStatusWidget(),

                    // Plans List
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: plans.length,
                        itemBuilder: (context, index) {
                          final plan = plans[index];
                          return PlanSummaryCard(
                            plan: plan,
                            onTap: () {
                              _showPlanDetails(plan);
                            },
                          );
                        },
                      ),
                    ),
                  ],
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          _showStatistics();
        },
        child: const Icon(Icons.analytics),
      ),
    );
  }

  void _showPlanDetails(PlanSummary plan) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PlanDetailScreen(planId: plan.id),
      ),
    );
  }

  void _showStatistics() {
    if (plans.isEmpty) return;

    final totalPlans = plans.length;
    final activePlans = plans.where((p) => p.isActive).length;
    final completedPlans = plans.where((p) => p.isCompleted).length;
    final pausedPlans = plans.where((p) => p.isPaused).length;

    final avgProgress =
        plans.map((p) => p.progress).reduce((a, b) => a + b) / totalPlans;
    final avgPerformance = plans
            .where((p) => p.averagePerformance != null)
            .map((p) => p.averagePerformance!)
            .reduce((a, b) => a + b) /
        plans.where((p) => p.averagePerformance != null).length;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Plan Statistics'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Total Plans: $totalPlans'),
            Text('Active Plans: $activePlans'),
            Text('Completed Plans: $completedPlans'),
            Text('Paused Plans: $pausedPlans'),
            const Divider(),
            Text('Average Progress: ${avgProgress.toStringAsFixed(1)}%'),
            Text('Average Performance: ${avgPerformance.toStringAsFixed(1)}%'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
