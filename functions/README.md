# OKUZ AI - Firebase Functions

Bu klasör, OKUZ AI projesinin Cloud Functions kodlarını içermektedir.

## Geliştirme Ortamının Kurulumu

Geliştirme yapmak için aşağıdaki adımları izleyin:

1. Node.js paketlerini yükleyin:
```bash
npm install
```

2. TypeScript kodlarını derleyin:
```bash
npm run build
```

3. Firebase CLI'yi yükleyin (eğer yüklü değilse):
```bash
npm install -g firebase-tools
```

4. Firebase projenizde oturum açın:
```bash
firebase login
```

5. Yerel olarak fonksiyonları test etmek için:
```bash
npm run serve
```

## Fonksiyon Açıklamaları

### generateInitialLongTermPlan

Kullanıcının onboarding'de verdiği bilgilere ve maarif müfredatına dayanarak kişiselleştirilmiş bir aylık ders programı oluşturur.

#### Parametreler:

- `grade`: Öğrencinin sınıf seviyesi (örn. "9", "10", "11", "12")
- `targetExam`: Hedeflenen sınav (opsiyonel, örn. "YKS", "LGS", null)
- `dailyHours`: Günlük çalışma saati
- `startPoint`: Başlangıç seviyesi ("beginner", "intermediate", "advanced")
- `planScope`: Plan kapsamı ("full" = tüm müfredat, "custom" = seçilen dersler)
- `selectedSubjects`: Seçilen dersler listesi (planScope "custom" ise zorunlu)

#### Örnek Çağrı (Flutter):

```dart
final callable = FirebaseFunctions.instance.httpsCallable('generateInitialLongTermPlan');
final result = await callable.call({
  'grade': '10',
  'targetExam': 'YKS',
  'dailyHours': 3,
  'startPoint': 'intermediate',
  'planScope': 'custom',
  'selectedSubjects': ['Matematik', 'Fizik', 'Kimya']
});

final plan = result.data['plan'];
```

## Dağıtım

Firebase Functions'ları deploy etmek için:

```bash
npm run deploy
```

## Not

Bu fonksiyonların çalışması için `maarif_modeli_data.json` dosyasının `src` klasöründe bulunması gerekmektedir. 