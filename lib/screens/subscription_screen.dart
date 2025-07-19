import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../services/subscription_service.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({Key? key}) : super(key: key);

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late AnimationController _glowController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;
  late Animation<double> _glowAnimation;

  String _selectedPeriod = 'monthly'; // monthly, yearly, oneTime
  int _selectedPlanIndex = 1; // AI Pro+ varsayılan seçili
  bool _isLoading = false;
  bool _showFounderCampaign = true; // Kurucu üye kampanyası aktif mi?
  Map<String, dynamic>? _founderCountData;

  final List<SubscriptionPlan> _plans = [
    SubscriptionPlan(
      id: 'free',
      title: 'Başlamak Ücretsiz!',
      price: 0,
      period: '',
      badge: '🧲 Denemek İçin Mükemmel',
      badgeColor: Colors.grey,
      icon: Icons.rocket_launch,
      isPopular: false,
      isLimited: false,
      isPremium: false,
      features: [
        'Manuel planlayıcı',
        '1 haftalık AI tarafından oluşturulmuş plan',
        'Temel kullanım',
      ],
    ),
    SubscriptionPlan(
      id: 'ai_pro',
      title: 'AI Pro+',
      price: 749,
      period: 'ay',
      badge: '🟩 En Popüler',
      badgeColor: Colors.green,
      icon: Icons.psychology,
      isPopular: true,
      isLimited: false,
      isPremium: false,
      features: [
        'Sınırsız AI Sokrates (AI test çözme & öğrenme)',
        'Sınırsız Kavram Haritası',
        '1000+ Akıllı Özetleme hakkı',
        'Akıllı tekrar + AI flashcard sistemi',
        'Gelişmiş grafik & analizler',
        'Tema analizi + motivasyon ekranı',
        'Reklamsız deneyim',
      ],
    ),
    SubscriptionPlan(
      id: 'mentor_plus',
      title: 'Mentor Plus',
      price: 2499,
      period: 'ay',
      badge: '💼 Koçluk Paketi',
      badgeColor: Colors.amber,
      icon: Icons.person,
      isPopular: false,
      isLimited: false,
      isPremium: true,
      features: [
        'Tüm AI Pro+ özellikleri',
        'Haftalık 1:1 birebir mentorluk (video + yazılı)',
        'Deneme sınavı analizi + gelişim planı',
        'Koç takip paneli + birebir feedback döngüsü',
        'Sınav simülasyonu sonrası strateji oturumu',
        'WhatsApp / uygulama içi anlık destek',
      ],
      extraTag: '📝 Başvuru Gerektirir',
    ),
    SubscriptionPlan(
      id: 'ultimate',
      title: 'Ultimate Mega Paket',
      price: 4999,
      period: 'yıl',
      badge: '🟠 Sadece Lansman Döneminde',
      badgeColor: Colors.orange,
      icon: Icons.diamond,
      isPopular: false,
      isLimited: true,
      isPremium: false,
      features: [
        'AI Pro+ (12 aylık)',
        'Sınırsız SOS + Sokrates',
        '1000 Özet + Kavram Boost',
        'Tema Paketi + Öğrenme Rotası PRO',
      ],
    ),
  ];

  final List<PowerUp> _powerUps = [
    PowerUp('🔓 Sınırsız SOS Çözücü', 1199, 'Süresiz'),
    PowerUp('🔓 Sınırsız AI Sokrates', 999, 'Süresiz'),
    PowerUp('📚 Akıllı Özet (1000)', 699, 'Tek Sefer'),
    PowerUp('💡 Kavram Haritası Boost', 499, 'Tek Sefer'),
    PowerUp('🧠 Flashcard Booster', 599, 'Tek Sefer'),
    PowerUp('🎨 Premium Temalar', 199, 'Tek Sefer'),
    PowerUp('🧭 Öğrenme Rotası PRO', 749, 'Tek Sefer'),
  ];

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _glowController = AnimationController(
      duration: const Duration(milliseconds: 2000),
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

    _glowAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _glowController,
      curve: Curves.easeInOut,
    ));

    _animationController.forward();
    _glowController.repeat(reverse: true);

    // Kurucu üye sayısını yükle
    _loadFounderCount();
  }

  Future<void> _loadFounderCount() async {
    try {
      final subscriptionService = SubscriptionService();
      final data = await subscriptionService.getFounderMemberCount();
      if (data != null) {
        setState(() {
          _founderCountData = data;
          _showFounderCampaign = data['isCampaignActive'] ?? false;
        });
      }
    } catch (e) {
      print('Kurucu üye sayısı yükleme hatası: $e');
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    _glowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.white,
              Colors.grey.shade50,
            ],
          ),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(30),
            topRight: Radius.circular(30),
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Değer odaklı header
              _buildValueHeader(),
              Expanded(
                child: AnimatedBuilder(
                  animation: _animationController,
                  builder: (context, child) {
                    return FadeTransition(
                      opacity: _fadeAnimation,
                      child: Transform.translate(
                        offset: Offset(0, _slideAnimation.value),
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              // Kurucu Üye Kampanyası
                              if (_showFounderCampaign) ...[
                                _buildFounderCampaign(isDark),
                                const SizedBox(height: 32),
                              ],

                              // Period Toggle
                              _buildPeriodToggle(isDark),
                              const SizedBox(height: 24),

                              // Main Plans
                              _buildMainPlans(isDark),
                              const SizedBox(height: 32),

                              // Power Ups Section
                              _buildPowerUpsSection(isDark),
                              const SizedBox(height: 32),

                              // Security Info
                              _buildSecurityInfo(isDark),
                              const SizedBox(height: 32),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Değer odaklı header
  Widget _buildValueHeader() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.orange.shade400,
            Colors.orange.shade600,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(30),
          topRight: Radius.circular(30),
        ),
      ),
      child: Column(
        children: [
          // Kapatma butonu
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.close,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Ana mesaj
          Text(
            'Momentumunu Kaybetme,\nYolculuğuna Devam Et!',
            textAlign: TextAlign.center,
            style: GoogleFonts.figtree(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 12),
          // Değer hatırlatıcısı
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.trending_up,
                  color: Colors.white,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Son 7 günde harika bir başlangıç yaptın! Bu momentumu sürdürmek için premium özelliklerini keşfet.',
                    style: GoogleFonts.figtree(
                      fontSize: 14,
                      color: Colors.white,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // İndirim banner'ı
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.red.shade400,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.local_fire_department,
                  color: Colors.white,
                  size: 16,
                ),
                const SizedBox(width: 6),
                Text(
                  'Sadece 24 Saat Geçerli %15 Lansman İndirimi!',
                  style: GoogleFonts.figtree(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodToggle(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[800] : Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedPeriod = 'monthly'),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: _selectedPeriod == 'monthly'
                      ? Theme.of(context).colorScheme.surface
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _selectedPeriod == 'monthly'
                      ? [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  'Aylık',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: _selectedPeriod == 'monthly'
                        ? Theme.of(context).textTheme.titleMedium?.color
                        : Theme.of(context).textTheme.bodyMedium?.color,
                    fontWeight: _selectedPeriod == 'monthly'
                        ? FontWeight.w600
                        : FontWeight.w500,
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedPeriod = 'yearly'),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: _selectedPeriod == 'yearly'
                      ? Theme.of(context).colorScheme.surface
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _selectedPeriod == 'yearly'
                      ? [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  'Yıllık',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: _selectedPeriod == 'yearly'
                        ? Theme.of(context).textTheme.titleMedium?.color
                        : Theme.of(context).textTheme.bodyMedium?.color,
                    fontWeight: _selectedPeriod == 'yearly'
                        ? FontWeight.w600
                        : FontWeight.w500,
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedPeriod = 'oneTime'),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: _selectedPeriod == 'oneTime'
                      ? Theme.of(context).colorScheme.surface
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _selectedPeriod == 'oneTime'
                      ? [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  'Tek Sefer',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: _selectedPeriod == 'oneTime'
                        ? Theme.of(context).textTheme.titleMedium?.color
                        : Theme.of(context).textTheme.bodyMedium?.color,
                    fontWeight: _selectedPeriod == 'oneTime'
                        ? FontWeight.w600
                        : FontWeight.w500,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMainPlans(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Premium Paketler',
          style: GoogleFonts.figtree(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        const SizedBox(height: 16),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _plans.length,
          itemBuilder: (context, index) {
            final plan = _plans[index];
            final isSelected = index == _selectedPlanIndex;

            return GestureDetector(
              onTap: () => setState(() => _selectedPlanIndex = index),
              child: Container(
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  gradient: isSelected
                      ? LinearGradient(
                          colors: [
                            Colors.orange.shade400,
                            Colors.orange.shade600,
                          ],
                        )
                      : null,
                  color: isSelected
                      ? null
                      : (isDark ? Colors.grey[800] : Colors.white),
                  borderRadius: BorderRadius.circular(16),
                  border: isSelected
                      ? null
                      : Border.all(
                          color: Colors.grey.withOpacity(0.2),
                          width: 1,
                        ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? Colors.white.withOpacity(0.2)
                                  : plan.badgeColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              plan.icon,
                              color:
                                  isSelected ? Colors.white : plan.badgeColor,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  plan.title,
                                  style: GoogleFonts.figtree(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: isSelected ? Colors.white : null,
                                  ),
                                ),
                                if (plan.badge.isNotEmpty)
                                  Container(
                                    margin: const EdgeInsets.only(top: 4),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? Colors.white.withOpacity(0.2)
                                          : plan.badgeColor.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      plan.badge,
                                      style: GoogleFonts.figtree(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                        color: isSelected
                                            ? Colors.white
                                            : plan.badgeColor,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          if (plan.price > 0)
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '₺${plan.price}',
                                  style: GoogleFonts.figtree(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                    color: isSelected ? Colors.white : null,
                                  ),
                                ),
                                Text(
                                  plan.period,
                                  style: GoogleFonts.figtree(
                                    fontSize: 12,
                                    color: isSelected
                                        ? Colors.white.withOpacity(0.8)
                                        : Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      ...plan.features.map((feature) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.check_circle,
                                  color:
                                      isSelected ? Colors.white : Colors.green,
                                  size: 16,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    feature,
                                    style: GoogleFonts.figtree(
                                      fontSize: 14,
                                      color: isSelected
                                          ? Colors.white.withOpacity(0.9)
                                          : null,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          )),
                      if (plan.extraTag != null)
                        Container(
                          margin: const EdgeInsets.only(top: 12),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.amber.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            plan.extraTag!,
                            style: GoogleFonts.figtree(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.amber.shade700,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _isLoading ? null : _handleSubscribe,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange.shade600,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: _isLoading
                ? const CircularProgressIndicator(color: Colors.white)
                : Text(
                    'Abone Ol',
                    style: GoogleFonts.figtree(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildPowerUpsSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Güçlendirmeler',
          style: GoogleFonts.figtree(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Tek seferlik satın alabileceğin özel özellikler',
          style: GoogleFonts.figtree(
            fontSize: 14,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.2,
          ),
          itemCount: _powerUps.length,
          itemBuilder: (context, index) {
            final powerUp = _powerUps[index];
            return Container(
              decoration: BoxDecoration(
                color: isDark ? Colors.grey[800] : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Colors.grey.withOpacity(0.2),
                  width: 1,
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      powerUp.title,
                      style: GoogleFonts.figtree(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '₺${powerUp.price}',
                          style: GoogleFonts.figtree(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.orange.shade600,
                          ),
                        ),
                        Text(
                          powerUp.type,
                          style: GoogleFonts.figtree(
                            fontSize: 10,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildSecurityInfo(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.green.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.security,
            color: Colors.green,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Güvenli Ödeme',
                  style: GoogleFonts.figtree(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.green.shade700,
                  ),
                ),
                Text(
                  '256-bit SSL şifreleme ile güvenli ödeme',
                  style: GoogleFonts.figtree(
                    fontSize: 12,
                    color: Colors.green.shade600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _handleSubscribe() {
    setState(() => _isLoading = true);

    // Simüle edilmiş ödeme işlemi
    Future.delayed(const Duration(seconds: 2), () {
      setState(() => _isLoading = false);

      // Başarılı ödeme sonrası
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Başarılı!'),
          content: const Text('Premium aboneliğiniz aktif edildi.'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context); // Dialog'u kapat
                Navigator.pop(context); // Subscription ekranını kapat
              },
              child: const Text('Tamam'),
            ),
          ],
        ),
      );
    });
  }

  /// Kurucu üye kampanyası widget'ı
  Widget _buildFounderCampaign(bool isDark) {
    final remainingSlots = _founderCountData?['remainingSlots'] ?? 0;
    final currentCount = _founderCountData?['currentCount'] ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.purple.shade400,
            Colors.purple.shade600,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.purple.withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Başlık ve Badge
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.star,
                        color: Colors.white,
                        size: 16,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'KURUCU ÜYE',
                        style: GoogleFonts.figtree(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.red.shade400,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'SADECE $remainingSlots KALDI!',
                    style: GoogleFonts.figtree(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Ana başlık
            Text(
              'Kurucu Üye Ayrıcalığı:\nİnanılmaz Bir Teklif!',
              style: GoogleFonts.figtree(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                height: 1.2,
              ),
            ),
            const SizedBox(height: 12),

            // Açıklama
            Text(
              'İlk 500 kurucu üyemizden biri olun! Normalde aylık 749 TL olan AI Pro+ paketimizin 1 yıllık tam sürümüne, sadece size özel, tek seferlik 999 TL\'ye sahip olun.',
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: Colors.white.withOpacity(0.9),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 16),

            // Fiyat karşılaştırması
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Normal Fiyat (1 yıl):',
                        style: GoogleFonts.figtree(
                          fontSize: 14,
                          color: Colors.white.withOpacity(0.8),
                        ),
                      ),
                      Text(
                        '₺8.988',
                        style: GoogleFonts.figtree(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white.withOpacity(0.8),
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Kurucu Üye Fiyatı:',
                        style: GoogleFonts.figtree(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        '₺999',
                        style: GoogleFonts.figtree(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green.shade400,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '%85 İNDİRİM!',
                      style: GoogleFonts.figtree(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Özellikler
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildFounderFeature('✅ 1 yıllık AI Pro+ tam erişim'),
                _buildFounderFeature(
                    '✅ Gelecekteki fiyat artışlarına karşı koruma'),
                _buildFounderFeature('✅ Ömür boyu kurucu üye rozeti'),
                _buildFounderFeature('✅ Öncelikli destek ve özel içerikler'),
                _buildFounderFeature(
                    '✅ İndirimli yenileme hakkı (2 yıl geçerli)'),
              ],
            ),
            const SizedBox(height: 20),

            // İlerleme çubuğu
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Kurucu Üye İlerlemesi',
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      '$currentCount/500',
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                LinearProgressIndicator(
                  value: currentCount / 500,
                  backgroundColor: Colors.white.withOpacity(0.2),
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Kurucu üye ol butonu
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _handleFounderJoin,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.purple.shade600,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.purple)
                    : Text(
                        'KURUCU ÜYE OL - ₺999',
                        style: GoogleFonts.figtree(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFounderFeature(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Text(
            text,
            style: GoogleFonts.figtree(
              fontSize: 14,
              color: Colors.white.withOpacity(0.9),
            ),
          ),
        ],
      ),
    );
  }

  void _handleFounderJoin() async {
    setState(() => _isLoading = true);

    try {
      final subscriptionService = SubscriptionService();
      final result = await subscriptionService.joinFounderMembership();

      if (result != null && result['success'] == true) {
        if (mounted) {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('🎉 Tebrikler!'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                      'Kurucu üye #${result['founderNumber']} olarak kaydoldunuz!'),
                  const SizedBox(height: 8),
                  Text('1 yıllık AI Pro+ aboneliğiniz aktif edildi.'),
                  const SizedBox(height: 8),
                  Text('Özel ayrıcalıklarınız 2 yıl boyunca geçerli olacak.'),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    Navigator.pop(context); // Dialog'u kapat
                    Navigator.pop(context); // Subscription ekranını kapat
                  },
                  child: const Text('Harika!'),
                ),
              ],
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content:
                  Text('Kurucu üye kaydı başarısız. Lütfen tekrar deneyin.'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hata: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}

class SubscriptionPlan {
  final String id;
  final String title;
  final int price;
  final String period;
  final String badge;
  final Color badgeColor;
  final IconData icon;
  final bool isPopular;
  final bool isLimited;
  final bool isPremium;
  final List<String> features;
  final String? extraTag;

  SubscriptionPlan({
    required this.id,
    required this.title,
    required this.price,
    required this.period,
    required this.badge,
    required this.badgeColor,
    required this.icon,
    required this.isPopular,
    required this.isLimited,
    required this.isPremium,
    required this.features,
    this.extraTag,
  });
}

class PowerUp {
  final String title;
  final int price;
  final String type;

  PowerUp(this.title, this.price, this.type);
}
