import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:okuz_ai/screens/diagnostic_test_screen.dart';
import 'package:okuz_ai/screens/learning_habits_screen.dart';
import 'package:okuz_ai/models/diagnostic_test.dart';
import 'package:okuz_ai/screens/user_plan_screen.dart';
import 'package:okuz_ai/services/plan_service.dart';
import 'package:okuz_ai/services/mock_auth_service.dart';

class AdvancedProfileScreen extends StatelessWidget {
  const AdvancedProfileScreen({Key? key}) : super(key: key);

  // Plan var mı kontrol et
  Future<bool> _checkUserHasPlan(BuildContext context) async {
    final authService = Provider.of<MockAuthService>(context, listen: false);
    final user = authService.currentUser;
    if (user == null) return false;

    try {
      final planService = PlanService();
      final planDocument = await planService.getUserPlan();
      return planDocument != null;
    } catch (e) {
      print('Plan kontrolü hatası: $e');
      return false;
    }
  }

  // UserPlanScreen'e yönlendir
  Future<void> _navigateToUserPlan(BuildContext context) async {
    // Plan kontrolü yap
    final hasPlan = await _checkUserHasPlan(context);

    if (hasPlan) {
      // Plan varsa direkt UserPlanScreen'e git
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (context) => const UserPlanScreen()),
        (Route<dynamic> route) => false,
      );
    } else {
      // Plan yoksa yine UserPlanScreen'e git, orada "Plan Oluştur" butonu gösterilecek
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (context) => const UserPlanScreen()),
        (Route<dynamic> route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Gelişmiş Profil'),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: () => _navigateToUserPlan(context),
            child: const Text('Atla', style: TextStyle(color: Colors.grey)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Daha Kişiselleştirilmiş Bir Deneyim İçin',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Aşağıdaki seçenekler isteğe bağlıdır, ancak bunları tamamlayarak size çok daha kişiselleştirilmiş bir öğrenme deneyimi sunabiliriz.',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 32),

              // Mini Teşhis Sınavı Kartı
              _buildOptionCard(
                context,
                title: 'Mini Teşhis Sınavı',
                description:
                    'Temel konulardaki seviyenizi ölçen kısa bir sınav. Sadece 5-10 dakikanızı alacak.',
                icon: Icons.quiz,
                color: Theme.of(context).brightness == Brightness.dark
                    ? const Color(0xFF3F51B5)
                        .withOpacity(0.2) // Koyu mavi arka plan
                    : Colors.blue.shade100,
                iconColor: Theme.of(context).brightness == Brightness.dark
                    ? const Color(0xFF7986CB) // Açık mavi icon
                    : Colors.blue,
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => DiagnosticTestScreen(
                        tests: DiagnosticTestData.getAllTests(),
                      ),
                    ),
                  );
                },
              ),

              const SizedBox(height: 16),

              // Öğrenme Alışkanlıkları Anketi Kartı
              _buildOptionCard(
                context,
                title: 'Öğrenme Alışkanlıkları Anketi',
                description:
                    'Çalışma alışkanlıklarınızı analiz ederek size özel tavsiyeler sunmamızı sağlar.',
                icon: Icons.psychology,
                color: Theme.of(context).brightness == Brightness.dark
                    ? const Color(0xFF5C6BC0)
                        .withOpacity(0.2) // Orta mavi arka plan
                    : Colors.purple.shade100,
                iconColor: Theme.of(context).brightness == Brightness.dark
                    ? const Color(0xFF9FA8DA) // Açık mavi-gri icon
                    : Colors.purple,
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const LearningHabitsScreen(),
                    ),
                  );
                },
              ),

              const SizedBox(height: 40),

              // Devam Et Butonu
              Center(
                child: ElevatedButton(
                  onPressed: () {
                    // Ana ekrana git
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(
                          builder: (context) => const UserPlanScreen()),
                      (Route<dynamic> route) => false,
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 40, vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                  ),
                  child: const Text(
                    'Devam Et',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOptionCard(
    BuildContext context, {
    required String title,
    required String description,
    required IconData icon,
    required Color color,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: iconColor,
                  size: 28,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                description,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    'Başla',
                    style: TextStyle(
                      color: AppTheme.primaryColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    Icons.arrow_forward,
                    color: AppTheme.primaryColor,
                    size: 16,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
