import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:okuz_ai/models/student_profile.dart';
import 'package:okuz_ai/models/user_account.dart';
import 'package:okuz_ai/models/account_type.dart';
import 'package:okuz_ai/screens/settings_screen.dart';
import 'package:okuz_ai/screens/parent_dashboard_screen.dart';
import 'package:okuz_ai/screens/realtime_monitoring_screen.dart';
import 'package:okuz_ai/screens/user_plan_screen.dart';
import 'package:okuz_ai/screens/onboarding_screen.dart';
import 'package:okuz_ai/screens/subscription_screen.dart';
import 'package:okuz_ai/services/family_account_service.dart';
import 'package:okuz_ai/services/subscription_service.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:okuz_ai/services/mock_auth_service.dart';
import 'package:okuz_ai/services/mock_database_service.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:okuz_ai/services/invite_link_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:okuz_ai/services/api_client.dart';
import 'package:okuz_ai/services/providers.dart';
import 'package:okuz_ai/screens/login_screen.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

/// Merkezi Aile Portalı - Modern ve Etkileyici Tasarım
class FamilyPortalScreen extends ConsumerStatefulWidget {
  const FamilyPortalScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<FamilyPortalScreen> createState() => _FamilyPortalScreenState();
}

class _FamilyPortalScreenState extends ConsumerState<FamilyPortalScreen>
    with TickerProviderStateMixin {
  UserAccount? _userAccount;
  bool _isLoading = true;
  String? _errorMessage;
  final TextEditingController _studentEmailController = TextEditingController();

  // Animasyon controller'larını 'late final' olarak tanımlıyoruz.
  // Bu, onların initState içinde bir kez başlatılacağını ve bir daha değiştirilmeyeceğini garanti eder.
  late final AnimationController _headerAnimationController;
  late final AnimationController _cardAnimationController;

  List<Map<String, dynamic>> _children = [];

  @override
  void initState() {
    super.initState();

    // Controller'ları, widget ağacı oluşturulmadan önce burada başlatıyoruz.
    // Bu, 'LateInitializationError' hatasını önler.
    _headerAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    _cardAnimationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    // Asenkron veri yükleme işlemi, controller'lar başlatıldıktan sonra çağrılır.
    _loadAccountData();
  }

  @override
  void dispose() {
    // Bellek sızıntılarını önlemek için controller'ları dispose ediyoruz.
    _headerAnimationController.dispose();
    _cardAnimationController.dispose();
    _studentEmailController.dispose();
    super.dispose();
  }

  Future<void> _loadAccountData() async {
    setState(() => _isLoading = true);

    try {
      // Önce SharedPreferences'dan hesap tipini kontrol et
      final prefs = await SharedPreferences.getInstance();
      final isParentAccount = prefs.getBool('is_parent_account') ?? false;
      final userName = prefs.getString('user_name') ?? 'Veli';

      if (!isParentAccount) {
        // Veli hesabı değilse login'e yönlendir
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(
              builder: (context) => const LoginScreen(accountType: 'parent')),
          (route) => false,
        );
        return;
      }

      // Gerçek API'den çocukları getir
      final apiClient = ref.read(apiClientProvider);
      final result = await apiClient.getMyChildren();

      setState(() {
        _children = List<Map<String, dynamic>>.from(result['children'] ?? []);
        _userAccount = UserAccount(
          id: 'parent_user',
          uid: 'parent_user',
          email: prefs.getString('user_email') ?? '',
          fullName: userName,
          accountType: AccountType.parent,
          studentProfiles: null,
        );
        _isLoading = false;
      });

      print('📊 Velinin çocukları yüklendi: ${_children.length} çocuk');
      for (var child in _children) {
        print('   - ${child['name']} (${child['email']})');
      }
    } catch (e) {
      print('❌ Hesap verisi yükleme hatası: $e');
      setState(() {
        _errorMessage = 'Veriler yüklenemedi: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return WillPopScope(
      onWillPop: () async {
        // Geri tuşunu engelle - kullanıcıyı login'e atma
        return false;
      },
      child: Scaffold(
        backgroundColor:
            isDark ? const Color(0xFF0F0F0F) : const Color(0xFFF8FAFC),
        body: SafeArea(
          child: _isLoading
              ? _buildModernLoadingState()
              : _errorMessage != null
                  ? _buildModernErrorState()
                  : _buildModernPortalContent(),
        ),
      ),
    );
  }

  Widget _buildModernLoadingState() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppTheme.primaryColor.withValues(alpha: 0.1),
            Theme.of(context).scaffoldBackgroundColor,
          ],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryColor.withValues(alpha: 0.2),
                    blurRadius: 40,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppTheme.primaryColor,
                          AppTheme.primaryColor.withValues(alpha: 0.7),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(
                      Icons.family_restroom_rounded,
                      color: Colors.white,
                      size: 40,
                    ),
                  )
                      .animate(onPlay: (controller) => controller.repeat())
                      .shimmer(duration: 1500.ms)
                      .scale(
                          begin: const Offset(0.8, 0.8),
                          end: const Offset(1.1, 1.1))
                      .then()
                      .scale(
                          begin: const Offset(1.1, 1.1),
                          end: const Offset(0.8, 0.8)),
                  const SizedBox(height: 24),
                  Text(
                    'Aile Portalı Yükleniyor',
                    style: GoogleFonts.figtree(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF2D3748),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Öğrenci verileriniz hazırlanıyor...',
                    style: GoogleFonts.figtree(
                      fontSize: 14,
                      color: const Color(0xFF718096),
                    ),
                  ),
                ],
              ),
            )
                .animate()
                .fadeIn(duration: 800.ms)
                .scale(begin: const Offset(0.8, 0.8)),
          ],
        ),
      ),
    );
  }

  Widget _buildModernErrorState() {
    return Container(
      padding: const EdgeInsets.all(32),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                Icons.error_outline_rounded,
                size: 64,
                color: Colors.red.shade400,
              ),
            ).animate().shake(duration: 600.ms),
            const SizedBox(height: 24),
            Text(
              'Oops! Bir Sorun Oluştu',
              style: GoogleFonts.figtree(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.headlineMedium?.color,
              ),
            ).animate().fadeIn(delay: 200.ms, curve: Curves.easeInOut),
            const SizedBox(height: 12),
            Text(
              _errorMessage ?? 'Bilinmeyen hata oluştu',
              style: GoogleFonts.figtree(
                fontSize: 16,
                color: Theme.of(context).textTheme.bodyMedium?.color,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ).animate().fadeIn(delay: 400.ms, curve: Curves.easeInOut),
            const SizedBox(height: 32),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryColor,
                    AppTheme.primaryColor.withValues(alpha: 0.8)
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryColor.withValues(alpha: 0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: ElevatedButton(
                onPressed: _loadAccountData,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  elevation: 0,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                ),
                child: Text(
                  'Tekrar Dene',
                  style: GoogleFonts.figtree(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            )
                .animate()
                .fadeIn(delay: 600.ms)
                .scale(begin: const Offset(0.8, 0.8)),
          ],
        ),
      ),
    );
  }

  Widget _buildModernPortalContent() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Animasyonları başlat
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_headerAnimationController.isDismissed) {
        _headerAnimationController.forward();
      }
      if (_cardAnimationController.isDismissed) {
        _cardAnimationController.forward();
      }
    });

    return CustomScrollView(
      slivers: [
        _buildModernAppBar(),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildWelcomeCard(),
                const SizedBox(height: 32),
                _buildQuickStatsRow(),
                const SizedBox(height: 32),
                // Öğrenci listesini gerçek verilerle göster
                _buildStudentList(),
                const SizedBox(height: 32),
                _buildQuickActionsGrid(),
                const SizedBox(height: 32),
                _buildInsightsCard(),
                const SizedBox(height: 100), // Bottom padding

                // Test Deep Link Butonu (Gerçek Davet ile)
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () async {
                    try {
                      // Önce gerçek bir davet oluştur
                      final apiClient = ref.read(apiClientProvider);
                      final hasToken = await apiClient.hasValidToken();

                      if (!hasToken) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content:
                                Text('Token bulunamadı! Önce giriş yapın.'),
                            backgroundColor: Colors.red,
                          ),
                        );
                        return;
                      }

                      // Rastgele email ile gerçek davet oluştur
                      final randomEmail =
                          'test${DateTime.now().millisecondsSinceEpoch}@example.com';
                      print('🧪 Rastgele email: $randomEmail');

                      final response =
                          await apiClient.createInvite(randomEmail, 'STUDENT');
                      final token = response['token'];
                      final inviteUrl = response['inviteUrl'];

                      print('🧪 Gerçek davet oluşturuldu: $token');
                      print('🧪 Davet URL: $inviteUrl');

                      // Test deep link
                      final testUri = Uri.parse('okuzai://invite/$token');
                      print('🧪 Test deep link: $testUri');

                      // Deep link service kaldırıldı
                      // Artık kod tabanlı davet sistemi kullanılacak

                      // Başarı mesajı göster
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Davet kodu oluşturuldu: $token'),
                          backgroundColor: Colors.green,
                          duration: const Duration(seconds: 5),
                        ),
                      );
                    } catch (e) {
                      print('❌ Test davet oluşturma hatası: $e');
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Test davet oluşturulamadı: $e'),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.purple,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('🧪 Gerçek Davet ile Test'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildModernAppBar() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SliverAppBar(
      expandedHeight: 120,
      floating: false,
      pinned: true,
      elevation: 0,
      automaticallyImplyLeading: false, // Geri tuşunu gizle
      backgroundColor: isDark ? const Color(0xFF1A1A1A) : Colors.white,
      flexibleSpace: FlexibleSpaceBar(
        titlePadding: const EdgeInsets.only(left: 24, bottom: 16),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryColor,
                    AppTheme.primaryColor.withValues(alpha: 0.7)
                  ],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.family_restroom_rounded,
                color: Colors.white,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Aile Portalı',
              style: GoogleFonts.figtree(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : const Color(0xFF2D3748),
              ),
            ),
          ],
        ).animate().fadeIn(duration: 800.ms).slideX(begin: -0.3),
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                AppTheme.primaryColor.withValues(alpha: 0.05),
                Colors.transparent,
              ],
            ),
          ),
        ),
      ),
      actions: [
        Container(
          margin: const EdgeInsets.only(right: 16),
          child: IconButton(
            onPressed: _navigateToSettings,
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.settings_rounded,
                color: AppTheme.primaryColor,
                size: 20,
              ),
            ),
            tooltip: 'Ayarlar',
          ),
        ).animate().fadeIn(delay: 400.ms).scale(begin: const Offset(0.8, 0.8)),
      ],
    );
  }

  Widget _buildWelcomeCard() {
    final userName = _userAccount?.fullName ?? 'Değerli Veli';
    final studentCount = _userAccount?.studentProfiles?.length ?? 0;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AnimatedBuilder(
      animation: _headerAnimationController,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, 50 * (1 - _headerAnimationController.value)),
          child: Opacity(
            opacity: _headerAnimationController.value,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppTheme.primaryColor,
                    AppTheme.primaryColor.withValues(alpha: 0.8),
                    AppTheme.primaryColor.withValues(alpha: 0.9),
                  ],
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryColor.withValues(alpha: 0.4),
                    blurRadius: 30,
                    offset: const Offset(0, 15),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(
                          Icons.waving_hand_rounded,
                          color: Colors.white,
                          size: 32,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Hoş Geldiniz',
                              style: GoogleFonts.figtree(
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                                color: Colors.white.withValues(alpha: 0.9),
                              ),
                            ),
                            Text(
                              userName,
                              style: GoogleFonts.figtree(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.3),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.school_rounded,
                          color: Colors.white,
                          size: 24,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          // Taşmayı önlemek için Expanded ekledim
                          child: Text(
                            '$studentCount ${studentCount == 1 ? 'Öğrenci' : 'Öğrenci'} Takip Ediliyor',
                            style: GoogleFonts.figtree(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            'Aktif',
                            style: GoogleFonts.figtree(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.primaryColor,
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
      },
    );
  }

  Widget _buildQuickStatsRow() {
    // Tüm öğrencilerin verilerini topla - StudentProfile nesnelerini kullan
    final profiles = ref.read(familyAccountNotifierProvider).studentProfiles;

    // Toplam çalışma saati
    double totalStudyHours = 0;
    for (final profile in profiles) {
      final studyStats = profile.studyStats ?? {};
      totalStudyHours +=
          (studyStats['weeklyStudyHours'] as num? ?? 0).toDouble();
    }

    // Bu haftaki çalışma saati
    double weeklyStudyHours = 0;
    for (final profile in profiles) {
      final studyStats = profile.studyStats ?? {};
      weeklyStudyHours +=
          (studyStats['weeklyStudyHours'] as num? ?? 0).toDouble();
    }

    // Ortalama performans puanı
    double averagePerformance = 0;
    int performanceCount = 0;
    for (final profile in profiles) {
      final performanceData = profile.performanceData ?? {};
      if (performanceData['averageScore'] != null) {
        averagePerformance +=
            (performanceData['averageScore'] as num).toDouble();
        performanceCount++;
      }
    }
    final averageScore = performanceCount > 0
        ? (averagePerformance / performanceCount).toStringAsFixed(1)
        : '0.0';

    return AnimatedBuilder(
      animation: _cardAnimationController,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, 30 * (1 - _cardAnimationController.value)),
          child: Opacity(
            opacity: _cardAnimationController.value,
            child: Row(
              children: [
                Expanded(
                    child: _buildStatCard(
                        'Toplam Çalışma',
                        '${totalStudyHours.toStringAsFixed(1)} Saat',
                        Icons.timer_rounded,
                        Colors.blue)),
                const SizedBox(width: 16),
                Expanded(
                    child: _buildStatCard(
                        'Bu Hafta',
                        '${weeklyStudyHours.toStringAsFixed(1)} Saat',
                        Icons.trending_up_rounded,
                        Colors.green)),
                const SizedBox(width: 16),
                Expanded(
                    child: _buildStatCard('Ortalama', '$averageScore/5',
                        Icons.star_rounded, Colors.orange)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatCard(
      String title, String value, IconData icon, Color color) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1A1A) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
        border: Border.all(
          color: color.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: GoogleFonts.figtree(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF2D3748),
            ),
            textAlign: TextAlign.center, // Kalın yazıyı ortala
          ),
          Text(
            title,
            style: GoogleFonts.figtree(
              fontSize: 12,
              color: isDark ? Colors.white70 : const Color(0xFF718096),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  // Öğrenci istatistiği kartı
  Widget _buildStudentStat(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min, // Minimum boyut kullan
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 6),
            Text(
              value,
              style: GoogleFonts.figtree(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : const Color(0xFF2D3748),
              ),
              textAlign: TextAlign.center, // Kalın yazıyı ortala
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: GoogleFonts.figtree(
                fontSize: 12,
                color: const Color(0xFF718096),
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionsGrid() {
    final actions = [
      {
        'title': 'Detaylı Rapor',
        'icon': Icons.analytics_rounded,
        'color': Colors.blue,
        'onTap': _navigateToParentDashboard
      },
      {
        'title': 'Canlı İzleme',
        'icon': Icons.remove_red_eye_rounded,
        'color': Colors.green,
        'onTap': _navigateToRealtimeMonitoring
      },
      {
        'title': 'Bildirimler',
        'icon': Icons.notifications_rounded,
        'color': Colors.orange,
        'onTap': () {}
      },
      {
        'title': 'Ayarlar',
        'icon': Icons.settings_rounded,
        'color': Colors.purple,
        'onTap': _navigateToSettings
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Hızlı Erişim',
          style: GoogleFonts.figtree(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Theme.of(context).textTheme.headlineMedium?.color,
          ),
        ).animate().fadeIn(delay: 600.ms),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 1.5,
          ),
          itemCount: actions.length,
          itemBuilder: (context, index) {
            final action = actions[index];
            return _buildQuickActionCard(
              title: action['title'] as String,
              icon: action['icon'] as IconData,
              color: action['color'] as Color,
              onTap: action['onTap'] as VoidCallback,
              index: index,
            );
          },
        ),
      ],
    );
  }

  Widget _buildInsightsCard() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Öğrenci profilleri - StudentProfile nesnelerini kullan
    final studentProfiles =
        ref.read(familyAccountNotifierProvider).studentProfiles;

    // Eğer öğrenci yoksa boş bir kart göster
    if (studentProfiles.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              const Color(0xFF667EEA).withOpacity(0.1),
              const Color(0xFF764BA2).withOpacity(0.1),
            ],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: const Color(0xFF667EEA).withOpacity(0.3),
            width: 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.lightbulb_rounded,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Text(
                  'Öneriler & İçgörüler',
                  style: GoogleFonts.figtree(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : const Color(0xFF2D3748),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildInsightItem(
              'Henüz öğrenci eklemediniz',
              Icons.person_add,
              Colors.blue,
            ),
          ],
        ),
      ).animate(delay: 1200.ms).fadeIn(duration: 800.ms).slideY(begin: 0.3);
    }

    // Öğrenci verilerinden içgörüler oluştur
    final insights = <Map<String, dynamic>>[];

    for (final student in studentProfiles) {
      // Öğrencinin performans verilerini analiz et
      final performanceData = student.performanceData;
      final studyHabits = student.studyHabits;

      if (performanceData != null &&
          performanceData['recentProgressPercentage'] != null) {
        final progress = performanceData['recentProgressPercentage'] as num;
        if (progress > 10) {
          insights.add({
            'text':
                '${student.studentName} son 2 haftada %${progress.toInt()} ilerleme kaydetti',
            'icon': Icons.trending_up_rounded,
            'color': Colors.green,
          });
        } else if (progress < 0) {
          insights.add({
            'text':
                '${student.studentName} son 2 haftada %${progress.abs().toInt()} gerileme gösterdi',
            'icon': Icons.trending_down_rounded,
            'color': Colors.red,
          });
        }
      }

      if (studyHabits != null) {
        final bestTimeOfDay = studyHabits['bestTimeOfDay'];
        if (bestTimeOfDay != null) {
          insights.add({
            'text':
                '${student.studentName} için en verimli çalışma saati: $bestTimeOfDay',
            'icon': Icons.schedule_rounded,
            'color': Colors.blue,
          });
        }

        final weakSubject = studyHabits['weakSubject'];
        if (weakSubject != null) {
          insights.add({
            'text':
                '${student.studentName} için $weakSubject konularında ek çalışma öneriliyor',
            'icon': Icons.science_rounded,
            'color': Colors.orange,
          });
        }
      }
    }

    // Eğer içgörü bulunamadıysa varsayılan içgörüler göster
    if (insights.isEmpty) {
      insights.addAll([
        {
          'text':
              'Daha fazla içgörü için öğrencilerin çalışma verilerini takip edin',
          'icon': Icons.insights,
          'color': Colors.purple,
        },
        {
          'text': 'Öğrencilerinizin günlük çalışma hedeflerini kontrol edin',
          'icon': Icons.calendar_today,
          'color': Colors.teal,
        },
      ]);
    }

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF667EEA).withOpacity(0.1),
            const Color(0xFF764BA2).withOpacity(0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF667EEA).withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.lightbulb_rounded,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Text(
                'Öneriler & İçgörüler',
                style: GoogleFonts.figtree(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : const Color(0xFF2D3748),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Maksimum 3 içgörü göster
          ...insights.take(3).map((insight) => _buildInsightItem(
                insight['text'],
                insight['icon'],
                insight['color'],
              )),
        ],
      ),
    ).animate(delay: 1200.ms).fadeIn(duration: 800.ms).slideY(begin: 0.3);
  }

  // Öğrenci listesini gerçek verilerle oluştur
  Widget _buildStudentList() {
    if (_children.isEmpty) {
      return _buildEmptyStudentsCard();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Çocuklarım',
              style: GoogleFonts.figtree(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.headlineMedium?.color,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${_children.length} Çocuk',
                style: GoogleFonts.figtree(
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primaryColor,
                ),
              ),
            ),
          ],
        ).animate().fadeIn(delay: 200.ms),
        const SizedBox(height: 16),
        ..._children.asMap().entries.map((entry) {
          final index = entry.key;
          final child = entry.value;
          return _buildChildCard(child, index);
        }).toList(),
      ],
    );
  }

  Widget _buildEmptyStudentsCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? const Color(0xFF1A1A1A)
            : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.2),
          width: 2,
          style: BorderStyle.solid,
        ),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              Icons.school_rounded,
              size: 48,
              color: AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Henüz Öğrenci Eklenmemiş',
            style: GoogleFonts.figtree(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).textTheme.headlineMedium?.color,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Çocuğunuzun eğitim sürecini takip etmek için bir öğrenci profili ekleyin',
            style: GoogleFonts.figtree(
              fontSize: 14,
              color: Theme.of(context).textTheme.bodyMedium?.color,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.primaryColor,
                  AppTheme.primaryColor.withValues(alpha: 0.8)
                ],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: ElevatedButton.icon(
              onPressed: _addNewStudent,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                elevation: 0,
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
              icon: const Icon(Icons.add_rounded, color: Colors.white),
              label: Text(
                'İlk Öğrenciyi Ekle',
                style: GoogleFonts.figtree(
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 400.ms).scale(begin: const Offset(0.9, 0.9));
  }

  Widget _buildChildCard(Map<String, dynamic> child, int index) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Çocuk verilerini al
    final studentProfile = child['studentProfile'] as Map<String, dynamic>?;
    final lastActiveText = 'Son giriş: Dün';
    final grade = studentProfile?['grade']?.toString() ?? '?';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1A1A) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.1),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: () => _navigateToStudentPlan(child),
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                // Avatar
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppTheme.primaryColor,
                        AppTheme.accentColor,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Center(
                    child: Text(
                      (child['name'] as String? ?? '?').isNotEmpty
                          ? (child['name'] as String)[0].toUpperCase()
                          : '?',
                      style: GoogleFonts.figtree(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                // Çocuk bilgileri
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        child['name'] ?? 'İsimsiz',
                        style: GoogleFonts.figtree(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$grade. Sınıf • $lastActiveText',
                        style: GoogleFonts.figtree(
                          fontSize: 14,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 12),
                      // İstatistikler
                      Row(
                        children: [
                          _buildStudentStat(
                            'Başarı',
                            '85%',
                            Icons.trending_up_rounded,
                            Colors.green,
                          ),
                          const SizedBox(width: 16),
                          _buildStudentStat(
                            'Çalışma',
                            '12 saat',
                            Icons.access_time_rounded,
                            Colors.blue,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Ok ikonu
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.arrow_forward_ios_rounded,
                    color: AppTheme.primaryColor,
                    size: 16,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ).animate(delay: Duration(milliseconds: index * 100)).slideX(
          begin: 1,
          duration: 600.ms,
          curve: Curves.easeOutCubic,
        );
  }

  Widget _buildInsightItem(String text, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: Theme.of(context).textTheme.bodyMedium?.color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionCard({
    required String title,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    required int index,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1A1A) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(12), // Padding'i küçülttüm
            child: Column(
              mainAxisSize: MainAxisSize.min, // Minimum boyut kullan
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding:
                      const EdgeInsets.all(12), // Icon container'ı küçülttüm
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon,
                      color: color, size: 24), // Icon boyutunu küçülttüm
                ),
                const SizedBox(height: 8), // Boşluğu azalttım
                Flexible(
                  // Flexible ile sararak taşmayı engelliyorum
                  child: Text(
                    title,
                    style: GoogleFonts.figtree(
                      fontSize: 12, // Font boyutunu küçülttüm
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : const Color(0xFF2D3748),
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 2, // Maksimum 2 satır
                    overflow: TextOverflow.ellipsis, // Taşarsa üç nokta koy
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    )
        .animate(delay: Duration(milliseconds: 800 + (index * 100)))
        .fadeIn(duration: 600.ms)
        .scale(begin: const Offset(0.8, 0.8));
  }

  // Navigation methods
  void _navigateToSettings() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const SettingsScreen()),
    );
  }

  void _navigateToParentDashboard() {
    // FamilyAccountService'den öğrenci profillerini al
    final studentProfiles =
        ref.read(familyAccountNotifierProvider).studentProfiles;
    if (studentProfiles.isNotEmpty) {
      final student = studentProfiles.first;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ParentDashboardScreen(
            profileId: student.id,
            profileName: student.studentName,
          ),
        ),
      );
    }
  }

  void _navigateToRealtimeMonitoring() {
    // FamilyAccountService'den öğrenci profillerini al
    final studentProfiles =
        ref.read(familyAccountNotifierProvider).studentProfiles;
    if (studentProfiles.isNotEmpty) {
      final student = studentProfiles.first;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => RealtimeMonitoringScreen(
            profileId: student.id,
            profileName: student.studentName,
          ),
        ),
      );
    }
  }

  void _navigateToStudentPlan(dynamic studentRef) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const UserPlanScreen(),
      ),
    );
  }

  void _addNewStudent() {
    // Öğrenci sayısını kontrol et
    final studentCount = _userAccount?.studentProfiles?.length ?? 0;

    // Premium olmayan kullanıcılar için öğrenci sayısı kontrolü
    if (studentCount >= 1) {
      _checkPremiumForMultipleStudents();
      return;
    }

    // Öğrenci ekleme işlemi için dialog göster
    showDialog(
      context: context,
      builder: (context) => _buildInviteStudentDialog(),
    );
  }

  // Öğrenci davet dialogu
  Widget _buildInviteStudentDialog() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AlertDialog(
      backgroundColor: isDark ? const Color(0xFF1A1A1A) : Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Column(
        children: [
          Icon(
            Icons.person_add_rounded,
            size: 48,
            color: AppTheme.primaryColor,
          ),
          const SizedBox(height: 16),
          Text(
            'Öğrenci Davet Et',
            style: GoogleFonts.figtree(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF2D3748),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Öğrencinizi uygulamaya davet etmek için email adresini girin ve bağlantı oluşturun.',
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: isDark ? Colors.white70 : const Color(0xFF4A5568),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _studentEmailController,
              decoration: InputDecoration(
                labelText: 'Öğrenci Email Adresi',
                hintText: 'ornek@email.com',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                prefixIcon: const Icon(Icons.email_outlined),
              ),
              keyboardType: TextInputType.emailAddress,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Email adresi gereklidir';
                }
                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                    .hasMatch(value)) {
                  return 'Geçerli bir email adresi girin';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppTheme.primaryColor.withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        size: 16,
                        color: AppTheme.primaryColor,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Nasıl Çalışır?',
                        style: GoogleFonts.figtree(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color:
                              isDark ? Colors.white : const Color(0xFF2D3748),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '1. Davet bağlantısı oluştur\n2. Bağlantıyı öğrencinle paylaş\n3. Öğrencin kendi hesabını oluşturur\n4. Öğrencin otomatik olarak senin hesabına bağlanır',
                    style: GoogleFonts.figtree(
                      fontSize: 12,
                      color: isDark ? Colors.white70 : const Color(0xFF4A5568),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(
            'İptal',
            style: GoogleFonts.figtree(
              color: isDark ? Colors.white70 : const Color(0xFF718096),
            ),
          ),
        ),
        ElevatedButton(
          onPressed: () {
            // Form validation
            if (_studentEmailController.text.isEmpty) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Lütfen öğrenci email adresini girin'),
                  backgroundColor: Colors.red,
                ),
              );
              return;
            }

            if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                .hasMatch(_studentEmailController.text)) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Lütfen geçerli bir email adresi girin'),
                  backgroundColor: Colors.red,
                ),
              );
              return;
            }

            Navigator.pop(context);
            _shareStudentInviteLink();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: Text(
            'Davet Bağlantısı Oluştur',
            style: GoogleFonts.figtree(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  // Davet bağlantısını paylaş
  Future<void> _shareStudentInviteLink() async {
    try {
      // Email validasyonu
      if (_studentEmailController.text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lütfen öğrenci email adresini girin'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
          .hasMatch(_studentEmailController.text)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lütfen geçerli bir email adresi girin'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      setState(() => _isLoading = true);

      // Kullanıcının giriş yapmış olup olmadığını kontrol et
      final apiClient = ref.read(apiClientProvider);
      final hasToken = await apiClient.hasValidToken();

      if (!hasToken) {
        // Kullanıcı giriş yapmamış, dialog göster
        if (mounted) {
          setState(() => _isLoading = false);
          _showLoginRequiredDialog();
          return;
        }
      }

      // API'den direkt davet oluştur
      final response =
          await apiClient.createInvite(_studentEmailController.text, 'STUDENT');
      final inviteUrl = response['inviteUrl'];

      if (inviteUrl != null) {
        // Paylaşım mesajı
        const String message =
            'Okuz.ai uygulamasına davet edildim! Öğrenci hesabını oluşturmak için bu bağlantıyı kullan:';

        // Bağlantıyı paylaş
        await Share.share('$message\n\n$inviteUrl');

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Davet bağlantısı paylaşıldı'),
              backgroundColor: AppTheme.primaryColor,
            ),
          );
        }
      } else {
        throw Exception('Davet bağlantısı oluşturulamadı');
      }
    } catch (e) {
      if (mounted) {
        String errorMessage = 'Bir hata oluştu';

        // Hata mesajını daha anlaşılır hale getir
        if (e.toString().contains('giriş yapmalısınız') ||
            e.toString().contains('JWT token')) {
          errorMessage = 'Davet oluşturmak için giriş yapmalısınız';
        } else if (e.toString().contains('500')) {
          errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin';
        } else if (e.toString().contains('timeout')) {
          errorMessage = 'Bağlantı zaman aşımına uğradı';
        } else if (e.toString().contains('already exists')) {
          errorMessage = 'Bu email adresi için zaten aktif bir davet var';
        } else {
          errorMessage = 'Davet oluşturulamadı: ${e.toString()}';
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
            action: SnackBarAction(
              label: 'Tamam',
              textColor: Colors.white,
              onPressed: () {},
            ),
          ),
        );
        print('❌ Davet bağlantısı paylaşma hatası: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  // Giriş yapma gerekliliği dialogu
  void _showLoginRequiredDialog() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF1A1A1A) : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Column(
          children: [
            Icon(
              Icons.login_rounded,
              size: 48,
              color: AppTheme.primaryColor,
            ),
            const SizedBox(height: 16),
            Text(
              'Giriş Yapmanız Gerekiyor',
              style: GoogleFonts.figtree(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : const Color(0xFF2D3748),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Davet bağlantısı oluşturmak için önce giriş yapmanız gerekmektedir.',
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: isDark ? Colors.white70 : const Color(0xFF4A5568),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppTheme.primaryColor.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 20,
                    color: AppTheme.primaryColor,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Giriş yaptıktan sonra davet bağlantısı oluşturabilirsiniz.',
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                        color: isDark ? Colors.white : const Color(0xFF2D3748),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'İptal',
              style: GoogleFonts.figtree(
                color: isDark ? Colors.white70 : const Color(0xFF718096),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Giriş ekranına yönlendir
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) =>
                        const LoginScreen(accountType: 'parent')),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'Giriş Yap',
              style: GoogleFonts.figtree(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  // Premium kontrolü
  Future<void> _checkPremiumForMultipleStudents() async {
    try {
      setState(() => _isLoading = true);

      final apiClient = ref.read(apiClientProvider);
      final subscriptionService = SubscriptionService(apiClient);
      final isPremium = await subscriptionService.checkPremiumAccess();

      if (mounted) {
        setState(() => _isLoading = false);

        if (isPremium) {
          // Premium kullanıcı - öğrenci eklemesine izin ver
          showDialog(
            context: context,
            builder: (context) => _buildAddStudentDialog(),
          );
        } else {
          // Premium değil - premium gerekli dialogu göster
          _showPremiumRequiredDialog();
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Hata: ${e.toString()}')),
        );
      }
    }
  }

  // Premium gerekli dialogu
  void _showPremiumRequiredDialog() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF1A1A1A) : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Column(
          children: [
            Icon(
              Icons.workspace_premium,
              size: 48,
              color: Colors.amber,
            ),
            const SizedBox(height: 16),
            Text(
              'Premium Gerekli',
              style: GoogleFonts.figtree(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : const Color(0xFF2D3748),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Birden fazla öğrenci eklemek için premium abonelik gereklidir.',
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: isDark ? Colors.white70 : const Color(0xFF4A5568),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.amber.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Colors.amber.withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                children: [
                  Text(
                    'Premium Avantajları',
                    style: GoogleFonts.figtree(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : const Color(0xFF2D3748),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildPremiumFeature('Sınırsız öğrenci ekleme'),
                  _buildPremiumFeature('Gelişmiş analiz ve raporlar'),
                  _buildPremiumFeature('Özel çalışma planları'),
                  _buildPremiumFeature('Öncelikli destek'),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Vazgeç',
              style: GoogleFonts.figtree(
                color: isDark ? Colors.white70 : const Color(0xFF718096),
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Abonelik ekranına yönlendir
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) => const SubscriptionScreen()),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.amber,
              foregroundColor: Colors.black87,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'Premium Ol',
              style: GoogleFonts.figtree(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  // Premium özellik gösterimi
  Widget _buildPremiumFeature(String feature) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          const Icon(
            Icons.check_circle_rounded,
            color: Colors.amber,
            size: 18,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              feature,
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: Theme.of(context).textTheme.bodyMedium?.color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Öğrenci ekleme dialogu
  Widget _buildAddStudentDialog() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final TextEditingController nameController =
        TextEditingController(text: "Yeni Öğrenci");
    final TextEditingController gradeController =
        TextEditingController(text: "9");

    return AlertDialog(
      backgroundColor: isDark ? const Color(0xFF1A1A1A) : Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Column(
        children: [
          Icon(
            Icons.school_rounded,
            size: 48,
            color: AppTheme.primaryColor,
          ),
          const SizedBox(height: 16),
          Text(
            'Yeni Öğrenci Ekle',
            style: GoogleFonts.figtree(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF2D3748),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Öğrenciniz için yeni bir profil oluşturun. Bu profil sizin veli hesabınıza bağlı olacaktır.',
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: isDark ? Colors.white70 : const Color(0xFF4A5568),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            TextField(
              controller: nameController,
              decoration: InputDecoration(
                labelText: 'Öğrenci Adı',
                hintText: 'Öğrencinin adını girin',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                prefixIcon: const Icon(Icons.person_outline),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: gradeController,
              decoration: InputDecoration(
                labelText: 'Sınıf',
                hintText: 'Öğrencinin sınıfını girin (örn: 9)',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                prefixIcon: const Icon(Icons.school_outlined),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? Colors.black12 : const Color(0xFFF7FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark ? Colors.white24 : const Color(0xFFE2E8F0),
                ),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        size: 16,
                        color:
                            isDark ? Colors.white70 : const Color(0xFF718096),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Önemli Bilgi',
                          style: GoogleFonts.figtree(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color:
                                isDark ? Colors.white : const Color(0xFF2D3748),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'İkinci veya daha fazla öğrenci eklemek için premium abonelik gereklidir. İlk öğrenci ücretsiz olarak eklenebilir.',
                    style: GoogleFonts.figtree(
                      fontSize: 12,
                      color: isDark ? Colors.white70 : const Color(0xFF4A5568),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Profil oluşturduktan sonra onboarding sürecinde öğrenci bilgilerini daha detaylı olarak güncelleyebilirsiniz.',
              style: GoogleFonts.figtree(
                fontSize: 12,
                color: isDark ? Colors.white70 : const Color(0xFF718096),
                fontStyle: FontStyle.italic,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(
            'İptal',
            style: GoogleFonts.figtree(
              color: isDark ? Colors.white70 : const Color(0xFF718096),
            ),
          ),
        ),
        ElevatedButton(
          onPressed: () {
            // Formu kontrol et
            if (nameController.text.isEmpty) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Lütfen öğrenci adını girin')),
              );
              return;
            }

            // Dialog'u kapat
            Navigator.pop(context);

            // Yeni öğrenci profili oluştur
            _createStudentAccount(
              name: nameController.text.trim(),
              grade: gradeController.text.trim(),
            );
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: Text(
            'Profil Oluştur',
            style: GoogleFonts.figtree(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  // Yeni öğrenci hesabı oluştur
  Future<void> _createStudentAccount({
    required String name,
    required String grade,
  }) async {
    try {
      setState(() => _isLoading = true);

      // Mevcut kullanıcı bilgilerini kaydet
      final currentUser = MockAuthService.instance.currentUser;
      if (currentUser == null) {
        throw Exception('Oturum açık değil');
      }

      // Mock implementation - Firebase yerine basit mock
      final newProfileId = DateTime.now().millisecondsSinceEpoch.toString();

      // Mock profile data
      final profileData = {
        'profileId': newProfileId,
        'profileName': name,
        'grade': grade,
        'academicTrack': 'sayisal',
        'targetExam': 'YKS',
        'learningStyle': 'visual',
        'preferredStudyTimes': ['afternoon'],
        'studyDays': [1, 2, 3, 4, 5],
        'dailyHours': 2,
        'preferredSessionDuration': 45,
        'isActive': true,
        'createdAt': DateTime.now().toIso8601String(),
      };

      // Mock implementation - no actual database operations
      print('Mock: Student profile created with ID: $newProfileId');

      // Hesap verilerini yeniden yükle
      await _loadAccountData();

      // Başarı mesajı göster
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Öğrenci profili başarıyla oluşturuldu')),
        );

        // Öğrenci onboarding ekranını göster
        _showStudentOnboardingDialog(newProfileId);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Hata: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  // Öğrenci onboarding bilgilendirme dialogu
  void _showStudentOnboardingDialog(String profileId) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF1A1A1A) : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Column(
          children: [
            Icon(
              Icons.school_rounded,
              size: 48,
              color: AppTheme.primaryColor,
            ),
            const SizedBox(height: 16),
            Text(
              'Öğrenci Profili Oluşturuldu',
              style: GoogleFonts.figtree(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : const Color(0xFF2D3748),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Yeni öğrenci profili başarıyla oluşturuldu. Şimdi öğrenci bilgilerini güncellemek için onboarding sürecini tamamlayabilirsiniz.',
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: isDark ? Colors.white70 : const Color(0xFF4A5568),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppTheme.primaryColor.withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        size: 16,
                        color: AppTheme.primaryColor,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Önemli Bilgi',
                          style: GoogleFonts.figtree(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color:
                                isDark ? Colors.white : const Color(0xFF2D3748),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Onboarding sürecinde öğrencinizin bilgilerini (sınıf, hedef, çalışma alışkanlıkları vb.) güncelleyebilirsiniz.',
                    style: GoogleFonts.figtree(
                      fontSize: 12,
                      color: isDark ? Colors.white70 : const Color(0xFF4A5568),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Öğrenci onboarding ekranına yönlendir
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => OnboardingScreen(
                    isStudentAccount: true,
                    initialAccountType: AccountType.student,
                  ),
                ),
              ).then((_) => _loadAccountData());
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'Onboarding\'e Başla',
              style: GoogleFonts.figtree(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
