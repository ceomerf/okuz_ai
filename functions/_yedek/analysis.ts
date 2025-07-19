// src/analysis.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
// import { onSchedule } from "firebase-functions/v2/scheduler"; // Şu anda kullanılmıyor
import * as admin from 'firebase-admin';
import { db, getGenAI } from './utils';

// Resource optimizasyonu için global options
const optimizedOptions = {
  memory: "256MiB" as const,
  timeoutSeconds: 60,
  concurrency: 10,
  minInstances: 0,
  maxInstances: 5
};

const lightOptions = {
  memory: "128MiB" as const,
  timeoutSeconds: 30,
  concurrency: 20,
  minInstances: 0,
  maxInstances: 3
};

/**
 * Deneme sınavı sonucunu analiz eder ve içgörüler oluşturur
 */
export const analyzeExamResult = onCall(optimizedOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { examId } = request.data || {};
    
    if (!examId) {
        throw new HttpsError('invalid-argument', 'examId zorunludur.');
    }
    
    try {
        // Deneme sınavı sonucunu getir
        const examDoc = await db.doc(`users/${userId}/mock_exams/${examId}`).get();
        
        if (!examDoc.exists) {
            throw new HttpsError('not-found', 'Deneme sınavı bulunamadı.');
        }
        
        const examData = examDoc.data();
        
        // AI'a analiz için istek gönder
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const analysisPrompt = `
Sen bir eğitim koçusun. Aşağıdaki deneme sınavı sonucunu analiz et ve öğrenciye yardımcı olacak içgörüler oluştur.

DENEME SINAVI SONUÇLARI:
${JSON.stringify(examData)}

Lütfen aşağıdaki formatta bir JSON nesnesi döndür:

{
  "analysis": {
    "summary": "Deneme sınavı hakkında genel bir değerlendirme",
    "strengths": ["Güçlü olduğu alanlar"],
    "weaknesses": ["Zayıf olduğu alanlar"],
    "recommendations": [
      {
        "title": "Öneri başlığı",
        "description": "Detaylı açıklama"
      }
    ]
  }
}
`;
        
        const analysisResult = await model.generateContent(analysisPrompt);
        const cleanedResponse = analysisResult.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
        const analysis = JSON.parse(cleanedResponse);
        
        // Analizi Firestore'a kaydet
        const analysisData = {
            ...analysis,
            examId,
            userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await db.doc(`users/${userId}/mock_exams/${examId}/analyses/primary`).set(analysisData);
        
        return {
            ...analysisData,
            success: true,
            message: 'Deneme sınavı analizi başarıyla oluşturuldu.'
        };
    } catch (e: any) {
        console.error('Deneme sınavı analizi hatası:', e);
        throw new HttpsError('internal', `Deneme sınavı analizi oluşturulamadı: ${e.message}`);
    }
});

/**
 * Son deneme sınavlarını analiz eder ve karşılaştırmalı içgörüler oluşturur
 */
