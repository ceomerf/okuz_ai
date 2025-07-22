import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_theme.dart';
import '../models/long_term_plan.dart';

class AIRescheduleSuggestionsDialog extends StatefulWidget {
  final DailyTask task;
  final Map<String, dynamic> aiSuggestion;
  final Function(String newDate, String reason) onApplyReschedule;

  const AIRescheduleSuggestionsDialog({
    Key? key,
    required this.task,
    required this.aiSuggestion,
    required this.onApplyReschedule,
  }) : super(key: key);

  @override
  State<AIRescheduleSuggestionsDialog> createState() =>
      _AIRescheduleSuggestionsDialogState();
}

class _AIRescheduleSuggestionsDialogState
    extends State<AIRescheduleSuggestionsDialog> with TickerProviderStateMixin {
  late AnimationController _animationController;
  late AnimationController _sparkleController;
  String? _selectedRecommendation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _sparkleController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );

    _animationController.forward();
    _sparkleController.repeat();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _sparkleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final suggestions = widget.aiSuggestion['suggestion'] ?? {};
    final recommendations = suggestions['recommendations'] as List? ?? [];
    final motivationalMessage =
        suggestions['motivationalMessage'] as String? ?? '';
    final studyTips = suggestions['studyTips'] as List? ?? [];
    final weeklyAnalysis = suggestions['weeklyAnalysis'] as Map? ?? {};

    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.8,
        ),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.purple.shade50,
              Colors.blue.shade50,
              Colors.white,
            ],
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 20,
              spreadRadius: 5,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            _buildHeader(),

            // Content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // AI Analysis Banner
                    _buildAnalysisBanner(weeklyAnalysis),

                    const SizedBox(height: 24),

                    // Recommendations
                    _buildRecommendationsSection(recommendations),

                    const SizedBox(height: 24),

                    // Motivational Message
                    _buildMotivationalSection(motivationalMessage),

                    const SizedBox(height: 20),

                    // Study Tips
                    if (studyTips.isNotEmpty) _buildStudyTipsSection(studyTips),
                  ],
                ),
              ),
            ),

            // Actions
            _buildActions(),
          ],
        ),
      )
          .animate(controller: _animationController)
          .scale(begin: const Offset(0.8, 0.8))
          .fadeIn(),
    );
  }

  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24.0),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.purple.shade600, Colors.blue.shade600],
        ),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      child: Row(
        children: [
          // AI Icon with sparkle effect
          AnimatedBuilder(
            animation: _sparkleController,
            builder: (context, child) {
              return Transform.rotate(
                angle: _sparkleController.value * 2 * 3.14159,
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.psychology,
                    color: Colors.white,
                    size: 28,
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AI Koçun Analiz Etti! 🧠',
                  style: GoogleFonts.montserrat(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${widget.task.subject} - ${widget.task.topic}',
                  style: GoogleFonts.lato(
                    fontSize: 14,
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(
              Icons.close,
              color: Colors.white,
              size: 24,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnalysisBanner(Map weeklyAnalysis) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.blue.shade200,
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.analytics, color: Colors.blue.shade600, size: 20),
              const SizedBox(width: 8),
              Text(
                'Haftalık Program Analizi',
                style: GoogleFonts.montserrat(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.blue.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (weeklyAnalysis['currentLoad'] != null)
            _buildAnalysisItem(
              '⚡ Mevcut Yoğunluk',
              weeklyAnalysis['currentLoad'],
            ),
          if (weeklyAnalysis['lightestDay'] != null)
            _buildAnalysisItem(
              '📅 En Hafif Gün',
              weeklyAnalysis['lightestDay'],
            ),
          if (weeklyAnalysis['suggestedOptimization'] != null)
            _buildAnalysisItem(
              '💡 Öneri',
              weeklyAnalysis['suggestedOptimization'],
            ),
        ],
      ),
    );
  }

  Widget _buildAnalysisItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$label: ',
            style: GoogleFonts.lato(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Colors.blue.shade700,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: GoogleFonts.lato(
                fontSize: 14,
                color: Colors.blue.shade600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecommendationsSection(List recommendations) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Önerilen Alternatifler',
          style: GoogleFonts.montserrat(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimaryColor,
          ),
        ),
        const SizedBox(height: 16),
        ...recommendations.asMap().entries.map((entry) {
          final index = entry.key;
          final recommendation = entry.value;
          return _buildRecommendationCard(recommendation, index);
        }).toList(),
      ],
    );
  }

  Widget _buildRecommendationCard(Map recommendation, int index) {
    final isSelected = _selectedRecommendation == recommendation['date'];
    final confidence = recommendation['confidence'] as int? ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isSelected ? Colors.purple.shade50 : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isSelected ? Colors.purple.shade300 : Colors.grey.shade200,
          width: isSelected ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            spreadRadius: 1,
          ),
        ],
      ),
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedRecommendation =
                isSelected ? null : recommendation['date'];
          });
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Confidence indicator
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getConfidenceColor(confidence).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.star,
                          size: 14,
                          color: _getConfidenceColor(confidence),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '$confidence%',
                          style: GoogleFonts.lato(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: _getConfidenceColor(confidence),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  if (isSelected)
                    Icon(
                      Icons.check_circle,
                      color: Colors.purple.shade600,
                      size: 20,
                    ),
                ],
              ),
              const SizedBox(height: 12),

              // Date and day
              Row(
                children: [
                  Icon(
                    Icons.calendar_today,
                    size: 18,
                    color: Colors.grey.shade600,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${recommendation['dayName']} (${recommendation['date']})',
                    style: GoogleFonts.montserrat(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimaryColor,
                    ),
                  ),
                ],
              ),

              if (recommendation['timeSlot'] != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(
                      Icons.schedule,
                      size: 16,
                      color: Colors.grey.shade600,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      recommendation['timeSlot'],
                      style: GoogleFonts.lato(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ],

              const SizedBox(height: 12),

              // Reason
              Text(
                recommendation['reason'] ?? '',
                style: GoogleFonts.lato(
                  fontSize: 14,
                  color: AppTheme.getSecondaryTextColor(context),
                  height: 1.4,
                ),
              ),

              if (recommendation['additionalNotes'] != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.lightbulb_outline,
                        size: 16,
                        color: Colors.blue.shade600,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          recommendation['additionalNotes'],
                          style: GoogleFonts.lato(
                            fontSize: 12,
                            color: Colors.blue.shade600,
                          ),
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
    ).animate(delay: (index * 200).ms).slideX(begin: 0.3).fadeIn();
  }

  Color _getConfidenceColor(int confidence) {
    if (confidence >= 90) return Colors.green;
    if (confidence >= 70) return Colors.blue;
    if (confidence >= 50) return Colors.orange;
    return Colors.red;
  }

  Widget _buildMotivationalSection(String message) {
    if (message.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.green.shade50, Colors.green.shade100],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.green.shade200,
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.favorite, color: Colors.green.shade600, size: 20),
              const SizedBox(width: 8),
              Text(
                'Motivasyon Köşesi',
                style: GoogleFonts.montserrat(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.green.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            message,
            style: GoogleFonts.lato(
              fontSize: 14,
              color: Colors.green.shade700,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStudyTipsSection(List studyTips) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Çalışma İpuçları',
          style: GoogleFonts.montserrat(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimaryColor,
          ),
        ),
        const SizedBox(height: 12),
        ...studyTips.asMap().entries.map((entry) {
          final index = entry.key;
          final tip = entry.value.toString();
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.orange.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Colors.orange.shade200,
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: Colors.orange.shade400,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '${index + 1}',
                      style: GoogleFonts.lato(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    tip,
                    style: GoogleFonts.lato(
                      fontSize: 14,
                      color: Colors.orange.shade700,
                    ),
                  ),
                ),
              ],
            ),
          ).animate(delay: (index * 100).ms).slideX(begin: -0.3).fadeIn();
        }).toList(),
      ],
    );
  }

  Widget _buildActions() {
    return Container(
      padding: const EdgeInsets.all(24.0),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextButton(
              onPressed: () => Navigator.pop(context),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: Text(
                'İptal',
                style: GoogleFonts.lato(
                  fontSize: 16,
                  color: Colors.grey.shade600,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            flex: 2,
            child: ElevatedButton.icon(
              onPressed: _selectedRecommendation != null
                  ? () {
                      widget.onApplyReschedule(
                        _selectedRecommendation!,
                        'AI önerisi',
                      );
                      Navigator.pop(context);
                    }
                  : null,
              icon: const Icon(Icons.check, size: 18),
              label: Text(
                _selectedRecommendation != null ? 'Uygula' : 'Bir seçenek seç',
                style: GoogleFonts.montserrat(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: _selectedRecommendation != null
                    ? Colors.purple.shade600
                    : Colors.grey.shade400,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: _selectedRecommendation != null ? 4 : 0,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
