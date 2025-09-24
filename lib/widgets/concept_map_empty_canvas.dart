import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class ConceptMapEmptyCanvas extends StatelessWidget {
  const ConceptMapEmptyCanvas({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      padding: const EdgeInsets.all(40),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.account_tree,
                size: 64,
                color: const Color(0xFF10B981).withValues(alpha: 0.7),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Kavram Haritası Burada Görünecek',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppTheme.getPrimaryTextColor(context),
                    fontWeight: FontWeight.w600,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              'Sınıf, ders ve konu seçin,\nsonra kavram haritasını oluşturun',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.getSecondaryTextColor(context),
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xFF10B981).withValues(alpha: 0.2),
                ),
              ),
              child: Column(
                children: [
                  Text(
                    '💡 Kavram Haritası Nedir?',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF10B981),
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Kavram haritası, bir konunun temel kavramlarını ve aralarındaki ilişkileri görsel olarak gösteren bir öğrenme aracıdır. Bu sayede konuyu daha iyi anlayabilir ve hatırlayabilirsiniz.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppTheme.getSecondaryTextColor(context),
                        ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
} 