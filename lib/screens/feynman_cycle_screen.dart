import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:okuz_ai/models/long_term_plan.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:dots_indicator/dots_indicator.dart';
import 'package:flutter_animate/flutter_animate.dart';

class FeynmanCycleScreen extends StatefulWidget {
  final DailyTask task;

  const FeynmanCycleScreen({Key? key, required this.task}) : super(key: key);

  @override
  _FeynmanCycleScreenState createState() => _FeynmanCycleScreenState();
}

class _FeynmanCycleScreenState extends State<FeynmanCycleScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _pageController.addListener(() {
      setState(() {
        _currentPage = _pageController.page?.round() ?? 0;
      });
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final feynmanSteps = widget.task.feynman;
    if (feynmanSteps == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: Text('Öğrenme adımları bulunamadı.')),
      );
    }

    final List<Widget> pages = [
      _buildExplanationPage(feynmanSteps.explanation),
      _buildAnalogyPage(feynmanSteps.analogyPrompt),
      _buildQuizPage(feynmanSteps.quiz),
    ];

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text(widget.task.topic, style: GoogleFonts.montserrat()),
        backgroundColor: AppTheme.backgroundColor,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: PageView(
              controller: _pageController,
              children: pages,
            ),
          ),
          _buildBottomControls(pages.length),
        ],
      ),
    );
  }

  Widget _buildBottomControls(int pageCount) {
    return Container(
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(26),
            spreadRadius: 1,
            blurRadius: 10,
          )
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _currentPage > 0
              ? TextButton.icon(
                  onPressed: () {
                    _pageController.previousPage(
                      duration: 300.ms,
                      curve: Curves.easeInOut,
                    );
                  },
                  icon: const Icon(Icons.arrow_back_ios),
                  label: const Text('Geri'),
                )
              : const SizedBox(width: 80), // Boşluk
          DotsIndicator(
            dotsCount: pageCount,
            position: _currentPage,
            decorator: DotsDecorator(
              activeColor: AppTheme.primaryColor,
              color: Colors.grey,
            ),
          ),
          _currentPage < pageCount - 1
              ? TextButton.icon(
                  onPressed: () {
                    _pageController.nextPage(
                      duration: 300.ms,
                      curve: Curves.easeInOut,
                    );
                  },
                  label: const Text('İleri'),
                  icon: const Icon(Icons.arrow_forward_ios),
                )
              : TextButton.icon(
                  onPressed: () {
                    // TODO: Görevi tamamlama mantığı
                    Navigator.pop(context);
                  },
                  label: const Text('Bitir'),
                  icon: const Icon(Icons.check_circle),
                  style: TextButton.styleFrom(
                      foregroundColor: AppTheme.primaryColor),
                ),
        ],
      ),
    );
  }

  Widget _buildExplanationPage(String explanation) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildStepHeader("📘", "Konuyu Anla"),
          const SizedBox(height: 16),
          Text(
            explanation,
            style: GoogleFonts.lato(
                fontSize: 17, height: 1.5, color: AppTheme.textSecondaryColor),
          ).animate().fadeIn(),
        ],
      ),
    );
  }

  Widget _buildAnalogyPage(String prompt) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildStepHeader("🧠", "Kendi Cümlelerinle Anlat"),
          const SizedBox(height: 16),
          Text(
            prompt,
            style: GoogleFonts.lato(
                fontSize: 17, height: 1.5, color: AppTheme.textSecondaryColor),
          ),
          const SizedBox(height: 24),
          TextField(
            maxLines: 8,
            decoration: InputDecoration(
              hintText: 'Konuyu burada bir çocuğa anlatır gibi açıkla...',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: AppTheme.cardColor,
            ),
          ).animate().fadeIn(),
        ],
      ),
    );
  }

  Widget _buildQuizPage(List<QuizQuestion> questions) {
    // Şimdilik sadece ilk soruyu gösterelim.
    if (questions.isEmpty) {
      return const Center(child: Text("Bu konu için quiz bulunmuyor."));
    }
    final question = questions.first;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildStepHeader("📝", "Bilgini Test Et"),
          const SizedBox(height: 16),
          Text(
            question.question,
            style: GoogleFonts.lato(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 24),
          ...question.options.map((option) {
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                title: Text(option),
                onTap: () {
                  // TODO: Cevap kontrolü ve geribildirim
                },
              ),
            );
          }).toList(),
        ],
      ).animate().fadeIn(),
    );
  }

  Widget _buildStepHeader(String icon, String title) {
    return Row(
      children: [
        Text(icon, style: const TextStyle(fontSize: 32)),
        const SizedBox(width: 12),
        Text(
          title,
          style: GoogleFonts.montserrat(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppTheme.primaryColor,
          ),
        ),
      ],
    ).animate().slideX(begin: -0.2);
  }
}
