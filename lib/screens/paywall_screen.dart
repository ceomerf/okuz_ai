import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:okuz_ai/services/providers.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:okuz_ai/services/premium_service.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:okuz_ai/widgets/coming_soon_dialog.dart';

class PaywallScreen extends ConsumerStatefulWidget {
  final String? reason; // Paywall'un neden gösterildiği
  final VoidCallback? onSuccess; // Başarılı ödeme sonrası callback

  const PaywallScreen({
    Key? key,
    this.reason,
    this.onSuccess,
  }) : super(key: key);

  @override
  ConsumerState<PaywallScreen> createState() => _PaywallScreenState();
}

class _PaywallScreenState extends ConsumerState<PaywallScreen> {
  late final PremiumService _premiumService = PremiumService(ref.read(apiClientProvider));
  SubscriptionPlan? _selectedPlan;
  bool _isLoading = false;
  SubscriptionStatusResponse? _currentStatus;

  @override
  void initState() {
    super.initState();
    _loadCurrentStatus();
  }

  Future<void> _loadCurrentStatus() async {
    try {
      final status = await _premiumService.getSubscriptionStatus();
      if (mounted) {
        setState(() {
          _currentStatus = status;
        });
      }
    } catch (e) {
      debugPrint('Status yükleme hatası: $e');
    }
  }

  Future<void> _selectPlan(SubscriptionPlan plan) async {
    setState(() {
      _selectedPlan = plan;
    });
  }