export const analyzeRecentExams = onCall(lightOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { limit } = request.data || {};
    
    try {
        // Son deneme sınavlarını getir (en fazla 5 tane)
        const examsQuery = await db.collection(`users/${userId}/mock_exams`)
            .orderBy('completedAt', 'desc')
            .limit(limit || 5)
            .get();
        
        if (examsQuery.empty) {
            throw new HttpsError('not-found', 'Analiz edilecek deneme sınavı bulunamadı.');
        }
        
        const exams = examsQuery.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // AI'a karşılaştırmalı analiz için istek gönder
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const comparisonPrompt = `
Sen bir eğitim koçusun. Aşağıdaki deneme sınavı sonuçlarını kronolojik sırayla analiz et ve ilerleme/değişim hakkında içgörüler oluştur.

DENEME SINAVI SONUÇLARI:
${JSON.stringify(exams)}

Lütfen aşağıdaki formatta bir JSON nesnesi döndür:

{
  "comparison": {
    "summary": "Deneme sınavlarının genel değerlendirmesi ve ilerleme analizi",
    "subjectTrends": [
      {
        "subject": "Matematik",
        "trend": "improving|declining|stable",
        "description": "İlerleme/gerileme açıklaması"
      }
    ],
    "improvementAreas": ["İlerleme kaydedilen alanlar"],
    "problemAreas": ["Gerileme olan veya sabit kalan alanlar"],
    "recommendations": [
      {
        "title": "Öneri başlığı",
        "description": "Detaylı açıklama"
      }
    ]
  }
}
`;
        
        const comparisonResult = await model.generateContent(comparisonPrompt);
        const cleanedResponse = comparisonResult.response.text().trim().replace(/```json|```/g, '');
        const comparison = JSON.parse(cleanedResponse);
        
        // Karşılaştırmayı Firestore'a kaydet
        const comparisonData = {
            ...comparison,
            userId,
            examCount: exams.length,
            examIds: exams.map((e: any) => e.id),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection(`users/${userId}/exam_analyses`).add(comparisonData);
        
        return {
            ...comparisonData,
            id: docRef.id,
            success: true,
            message: 'Karşılaştırmalı deneme sınavı analizi başarıyla oluşturuldu.'
        };
    } catch (e: any) {
        console.error('Karşılaştırmalı deneme sınavı analizi hatası:', e);
        throw new HttpsError('internal', `Karşılaştırmalı deneme sınavı analizi oluşturulamadı: ${e.message}`);
    }
});

/**
 * Bir ders için konu haritası oluşturur
 */
export const generateTopicMap = onCall(lightOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { subject } = request.data || {};
    
    if (!subject) {
        throw new HttpsError('invalid-argument', 'subject zorunludur.');
    }
    
    try {
        // Önce kullanıcının profil bilgilerini al
        const profileDoc = await db.doc(`users/${userId}/privateProfile/profile`).get();
        
        if (!profileDoc.exists) {
            throw new HttpsError('not-found', 'Kullanıcı profili bulunamadı.');
        }
        
        const profile = profileDoc.data();
        const { grade } = profile;
        
        // AI'a konu haritası oluşturma isteği gönder
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const topicMapPrompt = `
Sen bir eğitim uzmanısın. ${grade}. sınıf ${subject} dersi için bir konu haritası oluştur. 
Bu harita, konular arasındaki ilişkileri ve bağlantıları göstermelidir.

Lütfen aşağıdaki formatta bir JSON nesnesi döndür:

{
  "subject": "${subject}",
  "grade": "${grade}",
  "nodes": [
    {
      "id": "node1",
      "topic": "Konu adı",
      "subject": "${subject}",
      "description": "Konu açıklaması",
      "importance": 0.8, // 0-1 arası
      "status": "not_started", // "not_started", "in_progress", "completed"
      "mastery": 0.0, // 0-1 arası
      "connectedTopics": ["node2", "node3"] // Bağlantılı konuların ID'leri
    }
  ],
  "edges": [
    {
      "id": "edge1",
      "sourceId": "node1",
      "targetId": "node2",
      "relationshipType": "prerequisite", // "prerequisite", "followup", "related"
      "strength": 0.9, // 0-1 arası
      "description": "Bağlantı açıklaması"
    }
  ]
}
`;
        
        const topicMapResult = await model.generateContent(topicMapPrompt);
        const cleanedResponse = topicMapResult.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
        const topicMap = JSON.parse(cleanedResponse);
        
        // Konu haritasını Firestore'a kaydet
        const topicMapData = {
            ...topicMap,
            userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        const docRef = await db.collection(`users/${userId}/topic_maps`).add(topicMapData);
        
        return {
            ...topicMapData,
            id: docRef.id,
            success: true,
            message: 'Konu haritası başarıyla oluşturuldu.',
        };
    } catch (e: any) {
        console.error('Konu haritası oluşturma hatası:', e);
        throw new HttpsError('internal', `Konu haritası oluşturulamadı: ${e.message}`);
    }
});

/**
 * Konu bağlantısı oluşturur
 */
