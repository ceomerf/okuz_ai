import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/onboarding_data.dart';
import '../../models/student_profile.dart';
import '../../models/account_type.dart';
import '../../theme/app_theme.dart';

class AccountTypeSelectionPage extends StatefulWidget {
  final OnboardingData data;
  final VoidCallback onNext;

  const AccountTypeSelectionPage({
    Key? key,
    required this.data,
    required this.onNext,
  }) : super(key: key);

  @override
  State<AccountTypeSelectionPage> createState() =>
      _AccountTypeSelectionPageState();
}

class _AccountTypeSelectionPageState extends State<AccountTypeSelectionPage> {
  AccountType? _selectedAccountType;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Text(
              'Hesap Tipinizi Seçin',
              style: GoogleFonts.figtree(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : const Color(0xFF2D3748),
              ),
            ).animate().fadeIn(duration: 600.ms).slideX(begin: -0.3),

            const SizedBox(height: 12),

            Text(
              'Size en uygun deneyimi sunabilmek için hesap tipinizi belirleyin.',
              style: GoogleFonts.figtree(
                fontSize: 16,
                color: isDark ? Colors.white70 : const Color(0xFF4A5568),
                height: 1.5,
              ),
            )
                .animate()
                .fadeIn(duration: 600.ms, delay: 200.ms)
                .slideX(begin: -0.3),

            const SizedBox(height: 40),

            // Account Type Options
            Column(
              children: [
                // Student Option
                _buildAccountTypeCard(
                  accountType: AccountType.student,
                  title: 'Öğrenci Hesabı',
                  description:
                      'Ben bir öğrenciyim ve kendi çalışma planımı yönetmek istiyorum',
                  icon: Icons.school_rounded,
                  features: [
                    'Kişisel çalışma planı',
                    'İlerleme takibi',
                    'Gamification sistemi',
                    'AI destekli içerik',
                  ],
                  color: const Color(0xFF3B82F6),
                  delay: 400.ms,
                ),

                const SizedBox(height: 20),

                // Parent Option
                _buildAccountTypeCard(
                  accountType: AccountType.parent,
                  title: 'Veli Hesabı',
                  description:
                      'Ben bir veliyim ve çocuğumun/çocuklarımın eğitimini takip etmek istiyorum',
                  icon: Icons.family_restroom_rounded,
                  features: [
                    'Çoklu öğrenci yönetimi',
                    'Detaylı ilerleme raporları',
                    'Ebeveyn kontrol paneli',
                    'Performans analizi',
                  ],
                  color: const Color(0xFF10B981),
                  delay: 600.ms,
                ),
              ],
            ),

            const SizedBox(height: 40),

            // Info Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF2D3748).withOpacity(0.5)
                    : const Color(0xFFF7FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark
                      ? const Color(0xFF4A5568)
                      : const Color(0xFFE2E8F0),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.info_outline_rounded,
                      color: AppTheme.primaryColor,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hesap Tipi Değiştirme',
                          style: GoogleFonts.figtree(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color:
                                isDark ? Colors.white : const Color(0xFF2D3748),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Bu seçimi daha sonra ayarlardan değiştirebilirsiniz.',
                          style: GoogleFonts.figtree(
                            fontSize: 12,
                            color: isDark
                                ? Colors.white70
                                : const Color(0xFF4A5568),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            )
                .animate()
                .fadeIn(duration: 600.ms, delay: 800.ms)
                .slideY(begin: 0.3),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountTypeCard({
    required AccountType accountType,
    required String title,
    required String description,
    required IconData icon,
    required List<String> features,
    required Color color,
    required Duration delay,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isSelected = _selectedAccountType == accountType;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedAccountType = accountType;
        });
        // Update the onboarding data
        widget.data.accountType = accountType;
        // onNext() çağrısını kaldırıyoruz - sadece selection yapacağız
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isSelected
              ? color.withValues(alpha: 0.1)
              : (isDark ? const Color(0xFF2D3748) : Colors.white),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? color
                : (isDark ? const Color(0xFF4A5568) : const Color(0xFFE2E8F0)),
            width: isSelected ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: isSelected
                  ? color.withValues(alpha: 0.2)
                  : (isDark ? Colors.black26 : Colors.black.withValues(alpha: 0.1)),
              blurRadius: isSelected ? 20 : 10,
              offset: const Offset(0, 8),
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
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    icon,
                    color: color,
                    size: 32,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.figtree(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: isSelected
                              ? color
                              : (isDark
                                  ? Colors.white
                                  : const Color(0xFF2D3748)),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        description,
                        style: GoogleFonts.figtree(
                          fontSize: 14,
                          color:
                              isDark ? Colors.white70 : const Color(0xFF4A5568),
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
                if (isSelected)
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.check,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 20),

            // Features List
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: features
                  .map((feature) => Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: color.withValues(alpha: 0.3),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.check_circle_outline,
                              color: color,
                              size: 16,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              feature,
                              style: GoogleFonts.figtree(
                                fontSize: 12,
                                color: color,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ))
                  .toList(),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 600.ms, delay: delay).slideY(begin: 0.3);
  }
}
