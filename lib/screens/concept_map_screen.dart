import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/concept_map_provider.dart';
import '../widgets/concept_map_sidebar.dart';
import '../widgets/concept_map_canvas.dart';

class ConceptMapScreen extends ConsumerWidget {
  const ConceptMapScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final state = ref.watch(conceptMapNotifierProvider);
    return Scaffold(
      backgroundColor:
          isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios,
            color: isDark ? Colors.white : Colors.black87,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text('🗺️', style: TextStyle(fontSize: 20)),
            ),
            const SizedBox(width: 12),
            Text(
              'Kavram Haritası',
              style: TextStyle(
                color: isDark ? Colors.white : Colors.black87,
                fontWeight: FontWeight.w800,
                fontSize: 20,
              ),
            ),
          ],
        ),
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 500),
        transitionBuilder: (Widget child, Animation<double> animation) {
          return FadeTransition(opacity: animation, child: child);
        },
        child: state.showMap
            ? _buildFullScreenCanvas(context)
            : const ConceptMapSidebar(),
      ),
    );
  }

  // Add this new helper method to build the canvas
  Widget _buildFullScreenCanvas(BuildContext context) {
    return const ConceptMapCanvas(); // The main map canvas
  }
}


