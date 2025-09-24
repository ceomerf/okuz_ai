import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:graphview/GraphView.dart';
import '../providers/api_client_provider.dart';

class ConceptMapState {
  final String? selectedGrade;
  final String? selectedSubject;
  final String? selectedTopic;
  final bool isLoading;
  final Map<String, dynamic>? conceptMapData;
  final bool showMap;
  final String? error;
  final int currentStage;
  final List<Map<String, dynamic>> stagedConcepts;
  final bool isStageTransitioning;

  const ConceptMapState({
    this.selectedGrade,
    this.selectedSubject,
    this.selectedTopic,
    this.isLoading = false,
    this.conceptMapData,
    this.showMap = false,
    this.error,
    this.currentStage = 0,
    this.stagedConcepts = const [],
    this.isStageTransitioning = false,
  });

  ConceptMapState copyWith({
    String? selectedGrade,
    String? selectedSubject,
    String? selectedTopic,
    bool? isLoading,
    Map<String, dynamic>? conceptMapData,
    bool? showMap,
    String? error,
    int? currentStage,
    List<Map<String, dynamic>>? stagedConcepts,
    bool? isStageTransitioning,
  }) {
    return ConceptMapState(
      selectedGrade: selectedGrade ?? this.selectedGrade,
      selectedSubject: selectedSubject ?? this.selectedSubject,
      selectedTopic: selectedTopic ?? this.selectedTopic,
      isLoading: isLoading ?? this.isLoading,
      conceptMapData: conceptMapData ?? this.conceptMapData,
      showMap: showMap ?? this.showMap,
      error: error,
      currentStage: currentStage ?? this.currentStage,
      stagedConcepts: stagedConcepts ?? this.stagedConcepts,
      isStageTransitioning: isStageTransitioning ?? this.isStageTransitioning,
    );
  }
}

class ConceptMapNotifier extends StateNotifier<ConceptMapState> {
  ConceptMapNotifier(this.ref) : super(const ConceptMapState());

  final Ref ref;
  final Graph graph = Graph();
  TransformationController? _transformationController;
  TransformationController? get transformationController => _transformationController;

  void selectGrade(String? grade) {
    state = state.copyWith(selectedGrade: grade, selectedSubject: null, selectedTopic: null);
  }

  void selectSubject(String? subject) {
    state = state.copyWith(selectedSubject: subject, selectedTopic: null);
  }

  void selectTopic(String? topic) {
    state = state.copyWith(selectedTopic: topic);
  }

  void goBackToSelection() {
    state = state.copyWith(showMap: false, currentStage: 0, stagedConcepts: [], isStageTransitioning: false);
  }

  void nextStage() {
    if (state.currentStage < state.stagedConcepts.length - 1) {
      state = state.copyWith(isStageTransitioning: true);
      Future.delayed(const Duration(milliseconds: 300), () {
        state = state.copyWith(currentStage: state.currentStage + 1, isStageTransitioning: false);
      });
    }
  }

  void previousStage() {
    if (state.currentStage > 0) {
      state = state.copyWith(isStageTransitioning: true);
      Future.delayed(const Duration(milliseconds: 300), () {
        state = state.copyWith(currentStage: state.currentStage - 1, isStageTransitioning: false);
      });
    }
  }

  void goToStage(int stageIndex) {
    if (stageIndex >= 0 && stageIndex < state.stagedConcepts.length) {
      state = state.copyWith(isStageTransitioning: true);
      Future.delayed(const Duration(milliseconds: 300), () {
        state = state.copyWith(currentStage: stageIndex, isStageTransitioning: false);
      });
    }
  }

  void updateTransformation(Matrix4 newTransform) {
    _transformationController = TransformationController(newTransform);
  }

  void resetTransformation() {
    _transformationController = null;
  }

  void calculateInitialTransformation(Size viewportSize, Size graphSize) {
    if (viewportSize.width <= 0 || viewportSize.height <= 0 || graphSize.width <= 0 || graphSize.height <= 0) {
      return;
    }
    const padding = 100.0;
    final scaleX = (viewportSize.width - padding) / graphSize.width;
    final scaleY = (viewportSize.height - padding) / graphSize.height;
    final scale = scaleX < scaleY ? scaleX : scaleY;
    final clampedScale = scale.clamp(0.1, 2.0);
    final offsetX = (viewportSize.width - graphSize.width * clampedScale) / 2;
    final offsetY = (viewportSize.height - graphSize.height * clampedScale) / 2;
    final matrix = Matrix4.identity()
      ..translate(offsetX, offsetY)
      ..scale(clampedScale);
    updateTransformation(matrix);
  }

