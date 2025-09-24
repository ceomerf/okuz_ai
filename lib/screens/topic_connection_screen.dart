import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:math' as math;
import '../theme/app_theme.dart';
import '../services/api_client.dart';

class TopicConnectionScreen extends StatefulWidget {
  const TopicConnectionScreen({Key? key}) : super(key: key);

  @override
  State<TopicConnectionScreen> createState() => _TopicConnectionScreenState();
}

class _TopicConnectionScreenState extends State<TopicConnectionScreen>
    with TickerProviderStateMixin {
  final TextEditingController _topicController = TextEditingController();

  bool _isLoading = false;
  Map<String, dynamic>? _connectionsData;
  bool _showConnections = false;
  String _selectedCategory = 'Tümü';

  late AnimationController _animationController;
  late AnimationController _connectionsController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _connectionsController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
    _slideAnimation = Tween<double>(begin: 30.0, end: 0.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOutCubic),
    );
    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _connectionsController, curve: Curves.elasticOut),
    );
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _connectionsController.dispose();
    _topicController.dispose();
    super.dispose();
  }

  Future<void> _generateConnections() async {
    if (_topicController.text.trim().isEmpty) {
      _showErrorSnackBar('Lütfen merkezi konuyu girin');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    HapticFeedback.mediumImpact();

    try {
      final response =
          await ref.read(apiClientProvider).post('/smart-tools/topic-connection', {
        'topic': _topicController.text.trim(),
        'category': _selectedCategory,
      });

      if (response['success'] == true) {
        setState(() {
          _connectionsData = response['connections'];
          _showConnections = true;
          _isLoading = false;
        });
        _connectionsController.forward();
        HapticFeedback.heavyImpact();
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      _showErrorSnackBar('Hata: $e');
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.errorColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isWide = MediaQuery.of(context).size.width > 768;

    return Scaffold(
      backgroundColor:
          isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            color: isDark ? Colors.white : Colors.black87,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text('🔗', style: TextStyle(fontSize: 20)),
            ),
            const SizedBox(width: 12),
            Text(
              'Konu Bağlantıları',
              style: TextStyle(
                color: isDark ? Colors.white : Colors.black87,
                fontWeight: FontWeight.w800,
                fontSize: 20,
              ),
            ),
          ],
        ),
      ),
      body: AnimatedBuilder(
        animation: _animationController,
        builder: (context, child) {
          return FadeTransition(
            opacity: _fadeAnimation,
            child: Transform.translate(
              offset: Offset(0, _slideAnimation.value),
              child: isWide
                  ? _buildWideLayout(isDark)
                  : _buildNarrowLayout(isDark),
            ),
          );
        },
      ),
    );
  }

  Widget _buildWideLayout(bool isDark) {
    return Row(
      children: [
        // Sol panel - Input
        Container(
          width: 400,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.03)
                : Colors.white.withValues(alpha: 0.7),
            border: Border(
              right: BorderSide(
                color: const Color(0xFF10B981).withValues(alpha: 0.1),
              ),
            ),
          ),
          child: _buildInputPanel(isDark),
        ),
        // Sağ panel - Connections Map
        Expanded(
          child: _buildConnectionsPanel(isDark),
        ),
      ],
    );
  }

  Widget _buildNarrowLayout(bool isDark) {
    return Column(
      children: [
        if (!_showConnections)
          Expanded(
              child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: _buildInputPanel(isDark),
          ))
        else
          Expanded(child: _buildConnectionsPanel(isDark)),
      ],
    );
  }

  Widget _buildInputPanel(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF10B981).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: const Color(0xFF10B981).withValues(alpha: 0.3),
            ),
          ),
          child: Column(
            children: [
              Icon(
                Icons.hub,
                size: 48,
                color: const Color(0xFF10B981),
              ),
              const SizedBox(height: 16),
              Text(
                'Konu Bağlantıları Keşfet',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF10B981),
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                'Bir konunun diğer konularla nasıl bağlantıda olduğunu görün.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.getSecondaryTextColor(context),
                      height: 1.5,
                    ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),

        const SizedBox(height: 32),

        // Merkezi konu girişi
        Text(
          'Merkezi Konu',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: const Color(0xFF10B981),
              ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.05)
                : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: const Color(0xFFE2E8F0).withValues(alpha: 0.5),
            ),
          ),
          child: TextField(
            controller: _topicController,
            decoration: const InputDecoration(
              hintText: 'Örn: Fotosentez, Serbest Piyasa Ekonomisi...',
              border: InputBorder.none,
              contentPadding: EdgeInsets.all(16),
              prefixIcon: Icon(Icons.center_focus_strong),
            ),
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),

        const SizedBox(height: 24),

        // Kategori seçici
        Text(
          'Kategori',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 12),
        _buildCategorySelector(isDark),

        const SizedBox(height: 32),

        // Bilgi kutusu
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF10B981).withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: const Color(0xFF10B981).withValues(alpha: 0.2),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: const Color(0xFF10B981),
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Nasıl Çalışır?',
                    style: TextStyle(
                      color: const Color(0xFF10B981),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '• Merkezi konunuz etrafında bağlantılı konular bulunur\n'
                '• Bağlantı gücü renk yoğunluğu ile gösterilir\n'
                '• İlgili kategorilere göre filtreleme yapabilirsiniz',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppTheme.getSecondaryTextColor(context),
                      height: 1.4,
                    ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 32),

        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _isLoading ? null : _generateConnections,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: 0,
            ),
            child: _isLoading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Text(
                    'Bağlantıları Keşfet',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                    ),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildCategorySelector(bool isDark) {
    final categories = [
      'Tümü',
      'Temel Bilgiler',
      'İleri Konular',
      'Uygulamalar',
      'Tarihsel'
    ];

    return Container(
      height: 40,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final category = categories[index];
          final isSelected = _selectedCategory == category;

          return Container(
            margin: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _selectedCategory = category;
                });
                HapticFeedback.lightImpact();
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? const Color(0xFF10B981)
                      : isDark
                          ? Colors.white.withValues(alpha: 0.05)
                          : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected
                        ? const Color(0xFF10B981)
                        : const Color(0xFFE2E8F0).withValues(alpha: 0.5),
                  ),
                ),
                child: Text(
                  category,
                  style: TextStyle(
                    color: isSelected
                        ? Colors.white
                        : AppTheme.getPrimaryTextColor(context),
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildConnectionsPanel(bool isDark) {
    if (!_showConnections || _connectionsData == null) {
      return _buildEmptyConnections(isDark);
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF10B981),
                  const Color(0xFF059669),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF10B981).withValues(alpha: 0.3),
                  blurRadius: 15,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Column(
              children: [
                Icon(
                  Icons.hub,
                  size: 32,
                  color: Colors.white,
                ),
                const SizedBox(height: 12),
                Text(
                  _connectionsData!['centralTopic'] ?? _topicController.text,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  '${(_connectionsData!['connections'] as List?)?.length ?? 0} bağlantı bulundu',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 32),

          // Connections visualization
          AnimatedBuilder(
            animation: _scaleAnimation,
            builder: (context, child) {
              return Transform.scale(
                scale: _scaleAnimation.value,
                child: _buildConnectionsMap(isDark),
              );
            },
          ),

          const SizedBox(height: 32),

          // Connection details
          _buildConnectionsList(isDark),
        ],
      ),
    );
  }

  Widget _buildEmptyConnections(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.hub,
              size: 64,
              color: const Color(0xFF10B981).withValues(alpha: 0.7),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Konu Bağlantıları Burada Görünecek',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: AppTheme.getPrimaryTextColor(context),
                  fontWeight: FontWeight.w600,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            'Merkezi konuyu girin ve\nbağlantıları keşfetmeye başlayın',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.getSecondaryTextColor(context),
                ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildConnectionsMap(bool isDark) {
    final connections = _connectionsData!['connections'] as List? ?? [];
    final centralTopic =
        _connectionsData!['centralTopic'] ?? _topicController.text;

    return Container(
      height: 400,
      child: Stack(
        children: [
          // Central topic
          Positioned(
            left: MediaQuery.of(context).size.width * 0.5 - 100,
            top: 200 - 40,
            child: _buildCentralTopicCard(centralTopic),
          ),
          // Connected topics arranged in a circle
          ...connections.asMap().entries.map((entry) {
            final index = entry.key;
            final connection = entry.value;
            final angle = (index * 2 * math.pi) / connections.length;
            final radius = 140.0;
            final x = MediaQuery.of(context).size.width * 0.5 -
                75 +
                radius * math.cos(angle);
            final y = 200 - 30 + radius * math.sin(angle);

            return Positioned(
              left: x,
              top: y,
              child: _buildConnectionCard(connection),
            );
          }).toList(),
          // Connection lines
          CustomPaint(
            painter: ConnectionLinesPainter(
              connections: connections,
              centralPosition:
                  Offset(MediaQuery.of(context).size.width * 0.5, 200),
              isDark: isDark,
            ),
            size: Size.infinite,
          ),
        ],
      ),
    );
  }

  Widget _buildCentralTopicCard(String topic) {
    return Container(
      width: 200,
      height: 80,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF10B981),
            const Color(0xFF059669),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF10B981).withValues(alpha: 0.4),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Center(
        child: Text(
          topic,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
          textAlign: TextAlign.center,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ),
    );
  }

  Widget _buildConnectionCard(Map<String, dynamic> connection) {
    final topic = connection['topic'] ?? '';
    final strength = connection['strength'] ?? 0.5;
    final category = connection['category'] ?? '';

    Color getStrengthColor() {
      if (strength > 0.8) return Colors.green;
      if (strength > 0.6) return Colors.orange;
      if (strength > 0.4) return Colors.blue;
      return Colors.grey;
    }

    return Container(
      width: 150,
      height: 60,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: getStrengthColor(),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: getStrengthColor().withValues(alpha: 0.2),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              topic,
              style: TextStyle(
                color: getStrengthColor(),
                fontWeight: FontWeight.w600,
                fontSize: 11,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Container(
              width: double.infinity,
              height: 4,
              decoration: BoxDecoration(
                color: getStrengthColor().withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(2),
              ),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: strength,
                child: Container(
                  decoration: BoxDecoration(
                    color: getStrengthColor(),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConnectionsList(bool isDark) {
    final connections = _connectionsData!['connections'] as List? ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Bağlantı Detayları',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: const Color(0xFF10B981),
              ),
        ),
        const SizedBox(height: 16),
        ...connections.map((connection) {
          final topic = connection['topic'] ?? '';
          final strength = connection['strength'] ?? 0.5;
          final category = connection['category'] ?? '';
          final description = connection['description'] ?? '';

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color:
                  isDark ? Colors.white.withValues(alpha: 0.05) : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFFE2E8F0).withValues(alpha: 0.5),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        topic,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        category,
                        style: TextStyle(
                          color: const Color(0xFF10B981),
                          fontWeight: FontWeight.w600,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  description,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.getSecondaryTextColor(context),
                      ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      'Bağlantı Gücü:',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: LinearProgressIndicator(
                        value: strength,
                        backgroundColor: Colors.grey.withValues(alpha: 0.2),
                        valueColor: AlwaysStoppedAnimation<Color>(
                          strength > 0.8
                              ? Colors.green
                              : strength > 0.6
                                  ? Colors.orange
                                  : strength > 0.4
                                      ? Colors.blue
                                      : Colors.grey,
                        ),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${(strength * 100).toInt()}%',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ],
                ),
              ],
            ),
          );
        }).toList(),
      ],
    );
  }
}

class ConnectionLinesPainter extends CustomPainter {
  final List connections;
  final Offset centralPosition;
  final bool isDark;

  ConnectionLinesPainter({
    required this.connections,
    required this.centralPosition,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    for (int i = 0; i < connections.length; i++) {
      final angle = (i * 2 * math.pi) / connections.length;
      final radius = 140.0;
      final targetX = centralPosition.dx + radius * math.cos(angle);
      final targetY = centralPosition.dy + radius * math.sin(angle);
      final targetPosition = Offset(targetX, targetY);

      final strength = connections[i]['strength'] ?? 0.5;
      paint.color = (strength > 0.8
              ? Colors.green
              : strength > 0.6
                  ? Colors.orange
                  : strength > 0.4
                      ? Colors.blue
                      : Colors.grey)
          .withValues(alpha: 0.6);

      canvas.drawLine(centralPosition, targetPosition, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
