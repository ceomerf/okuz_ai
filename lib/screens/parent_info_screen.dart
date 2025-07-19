import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../services/family_account_service.dart';
import '../models/student_profile.dart';
import 'family_portal_screen.dart';

/// Veli Bilgi Ekranı - Veli kendi bilgilerini girer
class ParentInfoScreen extends StatefulWidget {
  const ParentInfoScreen({Key? key}) : super(key: key);

  @override
  State<ParentInfoScreen> createState() => _ParentInfoScreenState();
}

class _ParentInfoScreenState extends State<ParentInfoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _titleController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _titleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.getBackgroundColor(context),
      body: Container(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              children: [
                // Header
                _buildHeader()
                    .animate()
                    .fadeIn(duration: 600.ms)
                    .slideY(begin: -0.3),

                const SizedBox(height: 40),

                // Form
                Expanded(
                  child: Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        _buildFormCard()
                            .animate(delay: 200.ms)
                            .fadeIn(duration: 600.ms)
                            .slideY(begin: 0.3),

                        const Spacer(),

                        // Continue button
                        _buildContinueButton()
                            .animate(delay: 400.ms)
                            .fadeIn(duration: 600.ms)
                            .slideY(begin: 0.5),
                      ],
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

  Widget _buildHeader() {
    final primaryColor = Theme.of(context).colorScheme.primary;
    final textTheme = Theme.of(context).textTheme;

    return Column(
      children: [
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                primaryColor,
                primaryColor.withOpacity(0.8),
              ],
            ),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: primaryColor.withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: const Icon(
            Icons.family_restroom_rounded,
            size: 50,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 32),
        Text(
          'Aile Hesabınızı Oluşturalım',
          style: textTheme.displaySmall?.copyWith(
            fontWeight: FontWeight.bold,
            color: AppTheme.getPrimaryTextColor(context),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Bu hesap, çocuklarınızın profillerini yönetmek\nve gelişimlerini takip etmek için kullanılacaktır.',
          textAlign: TextAlign.center,
          style: textTheme.bodyLarge?.copyWith(
            color: AppTheme.getSecondaryTextColor(context),
            height: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _buildFormCard() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = Theme.of(context).colorScheme.primary;
    final cardColor = AppTheme.getCardColor(context);

    return Card(
      elevation: isDark ? 8 : 4,
      shadowColor: primaryColor.withOpacity(0.2),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      color: cardColor,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: primaryColor.withOpacity(0.1),
            width: 1,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Kişisel Bilgileriniz',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.getPrimaryTextColor(context),
                    ),
              ),

              const SizedBox(height: 24),

              // İsim alanı
              _buildTextField(
                controller: _nameController,
                label: 'Ad Soyad',
                icon: Icons.person,
                hint: 'Örn: Ayşe Yılmaz',
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Lütfen adınızı ve soyadınızı girin';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 20),

              // Unvan alanı (opsiyonel)
              _buildTextField(
                controller: _titleController,
                label: 'Unvan (Opsiyonel)',
                icon: Icons.work,
                hint: 'Örn: Dr., Öğretmen, Mühendis',
                validator: null, // Optional field
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required String hint,
    String? Function(String?)? validator,
  }) {
    final primaryColor = Theme.of(context).colorScheme.primary;

    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icon, color: primaryColor),
      ),
      style: Theme.of(context).textTheme.bodyLarge,
      validator: validator,
    );
  }

  Widget _buildContinueButton() {
    final primaryColor = Theme.of(context).colorScheme.primary;

    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _continue,
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 8,
          shadowColor: primaryColor.withOpacity(0.4),
        ),
        child: _isLoading
            ? const CircularProgressIndicator(color: Colors.white)
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Devam Et',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.arrow_forward_rounded, color: Colors.white),
                ],
              ),
      ),
    );
  }

  Future<void> _continue() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final familyService =
          Provider.of<FamilyAccountService>(context, listen: false);

      // Veli bilgilerini güncelle
      await familyService.updateParentInfo(
        fullName: _nameController.text.trim(),
        parentTitle: _titleController.text.trim().isNotEmpty
            ? _titleController.text.trim()
            : null,
      );

      if (mounted) {
        // İlk öğrenci ekleme ekranına git
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => FamilyPortalScreen(),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Bir hata oluştu: $e'),
            backgroundColor: Colors.red,
          ),
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
}
