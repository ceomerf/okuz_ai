import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:image_picker/image_picker.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:io';
import '../theme/app_theme.dart';

class SOSQuestionSolverScreen extends StatefulWidget {
  const SOSQuestionSolverScreen({Key? key}) : super(key: key);

  @override
  State<SOSQuestionSolverScreen> createState() =>
      _SOSQuestionSolverScreenState();
}

class _SOSQuestionSolverScreenState extends State<SOSQuestionSolverScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  late AnimationController _pulseAnimationController;
  late Animation<double> _pulseAnimation;

  final TextEditingController _questionTextController = TextEditingController();
  final TextEditingController _subjectController = TextEditingController();
  final TextEditingController _topicController = TextEditingController();

  final ImagePicker _picker = ImagePicker();
  File? _selectedImage;
  String? _uploadedImageUrl;

  bool _isAnalyzing = false;
  bool _isUploading = false;
  Map<String, dynamic>? _analysisResult;

  // ExpansionPanel için state yönetimi
  List<bool> _panelStates = [false, false, false, false];
  int _currentActivePanel = -1;

  final List<String> _analysisSteps = [
    "Sorunuz AI tarafından inceleniyor...",
    "Adım adım çözüm hazırlanıyor...",
    "Kavramsal açıklamalar oluşturuluyor...",
    "Olası hatalar tespit ediliyor...",
    "Kişisel reçete hazırlanıyor...",
  ];
  int _currentStep = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);

    _pulseAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );

    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.1,
    ).animate(CurvedAnimation(
      parent: _pulseAnimationController,
      curve: Curves.easeInOut,
    ));
  }

  @override
  void dispose() {
    _tabController.dispose();
    _pulseAnimationController.dispose();
    _questionTextController.dispose();
    _subjectController.dispose();
    _topicController.dispose();
    super.dispose();
  }

  Future<bool> _checkPermissions(ImageSource source) async {
    if (source == ImageSource.camera) {
      final cameraStatus = await Permission.camera.status;
      if (cameraStatus != PermissionStatus.granted) {
        final result = await Permission.camera.request();
        return result == PermissionStatus.granted;
      }
      return true;
    } else {
      // Galeri izinleri için platform kontrolü
      if (Platform.isAndroid) {
        // Android cihazın SDK sürümünü kontrol et
        try {
          // Android 13+ (API 33+) için yeni medya izinleri
          final photos = await Permission.photos.status;
          if (photos != PermissionStatus.granted) {
            final result = await Permission.photos.request();
            if (result == PermissionStatus.granted) {
              return true;
            }
          } else {
            return true;
          }

          // Eğer photos izni çalışmazsa, eski storage iznini dene
          final storage = await Permission.storage.status;
          if (storage != PermissionStatus.granted) {
            final result = await Permission.storage.request();
            return result == PermissionStatus.granted;
          }
          return true;
        } catch (e) {
          print('İzin kontrolünde hata: $e');
          // Hata durumunda eski yöntemi dene
          try {
            final storage = await Permission.storage.status;
            if (storage != PermissionStatus.granted) {
              final result = await Permission.storage.request();
              return result == PermissionStatus.granted;
            }
            return true;
          } catch (e2) {
            print('Storage izni kontrolünde de hata: $e2');
            return false;
          }
        }
      } else {
        // iOS için galeri izni
        final photos = await Permission.photos.status;
        if (photos != PermissionStatus.granted) {
          final result = await Permission.photos.request();
          return result == PermissionStatus.granted;
        }
        return true;
      }
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      // Image picker'ın built-in izin sistemini kullan
      print(source == ImageSource.camera
          ? 'Kamera açılıyor...'
          : 'Galeri açılıyor...');

      final XFile? image = await _picker
          .pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
        preferredCameraDevice: CameraDevice.rear,
        requestFullMetadata: false, // Android 13+ uyumluluğu için
      )
          .timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw Exception('Görüntü seçme işlemi zaman aşımına uğradı');
        },
      );

      if (image != null) {
        print('Görüntü seçildi: ${image.path}');
        setState(() {
          _selectedImage = File(image.path);
        });

        // Başarı mesajı
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Görüntü başarıyla seçildi!'),
              backgroundColor: AppTheme.successColor,
              duration: const Duration(seconds: 2),
            ),
          );
        }
      } else {
        print('Kullanıcı görüntü seçmedi');
      }
    } on PlatformException catch (e) {
      print('Platform hatası: ${e.code} - ${e.message}');
      if (mounted) {
        String errorMessage = 'Görüntü seçilirken platform hatası oluştu';
        bool showSettingsButton = false;

        if (e.code == 'camera_access_denied') {
          errorMessage =
              'Kamera erişimi reddedildi. Lütfen ayarlardan kamera iznini verin.';
          showSettingsButton = true;
        } else if (e.code == 'photo_access_denied') {
          errorMessage =
              'Galeri erişimi reddedildi. Lütfen ayarlardan fotoğraf iznini verin.';
          showSettingsButton = true;
        } else if (e.code == 'invalid_source') {
          errorMessage = 'Geçersiz kaynak. Lütfen tekrar deneyin.';
        } else if (e.code == 'channel-error') {
          errorMessage = 'İletişim hatası. Uygulamayı yeniden başlatın.';
        } else if (e.message?.contains('permission') == true) {
          errorMessage = 'İzin hatası. Ayarlardan gerekli izinleri verin.';
          showSettingsButton = true;
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: AppTheme.errorColor,
            duration: const Duration(seconds: 4),
            action: showSettingsButton
                ? SnackBarAction(
                    label: 'AYARLAR',
                    textColor: Colors.white,
                    onPressed: () => openAppSettings(),
                  )
                : null,
          ),
        );
      }
    } catch (e) {
      print('Genel hata: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Görüntü seçilirken hata oluştu: $e'),
            backgroundColor: AppTheme.errorColor,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  Future<String?> _uploadImage() async {
    if (_selectedImage == null) return null;

    setState(() {
      _isUploading = true;
    });

    try {
      // Firebase Authentication kontrolü
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('Kullanıcı oturumu bulunamadı. Lütfen giriş yapın.');
      }

      final String fileName =
          'sos_questions/${user.uid}_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final Reference ref = FirebaseStorage.instance.ref().child(fileName);

      // Metadata ekle
      final metadata = SettableMetadata(
        contentType: 'image/jpeg',
        customMetadata: {
          'uploadedBy': user.uid,
          'uploadedAt': DateTime.now().toIso8601String(),
        },
      );

      final UploadTask uploadTask = ref.putFile(_selectedImage!, metadata);
      final TaskSnapshot snapshot = await uploadTask;

      final String downloadUrl = await snapshot.ref.getDownloadURL();

      setState(() {
        _uploadedImageUrl = downloadUrl;
        _isUploading = false;
      });

      return downloadUrl;
    } catch (e) {
      print('Upload hatası: $e');
      setState(() {
        _isUploading = false;
      });
      throw e;
    }
  }

  Future<void> _analyzQuestion() async {
    final questionText = _questionTextController.text.trim();
    final subject = _subjectController.text.trim();
    final topic = _topicController.text.trim();

    if (questionText.isEmpty && _selectedImage == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Lütfen soru metni girin veya görüntü seçin'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isAnalyzing = true;
      _currentStep = 0;
      _analysisResult = null;
    });

    _pulseAnimationController.repeat(reverse: true);
    _animateSteps();

    try {
      String? imageUrl;
      if (_selectedImage != null) {
        print('Görüntü yükleniyor...');
        imageUrl = await _uploadImage();
        print('Görüntü başarıyla yüklendi: $imageUrl');
      }

      print('SOS analizi başlatılıyor...');
      print(
          'Question: ${questionText.isNotEmpty ? questionText.substring(0, 50) : 'Boş'}...');
      print('Subject: $subject');
      print('Topic: $topic');
      print('Image URL: ${imageUrl ?? 'Yok'}');

      final callable =
          FirebaseFunctions.instance.httpsCallable('handleUserAction');

      final result = await callable.call({
        'actionType': 'SOS_BUTTON_PRESSED',
        'payload': {
          'questionText': questionText.isNotEmpty ? questionText : null,
          'imageUrl': imageUrl,
          'subject': subject.isNotEmpty ? subject : null,
          'topic': topic.isNotEmpty ? topic : null,
        },
      });

      print('Functions yanıtı alındı: ${result.data}');

      if (result.data != null && result.data is Map) {
        final responseData = Map<String, dynamic>.from(result.data);

        if (responseData['success'] == true &&
            responseData['sosData'] != null) {
          final sosData = Map<String, dynamic>.from(responseData['sosData']);

          setState(() {
            _analysisResult = sosData;
            _isAnalyzing = false;
          });

          _pulseAnimationController.stop();
          _pulseAnimationController.reset();

          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Analiz tamamlandı! 🎉'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        } else {
          throw Exception(
              'AI analizi başarısız: ${responseData['message'] ?? 'Bilinmeyen hata'}');
        }
      } else {
        throw Exception('Geçersiz yanıt formatı');
      }
    } on FirebaseFunctionsException catch (e) {
      print('Firebase Functions hatası: ${e.code} - ${e.message}');
      setState(() {
        _isAnalyzing = false;
      });

      _pulseAnimationController.stop();
      _pulseAnimationController.reset();

      String errorMessage = 'AI analizi sırasında hata oluştu';

      if (e.code == 'unauthenticated') {
        errorMessage = 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.';
      } else if (e.code == 'deadline-exceeded') {
        errorMessage = 'Analiz çok uzun sürdü. Daha kısa bir soru deneyin.';
      } else if (e.code == 'internal') {
        errorMessage =
            'AI servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: AppTheme.errorColor,
          duration: const Duration(seconds: 4),
          action: SnackBarAction(
            label: 'TEKRAR DENE',
            textColor: Colors.white,
            onPressed: () => _analyzQuestion(),
          ),
        ),
      );
    } catch (e) {
      print('Genel hata: $e');
      setState(() {
        _isAnalyzing = false;
      });

      _pulseAnimationController.stop();
      _pulseAnimationController.reset();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Beklenmeyen hata: ${e.toString()}'),
          backgroundColor: AppTheme.errorColor,
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  void _animateSteps() {
    if (_currentStep < _analysisSteps.length - 1) {
      Future.delayed(const Duration(milliseconds: 2000), () {
        if (mounted && _isAnalyzing) {
          setState(() {
            _currentStep++;
          });
          _animateSteps();
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('SOS Soru Çözücü'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline),
            onPressed: () => _showHelpDialog(),
          ),
        ],
      ),
      body:
          _analysisResult == null ? _buildInputScreen() : _buildResultScreen(),
      floatingActionButton: _analysisResult == null
          ? null
          : FloatingActionButton(
              heroTag: "sos_question_fab",
              onPressed: () {
                setState(() {
                  _analysisResult = null;
                  _selectedImage = null;
                  _uploadedImageUrl = null;
                  _questionTextController.clear();
                });
              },
              child: const Icon(Icons.add),
              tooltip: 'Yeni Soru',
            ),
    );
  }

  Widget _buildInputScreen() {
    final theme = Theme.of(context);

    if (_isAnalyzing) {
      return _buildAnalyzingScreen();
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Ana başlık
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppTheme.errorColor.withOpacity(0.1),
                  AppTheme.warningColor.withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: AppTheme.errorColor.withOpacity(0.2),
              ),
            ),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.errorColor.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.help_center,
                    color: AppTheme.errorColor,
                    size: 40,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'SOS Soru Çözücü & Teşhis Uzmanı',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.errorColor,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Sadece çözmekle kalmıyor, neden yapamadığınızı anlayıp size özel çözüm sunuyor.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.textTheme.bodyMedium?.color?.withOpacity(0.7),
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),

          const SizedBox(height: 32),

          // Ders ve konu girişi (opsiyonel)
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _subjectController,
                  decoration: InputDecoration(
                    labelText: 'Ders (Opsiyonel)',
                    hintText: 'Matematik, Fizik...',
                    prefixIcon: Icon(
                      Icons.book,
                      color: AppTheme.infoColor,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: TextField(
                  controller: _topicController,
                  decoration: InputDecoration(
                    labelText: 'Konu (Opsiyonel)',
                    hintText: 'Türev, Tork...',
                    prefixIcon: Icon(
                      Icons.topic,
                      color: AppTheme.successColor,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Soru girişi yöntemleri
          Card(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '📝 Soruyu Nasıl Eklemek İstersiniz?',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Metin girişi
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppTheme.primaryColor.withOpacity(0.2),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.edit,
                              color: AppTheme.primaryColor,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Metinle Girin',
                              style: theme.textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _questionTextController,
                          decoration: InputDecoration(
                            hintText:
                                'Sorunuzu buraya yazın...\n\nÖrn: "Bir cisim 10 m/s hızla hareket ediyor. 5 saniye sonra hızı 20 m/s oluyor. İvmesi nedir?"',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            filled: true,
                            fillColor: Colors.white,
                          ),
                          maxLines: 5,
                          textInputAction: TextInputAction.newline,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // VEYA ayırıcısı
                  Row(
                    children: [
                      Expanded(child: Divider(color: theme.dividerColor)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Text(
                          'VEYA',
                          style: theme.textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: theme.textTheme.bodySmall?.color
                                ?.withOpacity(0.6),
                          ),
                        ),
                      ),
                      Expanded(child: Divider(color: theme.dividerColor)),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Görüntü girişi
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.successColor.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppTheme.successColor.withOpacity(0.2),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.camera_alt,
                              color: AppTheme.successColor,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Fotoğraf Çekin',
                              style: theme.textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppTheme.successColor,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        if (_selectedImage != null) ...[
                          Container(
                            height: 200,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppTheme.successColor),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.file(
                                _selectedImage!,
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () => _pickImage(ImageSource.camera),
                                icon: const Icon(Icons.camera_alt),
                                label: const Text('Kamera'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.successColor,
                                  foregroundColor: Colors.white,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () =>
                                    _pickImage(ImageSource.gallery),
                                icon: const Icon(Icons.photo_library),
                                label: const Text('Galeri'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.infoColor,
                                  foregroundColor: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (_selectedImage != null) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.successColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.check_circle,
                                  color: AppTheme.successColor,
                                  size: 16,
                                ),
                                const SizedBox(width: 8),
                                const Expanded(
                                  child: Text(
                                      'Görüntü seçildi! OCR ile metin çıkarılacak.'),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 32),

          // Ana analiz butonu
          Container(
            width: double.infinity,
            height: 60,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.errorColor,
                  AppTheme.warningColor,
                ],
              ),
              borderRadius: BorderRadius.circular(30),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.errorColor.withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: _isUploading ? null : _analyzQuestion,
                borderRadius: BorderRadius.circular(30),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (_isUploading)
                        Container(
                          width: 24,
                          height: 24,
                          margin: const EdgeInsets.only(right: 12),
                          child: const CircularProgressIndicator(
                            strokeWidth: 3,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      else
                        Container(
                          margin: const EdgeInsets.only(right: 12),
                          child: const Icon(
                            Icons.psychology,
                            color: Colors.white,
                            size: 28,
                          ),
                        ),
                      Text(
                        _isUploading
                            ? 'Görüntü Yükleniyor...'
                            : 'SOS! Çöz ve Analiz Et 🆘',
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Bilgi kutusu
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.infoColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.infoColor.withOpacity(0.2),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.lightbulb_outline,
                      color: AppTheme.infoColor,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'SOS Sistemi Nasıl Çalışır?',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.infoColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text('🔥 ÇÖZÜM: Sorunuzu adım adım çözer'),
                const Text(
                    '🧠 ÖĞRETİM: Temel kavramları derinlemesine açıklar'),
                const Text(
                    '⚠️ TEŞHİS: Yapmış olabileceğiniz hataları belirler'),
                const Text('💊 REÇETE: Size özel çalışma planı önerir'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnalyzingScreen() {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppTheme.errorColor.withOpacity(0.1),
            AppTheme.warningColor.withOpacity(0.05),
          ],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Ana animasyon
            ScaleTransition(
              scale: _pulseAnimation,
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [
                      AppTheme.errorColor,
                      AppTheme.warningColor,
                    ],
                  ),
                ),
                child: const Center(
                  child: Icon(
                    Icons.psychology,
                    color: Colors.white,
                    size: 60,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 40),

            // Mevcut adım
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 500),
              child: Text(
                _analysisSteps[_currentStep],
                key: ValueKey(_currentStep),
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.errorColor,
                ),
                textAlign: TextAlign.center,
              ),
            ),

            const SizedBox(height: 24),

            // İlerleme çubuğu
            Container(
              width: 300,
              height: 6,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(3),
              ),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: (_currentStep + 1) / _analysisSteps.length,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppTheme.errorColor,
                        AppTheme.warningColor,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 16),

            Text(
              '${_currentStep + 1}/${_analysisSteps.length}',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppTheme.errorColor,
                fontWeight: FontWeight.w500,
              ),
            ),

            const SizedBox(height: 60),

            // Alt bilgi
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                'AI uzmanımız sorunuzu 4 farklı açıdan analiz ediyor. Bu, sadece cevabını değil, neden takıldığınızı da anlamamızı sağlıyor.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.textTheme.bodySmall?.color?.withOpacity(0.7),
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultScreen() {
    return Column(
      children: [
        // Sonuç başlığı
        Container(
          width: double.infinity,
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                AppTheme.successColor.withOpacity(0.1),
                AppTheme.primaryColor.withOpacity(0.05),
              ],
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: AppTheme.successColor.withOpacity(0.2),
            ),
          ),
          child: Column(
            children: [
              Icon(
                Icons.psychology,
                color: AppTheme.successColor,
                size: 40,
              ),
              const SizedBox(height: 12),
              Text(
                '🎉 AI Analizi Tamamlandı!',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.successColor,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                'Sorunuz 4 farklı açıdan analiz edildi. Aşağıdaki bölümleri inceleyin.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.color
                          ?.withOpacity(0.7),
                    ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),

        // ExpansionPanelList ile interaktif bölümler
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ExpansionPanelList(
              elevation: 4,
              expandedHeaderPadding: const EdgeInsets.all(0),
              animationDuration: const Duration(milliseconds: 300),
              children: [
                _buildSolutionPanel(),
                _buildTeachingPanel(),
                _buildDiagnosisPanel(),
                _buildPrescriptionPanel(),
              ],
              expansionCallback: (int index, bool isExpanded) {
                setState(() {
                  // Diğer panelleri kapat
                  for (int i = 0; i < _panelStates.length; i++) {
                    _panelStates[i] = false;
                  }
                  // Tıklanan paneli aç/kapat
                  _panelStates[index] = !isExpanded;
                  _currentActivePanel = !isExpanded ? index : -1;
                });
              },
            ),
          ),
        ),
      ],
    );
  }

  ExpansionPanel _buildSolutionPanel() {
    final stepByStepSolution =
        _analysisResult?['stepByStepSolution'] as List<dynamic>? ?? [];
    final questionAnalysis = _analysisResult?['questionAnalysis'] != null
        ? Map<String, dynamic>.from(_analysisResult!['questionAnalysis'] as Map)
        : <String, dynamic>{};

    return ExpansionPanel(
      isExpanded: _panelStates[0],
      canTapOnHeader: true,
      backgroundColor: AppTheme.successColor.withOpacity(0.05),
      headerBuilder: (context, isExpanded) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.successColor.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.assignment_turned_in,
                  color: AppTheme.successColor,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '🔥 Adım Adım Çözüm',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.successColor,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${stepByStepSolution.length} adımda detaylı çözüm',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.successColor.withOpacity(0.8),
                          ),
                    ),
                  ],
                ),
              ),
              Icon(
                isExpanded
                    ? Icons.keyboard_arrow_up
                    : Icons.keyboard_arrow_down,
                color: AppTheme.successColor,
              ),
            ],
          ),
        );
      },
      body: _buildSolutionContent(),
    );
  }

  Widget _buildSolutionContent() {
    final stepByStepSolution =
        _analysisResult?['stepByStepSolution'] as List<dynamic>? ?? [];
    final questionAnalysis = _analysisResult?['questionAnalysis'] != null
        ? Map<String, dynamic>.from(_analysisResult!['questionAnalysis'] as Map)
        : <String, dynamic>{};

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Başlık
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.successColor.withOpacity(0.1),
                  AppTheme.successColor.withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.assignment_turned_in,
                  color: AppTheme.successColor,
                  size: 40,
                ),
                const SizedBox(height: 12),
                Text(
                  '🔥 Adım Adım Çözüm',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.successColor,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Ders: ${questionAnalysis['identifiedSubject'] ?? 'Genel'}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.successColor,
                        fontWeight: FontWeight.w500,
                      ),
                ),
                Text(
                  'Konu: ${questionAnalysis['identifiedTopic'] ?? 'Genel'}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.successColor,
                        fontWeight: FontWeight.w500,
                      ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Çözüm adımları
          ...stepByStepSolution.asMap().entries.map((entry) {
            final index = entry.key;
            final step = Map<String, dynamic>.from(entry.value as Map);

            return Container(
              margin: const EdgeInsets.only(bottom: 16),
              child: Card(
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppTheme.successColor,
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                '${index + 1}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 18,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Text(
                              'Adım ${index + 1}',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.successColor,
                                  ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        step['explanation'] ?? '',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              height: 1.6,
                            ),
                      ),
                      if (step['calculation'] != null &&
                          step['calculation'].toString().isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppTheme.successColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: AppTheme.successColor.withOpacity(0.3),
                            ),
                          ),
                          child: Text(
                            step['calculation'],
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  fontFamily: 'monospace',
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.successColor,
                                ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            );
          }).toList(),

          // Kopyala butonu
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _copySolution,
              icon: const Icon(Icons.copy),
              label: const Text('Çözümü Kopyala'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.successColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  ExpansionPanel _buildTeachingPanel() {
    final conceptualDeepDive = _analysisResult?['conceptualDeepDive'] != null
        ? Map<String, dynamic>.from(
            _analysisResult!['conceptualDeepDive'] as Map)
        : <String, dynamic>{};

    return ExpansionPanel(
      isExpanded: _panelStates[1],
      canTapOnHeader: true,
      backgroundColor: AppTheme.infoColor.withOpacity(0.05),
      headerBuilder: (context, isExpanded) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.infoColor.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.school,
                  color: AppTheme.infoColor,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '🧠 Bunu Biliyor muydun?',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.infoColor,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Temel kavramlar ve formüller',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.infoColor.withOpacity(0.8),
                          ),
                    ),
                  ],
                ),
              ),
              Icon(
                isExpanded
                    ? Icons.keyboard_arrow_up
                    : Icons.keyboard_arrow_down,
                color: AppTheme.infoColor,
              ),
            ],
          ),
        );
      },
      body: _buildTeachingContent(),
    );
  }

  Widget _buildTeachingContent() {
    final conceptualDeepDive = _analysisResult?['conceptualDeepDive'] != null
        ? Map<String, dynamic>.from(
            _analysisResult!['conceptualDeepDive'] as Map)
        : <String, dynamic>{};

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Başlık
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.infoColor.withOpacity(0.1),
                  AppTheme.infoColor.withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.school,
                  color: AppTheme.infoColor,
                  size: 40,
                ),
                const SizedBox(height: 12),
                Text(
                  '🧠 Kavramsal Öğretim',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.infoColor,
                      ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Bu soruyu çözmek için bilmeniz gereken temel kavramlar',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Ana kavram
          Card(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.key,
                        color: AppTheme.infoColor,
                        size: 24,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          conceptualDeepDive['title'] ?? 'Anahtar Kavram',
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.infoColor,
                                  ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    conceptualDeepDive['explanation'] ?? '',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          height: 1.6,
                        ),
                  ),
                  if (conceptualDeepDive['formula'] != null &&
                      conceptualDeepDive['formula'].toString().isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.infoColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppTheme.infoColor.withOpacity(0.3),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '📐 Temel Formül',
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.infoColor,
                                ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            conceptualDeepDive['formula'],
                            style:
                                Theme.of(context).textTheme.bodyLarge?.copyWith(
                                      fontFamily: 'monospace',
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.infoColor,
                                    ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Kopyala butonu
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _copyTeaching,
              icon: const Icon(Icons.copy),
              label: const Text('Öğretimi Kopyala'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.infoColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  ExpansionPanel _buildDiagnosisPanel() {
    final commonPitfalls =
        _analysisResult?['commonPitfalls'] as List<dynamic>? ?? [];

    return ExpansionPanel(
      isExpanded: _panelStates[2],
      canTapOnHeader: true,
      backgroundColor: AppTheme.warningColor.withOpacity(0.05),
      headerBuilder: (context, isExpanded) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.warningColor.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.warning_amber,
                  color: AppTheme.warningColor,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '⚠️ Dikkat! Yaygın Hatalar',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.warningColor,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${commonPitfalls.length} yaygın tuzak tespit edildi',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.warningColor.withOpacity(0.8),
                          ),
                    ),
                  ],
                ),
              ),
              Icon(
                isExpanded
                    ? Icons.keyboard_arrow_up
                    : Icons.keyboard_arrow_down,
                color: AppTheme.warningColor,
              ),
            ],
          ),
        );
      },
      body: _buildDiagnosisContent(),
    );
  }

  Widget _buildDiagnosisContent() {
    final commonPitfalls =
        _analysisResult?['commonPitfalls'] as List<dynamic>? ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Başlık
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.warningColor.withOpacity(0.1),
                  AppTheme.warningColor.withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.warning_amber,
                  color: AppTheme.warningColor,
                  size: 40,
                ),
                const SizedBox(height: 12),
                Text(
                  '⚠️ Hata Teşhisi',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.warningColor,
                      ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Bu tip sorularda en sık yapılan hatalar ve çözümleri',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Yaygın hatalar
          ...commonPitfalls.asMap().entries.map((entry) {
            final index = entry.key;
            final pitfall = Map<String, dynamic>.from(entry.value as Map);

            return Container(
              margin: const EdgeInsets.only(bottom: 16),
              child: Card(
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.warningColor.withOpacity(0.2),
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              '${index + 1}',
                              style: TextStyle(
                                color: AppTheme.warningColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Text(
                              pitfall['mistake'] ?? '',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.warningColor,
                                  ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        pitfall['description'] ?? '',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              height: 1.6,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),

          if (commonPitfalls.isEmpty) ...[
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Icon(
                      Icons.check_circle,
                      color: AppTheme.successColor,
                      size: 60,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Bu soru için yaygın hata bulunmadı!',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.successColor,
                          ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Bu tür sorular genellikle doğru çözülüyor.',
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ],

          const SizedBox(height: 24),

          // Kopyala butonu
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _copyDiagnosis,
              icon: const Icon(Icons.copy),
              label: const Text('Teşhisi Kopyala'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.warningColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  ExpansionPanel _buildPrescriptionPanel() {
    final prescription = _analysisResult?['actionablePrescription'] != null
        ? Map<String, dynamic>.from(
            _analysisResult!['actionablePrescription'] as Map)
        : <String, dynamic>{};
    final task = prescription['task'] != null
        ? Map<String, dynamic>.from(prescription['task'] as Map)
        : <String, dynamic>{};

    return ExpansionPanel(
      isExpanded: _panelStates[3],
      canTapOnHeader: true,
      backgroundColor: AppTheme.errorColor.withOpacity(0.05),
      headerBuilder: (context, isExpanded) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.errorColor.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.medical_services,
                  color: AppTheme.errorColor,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '💊 Eylem Planım',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.errorColor,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Size özel ${_getTaskActionText(task['type'])}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.errorColor.withOpacity(0.8),
                          ),
                    ),
                  ],
                ),
              ),
              Icon(
                isExpanded
                    ? Icons.keyboard_arrow_up
                    : Icons.keyboard_arrow_down,
                color: AppTheme.errorColor,
              ),
            ],
          ),
        );
      },
      body: _buildPrescriptionContent(),
    );
  }

  Widget _buildPrescriptionContent() {
    final prescription = _analysisResult?['actionablePrescription'] != null
        ? Map<String, dynamic>.from(
            _analysisResult!['actionablePrescription'] as Map)
        : <String, dynamic>{};
    final task = prescription['task'] != null
        ? Map<String, dynamic>.from(prescription['task'] as Map)
        : <String, dynamic>{};

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Başlık
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.errorColor.withOpacity(0.1),
                  AppTheme.errorColor.withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.medical_services,
                  color: AppTheme.errorColor,
                  size: 40,
                ),
                const SizedBox(height: 12),
                Text(
                  '💊 Kişisel Reçete',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.errorColor,
                      ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Size özel hazırlanmış eylem planı',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Teşhis
          Card(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.search,
                        color: AppTheme.errorColor,
                        size: 24,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          prescription['title'] ?? 'Durum Analizi',
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.errorColor,
                                  ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    prescription['recommendation'] ?? '',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          height: 1.6,
                        ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Eylem planı
          Card(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        _getTaskIcon(task['type']),
                        color: AppTheme.primaryColor,
                        size: 24,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Önerilen Eylem',
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.primaryColor,
                                  ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    task['description'] ?? '',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          height: 1.6,
                        ),
                  ),
                  if (task['title'] != null &&
                      task['title'].toString().isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppTheme.primaryColor.withOpacity(0.3),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '📚 Önerilen Kaynak',
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.primaryColor,
                                ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            task['title'],
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.primaryColor,
                                ),
                          ),
                          if (task['url'] != null &&
                              task['url'].toString().isNotEmpty) ...[
                            const SizedBox(height: 12),
                            _buildInteractiveTaskCard(task),
                          ],
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Kopyala butonu
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _copyPrescription,
              icon: const Icon(Icons.copy),
              label: const Text('Reçeteyi Kopyala'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.errorColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _getTaskIcon(String? type) {
    switch (type) {
      case 'video':
        return Icons.play_circle;
      case 'practice':
        return Icons.edit;
      case 'test':
        return Icons.quiz;
      default:
        return Icons.assignment;
    }
  }

  String _getTaskActionText(String? type) {
    switch (type) {
      case 'video':
        return 'Videoyu İzle';
      case 'practice':
        return 'Alıştırma Yap';
      case 'test':
        return 'Testi Çöz';
      default:
        return 'Kaynağa Git';
    }
  }

  Future<void> _openUrl(String url) async {
    try {
      final Uri uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );
      } else {
        throw 'URL açılamadı: $url';
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('URL açılırken hata oluştu: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  void _copySolution() {
    final stepByStepSolution =
        _analysisResult?['stepByStepSolution'] as List<dynamic>? ?? [];
    String content = '🔥 ADIM ADIM ÇÖZÜM\n\n';

    for (int i = 0; i < stepByStepSolution.length; i++) {
      final step = Map<String, dynamic>.from(stepByStepSolution[i] as Map);
      content += 'Adım ${i + 1}: ${step['explanation']}\n';
      if (step['calculation'] != null &&
          step['calculation'].toString().isNotEmpty) {
        content += '${step['calculation']}\n';
      }
      content += '\n';
    }

    Clipboard.setData(ClipboardData(text: content));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Çözüm panoya kopyalandı!'),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _copyTeaching() {
    final conceptualDeepDive = _analysisResult?['conceptualDeepDive'] != null
        ? Map<String, dynamic>.from(
            _analysisResult!['conceptualDeepDive'] as Map)
        : <String, dynamic>{};
    String content = '🧠 KAVRAMSAL ÖĞRETİM\n\n';
    content += '${conceptualDeepDive['title'] ?? ''}\n\n';
    content += '${conceptualDeepDive['explanation'] ?? ''}\n\n';
    if (conceptualDeepDive['formula'] != null) {
      content += 'Formül: ${conceptualDeepDive['formula']}\n';
    }

    Clipboard.setData(ClipboardData(text: content));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Öğretim panoya kopyalandı!'),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _copyDiagnosis() {
    final commonPitfalls =
        _analysisResult?['commonPitfalls'] as List<dynamic>? ?? [];
    String content = '⚠️ HATA TEŞHİSİ\n\n';

    for (int i = 0; i < commonPitfalls.length; i++) {
      final pitfall = Map<String, dynamic>.from(commonPitfalls[i] as Map);
      content += '${i + 1}. ${pitfall['mistake']}\n';
      content += '${pitfall['description']}\n\n';
    }

    Clipboard.setData(ClipboardData(text: content));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Teşhis panoya kopyalandı!'),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _copyPrescription() {
    final prescription = _analysisResult?['actionablePrescription'] != null
        ? Map<String, dynamic>.from(
            _analysisResult!['actionablePrescription'] as Map)
        : <String, dynamic>{};
    final task = prescription['task'] != null
        ? Map<String, dynamic>.from(prescription['task'] as Map)
        : <String, dynamic>{};

    String content = '💊 KİŞİSEL REÇETE\n\n';
    content += '${prescription['title'] ?? ''}\n\n';
    content += '${prescription['recommendation'] ?? ''}\n\n';
    content += 'Önerilen Eylem:\n${task['description'] ?? ''}\n\n';
    if (task['title'] != null) {
      content += 'Kaynak: ${task['title']}\n';
    }
    if (task['url'] != null) {
      content += 'Link: ${task['url']}\n';
    }

    Clipboard.setData(ClipboardData(text: content));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Reçete panoya kopyalandı!'),
        backgroundColor: Colors.green,
      ),
    );
  }

  Widget _buildInteractiveTaskCard(Map<String, dynamic> task) {
    final taskType = task['type'] as String?;
    final url = task['url'] as String?;
    final title = task['title'] as String? ?? '';
    final description = task['description'] as String? ?? '';

    if (taskType == 'video') {
      return Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.red.withOpacity(0.1),
              Colors.orange.withOpacity(0.05),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Colors.red.withOpacity(0.3),
          ),
        ),
        child: Column(
          children: [
            // Video preview/thumbnail area
            Container(
              height: 120,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.8),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Video thumbnail placeholder
                  Icon(
                    Icons.play_circle_filled,
                    color: Colors.white.withOpacity(0.9),
                    size: 60,
                  ),
                  // Play overlay
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.videocam,
                            color: Colors.white,
                            size: 16,
                          ),
                          const SizedBox(width: 4),
                          const Text(
                            'VIDEO',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Video info
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.red,
                        ),
                  ),
                  if (description.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      description,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: url != null ? () => _openUrl(url) : null,
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Videoyu İzle'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    } else if (taskType == 'quiz' || taskType == 'test') {
      return Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppTheme.primaryColor.withOpacity(0.1),
              AppTheme.accentColor.withOpacity(0.05),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppTheme.primaryColor.withOpacity(0.3),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              // Quiz icon area
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.quiz,
                  color: AppTheme.primaryColor,
                  size: 40,
                ),
              ),

              const SizedBox(height: 16),

              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                textAlign: TextAlign.center,
              ),

              if (description.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  description,
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
              ],

              const SizedBox(height: 16),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: url != null
                      ? () => _openUrl(url)
                      : () => _startQuickTest(),
                  icon: const Icon(Icons.rocket_launch),
                  label: const Text('Hızlı Testi Başlat'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    } else {
      // Default task card
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.primaryColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppTheme.primaryColor.withOpacity(0.3),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _getTaskIcon(taskType),
                  color: AppTheme.primaryColor,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                  ),
                ),
              ],
            ),
            if (description.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(description),
            ],
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: url != null ? () => _openUrl(url) : null,
                icon: const Icon(Icons.open_in_new),
                label: Text(_getTaskActionText(taskType)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      );
    }
  }

  void _startQuickTest() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Row(
          children: [
            Icon(
              Icons.quiz,
              color: AppTheme.primaryColor,
            ),
            const SizedBox(width: 12),
            const Text('Hızlı Test'),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Bu özellik yakında kullanıma sunulacak!'),
            SizedBox(height: 16),
            Text(
              'AI destekli kişiselleştirilmiş testler geliştiriliyor.',
              style: TextStyle(fontSize: 12),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tamam'),
          ),
        ],
      ),
    );
  }

  void _showHelpDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Row(
          children: [
            Icon(
              Icons.help_center,
              color: AppTheme.primaryColor,
            ),
            const SizedBox(width: 12),
            const Text('SOS Sistemi Nasıl Çalışır?'),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
                'SOS Soru Çözücü, sadece sorunuzu çözmekle kalmaz, size özel bir öğretmen deneyimi sunar:'),
            SizedBox(height: 16),
            Text('🔥 ÇÖZÜM: Sorunuzu adım adım, anlaşılır şekilde çözer'),
            SizedBox(height: 8),
            Text('🧠 ÖĞRETİM: Temel kavramları derinlemesine açıklar'),
            SizedBox(height: 8),
            Text('⚠️ TEŞHİS: Yaygın hataları ve nedenlerini belirler'),
            SizedBox(height: 8),
            Text('💊 REÇETE: Size özel çalışma planı önerir'),
            SizedBox(height: 16),
            Text(
                'Sorunuzu metin olarak yazabilir veya fotoğraf çekebilirsiniz.'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Anladım'),
          ),
        ],
      ),
    );
  }
}
