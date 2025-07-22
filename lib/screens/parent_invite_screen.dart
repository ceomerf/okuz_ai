import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import 'plan_generation_screen.dart';
import 'profile_selection_screen.dart';

/// Veli Davet Ekranı - Öğrenciler velilerini davet edebilir veya pas geçebilir
class ParentInviteScreen extends StatefulWidget {
  final VoidCallback? onSkip;
  final Function(String)? onInvite;
  final String? accountType; // Hesap tipini ekle

  const ParentInviteScreen({
    Key? key,
    this.onSkip,
    this.onInvite,
    this.accountType, // Varsayılan olarak null (öğrenci hesabı)
  }) : super(key: key);

  @override
  State<ParentInviteScreen> createState() => _ParentInviteScreenState();
}

class _ParentInviteScreenState extends State<ParentInviteScreen> {
  final TextEditingController _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _showEmailField = false;
  bool _isLoading = false;
  bool _isKeyboardVisible = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    // Klavye durumunu dinle
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _setupKeyboardListener();
    });
  }

  void _setupKeyboardListener() {
    // Klavye durumunu takip et
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    setState(() {
      _isKeyboardVisible = keyboardHeight > 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Klavye durumunu kontrol et
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    _isKeyboardVisible = keyboardHeight > 0;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              const SizedBox(height: 20),

              // Header
              _buildHeader()
                  .animate()
                  .fadeIn(duration: 600.ms)
                  .slideY(begin: -0.3),

              const SizedBox(height: 40),

              // Content
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  child: Column(
                    children: [
                      const SizedBox(height: 5),
                      if (!_showEmailField) ...[
                        // Veli hesabı için farklı içerik
                        if (widget.accountType == 'parent') ...[
                          // Veli hesabı - direkt devam et
                          _buildOptionCard(
                            title: "Devam Et",
                            description:
                                "Veli hesabınız hazır. Ana ekrana geçebilirsiniz.",
                            icon: Icons.check_circle,
                            color: Colors.orange,
                            onTap: _handleSkip, // Direkt devam et
                            isDark: isDark,
                          )
                              .animate(delay: 200.ms)
                              .fadeIn(duration: 600.ms)
                              .slideX(begin: -0.3),
                        ] else ...[
                          // Öğrenci hesabı - veli daveti seçenekleri
                          _buildOptionCard(
                            title: "Velimi Davet Et",
                            description:
                                "Velin, çalışma planını takip edebilsin ve sana destek olsun",
                            icon: Icons.person_add,
                            color: Colors.orange,
                            onTap: _handleInviteParent,
                            isDark: isDark,
                          )
                              .animate(delay: 200.ms)
                              .fadeIn(duration: 600.ms)
                              .slideX(begin: -0.3),

                          const SizedBox(height: 20),

                          _buildOptionCard(
                            title: "Şimdilik Geç",
                            description:
                                "Daha sonra veli daveti gönderebilirsin",
                            icon: Icons.skip_next,
                            color: Colors.grey,
                            onTap: _handleSkip,
                            isDark: isDark,
                          )
                              .animate(delay: 400.ms)
                              .fadeIn(duration: 600.ms)
                              .slideX(begin: 0.3),
                        ],
                      ] else ...[
                        // Email input form
                        _buildEmailForm(isDark),
                      ],
                    ],
                  ),
                ),
              ),

              // Butonları sadece klavye kapalıyken göster
              if (_showEmailField && !_isKeyboardVisible) ...[
                // Navigation buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          setState(() {
                            _showEmailField = false;
                          });
                        },
                        child: Text(
                          'Geri',
                          style: GoogleFonts.figtree(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _sendInvite,
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Text(
                                'Davet Gönder',
                                style: GoogleFonts.figtree(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ],

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
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
                Colors.orange,
                Colors.deepOrange,
              ],
            ),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Colors.orange.withValues(alpha: 0.3),
                blurRadius: 30,
                offset: const Offset(0, 15),
              ),
            ],
          ),
          child: const Icon(
            Icons.family_restroom_rounded,
            color: Colors.white,
            size: 50,
          ),
        ).animate().scale(delay: 200.ms, duration: 600.ms),
        const SizedBox(height: 24),
        Text(
          widget.accountType == 'parent'
              ? 'Veli Hesabınız Hazır!'
              : 'Velini Davet Etmek İster misin?',
          textAlign: TextAlign.center,
          style: GoogleFonts.figtree(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            height: 1.3,
          ),
        ).animate().fadeIn(duration: 600.ms, delay: 400.ms).slideY(begin: 0.3),
        const SizedBox(height: 12),
        Text(
          widget.accountType == 'parent'
              ? 'Öğrenci profillerini ekleyebilir ve onların ilerlemesini takip edebilirsiniz.'
              : 'Velini davet edersen seni destekleyebilir ve çalışma planını takip edebilir.',
          textAlign: TextAlign.center,
          style: GoogleFonts.figtree(
            fontSize: 16,
            height: 1.5,
          ),
        ).animate().fadeIn(duration: 600.ms, delay: 600.ms).slideY(begin: 0.3),
      ],
    );
  }

  Widget _buildOptionCard({
    required String title,
    required String description,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Card(
        elevation: 4,
        shadowColor: color.withValues(alpha: 0.2),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  color.withValues(alpha: 0.1),
                  color.withValues(alpha: 0.05),
                ],
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: color.withValues(alpha: 0.3),
                      width: 2,
                    ),
                  ),
                  child: Icon(
                    icon,
                    size: 30,
                    color: color,
                  ),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.figtree(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: color,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        description,
                        style: GoogleFonts.figtree(
                          fontSize: 14,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios,
                  color: color.withValues(alpha: 0.7),
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmailForm(bool isDark) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Veli E-posta Adresi',
            style: GoogleFonts.figtree(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            style: GoogleFonts.figtree(fontSize: 16),
            decoration: InputDecoration(
              labelText: 'E-posta adresi',
              hintText: 'ornek@email.com',
              prefixIcon: const Icon(Icons.email_outlined),
              labelStyle: GoogleFonts.figtree(
                color: AppTheme.getSecondaryTextColor(context),
                fontSize: 16,
              ),
              floatingLabelStyle: GoogleFonts.figtree(
                color: Colors.orange,
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            validator: (value) {
              if (value?.isEmpty ?? true) {
                return 'E-posta adresi gerekli';
              }
              if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                  .hasMatch(value!)) {
                return 'Geçerli bir e-posta adresi girin';
              }
              return null;
            },
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.orange.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Colors.orange.withValues(alpha: 0.2),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline,
                  color: Colors.orange,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Velin bu e-posta adresine davet bağlantısı alacak.',
                    style: GoogleFonts.figtree(
                      fontSize: 11,
                      color: Colors.orange,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.3);
  }

  void _handleInviteParent() {
    setState(() {
      _showEmailField = true;
    });
  }

  void _handleSkip() {
    if (widget.accountType == 'parent') {
      // Veli hesabı - direkt profil seçim ekranına git
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => const ProfileSelectionScreen(),
        ),
      );
    } else if (widget.onSkip != null) {
      // Öğrenci hesabı - callback'i çağır
      widget.onSkip!();
    } else {
      // Varsayılan - plan oluşturma ekranına git
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => const PlanGenerationScreen(),
        ),
      );
    }
  }

  Future<void> _sendInvite() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      // Simüle edilmiş davet gönderme işlemi
      await Future.delayed(const Duration(seconds: 2));

      if (widget.onInvite != null) {
        widget.onInvite!(_emailController.text);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Davet başarıyla gönderildi!'),
            backgroundColor: AppTheme.successColor,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        );

        // Plan oluşturma ekranına geç
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => const PlanGenerationScreen(),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hata: $e'),
            backgroundColor: AppTheme.errorColor,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
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
