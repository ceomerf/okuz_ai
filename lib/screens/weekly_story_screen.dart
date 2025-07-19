import 'package:flutter/material.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:provider/provider.dart';
import '../providers/study_data_provider.dart';
import '../theme/app_theme.dart';

class WeeklyStoryScreen extends StatefulWidget {
  final int weekOffset;

  const WeeklyStoryScreen({
    Key? key,
    this.weekOffset = 0,
  }) : super(key: key);

  @override
  State<WeeklyStoryScreen> createState() => _WeeklyStoryScreenState();
}

class _WeeklyStoryScreenState extends State<WeeklyStoryScreen>
    with TickerProviderStateMixin {
  Map<String, dynamic>? _weeklyStory;
  bool _isLoading = true;
  String? _error;
  String? _detailedError;

  late PageController _pageController;
  late AnimationController _progressController;
  late AnimationController _fadeController;

  int _currentMomentIndex = 0;
  List<Map<String, dynamic>> _storyMoments = [];

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _progressController = AnimationController(
      duration: Duration(seconds: 4),
      vsync: this,
    );
    _fadeController = AnimationController(
      duration: Duration(milliseconds: 500),
      vsync: this,
    );

    _loadWeeklyStory();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _progressController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  Future<void> _loadWeeklyStory() async {
    try {
      print('🔄 Haftalık hikaye yüklenmeye başlıyor...');

      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        print('❌ Kullanıcı giriş yapmamış');
        _showError('Giriş yapmanız gerekiyor', 'Lütfen önce giriş yapın');
        return;
      }

      print('👤 Kullanıcı ID: ${user.uid}');
      print('📅 Hafta offset: ${widget.weekOffset}');

      // Timeout ile Firebase Functions çağrısı
      final callable =
          FirebaseFunctions.instance.httpsCallable('generateWeeklyStory');

      final result = await callable.call({
        'userId': user.uid,
        'weekOffset': widget.weekOffset,
      }).timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw Exception('İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.');
        },
      );

      print('📦 Firebase Functions yanıtı alındı');
      print('✅ Success: ${result.data['success']}');

      if (result.data['success'] == true && result.data['story'] != null) {
        setState(() {
          _weeklyStory = Map<String, dynamic>.from(result.data['story']);
          _isLoading = false;
          _error = null;
          _detailedError = null;
        });

        print('📖 Hikaye verisi alındı, momentler hazırlanıyor...');
        _prepareStoryMoments();
        _startStoryProgress();

        print('🎯 Hikaye başarıyla yüklendi ve oynatılıyor');
      } else {
        final errorMsg = result.data['error'] ?? 'Bilinmeyen hata';
        print('❌ Firebase Functions hatası: $errorMsg');
        _showError('Hikaye oluşturulamadı', 'Sunucu hatası: $errorMsg');
      }
    } on FirebaseFunctionsException catch (e) {
      print('🔥 Firebase Functions Exception: ${e.code} - ${e.message}');
      String userFriendlyMessage = _getFriendlyErrorMessage(e.code);
      _showError(
          'Firebase Hatası', '$userFriendlyMessage\n\nHata kodu: ${e.code}');
    } on Exception catch (e) {
      print('⚠️ Genel hata: $e');
      _showError('Bağlantı Hatası', e.toString());
    } catch (e) {
      print('🚨 Beklenmedik hata: $e');
      _showError('Bilinmeyen Hata', 'Beklenmedik bir hata oluştu: $e');
    }
  }

  void _showError(String title, String details) {
    setState(() {
      _error = title;
      _detailedError = details;
      _isLoading = false;
    });

    // Fallback hikaye oluştur
    _createFallbackStory();
  }

  String _getFriendlyErrorMessage(String code) {
    switch (code) {
      case 'unauthenticated':
        return 'Giriş yapmanız gerekiyor';
      case 'permission-denied':
        return 'Bu işlemi gerçekleştirme yetkiniz yok';
      case 'not-found':
        return 'Hikaye bulunamadı';
      case 'deadline-exceeded':
      case 'cancelled':
        return 'İşlem zaman aşımına uğradı';
      case 'internal':
        return 'Sunucu hatası oluştu';
      case 'invalid-argument':
        return 'Geçersiz parametre';
      case 'resource-exhausted':
        return 'Servis geçici olarak kullanılamıyor';
      case 'unavailable':
        return 'Servis şu anda kullanılamıyor';
      default:
        return 'Bilinmeyen hata oluştu';
    }
  }

  void _createFallbackStory() {
    print('🔧 Fallback hikaye oluşturuluyor...');

    // Basit bir fallback hikaye oluştur
    _weeklyStory = {
      'weekNumber': _getCurrentWeekNumber(),
      'year': DateTime.now().year,
      'totalStudyMinutes': 0,
      'bestDay': {
        'date': DateTime.now().toLocal().toString().split(' ')[0],
        'minutes': 0,
        'achievement': 'Her gün yeni bir fırsat!'
      },
      'worstDay': {
        'date': DateTime.now().toLocal().toString().split(' ')[0],
        'minutes': 0,
        'challenge': 'Zorluklar büyüme fırsatıdır'
      },
      'keyMoments': [
        {
          'day': 'Bu Hafta',
          'type': 'motivation',
          'description':
              'Her yeni hafta, hedeflerine ulaşmak için yeni bir şanstır!',
          'emoji': '🌟'
        }
      ],
      'weeklyStreak': 0,
      'improvementAreas': ['Düzenli çalışma', 'Hedef belirleme', 'Motivasyon'],
      'celebrationMessage': 'Başarı yolculuğun devam ediyor! 🚀',
      'nextWeekMotivation': 'Gelecek hafta daha da güçlü olacaksın!',
      'xpEarned': 0,
      'totalXP': 0
    };

    _prepareStoryMoments();
    print('✅ Fallback hikaye hazırlandı');
  }

  int _getCurrentWeekNumber() {
    final now = DateTime.now();
    final firstDayOfYear = DateTime(now.year, 1, 1);
    final pastDaysOfYear = now.difference(firstDayOfYear).inDays;
    return ((pastDaysOfYear + firstDayOfYear.weekday) / 7).ceil();
  }

  void _prepareStoryMoments() {
    if (_weeklyStory == null) return;

    // Safe casting ve null kontrolleri
    final keyMoments = _weeklyStory!['keyMoments'] as List? ?? [];
    final bestDay = _weeklyStory!['bestDay'] as Map? ?? {};
    final improvementAreas = _weeklyStory!['improvementAreas'] as List? ?? [];

    _storyMoments = [
      // Açılış
      {
        'type': 'intro',
        'title': 'Haftanın Hikayesi 📖',
        'subtitle': 'Bu hafta nasıl geçti?',
        'content': _weeklyStory!['celebrationMessage'] ??
            'Yolculuğun devam ediyor! 🌟',
      },
      // Anahtar anlar
      ...keyMoments.map((moment) => {
            'type': 'moment',
            'day': moment['day'] ?? 'Bu Hafta',
            'momentType': moment['type'] ?? 'default',
            'description': moment['description'] ?? 'Harika bir an!',
            'emoji': moment['emoji'] ?? '⭐',
          }),
      // En iyi gün
      {
        'type': 'best_day',
        'title': '🏆 En İyi Günün',
        'date': bestDay['date'] ??
            DateTime.now().toLocal().toString().split(' ')[0],
        'minutes': bestDay['minutes'] ?? 0,
        'achievement': bestDay['achievement'] ?? 'Harika bir performans!',
      },
      // Gelişim alanları
      if (improvementAreas.isNotEmpty)
        {
          'type': 'improvements',
          'title': '🎯 Gelişim Alanları',
          'areas': improvementAreas,
        },
      // Gelecek hafta motivasyonu
      {
        'type': 'motivation',
        'title': '🚀 Gelecek Hafta',
        'content':
            _weeklyStory!['nextWeekMotivation'] ?? 'Yeni hedeflere doğru!',
        'xp': _weeklyStory!['xpEarned'] ?? 0,
      },
    ];

    print('📝 ${_storyMoments.length} hikaye momenti hazırlandı');
  }

  void _startStoryProgress() {
    _fadeController.forward();
    _progressController.forward().then((_) {
      _nextMoment();
    });
  }

  void _nextMoment() {
    if (_currentMomentIndex < _storyMoments.length - 1) {
      setState(() {
        _currentMomentIndex++;
      });
      _progressController.reset();
      _fadeController.reset();
      _fadeController.forward();
      _progressController.forward().then((_) {
        _nextMoment();
      });
    } else {
      // Hikaye bitti, ekranı kapat
      Navigator.of(context).pop();
    }
  }

  void _previousMoment() {
    if (_currentMomentIndex > 0) {
      setState(() {
        _currentMomentIndex--;
      });
      _progressController.reset();
      _fadeController.reset();
      _fadeController.forward();
      _progressController.forward().then((_) {
        _nextMoment();
      });
    }
  }

  Color _getBackgroundColor() {
    final provider = Provider.of<StudyDataProvider>(context, listen: false);
    final currentMoment = _storyMoments[_currentMomentIndex];

    if (provider.hasActiveTheme) {
      final themeType = provider.themeType;
      switch (themeType) {
        case 'energetic':
          return Color(0xFFFF6B35);
        case 'calm':
          return Color(0xFF81C784);
        case 'motivated':
          return Color(0xFF7986CB);
        case 'focused':
          return Color(0xFF26A69A);
        default:
          return Color(0xFF5E35B1);
      }
    }

    // Fallback: moment tipine göre renk
    switch (currentMoment['type']) {
      case 'intro':
        return Color(0xFF6A1B9A);
      case 'best_day':
        return Color(0xFF388E3C);
      case 'motivation':
        return Color(0xFFFF6F00);
      default:
        return Color(0xFF5E35B1);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_isLoading) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: AppTheme.primaryColor),
              const SizedBox(height: 16),
              const Text(
                'Haftanın hikayesi hazırlanıyor...',
                style: TextStyle(color: Colors.white, fontSize: 16),
              ),
              const SizedBox(height: 8),
              const Text(
                'Bu işlem biraz zaman alabilir',
                style: TextStyle(color: Colors.white70, fontSize: 14),
              ),
            ],
          ),
        ),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.close, color: Colors.white),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                    _weeklyStory != null
                        ? Icons.check_circle
                        : Icons.error_outline,
                    color: _weeklyStory != null
                        ? AppTheme.successColor
                        : AppTheme.errorColor,
                    size: 64),
                const SizedBox(height: 24),
                Text(
                  _weeklyStory != null ? 'Hikaye Hazırlandı!' : _error!,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                if (_detailedError != null) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        const Text(
                          'Detaylar:',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _detailedError!,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
                if (_weeklyStory != null) ...[
                  const Text(
                    'Fallback hikaye oluşturuldu. Devam etmek için butona tıklayın.',
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton.icon(
                    onPressed: () {
                      setState(() {
                        _error = null;
                        _detailedError = null;
                        _isLoading = false;
                      });
                      _startStoryProgress();
                    },
                    icon: const Icon(Icons.play_arrow),
                    label: const Text('Hikayeyi Başlat'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 24, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    TextButton.icon(
                      onPressed: () => _loadWeeklyStory(),
                      icon: const Icon(Icons.refresh, color: Colors.white70),
                      label: const Text(
                        'Tekrar Dene',
                        style: TextStyle(color: Colors.white70),
                      ),
                    ),
                    const SizedBox(width: 16),
                    TextButton.icon(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.home, color: Colors.white70),
                      label: const Text(
                        'Ana Sayfa',
                        style: TextStyle(color: Colors.white70),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: GestureDetector(
          onTapUp: (details) {
            final width = MediaQuery.of(context).size.width;
            if (details.globalPosition.dx > width / 2) {
              _nextMoment();
            } else {
              _previousMoment();
            }
          },
          child: Stack(
            children: [
              // Ana hikaye içeriği
              AnimatedBuilder(
                animation: _fadeController,
                builder: (context, child) {
                  return FadeTransition(
                    opacity: _fadeController,
                    child: Container(
                      width: double.infinity,
                      height: double.infinity,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            _getBackgroundColor(),
                            _getBackgroundColor().withOpacity(0.8),
                          ],
                        ),
                      ),
                      child: _buildStoryContent(),
                    ),
                  );
                },
              ),

              // Progress bars
              Positioned(
                top: 16,
                left: 16,
                right: 16,
                child: Row(
                  children: List.generate(_storyMoments.length, (index) {
                    return Expanded(
                      child: Container(
                        height: 3,
                        margin: EdgeInsets.symmetric(horizontal: 2),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.3),
                          borderRadius: BorderRadius.circular(1.5),
                        ),
                        child: AnimatedBuilder(
                          animation: _progressController,
                          builder: (context, child) {
                            double progress = 0.0;
                            if (index < _currentMomentIndex) {
                              progress = 1.0;
                            } else if (index == _currentMomentIndex) {
                              progress = _progressController.value;
                            }

                            return LinearProgressIndicator(
                              value: progress,
                              backgroundColor: Colors.transparent,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(Colors.white),
                            );
                          },
                        ),
                      ),
                    );
                  }),
                ),
              ),

              // Kapatma butonu
              Positioned(
                top: 40,
                right: 16,
                child: IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: Icon(Icons.close, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStoryContent() {
    if (_storyMoments.isEmpty) return SizedBox();

    final moment = _storyMoments[_currentMomentIndex];

    switch (moment['type']) {
      case 'intro':
        return _buildIntroMoment(moment);
      case 'moment':
        return _buildKeyMoment(moment);
      case 'best_day':
        return _buildBestDayMoment(moment);
      case 'improvements':
        return _buildImprovementsMoment(moment);
      case 'motivation':
        return _buildMotivationMoment(moment);
      default:
        return Container();
    }
  }

  Widget _buildIntroMoment(Map<String, dynamic> moment) {
    return Padding(
      padding: EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            moment['title'],
            style: TextStyle(
              color: Colors.white,
              fontSize: 32,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 20),
          Text(
            moment['subtitle'],
            style: TextStyle(
              color: Colors.white.withOpacity(0.8),
              fontSize: 18,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 40),
          Container(
            padding: EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              moment['content'],
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKeyMoment(Map<String, dynamic> moment) {
    return Padding(
      padding: EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            moment['emoji'],
            style: TextStyle(fontSize: 80),
          ),
          SizedBox(height: 20),
          Text(
            moment['day'],
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 16),
          Container(
            padding: EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              moment['description'],
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBestDayMoment(Map<String, dynamic> moment) {
    return Padding(
      padding: EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '🏆',
            style: TextStyle(fontSize: 80),
          ),
          SizedBox(height: 20),
          Text(
            moment['title'],
            style: TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 20),
          Text(
            moment['date'],
            style: TextStyle(
              color: Colors.white.withOpacity(0.8),
              fontSize: 16,
            ),
          ),
          SizedBox(height: 32),
          Container(
            padding: EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Text(
                  '${moment['minutes']} dakika',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 36,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 12),
                Text(
                  moment['achievement'],
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImprovementsMoment(Map<String, dynamic> moment) {
    final areas = moment['areas'] as List;

    return Padding(
      padding: EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '🎯',
            style: TextStyle(fontSize: 80),
          ),
          SizedBox(height: 20),
          Text(
            moment['title'],
            style: TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 32),
          ...areas
              .map((area) => Container(
                    width: double.infinity,
                    margin: EdgeInsets.symmetric(vertical: 8),
                    padding: EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '• $area',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                      ),
                    ),
                  ))
              .toList(),
        ],
      ),
    );
  }

  Widget _buildMotivationMoment(Map<String, dynamic> moment) {
    return Padding(
      padding: EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '🚀',
            style: TextStyle(fontSize: 80),
          ),
          SizedBox(height: 20),
          Text(
            moment['title'],
            style: TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 32),
          Container(
            padding: EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              moment['content'],
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.stars, color: Colors.yellow, size: 20),
              SizedBox(width: 8),
              Text(
                '+${moment['xp']} XP bu hafta!',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
