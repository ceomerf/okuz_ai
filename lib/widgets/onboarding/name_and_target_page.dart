import 'package:flutter/material.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

class NameAndTargetPage extends StatefulWidget {
  final OnboardingData onboardingData;
  final VoidCallback onNext;
  final bool isParentMode; // Veli modu için

  const NameAndTargetPage({
    Key? key,
    required this.onboardingData,
    required this.onNext,
    this.isParentMode = false, // Varsayılan olarak false
  }) : super(key: key);

  @override
  State<NameAndTargetPage> createState() => _NameAndTargetPageState();
}

class _NameAndTargetPageState extends State<NameAndTargetPage> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _universitySearchController;
  String? _selectedUniversity;
  bool _showUniversityList = false;
  final FocusNode _universityFocusNode = FocusNode();
  String? _userName;
  bool _isLoading = true;

  // Üniversite listesi
  final List<String> _universities = [
    // Devlet Üniversiteleri
    "Abdullah Gül Üniversitesi (Kayseri)",
    "Adana Alparslan Türkeş Bilim ve Teknoloji Üniversitesi",
    "Adıyaman Üniversitesi",
    "Afyon Kocatepe Üniversitesi",
    "Afyonkarahisar Sağlık Bilimleri Üniversitesi",
    "Ağrı İbrahim Çeçen Üniversitesi",
    "Akdeniz Üniversitesi (Antalya)",
    "Aksaray Üniversitesi",
    "Alanya Alaaddin Keykubat Üniversitesi (Antalya)",
    "Amasya Üniversitesi",
    "Anadolu Üniversitesi (Eskişehir)",
    "Ankara Hacı Bayram Veli Üniversitesi",
    "Ankara Müzik ve Güzel Sanatlar Üniversitesi",
    "Ankara Sosyal Bilimler Üniversitesi",
    "Ankara Üniversitesi",
    "Ankara Yıldırım Beyazıt Üniversitesi",
    "Ardahan Üniversitesi",
    "Artvin Çoruh Üniversitesi",
    "Atatürk Üniversitesi (Erzurum)",
    "Aydın Adnan Menderes Üniversitesi",
    "Balıkesir Üniversitesi",
    "Bandırma Onyedi Eylül Üniversitesi (Balıkesir)",
    "Bartın Üniversitesi",
    "Batman Üniversitesi",
    "Bayburt Üniversitesi",
    "Bilecik Şeyh Edebali Üniversitesi",
    "Bingöl Üniversitesi",
    "Bitlis Eren Üniversitesi",
    "Boğaziçi Üniversitesi (İstanbul)",
    "Bolu Abant İzzet Baysal Üniversitesi",
    "Burdur Mehmet Akif Ersoy Üniversitesi",
    "Bursa Teknik Üniversitesi",
    "Bursa Uludağ Üniversitesi",
    "Çanakkale Onsekiz Mart Üniversitesi",
    "Çankırı Karatekin Üniversitesi",
    "Çukurova Üniversitesi (Adana)",
    "Dicle Üniversitesi (Diyarbakır)",
    "Dokuz Eylül Üniversitesi (İzmir)",
    "Düzce Üniversitesi",
    "Ege Üniversitesi (İzmir)",
    "Erciyes Üniversitesi (Kayseri)",
    "Erzincan Binali Yıldırım Üniversitesi",
    "Erzurum Teknik Üniversitesi",
    "Eskişehir Osmangazi Üniversitesi",
    "Eskişehir Teknik Üniversitesi",
    "Fırat Üniversitesi (Elazığ)",
    "Galatasaray Üniversitesi (İstanbul)",
    "Gazi Üniversitesi (Ankara)",
    "Gaziantep İslam Bilim ve Teknoloji Üniversitesi",
    "Gaziantep Üniversitesi",
    "Gebze Teknik Üniversitesi (Kocaeli)",
    "Giresun Üniversitesi",
    "Gümüşhane Üniversitesi",
    "Hacettepe Üniversitesi (Ankara)",
    "Hakkari Üniversitesi",
    "Harran Üniversitesi (Şanlıurfa)",
    "Hatay Mustafa Kemal Üniversitesi",
    "Hitit Üniversitesi (Çorum)",
    "Iğdır Üniversitesi",
    "Isparta Uygulamalı Bilimler Üniversitesi",
    "İnönü Üniversitesi (Malatya)",
    "İskenderun Teknik Üniversitesi (Hatay)",
    "İstanbul Medeniyet Üniversitesi",
    "İstanbul Teknik Üniversitesi",
    "İstanbul Üniversitesi",
    "İstanbul Üniversitesi-Cerrahpaşa",
    "İzmir Bakırçay Üniversitesi",
    "İzmir Demokrasi Üniversitesi",
    "İzmir Kâtip Çelebi Üniversitesi",
    "İzmir Yüksek Teknoloji Enstitüsü",
    "Jandarma ve Sahil Güvenlik Akademisi (Ankara)",
    "Kafkas Üniversitesi (Kars)",
    "Kahramanmaraş Sütçü İmam Üniversitesi",
    "Karabük Üniversitesi",
    "Karadeniz Teknik Üniversitesi (Trabzon)",
    "Karamanoğlu Mehmetbey Üniversitesi (Karaman)",
    "Kastamonu Üniversitesi",
    "Kayseri Üniversitesi",
    "Kırıkkale Üniversitesi",
    "Kırklareli Üniversitesi",
    "Kırşehir Ahi Evran Üniversitesi",
    "Kilis 7 Aralık Üniversitesi",
    "Kocaeli Üniversitesi",
    "Kocaeli Sağlık ve Teknoloji Üniversitesi",
    "Konya Teknik Üniversitesi",
    "Kütahya Dumlupınar Üniversitesi",
    "Kütahya Sağlık Bilimleri Üniversitesi",
    "Malatya Turgut Özal Üniversitesi",
    "Manisa Celâl Bayar Üniversitesi",
    "Mardin Artuklu Üniversitesi",
    "Marmara Üniversitesi (İstanbul)",
    "Mimar Sinan Güzel Sanatlar Üniversitesi (İstanbul)",
    "Milli Savunma Üniversitesi (İstanbul)",
    "Muğla Sıtkı Koçman Üniversitesi",
    "Munzur Üniversitesi (Tunceli)",
    "Muş Alparslan Üniversitesi",
    "Necmettin Erbakan Üniversitesi (Konya)",
    "Nevşehir Hacı Bektaş Veli Üniversitesi",
    "Niğde Ömer Halisdemir Üniversitesi",
    "Ondokuz Mayıs Üniversitesi (Samsun)",
    "Ordu Üniversitesi",
    "Orta Doğu Teknik Üniversitesi (Ankara)",
    "Osmaniye Korkut Ata Üniversitesi",
    "Pamukkale Üniversitesi (Denizli)",
    "Recep Tayyip Erdoğan Üniversitesi (Rize)",
    "Sakarya Üniversitesi",
    "Sakarya Uygulamalı Bilimler Üniversitesi",
    "Samsun Üniversitesi",
    "Sağlık Bilimleri Üniversitesi (İstanbul)",
    "Selçuk Üniversitesi (Konya)",
    "Siirt Üniversitesi",
    "Sinop Üniversitesi",
    "Sivas Bilim ve Teknoloji Üniversitesi",
    "Sivas Cumhuriyet Üniversitesi",
    "Süleyman Demirel Üniversitesi (Isparta)",
    "Şırnak Üniversitesi",
    "Tekirdağ Namık Kemal Üniversitesi",
    "Tokat Gaziosmanpaşa Üniversitesi",
    "Trabzon Üniversitesi",
    "Trakya Üniversitesi (Edirne)",
    "Türk-Alman Üniversitesi (İstanbul)",
    "Türk-Japon Bilim ve Teknoloji Üniversitesi (İstanbul)",
    "Uşak Üniversitesi",
    "Van Yüzüncü Yıl Üniversitesi",
    "Yalova Üniversitesi",
    "Yozgat Bozok Üniversitesi",
    "Zonguldak Bülent Ecevit Üniversitesi",

    // Vakıf (Özel) Üniversiteleri
    "Acıbadem Mehmet Ali Aydınlar Üniversitesi (İstanbul)",
    "Alanya Üniversitesi (Antalya)",
    "Altınbaş Üniversitesi (İstanbul)",
    "Ankara Bilim Üniversitesi",
    "Ankara Medipol Üniversitesi",
    "Antalya Akev Üniversitesi",
    "Antalya Belek Üniversitesi",
    "Antalya Bilim Üniversitesi",
    "Atılım Üniversitesi (Ankara)",
    "Avrasya Üniversitesi (Trabzon)",
    "Bahçeşehir Üniversitesi (İstanbul)",
    "Başkent Üniversitesi (Ankara)",
    "Beykent Üniversitesi (İstanbul)",
    "Beykoz Üniversitesi (İstanbul)",
    "Bezm-i Âlem Vakıf Üniversitesi (İstanbul)",
    "Biruni Üniversitesi (İstanbul)",
    "Çağ Üniversitesi (Mersin)",
    "Çankaya Üniversitesi (Ankara)",
    "Demiroğlu Bilim Üniversitesi (İstanbul)",
    "Doğuş Üniversitesi (İstanbul)",
    "Fenerbahçe Üniversitesi (İstanbul)",
    "Fatih Sultan Mehmet Vakıf Üniversitesi (İstanbul)",
    "Haliç Üniversitesi (İstanbul)",
    "Hasan Kalyoncu Üniversitesi (Gaziantep)",
    "Işık Üniversitesi (İstanbul)",
    "İbn Haldun Üniversitesi (İstanbul)",
    "İhsan Doğramacı Bilkent Üniversitesi (Ankara)",
    "İstanbul 29 Mayıs Üniversitesi",
    "İstanbul Arel Üniversitesi",
    "İstanbul Atlas Üniversitesi",
    "İstanbul Aydın Üniversitesi",
    "İstanbul Beykoz Üniversitesi",
    "İstanbul Bilgi Üniversitesi",
    "İstanbul Esenyurt Üniversitesi",
    "İstanbul Galata Üniversitesi",
    "İstanbul Gedik Üniversitesi",
    "İstanbul Gelişim Üniversitesi",
    "İstanbul Kent Üniversitesi",
    "İstanbul Kültür Üniversitesi",
    "İstanbul Medipol Üniversitesi",
    "İstanbul Okan Üniversitesi",
    "İstanbul Sabahattin Zaim Üniversitesi",
    "İstanbul Sağlık ve Teknoloji Üniversitesi",
    "İstanbul Şehir Üniversitesi",
    "İstanbul Ticaret Üniversitesi",
    "İstanbul Üniversitesi-Cerrahpaşa",
    "İzmir Ekonomi Üniversitesi",
    "İzmir Tınaztepe Üniversitesi",
    "Kadir Has Üniversitesi (İstanbul)",
    "Koç Üniversitesi (İstanbul)",
    "Maltepe Üniversitesi (İstanbul)",
    "MEF Üniversitesi (İstanbul)",
    "Nişantaşı Üniversitesi (İstanbul)",
    "Özyeğin Üniversitesi (İstanbul)",
    "Piri Reis Üniversitesi (İstanbul)",
    "Sabancı Üniversitesi (İstanbul)",
    "TED Üniversitesi (Ankara)",
    "TOBB Ekonomi ve Teknoloji Üniversitesi (Ankara)",
    "Türk Hava Kurumu Üniversitesi (Ankara)",
    "Ufuk Üniversitesi (Ankara)",
    "Üsküdar Üniversitesi (İstanbul)",
    "Yaşar Üniversitesi (İzmir)",
    "Yeditepe Üniversitesi (İstanbul)",
    "Yıldız Teknik Üniversitesi (İstanbul)",
  ];

  @override
  void initState() {
    super.initState();
    _universitySearchController = TextEditingController();
    _loadUserName();
  }

  Future<void> _loadUserName() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userName = prefs.getString('user_name');
      setState(() {
        _userName = userName;
        _isLoading = false;
      });
      // Kullanıcı adını onboarding verilerine set et
      if (userName != null && userName.isNotEmpty) {
        widget.onboardingData.fullName = userName;
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _universitySearchController.dispose();
    _universityFocusNode.dispose();
    super.dispose();
  }

  List<String> get _filteredUniversities {
    if (_universitySearchController.text.isEmpty) {
      return _universities;
    }
    return _universities
        .where((university) => university
            .toLowerCase()
            .contains(_universitySearchController.text.toLowerCase()))
        .toList();
  }

  void _selectUniversity(String university) {
    setState(() {
      _selectedUniversity = university;
      _universitySearchController.text = university;
      _showUniversityList = false;
    });
    widget.onboardingData.targetUniversity = university;
    // Kullanıcı adını da set et
    widget.onboardingData.fullName = _userName;
    // Ana ekranın yeniden render olması için onNext callback'ini çağır
    widget.onNext();
  }

  void _handleNext() {
    if (_selectedUniversity != null) {
      // Kullanıcı adını da set et
      if (_userName != null && _userName!.isNotEmpty) {
        widget.onboardingData.fullName = _userName;
      }
      widget.onNext();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return Scaffold(
        backgroundColor: isDark
            ? AppTheme.darkBackgroundColor
            : AppTheme.lightBackgroundColor,
        body: Center(
          child: CircularProgressIndicator(
            color: AppTheme.primaryColor,
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor:
          isDark ? AppTheme.darkBackgroundColor : AppTheme.lightBackgroundColor,
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 20),

                // Hoş geldin mesajı
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppTheme.primaryColor.withOpacity(0.1),
                        AppTheme.primaryColor.withOpacity(0.05),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppTheme.primaryColor.withOpacity(0.2),
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        Icons.school_rounded,
                        size: 60,
                        color: AppTheme.primaryColor,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Hoş geldin, $_userName! 👋',
                        style: GoogleFonts.figtree(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: isDark
                              ? AppTheme.darkTextPrimaryColor
                              : AppTheme.lightTextPrimaryColor,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Üniversite yolculuğuna başlayalım',
                        style: GoogleFonts.figtree(
                          fontSize: 16,
                          color: isDark
                              ? AppTheme.darkTextSecondaryColor
                              : AppTheme.lightTextSecondaryColor,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // Üniversite seçimi başlığı
                Text(
                  'Hedef Üniversiten',
                  style: GoogleFonts.figtree(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: isDark
                        ? AppTheme.darkTextPrimaryColor
                        : AppTheme.lightTextPrimaryColor,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Hangi üniversitede okumak istiyorsun?',
                  style: GoogleFonts.figtree(
                    fontSize: 16,
                    color: isDark
                        ? AppTheme.darkTextSecondaryColor
                        : AppTheme.lightTextSecondaryColor,
                  ),
                ),

                const SizedBox(height: 24),

                // Üniversite arama ve seçim alanı
                Container(
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppTheme.darkCardColor
                        : AppTheme.lightCardColor,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Arama alanı
                      TextFormField(
                        controller: _universitySearchController,
                        focusNode: _universityFocusNode,
                        style: GoogleFonts.figtree(
                          fontSize: 16,
                          color: isDark
                              ? AppTheme.darkTextPrimaryColor
                              : AppTheme.lightTextPrimaryColor,
                        ),
                        decoration: InputDecoration(
                          labelText: 'Üniversite Ara',
                          hintText: 'Üniversite adını yazmaya başla...',
                          labelStyle: GoogleFonts.figtree(
                            fontSize: 14,
                            color: isDark
                                ? AppTheme.darkTextSecondaryColor
                                : AppTheme.lightTextSecondaryColor,
                          ),
                          prefixIcon: Icon(
                            Icons.search,
                            color: AppTheme.primaryColor,
                            size: 24,
                          ),
                          suffixIcon:
                              _universitySearchController.text.isNotEmpty
                                  ? IconButton(
                                      onPressed: () {
                                        setState(() {
                                          _universitySearchController.clear();
                                          _selectedUniversity = null;
                                          _showUniversityList = false;
                                        });
                                      },
                                      icon: Icon(
                                        Icons.clear,
                                        color: isDark
                                            ? AppTheme.darkTextSecondaryColor
                                            : AppTheme.lightTextSecondaryColor,
                                      ),
                                    )
                                  : null,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(
                              color: isDark
                                  ? AppTheme.darkDividerColor
                                  : AppTheme.lightDividerColor,
                            ),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(
                              color: isDark
                                  ? AppTheme.darkDividerColor
                                  : AppTheme.lightDividerColor,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(
                              color: AppTheme.primaryColor,
                              width: 2,
                            ),
                          ),
                          filled: true,
                          fillColor: isDark
                              ? AppTheme.darkBackgroundColor
                              : AppTheme.lightBackgroundColor,
                        ),
                        onChanged: (value) {
                          setState(() {
                            _showUniversityList = value.isNotEmpty;
                          });
                        },
                        onTap: () {
                          setState(() {
                            _showUniversityList =
                                _universitySearchController.text.isNotEmpty;
                          });
                        },
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Lütfen bir üniversite seçin';
                          }
                          if (_selectedUniversity == null) {
                            return 'Lütfen listeden bir üniversite seçin';
                          }
                          return null;
                        },
                      ),

                      // Üniversite listesi
                      if (_showUniversityList)
                        Container(
                          constraints: const BoxConstraints(maxHeight: 300),
                          decoration: BoxDecoration(
                            color: isDark
                                ? AppTheme.darkCardColor
                                : AppTheme.lightCardColor,
                            borderRadius: const BorderRadius.only(
                              bottomLeft: Radius.circular(12),
                              bottomRight: Radius.circular(12),
                            ),
                            border: Border(
                              top: BorderSide(
                                color: isDark
                                    ? AppTheme.darkDividerColor
                                    : AppTheme.lightDividerColor,
                              ),
                            ),
                          ),
                          child: ListView.builder(
                            shrinkWrap: true,
                            itemCount: _filteredUniversities.length,
                            itemBuilder: (context, index) {
                              final university = _filteredUniversities[index];
                              final isSelected =
                                  university == _selectedUniversity;

                              return ListTile(
                                title: Text(
                                  university,
                                  style: GoogleFonts.figtree(
                                    fontSize: 14,
                                    fontWeight: isSelected
                                        ? FontWeight.w600
                                        : FontWeight.normal,
                                    color: isSelected
                                        ? AppTheme.primaryColor
                                        : (isDark
                                            ? AppTheme.darkTextPrimaryColor
                                            : AppTheme.lightTextPrimaryColor),
                                  ),
                                ),
                                leading: Icon(
                                  Icons.school,
                                  color: isSelected
                                      ? AppTheme.primaryColor
                                      : (isDark
                                          ? AppTheme.darkTextSecondaryColor
                                          : AppTheme.lightTextSecondaryColor),
                                  size: 20,
                                ),
                                trailing: isSelected
                                    ? Icon(
                                        Icons.check_circle,
                                        color: AppTheme.primaryColor,
                                        size: 20,
                                      )
                                    : null,
                                onTap: () => _selectUniversity(university),
                                tileColor: isSelected
                                    ? AppTheme.primaryColor.withOpacity(0.1)
                                    : null,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              );
                            },
                          ),
                        ),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // Seçilen üniversite gösterimi
                if (_selectedUniversity != null)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppTheme.primaryColor.withOpacity(0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.check_circle,
                          color: AppTheme.primaryColor,
                          size: 24,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Seçilen Üniversite:',
                                style: GoogleFonts.figtree(
                                  fontSize: 12,
                                  color: AppTheme.primaryColor,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              Text(
                                _selectedUniversity!,
                                style: GoogleFonts.figtree(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.primaryColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                const SizedBox(height: 40),

                // İstatistikler
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppTheme.darkCardColor
                        : AppTheme.lightCardColor,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '📊 Üniversite İstatistikleri',
                        style: GoogleFonts.figtree(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isDark
                              ? AppTheme.darkTextPrimaryColor
                              : AppTheme.lightTextPrimaryColor,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: _buildStatCard(
                              icon: Icons.school,
                              title: 'Toplam Üniversite',
                              value: '${_universities.length}',
                              color: Colors.blue,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildStatCard(
                              icon: Icons.location_city,
                              title: 'Devlet Üniversitesi',
                              value:
                                  '${_universities.where((u) => !u.contains('Üniversitesi (') && !u.contains('Vakıf')).length}',
                              color: Colors.green,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _buildStatCard(
                              icon: Icons.business,
                              title: 'Vakıf Üniversitesi',
                              value:
                                  '${_universities.where((u) => u.contains('Vakıf') || u.contains('Üniversitesi (')).length}',
                              color: Colors.orange,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildStatCard(
                              icon: Icons.flag,
                              title: 'Şehir Sayısı',
                              value: '81',
                              color: Colors.purple,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String title,
    required String value,
    required Color color,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.3),
        ),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            color: color,
            size: 24,
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.figtree(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: GoogleFonts.figtree(
              fontSize: 12,
              color: isDark
                  ? AppTheme.darkTextSecondaryColor
                  : AppTheme.lightTextSecondaryColor,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
