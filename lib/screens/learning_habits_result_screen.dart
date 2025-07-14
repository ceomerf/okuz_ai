import 'package:flutter/material.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:okuz_ai/screens/advanced_profile_screen.dart';

class LearningHabitsResultScreen extends StatelessWidget {
  final Map<String, dynamic> learningHabits;

  const LearningHabitsResultScreen({
    Key? key,
    required this.learningHabits,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Öğrenme alışkanlıkları verilerini analiz et
    final List<String> strengths = _identifyStrengths();
    final List<String> challenges = _identifyChallenges();
    final List<String> recommendations = _generateRecommendations();

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Öğrenme Profili'),
        backgroundColor: AppTheme.backgroundColor,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Başlık
            const Text(
              'Öğrenme Alışkanlıkları Analizi',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Cevaplarınıza göre öğrenme profiliniz oluşturuldu.',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 32),

            // Güçlü yönler
            _buildSectionCard(
              title: 'Güçlü Yönleriniz',
              items: strengths,
              icon: Icons.star,
              color: Colors.amber,
            ),
            const SizedBox(height: 16),

            // Zorluklar
            _buildSectionCard(
              title: 'Gelişim Alanlarınız',
              items: challenges,
              icon: Icons.fitness_center,
              color: Colors.orange,
            ),
            const SizedBox(height: 16),

            // Tavsiyeler
            _buildSectionCard(
              title: 'Kişiselleştirilmiş Öneriler',
              items: recommendations,
              icon: Icons.lightbulb,
              color: Colors.green,
            ),
            const SizedBox(height: 32),

            // Devam Et Butonu
            Center(
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(
                      builder: (context) => const AdvancedProfileScreen(),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
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
    );
  }

  Widget _buildSectionCard({
    required String title,
    required List<String> items,
    required IconData icon,
    required Color color,
  }) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    icon,
                    color: color,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...items.map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• ', style: TextStyle(fontSize: 16)),
                      Expanded(
                        child: Text(
                          item,
                          style: const TextStyle(fontSize: 16),
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  List<String> _identifyStrengths() {
    final List<String> strengths = [];

    // Odaklanma süresi
    final int focusDuration = learningHabits['focusDuration'] ?? 0;
    if (focusDuration >= 45) {
      strengths.add('Uzun süre odaklanabilme yeteneğiniz var (${focusDuration} dakika).');
    }

    // Erteleme eğilimi
    final int procrastinationLevel = learningHabits['procrastinationLevel'] ?? 10;
    if (procrastinationLevel <= 4) {
      strengths.add('Erteleme eğiliminiz düşük, bu disiplinli çalışmanızı destekler.');
    }

    // Öğrenme yöntemi
    final String learningMethod = learningHabits['preferredLearningMethod'] ?? '';
    if (learningMethod == 'practice') {
      strengths.add('Uygulayarak öğrenmeyi tercih ediyorsunuz, bu kalıcı öğrenmeyi destekler.');
    } else if (learningMethod == 'visual') {
      strengths.add('Görsel öğrenme stiliniz karmaşık konuları anlamanızı kolaylaştırır.');
    }

    // Çalışma ortamı tercihi
    final String environment = learningHabits['preferredEnvironment'] ?? '';
    if (environment == 'quiet') {
      strengths.add('Sessiz ortamlarda çalışmayı tercih etmeniz odaklanmanızı artırır.');
    }

    // Hatırlama süresi
    final int retentionDuration = learningHabits['retentionDuration'] ?? 0;
    if (retentionDuration >= 14) {
      strengths.add('Öğrendiğiniz bilgileri uzun süre (${retentionDuration} gün) hatırlayabiliyorsunuz.');
    }

    // Eğer hiç güçlü yön bulunamadıysa
    if (strengths.isEmpty) {
      strengths.add('Öğrenme alışkanlıklarınızı geliştirmek için fırsatlarınız var.');
    }

    return strengths;
  }

  List<String> _identifyChallenges() {
    final List<String> challenges = [];

    // Odaklanma süresi
    final int focusDuration = learningHabits['focusDuration'] ?? 0;
    if (focusDuration < 25) {
      challenges.add('Kısa odaklanma süreniz (${focusDuration} dakika) verimli çalışmanızı etkileyebilir.');
    }

    // Erteleme eğilimi
    final int procrastinationLevel = learningHabits['procrastinationLevel'] ?? 0;
    if (procrastinationLevel >= 7) {
      challenges.add('Yüksek erteleme eğiliminiz düzenli çalışmanızı zorlaştırabilir.');
    }

    // Mola sıklığı ve süresi
    final int breakFrequency = learningHabits['breakFrequency'] ?? 0;
    final int breakDuration = learningHabits['breakDuration'] ?? 0;
    if (breakFrequency < 30 && breakDuration > 15) {
      challenges.add('Sık ve uzun molalar vermeniz çalışma akışınızı bölüyor olabilir.');
    }

    // Dikkat dağıtıcılar
    final List<String> distractions = List<String>.from(learningHabits['distractions'] ?? []);
    if (distractions.length >= 3) {
      challenges.add('Birçok dikkat dağıtıcı faktör (${distractions.join(", ")}) çalışmanızı etkiliyor.');
    }

    // Hatırlama süresi
    final int retentionDuration = learningHabits['retentionDuration'] ?? 0;
    if (retentionDuration < 7) {
      challenges.add('Öğrendiğiniz bilgileri kısa sürede (${retentionDuration} gün) unutabiliyorsunuz.');
    }

    // Eğer hiç zorluk bulunamadıysa
    if (challenges.isEmpty) {
      challenges.add('Öğrenme alışkanlıklarınızda önemli bir zorluk görünmüyor.');
    }

    return challenges;
  }

  List<String> _generateRecommendations() {
    final List<String> recommendations = [];

    // Odaklanma süresi
    final int focusDuration = learningHabits['focusDuration'] ?? 0;
    if (focusDuration < 25) {
      recommendations.add('Pomodoro tekniği kullanarak odaklanma sürenizi kademeli olarak artırın (25-5-25 dakika çalışma-mola döngüsü).');
    } else if (focusDuration >= 45) {
      recommendations.add('Uzun odaklanma sürenizi avantaja çevirmek için derin çalışma seansları planlayın (45-90 dakika).');
    }

    // Erteleme eğilimi
    final int procrastinationLevel = learningHabits['procrastinationLevel'] ?? 0;
    if (procrastinationLevel >= 7) {
      recommendations.add('Görevleri küçük parçalara bölerek ve "5 dakika kuralı" uygulayarak erteleme eğiliminizi azaltın.');
    }

    // Öğrenme yöntemi
    final String learningMethod = learningHabits['preferredLearningMethod'] ?? '';
    if (learningMethod == 'visual') {
      recommendations.add('Görsel öğrenme stilinizi desteklemek için zihin haritaları, infografikler ve video dersler kullanın.');
    } else if (learningMethod == 'auditory') {
      recommendations.add('İşitsel öğrenme stilinizi desteklemek için sesli kitaplar, podcast\'ler ve kendi kendinize anlatma tekniğini kullanın.');
    } else if (learningMethod == 'reading') {
      recommendations.add('Okuyarak öğrenme stilinizi desteklemek için aktif okuma teknikleri ve not alma stratejileri geliştirin.');
    } else if (learningMethod == 'practice') {
      recommendations.add('Uygulayarak öğrenme stilinizi desteklemek için bol pratik yapın ve simülasyonlar kullanın.');
    }

    // Çalışma zamanı tercihi
    final String studyTime = learningHabits['preferredStudyTime'] ?? '';
    recommendations.add('En verimli çalışma zamanınız olan ${_getStudyTimeName(studyTime)} saatlerinde zor konulara odaklanın.');

    // Dikkat dağıtıcılar
    final List<String> distractions = List<String>.from(learningHabits['distractions'] ?? []);
    if (distractions.contains('Telefon bildirimleri') || distractions.contains('Sosyal medya')) {
      recommendations.add('Çalışırken telefonu uçak moduna alın veya "rahatsız etmeyin" özelliğini kullanın.');
    }

    return recommendations;
  }

  String _getStudyTimeName(String code) {
    switch (code) {
      case 'morning':
        return 'sabah';
      case 'afternoon':
        return 'öğleden sonra';
      case 'evening':
        return 'akşam';
      case 'night':
        return 'gece';
      default:
        return 'tercih ettiğiniz';
    }
  }
} 