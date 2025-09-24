import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/curriculum_data.dart';

class CurriculumSelectionState {
  final String? selectedGrade;
  final String? selectedSubject;
  final String? selectedTopic;
  final bool isLoading;
  final String? error;

  CurriculumSelectionState({
    this.selectedGrade,
    this.selectedSubject,
    this.selectedTopic,
    this.isLoading = false,
    this.error,
  });

  CurriculumSelectionState copyWith({
    String? selectedGrade,
    String? selectedSubject,
    String? selectedTopic,
    bool? isLoading,
    String? error,
  }) {
    return CurriculumSelectionState(
      selectedGrade: selectedGrade ?? this.selectedGrade,
      selectedSubject: selectedSubject ?? this.selectedSubject,
      selectedTopic: selectedTopic ?? this.selectedTopic,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class CurriculumSelectionNotifier extends StateNotifier<CurriculumSelectionState> {
  CurriculumSelectionNotifier() : super(CurriculumSelectionState());

  void selectGrade(String? grade) {
    state = state.copyWith(
      selectedGrade: grade,
      selectedSubject: null,
      selectedTopic: null,
    );
  }

  void selectSubject(String? subject) {
    state = state.copyWith(
      selectedSubject: subject,
      selectedTopic: null,
    );
  }

  void selectTopic(String? topic) {
    state = state.copyWith(selectedTopic: topic);
  }

  void clearSelection() {
    state = CurriculumSelectionState();
  }

  List<String> getAvailableGrades() {
    return CurriculumData.curriculum.map((grade) => grade['sinif_duzeyi'] as String).toList();
  }

  List<String> getAvailableSubjects() {
    if (state.selectedGrade == null) return [];
    
    final gradeData = CurriculumData.curriculum.firstWhere(
      (grade) => grade['sinif_duzeyi'] == state.selectedGrade,
      orElse: () => {'dersler': []},
    );
    
    return (gradeData['dersler'] as List).map((subject) => subject['ders_adi'] as String).toList();
  }

  List<String> getAvailableTopics() {
    if (state.selectedGrade == null || state.selectedSubject == null) return [];
    
    final gradeData = CurriculumData.curriculum.firstWhere(
      (grade) => grade['sinif_duzeyi'] == state.selectedGrade,
      orElse: () => {'dersler': []},
    );
    
    final subjectData = (gradeData['dersler'] as List).firstWhere(
      (subject) => subject['ders_adi'] == state.selectedSubject,
      orElse: () => {'uniteler': [], 'temalar': []},
    );
    
    Set<String> topicsSet = <String>{};
    
    // Check for uniteler (Math, Science subjects)
    if (subjectData.containsKey('uniteler')) {
      for (var unit in subjectData['uniteler']) {
        topicsSet.addAll((unit['konular'] as List).cast<String>());
      }
    }
    
    // Check for temalar (Language subjects)
    if (subjectData.containsKey('temalar')) {
      for (var tema in subjectData['temalar']) {
        topicsSet.addAll((tema['konular'] as List).cast<String>());
      }
    }
    
    return topicsSet.toList();
  }

  bool get isSelectionComplete {
    return state.selectedGrade != null && 
           state.selectedSubject != null && 
           state.selectedTopic != null;
  }
}

final curriculumSelectionProvider = StateNotifierProvider<CurriculumSelectionNotifier, CurriculumSelectionState>((ref) {
  return CurriculumSelectionNotifier();
}); 