  Future<void> generateConceptMap() async {
    if (state.selectedGrade == null || state.selectedSubject == null || state.selectedTopic == null) {
      state = state.copyWith(error: 'Lütfen sınıf, ders ve konu seçin');
      return;
    }

    state = state.copyWith(isLoading: true, error: null);
    HapticFeedback.mediumImpact();

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.post('/smart-tools/concept-map', {
        'grade': state.selectedGrade,
        'subject': state.selectedSubject,
        'topic': state.selectedTopic,
      });

      if (response['success'] == true) {
        final conceptMap = response['conceptMap'] as Map<String, dynamic>;
        _buildGraph(conceptMap);
        final staged = _prepareStagedConcepts(conceptMap);
        state = state.copyWith(
          isLoading: false,
          conceptMapData: conceptMap,
          showMap: true,
          currentStage: 0,
          stagedConcepts: staged,
        );
        HapticFeedback.heavyImpact();
      } else {
        state = state.copyWith(isLoading: false, error: 'Harita oluşturulamadı.');
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Bir hata oluştu: $e');
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }

  void reset() {
    state = const ConceptMapState();
    graph.nodes.clear();
    graph.edges.clear();
    resetTransformation();
  }

  List<Map<String, dynamic>> _prepareStagedConcepts(Map<String, dynamic> mapData) {
    final List<Map<String, dynamic>> staged = [];
    final centralConcept = mapData['centralConcept'] as Map<String, dynamic>?;
    if (centralConcept != null) {
      staged.add({
        'type': 'central',
        'data': centralConcept,
        'title': 'Ana Kavram',
        'description': 'Bu konunun temel kavramı',
      });
      final children = centralConcept['children'] as List? ?? [];
      for (int i = 0; i < children.length && i < 3; i++) {
        final child = children[i] as Map<String, dynamic>;
        staged.add({
          'type': 'branch',
          'data': child,
          'title': '${i + 1}. Alt Konu',
          'description': 'Ana kavramın önemli alt konularından biri',
        });
      }
    } else {
      final concepts = mapData['concepts'] as List? ?? [];
      if (concepts.isNotEmpty) {
        for (int i = 0; i < concepts.length && i < 4; i++) {
          final concept = concepts[i] as Map<String, dynamic>;
          staged.add({
            'type': i == 0 ? 'central' : 'branch',
            'data': concept,
            'title': i == 0 ? 'Ana Kavram' : '${i}. Alt Konu',
            'description': i == 0 ? 'Bu konunun temel kavramı' : 'Ana kavramın önemli alt konularından biri',
          });
        }
      }
    }
    return staged;
  }

  void _buildGraph(Map<String, dynamic> mapData) {
    graph.nodes.clear();
    graph.edges.clear();
    final centralConcept = mapData['centralConcept'] as Map<String, dynamic>?;
    if (centralConcept != null) {
      final centralName = centralConcept['name'] as String? ?? '';
      if (centralName.isNotEmpty) {
        final centralNode = Node.Id(centralName);
        graph.addNode(centralNode);
        final children = centralConcept['children'] as List? ?? [];
        for (var child in children) {
          final childName = child['name'] as String? ?? '';
          if (childName.isNotEmpty) {
            final childNode = Node.Id(childName);
            graph.addNode(childNode);
            graph.addEdge(centralNode, childNode);
            final grandchildren = child['children'] as List? ?? [];
            for (var grandchild in grandchildren) {
              final grandchildName = grandchild['name'] as String? ?? '';
              if (grandchildName.isNotEmpty) {
                final grandchildNode = Node.Id(grandchildName);
                graph.addNode(grandchildNode);
                graph.addEdge(childNode, grandchildNode);
              }
            }
          }
        }
      }
    } else {
      final concepts = mapData['concepts'] as List? ?? [];
      final centralConceptOld = mapData['centralConcept'] as String? ?? '';
      final centralNode = Node.Id(centralConceptOld);
      graph.addNode(centralNode);
      for (var concept in concepts) {
        final conceptName = concept['name'] as String? ?? '';
        if (conceptName.isNotEmpty) {
          final conceptNode = Node.Id(conceptName);
          graph.addNode(conceptNode);
          graph.addEdge(centralNode, conceptNode);
          final subConcepts = concept['subConcepts'] as List? ?? [];
          for (var subConcept in subConcepts) {
            final subConceptName = subConcept['name'] as String? ?? '';
            if (subConceptName.isNotEmpty) {
              final subConceptNode = Node.Id(subConceptName);
              graph.addNode(subConceptNode);
              graph.addEdge(conceptNode, subConceptNode);
            }
          }
        }
      }
    }
  }
}

final conceptMapNotifierProvider = StateNotifierProvider<ConceptMapNotifier, ConceptMapState>((ref) {
  return ConceptMapNotifier(ref);
});