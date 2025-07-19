import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:okuz_ai/services/api_client.dart';
import 'package:okuz_ai/models/parent_model.dart';
import 'package:okuz_ai/models/parent_invite_token.dart';
import 'package:okuz_ai/screens/onboarding_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_animate/flutter_animate.dart';

class ParentInviteRegisterScreen extends StatefulWidget {
  final String token;

  const ParentInviteRegisterScreen({
    Key? key,
    required this.token,
  }) : super(key: key);

  @override
  State<ParentInviteRegisterScreen> createState() =>
      _ParentInviteRegisterScreenState();
}

class _ParentInviteRegisterScreenState
    extends State<ParentInviteRegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _relationController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();

  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  bool _isTokenValid = false;
  String _errorMessage = '';
  ParentInviteToken? _inviteToken;
  String? _studentName;

  // İlişki türleri
  final List<String> _relationTypes = ['Anne', 'Baba', 'Vasi', 'Diğer'];
  String _selectedRelation = 'Anne';

  @override
  void initState() {
    super.initState();
    _verifyToken();
    _relationController.text = _selectedRelation;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _relationController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  // Token doğrulama
  Future<void> _verifyToken() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final token = await _apiClient.verifyParentInviteToken(widget.token);

      setState(() {
        _isTokenValid = true;
        _inviteToken = token;
        _studentName = token
            .studentId; // Gerçek uygulamada burada öğrenci adını almalısınız
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isTokenValid = false;
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  // Veli kaydı
  Future<void> _registerParent() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final parent = ParentModel(
        name: _nameController.text,
        relation: _selectedRelation,
        phone: _phoneController.text,
        studentId: _inviteToken?.studentId,
        createdAt: DateTime.now(),
      );

      final registeredParent =
          await _apiClient.registerParent(widget.token, parent);

      // Veli bilgisini SharedPreferences'a kaydet
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('parent_name', registeredParent.name);
      await prefs.setString('parent_relation', registeredParent.relation);
      await prefs.setString('parent_phone', registeredParent.phone);

      // Onboarding durumunu kaydet
      await prefs.setBool('onboarding_completed', true);
      await prefs.setBool('is_parent_account', true);

      if (mounted) {
        // Başarılı kayıt sonrası onboarding ekranına yönlendir
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => const OnboardingScreen(
              isStudentAccount: false, // Veli hesabı
            ),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Veli Kaydı',
          style: GoogleFonts.figtree(
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : !_isTokenValid
              ? _buildInvalidTokenView()
              : _buildRegisterForm(isDark),
    );
  }

  Widget _buildInvalidTokenView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 80,
              color: Colors.red[300],
            ),
            const SizedBox(height: 24),
            Text(
              'Geçersiz Davet Bağlantısı',
              style: GoogleFonts.figtree(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'Bu davet bağlantısı geçersiz veya süresi dolmuş olabilir. Lütfen öğrencinizden yeni bir davet bağlantısı isteyin.',
              style: GoogleFonts.figtree(
                fontSize: 16,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Text(
              'Hata: $_errorMessage',
              style: GoogleFonts.figtree(
                fontSize: 14,
                color: Colors.red[300],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              ),
              child: Text(
                'Geri Dön',
                style: GoogleFonts.figtree(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ).animate().fadeIn().slideY(begin: 0.2),
      ),
    );
  }

  Widget _buildRegisterForm(bool isDark) {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    Icon(
                      Icons.family_restroom_rounded,
                      size: 48,
                      color: AppTheme.primaryColor,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Veli Bilgileri',
                      style: GoogleFonts.figtree(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _studentName != null
                          ? '$_studentName sizi Okuz.ai uygulamasına davet etti! Aşağıdaki bilgileri doldurarak hesabınızı oluşturabilirsiniz.'
                          : 'Okuz.ai uygulamasına hoş geldiniz! Öğrencinizin eğitim yolculuğunu takip etmek için lütfen aşağıdaki bilgileri doldurun.',
                      style: GoogleFonts.figtree(
                        fontSize: 14,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ).animate().fadeIn().slideY(begin: 0.2),
              const SizedBox(height: 24),
              if (_errorMessage.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _errorMessage,
                    style: GoogleFonts.figtree(
                      color: Colors.red[300],
                    ),
                    textAlign: TextAlign.center,
                  ),
                ).animate().fadeIn().shake(),
              const SizedBox(height: 24),
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: 'Adınız',
                  hintText: 'Adınızı girin',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixIcon: const Icon(Icons.person_outline),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Lütfen adınızı girin';
                  }
                  return null;
                },
              ).animate().fadeIn(delay: 100.ms).slideX(begin: -0.2),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _selectedRelation,
                decoration: InputDecoration(
                  labelText: 'Öğrenci ile İlişkiniz',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixIcon: const Icon(Icons.people_outline),
                ),
                items: _relationTypes.map((String type) {
                  return DropdownMenuItem<String>(
                    value: type,
                    child: Text(type),
                  );
                }).toList(),
                onChanged: (String? newValue) {
                  if (newValue != null) {
                    setState(() {
                      _selectedRelation = newValue;
                      _relationController.text = newValue;
                    });
                  }
                },
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Lütfen ilişki türünüzü seçin';
                  }
                  return null;
                },
              ).animate().fadeIn(delay: 200.ms).slideX(begin: -0.2),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phoneController,
                decoration: InputDecoration(
                  labelText: 'Telefon Numaranız',
                  hintText: '+90...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixIcon: const Icon(Icons.phone_outlined),
                ),
                keyboardType: TextInputType.phone,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Lütfen telefon numaranızı girin';
                  }
                  // Basit telefon numarası kontrolü
                  if (!value.startsWith('+') || value.length < 10) {
                    return 'Geçerli bir telefon numarası girin (+90...)';
                  }
                  return null;
                },
              ).animate().fadeIn(delay: 300.ms).slideX(begin: -0.2),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _registerParent,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : Text(
                        'Kaydı Tamamla',
                        style: GoogleFonts.figtree(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              )
                  .animate()
                  .fadeIn(delay: 400.ms)
                  .scale(begin: const Offset(0.9, 0.9)),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                },
                child: Text(
                  'Vazgeç',
                  style: GoogleFonts.figtree(
                    color: isDark ? Colors.white70 : Colors.grey[600],
                  ),
                ),
              ).animate().fadeIn(delay: 500.ms),
            ],
          ),
        ),
      ),
    );
  }
}
