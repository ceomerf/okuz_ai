import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/concept_map_provider.dart';
import '../theme/app_theme.dart';
import '../models/curriculum_data.dart';

class ConceptMapSidebar extends ConsumerWidget {
  const ConceptMapSidebar({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final state = ref.watch(conceptMapNotifierProvider);
    final notifier = ref.read(conceptMapNotifierProvider.notifier);
    return SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Sınıf, Ders ve Konu Seçimi',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF10B981),
                    ),
              ),
              const SizedBox(height: 20),

              // Sınıf seçimi
              Text(
                'Sınıf Seçin',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppTheme.getPrimaryTextColor(context),
                    ),
              ),
              const SizedBox(height: 12),
              Container(
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.05)
                      : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: const Color(0xFFE2E8F0).withValues(alpha: 0.5),
                  ),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: state.selectedGrade,
                    hint: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'Sınıf seçin...',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppTheme.getSecondaryTextColor(context),
                            ),
                      ),
                    ),
                    items: CurriculumData.getGrades().map<DropdownMenuItem<String>>((grade) {
                      return DropdownMenuItem<String>(
                        value: grade,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            grade,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ),
                      );
                    }).toList(),
                    onChanged: (value) {
                      notifier.selectGrade(value);
                      HapticFeedback.lightImpact();
                    },
                    dropdownColor: isDark
                        ? Colors.white.withValues(alpha: 0.05)
                        : const Color(0xFFF8FAFC),
                    icon: Icon(
                      Icons.keyboard_arrow_down,
                      color: AppTheme.getSecondaryTextColor(context),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Ders seçimi
              if (state.selectedGrade != null) ...[
                Text(
                  'Ders Seçin',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppTheme.getPrimaryTextColor(context),
                      ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 120,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: CurriculumData.getSubjects(state.selectedGrade!).length,
                    itemBuilder: (context, index) {
                      final subjectName = CurriculumData.getSubjects(state.selectedGrade!)[index];
                      final subjectIcon = CurriculumData.getSubjectIcons()[subjectName] ?? '📚';
                      final isSelected = state.selectedSubject == subjectName;
                      
                      return Container(
                        width: 100,
                        margin: const EdgeInsets.only(right: 12),
                        child: InkWell(
                          onTap: () {
                            notifier.selectSubject(subjectName);
                            HapticFeedback.lightImpact();
                          },
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? const Color(0xFF10B981).withValues(alpha: 0.1)
                                  : isDark
                                      ? Colors.white.withValues(alpha: 0.05)
                                      : const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isSelected
                                    ? const Color(0xFF10B981)
                                    : const Color(0xFFE2E8F0).withValues(alpha: 0.5),
                                width: isSelected ? 2 : 1,
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  subjectIcon,
                                  style: const TextStyle(fontSize: 32),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  subjectName,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: isSelected
                                        ? const Color(0xFF10B981)
                                        : AppTheme.getPrimaryTextColor(context),
                                  ),
                                  textAlign: TextAlign.center,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),

                const SizedBox(height: 24),

                // Konu seçimi
              if (state.selectedSubject != null) ...[
                  Text(
                    'Konu Seçin',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: AppTheme.getPrimaryTextColor(context),
                        ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.05)
                          : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: const Color(0xFFE2E8F0).withValues(alpha: 0.5),
                      ),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: state.selectedTopic,
                        hint: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            'Konu seçin...',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: AppTheme.getSecondaryTextColor(context),
                                ),
                          ),
                        ),
                        items: CurriculumData.getTopics(state.selectedGrade!, state.selectedSubject!)
                            .map<DropdownMenuItem<String>>((topic) {
                          return DropdownMenuItem<String>(
                            value: topic,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: SizedBox(
                                width: 250, // Daha küçük genişlik
                                child: Text(
                                  topic,
                                  style: Theme.of(context).textTheme.bodyMedium,
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 2,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                        onChanged: (value) {
                          notifier.selectTopic(value);
                          HapticFeedback.lightImpact();
                        },
                        dropdownColor: isDark
                            ? Colors.white.withValues(alpha: 0.05)
                            : const Color(0xFFF8FAFC),
                        icon: Icon(
                          Icons.keyboard_arrow_down,
                          color: AppTheme.getSecondaryTextColor(context),
                        ),
                      ),
                    ),
                  ),
                ],
              ],

              const SizedBox(height: 32),

              // Harita oluştur butonu
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: (state.selectedGrade != null && state.selectedSubject != null && state.selectedTopic != null && !state.isLoading)
                      ? notifier.generateConceptMap
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                  child: state.isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text(
                          'Kavram Haritası Oluştur',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                          ),
                        ),
                ),
              ),

              if (state.conceptMapData != null) ...[
                const SizedBox(height: 32),
                _buildConceptDetails(context, isDark),
              ],
            ],
          ),
        );
  }

  Widget _buildConceptDetails(BuildContext context, bool isDark) {
    final state = ProviderScope.containerOf(context, listen: true).read(conceptMapNotifierProvider);
    if (state.conceptMapData == null) return const SizedBox();

    final concepts = state.conceptMapData!['concepts'] as List? ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Harita Detayları',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: const Color(0xFF10B981),
              ),
        ),
        const SizedBox(height: 16),

        // Concepts list
        ...concepts.map((concept) {
          final name = concept['name'] as String? ?? '';
          final description = concept['description'] as String? ?? '';
          final importance = concept['importance'] as String? ?? 'orta';

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color:
                  isDark ? Colors.white.withValues(alpha: 0.05) : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFF10B981).withValues(alpha: 0.2),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        name,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _getImportanceColor(importance)
                            .withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        importance,
                        style: TextStyle(
                          color: _getImportanceColor(importance),
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                if (description.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppTheme.getSecondaryTextColor(context),
                        ),
                  ),
                ],
              ],
            ),
          );
        }).toList(),
      ],
    );
  }

  Color _getImportanceColor(String importance) {
    switch (importance.toLowerCase()) {
      case 'yüksek':
        return const Color(0xFFEF4444);
      case 'orta':
        return const Color(0xFFF59E0B);
      case 'düşük':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF6B7280);
    }
  }
} 