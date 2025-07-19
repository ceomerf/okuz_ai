import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lottie/lottie.dart';
import 'package:okuz_ai/screens/user_plan_screen.dart';
import 'package:okuz_ai/screens/family_portal_screen.dart';
import 'package:okuz_ai/services/family_account_service.dart';
import 'package:okuz_ai/models/student_profile.dart'; // AccountType için
import 'package:provider/provider.dart';
import 'dart:async';

class PlanGenerationStatusScreen extends StatefulWidget {
  final String? profileId; // Aile hesabı için

  const PlanGenerationStatusScreen({
    Key? key,
    this.profileId,
  }) : super(key: key);

  @override
  State<PlanGenerationStatusScreen> createState() =>
      _PlanGenerationStatusScreenState();
}

class _PlanGenerationStatusScreenState extends State<PlanGenerationStatusScreen>
    with TickerProviderStateMixin {
  // Animation controllers
  late AnimationController _mainAnimationController;
  late AnimationController _pulseController;
  late AnimationController _backgroundController;

  // Animations
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;
  late Animation<double> _pulseAnimation;
  late Animation<Color?> _backgroundColorAnimation;

  // Stream subscription
  StreamSubscription<DocumentSnapshot>? _queueSubscription;

  // Current status
  String _currentStatus = 'pending';
  int? _queuePosition;
  String? _errorMessage;
  bool _isNavigating = false;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _startListeningToQueue();
  }

  void _setupAnimations() {
    // Ana animasyon controller'ı
    _mainAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    // Nabız animasyonu için
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );

    // Arka plan animasyonu için
    _backgroundController = AnimationController(
      duration: const Duration(seconds: 8),
      vsync: this,
    );

    // Fade in animasyonu
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _mainAnimationController,
      curve: Curves.easeOutCubic,
    ));

    // Scale animasyonu
    _scaleAnimation = Tween<double>(
      begin: 0.8,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _mainAnimationController,
      curve: Curves.elasticOut,
    ));

    // Nabız animasyonu
    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.1,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));

    // Arka plan renk geçişi
    _backgroundColorAnimation = ColorTween(
      begin: const Color(0xFF6366F1),
      end: const Color(0xFF8B5CF6),
    ).animate(_backgroundController);

    // Animasyonları başlat
    _mainAnimationController.forward();
    _pulseController.repeat(reverse: true);
    _backgroundController.repeat(reverse: true);
  }

  void _startListeningToQueue() {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      _handleError('Kullanıcı oturum açmamış');
      return;
    }

    // Queue dökümanını dinle
    _queueSubscription = FirebaseFirestore.instance
        .doc('planGenerationQueue/${user.uid}')
        .snapshots()
        .listen(
          _handleQueueUpdate,
          onError: _handleError,
        );
  }

  void _handleQueueUpdate(DocumentSnapshot snapshot) {
    if (!mounted || _isNavigating) return;

    if (!snapshot.exists) {
      // Queue kayıtı yoksa hata
      _handleError('Plan oluşturma talebi bulunamadı');
      return;
    }

    final data = snapshot.data() as Map<String, dynamic>;
    final status = data['status'] as String? ?? 'pending';
    final position = data['queuePosition'] as int?;
    final errorMessage = data['errorMessage'] as String?;

    setState(() {
      _currentStatus = status;
      _queuePosition = position;
      _errorMessage = errorMessage;
    });

    // Status değişikliklerine göre aksiyon al
    _handleStatusChange(status);
  }

  void _handleStatusChange(String status) {
    switch (status) {
      case 'completed':
        // Plan tamamlandı - 2 saniye bekle sonra yönlendir
        _showCompletionCelebration();
        Timer(const Duration(seconds: 2), _navigateToNextScreen);
        break;

      case 'failed':
        // Hata durumu - kullanıcıya feedback ver
        _showErrorFeedback();
        break;

      case 'processing':
        // İşleniyor - animasyonu güncelle
        _updateAnimationForProcessing();
        break;
    }
  }

  void _showCompletionCelebration() {
    HapticFeedback.mediumImpact();
    // Burada konfeti animasyonu veya başka celebration effect'ler eklenebilir
  }

  void _showErrorFeedback() {
    HapticFeedback.lightImpact();
    // Hata için özel animasyon veya effect
  }

  void _updateAnimationForProcessing() {
    // Processing durumu için animasyonları hızlandır
    _pulseController.duration = const Duration(milliseconds: 1500);
  }

  Future<void> _navigateToNextScreen() async {
    if (_isNavigating) return;
    _isNavigating = true;

    try {
      // Hesap tipini kontrol et ve uygun ekrana yönlendir
      final familyService = context.read<FamilyAccountService>();
      await familyService.loadAccountData();
      final accountType = familyService.accountType;

      if (!mounted) return;

      if (accountType == AccountType.parent) {
        // Veli hesabı - Family Portal'a git
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const FamilyPortalScreen()),
          (Route<dynamic> route) => false,
        );
      } else {
        // Öğrenci hesabı - User Plan Screen'e git
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const UserPlanScreen()),
          (Route<dynamic> route) => false,
        );
      }
    } catch (e) {
      // Hata durumunda varsayılan olarak UserPlanScreen'e git
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const UserPlanScreen()),
          (Route<dynamic> route) => false,
        );
      }
    }
  }

  void _handleError(dynamic error) {
    print('Queue listening error: $error');
    if (mounted) {
      setState(() {
        _currentStatus = 'failed';
        _errorMessage = error.toString();
      });
    }
  }

  @override
  void dispose() {
    _mainAnimationController.dispose();
    _pulseController.dispose();
    _backgroundController.dispose();
    _queueSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: AnimatedBuilder(
        animation: _backgroundColorAnimation,
        builder: (context, child) {
          return Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  _backgroundColorAnimation.value ?? const Color(0xFF6366F1),
                  const Color(0xFF8B5CF6),
                  const Color(0xFFEC4899),
                ],
              ),
            ),
            child: SafeArea(
              child: FadeTransition(
                opacity: _fadeAnimation,
                child: ScaleTransition(
                  scale: _scaleAnimation,
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Ana animasyon alanı
                        Expanded(
                          flex: 3,
                          child: _buildMainAnimation(),
                        ),

                        // Durum metni alanı
                        Expanded(
                          flex: 2,
                          child: _buildStatusContent(),
                        ),

                        // Alt buton alanı (completed durumunda)
                        if (_currentStatus == 'completed')
                          _buildCompletedButton(),

                        // Hata durumunda retry butonu
                        if (_currentStatus == 'failed') _buildRetryButton(),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildMainAnimation() {
    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _pulseAnimation.value,
          child: _getAnimationForStatus(),
        );
      },
    );
  }

  Widget _getAnimationForStatus() {
    switch (_currentStatus) {
      case 'pending':
        return _buildPendingAnimation();
      case 'processing':
        return _buildProcessingAnimation();
      case 'completed':
        return _buildCompletedAnimation();
      case 'failed':
        return _buildFailedAnimation();
      default:
        return _buildPendingAnimation();
    }
  }

  Widget _buildPendingAnimation() {
    return Container(
      width: 200,
      height: 200,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withOpacity(0.2),
        border: Border.all(
          color: Colors.white.withOpacity(0.3),
          width: 2,
        ),
      ),
      child: const Icon(
        Icons.hourglass_empty,
        size: 80,
        color: Colors.white,
      ),
    )
        .animate(onPlay: (controller) => controller.repeat())
        .shimmer(duration: 2000.ms, color: Colors.white.withOpacity(0.5));
  }

  Widget _buildProcessingAnimation() {
    return Container(
      width: 200,
      height: 200,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withOpacity(0.2),
        border: Border.all(
          color: Colors.white.withOpacity(0.3),
          width: 2,
        ),
      ),
      child: const Icon(
        Icons.auto_awesome,
        size: 80,
        color: Colors.white,
      ),
    )
        .animate(onPlay: (controller) => controller.repeat())
        .rotate(duration: 3000.ms);
  }

  Widget _buildCompletedAnimation() {
    return Container(
      width: 200,
      height: 200,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.green.withOpacity(0.2),
        border: Border.all(
          color: Colors.green.withOpacity(0.5),
          width: 3,
        ),
      ),
      child: const Icon(
        Icons.check_circle,
        size: 80,
        color: Colors.white,
      ),
    )
        .animate()
        .scale(delay: 200.ms, duration: 600.ms, curve: Curves.elasticOut)
        .then()
        .shimmer(duration: 1000.ms, color: Colors.green.withOpacity(0.5));
  }

  Widget _buildFailedAnimation() {
    return Container(
      width: 200,
      height: 200,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.red.withOpacity(0.2),
        border: Border.all(
          color: Colors.red.withOpacity(0.5),
          width: 3,
        ),
      ),
      child: const Icon(
        Icons.error_outline,
        size: 80,
        color: Colors.white,
      ),
    ).animate().shake(delay: 200.ms, duration: 600.ms);
  }

  Widget _buildStatusContent() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Ana başlık
        Text(
          _getStatusTitle(),
          style: GoogleFonts.figtree(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
          textAlign: TextAlign.center,
        )
            .animate()
            .fadeIn(delay: 500.ms, duration: 800.ms)
            .slideY(begin: 0.3, end: 0),

        const SizedBox(height: 16),

        // Alt metin
        Text(
          _getStatusDescription(),
          style: GoogleFonts.figtree(
            fontSize: 16,
            color: Colors.white.withOpacity(0.9),
            height: 1.5,
          ),
          textAlign: TextAlign.center,
        )
            .animate()
            .fadeIn(delay: 700.ms, duration: 800.ms)
            .slideY(begin: 0.3, end: 0),

        // Sıra pozisyonu (pending durumunda)
        if (_currentStatus == 'pending' && _queuePosition != null) ...[
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(25),
              border: Border.all(
                color: Colors.white.withOpacity(0.3),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.queue,
                  color: Colors.white,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  'Sıradaki Pozisyon: ${_queuePosition}',
                  style: GoogleFonts.figtree(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(delay: 900.ms, duration: 800.ms).scale(
              begin: const Offset(0.8, 0.8), end: const Offset(1.0, 1.0)),
        ],
      ],
    );
  }

  Widget _buildCompletedButton() {
    return Container(
      width: double.infinity,
      height: 56,
      margin: const EdgeInsets.only(top: 32),
      child: ElevatedButton.icon(
        onPressed: _navigateToNextScreen,
        icon: const Icon(Icons.arrow_forward, color: Colors.white),
        label: Text(
          'Hemen Keşfet',
          style: GoogleFonts.figtree(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.green,
          elevation: 8,
          shadowColor: Colors.green.withOpacity(0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(delay: 1000.ms, duration: 800.ms)
        .slideY(begin: 0.5, end: 0)
        .shimmer(delay: 1500.ms, duration: 2000.ms);
  }

  Widget _buildRetryButton() {
    return Container(
      width: double.infinity,
      height: 56,
      margin: const EdgeInsets.only(top: 32),
      child: ElevatedButton.icon(
        onPressed: () {
          // Retry logic - kullanıcıyı plan oluşturma ekranına yönlendir
          Navigator.of(context).pop();
        },
        icon: const Icon(Icons.refresh, color: Colors.white),
        label: Text(
          'Tekrar Dene',
          style: GoogleFonts.figtree(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.red.withOpacity(0.8),
          elevation: 8,
          shadowColor: Colors.red.withOpacity(0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(delay: 1000.ms, duration: 800.ms)
        .slideY(begin: 0.5, end: 0);
  }

  String _getStatusTitle() {
    switch (_currentStatus) {
      case 'pending':
        return 'AI Koçun Hazırlanıyor';
      case 'processing':
        return 'Planın Oluşturuluyor';
      case 'completed':
        return 'Planın Hazır! ✨';
      case 'failed':
        return 'Bir Sorun Oluştu';
      default:
        return 'Yükleniyor...';
    }
  }

  String _getStatusDescription() {
    switch (_currentStatus) {
      case 'pending':
        if (_queuePosition != null) {
          if (_queuePosition == 1) {
            return 'Harika! AI Koçun senin için çalışmaya hazırlanıyor.\nSıra neredeyse sende!';
          } else {
            return 'Harika! AI Koçun senin için çalışmaya hazırlanıyor.\nSırada bekleyen ${_queuePosition} kişi var.\nBu genellikle birkaç dakika sürer.';
          }
        }
        return 'AI Koçun senin için çalışmaya hazırlanıyor.\nBu genellikle birkaç dakika sürer.';

      case 'processing':
        return 'Sıra sana geldi! 🎯\n\nAI Koçun, kişisel yol haritanı şu anda oluşturuyor...\nBu en heyecanlı kısım!';

      case 'completed':
        return 'Kişiselleştirilmiş çalışma planın hazır!\nŞimdi başarıya giden yolculuğuna başlayabilirsin.';

      case 'failed':
        return _errorMessage ??
            'Plan oluşturulurken bir hata oluştu.\nLütfen tekrar deneyiniz.';

      default:
        return 'Planın hazırlanıyor...';
    }
  }
}
