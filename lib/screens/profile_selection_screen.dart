import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import '../services/family_account_service.dart';
import '../models/student_profile.dart';
import '../theme/app_theme.dart';
import 'add_student_profile_screen.dart';
import '../widgets/main_layout.dart';

/// Profil seçim ekranı - hangi öğrenci profili ile devam edileceğini seçer
class ProfileSelectionScreen extends StatefulWidget {
  final bool isInitialSelection; // İlk seçim mi yoksa profil değiştirme mi?

  const ProfileSelectionScreen({
    Key? key,
    this.isInitialSelection = false,
  }) : super(key: key);

  @override
  State<ProfileSelectionScreen> createState() => _ProfileSelectionScreenState();
}

class _ProfileSelectionScreenState extends State<ProfileSelectionScreen> {
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadProfiles();
  }

  Future<void> _loadProfiles() async {
    final familyService = context.read<FamilyAccountService>();
    await familyService.loadAccountData();
  }

  Future<void> _selectProfile(StudentProfile profile) async {
    setState(() => _isLoading = true);

    try {
      final familyService = context.read<FamilyAccountService>();
      await familyService.switchToProfile(profile.profileId);

      if (mounted) {
        // Ana ekrana yönlendir
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => const MainLayout(),
          ),
        );
      }
    } catch (e) {
      _showErrorSnackBar('Bir hata oluştu: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _addNewProfile() async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (context) => AddStudentProfileScreen(
          onStudentAdded: (UserAccount account) {
            // Profiller listesini yenile
            _loadProfiles();
          },
        ),
      ),
    );

    if (result == true) {
      // Profiller listesini yenile
      await _loadProfiles();
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red.shade400,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Consumer<FamilyAccountService>(
          builder: (context, familyService, child) {
            if (familyService.isLoading) {
              return const Center(child: CircularProgressIndicator());
            }

            final profiles = familyService.studentProfiles;

            return SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 40),

                  // Başlık
                  Animate(
                    effects: const [
                      FadeEffect(duration: Duration(milliseconds: 600))
                    ],
                    child: Text(
                      widget.isInitialSelection
                          ? 'Hoş Geldiniz!'
                          : 'Hangi Profille Devam Etmek İstiyorsunuz?',
                      style: Theme.of(context).textTheme.displaySmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.getPrimaryTextColor(context),
                          ),
                      textAlign: TextAlign.center,
                    ),
                  ),

                  const SizedBox(height: 16),

                  Animate(
                    delay: const Duration(milliseconds: 200),
                    effects: const [
                      FadeEffect(duration: Duration(milliseconds: 600))
                    ],
                    child: Text(
                      'Öğrenci profilini seçin ve çalışmaya başlayın',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: AppTheme.getSecondaryTextColor(context),
                          ),
                      textAlign: TextAlign.center,
                    ),
                  ),

                  const SizedBox(height: 48),

                  // Profil kartları
                  if (profiles.isNotEmpty) ...[
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                        childAspectRatio: 0.85,
                      ),
                      itemCount: profiles.length,
                      itemBuilder: (context, index) {
                        final profile = profiles[index];
                        return _buildProfileCard(profile, index);
                      },
                    ),
                    const SizedBox(height: 32),
                  ],

                  // Yeni profil ekle butonu
                  Animate(
                    delay:
                        Duration(milliseconds: 400 + (profiles.length * 100)),
                    effects: const [
                      FadeEffect(duration: Duration(milliseconds: 600)),
                      SlideEffect(
                        begin: Offset(0, 0.2),
                        end: Offset.zero,
                        duration: Duration(milliseconds: 600),
                      ),
                    ],
                    child: _buildAddProfileButton(),
                  ),

                  const SizedBox(height: 40),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildProfileCard(StudentProfile profile, int index) {
    return Animate(
      delay: Duration(milliseconds: 300 + (index * 100)),
      effects: const [
        FadeEffect(duration: Duration(milliseconds: 600)),
        SlideEffect(
          begin: Offset(0, 0.3),
          end: Offset.zero,
          duration: Duration(milliseconds: 600),
        ),
      ],
      child: GestureDetector(
        onTap: _isLoading ? null : () => _selectProfile(profile),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: Theme.of(context).cardColor,
            border: Border.all(
              color: profile.isActive
                  ? AppTheme.primaryColor
                  : Theme.of(context).dividerColor,
              width: profile.isActive ? 2 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primaryColor.withOpacity(0.1),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Avatar
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppTheme.primaryColor.withOpacity(0.1),
                    border: Border.all(
                      color: AppTheme.primaryColor,
                      width: 3,
                    ),
                  ),
                  child: profile.avatarUrl != null
                      ? ClipOval(
                          child: Image.network(
                            profile.avatarUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                _buildDefaultAvatar(profile),
                          ),
                        )
                      : _buildDefaultAvatar(profile),
                ),

                const SizedBox(height: 16),

                // İsim
                Text(
                  profile.profileName,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.getPrimaryTextColor(context),
                      ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),

                const SizedBox(height: 8),

                // Sınıf
                Text(
                  profile.grade,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.getSecondaryTextColor(context),
                      ),
                ),

                const SizedBox(height: 12),

                // Durum badge'i
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: profile.isActive
                        ? AppTheme.primaryColor.withOpacity(0.1)
                        : Colors.grey.withOpacity(0.1),
                  ),
                  child: Text(
                    profile.isActive ? 'Aktif' : 'Pasif',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: profile.isActive
                              ? AppTheme.primaryColor
                              : Colors.grey,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDefaultAvatar(StudentProfile profile) {
    final initials = profile.profileName.isNotEmpty
        ? profile.profileName
            .split(' ')
            .map((e) => e[0])
            .take(2)
            .join()
            .toUpperCase()
        : '?';

    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor,
            AppTheme.primaryColor.withOpacity(0.7),
          ],
        ),
      ),
      child: Center(
        child: Text(
          initials,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 28,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildAddProfileButton() {
    return GestureDetector(
      onTap: _isLoading ? null : _addNewProfile,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: Theme.of(context).cardColor,
          border: Border.all(
            color: AppTheme.primaryColor.withOpacity(0.3),
            width: 2,
            style: BorderStyle.solid,
          ),
        ),
        child: Column(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.primaryColor.withOpacity(0.1),
              ),
              child: Icon(
                Icons.add,
                size: 32,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              '+ Yeni Öğrenci Profili Ekle',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppTheme.primaryColor,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Aile hesabınıza yeni bir öğrenci profili ekleyin',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.getSecondaryTextColor(context),
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
