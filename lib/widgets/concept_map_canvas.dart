import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/concept_map_provider.dart';

class ConceptMapCanvas extends ConsumerStatefulWidget {
  const ConceptMapCanvas({Key? key}) : super(key: key);

  @override
  ConsumerState<ConceptMapCanvas> createState() => _ConceptMapCanvasState();
}

class _ConceptMapCanvasState extends ConsumerState<ConceptMapCanvas>
    with TickerProviderStateMixin {
  late AnimationController _mapAnimationController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _mapAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
          parent: _mapAnimationController, curve: Curves.elasticOut),
    );

    _mapAnimationController.forward();
  }
  


  @override
  void dispose() {
    _mapAnimationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final state = ref.watch(conceptMapNotifierProvider);
    final notifier = ref.read(conceptMapNotifierProvider.notifier);

    return Scaffold(
      backgroundColor: isDark ? Colors.black : Colors.grey[50],
      body: SafeArea(
        child: Column(
          children: [
            // Minimal Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: isDark ? Colors.grey[900] : Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  // Title
                  Expanded(
                    child: Text(
                      state.conceptMapData?['mapTitle'] ?? 'Kavram Haritası',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF10B981),
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  
                  // Export buttons
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        onPressed: () => _exportAsImage(),
                        icon: const Icon(Icons.camera_alt, size: 16),
                        tooltip: 'Fotoğraf Olarak Kaydet',
                        style: IconButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981).withValues(alpha: 0.1),
                          foregroundColor: const Color(0xFF10B981),
                          minimumSize: const Size(28, 28),
                        ),
                      ),
                      IconButton(
                        onPressed: () => _exportAsPDF(),
                        icon: const Icon(Icons.picture_as_pdf, size: 16),
                        tooltip: 'PDF Olarak Kaydet',
                        style: IconButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981).withValues(alpha: 0.1),
                          foregroundColor: const Color(0xFF10B981),
                          minimumSize: const Size(28, 28),
                        ),
                      ),
                      IconButton(
                        onPressed: () => _resetZoom(),
                        icon: const Icon(Icons.zoom_out, size: 16),
                        tooltip: 'Tüm Haritayı Gör',
                        style: IconButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981).withValues(alpha: 0.1),
                          foregroundColor: const Color(0xFF10B981),
                          minimumSize: const Size(28, 28),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            // Full Screen Concept Map Area
            Expanded(
              child: Container(
                margin: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey[900] : Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: AnimatedBuilder(
                    animation: _mapAnimationController,
                    builder: (context, child) {
                      return Transform.scale(
                        scale: _scaleAnimation.value,
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          child: _buildConceptMapContent(state, notifier, isDark),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }









  // Build importance chip
  Widget _buildImportanceChip(String importance, bool isDark) {
    Color chipColor;
    String importanceText;
    
    switch (importance) {
      case 'yüksek':
        chipColor = const Color(0xFFEF4444);
        importanceText = 'Yüksek Önem';
        break;
      case 'orta':
        chipColor = const Color(0xFFF59E0B);
        importanceText = 'Orta Önem';
        break;
      case 'düşük':
        chipColor = const Color(0xFF10B981);
        importanceText = 'Düşük Önem';
        break;
      default:
        chipColor = const Color(0xFF10B981);
        importanceText = 'Önem';
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: chipColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: chipColor),
      ),
      child: Text(
        importanceText,
        style: TextStyle(
          color: chipColor,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }

  // Build child item
  Widget _buildChildItem(Map<String, dynamic> child, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[800] : Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
        ),
      ),
      child: Row(
        children: [
          if (child['icon'] != null) ...[
            Text(child['icon'], style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  child['name'] ?? '',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (child['description'] != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    child['description'],
                    style: Theme.of(context).textTheme.bodySmall,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Export as image
  void _exportAsImage() {
    // TODO: Implement image export
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Fotoğraf kaydetme özelliği yakında gelecek!')),
    );
  }

  // Export as PDF
  void _exportAsPDF() {
    // TODO: Implement PDF export
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('PDF kaydetme özelliği yakında gelecek!')),
    );
  }

  // Reset zoom
  void _resetZoom() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Harita yeniden yüklendi!')),
    );
  }

  // Build staged concept map content
  Widget _buildConceptMapContent(ConceptMapState state, ConceptMapNotifier notifier, bool isDark) {
    if (state.conceptMapData == null || state.stagedConcepts.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    return Column(
      children: [
        // Progress Bar
        _buildProgressBar(state, isDark),
        
        // Stage Content
        Expanded(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 500),
            transitionBuilder: (Widget child, Animation<double> animation) {
              return FadeTransition(opacity: animation, child: child);
            },
            child: _buildStageContent(state, isDark),
          ),
        ),
        
        // Navigation Buttons
        _buildNavigationButtons(state, notifier, isDark),
      ],
    );
  }
  
  // Build progress bar
  Widget _buildProgressBar(ConceptMapState state, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Aşama ${state.currentStage + 1}/${state.stagedConcepts.length}',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
              Text(
                state.stagedConcepts[state.currentStage]['title'],
                style: TextStyle(
                  fontSize: 14,
                  color: const Color(0xFF10B981),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: (state.currentStage + 1) / state.stagedConcepts.length,
            backgroundColor: isDark ? Colors.grey[700] : Colors.grey[300],
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF10B981)),
          ),
        ],
      ),
    );
  }
  
  // Build stage content
  Widget _buildStageContent(ConceptMapState state, bool isDark) {
    final currentStageData = state.stagedConcepts[state.currentStage];
    final conceptData = currentStageData['data'] as Map<String, dynamic>;
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stage Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? Colors.grey[800] : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xFF10B981),
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF10B981).withValues(alpha: 0.2),
                  blurRadius: 12,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              children: [
                // Icon
                if (conceptData['icon'] != null)
                  Text(
                    conceptData['icon'],
                    style: const TextStyle(fontSize: 48),
                  ),
                const SizedBox(height: 16),
                
                // Title
                Text(
                  conceptData['name'],
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 8),
                
                // Description
                if (conceptData['description'] != null)
                  Text(
                    conceptData['description'],
                    style: TextStyle(
                      fontSize: 16,
                      color: isDark ? Colors.grey[300] : Colors.grey[600],
                    ),
                    textAlign: TextAlign.center,
                  ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Concept Details
          if (conceptData['analogy'] != null) ...[
            _buildDetailCard(
              'Benzetme',
              conceptData['analogy'],
              Icons.lightbulb_outline,
              isDark,
            ),
            const SizedBox(height: 16),
          ],
          
          if (conceptData['keyQuestion'] != null) ...[
            _buildDetailCard(
              'Düşündürücü Soru',
              conceptData['keyQuestion'],
              Icons.help_outline,
              isDark,
            ),
            const SizedBox(height: 16),
          ],
          
          if (conceptData['commonMisconception'] != null) ...[
            _buildDetailCard(
              'Yaygın Yanılgı',
              conceptData['commonMisconception'],
              Icons.warning_amber_outlined,
              isDark,
            ),
            const SizedBox(height: 16),
          ],
          
          if (conceptData['importance'] != null) ...[
            _buildImportanceCard(conceptData['importance'], isDark),
            const SizedBox(height: 16),
          ],
        ],
      ),
    );
  }
  
  // Build detail card
  Widget _buildDetailCard(String title, String content, IconData icon, bool isDark) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[700] : Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey[600]! : Colors.grey[300]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: const Color(0xFF10B981)),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            content,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey[300] : Colors.grey[700],
            ),
          ),
        ],
      ),
    );
  }
  
  // Build importance card
  Widget _buildImportanceCard(String importance, bool isDark) {
    Color cardColor;
    String importanceText;
    
    switch (importance) {
      case 'yüksek':
        cardColor = const Color(0xFFEF4444);
        importanceText = 'Yüksek Önem';
        break;
      case 'orta':
        cardColor = const Color(0xFFF59E0B);
        importanceText = 'Orta Önem';
        break;
      case 'düşük':
        cardColor = const Color(0xFF10B981);
        importanceText = 'Düşük Önem';
        break;
      default:
        cardColor = const Color(0xFF10B981);
        importanceText = 'Önem';
    }
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardColor),
      ),
      child: Row(
        children: [
          Icon(Icons.priority_high, color: cardColor, size: 24),
          const SizedBox(width: 12),
          Text(
            importanceText,
            style: TextStyle(
              color: cardColor,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }
  
  // Build navigation buttons
  Widget _buildNavigationButtons(ConceptMapState state, ConceptMapNotifier notifier, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Previous Button
          ElevatedButton.icon(
            onPressed: state.currentStage > 0 ? notifier.previousStage : null,
            icon: const Icon(Icons.arrow_back),
            label: const Text('Önceki'),
            style: ElevatedButton.styleFrom(
              backgroundColor: isDark ? Colors.grey[700] : Colors.grey[200],
              foregroundColor: isDark ? Colors.white : Colors.black87,
            ),
          ),
          
          // Stage Indicators
          Row(
            children: List.generate(
              state.stagedConcepts.length,
              (index) => GestureDetector(
                onTap: () => notifier.goToStage(index),
                child: Container(
                  width: 12,
                  height: 12,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: index == state.currentStage
                         ? const Color(0xFF10B981)
                         : isDark ? Colors.grey[600]! : Colors.grey[400]!,
                  ),
                ),
              ),
            ),
          ),
          
          // Next Button
          ElevatedButton.icon(
            onPressed: state.currentStage < state.stagedConcepts.length - 1
                ? notifier.nextStage
                : null,
            icon: const Icon(Icons.arrow_forward),
            label: const Text('Sonraki'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
} 