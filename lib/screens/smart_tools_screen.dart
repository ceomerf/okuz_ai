import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import 'focus_mode_screen.dart';
import 'manual_study_log_screen.dart';
import 'study_history_screen.dart';
import 'modern_sos_question_solver_screen.dart';
import 'live_quiz_screen.dart';
import 'exam_simulator_screen.dart';
import 'weekly_story_screen.dart';
import 'modern_summary_screen.dart';
import 'leaderboard_screen.dart';
import 'ai_sokrates_screen.dart';
import 'flashcards_screen.dart';
// import 'exam_history_screen.dart';
import '../theme/app_theme.dart';
import '../providers/theme_provider.dart';
import '../providers/study_data_provider.dart';
import '../services/api_client.dart';
import 'settings_screen.dart';
import '../widgets/coming_soon_dialog.dart'; // 🚀 YENİ: Coming Soon Dialog
import 'quiz_setup_screen.dart';


class SmartToolsScreen extends ConsumerStatefulWidget {
  const SmartToolsScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<SmartToolsScreen> createState() => _SmartToolsScreenState();
}

class _SmartToolsScreenState extends ConsumerState<SmartToolsScreen>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;
  late Animation<double> _scaleAnimation;

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
      begin: 30.0,
      end: 0.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: const Interval(0.2, 1.0, curve: Curves.easeOutCubic),
    ));
    _scaleAnimation = Tween<double>(
      begin: 0.8,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: const Interval(0.0, 0.8, curve: Curves.elasticOut),
    ));
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Consumer(
      builder: (context, ref, child) {
        final provider = ref.read(studyDataNotifierProvider.notifier);
        return Scaffold(
          body: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  isDark ? const Color(0xFF1A1B23) : const Color(0xFFF8FAFC),
                  isDark ? const Color(0xFF2D3748) : const Color(0xFFE2E8F0),
                  isDark ? const Color(0xFF1A202C) : const Color(0xFFF1F5F9),
                ],
                stops: const [0.0, 0.5, 1.0],
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
                      child: Transform.scale(
                        scale: _scaleAnimation.value,
                        child: CustomScrollView(
                          physics: const BouncingScrollPhysics(),
                          slivers: [
                            _buildModernSliverAppBar(isDark),
                            SliverToBoxAdapter(
                              child: AnimationLimiter(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 20),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children:
                                        AnimationConfiguration.toStaggeredList(
                                      duration:
                                          const Duration(milliseconds: 600),
                                      childAnimationBuilder: (widget) =>
                                          SlideAnimation(
                                        verticalOffset: 50.0,
                                        child: FadeInAnimation(child: widget),
                                      ),
                                      children: [
                                        const SizedBox(height: 10),
                                        _buildModernHeader(provider, isDark),
                                        const SizedBox(height: 32),
                                        _buildAIToolsSection(provider, isDark),
                                        const SizedBox(height: 32),
                                        _buildContentToolsSection(
                                            provider, isDark),
                                        const SizedBox(height: 32),
                                        _buildStudyToolsSection(
                                            provider, isDark),
                                        const SizedBox(height: 32),
                                        _buildTrackingToolsSection(
                                            provider, isDark),
                                        const SizedBox(height: 100),
                                      ],
                                    ),
                                  ),
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
            ),
          ),
        );
      },
    );
  }

  Widget _buildModernSliverAppBar(bool isDark) {
    return SliverAppBar(
      expandedHeight: 180,
      floating: false,
      pinned: true,
      backgroundColor: Colors.transparent,
      foregroundColor: isDark ? Colors.white : Colors.black87,
      elevation: 0,
      actions: [
        Container(
          margin: const EdgeInsets.only(right: 16),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.1)
                : AppTheme.primaryColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: IconButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SettingsScreen()),
              );
            },
            icon: Icon(
              Icons.settings,
              color: isDark ? Colors.white : AppTheme.primaryColor,
              size: 20,
            ),
            tooltip: 'Ayarlar',
          ),
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        title: Text(
          'Akıllı Araçlar',
          style: TextStyle(
            color: isDark ? Colors.white : Colors.black87,
            fontWeight: FontWeight.w700,
            fontSize: 20,
            letterSpacing: -0.5,
          ),
        ),
        titlePadding: const EdgeInsets.only(left: 20, bottom: 16),
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                isDark ? const Color(0xFF1A1B23) : const Color(0xFFF8FAFC),
                isDark ? const Color(0xFF2D3748) : const Color(0xFFE2E8F0),
              ],
            ),
          ),
          child: Stack(
            children: [
              // Decorative circles
              Positioned(
                top: 60,
                right: 30,
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        AppTheme.primaryColor.withValues(alpha: 0.15),
                        AppTheme.primaryColor.withValues(alpha: 0.05),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                top: 40,
                right: 20,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.1)
                        : AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: AppTheme.primaryColor.withValues(alpha: 0.2),
                      width: 1,
                    ),
                  ),
                  child: Icon(
                    Icons.auto_awesome,
                    color: AppTheme.primaryColor,
                    size: 28,
                  ),
                ),
              ),
              // Floating particles
              Positioned(
                top: 100,
                left: 40,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppTheme.primaryColor.withValues(alpha: 0.6),
                  ),
                ),
              ),
              Positioned(
                top: 120,
                left: 60,
                child: Container(
                  width: 4,
                  height: 4,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppTheme.primaryColor.withValues(alpha: 0.4),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModernHeader(StudyDataNotifier provider, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.05)
            : Colors.white.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.3)
                : AppTheme.primaryColor.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
            spreadRadius: 0,
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
                  gradient: LinearGradient(
                    colors: [
                      AppTheme.primaryColor,
                      AppTheme.primaryColor.withValues(alpha: 0.8),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primaryColor.withValues(alpha: 0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.psychology,
                  color: Colors.white,
                  size: 28,
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Akıllı Öğrenme Merkezi',
                      style:
                          Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: AppTheme.getPrimaryTextColor(context),
                                letterSpacing: -0.5,
                              ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'AI destekli araçlarla öğrenme deneyimini üst seviyeye çıkar',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.getSecondaryTextColor(context),
                            height: 1.4,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (provider.hasActiveTheme) ...[
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryColor.withValues(alpha: 0.1),
                    AppTheme.primaryColor.withValues(alpha: 0.05),
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppTheme.primaryColor.withValues(alpha: 0.2),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.palette,
                    color: AppTheme.primaryColor,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${provider.getMoodSummary()}',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppTheme.primaryColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAIToolsSection(StudyDataNotifier provider, bool isDark) {
    return _buildModernSection(
      '🤖 AI Arkadaşların',
      'Yapay zeka destekli öğrenme deneyimi',
      [
        _buildModernToolCard(
          title: 'Sokratik Yoldaş',
          subtitle: 'Sokratik Diyalog & Mentor',
          description:
              'Hem derinlemesine sorgulayan Sokrat, hem de destek olan Mentor ile sohbet et',
          icon: Icons.psychology,
          color: const Color(0xFF6366F1),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => AISokratesScreen()),
          ),
          provider: provider,
          iconEmoji: '🤝',
          isDark: isDark,
        ),
        // ModernLearningPathScreen geçici olarak devre dışı
        // _buildModernToolCard(
        //   title: 'AI Pathfinder',
        //   subtitle: 'Müfredat Odaklı Öğrenme Yolu',
        //   description: 'MEB müfredatına uygun kişiselleştirilmiş yol',
        //   icon: Icons.explore,
        //   color: AppTheme.primaryColor,
        //   onTap: () => Navigator.push(
        //     context,
        //     MaterialPageRoute(
        //         builder: (context) => const ModernLearningPathScreen()),
        //   ),
        //   provider: provider,
        //   iconEmoji: '🗺️',
        //   isDark: isDark,
        // ),
        _buildModernToolCard(
          title: 'Sınav Simülatörü',
          subtitle: 'Koç Eşliğinde',
          description: 'Strateji ve analiz',
          icon: Icons.sports,
          color: const Color(0xFFEF4444),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => ExamSimulatorScreen()),
          ),
          provider: provider,
          iconEmoji: '🏆',
          isDark: isDark,
        ),
        _buildModernToolCard(
          title: 'SOS Çözücü',
          subtitle: 'Anında Yardım',
          description: 'Fotoğrafla soru çöz',
          icon: Icons.help_center,
          color: const Color(0xFFF59E0B),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => ModernSOSQuestionSolverScreen()),
          ),
          provider: provider,
          iconEmoji: '🆘',
          isDark: isDark,
        ),
        _buildModernToolCard(
          title: 'Liderlik Tablosu',
          subtitle: 'Rekabet Arenası',
          description: 'Sıralamada yerini gör',
          icon: Icons.emoji_events,
          color: const Color(0xFFEF4444),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => LeaderboardScreen()),
          ),
          provider: provider,
          iconEmoji: '🏆',
          isDark: isDark,
        ),
      ],
      provider,
      isDark,
    );
  }

  Widget _buildContentToolsSection(StudyDataNotifier provider, bool isDark) {
    return _buildModernSection(
      '📝 İçerik Araçları',
      'Metinleri anlayıp özetleme',
      [
        _buildModernToolCard(
          title: 'Akıllı Özet',
          subtitle: 'Metin Özetleme',
          description: 'Uzun metinleri özetle',
          icon: Icons.summarize,
          color: const Color(0xFF8B5CF6),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => ModernSummaryScreen()),
          ),
          provider: provider,
          iconEmoji: '📄',
          isDark: isDark,
        ),



        _buildModernToolCard(
          title: 'Hafıza Kartları',
          subtitle: 'Akıllı Tekrar',
          description: 'AI destekli flashcard\'lar',
          icon: Icons.style,
          color: const Color(0xFF8B5CF6),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => FlashcardsScreen()),
          ),
          provider: provider,
          iconEmoji: '🃏',
          isDark: isDark,
        ),
        _buildWideModernToolCard(
          title: 'Haftanın Hikayesi',
          subtitle: 'Motivasyon ve başarı hikayeni',
          icon: Icons.auto_stories,
          color: const Color(0xFF8B5CF6),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => WeeklyStoryScreen()),
          ),
          provider: provider,
          iconEmoji: '📖',
          isDark: isDark,
        ),
        _buildModernToolCard(
          title: 'Canlı Quiz',
          subtitle: 'İstediğin konuda test çöz, sonuçlarını analiz et',
          description: 'İstediğin konuda test çöz, sonuçlarını analiz et',
          icon: Icons.quiz,
          color: const Color(0xFF3B82F6),
          onTap: () {
            Navigator.pushNamed(context, QuizSetupScreen.routeName);
          },
          provider: provider,
          iconEmoji: '❓',
          isDark: isDark,
        ),


      ],
      provider,
      isDark,
    );
  }

  Widget _buildStudyToolsSection(StudyDataNotifier provider, bool isDark) {
    return _buildModernSection(
      '📚 Çalışma Araçları',
      'Odaklanma ve verimlilik',
      [
        _buildModernToolCard(
          title: 'Odaklanma Modu',
          subtitle: 'Pomodoro Timer',
          description: 'Derin odaklanma',
          icon: Icons.timer,
          color: const Color(0xFF10B981),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => FocusModeScreen()),
          ),
          provider: provider,
          iconEmoji: '🎯',
          isDark: isDark,
        ),
        _buildModernToolCard(
          title: 'Çalışma Geçmişi',
          subtitle: 'İlerleme Takibi',
          description: 'Başarı hikayeni',
          icon: Icons.history,
          color: const Color(0xFF3B82F6),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => StudyHistoryScreen()),
          ),
          provider: provider,
          iconEmoji: '📈',
          isDark: isDark,
        ),
        _buildModernToolCard(
          title: 'Manuel Kayıt',
          subtitle: 'Çevrimdışı Çalışma',
          description: 'Kitap çalışmalarını kaydet',
          icon: Icons.edit,
          color: const Color(0xFF06B6D4),
          onTap: () => showManualStudyBottomSheet(context),
          provider: provider,
          iconEmoji: '✍️',
          isDark: isDark,
        ),
      ],
      provider,
      isDark,
    );
  }

  Widget _buildTrackingToolsSection(StudyDataNotifier provider, bool isDark) {
    return _buildModernSection(
      '📊 Takip & Ayarlar',
      'İlerleme takibi ve kişiselleştirme',
      [
        _buildModernToolCard(
          title: 'Deneme Geçmişi',
          subtitle: 'Sınav Analizleri',
          description: 'AI destekli gelişim takibi',
          icon: Icons.analytics,
          color: const Color(0xFF3B82F6),
          onTap: () => showComingSoonDialog(
            context,
            featureName: 'AI Destekli Sınav Analizi',
            description:
                'Gelişmiş sınav geçmişi analizi ve yapay zeka destekli performans takibi çok yakında! Deneme sonuçlarını detaylı analiz edebileceksin.',
            icon: Icons.analytics,
            color: const Color(0xFF3B82F6),
          ),
          provider: provider,
          iconEmoji: '📈',
          isDark: isDark,
        ),
        _buildModernToolCard(
          title: 'Tema Analizi',
          subtitle: 'Ruh Hali Uyumlu',
          description: 'Akıllı tema önerisi',
          icon: Icons.palette,
          color: AppTheme.primaryColor,
          onTap: () => _forceThemeUpdate(provider),
          provider: provider,
          iconEmoji: '🎨',
          isDark: isDark,
        ),
        _buildModernToolCard(
          title: 'Tema Değiştir',
          subtitle: 'Light/Dark Mode',
          description: 'Görünüm değiştir',
          icon: Icons.brightness_6,
          color: isDark ? const Color(0xFF64748B) : const Color(0xFFFFC107),
          onTap: () => _toggleTheme(),
          provider: provider,
          iconEmoji: isDark ? '🌙' : '☀️',
          isDark: isDark,
        ),
      ],
      provider,
      isDark,
    );
  }

  Widget _buildModernSection(
    String title,
    String subtitle,
    List<Widget> tools,
    StudyDataNotifier provider,
    bool isDark,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppTheme.getPrimaryTextColor(context),
                      letterSpacing: -0.5,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                subtitle,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.getSecondaryTextColor(context),
                      height: 1.4,
                    ),
              ),
            ],
          ),
        ),
        LayoutBuilder(
          builder: (context, constraints) {
            return Wrap(
              spacing: 16,
              runSpacing: 16,
              children: tools,
            );
          },
        ),
      ],
    );
  }

  Widget _buildModernToolCard({
    required String title,
    required String subtitle,
    required String description,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    required StudyDataNotifier provider,
    required String iconEmoji,
    required bool isDark,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final screenWidth = MediaQuery.of(context).size.width;
        final cardWidth = (screenWidth - 56) / 2; // 20 + 16 + 20 padding

        return GestureDetector(
          onTap: onTap,
          child: Container(
            width: cardWidth,
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : Colors.white.withValues(alpha: 0.8),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: color.withValues(alpha: 0.2),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: isDark
                      ? Colors.black.withValues(alpha: 0.2)
                      : color.withValues(alpha: 0.1),
                  blurRadius: 15,
                  offset: const Offset(0, 5),
                  spreadRadius: 0,
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              color.withValues(alpha: 0.2),
                              color.withValues(alpha: 0.1),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: color.withValues(alpha: 0.3),
                            width: 1,
                          ),
                        ),
                        child: Text(
                          iconEmoji,
                          style: const TextStyle(fontSize: 18),
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          Icons.arrow_forward_ios,
                          color: color,
                          size: 12,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppTheme.getPrimaryTextColor(context),
                          letterSpacing: -0.3,
                        ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: color,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    description,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppTheme.getSecondaryTextColor(context),
                          height: 1.3,
                          fontSize: 11,
                        ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildWideModernToolCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    required StudyDataNotifier provider,
    required String iconEmoji,
    required bool isDark,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withValues(alpha: 0.05)
              : Colors.white.withValues(alpha: 0.8),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: color.withValues(alpha: 0.2),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: isDark
                  ? Colors.black.withValues(alpha: 0.2)
                  : color.withValues(alpha: 0.1),
              blurRadius: 15,
              offset: const Offset(0, 5),
              spreadRadius: 0,
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      color.withValues(alpha: 0.2),
                      color.withValues(alpha: 0.1),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: color.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Text(
                  iconEmoji,
                  style: const TextStyle(fontSize: 24),
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppTheme.getPrimaryTextColor(context),
                            letterSpacing: -0.3,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.getSecondaryTextColor(context),
                            height: 1.3,
                          ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.arrow_forward_ios,
                  color: color,
                  size: 16,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSubjectSelection() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Theme.of(context).brightness == Brightness.dark
            ? Colors.grey[850]
            : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryColor.withValues(alpha: 0.2),
                    AppTheme.primaryColor.withValues(alpha: 0.1),
                  ],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.school,
                color: AppTheme.primaryColor,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            const Text(
              'Ders Seçimi',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                letterSpacing: -0.3,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Hangi derste soru-cevap yapmak istiyorsun?',
              style: TextStyle(
                color: AppTheme.getSecondaryTextColor(context),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                'Matematik',
                'Fizik',
                'Kimya',
                'Biyoloji',
                'Türkçe',
                'Tarih',
                'Coğrafya',
                'Felsefe',
              ]
                  .map((subject) => GestureDetector(
                        onTap: () {
                          Navigator.of(context).pop();
                          _showTopicSelection(subject);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                AppTheme.primaryColor.withValues(alpha: 0.15),
                                AppTheme.primaryColor.withValues(alpha: 0.05),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color:
                                  AppTheme.primaryColor.withValues(alpha: 0.3),
                              width: 1,
                            ),
                          ),
                          child: Text(
                            subject,
                            style: TextStyle(
                              color: AppTheme.primaryColor,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ))
                  .toList(),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'İptal',
              style: TextStyle(
                color: AppTheme.getSecondaryTextColor(context),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showTopicSelection(String subject) {
    final Map<String, List<String>> subjectTopics = {
      'Matematik': [
        'Genel Matematik',
        'Sayılar ve İşlemler',
        'Denklemler',
        'Fonksiyonlar',
        'Geometri',
        'Trigonometri',
        'Logaritma',
        'Türev',
        'İntegral',
        'Olasılık'
      ],
      'Fizik': [
        'Genel Fizik',
        'Hareket',
        'Kuvvet ve Hareket',
        'İş Güç Enerji',
        'İtme ve Momentum',
        'Elektrik',
        'Manyetizma',
        'Dalgalar',
        'Optik',
        'Modern Fizik'
      ],
      'Kimya': [
        'Genel Kimya',
        'Atom ve Periyodik Sistem',
        'Kimyasal Bağlar',
        'Kimyasal Tepkimeler',
        'Gazlar',
        'Asitler ve Bazlar',
        'Çözeltiler',
        'Elektrokimya',
        'Organik Kimya',
        'Karbon Kimyası'
      ],
      'Biyoloji': [
        'Genel Biyoloji',
        'Hücre',
        'Canlıların Çeşitliliği',
        'Genetik',
        'Ekoloji',
        'İnsan Fizyolojisi',
        'Bitki Biyolojisi',
        'Hayvan Biyolojisi',
        'Moleküler Biyoloji',
        'Evrim'
      ],
      'Türkçe': [
        'Genel Türkçe',
        'Dil Bilgisi',
        'Edebiyat',
        'Şiir',
        'Roman',
        'Öykü',
        'Tiyatro',
        'Kompozisyon',
        'Anlatım Teknikleri',
        'Sözcük Bilgisi'
      ],
      'Tarih': [
        'Genel Tarih',
        'Osmanlı Tarihi',
        'Türk İnkılap Tarihi',
        'Dünya Tarihi',
        'İlk Çağ',
        'Orta Çağ',
        'Yeni Çağ',
        'Yakın Çağ',
        'Cumhuriyet Dönemi',
        'Atatürk İlkeleri'
      ],
      'Coğrafya': [
        'Genel Coğrafya',
        'Fiziki Coğrafya',
        'Beşeri Coğrafya',
        'Türkiye Coğrafyası',
        'Dünya Coğrafyası',
        'İklim',
        'Nüfus',
        'Yerleşme',
        'Ekonomi',
        'Çevre'
      ],
      'Felsefe': [
        'Genel Felsefe',
        'Mantık',
        'Bilgi Felsefesi',
        'Metafizik',
        'Ahlak Felsefesi',
        'Siyaset Felsefesi',
        'Estetik',
        'Din Felsefesi',
        'Türk İslam Düşüncesi',
        'Çağdaş Felsefe'
      ],
    };

    final topics = subjectTopics[subject] ?? ['Genel'];

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Theme.of(context).brightness == Brightness.dark
            ? Colors.grey[850]
            : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryColor.withValues(alpha: 0.2),
                    AppTheme.primaryColor.withValues(alpha: 0.1),
                  ],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.topic,
                color: AppTheme.primaryColor,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                '$subject - Konu Seçimi',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.3,
                  fontSize: 16,
                ),
              ),
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Hangi konuda soru-cevap yapmak istiyorsun?',
                style: TextStyle(
                  color: AppTheme.getSecondaryTextColor(context),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 300,
                child: SingleChildScrollView(
                  child: Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: topics
                        .map((topic) => GestureDetector(
                              onTap: () {
                                Navigator.of(context).pop();
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => LiveQuizScreen(
                                      subject: subject,
                                      topic: topic,
                                    ),
                                  ),
                                );
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 10,
                                ),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      AppTheme.primaryColor
                                          .withValues(alpha: 0.15),
                                      AppTheme.primaryColor
                                          .withValues(alpha: 0.05),
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: AppTheme.primaryColor
                                        .withValues(alpha: 0.3),
                                    width: 1,
                                  ),
                                ),
                                child: Text(
                                  topic,
                                  style: TextStyle(
                                    color: AppTheme.primaryColor,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ))
                        .toList(),
                  ),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'İptal',
              style: TextStyle(
                color: AppTheme.getSecondaryTextColor(context),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _forceThemeUpdate(StudyDataNotifier provider) async {
    try {
      await provider.forceThemeUpdate();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Tema güncellendi: ${provider.getMoodSummary()}'),
            backgroundColor: AppTheme.successColor,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Tema güncellenirken hata oluştu'),
            backgroundColor: AppTheme.errorColor,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        );
      }
    }
  }

  void _toggleTheme() {
    // Riverpod tema toggling: global helper yerine provider kullanımı önerilir.
    // Bu ekran Statefull olduğundan, en kolay yol bir ProviderScope üstünde ref kullanmak.
    // Ancak burada doğrudan context üzerinden okunması gerekiyorsa, bir Consumer kullanıldığı yerde tetiklenebilir.
    // Hızlı kazanım: eski helper'ı Riverpod notifiere yönlendirecek şekilde bırakıyoruz.
    // Not: Tam temizlik adımında bu çağrı, ref.read(appThemeNotifierProvider.notifier).toggleTheme() ile değiştirilecek.
    ref.read(appThemeNotifierProvider.notifier).toggleTheme();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Theme.of(context).brightness == Brightness.dark
                    ? Icons.light_mode
                    : Icons.dark_mode,
                color: Colors.white,
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                Theme.of(context).brightness == Brightness.dark
                    ? 'Açık temaya geçildi'
                    : 'Koyu temaya geçildi',
              ),
            ],
          ),
          backgroundColor: AppTheme.primaryColor,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      );
    }
  }

  void showManualStudyBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ManualStudyLogScreen(),
    );
  }

}
