import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:okuz_ai/screens/user_plan_screen.dart';
import 'package:okuz_ai/screens/calendar_view_screen.dart';
import 'package:okuz_ai/screens/smart_tools_screen.dart';
import 'package:okuz_ai/screens/growth_hub_screen.dart';
import 'package:okuz_ai/screens/manual_study_log_screen.dart';

class MainLayout extends StatefulWidget {
  final int currentIndex;
  final Widget? child;

  const MainLayout({
    Key? key,
    this.currentIndex = 0,
    this.child,
  }) : super(key: key);

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.currentIndex;
  }

  @override
  void didUpdateWidget(MainLayout oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.currentIndex != oldWidget.currentIndex) {
      _currentIndex = widget.currentIndex;
    }
  }

  void _onNavItemTapped(int index) {
    if (index == _currentIndex) return;

    HapticFeedback.mediumImpact();

    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: widget.child ?? _getPageForIndex(_currentIndex),
      bottomNavigationBar: _buildModernBottomNavigation(isDark),
      floatingActionButton: _buildCompactFloatingActionButton(isDark),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
    );
  }

  Widget _getPageForIndex(int index) {
    switch (index) {
      case 0:
        return const UserPlanScreen();
      case 1:
        return const CalendarViewScreen();
      case 2:
        return const SmartToolsScreen();
      case 3:
        return const GrowthHubScreen();
      default:
        return const UserPlanScreen();
    }
  }

  Widget _buildModernBottomNavigation(bool isDark) {
    return Container(
      height: 70,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: isDark
              ? [
                  const Color(0xFF1A1F29), // AI araçları tarzı koyu mavi-gri
                  const Color(0xFF0F1419), // Çok koyu lacivert
                ]
              : [
                  Colors.white,
                  const Color(0xFFFFFBF0),
                ],
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? const Color(0xFF2C3E50).withOpacity(0.4) // Lacivert shadow
                : Colors.grey.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildNavigationItem(
            Icons.home,
            'Ana Sayfa',
            0,
            isDark,
          ),
          _buildNavigationItem(
            Icons.calendar_today,
            'Takvim',
            1,
            isDark,
          ),
          _buildNavigationItem(
            Icons.psychology,
            'AI Araçlar',
            2,
            isDark,
          ),
          _buildNavigationItem(
            Icons.trending_up,
            'Gelişim',
            3,
            isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildNavigationItem(
      IconData icon, String label, int index, bool isDark) {
    final isActive = index == _currentIndex;

    return Flexible(
      child: GestureDetector(
        onTap: () => _onNavItemTapped(index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: isActive
                    ? BoxDecoration(
                        color: isDark
                            ? const Color(0xFFF57C00)
                                .withOpacity(0.2) // Turuncu active bg
                            : const Color(0xFFF57C00).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      )
                    : null,
                child: Icon(
                  icon,
                  color: isActive
                      ? (isDark
                          ? const Color(0xFFF57C00) // Turuncu active icon
                          : const Color(0xFFF57C00))
                      : (isDark
                          ? Colors.white70 // Beyaz inactive icon
                          : Colors.grey[400]),
                  size: 20,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: GoogleFonts.figtree(
                  fontSize: 9,
                  color: isActive
                      ? (isDark
                          ? const Color(0xFFF57C00) // Turuncu active text
                          : const Color(0xFFF57C00))
                      : (isDark
                          ? Colors.white60 // Beyaz inactive text
                          : Colors.grey[400]),
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCompactFloatingActionButton(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [
                  const Color(0xFFF57C00), // Ana turuncu
                  const Color(0xFFE65100), // Koyu turuncu
                ]
              : [
                  const Color(0xFFF57C00),
                  const Color(0xFFE65100),
                ],
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? const Color(0xFFF57C00).withOpacity(0.4) // Turuncu shadow
                : const Color(0xFFF57C00).withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: FloatingActionButton(
        heroTag: "main_layout_fab",
        onPressed: () {
          HapticFeedback.mediumImpact();
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (context) => const ManualStudyLogScreen(),
          );
        },
        backgroundColor: Colors.transparent,
        elevation: 0,
        tooltip: 'Çevrimdışı Çalışma Ekle',
        child: const Icon(
          Icons.add,
          color: Colors.white,
          size: 24,
        ),
      ),
    );
  }
}
