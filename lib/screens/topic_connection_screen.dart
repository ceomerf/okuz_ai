import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/performance_analysis_service.dart';
import '../widgets/main_layout.dart';

class TopicConnectionScreen extends StatefulWidget {
  const TopicConnectionScreen({super.key});

  @override
  _TopicConnectionScreenState createState() => _TopicConnectionScreenState();
}

class _TopicConnectionScreenState extends State<TopicConnectionScreen> {
  late Future<List<Map<String, dynamic>>> _topicMap;
  String? _selectedTopic;
  Future<Map<String, dynamic>>? _topicConnection;

  @override
  void initState() {
    super.initState();
    final performanceService =
        Provider.of<PerformanceAnalysisService>(context, listen: false);
    _topicMap = performanceService.getTopicMap();
  }

  void _getConnections(String topic) {
    setState(() {
      _selectedTopic = topic;
      final performanceService =
          Provider.of<PerformanceAnalysisService>(context, listen: false);
      _topicConnection = performanceService.getTopicConnection(topic);
    });
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Text('Konu Haritası',
                style: Theme.of(context).textTheme.headlineMedium),
            Expanded(
              child: FutureBuilder<List<Map<String, dynamic>>>(
                future: _topicMap,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(child: Text('Hata: ${snapshot.error}'));
                  }
                  if (!snapshot.hasData || snapshot.data!.isEmpty) {
                    return const Center(child: Text('Konu haritası boş.'));
                  }
                  final topicMap = snapshot.data!;
                  return ListView.builder(
                    itemCount: topicMap.length,
                    itemBuilder: (context, index) {
                      final topic = topicMap[index];
                      return ListTile(
                        title: Text(topic['topic']),
                        subtitle:
                            LinearProgressIndicator(value: topic['mastery']),
                        onTap: () => _getConnections(topic['topic']),
                      );
                    },
                  );
                },
              ),
            ),
            if (_selectedTopic != null) ...[
              const Divider(),
              Text('\'$_selectedTopic\' Konu Bağlantıları',
                  style: Theme.of(context).textTheme.headlineSmall),
              Expanded(
                child: FutureBuilder<Map<String, dynamic>>(
                  future: _topicConnection,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (snapshot.hasError) {
                      return Center(child: Text('Hata: ${snapshot.error}'));
                    }
                    if (!snapshot.hasData ||
                        (snapshot.data!['connections'] as List).isEmpty) {
                      return const Center(child: Text('Bağlantı bulunamadı.'));
                    }
                    final connections = snapshot.data!['connections'] as List;
                    return ListView.builder(
                      itemCount: connections.length,
                      itemBuilder: (context, index) {
                        final connection = connections[index];
                        return ListTile(
                          title: Text(connection['topic']),
                          trailing: Text(
                              'Güç: ${(connection['strength'] * 100).toStringAsFixed(0)}%'),
                        );
                      },
                    );
                  },
                ),
              ),
            ]
          ],
        ),
      ),
    );
  }
}
