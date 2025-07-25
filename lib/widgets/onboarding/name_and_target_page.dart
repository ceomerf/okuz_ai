import 'package:flutter/material.dart';
import 'package:okuz_ai/models/onboarding_data.dart';
import 'package:okuz_ai/theme/app_theme.dart';
import 'package:google_fonts/google_fonts.dart';

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
  late TextEditingController _nameController;
  late TextEditingController _universitySearchController;
  String? _selectedUniversity;
  bool _showUniversityList = false;
  final FocusNode _universityFocusNode = FocusNode();

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
    "İstanbul Rumeli Üniversitesi",
    "İstanbul Sabahattin Zaim Üniversitesi",
    "İstanbul Sağlık ve Teknoloji Üniversitesi",
    "İstanbul Ticaret Üniversitesi",
    "İstanbul Topkapı Üniversitesi",
    "İstinye Üniversitesi (İstanbul)",
    "İzmir Ekonomi Üniversitesi",
    "İzmir Tınaztepe Üniversitesi",
    "Kadir Has Üniversitesi (İstanbul)",
    "Kapadokya Üniversitesi (Nevşehir)",
    "Koç Üniversitesi (İstanbul)",
    "KTO Karatay Üniversitesi (Konya)",
    "Lokman Hekim Üniversitesi (Ankara)",
    "Maltepe Üniversitesi (İstanbul)",
    "MEF Üniversitesi (İstanbul)",
    "Mudanya Üniversitesi (Bursa)",
    "Nişantaşı Üniversitesi (İstanbul)",
    "Nuh Naci Yazgan Üniversitesi (Kayseri)",
    "Ostim Teknik Üniversitesi (Ankara)",
    "Özyeğin Üniversitesi (İstanbul)",
    "Piri Reis Üniversitesi (İstanbul)",
    "Sabancı Üniversitesi (İstanbul)",
    "Sanko Üniversitesi (Gaziantep)",
    "TED Üniversitesi (Ankara)",
    "TOBB Ekonomi ve Teknoloji Üniversitesi (Ankara)",
    "Toros Üniversitesi (Mersin)",
    "Türk Hava Kurumu Üniversitesi (Ankara)",
    "Ufuk Üniversitesi (Ankara)",
    "Üsküdar Üniversitesi (İstanbul)",
    "Yaşar Üniversitesi (İzmir)",
    "Yeditepe Üniversitesi (İstanbul)",
    "Yeni Yüzyıl Üniversitesi (İstanbul)",
    "Yüksek İhtisas Üniversitesi (Ankara)",

    // KKTC Üniversiteleri
    "Ada Kent Üniversitesi (Gazimağusa)",
    "Akdeniz Karpaz Üniversitesi (Lefkoşa)",
    "Arkın Yaratıcı Sanatlar ve Tasarım Üniversitesi (Girne)",
    "Atatürk Öğretmen Akademisi (Lefkoşa)",
    "Bahçeşehir Kıbrıs Üniversitesi (Lefkoşa)",
    "Doğu Akdeniz Üniversitesi (Gazimağusa)",
    "Girne Amerikan Üniversitesi",
    "Girne Üniversitesi",
    "Kıbrıs Amerikan Üniversitesi (Lefkoşa)",
    "Kıbrıs Batı Üniversitesi (Gazimağusa)",
    "Kıbrıs İlim Üniversitesi (Girne)",
    "Kıbrıs Sağlık ve Toplum Bilimleri Üniversitesi (Güzelyurt)",
    "Lefke Avrupa Üniversitesi",
    "Netkent Akdeniz Araştırma ve Bilim Üniversitesi (Lefkoşa)",
    "Orta Doğu Teknik Üniversitesi Kuzey Kıbrıs Kampüsü (Güzelyurt)",
    "Rauf Denktaş Üniversitesi (Lefkoşa)",
    "Uluslararası Final Üniversitesi (Girne)",
    "Uluslararası Kıbrıs Üniversitesi (Lefkoşa)"
  ];

  List<String> _filteredUniversities = [];

  @override
  void initState() {
    super.initState();
    _nameController =
        TextEditingController(text: widget.onboardingData.fullName);
    _universitySearchController = TextEditingController();
    _selectedUniversity = widget.onboardingData.targetUniversity;
    _filteredUniversities = _universities;

    _universityFocusNode.addListener(() {
      if (_universityFocusNode.hasFocus) {
        setState(() {
          _showUniversityList = true;
        });
      }
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _universitySearchController.dispose();
    _universityFocusNode.dispose();
    super.dispose();
  }

  void _filterUniversities(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredUniversities = _universities;
      } else {
        _filteredUniversities = _universities
            .where((uni) => uni.toLowerCase().contains(query.toLowerCase()))
            .toList();
      }
    });
  }

  void _selectUniversity(String university) {
    setState(() {
      _selectedUniversity = university;
      _showUniversityList = false;
      _universitySearchController.text = university;
      widget.onboardingData.targetUniversity = university;
    });
    FocusScope.of(context).unfocus();
    _tryAutoSubmit();
  }

  bool _isFormValid() {
    if (widget.isParentMode) {
      return _nameController.text.trim().isNotEmpty;
    } else {
      return _nameController.text.trim().isNotEmpty &&
          _selectedUniversity != null;
    }
  }

  void _tryAutoSubmit() {
    if (_isFormValid()) {
      widget.onboardingData.fullName = _nameController.text.trim();
      if (!widget.isParentMode && _selectedUniversity != null) {
        widget.onboardingData.targetUniversity = _selectedUniversity!;
      }
      widget.onNext();
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        FocusScope.of(context).unfocus();
        setState(() {
          _showUniversityList = false;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24.0),
        color: Theme.of(context).scaffoldBackgroundColor,
        child: SingleChildScrollView(
          child: SizedBox(
            height: MediaQuery.of(context).size.height,
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 80),
                  // Başlık
                  Text(
                    widget.isParentMode ? 'Veli Bilgileri' : 'Kendini Tanıt',
                    style: GoogleFonts.figtree(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.getPrimaryTextColor(context),
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  // Alt başlık
                  Text(
                    widget.isParentMode
                        ? 'Veli adını yaz.'
                        : 'Adını ve hedeflediğin üniversiteyi yaz.',
                    style: GoogleFonts.figtree(
                      fontSize: 16,
                      color: AppTheme.getSecondaryTextColor(context),
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 60),
                  // İsim alanı
                  Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).cardColor,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: Theme.of(context).dividerColor,
                        width: 1,
                      ),
                    ),
                    child: TextFormField(
                      controller: _nameController,
                      cursorColor: AppTheme.primaryColor,
                      style: GoogleFonts.figtree(fontSize: 16),
                      decoration: InputDecoration(
                        labelText: widget.isParentMode
                            ? 'Veli Adı Soyadı'
                            : 'Ad Soyad',
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 20, vertical: 16),
                        labelStyle: GoogleFonts.figtree(
                          color: AppTheme.getSecondaryTextColor(context),
                          fontSize: 16,
                        ),
                        floatingLabelStyle: GoogleFonts.figtree(
                          color: AppTheme.primaryColor,
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      validator: (v) => (v == null || v.trim().isEmpty)
                          ? 'Lütfen adını gir.'
                          : null,
                      onChanged: (value) {
                        widget.onboardingData.fullName = value.trim();
                        setState(() {});
                        _tryAutoSubmit();
                      },
                      textInputAction: widget.isParentMode
                          ? TextInputAction.done
                          : TextInputAction.next,
                      onFieldSubmitted: (_) => _tryAutoSubmit(),
                    ),
                  ),
                  // Öğrenci modu için üniversite alanı
                  if (!widget.isParentMode) ...[
                    const SizedBox(height: 24),
                    Container(
                      decoration: BoxDecoration(
                        color: Theme.of(context).cardColor,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: Theme.of(context).dividerColor,
                          width: 1,
                        ),
                      ),
                      child: TextFormField(
                        controller: _universitySearchController,
                        focusNode: _universityFocusNode,
                        cursorColor: AppTheme.primaryColor,
                        style: GoogleFonts.figtree(fontSize: 16),
                        decoration: InputDecoration(
                          labelText: 'Hedef Üniversite',
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 20, vertical: 16),
                          labelStyle: GoogleFonts.figtree(
                            color: AppTheme.getSecondaryTextColor(context),
                            fontSize: 16,
                          ),
                          floatingLabelStyle: GoogleFonts.figtree(
                            color: AppTheme.primaryColor,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                          prefixIcon: Icon(
                            Icons.school_outlined,
                            color: AppTheme.primaryColor,
                            size: 20,
                          ),
                          suffixIcon:
                              _universitySearchController.text.isNotEmpty
                                  ? IconButton(
                                      icon: Icon(
                                        Icons.clear,
                                        color: AppTheme.primaryColor,
                                        size: 20,
                                      ),
                                      onPressed: () {
                                        _universitySearchController.clear();
                                        _filterUniversities('');
                                        setState(() {});
                                      },
                                    )
                                  : null,
                        ),
                        onChanged: (value) {
                          _filterUniversities(value);
                          setState(() {});
                        },
                        validator: (v) => (_selectedUniversity == null)
                            ? 'Lütfen hedefini gir.'
                            : null,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _tryAutoSubmit(),
                      ),
                    ),
                  ],
                  // Üniversite listesi
                  if (_showUniversityList && !widget.isParentMode)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
                      constraints: const BoxConstraints(maxHeight: 200),
                      decoration: BoxDecoration(
                        color: Theme.of(context).cardColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Theme.of(context).dividerColor,
                          width: 1,
                        ),
                      ),
                      child: _filteredUniversities.isEmpty
                          ? Padding(
                              padding: const EdgeInsets.all(16),
                              child: Text('Sonuç bulunamadı',
                                  style: GoogleFonts.figtree()),
                            )
                          : ListView.builder(
                              shrinkWrap: true,
                              itemCount: _filteredUniversities.length,
                              itemBuilder: (context, index) {
                                final university = _filteredUniversities[index];
                                return InkWell(
                                  onTap: () => _selectUniversity(university),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 12,
                                    ),
                                    child: Text(
                                      university,
                                      style: GoogleFonts.figtree(
                                        color: AppTheme.getPrimaryTextColor(
                                            context),
                                        fontSize: 14,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                  const Spacer(),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
