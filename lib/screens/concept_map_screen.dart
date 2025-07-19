import 'package:flutter/material.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../theme/app_theme.dart';
import '../widgets/energy_effect_widget.dart';
import 'generated_content_screen.dart';

class ConceptMapScreen extends StatefulWidget {
  const ConceptMapScreen({Key? key}) : super(key: key);

  @override
  State<ConceptMapScreen> createState() => _ConceptMapScreenState();
}

class _ConceptMapScreenState extends State<ConceptMapScreen>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;

  final TextEditingController _textController = TextEditingController();
  final TextEditingController _urlController = TextEditingController();

  bool _isGeneratingConceptMap = false;
  String _conceptMapResult = '';
  Map<String, dynamic>? _conceptMapData;

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
                              if (_conceptMapResult.isNotEmpty) ...[
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
      backgroundColor: AppTheme.accentColor,
      flexibleSpace: FlexibleSpaceBar(
        title: const Text(
          'Kavram Haritası',
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
                AppTheme.accentColor,
                AppTheme.primaryColor,
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
                    '🗺️',
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
          'Kavram Haritası Oluştur',
          style: Theme.of(context).textTheme.displayMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: AppTheme.getPrimaryTextColor(context),
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Metinlerdeki kavramları ve aralarındaki bağlantıları görsel harita olarak sunan AI asistanın. Öğrenme sürecini görselleştir!',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: AppTheme.getSecondaryTextColor(context),
                height: 1.5,
              ),
        ),
        const SizedBox(height: 16),
        _buildFeatureCards(),
      ],
    );
  }

  Widget _buildFeatureCards() {
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.primaryColor.withOpacity(0.2),
              ),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.account_tree,
                  color: AppTheme.primaryColor,
                  size: 24,
                ),
                const SizedBox(height: 4),
                Text(
                  'Bağlantılar',
                  style: TextStyle(
                    color: AppTheme.primaryColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.accentColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.accentColor.withOpacity(0.2),
              ),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.hub,
                  color: AppTheme.accentColor,
                  size: 24,
                ),
                const SizedBox(height: 4),
                Text(
                  'Kavramlar',
                  style: TextStyle(
                    color: AppTheme.accentColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.successColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.successColor.withOpacity(0.2),
              ),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.psychology,
                  color: AppTheme.successColor,
                  size: 24,
                ),
                const SizedBox(height: 4),
                Text(
                  'Analiz',
                  style: TextStyle(
                    color: AppTheme.successColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
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
              color: AppTheme.accentColor.withOpacity(0.1),
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
                      color: AppTheme.accentColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.text_fields,
                      color: AppTheme.accentColor,
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
                    color: AppTheme.accentColor.withOpacity(0.2),
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
                        'Kavram haritasını oluşturmak istediğin metni buraya yapıştır...\n\nÖrnek: Ders kitabı bölümleri, bilimsel makaleler, akademik metinler',
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
                    color: AppTheme.accentColor.withOpacity(0.2),
                  ),
                ),
                child: TextField(
                  controller: _urlController,
                  style: TextStyle(
                    color: AppTheme.getPrimaryTextColor(context),
                    fontSize: 16,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Eğitim içeriği URL\'si girin (https://...)',
                    hintStyle: TextStyle(
                      color: AppTheme.getSecondaryTextColor(context),
                      fontSize: 14,
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.all(16),
                    prefixIcon: Icon(
                      Icons.link,
                      color: AppTheme.accentColor,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Info box
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.infoColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppTheme.infoColor.withOpacity(0.2),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      color: AppTheme.infoColor,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Kavram haritası, metindeki ana kavramları ve aralarındaki ilişkileri görsel olarak gösterir.',
                        style: TextStyle(
                          color: AppTheme.infoColor,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
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
        onPressed: _isGeneratingConceptMap ? null : _generateConceptMap,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.accentColor,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 0,
          shadowColor: AppTheme.accentColor.withOpacity(0.3),
        ),
        child: _isGeneratingConceptMap
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
                    'Kavram Haritası Oluşturuluyor...',
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
                  const Text('🗺️', style: TextStyle(fontSize: 20)),
                  const SizedBox(width: 8),
                  const Text(
                    'Kavram Haritası Oluştur',
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
                    'Kavram Haritası Hazır!',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppTheme.getPrimaryTextColor(context),
                        ),
                  ),
                  const Spacer(),
                  const Text('🗺️', style: TextStyle(fontSize: 24)),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Metniniz başarıyla analiz edildi ve kavram haritası oluşturuldu. Görsel haritayı görüntülemek için butona tıklayın.',
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
                          preGeneratedData: _conceptMapResult,
                          conceptMapData: _conceptMapData,
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
                    'Kavram Haritasını Görüntüle',
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

  Future<void> _generateConceptMap() async {
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
      _isGeneratingConceptMap = true;
      _conceptMapResult = '';
      _conceptMapData = null;
    });

    try {
      final callable =
          FirebaseFunctions.instance.httpsCallable('generateConceptMap');
      final result = await callable.call({
        'text': text.isNotEmpty ? text : null,
        'url': url.isNotEmpty ? url : null,
        'type': 'concept_map',
      });

      if (result.data['success'] == true) {
        final data = result.data['data'];
        setState(() {
          _conceptMapResult = data.toString();
          _conceptMapData =
              data is Map ? Map<String, dynamic>.from(data) : null;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.data['sourceType'] == 'url'
                ? 'Web sayfası başarıyla analiz edildi!'
                : 'Metin başarıyla analiz edildi!'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      } else {
        throw Exception('Kavram haritası oluşturulamadı');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Kavram haritası oluşturma hatası: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      setState(() {
        _isGeneratingConceptMap = false;
      });
    }
  }
}
