import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:audioplayers/audioplayers.dart';
import 'dart:async';
import 'package:okuz_ai/services/mock_auth_service.dart';
import 'package:okuz_ai/services/mock_database_service.dart';

class MentalSupportScreen extends StatefulWidget {
  const MentalSupportScreen({Key? key}) : super(key: key);

  @override
  State<MentalSupportScreen> createState() => _MentalSupportScreenState();
}

class _MentalSupportScreenState extends State<MentalSupportScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _isPlaying = false;
  String _currentTrack = '';
  Timer? _breathingTimer;
  int _breathingStep = 0; // 0: Nefes al, 1: Tut, 2: Nefes ver
  int _breathingCount = 0;
  bool _isBreathingActive = false;

  // Motivasyon mesajları
  final List<String> _motivationQuotes = [
    "Başarı, her gün tekrarlanan küçük çabalardan oluşur.",
    "Bugün yaptığın çalışma, yarın istediğin geleceğe bir adımdır.",
    "Zorluklar, güçlü insanlar yaratmak için vardır.",
    "Başarı bir yolculuktur, bir varış noktası değil.",
    "Bir şeyi gerçekten istiyorsan, tüm evren onu gerçekleştirmek için işbirliği yapar.",
    "Büyük başarılar, küçük başlangıçlardan doğar.",
    "Başarının sırrı, başlamaktır.",
    "Bir hedefin varsa, ona ulaşmak için her gün bir adım at.",
    "Bugün zorlandığın şey, yarın güçlü yanın olacak.",
    "Asla vazgeçme, çünkü vazgeçtiğin an, başarıya en yakın olduğun andır."
  ];

  // Odaklanma müzikleri
  final List<Map<String, String>> _focusTracks = [
    {
      'title': 'Derin Odaklanma',
      'description': 'Çalışma sırasında konsantrasyonu artıran alfa dalgaları',
      'url': 'https://example.com/focus1.mp3'
    },
    {
      'title': 'Doğa Sesleri',
      'description': 'Orman ve yağmur sesleriyle sakin bir çalışma ortamı',
      'url': 'https://example.com/focus2.mp3'
    },
    {
      'title': 'Lo-Fi Çalışma',
      'description': 'Dinlendirici lo-fi müzikle verimli çalışma',
      'url': 'https://example.com/focus3.mp3'
    },
    {
      'title': 'Klasik Müzik',
      'description': 'Mozart ve Bach ile zihinsel performansı artırma',
      'url': 'https://example.com/focus4.mp3'
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadUserMentalData();
  }

  Future<void> _loadUserMentalData() async {
    // Kullanıcının zihinsel destek verilerini yükle
    final authService = Provider.of<MockAuthService>(context, listen: false);
    final user = authService.currentUser;
    if (user != null) {
      try {
        final dbService =
            Provider.of<MockDatabaseService>(context, listen: false);
        // Mock implementation - gerçek uygulamada veri yüklenecek
        print('Zihinsel destek verileri yüklendi');
      } catch (e) {
        print('Zihinsel destek verileri yüklenirken hata: $e');
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _audioPlayer.dispose();
    _breathingTimer?.cancel();
    super.dispose();
  }

  void _startBreathingExercise() {
    if (_isBreathingActive) return;

    setState(() {
      _isBreathingActive = true;
      _breathingStep = 0;
      _breathingCount = 0;
    });

    _breathingTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (!_isBreathingActive) {
        timer.cancel();
        return;
      }

      setState(() {
        _breathingStep = (_breathingStep + 1) % 3;
        if (_breathingStep == 0) {
          _breathingCount++;
        }

        if (_breathingCount >= 10) {
          _stopBreathingExercise();
        }
      });
    });
  }

  void _stopBreathingExercise() {
    _breathingTimer?.cancel();
    setState(() {
      _isBreathingActive = false;
    });
  }

  Future<void> _playAudio(String url, String title) async {
    if (_isPlaying && _currentTrack == title) {
      // Aynı parça çalıyorsa durdur
      await _audioPlayer.stop();
      setState(() {
        _isPlaying = false;
        _currentTrack = '';
      });
    } else {
      // Başka bir parça çalıyorsa önce onu durdur
      if (_isPlaying) {
        await _audioPlayer.stop();
      }

      // Yeni parçayı çal
      await _audioPlayer.play(UrlSource(url));
      setState(() {
        _isPlaying = true;
        _currentTrack = title;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Zihinsel Destek'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Stres Yönetimi'),
            Tab(text: 'Odaklanma'),
            Tab(text: 'Motivasyon'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildStressManagementTab(),
          _buildFocusTab(),
          _buildMotivationTab(),
        ],
      ),
    );
  }

  Widget _buildStressManagementTab() {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Nefes Egzersizleri',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 16),

          // 4-7-8 Nefes Egzersizi Kartı
          Card(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '4-7-8 Nefes Tekniği',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Bu teknik, hızlı bir şekilde sakinleşmenize ve odaklanmanıza yardımcı olur. '
                    '4 saniye nefes alın, 7 saniye tutun ve 8 saniye verin.',
                  ),
                  const SizedBox(height: 16),
                  if (_isBreathingActive)
                    Column(
                      children: [
                        AnimatedContainer(
                          duration: const Duration(seconds: 4),
                          height: 200,
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: _breathingStep == 0
                                ? Colors.blue.withAlpha(77)
                                : _breathingStep == 1
                                    ? Colors.blue.withAlpha(153)
                                    : Colors.blue.withAlpha(51),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Center(
                            child: Text(
                              _breathingStep == 0
                                  ? 'Nefes Al (4s)'
                                  : _breathingStep == 1
                                      ? 'Tut (7s)'
                                      : 'Nefes Ver (8s)',
                              style: theme.textTheme.headlineSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Tekrar: $_breathingCount / 10',
                          style: theme.textTheme.titleMedium,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _stopBreathingExercise,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red,
                          ),
                          child: const Text('Durdur'),
                        ),
                      ],
                    )
                  else
                    Center(
                      child: ElevatedButton.icon(
                        onPressed: _startBreathingExercise,
                        icon: const Icon(Icons.play_arrow),
                        label: const Text('Egzersizi Başlat'),
                      ),
                    ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          Text(
            'Hızlı Rahatlama Teknikleri',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 16),

          // Progresif Kas Gevşetme Kartı
          _buildTechniqueCard(
            title: 'Progresif Kas Gevşetme',
            description:
                'Vücudunuzdaki her kas grubunu sırayla gerip gevşeterek rahatlayın.',
            steps: [
              'Rahat bir pozisyonda oturun veya uzanın.',
              'Ayak parmaklarınızdan başlayarak, her kas grubunu 5 saniye gerin.',
              'Sonra 10 saniye boyunca gevşetin.',
              'Bacaklar, karın, göğüs, kollar ve yüz kaslarıyla devam edin.',
              'Tüm vücudunuzun gevşediğini hissedin.'
            ],
          ),

          const SizedBox(height: 16),

          // 5-4-3-2-1 Tekniği Kartı
          _buildTechniqueCard(
            title: '5-4-3-2-1 Duyusal Farkındalık',
            description:
                'Anksiyete ve stresi hızla azaltmak için duyularınızı kullanın.',
            steps: [
              '5 şey gör: Etrafınızdaki beş farklı nesneyi fark edin.',
              '4 şey dokun: Farklı dokulara sahip dört nesneye dokunun.',
              '3 şey duy: Çevrenizdeki üç farklı sesi dinleyin.',
              '2 şey kokla: İki farklı koku alın.',
              '1 şey tat: Bir şeyin tadına bakın veya tadını hatırlayın.'
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTechniqueCard({
    required String title,
    required String description,
    required List<String> steps,
  }) {
    final theme = Theme.of(context);

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(description),
            const SizedBox(height: 16),
            ...steps.asMap().entries.map((entry) {
              final index = entry.key;
              final step = entry.value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8.0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${index + 1}. ',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Expanded(child: Text(step)),
                  ],
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildFocusTab() {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Odaklanma Müzikleri',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 16),

          // Odaklanma müzikleri listesi
          ..._focusTracks.map((track) => _buildMusicCard(
                title: track['title']!,
                description: track['description']!,
                url: track['url']!,
              )),

          const SizedBox(height: 24),

          Text(
            'Pomodoro Tekniği',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 16),

          Card(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Pomodoro Tekniği',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                      'Pomodoro tekniği, 25 dakika odaklanmış çalışma ve 5 dakika mola döngüsünden oluşur. '
                      'Her 4 pomodoro sonrasında 15-30 dakikalık uzun bir mola verilir.'),
                  const SizedBox(height: 16),
                  Center(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        // Pomodoro zamanlayıcısını başlat
                        // Bu örnekte sadece bir mesaj gösteriyoruz
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                                'Pomodoro zamanlayıcısı yakında eklenecek!'),
                          ),
                        );
                      },
                      icon: const Icon(Icons.timer),
                      label: const Text('Pomodoro Başlat'),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          Text(
            'Odaklanma İpuçları',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 16),

          _buildTipCard(
            title: 'Çalışma Ortamını Düzenle',
            tips: [
              'Sessiz ve düzenli bir ortam oluşturun.',
              'Telefonu uzak bir yere koyun veya uçak moduna alın.',
              'Çalışma masanızı sadece gerekli malzemelerle düzenleyin.',
              'Doğal ışık alan bir ortamda çalışmayı tercih edin.'
            ],
          ),

          const SizedBox(height: 16),

          _buildTipCard(
            title: 'Zihinsel Hazırlık',
            tips: [
              'Çalışmaya başlamadan önce 5 dakika meditasyon yapın.',
              'Günlük hedeflerinizi yazın ve önceliklendirin.',
              'Çalışma sürenizi ve molalarınızı önceden planlayın.',
              'Zor konulara taze zihinle, günün erken saatlerinde odaklanın.'
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMusicCard({
    required String title,
    required String description,
    required String url,
  }) {
    final theme = Theme.of(context);
    final isCurrentlyPlaying = _isPlaying && _currentTrack == title;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        title: Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        subtitle: Text(description),
        trailing: IconButton(
          icon: Icon(
            isCurrentlyPlaying
                ? Icons.pause_circle_filled
                : Icons.play_circle_filled,
            size: 40,
            color: theme.colorScheme.primary,
          ),
          onPressed: () => _playAudio(url, title),
        ),
      ),
    );
  }

  Widget _buildTipCard({
    required String title,
    required List<String> tips,
  }) {
    final theme = Theme.of(context);

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ...tips
                .map((tip) => Padding(
                      padding: const EdgeInsets.only(bottom: 8.0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.check_circle,
                            size: 16,
                            color: Colors.green,
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: Text(tip)),
                        ],
                      ),
                    ))
                .toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildMotivationTab() {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Günün Motivasyon Sözü',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 16),

          // Günün motivasyon sözü kartı
          Card(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                children: [
                  const Icon(
                    Icons.format_quote,
                    size: 40,
                    color: Colors.amber,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _motivationQuotes[
                        DateTime.now().day % _motivationQuotes.length],
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontStyle: FontStyle.italic,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          Text(
            'Başarı Hikayeleri',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 16),

          _buildSuccessStoryCard(
            name: 'Ahmet Yılmaz',
            story:
                'Lise son sınıfta günde sadece 4 saat uyuyarak çalıştım ve sonunda hayalim olan tıp fakültesini kazandım.',
            lesson:
                'Disiplin ve kararlılık, her türlü zorluğu aşmanızı sağlar.',
          ),

          const SizedBox(height: 16),

          _buildSuccessStoryCard(
            name: 'Zeynep Kaya',
            story:
                'YKS\'ye ikinci girişimde, ilk yıl yaptığım hataları düzelterek puanımı 120 puan artırdım ve istediğim üniversiteye yerleştim.',
            lesson: 'Başarısızlıklar, başarı yolunda öğrenme fırsatlarıdır.',
          ),

          const SizedBox(height: 24),

          Text(
            'Hedef Belirleme',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 16),

          Card(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SMART Hedefler',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildSmartGoalItem(
                    letter: 'S',
                    title: 'Specific (Belirli)',
                    description: 'Hedefin net ve belirli olmalı.',
                  ),
                  _buildSmartGoalItem(
                    letter: 'M',
                    title: 'Measurable (Ölçülebilir)',
                    description: 'İlerlemeyi ölçebilmelisin.',
                  ),
                  _buildSmartGoalItem(
                    letter: 'A',
                    title: 'Achievable (Ulaşılabilir)',
                    description: 'Hedef zorlayıcı ama ulaşılabilir olmalı.',
                  ),
                  _buildSmartGoalItem(
                    letter: 'R',
                    title: 'Relevant (İlgili)',
                    description: 'Hedef, genel amaçlarınla uyumlu olmalı.',
                  ),
                  _buildSmartGoalItem(
                    letter: 'T',
                    title: 'Time-bound (Zamana Bağlı)',
                    description: 'Net bir zaman çerçeven olmalı.',
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        // Hedef belirleme ekranına yönlendir
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                                'Hedef belirleme ekranı yakında eklenecek!'),
                          ),
                        );
                      },
                      icon: const Icon(Icons.add_task),
                      label: const Text('Yeni Hedef Belirle'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessStoryCard({
    required String name,
    required String story,
    required String lesson,
  }) {
    final theme = Theme.of(context);

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: theme.colorScheme.primary,
                  child: Text(
                    name[0],
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  name,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(story),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.lightbulb,
                  color: Colors.amber,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Ders: $lesson',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSmartGoalItem({
    required String letter,
    required String title,
    required String description,
  }) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                letter,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(description),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
