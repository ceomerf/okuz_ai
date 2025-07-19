import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';

class ExamHistoryScreen extends StatefulWidget {
  const ExamHistoryScreen({Key? key}) : super(key: key);

  @override
  State<ExamHistoryScreen> createState() => _ExamHistoryScreenState();
}

class _ExamHistoryScreenState extends State<ExamHistoryScreen>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;

  String _searchQuery = '';
  String _selectedFilter = 'Tümü';
  bool _isLoading = true;

  final List<String> _filterOptions = [
    'Tümü',
    'TYT',
    'AYT',
    'YKS Deneme',
    'Alan Denemesi'
  ];

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _loadExamHistory();
  }

  void _initializeAnimations() {
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
    ));
    _slideAnimation = Tween<double>(
      begin: 30.0,
      end: 0.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: const Interval(0.2, 1.0, curve: Curves.easeOutCubic),
    ));
    _animationController.forward();
  }

  void _loadExamHistory() {
    // Simulate loading delay
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: AppTheme.getBackgroundColor(context),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              isDark ? Colors.grey[900]! : Colors.grey[50]!,
              AppTheme.getBackgroundColor(context),
            ],
          ),
        ),
        child: SafeArea(
          child: AnimatedBuilder(
            animation: _animationController,
            builder: (context, child) {
              return FadeTransition(
                opacity: _fadeAnimation,
                child: Transform.translate(
                  offset: Offset(0, _slideAnimation.value),
                  child: Column(
                    children: [
                      _buildAppBar(isDark),
                      _buildSearchAndFilter(isDark),
                      Expanded(
                        child: _isLoading
                            ? _buildLoadingState()
                            : _buildExamList(isDark),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
      floatingActionButton: _buildFloatingActionButton(isDark),
    );
  }

  Widget _buildAppBar(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: Icon(
              Icons.arrow_back_ios,
              color: AppTheme.getPrimaryTextColor(context),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Deneme Sınavı Geçmişi',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.getPrimaryTextColor(context),
                      ),
                ),
                Text(
                  'Gelişim takibi ve AI analizleri',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.getSecondaryTextColor(context),
                      ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.analytics,
              color: AppTheme.primaryColor,
              size: 24,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchAndFilter(bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Search Bar
          Container(
            decoration: BoxDecoration(
              color: AppTheme.getCardColor(context),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.primaryColor.withOpacity(0.1),
                width: 1,
              ),
            ),
            child: TextField(
              onChanged: (value) => setState(() => _searchQuery = value),
              decoration: InputDecoration(
                hintText: 'Sınav ara...',
                hintStyle: TextStyle(
                  color: AppTheme.getSecondaryTextColor(context),
                ),
                prefixIcon: Icon(
                  Icons.search,
                  color: AppTheme.getSecondaryTextColor(context),
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.all(16),
              ),
              style: TextStyle(
                color: AppTheme.getPrimaryTextColor(context),
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _filterOptions.map((filter) {
                final isSelected = _selectedFilter == filter;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(
                      filter,
                      style: TextStyle(
                        color: isSelected
                            ? Colors.white
                            : AppTheme.getPrimaryTextColor(context),
                        fontWeight:
                            isSelected ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() => _selectedFilter = filter);
                    },
                    backgroundColor: AppTheme.getCardColor(context),
                    selectedColor: AppTheme.primaryColor,
                    side: BorderSide(
                      color: isSelected
                          ? AppTheme.primaryColor
                          : AppTheme.primaryColor.withOpacity(0.3),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
          ),
          const SizedBox(height: 16),
          Text(
            'Sınav geçmişi yükleniyor...',
            style: TextStyle(
              color: AppTheme.getSecondaryTextColor(context),
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExamList(bool isDark) {
    final examHistory = _getFilteredExamHistory();

    if (examHistory.isEmpty) {
      return _buildEmptyState(isDark);
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: examHistory.length,
      itemBuilder: (context, index) {
        final exam = examHistory[index];
        return _buildExamCard(exam, isDark, index);
      },
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Icon(
              Icons.quiz_outlined,
              size: 64,
              color: AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Henüz deneme sınavı yok',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.getPrimaryTextColor(context),
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'İlk deneme sınavını ekleyerek\ngelişimini takip etmeye başla',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.getSecondaryTextColor(context),
                ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => _showAddExamDialog(),
            icon: const Icon(Icons.add),
            label: const Text('İlk Sınavı Ekle'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExamCard(Map<String, dynamic> exam, bool isDark, int index) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GestureDetector(
        onTap: () => _navigateToExamDetail(exam),
        child: Container(
          decoration: BoxDecoration(
            color: AppTheme.getCardColor(context),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: AppTheme.primaryColor.withOpacity(0.1),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: isDark
                    ? Colors.black.withOpacity(0.3)
                    : Colors.grey.withOpacity(0.1),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color:
                            _getExamTypeColor(exam['type']).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        _getExamTypeIcon(exam['type']),
                        color: _getExamTypeColor(exam['type']),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            exam['name'],
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.getPrimaryTextColor(context),
                                ),
                          ),
                          Text(
                            DateFormat('dd MMMM yyyy', 'tr_TR')
                                .format(exam['date']),
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(
                                  color:
                                      AppTheme.getSecondaryTextColor(context),
                                ),
                          ),
                        ],
                      ),
                    ),
                    if (exam['trend'] != null) ...[
                      Icon(
                        exam['trend'] == 'up'
                            ? Icons.trending_up
                            : Icons.trending_down,
                        color: exam['trend'] == 'up'
                            ? AppTheme.successColor
                            : AppTheme.errorColor,
                        size: 20,
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 16),
                // Stats Row
                Row(
                  children: [
                    _buildStatItem(
                      'Toplam Net',
                      exam['totalNet'].toString(),
                      Icons.check_circle,
                      AppTheme.primaryColor,
                    ),
                    const SizedBox(width: 16),
                    _buildStatItem(
                      'Başarı',
                      '${exam['successRate']}%',
                      Icons.percent,
                      AppTheme.successColor,
                    ),
                    const SizedBox(width: 16),
                    _buildStatItem(
                      'Sıralama',
                      exam['ranking'].toString(),
                      Icons.emoji_events,
                      const Color(0xFFF59E0B),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Progress Bar
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Genel Başarı',
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(
                                color: AppTheme.getSecondaryTextColor(context),
                              ),
                        ),
                        Text(
                          '${exam['successRate']}%',
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppTheme.primaryColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: exam['successRate'] / 100,
                      backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                      valueColor:
                          AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                      minHeight: 6,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Action Button
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _navigateToExamDetail(exam),
                        icon: const Icon(Icons.analytics, size: 16),
                        label: const Text('AI Analizi Görüntüle'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.primaryColor,
                          side: BorderSide(color: AppTheme.primaryColor),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      onPressed: () => _showDeleteExamDialog(exam),
                      icon: const Icon(Icons.delete_outline),
                      color: AppTheme.errorColor,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem(
      String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: color,
                fontSize: 16,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: AppTheme.getSecondaryTextColor(context),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFloatingActionButton(bool isDark) {
    return FloatingActionButton.extended(
      heroTag: "exam_history_fab",
      onPressed: () => _showAddExamDialog(),
      backgroundColor: AppTheme.primaryColor,
      foregroundColor: Colors.white,
      icon: const Icon(Icons.add),
      label: const Text('Yeni Sınav'),
    );
  }

  List<Map<String, dynamic>> _getFilteredExamHistory() {
    // Mock data - gerçek uygulamada Firestore'dan gelecek
    final examHistory = [
      {
        'id': '1',
        'name': 'YKS Deneme - Mart 2024',
        'type': 'YKS Deneme',
        'date': DateTime.now().subtract(const Duration(days: 7)),
        'totalNet': 85.5,
        'successRate': 78,
        'ranking': 1250,
        'trend': 'up',
        'subjects': {
          'matematik': {'net': 25.5, 'total': 30},
          'fizik': {'net': 18.0, 'total': 25},
          'kimya': {'net': 20.5, 'total': 25},
          'biyoloji': {'net': 21.5, 'total': 25},
        },
      },
      {
        'id': '2',
        'name': 'TYT Deneme - Şubat 2024',
        'type': 'TYT',
        'date': DateTime.now().subtract(const Duration(days: 21)),
        'totalNet': 92.0,
        'successRate': 82,
        'ranking': 980,
        'trend': 'up',
        'subjects': {
          'türkçe': {'net': 28.5, 'total': 30},
          'matematik': {'net': 22.0, 'total': 25},
          'sosyal': {'net': 20.5, 'total': 25},
          'fen': {'net': 21.0, 'total': 25},
        },
      },
      {
        'id': '3',
        'name': 'AYT Matematik Denemesi',
        'type': 'Alan Denemesi',
        'date': DateTime.now().subtract(const Duration(days: 35)),
        'totalNet': 68.5,
        'successRate': 72,
        'ranking': 1680,
        'trend': 'down',
        'subjects': {
          'matematik': {'net': 28.5, 'total': 40},
          'geometri': {'net': 25.0, 'total': 35},
          'analiz': {'net': 15.0, 'total': 25},
        },
      },
    ];

    var filtered = examHistory.where((exam) {
      final matchesSearch = exam['name']
          .toString()
          .toLowerCase()
          .contains(_searchQuery.toLowerCase());
      final matchesFilter =
          _selectedFilter == 'Tümü' || exam['type'] == _selectedFilter;

      return matchesSearch && matchesFilter;
    }).toList();

    // Sort by date (newest first)
    filtered.sort(
        (a, b) => (b['date'] as DateTime).compareTo(a['date'] as DateTime));

    return filtered;
  }

  Color _getExamTypeColor(String type) {
    switch (type) {
      case 'TYT':
        return const Color(0xFF10B981);
      case 'AYT':
        return const Color(0xFF3B82F6);
      case 'YKS Deneme':
        return AppTheme.primaryColor;
      case 'Alan Denemesi':
        return const Color(0xFF8B5CF6);
      default:
        return AppTheme.primaryColor;
    }
  }

  IconData _getExamTypeIcon(String type) {
    switch (type) {
      case 'TYT':
        return Icons.school;
      case 'AYT':
        return Icons.science;
      case 'YKS Deneme':
        return Icons.quiz;
      case 'Alan Denemesi':
        return Icons.category;
      default:
        return Icons.quiz;
    }
  }

  void _navigateToExamDetail(Map<String, dynamic> exam) {
    // Navigate to detailed exam analysis screen
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ExamDetailScreen(examData: exam),
      ),
    );
  }

  void _showAddExamDialog() {
    showDialog(
      context: context,
      builder: (context) => AddExamDialog(),
    );
  }

  void _showDeleteExamDialog(Map<String, dynamic> exam) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text('Sınavı Sil'),
        content: Text(
            '${exam['name']} adlı sınavı silmek istediğinize emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _deleteExam(exam['id']);
            },
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.errorColor,
            ),
            child: const Text('Sil'),
          ),
        ],
      ),
    );
  }

  void _deleteExam(String examId) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Sınav silindi'),
        backgroundColor: AppTheme.successColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }
}

// Placeholder for detailed exam screen
class ExamDetailScreen extends StatelessWidget {
  final Map<String, dynamic> examData;

  const ExamDetailScreen({Key? key, required this.examData}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(examData['name']),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.analytics,
              size: 64,
              color: AppTheme.primaryColor,
            ),
            const SizedBox(height: 16),
            Text(
              'Detaylı AI Analizi',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Bu ekran geliştirilme aşamasında',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.getSecondaryTextColor(context),
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

// Placeholder for add exam dialog
class AddExamDialog extends StatelessWidget {
  const AddExamDialog({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.add_circle,
              color: AppTheme.primaryColor,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          const Text('Yeni Sınav Ekle'),
        ],
      ),
      content: const Text('Sınav ekleme formu burada olacak'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('İptal'),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Sınav eklendi'),
                backgroundColor: AppTheme.successColor,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            );
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
          ),
          child: const Text('Ekle'),
        ),
      ],
    );
  }
}
