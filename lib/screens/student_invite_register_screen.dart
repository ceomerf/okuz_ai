import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:okuz_ai/services/api_client.dart';
import 'package:okuz_ai/models/student_model.dart';
import 'package:okuz_ai/models/invite_token.dart';
import 'package:okuz_ai/screens/onboarding_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_animate/flutter_animate.dart';

class StudentInviteRegisterScreen extends StatefulWidget {
  final String token;

  const StudentInviteRegisterScreen({
    Key? key,
    required this.token,
  }) : super(key: key);

  @override
  State<StudentInviteRegisterScreen> createState() =>
      _StudentInviteRegisterScreenState();
}

class _StudentInviteRegisterScreenState
    extends State<StudentInviteRegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _ageController = TextEditingController();
  final TextEditingController _gradeController = TextEditingController();

  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  bool _isTokenValid = false;
  String _errorMessage = '';
  InviteToken? _inviteToken;
  String? _parentName;

  @override
  void initState() {
    super.initState();
    _verifyToken();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _ageController.dispose();
    _gradeController.dispose();
    super.dispose();
  }

  // Token doğrulama
  Future<void> _verifyToken() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final token = await _apiClient.verifyStudentInviteToken(widget.token);

      setState(() {
        _isTokenValid = true;
        _inviteToken = token;
        _parentName =
            token.parentId; // Gerçek uygulamada burada veli adını almalısınız
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

  // Öğrenci kaydı
  Future<void> _registerStudent() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final student = StudentModel(
        name: _nameController.text,
        age: int.parse(_ageController.text),
        grade: _gradeController.text,
        parentId: _inviteToken?.parentId,
        createdAt: DateTime.now(),
      );

      final registeredStudent =
          await _apiClient.registerStudent(widget.token, student);

      // Öğrenci bilgisini SharedPreferences'a kaydet
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('student_name', registeredStudent.name);
      await prefs.setInt('student_age', registeredStudent.age);
      await prefs.setString('student_grade', registeredStudent.grade);

      if (mounted) {
        // Başarılı kayıt sonrası onboarding ekranına yönlendir
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => const OnboardingScreen(
              isStudentAccount: true,
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
          'Öğrenci Kaydı',
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
              'Bu davet bağlantısı geçersiz veya süresi dolmuş olabilir. Lütfen velinden yeni bir davet bağlantısı iste.',
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
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    Icon(
                      Icons.school_rounded,
                      size: 48,
                      color: AppTheme.primaryColor,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Öğrenci Bilgileri',
                      style: GoogleFonts.figtree(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _parentName != null
                          ? '$_parentName seni Okuz.ai uygulamasına davet etti! Aşağıdaki bilgileri doldurarak hesabını oluşturabilirsin.'
                          : 'Okuz.ai uygulamasına hoş geldin! Aşağıdaki bilgileri doldurarak hesabını oluşturabilirsin.',
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
                    color: Colors.red.withValues(alpha: 0.1),
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
                  labelText: 'Adın',
                  hintText: 'Adını gir',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixIcon: const Icon(Icons.person_outline),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Lütfen adını gir';
                  }
                  return null;
                },
              ).animate().fadeIn(delay: 100.ms).slideX(begin: -0.2),
              const SizedBox(height: 16),
              TextFormField(
                controller: _ageController,
                decoration: InputDecoration(
                  labelText: 'Yaşın',
                  hintText: 'Yaşını gir',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixIcon: const Icon(Icons.cake_outlined),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Lütfen yaşını gir';
                  }
                  final age = int.tryParse(value);
                  if (age == null || age < 6 || age > 30) {
                    return 'Geçerli bir yaş gir (6-30)';
                  }
                  return null;
                },
              ).animate().fadeIn(delay: 200.ms).slideX(begin: -0.2),
              const SizedBox(height: 16),
              TextFormField(
                controller: _gradeController,
                decoration: InputDecoration(
                  labelText: 'Sınıf',
                  hintText: 'Sınıfını gir (örn: 9)',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixIcon: const Icon(Icons.school_outlined),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Lütfen sınıfını gir';
                  }
                  return null;
                },
              ).animate().fadeIn(delay: 300.ms).slideX(begin: -0.2),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _registerStudent,
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