export const generateTopicConnection = onCall(lightOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { subject, topic } = request.data || {};
    
    if (!subject || !topic) {
        throw new HttpsError('invalid-argument', 'subject ve topic zorunludur.');
    }
    
    try {
        // Önce kullanıcının profil bilgilerini al
        const profileDoc = await db.doc(`users/${userId}/privateProfile/profile`).get();
        
        if (!profileDoc.exists) {
            throw new HttpsError('not-found', 'Kullanıcı profili bulunamadı.');
        }
        
        const profile = profileDoc.data();
        const { grade } = profile;
        
        // AI'a konu bağlantısı oluşturma isteği gönder
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const topicConnectionPrompt = `
Sen bir eğitim uzmanısın. ${grade}. sınıf ${subject} dersinde "${topic}" konusu için bir konu bağlantısı oluştur.
Bu bağlantı, bu konunun öncül ve ardıl konularını, ayrıca ilişkili konuları göstermelidir.

Lütfen aşağıdaki formatta bir JSON nesnesi döndür:

{
  "subject": "${subject}",
  "topic": "${topic}",
  "description": "Konu açıklaması",
  "prerequisites": ["Öncül konu 1", "Öncül konu 2"],
  "followups": ["Ardıl konu 1", "Ardıl konu 2"],
  "relatedTopics": ["İlişkili konu 1", "İlişkili konu 2"],
  "topicImportance": {
    "Öncül konu 1": 0.8, // 0-1 arası
    "Ardıl konu 1": 0.9 // 0-1 arası
  }
}
`;
        
        const topicConnectionResult = await model.generateContent(topicConnectionPrompt);
        const cleanedResponse = topicConnectionResult.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
        const topicConnection = JSON.parse(cleanedResponse);
        
        // Konu bağlantısını Firestore'a kaydet
        const topicConnectionData = {
            ...topicConnection,
            userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        const docRef = await db.collection(`users/${userId}/topic_connections`).add(topicConnectionData);
        
        return {
            ...topicConnectionData,
            id: docRef.id,
            success: true,
            message: 'Konu bağlantısı başarıyla oluşturuldu.',
        };
    } catch (e: any) {
        console.error('Konu bağlantısı oluşturma hatası:', e);
        throw new HttpsError('internal', `Konu bağlantısı oluşturulamadı: ${e.message}`);
    }
}); 

/**
 * Kullanıcının odaklanma profilini analiz eder ve performans verilerini günceller.
 * Artık hem tek kullanıcı hem de aile hesabı sistemini destekler.
 */
