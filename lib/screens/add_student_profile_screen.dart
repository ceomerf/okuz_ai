import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../models/student_profile.dart';
import '../services/family_account_service.dart';
import 'family_portal_screen.dart';

class AddStudentProfileScreen extends StatefulWidget {
  final Function(UserAccount)? onStudentAdded;
  final bool isParentMode; // Veli tarafından açılıp açılmadığını belirtir

  const AddStudentProfileScreen({
    Key? key,
    this.onStudentAdded,
    this.isParentMode = false, // Varsayılan olarak false
  }) : super(key: key);

  @override
  State<AddStudentProfileScreen> createState() =>
      _AddStudentProfileScreenState();
}

class _AddStudentProfileScreenState extends State<AddStudentProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _targetUniversityController = TextEditingController();

  String _selectedGrade = '';
  String _selectedLearningStyle = '';
  bool _isLoading = false;

  final List<String> _grades = ['9', '10', '11', '12', 'Mezun'];
  final List<String> _learningStyles = [
    'Görsel Öğrenme',
    'İşitsel Öğrenme',
    'Kinestetik Öğrenme',
    'Okuma/Yazma Odaklı'
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _targetUniversityController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final familyService =
          Provider.of<FamilyAccountService>(context, listen: false);

      if (widget.isParentMode) {
        // Veli modu - sadece öğrenci profili oluştur
        await familyService.addStudent(
          studentUserId:
              DateTime.now().millisecondsSinceEpoch.toString(), // Geçici ID
          studentName: _nameController.text.trim(),
          studentEmail: _emailController.text.trim(),
          grade: _selectedGrade,
        );

        if (mounted) {
          // Başarı mesajı göster
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                  '${_nameController.text.trim()} profili başarıyla oluşturuldu!'),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 2),
            ),
          );

          // FamilyPortalScreen'e geri dön
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => const FamilyPortalScreen(),
            ),
          );
        }
      } else {
        // Öğrenci modu - normal onboarding akışına git
        // Öğrenci hesabı oluştur
        final studentAccount = UserAccount(
          userId: '', // Firestore'da oluşturulacak
          email: _emailController.text.trim(),
          fullName: _nameController.text.trim(),
          accountType: AccountType.student,
          createdAt: DateTime.now(),
          grade: _selectedGrade,
          learningStyle: _selectedLearningStyle,
        );

        // Öğrenciyi veli hesabına ekle
        await familyService.addStudent(
          studentUserId:
              DateTime.now().millisecondsSinceEpoch.toString(), // Geçici ID
          studentName: studentAccount.fullName,
          studentEmail: studentAccount.email,
          grade: studentAccount.grade ?? '',
        );

        if (mounted) {
          // Ana veli dashboard'una yönlendir
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(
              builder: (context) => const FamilyPortalScreen(),
            ),
            (route) => false,
          );
        }
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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor:
          isDark ? const Color(0xFF1A202C) : const Color(0xFFF7FAFC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Öğrenci Profili Ekle',
          style: GoogleFonts.figtree(
            color: isDark ? Colors.white : const Color(0xFF2D3748),
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Center(
                    child: Column(
                      children: [
                        Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                Color(0xFF3B82F6),
                                Color(0xFF1E40AF),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(50),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF3B82F6).withOpacity(0.3),
                                blurRadius: 20,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.school_rounded,
                            color: Colors.white,
                            size: 50,
                          ),
                        ).animate().scale(delay: 200.ms, duration: 600.ms),
                        const SizedBox(height: 20),
                        Text(
                          widget.isParentMode
                              ? 'Öğrenci Profili Ekle'
                              : 'İlk Öğrenci Profilini Oluştur',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.figtree(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color:
                                isDark ? Colors.white : const Color(0xFF2D3748),
                          ),
                        ).animate().fadeIn(duration: 600.ms, delay: 400.ms),
                      ],
                    ),
                  ),

                  const SizedBox(height: 40),

                  // Form fields
                  _buildTextField(
                    controller: _nameController,
                    label: 'Öğrenci Adı',
                    hint: 'Çocuğunuzun adı ve soyadı',
                    icon: Icons.person_outline,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Öğrenci adı gerekli';
                      }
                      return null;
                    },
                  ),

                  const SizedBox(height: 20),

                  _buildTextField(
                    controller: _emailController,
                    label: 'E-posta Adresi',
                    hint: 'ogrenci@email.com',
                    icon: Icons.email_outlined,
                    keyboardType: TextInputType.emailAddress,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'E-posta adresi gerekli';
                      }
                      if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                          .hasMatch(value)) {
                        return 'Geçerli bir e-posta adresi girin';
                      }
                      return null;
                    },
                  ),

                  const SizedBox(height: 20),

                  _buildDropdown(
                    label: 'Sınıf',
                    value: _selectedGrade,
                    items: _grades,
                    onChanged: (value) =>
                        setState(() => _selectedGrade = value!),
                    icon: Icons.school_outlined,
                  ),

                  const SizedBox(height: 20),

                  _buildTextField(
                    controller: _targetUniversityController,
                    label: 'Hedef Üniversite',
                    hint: 'Örn: İTÜ, Boğaziçi, ODTÜ',
                    icon: Icons.flag_outlined,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Hedef üniversite gerekli';
                      }
                      return null;
                    },
                  ),

                  const SizedBox(height: 20),

                  _buildDropdown(
                    label: 'Öğrenme Stili',
                    value: _selectedLearningStyle,
                    items: _learningStyles,
                    onChanged: (value) =>
                        setState(() => _selectedLearningStyle = value!),
                    icon: Icons.psychology_outlined,
                  ),

                  const SizedBox(height: 40),

                  // Submit button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _handleSubmit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 8,
                        shadowColor: AppTheme.primaryColor.withOpacity(0.3),
                      ),
                      child: _isLoading
                          ? const CircularProgressIndicator(color: Colors.white)
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.add_rounded),
                                const SizedBox(width: 8),
                                Text(
                                  widget.isParentMode
                                      ? 'Profili Ekle'
                                      : 'Öğrenci Profili Oluştur',
                                  style: GoogleFonts.figtree(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  )
                      .animate()
                      .fadeIn(duration: 600.ms, delay: 800.ms)
                      .slideY(begin: 0.3),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    String? Function(String?)? validator,
    TextInputType? keyboardType,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.figtree(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : const Color(0xFF2D3748),
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          validator: validator,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.figtree(
              color: isDark ? Colors.white54 : const Color(0xFF9CA3AF),
            ),
            prefixIcon: Icon(
              icon,
              color: AppTheme.primaryColor,
            ),
            filled: true,
            fillColor: isDark ? const Color(0xFF2D3748) : Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color:
                    isDark ? const Color(0xFF4A5568) : const Color(0xFFE2E8F0),
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color:
                    isDark ? const Color(0xFF4A5568) : const Color(0xFFE2E8F0),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: AppTheme.primaryColor,
                width: 2,
              ),
            ),
          ),
          style: GoogleFonts.figtree(
            color: isDark ? Colors.white : const Color(0xFF2D3748),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdown({
    required String label,
    required String value,
    required List<String> items,
    required Function(String?) onChanged,
    required IconData icon,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.figtree(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : const Color(0xFF2D3748),
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF2D3748) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? const Color(0xFF4A5568) : const Color(0xFFE2E8F0),
            ),
          ),
          child: DropdownButtonFormField<String>(
            value: value.isEmpty ? null : value,
            decoration: InputDecoration(
              prefixIcon: Icon(
                icon,
                color: AppTheme.primaryColor,
              ),
              border: InputBorder.none,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            ),
            hint: Text(
              'Seçiniz',
              style: GoogleFonts.figtree(
                color: isDark ? Colors.white54 : const Color(0xFF9CA3AF),
              ),
            ),
            dropdownColor: isDark ? const Color(0xFF2D3748) : Colors.white,
            style: GoogleFonts.figtree(
              color: isDark ? Colors.white : const Color(0xFF2D3748),
            ),
            items: items.map((String item) {
              return DropdownMenuItem<String>(
                value: item,
                child: Text(item),
              );
            }).toList(),
            onChanged: onChanged,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return '$label seçimi gerekli';
              }
              return null;
            },
          ),
        ),
      ],
    );
  }
}
