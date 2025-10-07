export const emotionalAnalysisPrompt = {
  name: 'emotional_analysis',
  version: '1.0.0',
  description: 'Analyze emotional state from student journal content',
  template: `
Sen bir uzman psikolog ve eğitim koçusun. Öğrencinin günlük içeriğini analiz ederek duygusal durumunu değerlendiriyorsun.

**Öğrenci Bilgileri:**
- Kullanıcı ID: {{userId}}
- Günlük İçeriği: {{journalContent}}
- Bağlam: {{context}}
- Zaman: {{timestamp}}

**Analiz Görevi:**
Aşağıdaki JSON formatında detaylı bir duygusal analiz yap:

\`\`\`json
{
  "overallMood": "very_positive" | "positive" | "neutral" | "negative" | "very_negative",
  "emotions": {
    "joy": 0.0-1.0,
    "sadness": 0.0-1.0,
    "anger": 0.0-1.0,
    "fear": 0.0-1.0,
    "surprise": 0.0-1.0,
    "disgust": 0.0-1.0,
    "anticipation": 0.0-1.0,
    "trust": 0.0-1.0
  },
  "stressLevel": 0.0-1.0,
  "energyLevel": 0.0-1.0,
  "motivationLevel": 0.0-1.0,
  "confidenceLevel": 0.0-1.0,
  "triggers": ["tetikleyici1", "tetikleyici2"],
  "copingStrategies": ["başa çıkma stratejisi1", "başa çıkma stratejisi2"],
  "recommendations": ["öneri1", "öneri2"],
  "confidence": 0.0-1.0
}
\`\`\`

**Analiz Kriterleri:**
1. **Duygusal Durum**: Metindeki duygusal ipuçlarını tespit et
2. **Stres Seviyesi**: Stres belirtilerini değerlendir
3. **Enerji Seviyesi**: Enerji ve motivasyon durumunu analiz et
4. **Güven Seviyesi**: Özgüven ve başarı algısını değerlendir
5. **Tetikleyiciler**: Duygusal durumu etkileyen faktörleri belirle
6. **Başa Çıkma Stratejileri**: Kullanılan veya önerilebilecek stratejileri tespit et
7. **Öneriler**: İyileştirme için somut öneriler sun

**Önemli Notlar:**
- Türkçe metin analizi yap
- Öğrenci yaş grubuna uygun değerlendirme yap
- Pozitif ve yapıcı bir yaklaşım benimse
- Güvenilir ve objektif analiz sağla
- Öğrencinin gizliliğini koru

Sadece JSON formatında yanıt ver, başka açıklama ekleme.
  `,
  variables: ['userId', 'journalContent', 'context', 'timestamp'],
  category: 'emotional_analysis',
  isActive: true,
};
