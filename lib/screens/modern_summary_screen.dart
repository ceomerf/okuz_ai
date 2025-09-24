import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:flutter_tts/flutter_tts.dart';
import '../models/summary_models.dart';
import '../providers/summary_provider.dart';
import '../theme/app_theme.dart';

class ModernSummaryScreen extends ConsumerStatefulWidget {
  const ModernSummaryScreen({super.key});

  @override
  ConsumerState<ModernSummaryScreen> createState() => _ModernSummaryScreenState();
}

class _ModernSummaryScreenState extends ConsumerState<ModernSummaryScreen>
    with TickerProviderStateMixin {
  SummarySourceType _selectedSourceType = SummarySourceType.text;
  SummaryFormat _selectedFormat = SummaryFormat.paragraph;
  SummaryLength _selectedLength = SummaryLength.medium;

  final TextEditingController _textController = TextEditingController();
  final TextEditingController _urlController = TextEditingController();
  final TextEditingController _topicController = TextEditingController();

  File? _selectedFile;
  late AnimationController _animationController;
  late AnimationController _pulseController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;
  late Animation<double> _pulseAnimation;

  // Speech to Text
  final SpeechToText _speechToText = SpeechToText();
  bool _speechEnabled = false;
  bool _isListening = false;

  // Text to Speech
  final FlutterTts _flutterTts = FlutterTts();
  bool _isSpeaking = false;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _initializeSpeech();
    _initializeTts();
  }

  void _initializeAnimations() {
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeOutCubic,
      ),
    );

    _slideAnimation = Tween<double>(begin: 50.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeOutCubic,
      ),
    );

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(
        parent: _pulseController,
        curve: Curves.easeInOut,
      ),
    );

    _animationController.forward();
    _pulseController.repeat(reverse: true);
  }

  void _initializeSpeech() async {
    if (!kIsWeb) {
      try {
        _speechEnabled = await _speechToText.initialize();
      } catch (e) {
        print('Speech to text initialization error: $e');
      }
    }
  }

  void _initializeTts() async {
    if (!kIsWeb) {
      try {
        await _flutterTts.setLanguage("tr-TR");
        await _flutterTts.setSpeechRate(0.5);
        await _flutterTts.setVolume(1.0);
        await _flutterTts.setPitch(1.0);
      } catch (e) {
        print('TTS initialization error: $e');
      }
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    _urlController.dispose();
    _topicController.dispose();
    _animationController.dispose();
    _pulseController.dispose();
    _speechToText.cancel();
    _flutterTts.stop();
    super.dispose();
  }

  Future<void> _startListening() async {
    if (!kIsWeb && _speechEnabled) {
      setState(() => _isListening = true);

      try {
        await _speechToText.listen(
          onResult: (result) {
            if (result.finalResult) {
              _textController.text = result.recognizedWords;
              setState(() => _isListening = false);
            }
          },
          localeId: "tr_TR",
        );
      } catch (e) {
        print('Speech listening error: $e');
        setState(() => _isListening = false);
      }
    }
  }

  Future<void> _stopListening() async {
    if (!kIsWeb) {
      try {
        await _speechToText.stop();
        setState(() => _isListening = false);
      } catch (e) {
        print('Speech stop error: $e');
        setState(() => _isListening = false);
      }
    }
  }

  Future<void> _speakSummary(String text) async {
    if (!kIsWeb) {
      try {
        if (_isSpeaking) {
          await _flutterTts.stop();
          setState(() => _isSpeaking = false);
        } else {
          setState(() => _isSpeaking = true);
          await _flutterTts.speak(text);
          _flutterTts.setCompletionHandler(() {
            setState(() => _isSpeaking = false);
          });
        }
      } catch (e) {
        print('TTS error: $e');
        setState(() => _isSpeaking = false);
      }
    }
  }

  Future<void> _pickPdfFile() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
      );

      if (result != null) {
        setState(() {
          _selectedFile = File(result.files.single.path!);
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(
                  child: Text('PDF dosyası seçildi: ${result.files.single.name}'),
                ),
              ],
            ),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Colors.green,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            margin: const EdgeInsets.all(16),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(
                child: Text('Dosya seçilirken hata oluştu: $e'),
              ),
            ],
          ),
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppTheme.errorColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          margin: const EdgeInsets.all(16),
        ),
      );
    }
  }

  void _generateSummary() {
    final notifier = ref.read(summaryProvider.notifier);

    String? sourceText;
    String? sourceUrl;
    File? sourceFile;

    switch (_selectedSourceType) {
      case SummarySourceType.text:
        sourceText = _textController.text;
        break;
      case SummarySourceType.url:
        sourceUrl = _urlController.text;
        break;
      case SummarySourceType.pdf:
        sourceFile = _selectedFile;
        break;
    }

    notifier.generateSummary(
      sourceType: _selectedSourceType,
      sourceText: sourceText,
      sourceUrl: sourceUrl,
      sourceFile: sourceFile,
      format: _selectedFormat,
      length: _selectedLength,
    );
  }

  @override
  Widget build(BuildContext context) {
    final summaryState = ref.watch(summaryProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark 
          ? AppTheme.darkBackgroundColor 
          : AppTheme.lightBackgroundColor,
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? [
                    AppTheme.darkBackgroundColor,
                    AppTheme.darkCardColor,
                    AppTheme.darkBackgroundColor,
                  ]
                : [
                    AppTheme.lightBackgroundColor,
                    AppTheme.lightCardColor,
                    AppTheme.lightBackgroundColor,
                  ],
          ),
        ),
        child: SafeArea(
          child: AnimatedBuilder(
            animation: _fadeAnimation,
            builder: (context, child) {
              return Transform.translate(
                offset: Offset(0, _slideAnimation.value),
                child: Opacity(
                  opacity: _fadeAnimation.value,
                  child: CustomScrollView(
                    slivers: [
                      _buildHeader(),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            children: [
                              _buildSourceTypeSelector(),
                              const SizedBox(height: 28),
                              _buildSourceInput(),
                              const SizedBox(height: 28),
                              _buildFormatOptions(),
                              const SizedBox(height: 36),
                              _buildGenerateButton(),
                              const SizedBox(height: 28),
                              if (summaryState is SummaryLoading) _buildLoadingIndicator(),
                              if (summaryState is SummaryLoaded) _buildSummaryResult(summaryState.response),
                              if (summaryState is SummaryError) _buildErrorWidget(summaryState.message),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return SliverAppBar(
      expandedHeight: 140,
      floating: false,
      pinned: true,
      backgroundColor: Colors.transparent,
      elevation: 0,
      flexibleSpace: FlexibleSpaceBar(
        title: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: LinearGradient(
              colors: [
                AppTheme.primaryColor,
                AppTheme.accentColor,
              ],
            ),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primaryColor.withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Text(
            'Özet Oluşturucu',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 20,
              letterSpacing: 0.5,
            ),
          ),
        ),
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: isDark
                  ? [
                      AppTheme.darkCardColor,
                      AppTheme.darkBackgroundColor,
                      AppTheme.darkCardColor,
                    ]
                  : [
                      AppTheme.lightCardColor,
                      AppTheme.lightBackgroundColor,
                      AppTheme.lightCardColor,
                    ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSourceTypeSelector() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  AppTheme.darkCardColor,
                  AppTheme.darkBackgroundColor,
                ]
              : [
                  AppTheme.lightCardColor,
                  AppTheme.lightBackgroundColor,
                ],
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withOpacity(0.4)
                : Colors.black.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    gradient: LinearGradient(
                      colors: [
                        AppTheme.primaryColor,
                        AppTheme.accentColor,
                      ],
                    ),
                  ),
                  child: Icon(
                    Icons.source_outlined,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Text(
                  'Kaynak Türü',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.lightTextPrimaryColor,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            SegmentedButton<SummarySourceType>(
              segments: [
                ButtonSegment(
                  value: SummarySourceType.text,
                  label: const Text('Metin'),
                  icon: const Icon(Icons.text_fields),
                ),
                ButtonSegment(
                  value: SummarySourceType.url,
                  label: const Text('Link'),
                  icon: const Icon(Icons.link),
                ),
                ButtonSegment(
                  value: SummarySourceType.pdf,
                  label: const Text('PDF'),
                  icon: const Icon(Icons.picture_as_pdf),
                ),
              ],
              selected: {_selectedSourceType},
              onSelectionChanged: (Set<SummarySourceType> newSelection) {
                setState(() {
                  _selectedSourceType = newSelection.first;
                });
              },
              style: ButtonStyle(
                backgroundColor: MaterialStateProperty.resolveWith<Color>((states) {
                  if (states.contains(MaterialState.selected)) {
                    return AppTheme.primaryColor;
                  }
                  return isDark 
                      ? AppTheme.darkCardColor
                      : AppTheme.lightCardColor;
                }),
                foregroundColor: MaterialStateProperty.resolveWith<Color>((states) {
                  if (states.contains(MaterialState.selected)) {
                    return Colors.white;
                  }
                  return isDark ? AppTheme.darkTextSecondaryColor : AppTheme.lightTextSecondaryColor;
                }),
                side: MaterialStateProperty.resolveWith<BorderSide>((states) {
                  if (states.contains(MaterialState.selected)) {
                    return BorderSide.none;
                  }
                  return BorderSide(
                    color: isDark ? AppTheme.darkDividerColor : AppTheme.lightDividerColor,
                    width: 1,
                  );
                }),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSourceInput() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withOpacity(0.3)
                : AppTheme.primaryColor.withOpacity(0.1),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Card(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        color: isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    _getSourceIcon(),
                    color: AppTheme.primaryColor,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    _getSourceTitle(),
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.lightTextPrimaryColor,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _buildSourceInputField(),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getSourceIcon() {
    switch (_selectedSourceType) {
      case SummarySourceType.text:
        return Icons.text_fields;
      case SummarySourceType.url:
        return Icons.link;
      case SummarySourceType.pdf:
        return Icons.picture_as_pdf;
    }
  }

  String _getSourceTitle() {
    switch (_selectedSourceType) {
      case SummarySourceType.text:
        return 'Metin Girişi';
      case SummarySourceType.url:
        return 'URL Girişi';
      case SummarySourceType.pdf:
        return 'PDF Dosyası';
    }
  }

  Widget _buildSourceInputField() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    switch (_selectedSourceType) {
      case SummarySourceType.text:
        return Column(
          children: [
            TextField(
              controller: _textController,
              maxLines: 8,
              decoration: InputDecoration(
                hintText: 'Özetlenecek metni buraya yazın...',
                hintStyle: TextStyle(
                  color: isDark ? Colors.white54 : Colors.grey.shade600,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(15),
                  borderSide: BorderSide(
                    color: isDark ? Colors.white24 : Colors.grey.shade300,
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(15),
                  borderSide: BorderSide(
                    color: isDark ? Colors.white24 : Colors.grey.shade300,
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(15),
                  borderSide: BorderSide(
                    color: isDark ? const Color(0xFF7986CB) : AppTheme.primaryColor,
                    width: 2,
                  ),
                ),
                filled: true,
                fillColor: isDark ? const Color(0xFF2A2A2A) : Colors.grey.shade50,
              ),
              style: TextStyle(
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _speechEnabled ? _startListening : null,
                    icon: Icon(_isListening ? Icons.mic : Icons.mic_none),
                    label: Text(_isListening ? 'Dinleniyor...' : 'Sesle Yaz'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isDark ? const Color(0xFF7986CB) : AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                if (_isListening) ...[
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: _stopListening,
                    icon: const Icon(Icons.stop),
                    label: const Text('Durdur'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        );

      case SummarySourceType.url:
        return TextField(
          controller: _urlController,
          decoration: InputDecoration(
            hintText: 'https://example.com/article',
            hintStyle: TextStyle(
              color: isDark ? Colors.white54 : Colors.grey.shade600,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(15),
              borderSide: BorderSide(
                color: isDark ? Colors.white24 : Colors.grey.shade300,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(15),
              borderSide: BorderSide(
                color: isDark ? Colors.white24 : Colors.grey.shade300,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(15),
              borderSide: BorderSide(
                color: isDark ? const Color(0xFF7986CB) : AppTheme.primaryColor,
                width: 2,
              ),
            ),
            filled: true,
            fillColor: isDark ? const Color(0xFF2A2A2A) : Colors.grey.shade50,
            prefixIcon: Icon(
              Icons.link,
              color: isDark ? Colors.white54 : Colors.grey.shade600,
            ),
          ),
          style: TextStyle(
            color: isDark ? Colors.white : Colors.black87,
          ),
        );

      case SummarySourceType.pdf:
        return Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                border: Border.all(
                  color: isDark ? Colors.white24 : Colors.grey.shade300,
                  style: BorderStyle.solid,
                ),
                borderRadius: BorderRadius.circular(15),
                color: isDark ? const Color(0xFF2A2A2A) : Colors.grey.shade50,
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.cloud_upload_outlined,
                    size: 48,
                    color: isDark ? Colors.white54 : Colors.grey.shade600,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _selectedFile != null
                        ? 'Seçilen dosya: ${_selectedFile!.path.split('/').last}'
                        : 'PDF dosyası seçin',
                    style: TextStyle(
                      color: isDark ? Colors.white70 : Colors.black87,
                      fontSize: 16,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: _pickPdfFile,
              icon: const Icon(Icons.file_upload),
              label: const Text('PDF Seç'),
              style: ElevatedButton.styleFrom(
                backgroundColor: isDark ? const Color(0xFF7986CB) : AppTheme.primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        );
    }
  }

  Widget _buildFormatOptions() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withOpacity(0.3)
                : AppTheme.primaryColor.withOpacity(0.1),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Card(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        color: isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.tune,
                    color: AppTheme.primaryColor,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Özet Ayarları',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.lightTextPrimaryColor,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
                              Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Format',
                                style: TextStyle(
                                  color: isDark ? AppTheme.darkTextSecondaryColor : AppTheme.lightTextSecondaryColor,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 8),
                              DropdownButtonFormField<SummaryFormat>(
                                value: _selectedFormat,
                                isExpanded: true,
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                ),
                                items: SummaryFormat.values.map((format) {
                                  return DropdownMenuItem(
                                    value: format,
                                    child: Text(
                                      format.displayName,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() {
                                      _selectedFormat = value;
                                    });
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Uzunluk',
                                style: TextStyle(
                                  color: isDark ? AppTheme.darkTextSecondaryColor : AppTheme.lightTextSecondaryColor,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 8),
                              DropdownButtonFormField<SummaryLength>(
                                value: _selectedLength,
                                isExpanded: true,
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                ),
                                items: SummaryLength.values.map((length) {
                                  return DropdownMenuItem(
                                    value: length,
                                    child: Text(
                                      length.displayName,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() {
                                      _selectedLength = value;
                                    });
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGenerateButton() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final summaryState = ref.watch(summaryProvider);
    final isLoading = summaryState is SummaryLoading;

    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: isLoading ? _pulseAnimation.value : 1.0,
          child: Container(
            width: double.infinity,
            height: 64,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppTheme.primaryColor,
                  AppTheme.accentColor,
                  AppTheme.primaryDarkColor,
                ],
              ),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primaryColor.withOpacity(0.4),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
                BoxShadow(
                  color: AppTheme.accentColor.withOpacity(0.2),
                  blurRadius: 30,
                  offset: const Offset(0, 15),
                ),
              ],
            ),
            child: ElevatedButton(
              onPressed: isLoading ? null : _generateSummary,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (isLoading)
                    const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        color: Colors.white.withOpacity(0.2),
                      ),
                      child: const Icon(
                        Icons.auto_awesome,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                  const SizedBox(width: 16),
                  Text(
                    isLoading ? 'Özet Oluşturuluyor...' : 'Özet Oluştur',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildLoadingIndicator() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: Theme.of(context).brightness == Brightness.dark
            ? const Color(0xFF1A1A1A)
            : Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text(
            'Özetiniz hazırlanıyor...',
            style: TextStyle(
              fontSize: 16,
              color: Theme.of(context).brightness == Brightness.dark
                  ? Colors.white70
                  : Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryResult(GenerateSummaryResponse response) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  AppTheme.darkCardColor,
                  AppTheme.darkBackgroundColor,
                  AppTheme.darkCardColor,
                ]
              : [
                  AppTheme.lightCardColor,
                  AppTheme.lightBackgroundColor,
                  AppTheme.lightCardColor,
                ],
        ),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.black.withOpacity(0.3) : Colors.black.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(28.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    gradient: LinearGradient(
                      colors: [
                        AppTheme.successColor,
                        AppTheme.primaryColor,
                      ],
                    ),
                  ),
                  child: Icon(
                    Icons.summarize,
                    color: Colors.white,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    'Özet Sonucu',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.lightTextPrimaryColor,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                Row(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        color: isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
                      ),
                      child: IconButton(
                        onPressed: () => _speakSummary(response.summary),
                        icon: Icon(
                          _isSpeaking ? Icons.volume_up : Icons.volume_up_outlined,
                          color: isDark ? AppTheme.darkTextSecondaryColor : AppTheme.lightTextSecondaryColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        color: isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
                      ),
                      child: IconButton(
                        onPressed: () {
                          // Share functionality
                        },
                        icon: Icon(
                          Icons.share,
                          color: isDark ? AppTheme.darkTextSecondaryColor : AppTheme.lightTextSecondaryColor,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: isDark ? AppTheme.darkCardColor : AppTheme.lightCardColor,
                border: Border.all(
                  color: isDark ? AppTheme.darkDividerColor : AppTheme.lightDividerColor,
                  width: 1,
                ),
              ),
              child: Text(
                response.summary,
                style: TextStyle(
                  fontSize: 16,
                  height: 1.7,
                  color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.lightTextPrimaryColor,
                  letterSpacing: 0.3,
                ),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                _buildStatCard(
                  'Orijinal',
                  '${response.originalLength} karakter',
                  Icons.description,
                  AppTheme.infoColor,
                ),
                const SizedBox(width: 12),
                _buildStatCard(
                  'Özet',
                  '${response.summaryLength} karakter',
                  Icons.summarize,
                  AppTheme.successColor,
                ),
                const SizedBox(width: 12),
                _buildStatCard(
                  'Küçültme',
                  '%${response.reductionPercentage.toStringAsFixed(1)}',
                  Icons.trending_down,
                  AppTheme.warningColor,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color iconColor) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? [
                    AppTheme.darkCardColor,
                    AppTheme.darkBackgroundColor,
                  ]
                : [
                    AppTheme.lightCardColor,
                    AppTheme.lightBackgroundColor,
                  ],
          ),
          border: Border.all(
            color: isDark ? AppTheme.darkDividerColor : AppTheme.lightDividerColor,
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: isDark ? Colors.black.withOpacity(0.2) : Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: iconColor.withOpacity(0.1),
              ),
              child: Icon(
                icon,
                size: 20,
                color: iconColor,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isDark ? AppTheme.darkTextLightColor : AppTheme.lightTextSecondaryColor,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: isDark ? AppTheme.darkTextPrimaryColor : AppTheme.lightTextPrimaryColor,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorWidget(String message) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: isDark ? const Color(0xFF1A1A1A) : Colors.white,
        border: Border.all(
          color: Colors.red.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Column(
        children: [
          Icon(
            Icons.error_outline,
            color: Colors.red,
            size: 48,
          ),
          const SizedBox(height: 16),
          Text(
            'Hata Oluştu',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.white70 : Colors.black87,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
} 