export const updateUserFocusProfile = onCall({
    timeoutSeconds: 60,
    memory: '256MiB',
    concurrency: 5
}, async (event) => {
    const userId = event.data.userId;
    const profileId = event.data.profileId; // Yeni: aile hesabı için
    
    if (!userId) {
        throw new HttpsError('invalid-argument', 'userId zorunludur.');
    }

    try {
        // Hesap tipini ve profil yollarını belirle
        const userDoc = await db.doc(`users/${userId}`).get();
        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'Kullanıcı hesabı bulunamadı.');
        }
        
        const userData = userDoc.data();
        const accountType = userData?.accountType || 'single';
        
        let analyticsPath: string;
        let performanceAnalyticsPath: string;
        
        if (accountType === 'family') {
            // Aile hesabı modu
            const targetProfileId = profileId || userData?.selectedProfileId;
            if (!targetProfileId) {
                throw new HttpsError('invalid-argument', 'Aile hesabı için profileId belirtilmeli veya selectedProfileId ayarlanmış olmalı.');
            }
            
            analyticsPath = `users/${userId}/studentProfiles/${targetProfileId}/analytics/daily_logs/sessions`;
            performanceAnalyticsPath = `users/${userId}/studentProfiles/${targetProfileId}/performance/analytics`;
            
            console.log(`Aile hesabı modu: Odak profili profileId=${targetProfileId} için güncelleniyor`);
        } else {
            // Tek kullanıcı modu (geriye uyumluluk)
            analyticsPath = `users/${userId}/analytics/daily_logs/sessions`;
            performanceAnalyticsPath = `users/${userId}/performance/analytics`;
            
            console.log(`Tek kullanıcı modu: Odak profili güncelleniyor`);
        }

        // const userRef = db.doc(`users/${userId}`); // Şu anda kullanılmıyor
        
        // Son 30 günün çalışma seanslarını al
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const sessionsSnapshot = await db.collection(analyticsPath)
            .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .get();
        
        if (sessionsSnapshot.empty) {
            console.log(`Kullanıcı ${userId} için son 30 günde çalışma seansı bulunamadı.`);
            return;
        }
        
        // Analiz verileri
        let totalFocusDuration = 0;
        let sessionCount = sessionsSnapshot.size;
        const subjectPauseCounts: { [subject: string]: number } = {};
        const confusingTopics: string[] = [];
        const confidentTopics: string[] = [];
        
        // Her seansı analiz et
        sessionsSnapshot.forEach(doc => {
          const session = doc.data();
          
          totalFocusDuration += session.durationInMinutes || 0;
          
          if (session.analytics) {
            // En çok mola verilen dersi bul
            if (session.analytics.pauseCount > 0) {
              subjectPauseCounts[session.subject] = (subjectPauseCounts[session.subject] || 0) + session.analytics.pauseCount;
            }
            
            // Konu hakimiyetini analiz et
            if (session.analytics.userFeeling === 'confused') {
              confusingTopics.push(`${session.subject} - ${session.topic}`);
            } else if (session.analytics.userFeeling === 'confident') {
              confidentTopics.push(`${session.subject} - ${session.topic}`);
            }
          }
        });
        
        // Ortalama odaklanma süresini hesapla
        const averageFocusDuration = sessionCount > 0 ? Math.round(totalFocusDuration / sessionCount) : 0;
        
        // En çok mola verilen dersi bul
        const mostPausedSubject = Object.entries(subjectPauseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        
        // Tekrar eden konuları filtrele
        const uniqueConfusingTopics = [...new Set(confusingTopics)];
        const uniqueConfidentTopics = [...new Set(confidentTopics)];
        
        // Analiz sonuçlarını Firestore'a yaz
        const performanceAnalyticsRef = db.doc(performanceAnalyticsPath);
        await performanceAnalyticsRef.set({
          averageFocusDuration,
          mostPausedSubject,
          mostConfusingTopics: uniqueConfusingTopics,
          strongestTopics: uniqueConfidentTopics,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        
        console.log(`Kullanıcı ${userId} için odak profili başarıyla güncellendi.`);
        
      } catch (error: any) {
        console.error(`Kullanıcı ${userId} için odak profili güncellenirken hata:`, error);
        throw new HttpsError('internal', `Odak profili güncellenemedi: ${error.message}`);
      }
});

/**
 * Metni veya URL'yi analiz ederek özet ve kavram haritası oluşturur
 */
export const processAndStructureText = onCall(lightOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const { text, url } = request.data || {};
    
    if (!text && !url) {
        throw new HttpsError('invalid-argument', 'Metin veya URL gerekmektedir.');
    }
    
    try {
        let contentToProcess = text;
        
        // URL varsa web scraping yap
        if (url && !text) {
            try {
                const axios = await import('axios');
                const cheerio = await import('cheerio');
                
                const response = await axios.default.get(url, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                const $ = cheerio.load(response.data);
                
                // Ana makale metnini çıkarmaya çalış
                let extractedText = '';
                
                // Yaygın makale selektörlerini dene
                const selectors = [
                    'article',
                    '[role="main"]',
                    '.content',
                    '.post-content',
                    '.entry-content',
                    '.article-content',
                    'main',
                    '.container'
                ];
                
                for (const selector of selectors) {
                    const element = $(selector);
                    if (element.length > 0) {
                        // Gereksiz elementleri kaldır
                        element.find('script, style, nav, header, footer, aside, .advertisement, .ads, .menu, .sidebar').remove();
                        extractedText = element.text().trim();
                        if (extractedText.length > 500) break;
                    }
                }
                
                // Eğer hiçbir makale bulunamazsa body'den al
                if (extractedText.length < 500) {
                    $('script, style, nav, header, footer, aside, .advertisement, .ads, .menu, .sidebar').remove();
                    extractedText = $('body').text().trim();
                }
                
                if (extractedText.length < 100) {
                    throw new Error('URL\'den yeterli metin çıkarılamadı');
                }
                
                contentToProcess = extractedText;
                
            } catch (error) {
                console.error('Web scraping hatası:', error);
                throw new HttpsError('internal', 'Web sayfasından metin çıkarılamadı. Lütfen metni manuel olarak yapıştırın.');
            }
        }
        
        // AI ile analiz et
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `
Rol: Sen, karmaşık akademik metinleri analiz edip, bunları sınavlara hazırlanan öğrenciler için kolay anlaşılır formatlara dönüştüren bir uzman eğitim materyali geliştiricisisin.

Görev: Sana verilen aşağıdaki metni analiz ederek, iki ayrı formatta çıktı üret: 1) Sınava yönelik bir özet. 2) Metindeki kavramsal ilişkileri gösteren bir veri yapısı.

METİN:
${contentToProcess}

AŞAMA 1: DERİN ANALİZ ve KAVRAM ÇIKARIMI (Arka Planda Düşün)

Metindeki ana başlığı, alt başlıkları ve tüm temel kavramları (kişiler, tarihler, formüller, tanımlar, neden-sonuç ilişkileri) belirle.

Bu kavramlar arasındaki hiyerarşik ve mantıksal bağlantıları kur. (Örn: "Osmanlı Devleti'nin Duraklama Dönemi" ana kavramdır. "II. Viyana Kuşatması" bu döneme ait bir alt kavram ve "başarısızlık" nedenlerinden biridir.)

AŞAMA 2: ÇIKTIYI FORMATLAMA
Analizini tamamladıktan sonra, cevabını SADECE ve SADECE aşağıdaki JSON formatında ver. Başka hiçbir açıklama ekleme.

{
  "summary": {
    "title": "Metnin Ana Başlığı",
    "keyPoints": [
      {
        "heading": "Önemli Alt Başlık 1",
        "details": [
          "Bu başlıkla ilgili ilk kritik bilgi.",
          "Bu başlıkla ilgili ikinci kritik bilgi ve neden-sonuç ilişkisi."
        ]
      },
      {
        "heading": "Önemli Formüller/Tarihler",
        "details": [
          "Formül 1: E=mc²",
          "Kritik Tarih: 1453 - İstanbul'un Fethi"
        ]
      }
    ]
  },
  "conceptMap": {
    "nodes": [
      { "id": "1", "label": "Ana Kavram", "level": 0 },
      { "id": "2", "label": "Alt Kavram A", "level": 1 },
      { "id": "3", "label": "Alt Kavram B", "level": 1 },
      { "id": "4", "label": "Detay A.1", "level": 2 }
    ],
    "edges": [
      { "from": "1", "to": "2", "label": "parçasıdır" },
      { "from": "1", "to": "3", "label": "neden olur" },
      { "from": "2", "to": "4", "label": "örnektir" }
    ]
  }
}
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();
        
        // JSON'u parse et
        let parsedResult;
        try {
            // JSON'u temizle (markdown kod bloklarını kaldır)
            const cleanedText = responseText.replace(/```json\n?|```\n?/g, '').trim();
            parsedResult = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('JSON parse hatası:', parseError);
            console.error('AI Response:', responseText);
            throw new HttpsError('internal', 'AI yanıtı işlenirken hata oluştu');
        }
        
        // Sonucu validate et
        if (!parsedResult.summary || !parsedResult.conceptMap) {
            throw new HttpsError('internal', 'AI yanıtı beklenen formatı içermiyor');
        }
        
        return {
            success: true,
            data: parsedResult,
            sourceType: url ? 'url' : 'text',
            sourceUrl: url || null
        };
        
    } catch (error) {
        console.error('Text processing hatası:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Metin işleme sırasında hata oluştu');
    }
}); 