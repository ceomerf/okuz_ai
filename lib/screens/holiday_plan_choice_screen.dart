import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:okuz_ai/screens/user_plan_screen.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:okuz_ai/services/mock_auth_service.dart';
import 'package:okuz_ai/services/mock_database_service.dart';

class HolidayPlanChoiceScreen extends ConsumerWidget {
  final String holidayName;
  final String holidayType;

  const HolidayPlanChoiceScreen({
    Key? key,
    this.holidayName = "Tatil",
    this.holidayType = "long_break",
  }) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Bu ekran sadece uzun tatiller için açılacak
    return _buildLongBreakUI(context);
  }

  Widget _buildLongBreakUI(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: AppTheme.getMainGradient(context),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 40),
                Text(
                  "Harika bir haber! 🎉",
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontSize: 28,
                        color: Colors.white,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Text(
                  "Görünüşe göre şu an $holidayName'ndesin. ☀️",
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontSize: 18,
                        color: Colors.white,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                Text(
                  "Bu değerli zamanı en verimli şekilde nasıl değerlendirmek istersin?",
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontSize: 16,
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 40),
                _buildOptionCard(
                  context,
                  "Eksiklerimi Kapatmak İstiyorum",
                  "Geçen yılın konularını tekrar ederek eksiklerini tamamla",
                  Icons.refresh,
                  'holiday_review',
                ),
                const SizedBox(height: 16),
                _buildOptionCard(
                  context,
                  "Önden Gitmek İstiyorum",
                  "Yeni dönem konularına şimdiden başla ve avantaj kazan",
                  Icons.trending_up,
                  'holiday_prepare',
                ),
                const SizedBox(height: 16),
                _buildOptionCard(
                  context,
                  "Dengeli Bir Program",
                  "Hem eksikleri kapat hem de yeni döneme hazırlan",
                  Icons.balance,
                  'holiday_balanced',
                ),
                const SizedBox(height: 16),
                _buildOptionCard(
                  context,
                  "Bu Tatil Sadece Dinleneceğim",
                  "Şimdilik plan yapmadan dinlen, istediğin zaman dönebilirsin",
                  Icons.beach_access,
                  'holiday_rest',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOfficialHolidayUI(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: AppTheme.getMainGradient(context),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.celebration,
                  size: 80,
                  color: Colors.white,
                ),
                const SizedBox(height: 24),
                Text(
                  "Bugün $holidayName",
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontSize: 28,
                        color: Colors.white,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Text(
                  "Bugün için planın otomatik olarak düzenlendi. Dinlenmeye ve kutlamaya zaman ayırabilirsin.",
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontSize: 18,
                        color: Colors.white,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 40),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () {
                    Navigator.of(context).pop();
                  },
                  child: Text(
                    "Anladım",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOptionCard(
    BuildContext context,
    String title,
    String description,
    IconData icon,
    String planType,
  ) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: () => _selectHolidayPlanType(context, planType),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withAlpha(26),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: AppTheme.primaryColor,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.arrow_forward_ios,
                color: Colors.grey[400],
                size: 16,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _selectHolidayPlanType(BuildContext context, String planType) async {
    try {
      final user = MockAuthService.instance.currentUser;
      if (user == null) return;

      // Mock implementation - gerçek uygulamada veri güncellenecek
      final dbService = MockDatabaseService.instance;
      await dbService.callCloudFunction('updateUserProfile', {
        'userId': user.id,
        'data': {'holidayPlanType': planType},
      });

      // Eğer dinlenme seçildiyse ana ekrana dön
      if (planType == 'holiday_rest') {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('İyi tatiller! İstediğin zaman geri dönebilirsin.'),
            duration: Duration(seconds: 3),
          ),
        );
      } else {
        // Plan oluşturma ekranına yönlendir
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => const UserPlanScreen(),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Bir hata oluştu: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}