  Future<void> _proceedToPayment() async {
    if (_selectedPlan == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Lütfen bir paket seçin'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // Plan fiyatlarını belirle
      double amount;
      String planName;
      
      switch (_selectedPlan!) {
        case SubscriptionPlan.MONTHLY_PREMIUM:
          amount = 99.99;
          planName = 'Aylık Premium';
          break;
        case SubscriptionPlan.YEARLY_PREMIUM:
          amount = 999.99;
          planName = 'Yıllık Premium';
          break;
        case SubscriptionPlan.FAMILY_PLAN:
          amount = 149.99;
          planName = 'Aile Paketi';
          break;
      }

      // Ödeme işlemini başlat
      final result = await _premiumService.createSubscription(
        planType: _selectedPlan!,
        paymentMethod: 'credit_card',
        amount: amount,
      );

      if (result != null) {
        // Ödeme başarılı - kullanıcıyı bilgilendir
        if (mounted) {
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (context) => AlertDialog(
              title: const Text('Ödeme Başarılı!'),
              content: Text('$planName paketine başarıyla abone oldunuz.'),
              actions: [
                TextButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    widget.onSuccess?.call();
                    Navigator.of(context).pop(); // Paywall'u kapat
                  },
                  child: const Text('Tamam'),
                ),
              ],
            ),
          );
        }
      } else {
        // Ödeme başarısız
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Ödeme işlemi başarısız oldu. Lütfen tekrar deneyin.'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Ödeme hatası: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ödeme hatası: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text('Premium\'a Yükselt'),
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.close),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            _buildHeader(),
            const SizedBox(height: 32),
            
            // Reason (eğer varsa)
            if (widget.reason != null) _buildReason(),
            if (widget.reason != null) const SizedBox(height: 24),
            
            // Plan cards
            _buildPlanCards(),
            const SizedBox(height: 32),
            
            // Features
            _buildFeatures(),
            const SizedBox(height: 32),
            
            // Payment button
            _buildPaymentButton(),
            const SizedBox(height: 16),
            
            // Terms
            _buildTerms(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Okuz AI Premium',
          style: GoogleFonts.figtree(
            fontSize: 32,
            fontWeight: FontWeight.bold,
            color: AppTheme.getPrimaryTextColor(context),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Sınırsız AI araçları, detaylı analizler ve kişiselleştirilmiş önerilerle çalışma deneyiminizi bir üst seviyeye taşıyın.',
          style: GoogleFonts.figtree(
            fontSize: 16,
            color: AppTheme.getSecondaryTextColor(context),
            height: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _buildReason() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.primaryColor.withOpacity(0.2),
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.info_outline,
            color: AppTheme.primaryColor,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              widget.reason!,
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: AppTheme.getPrimaryTextColor(context),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlanCards() {
    return Column(
      children: [
        _buildPlanCard(
          plan: SubscriptionPlan.MONTHLY_PREMIUM,
          title: 'Aylık Premium',
          price: '99.99',
          period: 'ay',
          features: [
            'Sınırsız AI araçları',
            'Detaylı analizler',
            'Öncelikli destek',
            'Kişiselleştirilmiş planlar',
          ],
          isPopular: false,
        ),
        const SizedBox(height: 16),
        _buildPlanCard(
          plan: SubscriptionPlan.YEARLY_PREMIUM,
          title: 'Yıllık Premium',
          price: '999.99',
          period: 'yıl',
          features: [
            'Tüm Aylık özellikler',
            '%17 indirim',
            'Erken erişim özellikleri',
            'Özel içerikler',
          ],
          isPopular: true,
        ),
        const SizedBox(height: 16),
        _buildPlanCard(
          plan: SubscriptionPlan.FAMILY_PLAN,
          title: 'Aile Paketi',
          price: '149.99',
          period: 'ay',
          features: [
            '5 kullanıcıya kadar',
            'Ebeveyn kontrol paneli',
            'Aile raporları',
            'Ortak hedefler',
          ],
          isPopular: false,
        ),
      ],
    );
  }

  Widget _buildPlanCard({
    required SubscriptionPlan plan,
    required String title,
    required String price,
    required String period,
    required List<String> features,
    required bool isPopular,
  }) {
    final isSelected = _selectedPlan == plan;
    
    return GestureDetector(
      onTap: () => _selectPlan(plan),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isSelected 
              ? AppTheme.primaryColor.withOpacity(0.1)
              : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected 
                ? AppTheme.primaryColor
                : AppTheme.primaryColor.withOpacity(0.2),
            width: isSelected ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (isPopular)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'POPÜLER',
                      style: GoogleFonts.figtree(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                if (isPopular) const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: GoogleFonts.figtree(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.getPrimaryTextColor(context),
                    ),
                  ),
                ),
                if (isSelected)
                  Icon(
                    Icons.check_circle,
                    color: AppTheme.primaryColor,
                    size: 24,
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '₺$price',
                  style: GoogleFonts.figtree(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  '/$period',
                  style: GoogleFonts.figtree(
                    fontSize: 14,
                    color: AppTheme.getSecondaryTextColor(context),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...features.map((feature) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Icon(
                    Icons.check,
                    size: 16,
                    color: AppTheme.primaryColor,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      feature,
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        color: AppTheme.getPrimaryTextColor(context),
                      ),
                    ),
                  ),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatures() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Premium Özellikler',
          style: GoogleFonts.figtree(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppTheme.getPrimaryTextColor(context),
          ),
        ),
        const SizedBox(height: 16),
        _buildFeatureItem(
          icon: Icons.psychology,
          title: 'Sınırsız AI Araçları',
          description: 'Tüm AI destekli öğrenme araçlarına sınırsız erişim',
        ),
        _buildFeatureItem(
          icon: Icons.analytics,
          title: 'Detaylı Analizler',
          description: 'Çalışma performansınızın derinlemesine analizi',
        ),
        _buildFeatureItem(
          icon: Icons.schedule,
          title: 'Kişiselleştirilmiş Planlar',
          description: 'AI destekli kişisel çalışma planları',
        ),
        _buildFeatureItem(
          icon: Icons.support_agent,
          title: 'Öncelikli Destek',
          description: '7/24 öncelikli müşteri desteği',
        ),
      ],
    );
  }

  Widget _buildFeatureItem({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: AppTheme.primaryColor,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.figtree(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.getPrimaryTextColor(context),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: GoogleFonts.figtree(
                    fontSize: 14,
                    color: AppTheme.getSecondaryTextColor(context),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentButton() {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _proceedToPayment,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 0,
        ),
        child: _isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2,
                ),
              )
            : Text(
                _selectedPlan == null 
                    ? 'Paket Seçin'
                    : 'Abone Ol',
                style: GoogleFonts.figtree(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
      ),
    );
  }

  Widget _buildTerms() {
    return Column(
      children: [
        Text(
          'Aboneliğiniz otomatik olarak yenilenir. İstediğiniz zaman iptal edebilirsiniz.',
          style: GoogleFonts.figtree(
            fontSize: 12,
            color: AppTheme.getSecondaryTextColor(context),
            height: 1.4,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextButton(
              onPressed: () {
                // Terms of service
                showDialog(
                  context: context,
                  builder: (context) => const ComingSoonDialog(
                    featureName: 'Kullanım Şartları',
                    description: 'Kullanım şartları yakında yayınlanacak',
                    icon: Icons.description,
                  ),
                );
              },
              child: Text(
                'Kullanım Şartları',
                style: GoogleFonts.figtree(
                  fontSize: 12,
                  color: AppTheme.primaryColor,
                ),
              ),
            ),
            Text(
              ' ve ',
              style: GoogleFonts.figtree(
                fontSize: 12,
                color: AppTheme.getSecondaryTextColor(context),
              ),
            ),
            TextButton(
              onPressed: () {
                // Privacy policy
                showDialog(
                  context: context,
                  builder: (context) => const ComingSoonDialog(
                    featureName: 'Gizlilik Politikası',
                    description: 'Gizlilik politikası yakında yayınlanacak',
                    icon: Icons.privacy_tip,
                  ),
                );
              },
              child: Text(
                'Gizlilik Politikası',
                style: GoogleFonts.figtree(
                  fontSize: 12,
                  color: AppTheme.primaryColor,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
} 