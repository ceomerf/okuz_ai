import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:graphview/GraphView.dart';
import '../theme/app_theme.dart';
import '../services/mock_database_service.dart';

class GeneratedContentScreen extends StatefulWidget {
  final String? text;
  final String? url;
  final dynamic preGeneratedData;
  final Map<String, dynamic>? conceptMapData;

  const GeneratedContentScreen({
    Key? key,
    this.text,
    this.url,
    this.preGeneratedData,
    this.conceptMapData,
  }) : super(key: key);

  @override
  State<GeneratedContentScreen> createState() => _GeneratedContentScreenState();
}

class _GeneratedContentScreenState extends State<GeneratedContentScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  late AnimationController _loadingAnimationController;
  late AnimationController _fadeAnimationController;
  late Animation<double> _fadeAnimation;

  Future<Map<String, dynamic>?>? _contentFuture;
  bool _isLoading = true;
  int _currentLoadingStep = 0;

  final List<String> _loadingSteps = [
    "AI, metninizi analiz ediyor...",
    "Kavramlar arasındaki bağlantılar kuruluyor...",
    "YKS formatında özet hazırlanıyor...",
    "İnteraktif harita oluşturuluyor...",
    "Son rötuşlar yapılıyor..."
  ];

  Graph _graph = Graph()..isTree = true;
  BuchheimWalkerConfiguration _treeConfiguration =
      BuchheimWalkerConfiguration();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);

    _loadingAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _fadeAnimationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _fadeAnimationController,
      curve: Curves.easeInOut,
    ));

    _setupTreeConfiguration();
    _initializeContent();
  }

  void _setupTreeConfiguration() {
    _treeConfiguration
      ..siblingSeparation = (100)
      ..levelSeparation = (150)
      ..subtreeSeparation = (150)
      ..orientation = (BuchheimWalkerConfiguration.ORIENTATION_TOP_BOTTOM);
  }

  void _initializeContent() {
    if (widget.preGeneratedData != null) {
      _isLoading = false;
      _fadeAnimationController.forward();
      if (widget.conceptMapData != null) {
        _buildGraph(widget.conceptMapData!);
      }
    } else {
      _startLoadingAnimation();
      _contentFuture = _processContent();
    }
  }

  void _startLoadingAnimation() {
    _loadingAnimationController.repeat();
    _animateLoadingSteps();
  }

  void _animateLoadingSteps() {
    if (_currentLoadingStep < _loadingSteps.length - 1) {
      Future.delayed(const Duration(milliseconds: 2000), () {
        if (mounted && _isLoading) {
          setState(() {
            _currentLoadingStep++;
          });
          _animateLoadingSteps();
        }
      });
    }
  }

  Future<Map<String, dynamic>?> _processContent() async {
    try {
      final mockDbService =
          Provider.of<MockDatabaseService>(context, listen: false);
      final result =
          await mockDbService.callCloudFunction('processAndStructureText', {
        'text': widget.text,
        'url': widget.url,
      });

      // Mock implementation - no Firebase App Check needed

      if (result == null) {
        // Hata durumu: Mock servis'den veri gelmedi
        print('Hata: Mock servis\'den null veri döndü.');
        throw Exception('Mock servis\'den geçersiz veri döndü');
      }

      // GÜVENLİ DÖNÜŞÜM: Gelen dynamic veriden yeni ve doğru tiplenmiş bir Map oluştur.
      final Map<String, dynamic> responseData =
          Map<String, dynamic>.from(result);

      if (responseData['success'] == true) {
        final Map<String, dynamic> data =
            Map<String, dynamic>.from(responseData['data'] ?? {});

        setState(() {
          _isLoading = false;
        });

        _loadingAnimationController.stop();
        _fadeAnimationController.forward();

        if (data['conceptMap'] != null) {
          final Map<String, dynamic> conceptMapData =
              Map<String, dynamic>.from(data['conceptMap'] ?? {});
          _buildGraph(conceptMapData);
        }

        return data;
      } else {
        throw Exception('Analiz başarısız oldu');
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      _loadingAnimationController.stop();
      throw e;
    }
  }

  void _buildGraph(Map<String, dynamic> conceptMapData) {
    _graph = Graph()..isTree = true;

    final nodes = conceptMapData['nodes'] as List<dynamic>? ?? [];
    final edges = conceptMapData['edges'] as List<dynamic>? ?? [];

    // Önce tüm node'ları ekle
    final nodeWidgets = <String, Node>{};
    for (var nodeData in nodes) {
      // GÜVENLİ DÖNÜŞÜM: Her node verisini güvenli şekilde dönüştür
      final Map<String, dynamic> nodeMap =
          Map<String, dynamic>.from(nodeData ?? {});
      final id = nodeMap['id']?.toString() ?? '';
      final label = nodeMap['label']?.toString() ?? 'Bilinmeyen';
      final level = nodeMap['level'] is int ? nodeMap['level'] as int : 0;

      if (id.isNotEmpty) {
        final node = Node.Id(id);
        final widget = _buildNodeWidget(label, level);
        nodeWidgets[id] = node;
        _graph.addNode(node);
      }
    }

    // Sonra edge'leri ekle
    for (var edgeData in edges) {
      // GÜVENLİ DÖNÜŞÜM: Her edge verisini güvenli şekilde dönüştür
      final Map<String, dynamic> edgeMap =
          Map<String, dynamic>.from(edgeData ?? {});
      final fromId = edgeMap['from']?.toString() ?? '';
      final toId = edgeMap['to']?.toString() ?? '';

      if (fromId.isNotEmpty &&
          toId.isNotEmpty &&
          nodeWidgets.containsKey(fromId) &&
          nodeWidgets.containsKey(toId)) {
        _graph.addEdge(nodeWidgets[fromId]!, nodeWidgets[toId]!);
      }
    }
  }

  Widget _buildNodeWidget(String label, int level) {
    final colors = [
      AppTheme.primaryColor,
      AppTheme.successColor,
      AppTheme.warningColor,
      AppTheme.infoColor,
    ];

    final color = colors[level % colors.length];
    final size = 80.0 - (level * 10.0).clamp(0.0, 30.0);

    return Container(
      width: size + 40,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(size / 2),
        border: Border.all(
          color: color,
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(8.0),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12 + (3 - level) * 2,
              fontWeight: FontWeight.bold,
              color: color,
            ),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    _loadingAnimationController.dispose();
    _fadeAnimationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('AI Analiz Sonuçları'),
        elevation: 0,
        backgroundColor: Colors.transparent,
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: _shareContent,
          ),
          IconButton(
            icon: const Icon(Icons.bookmark_add),
            onPressed: _saveContent,
          ),
        ],
        bottom: _isLoading
            ? null
            : TabBar(
                controller: _tabController,
                tabs: const [
                  Tab(
                    icon: Icon(Icons.article),
                    text: 'Özet',
                  ),
                  Tab(
                    icon: Icon(Icons.account_tree),
                    text: 'Kavram Haritası',
                  ),
                ],
              ),
      ),
      body: _isLoading ? _buildLoadingScreen() : _buildContentScreen(),
    );
  }

  Widget _buildLoadingScreen() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppTheme.primaryColor.withValues(alpha: 0.1),
            AppTheme.accentColor.withValues(alpha: 0.05),
          ],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Ana loading animasyonu
            RotationTransition(
              turns: _loadingAnimationController,
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [
                      AppTheme.primaryColor,
                      AppTheme.accentColor,
                    ],
                  ),
                ),
                child: const Center(
                  child: Icon(
                    Icons.auto_awesome,
                    color: Colors.white,
                    size: 60,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 40),

            // Adım adım ilerleme
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Column(
                children: [
                  // Mevcut adım
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 500),
                    child: Text(
                      _loadingSteps[_currentLoadingStep],
                      key: ValueKey(_currentLoadingStep),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryColor,
                          ),
                      textAlign: TextAlign.center,
                    ),
                  ),

                  const SizedBox(height: 24),

                  // İlerleme çubuğu
                  Container(
                    width: double.infinity,
                    height: 6,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(3),
                    ),
                    child: FractionallySizedBox(
                      alignment: Alignment.centerLeft,
                      widthFactor:
                          (_currentLoadingStep + 1) / _loadingSteps.length,
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              AppTheme.primaryColor,
                              AppTheme.accentColor,
                            ],
                          ),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Adım sayacı
                  Text(
                    '${_currentLoadingStep + 1}/${_loadingSteps.length}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppTheme.primaryColor,
                          fontWeight: FontWeight.w500,
                        ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 60),

            // Alt bilgi
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                'AI teknolojimiz metninizi analiz ederek size en iyi özet ve kavram haritasını sunuyor. Lütfen bekleyin...',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.color
                          ?.withOpacity(0.7),
                    ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContentScreen() {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: FutureBuilder<Map<String, dynamic>?>(
        future: _contentFuture,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return _buildErrorScreen(snapshot.error.toString());
          }

          final data = widget.preGeneratedData ?? snapshot.data;
          if (data == null) {
            return const Center(child: CircularProgressIndicator());
          }

          return TabBarView(
            controller: _tabController,
            children: [
              _buildSummaryTab(data),
              _buildConceptMapTab(data),
            ],
          );
        },
      ),
    );
  }

  Widget _buildErrorScreen(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 80,
              color: AppTheme.errorColor,
            ),
            const SizedBox(height: 24),
            Text(
              'Analiz Hatası',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.errorColor,
                  ),
            ),
            const SizedBox(height: 16),
            Text(
              error,
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.arrow_back),
              label: const Text('Geri Dön'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryTab(dynamic data) {
    final Map<String, dynamic> dataMap = Map<String, dynamic>.from(data ?? {});
    final summary = dataMap['summary'] != null
        ? Map<String, dynamic>.from(dataMap['summary'])
        : null;
    if (summary == null) {
      return const Center(child: Text('Özet bulunamadı'));
    }

    final title = summary['title'] as String? ?? 'Özet';
    final keyPoints = summary['keyPoints'] as List<dynamic>? ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Ana başlık
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.primaryColor.withValues(alpha: 0.1),
                  AppTheme.primaryColor.withValues(alpha: 0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppTheme.primaryColor.withValues(alpha: 0.2),
              ),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.article,
                  color: AppTheme.primaryColor,
                  size: 40,
                ),
                const SizedBox(height: 12),
                Text(
                  title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryColor,
                      ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Ana içerik bölümleri
          ...keyPoints.map<Widget>((point) {
            final Map<String, dynamic> pointMap =
                Map<String, dynamic>.from(point ?? {});
            final heading = pointMap['heading']?.toString() ?? '';
            final details = pointMap['details'] as List<dynamic>? ?? [];

            return Container(
              margin: const EdgeInsets.only(bottom: 16),
              child: Card(
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: ExpansionTile(
                  tilePadding: const EdgeInsets.all(20),
                  childrenPadding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                  leading: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.topic,
                      color: AppTheme.primaryColor,
                      size: 24,
                    ),
                  ),
                  title: Text(
                    heading,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: details.map<Widget>((detail) {
                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                margin: const EdgeInsets.only(top: 8),
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryColor,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Text(
                                  detail.toString(),
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.copyWith(
                                        height: 1.6,
                                      ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),

          const SizedBox(height: 24),

          // Aksiyon butonları
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _copyToClipboard(title, keyPoints),
                  icon: const Icon(Icons.copy),
                  label: const Text('Kopyala'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _saveContent,
                  icon: const Icon(Icons.bookmark_add),
                  label: const Text('Kaydet'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildConceptMapTab(dynamic data) {
    final Map<String, dynamic> dataMap = Map<String, dynamic>.from(data ?? {});
    final conceptMap = widget.conceptMapData ??
        (dataMap['conceptMap'] != null
            ? Map<String, dynamic>.from(dataMap['conceptMap'])
            : null);
    if (conceptMap == null) {
      return const Center(child: Text('Kavram haritası bulunamadı'));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Başlık
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.infoColor.withValues(alpha: 0.1),
                  AppTheme.infoColor.withValues(alpha: 0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.account_tree,
                  color: AppTheme.infoColor,
                  size: 40,
                ),
                const SizedBox(height: 12),
                Text(
                  'İnteraktif Kavram Haritası',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.infoColor,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Kavramları ve aralarındaki ilişkileri keşfedin',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.infoColor,
                      ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // İnteraktif graf görünümü
          Container(
            height: 400,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppTheme.infoColor.withValues(alpha: 0.2),
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: InteractiveViewer(
                constrained: false,
                boundaryMargin: const EdgeInsets.all(80),
                minScale: 0.1,
                maxScale: 3.0,
                child: GraphView(
                  graph: _graph,
                  algorithm: BuchheimWalkerAlgorithm(
                    _treeConfiguration,
                    TreeEdgeRenderer(_treeConfiguration),
                  ),
                  paint: Paint()
                    ..color = AppTheme.infoColor
                    ..strokeWidth = 2
                    ..style = PaintingStyle.stroke,
                  builder: (Node node) {
                    final nodeId = node.key?.value as String?;
                    if (nodeId != null) {
                      final nodes = conceptMap['nodes'] as List<dynamic>? ?? [];
                      final nodeData = nodes.firstWhere(
                        (n) {
                          final nodeMap = Map<String, dynamic>.from(n ?? {});
                          return nodeMap['id'] == nodeId;
                        },
                        orElse: () => {'label': 'Bilinmeyen', 'level': 0},
                      );
                      final Map<String, dynamic> safeNodeData =
                          Map<String, dynamic>.from(nodeData ?? {});

                      return GestureDetector(
                        onTap: () => _showNodeDetails(safeNodeData, conceptMap),
                        child: _buildNodeWidget(
                          safeNodeData['label']?.toString() ?? 'Bilinmeyen',
                          safeNodeData['level'] is int
                              ? safeNodeData['level'] as int
                              : 0,
                        ),
                      );
                    }
                    return Container();
                  },
                ),
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Kullanım talimatları
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.successColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.successColor.withValues(alpha: 0.2),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      color: AppTheme.successColor,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Nasıl Kullanılır?',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.successColor,
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                    '• Haritayı yakınlaştırmak/uzaklaştırmak için parmak hareketlerini kullanın'),
                const Text('• Kavramlara tıklayarak detaylı bilgi alın'),
                const Text('• Haritayı sürükleyerek farklı alanları keşfedin'),
                const Text('• Renkler kavram seviyelerini gösterir'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showNodeDetails(
      Map<String, dynamic> nodeData, Map<String, dynamic> conceptMap) {
    final label = nodeData['label']?.toString() ?? 'Bilinmeyen';
    final level = nodeData['level'] is int ? nodeData['level'] as int : 0;
    final id = nodeData['id']?.toString() ?? '';

    // Bu kavramla ilgili bağlantıları bul
    final edges = conceptMap['edges'] as List<dynamic>? ?? [];
    final relatedEdges = edges.where((edge) {
      final Map<String, dynamic> edgeMap =
          Map<String, dynamic>.from(edge ?? {});
      return edgeMap['from'] == id || edgeMap['to'] == id;
    }).toList();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _getLevelColor(level).withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(
                _getLevelIcon(level),
                color: _getLevelColor(level),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: _getLevelColor(level),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Seviye: ${level + 1}'),
            const SizedBox(height: 16),
            if (relatedEdges.isNotEmpty) ...[
              Text(
                'Bağlantılar:',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),
              ...relatedEdges.map<Widget>((edge) {
                try {
                  final Map<String, dynamic> edgeMap =
                      Map<String, dynamic>.from(edge ?? {});
                  final fromId = edgeMap['from']?.toString() ?? '';
                  final toId = edgeMap['to']?.toString() ?? '';
                  final edgeLabel = edgeMap['label']?.toString() ?? '';

                  final isOutgoing = fromId == id;
                  final targetId = isOutgoing ? toId : fromId;

                  // GÜVENLİ NODE ARAMA - conceptMap erişimini de güvenli hale getir
                  Map<String, dynamic> safeTargetNode = {'label': 'Bilinmeyen'};
                  try {
                    final nodes = conceptMap['nodes'];
                    if (nodes is List) {
                      for (var n in nodes) {
                        try {
                          if (n != null) {
                            final nodeMap = Map<String, dynamic>.from(n);
                            if (nodeMap['id']?.toString() == targetId) {
                              safeTargetNode = nodeMap;
                              break;
                            }
                          }
                        } catch (e) {
                          // Node dönüşümünde hata varsa, varsayılan değeri koru
                          continue;
                        }
                      }
                    }
                  } catch (e) {
                    // conceptMap erişiminde hata varsa, varsayılan değeri koru
                    safeTargetNode = {'label': 'Bilinmeyen'};
                  }

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      children: [
                        Icon(
                          isOutgoing ? Icons.arrow_forward : Icons.arrow_back,
                          size: 16,
                          color: _getLevelColor(level),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child:
                              Text('${safeTargetNode['label']} ($edgeLabel)'),
                        ),
                      ],
                    ),
                  );
                } catch (e) {
                  // Edge işleminde hata olursa boş widget döndür
                  return const SizedBox.shrink();
                }
              }).toList(),
            ] else
              const Text('Bu kavramın henüz bağlantısı bulunmuyor.'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Kapat'),
          ),
        ],
      ),
    );
  }

  Color _getLevelColor(int level) {
    final colors = [
      AppTheme.primaryColor,
      AppTheme.successColor,
      AppTheme.warningColor,
      AppTheme.infoColor,
    ];
    return colors[level % colors.length];
  }

  IconData _getLevelIcon(int level) {
    final icons = [
      Icons.star,
      Icons.category,
      Icons.label,
      Icons.fiber_manual_record,
    ];
    return icons[level % icons.length];
  }

  void _copyToClipboard(String title, List<dynamic> keyPoints) {
    String content = '$title\n\n';

    for (var point in keyPoints) {
      final Map<String, dynamic> pointMap =
          Map<String, dynamic>.from(point ?? {});
      final heading = pointMap['heading']?.toString() ?? '';
      final details = pointMap['details'] as List<dynamic>? ?? [];

      content += '$heading\n';
      for (var detail in details) {
        content += '• $detail\n';
      }
      content += '\n';
    }

    Clipboard.setData(ClipboardData(text: content));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Özet panoya kopyalandı!'),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _shareContent() {
    // Share functionality - placeholder
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Paylaşım özelliği yakında!')),
    );
  }

  void _saveContent() {
    // Save functionality - placeholder
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Kaydetme özelliği yakında!')),
    );
  }
}
