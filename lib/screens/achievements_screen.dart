import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';

class AchievementsScreen extends StatefulWidget {
  const AchievementsScreen({super.key});

  @override
  State<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends State<AchievementsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<String> _mainTabs = ['Rozetler', 'Seviyeler', 'Sıralamalar'];
  final List<String> _leaderboardTabs = ['Haftalık XP', 'En Uzun Seri'];
  int _selectedLeaderboardTab = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _mainTabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: _mainTabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Başarımlar'),
          backgroundColor: Colors.deepPurple,
          bottom: TabBar(
            controller: _tabController,
            tabs: _mainTabs.map((e) => Tab(text: e)).toList(),
            indicatorColor: Colors.amber,
            labelStyle: GoogleFonts.figtree(fontWeight: FontWeight.bold),
          ),
        ),
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildBadgesTab(),
            _buildLevelsTab(),
            _buildLeaderboardsTab(),
          ],
        ),
      ),
    );
  }

  // --- Rozetler Sekmesi ---
  Widget _buildBadgesTab() {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('gamification')
          .doc('badges')
          .collection('all')
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildBadgesShimmer();
        }
        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
          return _buildEmptyState('Henüz hiç rozet kazanmadın!',
              'Çalışmaya devam et, ödüller seni bekliyor.');
        }
        final badges = snapshot.data!.docs;
        // Kullanıcının kazandığı rozetler örnek olarak bir set
        final userBadges = <String>{'math_monster', 'focus_master'};
        return GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 0.85,
          ),
          itemCount: badges.length,
          itemBuilder: (context, i) {
            final badge = badges[i].data() as Map<String, dynamic>;
            final badgeId = badges[i].id;
            final isEarned = userBadges.contains(badgeId);
            return _BadgeCard(
              badge: badge,
              isEarned: isEarned,
              onTap: () => _showBadgeDetail(badge, isEarned),
            );
          },
        );
      },
    );
  }

  Widget _buildBadgesShimmer() {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 0.85,
      ),
      itemCount: 6,
      itemBuilder: (context, i) => Shimmer.fromColors(
        baseColor: Colors.grey[300]!,
        highlightColor: Colors.grey[100]!,
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }

  void _showBadgeDetail(Map<String, dynamic> badge, bool isEarned) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Hero(
                tag: badge['icon'] ?? '',
                child: Image.network(
                  badge['icon'] ?? '',
                  width: 80,
                  height: 80,
                  color: isEarned ? null : Colors.grey,
                  colorBlendMode: isEarned ? null : BlendMode.saturation,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                badge['name'] ?? 'Rozet',
                style: GoogleFonts.figtree(
                    fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                badge['description'] ?? '',
                style: GoogleFonts.figtree(fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              isEarned
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.emoji_events, color: Colors.amber),
                        const SizedBox(width: 8),
                        Text('Kazanıldı: 12.04.2024',
                            style: GoogleFonts.figtree(
                                fontWeight: FontWeight.w500)),
                      ],
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.lock, color: Colors.grey),
                        const SizedBox(width: 8),
                        Text('Henüz kazanılmadı', style: GoogleFonts.figtree()),
                      ],
                    ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(String title, String subtitle) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.emoji_events, size: 64, color: Colors.amber),
            const SizedBox(height: 16),
            Text(title,
                style: GoogleFonts.figtree(
                    fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(subtitle,
                style: GoogleFonts.figtree(fontSize: 14),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  // --- Seviyeler Sekmesi ---
  Widget _buildLevelsTab() {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('gamification')
          .doc('levels')
          .collection('all')
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildLevelsShimmer();
        }
        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
          return _buildEmptyState('Henüz seviye atlamadın!',
              'Çalışmaya devam et, yeni seviyeler seni bekliyor.');
        }
        final levels = snapshot.data!.docs;
        final userLevel = 3; // Örnek kullanıcı seviyesi
        return ListView.builder(
          padding: const EdgeInsets.all(24),
          itemCount: levels.length,
          itemBuilder: (context, i) {
            final level = levels[i].data() as Map<String, dynamic>;
            final isReached = i < userLevel;
            return _LevelTile(level: level, isReached: isReached);
          },
        );
      },
    );
  }

  Widget _buildLevelsShimmer() {
    return ListView.builder(
      padding: const EdgeInsets.all(24),
      itemCount: 5,
      itemBuilder: (context, i) => Shimmer.fromColors(
        baseColor: Colors.grey[300]!,
        highlightColor: Colors.grey[100]!,
        child: Container(
          margin: const EdgeInsets.only(bottom: 20),
          height: 60,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }

  // --- Sıralamalar Sekmesi ---
  Widget _buildLeaderboardsTab() {
    return Column(
      children: [
        TabBar(
          onTap: (i) => setState(() => _selectedLeaderboardTab = i),
          tabs: _leaderboardTabs.map((e) => Tab(text: e)).toList(),
          labelColor: Colors.deepPurple,
          indicatorColor: Colors.amber,
        ),
        Expanded(
          child:
              _buildLeaderboardList(_leaderboardTabs[_selectedLeaderboardTab]),
        ),
      ],
    );
  }

  Widget _buildLeaderboardList(String type) {
    // Firestore query örneği, type'a göre farklı koleksiyonlar kullanılabilir
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('gamification')
          .doc('leaderboards')
          .collection(type)
          .orderBy('rank')
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildLeaderboardShimmer();
        }
        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
          return _buildEmptyState('Henüz sıralamada yoksun!',
              'Çalışmaya devam et, zirveye yaklaş!');
        }
        final users = snapshot.data!.docs;
        final myUserId = 'user_123'; // Örnek kullanıcı id
        int myIndex = users.indexWhere((u) => u.id == myUserId);
        return Stack(
          children: [
            ListView.builder(
              padding: const EdgeInsets.only(
                  bottom: 100, top: 16, left: 16, right: 16),
              itemCount: users.length,
              itemBuilder: (context, i) {
                final user = users[i].data() as Map<String, dynamic>;
                final isMe = users[i].id == myUserId;
                return _LeaderboardTile(
                  user: user,
                  rank: i + 1,
                  highlight: i < 3,
                  isMe: isMe,
                );
              },
            ),
            if (myIndex != -1)
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: _LeaderboardTile(
                  user: users[myIndex].data() as Map<String, dynamic>,
                  rank: myIndex + 1,
                  highlight: false,
                  isMe: true,
                  fixed: true,
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildLeaderboardShimmer() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 6,
      itemBuilder: (context, i) => Shimmer.fromColors(
        baseColor: Colors.grey[300]!,
        highlightColor: Colors.grey[100]!,
        child: Container(
          margin: const EdgeInsets.only(bottom: 16),
          height: 56,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}

// --- BadgeCard Widget ---
class _BadgeCard extends StatelessWidget {
  final Map<String, dynamic> badge;
  final bool isEarned;
  final VoidCallback onTap;
  const _BadgeCard(
      {required this.badge, required this.isEarned, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 400),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: isEarned
              ? [
                  BoxShadow(
                    color: Colors.amber.withOpacity(0.4),
                    blurRadius: 16,
                    spreadRadius: 2,
                  ),
                ]
              : [
                  BoxShadow(
                    color: Colors.grey.withOpacity(0.1),
                    blurRadius: 6,
                  ),
                ],
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Opacity(
              opacity: isEarned ? 1 : 0.5,
              child: ColorFiltered(
                colorFilter: isEarned
                    ? const ColorFilter.mode(Colors.transparent, BlendMode.dst)
                    : const ColorFilter.mode(Colors.grey, BlendMode.saturation),
                child: Hero(
                  tag: badge['icon'] ?? '',
                  child: Image.network(
                    badge['icon'] ?? '',
                    width: 56,
                    height: 56,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ),
            if (!isEarned)
              const Positioned(
                bottom: 8,
                right: 8,
                child: Icon(Icons.lock, color: Colors.grey, size: 20),
              ),
          ],
        ),
      ),
    );
  }
}

// --- LevelTile Widget ---
class _LevelTile extends StatelessWidget {
  final Map<String, dynamic> level;
  final bool isReached;
  const _LevelTile({required this.level, required this.isReached});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 400),
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isReached ? Colors.deepPurple[50] : Colors.grey[200],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isReached ? Colors.deepPurple : Colors.grey[400]!,
          width: 2,
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: isReached ? Colors.amber : Colors.grey[400],
            child: Text('${level['level'] ?? '?'}',
                style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Seviye ${level['level'] ?? '?'}',
                    style: GoogleFonts.figtree(fontWeight: FontWeight.bold)),
                Text('XP: ${level['xp'] ?? '???'}',
                    style: GoogleFonts.figtree(fontSize: 12)),
                if (level['features'] != null)
                  Text('Açılan: ${level['features']}',
                      style: GoogleFonts.figtree(
                          fontSize: 12, color: Colors.deepPurple)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// --- LeaderboardTile Widget ---
class _LeaderboardTile extends StatelessWidget {
  final Map<String, dynamic> user;
  final int rank;
  final bool highlight;
  final bool isMe;
  final bool fixed;
  const _LeaderboardTile(
      {required this.user,
      required this.rank,
      this.highlight = false,
      this.isMe = false,
      this.fixed = false});

  @override
  Widget build(BuildContext context) {
    Color borderColor;
    if (highlight && rank == 1) {
      borderColor = Colors.amber;
    } else if (highlight && rank == 2) {
      borderColor = Colors.grey;
    } else if (highlight && rank == 3) {
      borderColor = Colors.brown;
    } else if (isMe) {
      borderColor = Colors.deepPurple;
    } else {
      borderColor = Colors.grey[300]!;
    }
    return Container(
      margin: EdgeInsets.only(
          bottom: 12, left: fixed ? 0 : 8, right: fixed ? 0 : 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isMe ? Colors.deepPurple[50] : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor, width: 2),
        boxShadow: [
          if (highlight)
            BoxShadow(
              color: borderColor.withOpacity(0.2),
              blurRadius: 12,
              spreadRadius: 1,
            ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: borderColor,
            child: Text('$rank',
                style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(user['name'] ?? 'Kullanıcı',
                style: GoogleFonts.figtree(fontWeight: FontWeight.bold)),
          ),
          Text(user['score']?.toString() ?? '',
              style: GoogleFonts.figtree(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
