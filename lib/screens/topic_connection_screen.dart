import 'package:flutter/material.dart';
import 'package:okuz_ai/models/topic_connection.dart';
import 'package:okuz_ai/services/performance_analysis_service.dart';
import 'package:graphview/GraphView.dart';

class TopicConnectionScreen extends StatefulWidget {
  final String subject;
  final String topic;

  const TopicConnectionScreen({
    Key? key,
    required this.subject,
    required this.topic,
  }) : super(key: key);

  @override
  _TopicConnectionScreenState createState() => _TopicConnectionScreenState();
}

class _TopicConnectionScreenState extends State<TopicConnectionScreen> {
  final PerformanceAnalysisService _analysisService =
      PerformanceAnalysisService();
  bool _isLoading = true;
  TopicConnection? _topicConnection;
  TopicMap? _topicMap;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _loadTopicConnection();
  }

  Future<void> _loadTopicConnection() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      // Önce konu bağlantısını yükle
      final connection = await _analysisService.getTopicConnection(
        widget.subject,
        widget.topic,
      );

      // Sonra konu haritasını yükle
      final map = await _analysisService.getTopicMap(widget.subject);

      setState(() {
        _topicConnection = connection;
        _topicMap = map;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.subject} - ${widget.topic}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTopicConnection,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage.isNotEmpty
              ? Center(child: Text('Hata: $_errorMessage'))
              : _topicConnection == null
                  ? const Center(child: Text('Konu bağlantısı bulunamadı'))
                  : _buildContent(),
    );
  }

  Widget _buildContent() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildTopicInfoCard(),
          const SizedBox(height: 16),
          _buildConnectionGraph(),
          const SizedBox(height: 16),
          _buildPrerequisitesCard(),
          const SizedBox(height: 16),
          _buildFollowupsCard(),
          const SizedBox(height: 16),
          _buildRelatedTopicsCard(),
        ],
      ),
    );
  }

  Widget _buildTopicInfoCard() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _topicConnection!.topic,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _topicConnection!.subject,
              style: const TextStyle(
                fontSize: 18,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _topicConnection!.description,
              style: const TextStyle(fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConnectionGraph() {
    if (_topicMap == null || _topicMap!.nodes.isEmpty) {
      return const SizedBox.shrink();
    }

    // Grafik için gerekli verileri hazırla
    final Graph graph = Graph()..isTree = false;
    final Algorithm algorithm = FruchtermanReingoldAlgorithm();

    // Düğümleri oluştur
    final Map<String, Node> nodes = {};

    // Ana konu düğümünü oluştur
    final mainNode = Node.Id(_topicConnection!.topic);
    nodes[_topicConnection!.topic] = mainNode;
    graph.addNode(mainNode);

    // Öncül konular için düğümler oluştur
    for (final prerequisite in _topicConnection!.prerequisites) {
      if (!nodes.containsKey(prerequisite)) {
        final node = Node.Id(prerequisite);
        nodes[prerequisite] = node;
        graph.addNode(node);
      }

      // Ana konuya kenar ekle
      graph.addEdge(nodes[prerequisite]!, mainNode,
          paint: Paint()
            ..color = Colors.blue
            ..strokeWidth = 2);
    }

    // Ardıl konular için düğümler oluştur
    for (final followup in _topicConnection!.followups) {
      if (!nodes.containsKey(followup)) {
        final node = Node.Id(followup);
        nodes[followup] = node;
        graph.addNode(node);
      }

      // Ana konudan kenar ekle
      graph.addEdge(mainNode, nodes[followup]!,
          paint: Paint()
            ..color = Colors.green
            ..strokeWidth = 2);
    }

    // İlişkili konular için düğümler oluştur
    for (final related in _topicConnection!.relatedTopics) {
      if (!nodes.containsKey(related)) {
        final node = Node.Id(related);
        nodes[related] = node;
        graph.addNode(node);
      }

      // İlişkili konular arasında çift yönlü kenar ekle
      graph.addEdge(mainNode, nodes[related]!,
          paint: Paint()
            ..color = Colors.orange
            ..strokeWidth = 1);
      graph.addEdge(nodes[related]!, mainNode,
          paint: Paint()
            ..color = Colors.orange
            ..strokeWidth = 1);
    }

    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Konu Haritası',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              height: 400,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(8),
              ),
              child: InteractiveViewer(
                constrained: false,
                boundaryMargin: const EdgeInsets.all(100),
                minScale: 0.1,
                maxScale: 2.0,
                child: GraphView(
                  graph: graph,
                  algorithm: algorithm,
                  paint: Paint()
                    ..color = Colors.black
                    ..strokeWidth = 1.0
                    ..style = PaintingStyle.stroke,
                  builder: (Node node) {
                    final nodeId = node.key?.value as String;
                    final isMainNode = nodeId == _topicConnection!.topic;
                    final isPrerequisite =
                        _topicConnection!.prerequisites.contains(nodeId);
                    final isFollowup =
                        _topicConnection!.followups.contains(nodeId);

                    Color nodeColor;
                    if (isMainNode) {
                      nodeColor = Colors.amber;
                    } else if (isPrerequisite) {
                      nodeColor = Colors.blue.shade100;
                    } else if (isFollowup) {
                      nodeColor = Colors.green.shade100;
                    } else {
                      nodeColor = Colors.orange.shade100;
                    }

                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: nodeColor,
                        shape: BoxShape.rectangle,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.grey.withAlpha(128),
                            spreadRadius: 1,
                            blurRadius: 2,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Text(
                        nodeId,
                        style: TextStyle(
                          fontSize: isMainNode ? 16 : 14,
                          fontWeight:
                              isMainNode ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _LegendItem(color: Colors.amber, label: 'Mevcut Konu'),
                SizedBox(width: 16),
                _LegendItem(color: Colors.blue, label: 'Öncül Konular'),
                SizedBox(width: 16),
                _LegendItem(color: Colors.green, label: 'Ardıl Konular'),
                SizedBox(width: 16),
                _LegendItem(color: Colors.orange, label: 'İlişkili Konular'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPrerequisitesCard() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.arrow_back, color: Colors.blue),
                SizedBox(width: 8),
                Text(
                  'Öncül Konular',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _topicConnection!.prerequisites.isEmpty
                ? const Text('Bu konunun öncül konusu bulunmamaktadır.')
                : Column(
                    children: _topicConnection!.prerequisites.map((topic) {
                      final importance =
                          _topicConnection!.topicImportance[topic] ?? 0.5;
                      return ListTile(
                        leading: const Icon(Icons.school, color: Colors.blue),
                        title: Text(topic),
                        subtitle: LinearProgressIndicator(
                          value: importance,
                          backgroundColor: Colors.grey.shade200,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            _getImportanceColor(importance),
                          ),
                        ),
                        trailing: Text(
                          '${(importance * 100).toInt()}%',
                          style: TextStyle(
                            color: _getImportanceColor(importance),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        onTap: () {
                          // Bu konunun bağlantılarını göster
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => TopicConnectionScreen(
                                subject: widget.subject,
                                topic: topic,
                              ),
                            ),
                          );
                        },
                      );
                    }).toList(),
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildFollowupsCard() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.arrow_forward, color: Colors.green),
                SizedBox(width: 8),
                Text(
                  'Ardıl Konular',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _topicConnection!.followups.isEmpty
                ? const Text('Bu konunun ardıl konusu bulunmamaktadır.')
                : Column(
                    children: _topicConnection!.followups.map((topic) {
                      final importance =
                          _topicConnection!.topicImportance[topic] ?? 0.5;
                      return ListTile(
                        leading: const Icon(Icons.school, color: Colors.green),
                        title: Text(topic),
                        subtitle: LinearProgressIndicator(
                          value: importance,
                          backgroundColor: Colors.grey.shade200,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            _getImportanceColor(importance),
                          ),
                        ),
                        trailing: Text(
                          '${(importance * 100).toInt()}%',
                          style: TextStyle(
                            color: _getImportanceColor(importance),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        onTap: () {
                          // Bu konunun bağlantılarını göster
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => TopicConnectionScreen(
                                subject: widget.subject,
                                topic: topic,
                              ),
                            ),
                          );
                        },
                      );
                    }).toList(),
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildRelatedTopicsCard() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.compare_arrows, color: Colors.orange),
                SizedBox(width: 8),
                Text(
                  'İlişkili Konular',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _topicConnection!.relatedTopics.isEmpty
                ? const Text('Bu konunun ilişkili konusu bulunmamaktadır.')
                : Column(
                    children: _topicConnection!.relatedTopics.map((topic) {
                      final importance =
                          _topicConnection!.topicImportance[topic] ?? 0.5;
                      return ListTile(
                        leading: const Icon(Icons.school, color: Colors.orange),
                        title: Text(topic),
                        subtitle: LinearProgressIndicator(
                          value: importance,
                          backgroundColor: Colors.grey.shade200,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            _getImportanceColor(importance),
                          ),
                        ),
                        trailing: Text(
                          '${(importance * 100).toInt()}%',
                          style: TextStyle(
                            color: _getImportanceColor(importance),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        onTap: () {
                          // Bu konunun bağlantılarını göster
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => TopicConnectionScreen(
                                subject: widget.subject,
                                topic: topic,
                              ),
                            ),
                          );
                        },
                      );
                    }).toList(),
                  ),
          ],
        ),
      ),
    );
  }

  Color _getImportanceColor(double importance) {
    if (importance >= 0.8) {
      return Colors.red;
    } else if (importance >= 0.6) {
      return Colors.orange;
    } else if (importance >= 0.4) {
      return Colors.green;
    } else {
      return Colors.blue;
    }
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendItem({
    required this.color,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 16,
          height: 16,
          color: color,
        ),
        const SizedBox(width: 4),
        Text(label),
      ],
    );
  }
}
