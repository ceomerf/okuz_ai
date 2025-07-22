import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart' show themeNotifier;
import '../theme/app_theme.dart';
import '../providers/study_data_provider.dart';
import '../providers/subscription_provider.dart';
import '../services/family_account_service.dart';
import '../models/student_profile.dart';
import '../models/user_account.dart';
import '../screens/add_student_profile_screen.dart';
import 'profile_screen.dart';
import 'help_and_faq_screen.dart';
import 'about_screen.dart';
import 'subscription_screen.dart';
import 'parent_dashboard_screen.dart';
import 'login_screen.dart';
import 'package:flutter/foundation.dart' show kDebugMode;

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  // Bildirim ayarları
  bool _dailyPlanReminder = true;
  bool _weeklyReportNotification = true;
  bool _motivationalNotifications = true;
  bool _examReminders = true;
  bool _breakReminders = true;

  // Tema ayarları
  ThemeMode _selectedThemeMode = ThemeMode.system;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  void _loadSettings() {
    // SharedPreferences'ten ayarları yükle
    // Bu veriler normalde persistent storage'dan gelecek
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Modern SliverAppBar
          SliverAppBar(
            expandedHeight: 160,
            floating: false,
            pinned: true,
            backgroundColor: AppTheme.primaryColor,
            flexibleSpace: FlexibleSpaceBar(
              title: const Text(
                'Ayarlar',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppTheme.primaryColor,
                      AppTheme.primaryDarkColor,
                    ],
                  ),
                ),
                child: const Center(
                  child: Icon(
                    Icons.settings,
                    size: 60,
                    color: Colors.white30,
                  ),
                ),
              ),
            ),
          ),

          // Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const SizedBox(height: 16),

                  // Hesap Bölümü
                  _buildModernSection(
                    'Hesap',
                    Icons.person_outline,
                    [
                      _buildModernListTile(
                        icon: Icons.edit_outlined,
                        title: 'Profili Düzenle',
                        subtitle: 'Kişisel bilgilerini güncelle',
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) => const ProfileScreen()),
                          );
                        },
                      ),

                      // Aile Yönetimi Bölümü (Sadece family account'lar için)
                      Consumer<FamilyAccountService>(
                        builder: (context, familyService, child) {
                          if (familyService.isFamilyAccount) {
                            return Column(
                              children: [
                                _buildModernListTile(
                                  icon: Icons.family_restroom,
                                  title: 'Aile Yönetimi',
                                  subtitle:
                                      '${familyService.studentProfiles.length} öğrenci profili',
                                  onTap: () =>
                                      _showFamilyManagementDialog(context),
                                ),
                                _buildModernListTile(
                                  icon: Icons.person_add,
                                  title: 'Yeni Öğrenci Ekle',
                                  subtitle:
                                      'Aile hesabına öğrenci profili ekle',
                                  onTap: () => _addNewStudentProfile(context),
                                ),
                              ],
                            );
                          }
                          return const SizedBox.shrink();
                        },
                      ),

                      _buildModernListTile(
                        icon: Icons.star_outline,
                        title: 'Aboneliği Yönet',
                        subtitle: 'Premium özellikler ve planlar',
                        onTap: _showSubscriptionDialog,
                      ),

                      _buildModernListTile(
                        icon: Icons.logout,
                        title: 'Çıkış Yap',
                        subtitle: 'Hesabından çıkış yap',
                        onTap: _showLogoutDialog,
                        isDestructive: true,
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Bildirimler Bölümü
                  _buildModernSection(
                    'Bildirimler',
                    Icons.notifications_outlined,
                    [
                      _buildModernSwitchTile(
                        title: 'Günlük Plan Hatırlatıcısı',
                        subtitle: 'Her gün çalışma planı için hatırlatıcı',
                        value: _dailyPlanReminder,
                        onChanged: (value) {
                          setState(() {
                            _dailyPlanReminder = value;
                          });
                          _saveSettings();
                        },
                        icon: Icons.today_outlined,
                      ),
                      _buildModernSwitchTile(
                        title: 'Haftalık Rapor Bildirimi',
                        subtitle: 'Haftalık ilerleme raporu',
                        value: _weeklyReportNotification,
                        onChanged: (value) {
                          setState(() {
                            _weeklyReportNotification = value;
                          });
                          _saveSettings();
                        },
                        icon: Icons.analytics_outlined,
                      ),
                      _buildModernSwitchTile(
                        title: 'Motivasyonel Bildirimler',
                        subtitle: 'İlham verici mesajlar ve başarı kutlamaları',
                        value: _motivationalNotifications,
                        onChanged: (value) {
                          setState(() {
                            _motivationalNotifications = value;
                          });
                          _saveSettings();
                        },
                        icon: Icons.emoji_events_outlined,
                      ),
                      _buildModernSwitchTile(
                        title: 'Sınav Hatırlatıcıları',
                        subtitle: 'Yaklaşan sınavlar için bildirimler',
                        value: _examReminders,
                        onChanged: (value) {
                          setState(() {
                            _examReminders = value;
                          });
                          _saveSettings();
                        },
                        icon: Icons.assignment_outlined,
                      ),
                      _buildModernSwitchTile(
                        title: 'Mola Hatırlatıcıları',
                        subtitle: 'Uzun çalışma sürelerinde mola önerileri',
                        value: _breakReminders,
                        onChanged: (value) {
                          setState(() {
                            _breakReminders = value;
                          });
                          _saveSettings();
                        },
                        icon: Icons.timer_outlined,
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Görünüm Bölümü
                  _buildModernSection(
                    'Görünüm',
                    Icons.palette_outlined,
                    [
                      _buildModernListTile(
                        icon: Icons.dark_mode_outlined,
                        title: 'Tema',
                        subtitle: _getThemeModeText(),
                        onTap: _showThemeDialog,
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Premium Test Bölümü (Sadece geliştirme için)
                  if (kDebugMode) ...[
                    _buildModernSection(
                      'Test Özellikleri (Geliştirme)',
                      Icons.developer_mode,
                      [
                        Consumer<SubscriptionProvider>(
                          builder: (context, subscriptionProvider, _) {
                            return Column(
                              children: [
                                _buildModernListTile(
                                  icon: Icons.upgrade,
                                  title: 'Premium\'a Geç (Test)',
                                  subtitle:
                                      'Mevcut durum: ${subscriptionProvider.isPremium ? "Premium" : "Ücretsiz"}',
                                  onTap: () => _upgradeToPremium(context),
                                ),
                                _buildModernListTile(
                                  icon: Icons.refresh,
                                  title: 'Trial Başlat (Test)',
                                  subtitle: '7 günlük trial dönemi',
                                  onTap: () => _startTrial(context),
                                ),
                                _buildModernListTile(
                                  icon: Icons.info,
                                  title: 'Subscription Durumu',
                                  subtitle:
                                      'Tier: ${subscriptionProvider.subscriptionTier}, Trial: ${subscriptionProvider.isTrialActive ? "Aktif" : "Pasif"}',
                                  onTap: () {},
                                ),
                                _buildModernListTile(
                                  icon: Icons.star,
                                  title: 'Kurucu Üye Test',
                                  subtitle: 'Kurucu üye kampanyası test',
                                  onTap: () => _testFounderMembership(context),
                                ),
                              ],
                            );
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Destek Bölümü
                  _buildModernSection(
                    'Destek',
                    Icons.help_outline,
                    [
                      _buildModernListTile(
                        icon: Icons.quiz_outlined,
                        title: 'SSS (Sık Sorulan Sorular)',
                        subtitle: 'Yaygın soruların yanıtları',
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) => const HelpAndFAQScreen()),
                          );
                        },
                      ),
                      _buildModernListTile(
                        icon: Icons.info_outline,
                        title: 'Uygulama Hakkında',
                        subtitle: 'Versiyon bilgisi ve yasal dökümanlar',
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) => const AboutScreen()),
                          );
                        },
                      ),
                      _buildModernListTile(
                        icon: Icons.email_outlined,
                        title: 'Destek E-posta',
                        subtitle: 'Teknik destek için bize ulaşın',
                        onTap: _sendSupportEmail,
                      ),
                    ],
                  ),

                  const SizedBox(height: 32),

                  // Uygulama Versiyonu
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Theme.of(context).cardColor,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: Theme.of(context).dividerColor,
                        width: 0.5,
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.info_outline,
                          size: 16,
                          color: Theme.of(context).textTheme.bodySmall?.color,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'OKUZ AI - Versiyon 1.0.0',
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    fontWeight: FontWeight.w500,
                                  ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModernSection(
      String title, IconData icon, List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Header
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.primaryColor.withValues(alpha: 0.1),
                  AppTheme.primaryColor.withValues(alpha: 0.05),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    icon,
                    color: AppTheme.primaryColor,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppTheme.primaryColor,
                      ),
                ),
              ],
            ),
          ),

          // Section Content
          ...children,
        ],
      ),
    );
  }

  Widget _buildModernListTile({
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDestructive
                      ? Colors.red.withValues(alpha: 0.1)
                      : AppTheme.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: isDestructive ? Colors.red : AppTheme.primaryColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.color
                                  ?.withOpacity(0.7),
                            ),
                      ),
                    ],
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: Theme.of(context).textTheme.bodySmall?.color,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModernSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    required IconData icon,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: AppTheme.primaryColor,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.color
                            ?.withOpacity(0.7),
                      ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: AppTheme.primaryColor,
          ),
        ],
      ),
    );
  }

  String _getThemeModeText() {
    switch (_selectedThemeMode) {
      case ThemeMode.light:
        return 'Açık Tema';
      case ThemeMode.dark:
        return 'Koyu Tema';
      case ThemeMode.system:
        return 'Sistem Teması';
    }
  }

  void _showThemeDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Tema Seçimi'),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<ThemeMode>(
              title: const Text('Açık Tema'),
              value: ThemeMode.light,
              groupValue: _selectedThemeMode,
              activeColor: AppTheme.primaryColor,
              onChanged: (value) {
                setState(() {
                  _selectedThemeMode = value!;
                });
                themeNotifier.value = value!;
                Navigator.pop(context);
                _saveSettings();
              },
            ),
            RadioListTile<ThemeMode>(
              title: const Text('Koyu Tema'),
              value: ThemeMode.dark,
              groupValue: _selectedThemeMode,
              activeColor: AppTheme.primaryColor,
              onChanged: (value) {
                setState(() {
                  _selectedThemeMode = value!;
                });
                themeNotifier.value = value!;
                Navigator.pop(context);
                _saveSettings();
              },
            ),
            RadioListTile<ThemeMode>(
              title: const Text('Sistem Teması'),
              subtitle: const Text('Cihazın tema ayarını takip eder'),
              value: ThemeMode.system,
              groupValue: _selectedThemeMode,
              activeColor: AppTheme.primaryColor,
              onChanged: (value) {
                setState(() {
                  _selectedThemeMode = value!;
                });
                themeNotifier.value = value!;
                Navigator.pop(context);
                _saveSettings();
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'İptal',
              style: TextStyle(color: AppTheme.primaryColor),
            ),
          ),
        ],
      ),
    );
  }

  void _showSubscriptionDialog() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const SubscriptionScreen()),
    );
  }

  Future<void> _sendSupportEmail() async {
    final Uri emailUri = Uri(
      scheme: 'mailto',
      path: 'support@okuzai.com',
      queryParameters: {
        'subject': 'Okuz AI Destek Talebi',
        'body': 'Merhaba,\n\nUygulama ile ilgili bir sorun yaşıyorum:\n\n',
      },
    );

    if (await canLaunchUrl(emailUri)) {
      await launchUrl(emailUri);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('E-posta uygulaması bulunamadı'),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        );
      }
    }
  }

  void _saveSettings() {
    // SharedPreferences'e kaydet
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Ayarlar kaydedildi'),
        backgroundColor: AppTheme.successColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  // Aile yönetimi metodları
  void _showFamilyManagementDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => _buildFamilyManagementDialog(),
    );
  }

  Widget _buildFamilyManagementDialog() {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(context).cardColor,
              AppTheme.primaryColor.withValues(alpha: 0.05),
            ],
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.family_restroom,
                    color: AppTheme.primaryColor,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Text(
                  'Aile Yönetimi',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryColor,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Text(
              'Aile hesabınızda bulunan öğrenci profilleri:',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 16),

            // Öğrenci profilleri listesi
            Consumer<FamilyAccountService>(
              builder: (context, familyService, child) {
                final profiles = familyService.studentProfiles;

                if (profiles.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.grey.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(
                      child: Text('Henüz öğrenci profili bulunmuyor.'),
                    ),
                  );
                }

                return Container(
                  constraints: const BoxConstraints(maxHeight: 200),
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: profiles.length,
                    itemBuilder: (context, index) {
                      final profile = profiles[index];
                      final isSelected =
                          familyService.selectedProfileId == profile.profileId;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppTheme.primaryColor.withValues(alpha: 0.1)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected
                                ? AppTheme.primaryColor
                                : Colors.grey.withValues(alpha: 0.3),
                          ),
                        ),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AppTheme.primaryColor,
                            child: Text(
                              profile.profileName.isNotEmpty
                                  ? profile.profileName[0].toUpperCase()
                                  : '?',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          title: Text(
                            profile.profileName,
                            style: TextStyle(
                              fontWeight: isSelected
                                  ? FontWeight.w600
                                  : FontWeight.normal,
                            ),
                          ),
                          subtitle: Text(
                              '${profile.grade} • ${profile.academicTrack}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (isSelected)
                                Icon(Icons.check_circle,
                                    color: AppTheme.primaryColor),
                              const SizedBox(width: 8),
                              const Icon(Icons.arrow_forward_ios, size: 16),
                            ],
                          ),
                          onTap: () {
                            Navigator.of(context).pop();
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (context) => ParentDashboardScreen(
                                  profileId: profile.profileId,
                                  profileName: profile.profileName,
                                ),
                              ),
                            );
                          },
                        ),
                      );
                    },
                  ),
                );
              },
            ),

            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(
                    'Kapat',
                    style: TextStyle(color: AppTheme.primaryColor),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _addNewStudentProfile(BuildContext context) async {
    final result = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (context) => AddStudentProfileScreen(
          onStudentAdded: (UserAccount account) {
            // Reload the family service data
            final familyService =
                Provider.of<FamilyAccountService>(context, listen: false);
            familyService.loadAccountData();
          },
        ),
      ),
    );

    if (result != null && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Yeni öğrenci profili başarıyla oluşturuldu!'),
          backgroundColor: AppTheme.successColor,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      );
    }
  }

  // Premium test metodları
  void _upgradeToPremium(BuildContext context) async {
    // Mock implementation
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Premium abonelik başarıyla aktifleştirildi!'),
        backgroundColor: AppTheme.successColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  void _startTrial(BuildContext context) async {
    // Mock implementation
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('7 günlük trial başlatıldı!'),
        backgroundColor: AppTheme.successColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  void _testFounderMembership(BuildContext context) async {
    // Mock implementation
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Kurucu üye #42 olarak kaydoldunuz!'),
        backgroundColor: Colors.orange,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: Row(
            children: [
              Icon(
                Icons.logout,
                color: Colors.red,
                size: 24,
              ),
              const SizedBox(width: 12),
              const Text(
                'Çıkış Yap',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                ),
              ),
            ],
          ),
          content: const Text(
            'Hesabınızdan çıkış yapmak istediğinizden emin misiniz?\n\nTüm verileriniz güvende kalacak ve tekrar giriş yaparak kaldığınız yerden devam edebilirsiniz.',
            style: TextStyle(fontSize: 16),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(
                'İptal',
                style: TextStyle(
                  color: AppTheme.primaryColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.of(context).pop(); // Dialog'u kapat
                await _performLogout();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                'Çıkış Yap',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        );
      },
    );
  }

  Future<void> _performLogout() async {
    try {
      // Firebase Auth'dan çıkış yap
      // await FirebaseAuth.instance.signOut(); // Mock servis

      // Loading göster
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => const AlertDialog(
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Çıkış yapılıyor...'),
              ],
            ),
          ),
        );
      }

      // Kısa bir gecikme (kullanıcı deneyimi için)
      await Future.delayed(const Duration(seconds: 1));

      if (mounted) {
        // Loading dialog'unu kapat
        Navigator.of(context).pop();

        // Login ekranına yönlendir ve tüm geçmişi temizle
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const LoginScreen()),
          (Route<dynamic> route) => false,
        );

        // Başarı mesajı göster
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Başarıyla çıkış yapıldı'),
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
        // Hata durumunda loading dialog'unu kapat
        Navigator.of(context).pop();

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Çıkış yaparken hata: $e'),
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
}
