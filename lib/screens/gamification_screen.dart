import 'package:flutter/material.dart';
import 'package:okuz_ai/models/gamification.dart';
import 'package:okuz_ai/services/gamification_service.dart';
import 'package:percent_indicator/percent_indicator.dart';
import 'package:okuz_ai/screens/performance_dashboard_screen.dart';
import 'package:okuz_ai/screens/achievements_screen.dart';
import 'settings_screen.dart';

class GamificationScreen extends StatefulWidget {
  const GamificationScreen({Key? key}) : super(key: key);

  @override
  State<GamificationScreen> createState() => _GamificationScreenState();
}

class _GamificationScreenState extends State<GamificationScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late Future<Gamification> _gamificationFuture;
  final GamificationService _gamificationService = GamificationService();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadGamificationData();
  }

  void _loadGamificationData() {
    _gamificationFuture = _gamificationService.getUserGamification();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Oyunlar & Başarılar'),
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SettingsScreen()),
              );
            },
            tooltip: 'Ayarlar',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Genel Durum'),
            Tab(text: 'Performans'),
            Tab(text: 'Başarımlar'),
            Tab(text: 'Rozetler'),
          ],
          labelColor: Theme.of(context).colorScheme.primary,
          indicatorColor: Theme.of(context).colorScheme.primary,
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOverviewTab(context),
          const PerformanceDashboardScreen(),
          const AchievementsScreen(),
          _buildBadgesTab(context),
        ],
      ),
    );
  }

  Widget _buildOverviewTab(BuildContext context) {
    final theme = Theme.of(context);

    return FutureBuilder<Gamification>(
      future: _gamificationFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(
            child: Text(
              'Veriler yüklenirken bir hata oluştu: ${snapshot.error}',
              style: TextStyle(color: theme.colorScheme.error),
            ),
          );
        }

        if (!snapshot.hasData) {
          return const Center(
            child: Text('Oyunlaştırma verisi bulunamadı.'),
          );
        }

        final gamification = snapshot.data!;

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Seviye ve XP Kartı
              Card(
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${gamification.level}. Seviye',
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primary.withAlpha(51),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              '${gamification.xp} XP',
                              style: TextStyle(
                                color: theme.colorScheme.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      LinearPercentIndicator(
                        lineHeight: 14.0,
                        percent: gamification.levelProgress,
                        backgroundColor:
                            theme.colorScheme.primary.withAlpha(51),
                        progressColor: theme.colorScheme.primary,
                        barRadius: const Radius.circular(7),
                        padding: EdgeInsets.zero,
                        animation: true,
                        animationDuration: 1000,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Bir sonraki seviye için ${gamification.nextLevelXP - gamification.xp} XP daha gerekiyor',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Seri (Streak) Kartı
              Card(
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.local_fire_department,
                            color: Colors.orange,
                            size: 28,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Çalışma Serisi',
                            style: theme.textTheme.titleMedium,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '${gamification.streak}',
                            style: theme.textTheme.headlineLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: Colors.orange,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'gün',
                            style: theme.textTheme.titleMedium,
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Ardışık çalışma günlerin',
                        style: theme.textTheme.bodySmall,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Hızlı Erişim Kartları
              Text(
                'Hızlı Erişim',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.5,
                children: [
                  _buildQuickAccessCard(
                    context,
                    'Performans Paneli',
                    'Detaylı analizler',
                    Icons.analytics,
                    Colors.blue,
                    () => _tabController.animateTo(1),
                  ),
                  _buildQuickAccessCard(
                    context,
                    'Başarımlar',
                    'Rozetler ve ödüller',
                    Icons.emoji_events,
                    Colors.amber,
                    () => _tabController.animateTo(2),
                  ),
                  _buildQuickAccessCard(
                    context,
                    'Rozetler',
                    'Kazanılan rozetler',
                    Icons.workspace_premium,
                    Colors.purple,
                    () => _tabController.animateTo(3),
                  ),
                  _buildQuickAccessCard(
                    context,
                    'Sıralama',
                    'Arkadaşlarınla yarış',
                    Icons.leaderboard,
                    Colors.green,
                    () {
                      // Sıralama ekranına git
                      Navigator.pushNamed(context, '/leaderboard');
                    },
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildQuickAccessCard(
    BuildContext context,
    String title,
    String subtitle,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      color: Theme.of(context).colorScheme.surface,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: color,
                  size: 24,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 2),
              Flexible(
                child: Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withOpacity(0.7),
                      ),
                  textAlign: TextAlign.center,
                  overflow: TextOverflow.ellipsis,
                  maxLines: 2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBadgesTab(BuildContext context) {
    return FutureBuilder<Gamification>(
      future: _gamificationFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(
            child: Text(
              'Veriler yüklenirken bir hata oluştu: ${snapshot.error}',
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          );
        }

        if (!snapshot.hasData) {
          return const Center(
            child: Text('Rozet verisi bulunamadı.'),
          );
        }

        final gamification = snapshot.data!;

        if (gamification.badges.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.emoji_events_outlined,
                  size: 64,
                  color: Colors.grey[400],
                ),
                const SizedBox(height: 16),
                Text(
                  'Henüz rozet kazanmadın',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Çalışmaya devam et, rozetler seni bekliyor!',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[500],
                      ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }

        return GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 0.8,
          ),
          itemCount: gamification.badges.length,
          itemBuilder: (context, index) {
            final badge = gamification.badges[index];
            return Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.emoji_events,
                      size: 48,
                      color: Colors.amber,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      badge.name,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      badge.description,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
