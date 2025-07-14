import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:okuz_ai/models/gamification.dart';
import 'package:okuz_ai/services/gamification_service.dart';
import 'package:percent_indicator/percent_indicator.dart';

class GamificationScreen extends StatefulWidget {
  const GamificationScreen({Key? key}) : super(key: key);

  @override
  State<GamificationScreen> createState() => _GamificationScreenState();
}

class _GamificationScreenState extends State<GamificationScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late Future<Gamification> _gamificationFuture;
  final GamificationService _gamificationService = GamificationService();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
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
        title: const Text('İlerleme ve Başarılar'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Genel Durum'),
            Tab(text: 'Rozetler'),
            Tab(text: 'Başarımlar'),
          ],
        ),
      ),
      body: FutureBuilder<Gamification>(
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
          
          return TabBarView(
            controller: _tabController,
            children: [
              _buildOverviewTab(context, gamification),
              _buildBadgesTab(context, gamification),
              _buildAchievementsTab(context, gamification),
            ],
          );
        },
      ),
    );
  }

  Widget _buildOverviewTab(BuildContext context, Gamification gamification) {
    final theme = Theme.of(context);
    
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
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary.withOpacity(0.2),
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
                    backgroundColor: theme.colorScheme.primary.withOpacity(0.2),
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
                    gamification.streak > 0
                        ? 'Tebrikler! ${gamification.streak} gündür aralıksız çalışıyorsun.'
                        : 'Bugün bir görev tamamlayarak seriyi başlat!',
                    style: theme.textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Ders Bazında XP Kartı
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
                  Text(
                    'Ders Bazında İlerleme',
                    style: theme.textTheme.titleMedium,
                  ),
                  const SizedBox(height: 16),
                  if (gamification.subjectXP.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(16.0),
                        child: Text('Henüz ders bazında XP kazanılmamış.'),
                      ),
                    )
                  else
                    ...gamification.subjectXP.entries.map((entry) {
                      final subject = entry.key;
                      final xp = entry.value;
                      final maxXP = gamification.subjectXP.values.reduce((a, b) => a > b ? a : b);
                      final progress = xp / maxXP;
                      
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(subject),
                                Text('$xp XP'),
                              ],
                            ),
                            const SizedBox(height: 4),
                            LinearPercentIndicator(
                              lineHeight: 8.0,
                              percent: progress,
                              backgroundColor: theme.colorScheme.primary.withOpacity(0.2),
                              progressColor: theme.colorScheme.primary,
                              barRadius: const Radius.circular(4),
                              padding: EdgeInsets.zero,
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBadgesTab(BuildContext context, Gamification gamification) {
    final theme = Theme.of(context);
    
    if (gamification.badges.isEmpty) {
      return const Center(
        child: Text('Henüz rozet kazanılmamış. Görevleri tamamlayarak rozetler kazanabilirsin!'),
      );
    }
    
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.8,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: gamification.badges.length,
      itemBuilder: (context, index) {
        final badge = gamification.badges[index];
        return _buildBadgeCard(context, badge);
      },
    );
  }

  Widget _buildBadgeCard(BuildContext context, Badge badge) {
    final theme = Theme.of(context);
    
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: () => _showBadgeDetails(context, badge),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              badge.imageUrl.isNotEmpty
                  ? Image.network(
                      badge.imageUrl,
                      height: 80,
                      width: 80,
                      errorBuilder: (context, error, stackTrace) => Icon(
                        Icons.emoji_events,
                        size: 80,
                        color: _getBadgeColor(badge.rarity),
                      ),
                    )
                  : Icon(
                      Icons.emoji_events,
                      size: 80,
                      color: _getBadgeColor(badge.rarity),
                    ),
              const SizedBox(height: 12),
              Text(
                badge.name,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                _formatDate(badge.awardedAt),
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getBadgeColor(int rarity) {
    switch (rarity) {
      case 1:
        return Colors.grey;
      case 2:
        return Colors.green;
      case 3:
        return Colors.blue;
      case 4:
        return Colors.purple;
      case 5:
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  void _showBadgeDetails(BuildContext context, Badge badge) {
    final theme = Theme.of(context);
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(badge.name),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            badge.imageUrl.isNotEmpty
                ? Image.network(
                    badge.imageUrl,
                    height: 100,
                    width: 100,
                    errorBuilder: (context, error, stackTrace) => Icon(
                      Icons.emoji_events,
                      size: 100,
                      color: _getBadgeColor(badge.rarity),
                    ),
                  )
                : Icon(
                    Icons.emoji_events,
                    size: 100,
                    color: _getBadgeColor(badge.rarity),
                  ),
            const SizedBox(height: 16),
            Text(badge.description),
            const SizedBox(height: 8),
            Text(
              'Kazanıldı: ${_formatDate(badge.awardedAt)}',
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Kapat'),
          ),
        ],
      ),
    );
  }

  Widget _buildAchievementsTab(BuildContext context, Gamification gamification) {
    final theme = Theme.of(context);
    
    if (gamification.achievements.isEmpty) {
      return const Center(
        child: Text('Henüz başarım bulunmuyor.'),
      );
    }
    
    // Başarımları tamamlanmış ve devam edenler olarak grupla
    final completedAchievements = gamification.achievements.where((a) => a.isCompleted).toList();
    final inProgressAchievements = gamification.achievements.where((a) => !a.isCompleted).toList();
    
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (inProgressAchievements.isNotEmpty) ...[
          Text(
            'Devam Eden Başarımlar',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          ...inProgressAchievements.map((achievement) => _buildAchievementCard(context, achievement)),
          const SizedBox(height: 24),
        ],
        
        if (completedAchievements.isNotEmpty) ...[
          Text(
            'Tamamlanan Başarımlar',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          ...completedAchievements.map((achievement) => _buildAchievementCard(context, achievement)),
        ],
      ],
    );
  }

  Widget _buildAchievementCard(BuildContext context, Achievement achievement) {
    final theme = Theme.of(context);
    final progress = achievement.progressPercentage;
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    achievement.name,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (achievement.isCompleted)
                  Icon(
                    Icons.check_circle,
                    color: Colors.green,
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(achievement.description),
            const SizedBox(height: 12),
            LinearPercentIndicator(
              lineHeight: 10.0,
              percent: progress,
              backgroundColor: theme.colorScheme.primary.withOpacity(0.2),
              progressColor: achievement.isCompleted
                  ? Colors.green
                  : theme.colorScheme.primary,
              barRadius: const Radius.circular(5),
              padding: EdgeInsets.zero,
              center: Text(
                '${achievement.progress}/${achievement.target}',
                style: TextStyle(
                  fontSize: 8,
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Ödül: ${achievement.xpReward} XP',
                  style: theme.textTheme.bodySmall,
                ),
                if (achievement.isCompleted && achievement.completedAt != null)
                  Text(
                    'Tamamlandı: ${_formatDate(achievement.completedAt!)}',
                    style: theme.textTheme.bodySmall,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}.${date.month}.${date.year}';
  }
} 