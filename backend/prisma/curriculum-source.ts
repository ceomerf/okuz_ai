// Otomatik dönüştürülmüş: lib/models/curriculum_data.dart → TypeScript kaynak
// Bu dosya, seed.ts tarafından doğrudan import edilip veritabanını doldurmak için kullanılır.

export type TopicEntry = string | { topic: string; month?: number };

export type CurriculumLevel = {
  sinif_duzeyi: string;
  aciklama?: string;
  dersler: Array<{
    ders_adi: string;
    not?: string;
    temalar?: Array<{
      tema_adi: string;
      konular: TopicEntry[];
    }>;
    uniteler?: Array<{
      unite_adi: string;
      konular: TopicEntry[];
    }>;
  }>;
};

export const curriculum: CurriculumLevel[] = [
  {
    "sinif_duzeyi": "9. Sınıf",
    "aciklama": "Türkiye Yüzyılı Maarif Modeli (2025-2026 itibarıyla geçerli)",
    "dersler": [
      {
        "ders_adi": "Türk Dili ve Edebiyatı",
        "temalar": [
          {
            "tema_adi": "Sözün İnceliği",
            "konular": ["Okuma", "Yazma", "Dinleme/İzleme", "Konuşma"]
          },
          {
            "tema_adi": "Anlam Arayışı",
            "konular": ["Okuma", "Konuşma", "Dinleme/İzleme", "Yazma"]
          },
          {
            "tema_adi": "Anlamın Yapı Taşları",
            "konular": ["Okuma", "Konuşma", "Dinleme/İzleme", "Yazma"]
          }
        ]
      },
      {
        "ders_adi": "Matematik",
        "uniteler": [
          {
            "unite_adi": "Sayılar",
            "konular": ["Gerçek Sayıların Üslü ve Köklü Gösterimleri ile Yapılan İşlemler", "Gerçek Sayı Aralıkları ile Yapılan İşlemler", "Sayı Kümeleri ve İşlem Özellikleri", "İki Kare Farkı ve Tamkare Özdeşlikleri"]
          },
          {
            "unite_adi": "Nicelikler ve Değişimler",
            "konular": ["Gerçek Sayılarda Tanımlı Doğrusal Fonksiyonlar ve Mutlak Değer", "Fonksiyonlarının Nitel Özellikleri", "Doğrusal Fonksiyonlarla İfade Edilen Denklem ve Eşitsizlikler"]
          },
          {
            "unite_adi": "Algoritma ve Bilişim",
            "konular": ["Algoritma Temelli Problemler", "Mantık Bağlaçları ve Niceleyiciler"]
          },
          {
            "unite_adi": "Geometrik Şekiller",
            "konular": ["Üçgende Açı ve Kenarla İlgili Özellikler", "Üçgende Açı Özellikleri Arasındaki İlişkiler", "Üçgende Kenar Özellikleri Arasındaki İlişkiler"]
          },
          {
            "unite_adi": "Eşlik ve Benzerlik",
            "konular": ["Geometrik Şekillerin Yansıma, Öteleme ve Dönme Dönüşümleri Sonrası Görünüşü", "Üçgenlerde Eşlik ve Benzerlik Koşulları"]
          },
          {
            "unite_adi": "İstatistiksel Araştırma Süreci",
            "konular": ["Tek Nicel Değişken İçeren İstatistiksel Problemi Oluşturma"]
          },
          {
            "unite_adi": "Veriden Olasılığa",
            "konular": ["Verileri Toplama ve Analize Hazır Hâle Getirme", "Bulgulara Ulaşma ve Yorumlama"]
          }
        ]
      },
      {
        "ders_adi": "Fizik",
        "uniteler": [
          {
            "unite_adi": "Fizik Bilimi ve Kariyer Keşfi",
            "konular": ["Fizik Bilimi", "Fizik Biliminin Alt Dalları", "Fizik Bilimine Yön Verenler", "Fizik Bilimi ile İlgili Kariyer Keşfi"]
          },
          {
            "unite_adi": "Kuvvet ve Hareket",
            "konular": ["Temel ve Türetilmiş Nicelikler", "Skaler ve Vektörel Nicelikler", "Vektörler", "Doğadaki Temel Kuvvetler", "Hareket ve Hareket Türleri"]
          },
          {
            "unite_adi": "Akışkanlar",
            "konular": ["Basınç", "Sıvılarda Basınç", "Açık Hava Basıncı", "Kaldırma Kuvveti", "Bernoulli İlkesi"]
          },
          {
            "unite_adi": "Enerji",
            "konular": ["Enerji", "Isı ve Sıcaklık İlişkisi", "Isı, Öz Isı, Isı Sığası ve Sıcaklık Farkı", "Hâl Değişimi", "Isıl Denge", "Isı Aktarım Yolları"]
          }
        ]
      },
      {
        "ders_adi": "Kimya",
        "uniteler": [
          {
            "unite_adi": "Etkileşim",
            "konular": ["Kimya Hayattır", "Atomdan Periyodik Tabloya (Atom Teorileri, Atom Orbitalleri, Periyodik Tabloda Yer Bulma, Periyodik Özellikler)"]
          },
          {
            "unite_adi": "Çeşitlilik",
            "konular": ["Etkileşimler (Metalik, İyonik, Kovalent Bağ, Lewis Yapısı, Molekül Polarlığı)", "Etkileşimden Maddeye (Moleküller Arası Etkileşimler, Katılar, Sıvılar)"]
          },
          {
            "unite_adi": "Sürdürülebilirlik",
            "konular": ["Nanoparçacıklar ve Ekolojik Sürdürülebilirlik", "Yeşil Kimya"]
          }
        ]
      },
      {
        "ders_adi": "Biyoloji",
        "uniteler": [
          {
            "unite_adi": "Yaşam Bilimi: Biyoloji",
            "konular": ["Biyoloji ve Bilimsel Yöntem", "Canlıların Ortak Özellikleri", "Canlıların Yapısındaki Temel Bileşikler"]
          },
          {
            "unite_adi": "Sınıflandırma ve Biyoçeşitlilik",
            "konular": ["Sınıflandırmanın Temelleri", "Canlı Alemleri", "Biyoçeşitlilik"]
          },
          {
            "unite_adi": "Hücre",
            "konular": ["Hücre Teorisi", "Hücrenin Yapısı ve Organizasyonu", "Hücre Zarından Madde Geçişleri"]
          }
        ]
      },
      {
        "ders_adi": "Tarih",
        "uniteler": [
          {
            "unite_adi": "Geçmişin İnşa Sürecinde Tarih",
            "konular": ["Tarih Öğrenmenin Faydaları", "Tarihin Doğası", "Tarihsel Bilginin Üretim Süreci", "Tarih Araştırma ve Yazımında Dijitalleşme"]
          },
          {
            "unite_adi": "Eski Çağ Medeniyetleri",
            "konular": ["Tarım Devrimi'nin Etkileri", "Yönetim ve Ordu", "Hukuk", "İnançlar", "Bilim ve Sanat", "Türklerde Konargöçer Yaşam"]
          },
          {
            "unite_adi": "Orta Çağ Medeniyetleri",
            "konular": ["Kitlesel Göçler", "Devlet Yapıları", "Ticaret Yolları", "Bilim, Kültür ve Sanat"]
          }
        ]
      },
      {
        "ders_adi": "Coğrafya",
        "uniteler": [
          {
            "unite_adi": "Coğrafyanın Doğası",
            "konular": ["Coğrafya Biliminin Konusu ve Bölümleri", "Coğrafya Biliminin Gelişimi"]
          },
          {
            "unite_adi": "Mekânsal Bilgi Teknolojileri",
            "konular": ["Haritalar", "Türkiye'nin Coğrafi Konumu", "Mekânsal Bilgi Teknolojileri"]
          },
          {
            "unite_adi": "Doğal Sistemler ve Süreçler",
            "konular": ["Hava Olayları", "İklim Sistemi", "İklim Türleri ve Değişiklikler"]
          },
          {
            "unite_adi": "Beşerî Sistemler ve Süreçler",
            "konular": ["Nüfusun Değişimi, Dağılışı ve Hareketleri", "Demografik Dönüşüm"]
          },
          {
            "unite_adi": "Ekonomik Faaliyetler ve Etkileri",
            "konular": ["Ekonomik Faaliyetleri Etkileyen Coğrafi Faktörler"]
          },
          {
            "unite_adi": "Afetler ve Sürdürülebilir Çevre",
            "konular": ["Afetler ve Çevre Yönetimi"]
          },
          {
            "unite_adi": "Bölgeler, Ülkeler ve Küresel Bağlantılar",
            "konular": ["Bölge Kavramı ve Sınıflandırmalar"]
          }
        ]
      },
      {
        "ders_adi": "Din Kültürü ve Ahlak Bilgisi",
        "uniteler": [
          {
            "unite_adi": "Allah-İnsan İlişkisi",
            "konular": ["İnsan ve Yaratılışı", "İbadet ve Dua Eden Varlık Olarak İnsan"]
          },
          {
            "unite_adi": "İslam'da İnanç Esasları",
            "konular": ["İman ve Mahiyeti", "İslam'da İman Esasları", "İmanın Bireye ve Topluma Kazandırdıkları"]
          },
          {
            "unite_adi": "İslam'da İbadetler",
            "konular": ["İbadetin Kapsamı", "Temel İbadetler", "İnsan ve İbadet"]
          },
          {
            "unite_adi": "İslam'da Ahlak İlkeleri",
            "konular": ["İslam'da Ahlakın Mahiyeti"]
          },
          {
            "unite_adi": "Kur'an'a Göre Hz. Muhammed (S.A.V)",
            "konular": ["Hz. Muhammed'in Beşerî ve Peygamberlik Yönü", "Hz. Muhammed'in Örnekliği"]
          }
        ]
      }
    ]
  },
  {
    "sinif_duzeyi": "10. Sınıf",
    "aciklama": "Türkiye Yüzyılı Maarif Modeli (2025-2026 itibarıyla geçerli)",
    "dersler": [
      {
        "ders_adi": "Türk Dili ve Edebiyatı",
        "temalar": [
          {
            "tema_adi": "Sözün Ezgisi",
            "konular": ["Koşuk", "Türkü", "Koşma", "Ninni", "Masal"]
          },
          {
            "tema_adi": "Kelimelerin Ritmi",
            "konular": ["Gazel", "Kaside", "Saf Şiir", "Divan Edebiyatı"]
          },
          {
            "tema_adi": "Dünden Bugüne",
            "konular": ["Destan", "Halk Hikâyesi", "Mesnevi", "Fabl"]
          },
          {
            "tema_adi": "Nesillerin Mirası",
            "konular": ["Dede Korkut Hikâyeleri", "Tanzimat Dönemi Şiiri", "Servetifünun Dönemi Romanı", "Fecriati Dönemi Şiiri", "Millî Edebiyat Dönemi Hikâyesi"]
          }
        ]
      },
      {
        "ders_adi": "Matematik",
        "temalar": [
          {
            "tema_adi": "Sayılar",
            "konular": ["Polinomlar", "İkinci Dereceden Denklemler"]
          },
          {
            "tema_adi": "Nicelikler ve Değişimler",
            "konular": ["Fonksiyonlar", "Fonksiyonlarda Değişim"]
          },
          {
            "tema_adi": "Sayma, Algoritma ve Bilişim",
            "konular": ["Sayma Yöntemleri (Permütasyon, Kombinasyon, Binom)"]
          },
          {
            "tema_adi": "Geometrik Şekiller",
            "konular": ["Dörtgenler ve Çokgenler"]
          },
          {
            "tema_adi": "Analitik İnceleme",
            "konular": ["Noktanın ve Doğrunun Analitiği"]
          },
          {
            "tema_adi": "İstatistiksel Araştırma Süreci",
            "konular": ["İki Değişkenli Verilerle Çalışma"]
          },
          {
            "tema_adi": "Veriden Olasılığa",
            "konular": ["Olasılık Hesaplamaları"]
          }
        ]
      },
      {
        "ders_adi": "Fizik",
        "uniteler": [
          {
            "unite_adi": "Kuvvet ve Hareket",
            "konular": ["Newton'un Hareket Yasaları", "Sürtünme Kuvveti", "Limit Hız", "Çembersel Hareket"]
          },
          {
            "unite_adi": "Elektrik ve Manyetizma",
            "konular": ["Elektriksel Kuvvet ve Elektriksel Alan", "Manyetik Alan ve Manyetik Kuvvet", "İndüksiyon Akımı", "Transformatörler"]
          },
          {
            "unite_adi": "Madde ve Doğası",
            "konular": ["Yarı İletkenlik", "Süper İletkenlik"]
          },
          {
            "unite_adi": "Dalgalar",
            "konular": ["Su Dalgalarında Kırınım ve Girişim", "Işıkta Kırınım ve Girişim", "Elektromanyetik Dalgalar"]
          }
        ]
      },
      {
        "ders_adi": "Kimya",
        "uniteler": [
          {
            "unite_adi": "Tepkimeler",
            "konular": ["Kimyasal Tepkimelerin Oluşumu ve Kanıtları", "Tepkime Türleri (Çökelme, İndirgenme-Yükseltgenme, Asit-Baz)", "Tepkimelerin Modellenmesi"]
          },
          {
            "unite_adi": "Çözeltiler",
            "konular": ["Çözünme ve Çözünürlük", "Çözünme Süreci ve Modelleri", "Çözünürlüğe Etki Eden Faktörler", "Çözünme Olayının Sınıflandırılması"]
          },
          {
            "unite_adi": "Stokiyometri",
            "konular": ["Mol Kavramı ve Hesaplamaları", "Kimyasal Denkleştirme", "Periyodik Tabloda Yer Bulma", "Stokiyometrik İlişkiler"]
          },
          {
            "unite_adi": "Sürdürülebilirlik ve Kimya",
            "konular": ["Atom Ekonomisi", "Çevresel Etkiler ve Çözümler"]
          }
        ]
      },
      {
        "ders_adi": "Biyoloji",
        "uniteler": [
          {
            "unite_adi": "Hücresel Süreçler",
            "konular": ["Hücre Döngüsü", "Mitoz ve Mayoz Bölünme"]
          },
          {
            "unite_adi": "Kalıtım",
            "konular": ["Mendel Genetiği", "Genetik Çeşitlilik", "Cinsiyete Bağlı Kalıtım"]
          },
          {
            "unite_adi": "Hücresel Solunum",
            "konular": ["Oksijenli ve Oksijensiz Solunum", "Farklı Besin Gruplarından Enerji Elde Etme"]
          },
          {
            "unite_adi": "Ekosistem Ekolojisi",
            "konular": ["Ekosistem Bileşenleri ve İlişkileri", "Madde ve Enerji Akışı", "Madde Döngüleri"]
          }
        ]
      },
      {
        "ders_adi": "Tarih",
        "uniteler": [
          {
            "unite_adi": "Türkistan'dan Türkiye'ye (1040-1299)",
            "konular": ["Anadolu'nun Türkleşmesi", "Türkiye Selçuklu Devleti", "Haçlı Seferleri ve Moğol İstilası"]
          },
          {
            "unite_adi": "Beylikten Devlete Osmanlı (1299-1453)",
            "konular": ["Osmanlı Beyliği'nin Kuruluşu", "Balkan Fetihleri", "Ankara Savaşı ve Fetret Devri"]
          },
          {
            "unite_adi": "Cihan Devleti Osmanlı (1453-1683)",
            "konular": ["İstanbul'un Fethi", "Yükselme Dönemi", "Coğrafi Keşifler ve Osmanlı'ya Etkileri", "Klasik Çağda Osmanlı Yönetim ve Toplum Yapısı"]
          }
        ]
      },
      {
        "ders_adi": "Coğrafya",
        "uniteler": [
          {
            "unite_adi": "Doğal Sistemler ve Süreçler",
            "konular": ["Yeryüzünün Şekillenmesi (İç ve Dış Kuvvetler)", "Türkiye'nin Yer Şekilleri", "Su Varlığı", "Toprak ve Bitki Örtüsü"]
          },
          {
            "unite_adi": "Beşerî Sistemler ve Süreçler",
            "konular": ["Nüfusun Dağılışı ve Politikaları", "Göçler", "Yerleşme Tipleri"]
          },
          {
            "unite_adi": "Ekonomik Faaliyetler ve Etkileri",
            "konular": ["Tarım", "Hayvancılık", "Madencilik ve Sanayi"]
          },
          {
            "unite_adi": "Bölgeler, Ülkeler ve Küresel Bağlantılar",
            "konular": ["Türkiye'nin Bölgesel ve Küresel İlişkileri"]
          },
          {
            "unite_adi": "Afetler ve Sürdürülebilir Çevre",
            "konular": ["Türkiye'deki Doğal Afetler ve Çevre Koruma"]
          }
        ]
      },
      {
        "ders_adi": "Din Kültürü ve Ahlak Bilgisi",
        "uniteler": [
          {
            "unite_adi": "İslam'da Varlık ve Bilgi",
            "konular": ["Varlık ve Bilgi İlişkisi", "Tevhid İnancı"]
          },
          {
            "unite_adi": "Allah'ı Tanımak",
            "konular": ["Allah'ın İsimleri ve Sıfatları"]
          },
          {
            "unite_adi": "İslam'ın Evrensel Mesajları",
            "konular": ["Adalet", "Eşitlik", "Barış"]
          },
          {
            "unite_adi": "Din, Çevre ve Teknoloji",
            "konular": ["İslam'da Çevre Bilinci", "Teknoloji ve Etik"]
          },
          {
            "unite_adi": "İslam Düşüncesinde İtikadi-Siyasi ve Fıkhi Yorumlar",
            "konular": ["Mezheplerin İslam Düşüncesindeki Yeri"]
          }
        ]
      },
      {
        "ders_adi": "Felsefe",
        "uniteler": [
          {
            "unite_adi": "Felsefenin Doğası",
            "konular": ["Felsefi Düşüncenin Özellikleri"]
          },
          {
            "unite_adi": "Felsefe, Mantık ve Argümantasyon",
            "konular": ["Akıl Yürütme ve Geçerli Argümanlar"]
          },
          {
            "unite_adi": "Varlık Felsefesi (Ontoloji)",
            "konular": ["Varlığın Mahiyeti ve Anlamı"]
          },
          {
            "unite_adi": "Bilgi Felsefesi (Epistemoloji)",
            "konular": ["Bilginin Kaynağı, Doğruluğu ve Sınırları"]
          },
          {
            "unite_adi": "Ahlak Felsefesi (Etik)",
            "konular": ["İyi ve Kötünün Doğası", "Ahlaki Eylemin Ölçütleri"]
          },
          {
            "unite_adi": "Estetik ve Sanat Felsefesi",
            "konular": ["Güzellik ve Sanatın Anlamı"]
          },
          {
            "unite_adi": "Siyaset Felsefesi",
            "konular": ["İdeal Devlet Düzeni", "İktidar", "Meşruiyet"]
          },
          {
            "unite_adi": "Din Felsefesi",
            "konular": ["Tanrı'nın Varlığı", "İnanç ve Akıl İlişkisi"]
          },
          {
            "unite_adi": "Bilim Felsefesi",
            "konular": ["Bilimsel Bilginin Doğası ve Yöntemi"]
          }
        ]
      }
    ]
  },
  {
    "sinif_duzeyi": "11. Sınıf",
    "aciklama": "2024-2025 için geçerli",
    "dersler": [
      {
        "ders_adi": "Türk Dili ve Edebiyatı",
        "not": "Ortak Ders",
        "uniteler": [
          {
            "unite_adi": "Giriş",
            "konular": ["Edebiyat ve Toplum İlişkisi", "Edebiyatın Sanat Akımları ile İlişkisi"]
          },
          {
            "unite_adi": "Hikâye",
            "konular": ["Tanzimat, Servetifünun, Milli Edebiyat ve Cumhuriyet Dönemi'nde (1923-1940) Hikâye"]
          },
          {
            "unite_adi": "Şiir",
            "konular": ["Tanzimat, Servetifünun, Fecriati, Saf (Öz) Şiir, Milli Edebiyat Dönemi'nde Şiir"]
          },
          {
            "unite_adi": "Makale, Sohbet ve Fıkra",
            "konular": []
          },
          {
            "unite_adi": "Roman",
            "konular": ["Tanzimat, Servetifünun, Milli Edebiyat Dönemi'nde Roman"]
          },
          {
            "unite_adi": "Tiyatro",
            "konular": ["Tanzimat ve Milli Edebiyat Dönemi'nde Tiyatro"]
          },
          {
            "unite_adi": "Eleştiri, Mülakat ve Röportaj",
            "konular": []
          }
        ]
      },
      {
        "ders_adi": "Tarih",
        "not": "Ortak Ders",
        "uniteler": [
          {
            "unite_adi": "Değişen Dünya Dengeleri Karşısında Osmanlı Siyaseti (1595-1774)",
            "konular": []
          },
          {
            "unite_adi": "Değişim Çağında Avrupa ve Osmanlı",
            "konular": []
          },
          {
            "unite_adi": "Uluslararası İlişkilerde Denge Stratejisi (1774-1914)",
            "konular": []
          },
          {
            "unite_adi": "Devrimler Çağında Değişen Devlet-Toplum İlişkileri",
            "konular": []
          },
          {
            "unite_adi": "Sermaye ve Emek",
            "konular": []
          },
          {
            "unite_adi": "XIX ve XX. Yüzyılda Değişen Gündelik Hayat",
            "konular": []
          }
        ]
      },
      {
        "ders_adi": "Felsefe",
        "not": "Ortak Ders",
        "uniteler": [
          {
            "unite_adi": "M.Ö. 6. Yüzyıl - M.S. 2. Yüzyıl Felsefesi",
            "konular": ["Doğa Filozofları", "Sokrates", "Platon", "Aristoteles"]
          },
          {
            "unite_adi": "M.S. 2. Yüzyıl - M.S. 15. Yüzyıl Felsefesi",
            "konular": ["Hristiyan ve İslam Felsefesi"]
          }
        ]
      },
      {
        "ders_adi": "Din Kültürü ve Ahlak Bilgisi",
        "not": "Ortak Ders",
        "uniteler": [
          {
            "unite_adi": "Dünya ve Ahiret",
            "konular": []
          },
          {
            "unite_adi": "Kur'an'a Göre Hz. Muhammed",
            "konular": []
          },
          {
            "unite_adi": "İnançla İlgili Felsefi Meseleler",
            "konular": []
          },
          {
            "unite_adi": "Yahudilik ve Hristiyanlık",
            "konular": []
          },
          {
            "unite_adi": "İslam ve Bilim",
            "konular": []
          },
          {
            "unite_adi": "Anadolu'da İslam",
            "konular": []
          }
        ]
      },
      {
        "ders_adi": "İleri Matematik",
        "not": "Sayısal Alan Dersi",
        "uniteler": [
          {
            "unite_adi": "Trigonometri",
            "konular": ["Yönlü Açılar", "Trigonometrik Fonksiyonlar", "Grafikler", "Ters Fonksiyonlar"]
          },
          {
            "unite_adi": "Analitik Geometri",
            "konular": ["Doğrunun Analitik İncelenmesi"]
          },
          {
            "unite_adi": "Fonksiyonlarda Uygulamalar",
            "konular": ["Parabol", "Fonksiyonların Dönüşümleri"]
          },
          {
            "unite_adi": "Denklem ve Eşitsizlik Sistemleri",
            "konular": []
          },
          {
            "unite_adi": "Çember ve Daire",
            "konular": []
          },
          {
            "unite_adi": "Uzay Geometri (Katı Cisimler)",
            "konular": ["Silindir", "Koni", "Küre"]
          },
          {
            "unite_adi": "Olasılık",
            "konular": ["Koşullu Olasılık"]
          }
        ]
      },
      {
        "ders_adi": "İleri Fizik",
        "not": "Sayısal Alan Dersi",
        "uniteler": [
          {
            "unite_adi": "Kuvvet ve Hareket",
            "konular": ["Vektörler", "Bağıl Hareket", "Newton'un Hareket Yasaları", "Atışlar", "Enerji ve Momentum", "Tork ve Denge"]
          },
          {
            "unite_adi": "Elektrik ve Manyetizma",
            "konular": ["Elektriksel Kuvvet ve Alan", "Potansiyel", "Sığa", "Manyetizma", "Alternatif Akım", "Transformatörler"]
          }
        ]
      },
      {
        "ders_adi": "İleri Kimya",
        "not": "Sayısal Alan Dersi",
        "uniteler": [
          {
            "unite_adi": "Modern Atom Teorisi",
            "konular": ["Kuantum Modeli", "Periyodik Sistem"]
          },
          {
            "unite_adi": "Gazlar",
            "konular": ["Gaz Yasaları", "İdeal Gaz Yasası"]
          },
          {
            "unite_adi": "Sıvı Çözeltiler ve Çözünürlük",
            "konular": []
          },
          {
            "unite_adi": "Kimyasal Tepkimelerde Enerji (Termokimya)",
            "konular": []
          },
          {
            "unite_adi": "Kimyasal Tepkimelerde Hız",
            "konular": []
          },
          {
            "unite_adi": "Kimyasal Tepkimelerde Denge",
            "konular": []
          }
        ]
      },
      {
        "ders_adi": "İleri Biyoloji",
        "not": "Sayısal Alan Dersi",
        "uniteler": [
          {
            "unite_adi": "İnsan Fizyolojisi",
            "konular": ["Sinir Sistemi", "Endokrin Sistem", "Duyu Organları", "Destek ve Hareket", "Sindirim", "Dolaşım", "Solunum", "Boşaltım", "Üreme Sistemleri"]
          },
          {
            "unite_adi": "Komünite ve Popülasyon Ekolojisi",
            "konular": []
          }
        ]
      }
    ]
  },
  {
    "sinif_duzeyi": "12. Sınıf",
    "aciklama": "2024-2025 için geçerli",
    "dersler": [
      {
        "ders_adi": "Türk Dili ve Edebiyatı",
        "not": "Ortak Ders",
        "uniteler": [
          {
            "unite_adi": "Giriş",
            "konular": ["Edebiyat ve Felsefe/Psikoloji İlişkisi"]
          },
          {
            "unite_adi": "Cumhuriyet Dönemi Türk Edebiyatı (1923-Günümüz)",
            "konular": ["Hikâye", "Şiir (Öz Şiir, Toplumcu Şiir, Garip, İkinci Yeni vb.)", "Roman", "Tiyatro"]
          },
          {
            "unite_adi": "Metin Türleri",
            "konular": ["Deneme", "Söylev (Nutuk)"]
          }
        ]
      },
      {
        "ders_adi": "T.C. İnkılap Tarihi ve Atatürkçülük",
        "not": "Ortak Ders",
        "uniteler": [
          {
            "unite_adi": "20. Yüzyıl Başlarında Osmanlı Devleti ve Dünya",
            "konular": ["I. Dünya Savaşı ve Sonrası"]
          },
          {
            "unite_adi": "Millî Mücadele",
            "konular": ["Hazırlık", "Cepheler", "Lozan Antlaşması"]
          },
          {
            "unite_adi": "Atatürkçülük ve Türk İnkılabı",
            "konular": ["Atatürk İlkeleri ve İnkılaplar"]
          },
          {
            "unite_adi": "İki Savaş Arasındaki Dönemde Türkiye ve Dünya",
            "konular": []
          },
          {
            "unite_adi": "II. Dünya Savaşı ve Sonrası Türkiye",
            "konular": []
          },
          {
            "unite_adi": "Toplumsal Devrim Çağı ve 21. Yüzyılın Eşiğinde Türkiye ve Dünya",
            "konular": []
          }
        ]
      },
      {
        "ders_adi": "Din Kültürü ve Ahlak Bilgisi",
        "not": "Ortak Ders",
        "uniteler": [
          {
            "unite_adi": "İslam Düşüncesinde Tasavvufi Yorumlar",
            "konular": []
          },
          {
            "unite_adi": "Güncel Dinî Meseleler",
            "konular": []
          },
          {
            "unite_adi": "Hint ve Çin Dinleri",
            "konular": []
          }
        ]
      },
      {
        "ders_adi": "İleri Matematik",
        "not": "Sayısal Alan Dersi",
        "uniteler": [
          {
            "unite_adi": "Üstel ve Logaritmik Fonksiyonlar",
            "konular": []
          },
          {
            "unite_adi": "Diziler",
            "konular": []
          },
          {
            "unite_adi": "Trigonometri",
            "konular": ["Toplam-Fark, İki Kat Açı Formülleri", "Denklemler"]
          },
          {
            "unite_adi": "Dönüşümler",
            "konular": []
          },
          {
            "unite_adi": "Türev",
            "konular": ["Limit ve Süreklilik", "Türev Alma Kuralları", "Türevin Uygulamaları"]
          },
          {
            "unite_adi": "İntegral",
            "konular": ["Belirsiz ve Belirli İntegral", "Alan Hesabı"]
          },
          {
            "unite_adi": "Analitik Geometri",
            "konular": ["Çemberin Analitik İncelenmesi"]
          }
        ]
      },
      {
        "ders_adi": "İleri Fizik",
        "not": "Sayısal Alan Dersi",
        "uniteler": [
          {
            "unite_adi": "Çembersel Hareket",
            "konular": []
          },
          {
            "unite_adi": "Basit Harmonik Hareket",
            "konular": []
          },
          {
            "unite_adi": "Dalga Mekaniği",
            "konular": ["Kırınım", "Girişim", "Doppler Olayı"]
          },
          {
            "unite_adi": "Atom Fiziğine Giriş ve Radyoaktivite",
            "konular": []
          },
          {
            "unite_adi": "Modern Fizik",
            "konular": ["Özel Görelilik", "Kuantum Fiziği"]
          },
          {
            "unite_adi": "Modern Fiziğin Teknolojideki Uygulamaları",
            "konular": []
          }
        ]
      },
      {
        "ders_adi": "İleri Kimya",
        "not": "Sayısal Alan Dersi",
        "uniteler": [
          {
            "unite_adi": "Kimya ve Elektrik",
            "konular": ["Redoks", "Piller", "Elektroliz"]
          },
          {
            "unite_adi": "Karbon Kimyasına Giriş",
            "konular": ["Organik ve Anorganik Bileşikler", "Hibritleşme"]
          },
          {
            "unite_adi": "Organik Bileşikler",
            "konular": ["Hidrokarbonlar", "Fonksiyonel Gruplar"]
          },
          {
            "unite_adi": "Enerji Kaynakları ve Bilimsel Gelişmeler",
            "konular": []
          }
        ]
      },
      {
        "ders_adi": "İleri Biyoloji",
        "not": "Sayısal Alan Dersi",
        "uniteler": [
          {
            "unite_adi": "Genden Proteine",
            "konular": ["Nükleik Asitler", "Protein Sentezi", "Biyoteknoloji"]
          },
          {
            "unite_adi": "Canlılarda Enerji Dönüşümleri",
            "konular": ["Fotosentez", "Kemosentez", "Hücresel Solunum"]
          },
          {
            "unite_adi": "Bitki Biyolojisi",
            "konular": ["Bitkisel Dokular", "Organlar", "Taşıma", "Beslenme", "Üreme"]
          },
          {
            "unite_adi": "Canlılar ve Çevre",
            "konular": []
          }
        ]
      }
    ]
  }
];