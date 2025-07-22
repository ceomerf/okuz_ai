import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../services/mock_database_service.dart';
import 'learning_path_screen.dart';

class PathfinderSelectionScreen extends StatefulWidget {
  const PathfinderSelectionScreen({Key? key}) : super(key: key);

  @override
  State<PathfinderSelectionScreen> createState() =>
      _PathfinderSelectionScreenState();
}

class _PathfinderSelectionScreenState extends State<PathfinderSelectionScreen>
    with TickerProviderStateMixin {
  final TextEditingController _subjectController = TextEditingController();
  final TextEditingController _topicController = TextEditingController();

  int _selectedDuration = 60;
  bool _isLoading = false;
  List<Map<String, dynamic>> _activePaths = [];

  late AnimationController _fadeAnimationController;
  late Animation<double> _fadeAnimation;

  final List<String> _popularSubjects = [
    'Matematik',
    'Fizik',
    'Kimya',
    'Biyoloji',
    'Türkçe',
    'Tarih',
    'Coğrafya',
    'Felsefe',
    'İngilizce'
  ];

  final List<int> _durationOptions = [30, 45, 60, 90, 120];

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _loadActivePaths();
  }

  void _initializeAnimations() {
    _fadeAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
          parent: _fadeAnimationController, curve: Curves.easeInOut),
    );

    _fadeAnimationController.forward();
  }

  Future<void> _loadActivePaths() async {
    try {
      final mockDbService =
          Provider.of<MockDatabaseService>(context, listen: false);
      final result =
          await mockDbService.callCloudFunction('getUserLearningPaths', {
        'limit': 5,
        'status': 'active',
      });

      if (result['success'] == true) {
        setState(() {
          // Safe casting ile mock data'sını handle et
          final rawPaths = result['paths'] as List? ?? [];
          _activePaths = rawPaths.map((path) {
            if (path is Map) {
              // Map<Object?, Object?> to Map<String, dynamic> safe conversion
              return Map<String, dynamic>.from(path);
            }
            return <String, dynamic>{}; // Empty map fallback
          }).toList();
        });
      }
    } catch (e) {
      // Mock service hatası veya diğer hatalar için sessiz handle
      setState(() {
        _activePaths = []; // Boş liste göster
      });

      // Sadece debug modunda log göster
      debugPrint('Aktif rotalar yüklenemedi: $e');
    }
  }

  Future<void> _createLearningPath() async {
    if (_subjectController.text.trim().isEmpty ||
        _topicController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lütfen ders ve konu bilgilerini girin')),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => LearningPathScreen(
          subject: _subjectController.text.trim(),
          topic: _topicController.text.trim(),
          preferredDuration: _selectedDuration,
        ),
      ),
    ).then((_) {
      // Geri dönünce aktif rotaları yenile
      _loadActivePaths();
    });
  }

  @override
  void dispose() {
    _fadeAnimationController.dispose();
    _subjectController.dispose();
    _topicController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('AI Pathfinder'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppTheme.primaryColor.withValues(alpha: 0.05),
              theme.scaffoldBackgroundColor,
            ],
          ),
        ),
        child: AnimatedBuilder(
          animation: _fadeAnimation,
          builder: (context, child) {
            return Opacity(
              opacity: _fadeAnimation.value,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    _buildHeader(theme),

                    const SizedBox(height: 30),

                    // Active Paths
                    _buildActivePathsSection(theme),
                    const SizedBox(height: 30),

                    // New Path Creation
                    _buildNewPathSection(theme),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor.withValues(alpha: 0.1),
            AppTheme.accentColor.withValues(alpha: 0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.route,
              color: AppTheme.primaryColor,
              size: 40,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Kişiselleştirilmiş Öğrenme Patikası',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'AI, senin öğrenme stiline ve seviyene göre özel bir rota oluşturacak. '
            'İnternetteki milyonlarca kaynak arasından en uygun olanları seçip, '
            'adım adım yol gösterecek.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildActivePathsSection(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.trending_up, color: AppTheme.successColor),
            const SizedBox(width: 8),
            Text(
              'Devam Eden Rotalarınız',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 120,
          child: _activePaths.isEmpty
              ? Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: theme.cardColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: theme.colorScheme.outline.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.explore_off,
                        color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                        size: 32,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Henüz aktif rotanız bulunmuyor',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Yeni bir rota oluşturun!',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppTheme.primaryColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _activePaths.length,
                  itemBuilder: (context, index) {
                    final path = _activePaths[index];
                    return Container(
                      width: 200,
                      margin: const EdgeInsets.only(right: 12),
                      child: _buildActivePathCard(path, theme),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildActivePathCard(Map<String, dynamic> path, ThemeData theme) {
    final progress = (path['progress'] ?? 0.0) as double;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => LearningPathScreen(
                subject: path['subject'] ?? '',
                topic: path['topic'] ?? '',
                existingPath: path,
              ),
            ),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              path['subject'] ?? '',
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppTheme.primaryColor,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              path['topic'] ?? '',
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const Spacer(),
            Row(
              children: [
                Text(
                  '${progress.toInt()}%',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: LinearProgressIndicator(
                    value: progress / 100,
                    backgroundColor: theme.dividerColor,
                    valueColor:
                        AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                    minHeight: 4,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNewPathSection(ThemeData theme) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.add_road, color: AppTheme.accentColor),
              const SizedBox(width: 8),
              Text(
                'Yeni Öğrenme Rotası Oluştur',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Subject Selection
          Text(
            'Ders Seçin',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),

          // Popular Subjects
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _popularSubjects.map((subject) {
              return InkWell(
                onTap: () {
                  setState(() {
                    _subjectController.text = subject;
                  });
                },
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _subjectController.text == subject
                        ? AppTheme.primaryColor
                        : AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppTheme.primaryColor.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Text(
                    subject,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: _subjectController.text == subject
                          ? Colors.white
                          : AppTheme.primaryColor,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 12),

          // Custom Subject Input
          TextField(
            controller: _subjectController,
            decoration: InputDecoration(
              labelText: 'Veya başka bir ders yazın',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              prefixIcon: Icon(Icons.school, color: AppTheme.primaryColor),
            ),
          ),

          const SizedBox(height: 20),

          // Topic Input
          Text(
            'Konu',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _topicController,
            decoration: InputDecoration(
              labelText: 'Hangi konuyu öğrenmek istiyorsun?',
              hintText: 'Örn: Newton Yasaları, Türev, Hücre Bölünmesi',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              prefixIcon: Icon(Icons.topic, color: AppTheme.accentColor),
            ),
          ),

          const SizedBox(height: 20),

          // Duration Selection
          Text(
            'Öğrenme Süresi',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),

          Wrap(
            spacing: 12,
            children: _durationOptions.map((duration) {
              return ChoiceChip(
                label: Text('${duration} dk'),
                selected: _selectedDuration == duration,
                selectedColor: AppTheme.accentColor,
                onSelected: (selected) {
                  if (selected) {
                    setState(() {
                      _selectedDuration = duration;
                    });
                  }
                },
                labelStyle: TextStyle(
                  color: _selectedDuration == duration
                      ? Colors.white
                      : theme.colorScheme.onSurface,
                  fontWeight: FontWeight.w500,
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 30),

          // Create Button
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _createLearningPath,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accentColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 4,
              ),
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.auto_awesome),
                        const SizedBox(width: 8),
                        Text(
                          'AI Rotamı Oluştur',
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
            ),
          ),

          const SizedBox(height: 16),

          // Info Note
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.infoColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: AppTheme.infoColor, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'AI, profilinizi analiz ederek size özel kaynaklar ve öğrenme yöntemleri önerecek.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppTheme.infoColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
