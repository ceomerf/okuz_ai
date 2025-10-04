import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';

class HelpAndFAQScreen extends StatefulWidget {
  const HelpAndFAQScreen({Key? key}) : super(key: key);

  @override
  State<HelpAndFAQScreen> createState() => _HelpAndFAQScreenState();
}

class _HelpAndFAQScreenState extends State<HelpAndFAQScreen>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;

  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  int? _expandedIndex;

  final List<FAQCategory> _faqCategories = [
    FAQCategory(
      title: 'AI ve Öğrenme',
      icon: Icons.psychology,
      color: const Color(0xFF6366F1),
      emoji: '🧠',
      faqs: [
        FAQ(
          question: 'AI planımı neden değiştirdi?',
          answer:
              'AI asistanın, performansını ve öğrenme alışkanlıklarını analiz ederek daha verimli bir çalışma planı önerir. Bu değişiklikler:\n\n• Zayıf olduğun konulara daha fazla zaman ayırır\n• Güçlü olduğun alanları pekiştirme dozunda tutar\n• Biorhythmini dikkate alarak en verimli saatleri kullanır\n• Hedeflerine göre öncelikleri ayarlar\n\nİstersen eski planına geri dönebilir veya AI önerilerini özelleştirebilirsin.',
        ),
        FAQ(
          question: 'Socratic sorgulama nasıl çalışır?',
          answer:
              'AI Sokrates, seni düşündürerek öğrenmeni sağlayan bir tekniktir:\n\n• Doğrudan cevap vermek yerine, doğru cevaba ulaşman için sorular sorar\n• Önyargılarını sorgular ve farklı bakış açıları sunar\n• Kavramlar arasında bağlantı kurmanı sağlar\n• Derinlemesine anlayış geliştirmeni destekler\n\nBu yöntemle öğrendiklerin kalıcı hale gelir ve analitik düşünme becerilerin gelişir.',
        ),
        FAQ(
          question: 'AI asistan neden bazen yavaş yanıt veriyor?',
          answer:
              'AI asistanın yanıt süresi şu faktörlere bağlıdır:\n\n• Sorunun karmaşıklık seviyesi\n• Kişiselleştirme için gereken analiz süresi\n• İnternet bağlantı hızın\n• Sunucu yoğunluğu\n\nGenellikle basit sorular 2-3 saniye, karmaşık analizler 5-10 saniye sürer. Yavaşlık devam ederse lütfen teknik desteğe bildir.',
        ),
        FAQ(
          question: 'Özel konu planlaması nasıl yapılır?',
          answer:
              'Belirli bir konuya odaklanmak için:\n\n1. Ana menüden "Akıllı Planlama"ya git\n2. "Özel Konu" seçeneğini seç\n3. Çalışmak istediğin konuyu ve süreyi belirt\n4. AI sana o konu için detaylı plan oluştursun\n\nPlan, zorluk seviyeni ve önceki performansını dikkate alarak hazırlanır.',
        ),
      ],
    ),
    FAQCategory(
      title: 'XP ve Gamification',
      icon: Icons.emoji_events,
      color: const Color(0xFFF59E0B),
      emoji: '🏆',
      faqs: [
        FAQ(
          question: 'XP nasıl kazanılır?',
          answer:
              'XP (Experience Points) şu aktivitelerle kazanılır:\n\n• Günlük çalışma hedefini tamamlama: +50 XP\n• Pomodoro seansı bitirme: +10 XP\n• AI soruları doğru yanıtlama: +5-15 XP\n• Haftalık hedefi tamamlama: +100 XP\n• Streak sürdürme: Her gün +5 ek XP\n• Özel görevleri tamamlama: +25-50 XP\n\nXP seviyesi arttıkça yeni rozetler ve özellikler açılır!',
        ),
        FAQ(
          question: 'Seri (Streak) nedir ve nasıl sürdürülür?',
          answer:
              'Streak, art arda çalışma yaptığın gün sayısıdır:\n\n• Her gün en az 15 dakika çalışarak streak sürdürülür\n• Streak kırılırsa sıfırdan başlar\n• Haftalık streak freeze hakkın var (1 gün atlamana izin verir)\n• Streak seviyeleri: 🔥7, 💪30, 🏆100, 👑365 gün\n\nYüksek streak seviyeleri bonus XP ve özel ödüller verir.',
        ),
        FAQ(
          question: 'Rozet ve başarımlar nerede görünür?',
          answer:
              'Tüm başarımların "Profil" bölümünde görüntülenir:\n\n• Kazandığın rozetler ve seviyeleri\n• İlerleme durumun ve bir sonraki hedef\n• Arkadaşlarınla karşılaştırma\n• Özel ödüller ve unvanlar\n\nRozetler sosyal medyada paylaşılabilir ve motivasyonunu artırır.',
        ),
        FAQ(
          question: 'Liderlik tablosu nasıl çalışır?',
          answer:
              'Haftalık liderlik tablosu:\n\n• Aynı seviyedeki kullanıcılarla yarışırsın\n• XP, streak ve çalışma süresi dikkate alınır\n• İlk 3\'e girersen özel ödüller kazanırsın\n• Her pazartesi yeni hafta başlar\n• Arkadaşlarını davet ederek özel lig oluşturabilirsin',
        ),
      ],
    ),
    FAQCategory(
      title: 'Abonelik ve Ödemeler',
      icon: Icons.workspace_premium,
      color: AppTheme.primaryColor,
      emoji: '💎',
      faqs: [
        FAQ(
          question: 'Premium özellikleri nelerdir?',
          answer:
              'AI Pro üyeliği ile şu özelliklere erişirsin:\n\n• Sınırsız AI asistan kullanımı\n• Gelişmiş performans analizi ve raporlar\n• Kişiselleştirilmiş çalışma planları\n• Tüm akıllı araçlara erişim\n• Öncelikli müşteri desteği\n• Çoklu cihaz senkronizasyonu\n• Reklamsız deneyim\n• Özel motivasyon içerikleri',
        ),
        FAQ(
          question: 'Aboneliğimi nasıl iptal edebilirim?',
          answer:
              'Abonelik iptali için:\n\n**iOS için:**\n1. Ayarlar > Apple ID > Abonelikler\n2. Okuz AI\'ı bul ve iptal et\n\n**Android için:**\n1. Google Play Store > Hesap > Abonelikler\n2. Okuz AI\'ı bul ve iptal et\n\n**Uygulama içinden:**\nProfil > Aboneliği Yönet > İptal Et\n\nİptal ettikten sonra mevcut dönem sonuna kadar premium özelliklerini kullanmaya devam edersin.',
        ),
        FAQ(
          question: 'Ücret iadesi alabilir miyim?',
          answer:
              'İade politikamız:\n\n• İlk 7 gün içinde koşulsuz iade\n• Teknik sorunlar için 30 gün iade garantisi\n• Kullanmadığın süre için orantılı iade\n\n**İade başvurusu:**\n1. Ayarlar > Yardım > Bize Ulaşın\n2. "İade Talebi" konusunu seç\n3. Gerekçeni açıkla\n\nGenellikle 2-3 iş günü içinde işleme alınır.',
        ),
        FAQ(
          question: 'Aile planı var mı?',
          answer:
              'Evet! Aile planımızla %40\'a varan tasarruf sağlayabilirsin:\n\n• 6 kişiye kadar kullanım\n• Her üyenin kendi profili ve verileri\n• Ailevi ilerleme takibi\n• Ebeveyn kontrol özellikleri\n• Tek faturalama\n\nAile planı için Profil > Abonelik > Aile Planı bölümünden başvurabilirsin.',
        ),
      ],
    ),
    FAQCategory(
      title: 'Hesap Yönetimi',
      icon: Icons.account_circle,
      color: const Color(0xFF10B981),
      emoji: '👤',
      faqs: [
        FAQ(
          question: 'Şifremi unuttum, nasıl sıfırlarım?',
          answer:
              'Şifre sıfırlama adımları:\n\n1. Giriş ekranında "Şifremi Unuttum" bağlantısına tıkla\n2. E-posta adresini gir\n3. Gelen e-postadaki bağlantıya tıkla\n4. Yeni şifreni oluştur\n\nE-posta gelmezse spam klasörünü kontrol et. Sorun devam ederse destek ekibimizle iletişime geç.',
        ),
        FAQ(
          question: 'E-posta adresimi nasıl değiştirebilirim?',
          answer:
              'E-posta değişikliği için:\n\n1. Profil > Ayarlar > Hesap Bilgileri\n2. "E-posta Değiştir" butonuna tıkla\n3. Mevcut şifreni doğrula\n4. Yeni e-posta adresini gir\n5. Doğrulama kodunu kontrol et\n\nGüvenlik nedeniyle değişiklik 24 saat sonra aktif olur.',
        ),
        FAQ(
          question: 'Hesabımı tamamen silebilir miyim?',
          answer:
              'Hesap silme işlemi kalıcıdır ve geri alınamaz:\n\n**Silinecek veriler:**\n• Kişisel bilgilerin\n• Çalışma geçmişin\n• İlerleme kaydın\n• Abonelik bilgilerin\n\n**İşlem adımları:**\n1. Profil > Ayarlar > Hesap İşlemleri\n2. "Hesabı Sil" butonuna tıkla\n3. Gerekçeni belirt (isteğe bağlı)\n4. Son onayı ver\n\nSilme işlemi 30 gün sonra tamamlanır. Bu süre içinde geri alabilirsin.',
        ),
        FAQ(
          question: 'Çoklu cihaz kullanımı nasıl çalışır?',
          answer:
              'Premium üyelikle tüm cihazlarında senkronizasyon:\n\n• Telefon, tablet, bilgisayar aynı hesap\n• Otomatik yedekleme ve senkronizasyon\n• Kaldığın yerden devam etme\n• Çevrimdışı çalışma sonrası otomatik güncelleme\n\nYeni cihaza giriş yaptığında tüm verilerini bulacaksın.',
        ),
      ],
    ),
    FAQCategory(
      title: 'Teknik Sorunlar',
      icon: Icons.bug_report,
      color: const Color(0xFFEF4444),
      emoji: '🔧',
      faqs: [
        FAQ(
          question: 'Uygulama çöküyor, ne yapmalıyım?',
          answer:
              'Çökme sorunları için:\n\n**İlk çözümler:**\n• Uygulamayı tamamen kapat ve yeniden aç\n• Cihazını yeniden başlat\n• App Store/Play Store\'dan güncelleme kontrol et\n• Depolama alanını kontrol et (en az 1GB boş olmalı)\n\n**Devam ediyorsa:**\n• Uygulamayı sil ve yeniden yükle\n• Hesabınla tekrar giriş yap\n• Verilerin otomatik olarak geri gelecek',
        ),
        FAQ(
          question: 'Senkronizasyon çalışmıyor',
          answer:
              'Senkronizasyon sorunları için:\n\n• İnternet bağlantını kontrol et\n• Ayarlar > Hesap > Manuel Senkronizasyon\n• Diğer cihazlarda da güncel sürüm olduğundan emin ol\n• Çok fazla veri varsa senkronizasyon birkaç dakika sürebilir\n\nSorun devam ederse bize bildir, teknik ekibimiz yardımcı olur.',
        ),
        FAQ(
          question: 'Bildirimler gelmiyor',
          answer:
              'Bildirim ayarları kontrol listesi:\n\n**Uygulama içi:**\n• Ayarlar > Bildirimler > Tüm seçenekleri aç\n\n**Cihaz ayarları:**\n• iOS: Ayarlar > Bildirimler > Okuz AI > İzin ver\n• Android: Ayarlar > Uygulamalar > Okuz AI > Bildirimler\n\n**Diğer kontroller:**\n• Rahatsız etme modu kapalı olmalı\n• Uygulama güncellemeleri kontrol et',
        ),
        FAQ(
          question: 'Ses çalışmıyor',
          answer:
              'Ses sorunları için:\n\n• Cihaz sesinin açık olduğundan emin ol\n• Uygulama içi ses ayarlarını kontrol et\n• Bluetooth kulaklık bağlıysa bağlantıyı kontrol et\n• Diğer uygulamalarda ses çalışıyor mu test et\n• Uygulamayı yeniden başlat\n\nSorun iOS/Android sistem ayarlarından da kaynaklanabilir.',
        ),
      ],
    ),
    FAQCategory(
      title: 'Genel Kullanım',
      icon: Icons.help_outline,
      color: const Color(0xFF8B5CF6),
      emoji: '💡',
      faqs: [
        FAQ(
          question: 'Çevrimdışı kullanım mümkün mü?',
          answer:
              'Çevrimdışı özelliklerin:\n\n**Kullanılabilir:**\n• İndirdiğin çalışma materyalleri\n• Pomodoro timer\n• Temel çalışma takibi\n• Önceden yüklenmiş sorular\n\n**Kullanılamaz:**\n• AI asistan\n• Canlı senkronizasyon\n• Yeni içerik indirme\n• Sosyal özellikler\n\nİnternet bağlantısı geri geldiğinde tüm veriler otomatik senkronize olur.',
        ),
        FAQ(
          question: 'Veri kullanımım ne kadar?',
          answer:
              'Ortalama aylık veri tüketimi:\n\n• Hafif kullanım: ~50MB\n• Orta kullanım: ~150MB\n• Yoğun kullanım: ~300MB\n\n**Veri tasarrufu için:**\n• WiFi\'da içerik indirin\n• Ayarlar > Veri Tasarrufu > Açık\n• Video içerikleri sadece WiFi\'da izle\n• Otomatik yedeklemeyi WiFi\'ya sınırla',
        ),
        FAQ(
          question: 'Yaş sınırı var mı?',
          answer:
              'Uygulama kullanım koşulları:\n\n• Minimum yaş: 13\n• 13-18 yaş arası: Ebeveyn onayı gerekli\n• 18+ tam bağımsız kullanım\n\n**Ebeveyn kontrolü:**\n• Kullanım süresi sınırları\n• İçerik filtreleme\n• İlerleme raporları\n• Harcama limitleri\n\nGüvenli öğrenme ortamı önceliğimizdir.',
        ),
        FAQ(
          question: 'Gizliliğim nasıl korunuyor?',
          answer:
              'Veri güvenliği önlemlerimiz:\n\n• Tüm veriler şifrelenerek saklanır\n• Kişisel bilgiler 3. taraflarla paylaşılmaz\n• AI analizleri anonim olarak yapılır\n• İstediğin zaman verilerini silebilirsin\n• GDPR ve KVKK uyumlu sistem\n\nDetaylı bilgi için Gizlilik Politikası\'nı incele.',
        ),
      ],
    ),
  ];

  @override
  void initState() {
    super.initState();
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
      begin: 20.0,
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
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
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
                  child: CustomScrollView(
                    physics: const BouncingScrollPhysics(),
                    slivers: [
                      _buildSliverAppBar(isDark),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              _buildHeader(isDark),
                              const SizedBox(height: 24),
                              _buildSearchBar(isDark),
                              const SizedBox(height: 24),
                              _buildQuickActions(isDark),
                              const SizedBox(height: 32),
                              ..._buildFAQSections(isDark),
                              const SizedBox(height: 80),
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

  Widget _buildSliverAppBar(bool isDark) {
    return SliverAppBar(
      expandedHeight: 120,
      floating: false,
      pinned: true,
      backgroundColor: isDark ? Colors.grey[850] : Colors.white,
      foregroundColor: isDark ? Colors.white : Colors.black87,
      elevation: 0,
      flexibleSpace: FlexibleSpaceBar(
        title: Text(
          'Yardım & SSS',
          style: TextStyle(
            color: isDark ? Colors.white : Colors.black87,
            fontWeight: FontWeight.w600,
            fontSize: 18,
          ),
        ),
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                isDark ? Colors.grey[850]! : Colors.white,
                isDark ? Colors.grey[800]! : Colors.grey[50]!,
              ],
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                top: 40,
                right: 20,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Icon(
                    Icons.help_center,
                    color: AppTheme.primaryColor,
                    size: 24,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.getCardColor(context),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.3)
                : Colors.grey.withValues(alpha: 0.1),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.primaryColor, AppTheme.accentColor],
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(
              Icons.support_agent,
              color: Colors.white,
              size: 32,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Nasıl Yardımcı Olabiliriz?',
            style: TextStyle(
              color: AppTheme.getPrimaryTextColor(context),
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'En sık sorulan soruların cevaplarını bul veya doğrudan bizimle iletişime geç',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppTheme.getSecondaryTextColor(context),
              fontSize: 14,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.getCardColor(context),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.2),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.3)
                : Colors.grey.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (value) {
          setState(() {
            _searchQuery = value.toLowerCase();
          });
        },
        style: TextStyle(
          color: AppTheme.getPrimaryTextColor(context),
        ),
        decoration: InputDecoration(
          hintText: 'Sorunu ara... (örn: XP, abonelik, çökme)',
          hintStyle: TextStyle(
            color: AppTheme.getSecondaryTextColor(context),
          ),
          prefixIcon: Icon(
            Icons.search,
            color: AppTheme.primaryColor,
          ),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: Icon(
                    Icons.clear,
                    color: AppTheme.getSecondaryTextColor(context),
                  ),
                  onPressed: () {
                    _searchController.clear();
                    setState(() {
                      _searchQuery = '';
                    });
                  },
                )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.all(16),
        ),
      ),
    );
  }

  Widget _buildQuickActions(bool isDark) {
    return Row(
      children: [
        Expanded(
          child: _buildQuickActionCard(
            title: 'Bize Ulaşın',
            subtitle: 'Doğrudan destek',
            icon: Icons.email,
            color: AppTheme.primaryColor,
            onTap: _contactSupport,
            isDark: isDark,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildQuickActionCard(
            title: 'Canlı Sohbet',
            subtitle: 'Hızlı yardım',
            icon: Icons.chat,
            color: AppTheme.successColor,
            onTap: _openLiveChat,
            isDark: isDark,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.getCardColor(context),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: color.withValues(alpha: 0.2),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: isDark
                  ? Colors.black.withValues(alpha: 0.3)
                  : Colors.grey.withValues(alpha: 0.1),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: color,
                size: 24,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: TextStyle(
                color: AppTheme.getPrimaryTextColor(context),
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: TextStyle(
                color: AppTheme.getSecondaryTextColor(context),
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildFAQSections(bool isDark) {
    final filteredCategories = _searchQuery.isEmpty
        ? _faqCategories
        : _faqCategories
            .map((category) {
              final filteredFaqs = category.faqs
                  .where((faq) =>
                      faq.question.toLowerCase().contains(_searchQuery) ||
                      faq.answer.toLowerCase().contains(_searchQuery))
                  .toList();

              return filteredFaqs.isEmpty
                  ? null
                  : FAQCategory(
                      title: category.title,
                      icon: category.icon,
                      color: category.color,
                      emoji: category.emoji,
                      faqs: filteredFaqs,
                    );
            })
            .whereType<FAQCategory>()
            .toList();

    if (filteredCategories.isEmpty && _searchQuery.isNotEmpty) {
      return [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppTheme.getCardColor(context),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            children: [
              Icon(
                Icons.search_off,
                color: AppTheme.getSecondaryTextColor(context),
                size: 48,
              ),
              const SizedBox(height: 16),
              Text(
                'Aradığınız bulunamadı',
                style: TextStyle(
                  color: AppTheme.getPrimaryTextColor(context),
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Farklı anahtar kelimeler deneyin veya doğrudan bizimle iletişime geçin',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.getSecondaryTextColor(context),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _contactSupport,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                ),
                child: const Text('Bize Ulaşın'),
              ),
            ],
          ),
        ),
      ];
    }

    return filteredCategories
        .map((category) => _buildFAQCategory(category, isDark))
        .toList();
  }

  Widget _buildFAQCategory(FAQCategory category, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: AppTheme.getCardColor(context),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: category.color.withValues(alpha: 0.2),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.3)
                : Colors.grey.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: category.color.withValues(alpha: 0.05),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: category.color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(category.emoji,
                          style: const TextStyle(fontSize: 20)),
                      const SizedBox(width: 8),
                      Icon(
                        category.icon,
                        color: category.color,
                        size: 20,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    category.title,
                    style: TextStyle(
                      color: AppTheme.getPrimaryTextColor(context),
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: category.color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${category.faqs.length}',
                    style: TextStyle(
                      color: category.color,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: category.faqs.length,
            separatorBuilder: (context, index) => Divider(
              height: 1,
              indent: 20,
              endIndent: 20,
              color: category.color.withValues(alpha: 0.1),
            ),
            itemBuilder: (context, index) {
              final faq = category.faqs[index];
              final globalIndex =
                  _faqCategories.expand((c) => c.faqs).toList().indexOf(faq);
              final isExpanded = _expandedIndex == globalIndex;

              return _buildFAQItem(
                  faq, globalIndex, isExpanded, category.color, isDark);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildFAQItem(
      FAQ faq, int index, bool isExpanded, Color categoryColor, bool isDark) {
    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        key: Key('faq_$index'),
        tilePadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        childrenPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        onExpansionChanged: (expanded) {
          setState(() {
            _expandedIndex = expanded ? index : null;
          });
        },
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: isExpanded
                ? categoryColor.withValues(alpha: 0.1)
                : Colors.grey.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Icon(
            isExpanded ? Icons.remove : Icons.add,
            color: isExpanded
                ? categoryColor
                : AppTheme.getSecondaryTextColor(context),
            size: 20,
          ),
        ),
        title: Text(
          faq.question,
          style: TextStyle(
            color: AppTheme.getPrimaryTextColor(context),
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
        trailing: Icon(
          isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
          color: AppTheme.getSecondaryTextColor(context),
        ),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: categoryColor.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              faq.answer,
              style: TextStyle(
                color: AppTheme.getSecondaryTextColor(context),
                fontSize: 14,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _contactSupport() async {
    final Uri emailUri = Uri(
      scheme: 'mailto',
      path: 'destek@okuzai.com',
      query: Uri.encodeQueryComponent(
          'subject=Okuz AI Destek Talebi&body=Merhaba,\n\nSorunum:\n\n\nCihaz Bilgileri:\n- Platform: ${Theme.of(context).platform}\n- Uygulama Sürümü: 1.0.0\n\nTeşekkürler'),
    );

    try {
      if (await canLaunchUrl(emailUri)) {
        await launchUrl(emailUri);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text(
                  'E-posta uygulaması açılamadı. Lütfen destek@okuzai.com adresine yazın.'),
              backgroundColor: AppTheme.errorColor,
              action: SnackBarAction(
                label: 'Kopyala',
                textColor: Colors.white,
                onPressed: () {
                  // Clipboard'a kopyala
                },
              ),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
                'Bir hata oluştu. Lütfen manuel olarak destek@okuzai.com adresine yazın.'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  void _openLiveChat() {
    // Canlı sohbet entegrasyonu (Intercom, Zendesk, vs.)
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.chat_bubble, color: AppTheme.successColor),
            const SizedBox(width: 8),
            const Text('Canlı Sohbet'),
          ],
        ),
        content: const Text(
          'Canlı sohbet özelliği yakında kullanıma sunulacak. '
          'Şimdilik e-posta ile bizimle iletişime geçebilirsiniz.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tamam'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _contactSupport();
            },
            child: const Text('E-posta Gönder'),
          ),
        ],
      ),
    );
  }
}

// Veri modelleri
class FAQCategory {
  final String title;
  final IconData icon;
  final Color color;
  final String emoji;
  final List<FAQ> faqs;

  FAQCategory({
    required this.title,
    required this.icon,
    required this.color,
    required this.emoji,
    required this.faqs,
  });
}

class FAQ {
  final String question;
  final String answer;

  FAQ({
    required this.question,
    required this.answer,
  });
}
