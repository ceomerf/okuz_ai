import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../providers/study_data_provider.dart';
import 'settings_screen.dart';
import 'subscription_screen.dart';
import 'package:okuz_ai/services/student_invite_service.dart';

// Profil ekranına veli davet butonunu ekle
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _universityController = TextEditingController();
  final TextEditingController _gradeController = TextEditingController();
  final TextEditingController _targetController = TextEditingController();
  final StudentInviteService _studentInviteService = StudentInviteService();
  bool _isLoading = false;

  bool _isEditing = false;
  User? _currentUser;

  @override
  void initState() {
    super.initState();
    _currentUser = FirebaseAuth.instance.currentUser;
    _loadUserData();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _universityController.dispose();
    _gradeController.dispose();
    _targetController.dispose();
    super.dispose();
  }

  void _loadUserData() {
    if (_currentUser != null) {
      _nameController.text = _currentUser!.displayName ?? 'Kullanıcı';
      _emailController.text = _currentUser!.email ?? '';
      // Bu veriler normalde Firestore'dan gelecek
      _universityController.text = 'İstanbul Üniversitesi';
      _gradeController.text = '12. Sınıf';
      _targetController.text = 'Tıp Fakültesi';
    }
  }

  // Veli davet işlemi
  Future<void> _inviteParent() async {
    setState(() {
      _isLoading = true;
    });

    try {
      await _studentInviteService.shareParentInviteLink();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Veli davet bağlantısı paylaşıldı')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Hata: ${e.toString()}')),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.background,
      appBar: AppBar(
        title: const Text('Profil'),
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: Icon(_isEditing ? Icons.save : Icons.edit),
            onPressed: _toggleEditMode,
          ),
        ],
      ),
      body: Consumer<StudyDataProvider>(
        builder: (context, provider, child) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Profil Kartı
                _buildProfileCard(provider, isDark),
                const SizedBox(height: 24),

                // İstatistikler
                _buildStatsCard(provider, isDark),
                const SizedBox(height: 24),

                // Kişisel Bilgiler
                _buildPersonalInfoCard(isDark),
                const SizedBox(height: 24),

                // Hızlı Erişim
                _buildQuickAccessCard(isDark),
                const SizedBox(height: 24),

                // Hesap İşlemleri
                _buildAccountActionsCard(isDark),
                const SizedBox(height: 32),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildProfileCard(StudyDataProvider provider, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor.withOpacity(0.1),
            AppTheme.primaryColor.withOpacity(0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppTheme.primaryColor.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Column(
        children: [
          // Avatar
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.primaryColor,
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primaryColor.withOpacity(0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: CircleAvatar(
              backgroundColor: AppTheme.primaryColor,
              radius: 40,
              child: Text(
                _nameController.text.isNotEmpty
                    ? _nameController.text.substring(0, 1).toUpperCase()
                    : 'K',
                style: GoogleFonts.poppins(
                  fontSize: 32,
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // İsim
          Text(
            _nameController.text,
            style: GoogleFonts.poppins(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).textTheme.titleLarge?.color,
            ),
          ),
          const SizedBox(height: 4),

          // E-posta
          Text(
            _emailController.text,
            style: TextStyle(
              fontSize: 14,
              color: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.color
                  ?.withOpacity(0.7),
            ),
          ),
          const SizedBox(height: 16),

          // Streak
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: AppTheme.primaryColor.withOpacity(0.3),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('🔥', style: TextStyle(fontSize: 16)),
                const SizedBox(width: 8),
                Text(
                  '${provider.currentStreak} günlük seri',
                  style: TextStyle(
                    color: AppTheme.primaryColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsCard(StudyDataProvider provider, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'İstatistikler',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildStatItem(
                  icon: Icons.timer,
                  title: 'Toplam Çalışma',
                  value:
                      '${provider.totalFocusMinutes + provider.totalManualMinutes} dk',
                ),
              ),
              Expanded(
                child: _buildStatItem(
                  icon: Icons.analytics,
                  title: 'Ortalama Süre',
                  value:
                      '${((provider.totalFocusMinutes + provider.totalManualMinutes) / 7).round()} dk/gün',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Column(
      children: [
        Icon(
          icon,
          color: AppTheme.primaryColor,
          size: 24,
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          title,
          style: TextStyle(
            fontSize: 12,
            color: Theme.of(context).textTheme.bodySmall?.color,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildPersonalInfoCard(bool isDark) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      elevation: 0,
      color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Kişisel Bilgiler',
                  style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                // Veli davet butonu
                ElevatedButton.icon(
                  onPressed: _isLoading ? null : _inviteParent,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: _isLoading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Icon(Icons.family_restroom, size: 18),
                  label: Text(
                    'Velimi Davet Et',
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildInfoField(
              icon: Icons.school,
              label: 'Üniversite',
              value: _universityController.text,
              controller: _universityController,
              enabled: _isEditing,
            ),
            const SizedBox(height: 12),
            _buildInfoField(
              icon: Icons.grade,
              label: 'Sınıf',
              value: _gradeController.text,
              controller: _gradeController,
              enabled: _isEditing,
            ),
            const SizedBox(height: 12),
            _buildInfoField(
              icon: Icons.flag,
              label: 'Hedef',
              value: _targetController.text,
              controller: _targetController,
              enabled: _isEditing,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoField({
    required IconData icon,
    required String label,
    required String value,
    required TextEditingController controller,
    required bool enabled,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          color: AppTheme.primaryColor,
          size: 20,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: enabled
              ? TextField(
                  controller: controller,
                  decoration: InputDecoration(
                    labelText: label,
                    border: const OutlineInputBorder(),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                  ),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).textTheme.bodySmall?.color,
                      ),
                    ),
                    Text(
                      value,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildQuickAccessCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Hızlı Erişim',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          _buildQuickAccessTile(
            icon: Icons.settings,
            title: 'Ayarlar',
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SettingsScreen()),
              );
            },
          ),
          _buildQuickAccessTile(
            icon: Icons.star,
            title: 'Premium Özellikler',
            onTap: _showPremiumDialog,
          ),
          _buildQuickAccessTile(
            icon: Icons.help,
            title: 'Yardım',
            onTap: _showHelpDialog,
          ),
        ],
      ),
    );
  }

  Widget _buildQuickAccessTile({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(
        icon,
        color: AppTheme.primaryColor,
      ),
      title: Text(title),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }

  Widget _buildAccountActionsCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Hesap İşlemleri',
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          _buildAccountActionTile(
            icon: Icons.logout,
            title: 'Çıkış Yap',
            color: Colors.red,
            onTap: _showLogoutDialog,
          ),
        ],
      ),
    );
  }

  Widget _buildAccountActionTile({
    required IconData icon,
    required String title,
    required Color color,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(
        icon,
        color: color,
      ),
      title: Text(
        title,
        style: TextStyle(color: color),
      ),
      onTap: onTap,
    );
  }

  void _toggleEditMode() {
    setState(() {
      _isEditing = !_isEditing;
    });

    if (!_isEditing) {
      // Kaydetme işlemi
      _saveUserData();
    }
  }

  void _saveUserData() {
    // Firestore'a kaydetme işlemi burada yapılacak
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Profil bilgileri kaydedildi'),
        backgroundColor: AppTheme.successColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _showPremiumDialog() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const SubscriptionScreen()),
    );
  }

  void _showHelpDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Yardım'),
        content: const Text('Yardım sayfasına yönlendirileceksiniz.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Yardım sayfasına yönlendir
            },
            child: const Text('Devam Et'),
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Çıkış Yap'),
        content: const Text('Hesabınızdan çıkmak istediğinizden emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);

              try {
                // Önce tüm stream'leri temizle
                final studyProvider =
                    Provider.of<StudyDataProvider>(context, listen: false);
                studyProvider.dispose();

                // Firebase Auth'tan çıkış yap
                await FirebaseAuth.instance.signOut();

                // Login ekranına yönlendir
                if (mounted) {
                  Navigator.of(context).pushNamedAndRemoveUntil(
                    '/login',
                    (route) => false,
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Çıkış yapılırken hata oluştu: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Çıkış Yap'),
          ),
        ],
      ),
    );
  }
}
