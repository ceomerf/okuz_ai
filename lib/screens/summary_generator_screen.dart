import 'package:flutter/material.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../theme/app_theme.dart';
import '../widgets/energy_effect_widget.dart';
import 'generated_content_screen.dart';

class SummaryGeneratorScreen extends StatefulWidget {
  const SummaryGeneratorScreen({Key? key}) : super(key: key);

  @override
  State<SummaryGeneratorScreen> createState() => _SummaryGeneratorScreenState();
}

class _SummaryGeneratorScreenState extends State<SummaryGeneratorScreen>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;

  final TextEditingController _textController = TextEditingController();
  final TextEditingController _urlController = TextEditingController();

  bool _isGeneratingSummary = false;
  String _summaryResult = '';
  Map<String, dynamic>? _summaryData;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
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
      begin: 50.0,
      end: 0.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: const Interval(0.2, 1.0, curve: Curves.easeOutCubic),
    ));
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _textController.dispose();
    _urlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(context).brightness == Brightness.dark
                  ? AppTheme.primaryColor.withOpacity(0.1)
                  : AppTheme.primaryLightColor.withOpacity(0.3),
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
                  child: CustomScrollView(
                    physics: const BouncingScrollPhysics(),
                    slivers: [
                      _buildSliverAppBar(),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildHeader(),
                              const SizedBox(height: 32),
                              _buildInputSection(),
                              const SizedBox(height: 24),
                              _buildAnalyzeButton(),
                              if (_summaryResult.isNotEmpty) ...[
                                const SizedBox(height: 24),
                                _buildResultSection(),
                              ],
                              const SizedBox(height: 100),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildSliverAppBar() {
    return SliverAppBar(
      expandedHeight: 120,
      floating: false,
      pinned: true,
      backgroundColor: AppTheme.primaryColor,
      flexibleSpace: FlexibleSpaceBar(
        title: const Text(
          'Akıllı Özet',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                AppTheme.primaryColor,
                AppTheme.primaryDarkColor,
              ],
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                top: 20,
                right: 20,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(50),
                  ),
                  child: const Text(
                    '📝',
                    style: TextStyle(fontSize: 24),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Metinleri Özetle',
          style: Theme.of(context).textTheme.displayMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: AppTheme.getPrimaryTextColor(context),
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Uzun metinleri veya web sayfalarını anında özetleyen AI asistanın. Önemli noktaları kaçırma!',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: AppTheme.getSecondaryTextColor(context),
                height: 1.5,
              ),
        ),
      ],
    );
  }

  Widget _buildInputSection() {
    return EnergyEffectWidget(
      intensity: 0.4,
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(context),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: AppTheme.primaryColor.withOpacity(0.1),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.text_fields,
                      color: AppTheme.primaryColor,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'İçerik Girişi',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppTheme.getPrimaryTextColor(context),
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Text Input
              Container(
                decoration: BoxDecoration(
                  color: Theme.of(context).brightness == Brightness.dark
                      ? Colors.grey[800]
                      : Colors.grey[50],
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppTheme.primaryColor.withOpacity(0.2),
                  ),
                ),
                child: TextField(
                  controller: _textController,
                  style: TextStyle(
                    color: AppTheme.getPrimaryTextColor(context),
                    fontSize: 16,
                  ),
                  maxLines: 8,
                  decoration: InputDecoration(
                    hintText:
                        'Özetlemek istediğin metni buraya yapıştır...\n\nÖrnek: Makaleler, ders notları, kitap bölümleri',
                    hintStyle: TextStyle(
                      color: AppTheme.getSecondaryTextColor(context),
                      fontSize: 14,
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.all(16),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Divider with "VEYA"
              Row(
                children: [
                  Expanded(child: Divider(color: Colors.grey[400])),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'VEYA',
                      style: TextStyle(
                        color: AppTheme.getSecondaryTextColor(context),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  Expanded(child: Divider(color: Colors.grey[400])),
                ],
              ),

              const SizedBox(height: 16),

              // URL Input
              Container(
                decoration: BoxDecoration(
                  color: Theme.of(context).brightness == Brightness.dark
                      ? Colors.grey[800]
                      : Colors.grey[50],
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppTheme.primaryColor.withOpacity(0.2),
                  ),
                ),
                child: TextField(
                  controller: _urlController,
                  style: TextStyle(
                    color: AppTheme.getPrimaryTextColor(context),
                    fontSize: 16,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Web sayfası URL\'si girin (https://...)',
                    hintStyle: TextStyle(
                      color: AppTheme.getSecondaryTextColor(context),
                      fontSize: 14,
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.all(16),
                    prefixIcon: Icon(
                      Icons.link,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAnalyzeButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _isGeneratingSummary ? null : _generateSummary,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 0,
          shadowColor: AppTheme.primaryColor.withOpacity(0.3),
        ),
        child: _isGeneratingSummary
            ? Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Özet Oluşturuluyor...',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('🚀', style: TextStyle(fontSize: 20)),
                  const SizedBox(width: 8),
                  const Text(
                    'Özet Oluştur',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildResultSection() {
    return EnergyEffectWidget(
      intensity: 0.3,
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(context),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: AppTheme.successColor.withOpacity(0.1),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.successColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.check_circle,
                      color: AppTheme.successColor,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Özet Hazır!',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppTheme.getPrimaryTextColor(context),
                        ),
                  ),
                  const Spacer(),
                  const Text('📄', style: TextStyle(fontSize: 24)),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Metniniz başarıyla analiz edildi ve özetlendi. Detayları görüntülemek için butona tıklayın.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.getSecondaryTextColor(context),
                    ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => GeneratedContentScreen(
                          preGeneratedData: _summaryResult,
                          conceptMapData: _summaryData,
                        ),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.successColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Özeti Görüntüle',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _generateSummary() async {
    final text = _textController.text.trim();
    final url = _urlController.text.trim();

    if (text.isEmpty && url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Lütfen metin veya URL girin'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }

    setState(() {
      _isGeneratingSummary = true;
      _summaryResult = '';
      _summaryData = null;
    });

    try {
      final callable =
          FirebaseFunctions.instance.httpsCallable('generateSummary');
      final result = await callable.call({
        'text': text.isNotEmpty ? text : null,
        'url': url.isNotEmpty ? url : null,
        'type': 'summary',
      });

      if (result.data['success'] == true) {
        final data = result.data['data'];
        setState(() {
          _summaryResult = data.toString();
          _summaryData = data is Map ? Map<String, dynamic>.from(data) : null;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.data['sourceType'] == 'url'
                ? 'Web sayfası başarıyla özetlendi!'
                : 'Metin başarıyla özetlendi!'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      } else {
        throw Exception('Özet oluşturulamadı');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Özet oluşturma hatası: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      setState(() {
        _isGeneratingSummary = false;
      });
    }
  }
}
