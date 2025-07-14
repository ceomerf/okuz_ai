import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { defineString } from "firebase-functions/params";
import * as functions from 'firebase-functions';

// Firebase projesini başlat
admin.initializeApp();
const db = admin.firestore();

// API anahtarını güvenli bir şekilde tanımla
const googleApiKey = defineString('GOOGLE_API_KEY');

// API anahtarını ve Gemini API'yi çalışma zamanında başlat
const getGenAI = () => {
  const apiKey = googleApiKey.value();
  if (!apiKey) {
    console.error("Google API anahtarı bulunamadı. Lütfen Firebase ortam değişkenlerini ayarlayın.");
    throw new Error("API anahtarı bulunamadı");
  }
  return new GoogleGenerativeAI(apiKey);
};

// Türkiye için tatil takvimini tanımla
const ACADEMIC_HOLIDAYS = {
    // Tek günlük resmi tatiller (Ay-Gün formatında)
    officialHolidays: [
        { date: "01-01", name: "Yılbaşı Tatili" },
        { date: "04-23", name: "Ulusal Egemenlik ve Çocuk Bayramı" },
        { date: "05-01", name: "Emek ve Dayanışma Günü" },
        { date: "05-19", name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
        { date: "07-15", name: "Demokrasi ve Milli Birlik Günü" },
        { date: "08-30", name: "Zafer Bayramı" },
        { date: "10-29", name: "Cumhuriyet Bayramı" },
        // Not: Dini bayramlar her yıl değiştiği için daha dinamik bir kütüphane veya API gerekebilir.
        // Başlangıç olarak sabit tatillerle başlayabiliriz.
    ],
    // Uzun dönem akademik aralar
    semesterBreak: { start: "01-22", end: "02-05", name: "Yarıyıl Tatili" },
    summerBreak: { start: "06-15", end: "09-15", name: "Yaz Tatili" }
};

/**
 * Mevcut tarihin tatil olup olmadığını kontrol eden yardımcı fonksiyon
 * Cloud Function olmayan, normal bir JavaScript fonksiyonu
 */
function checkCurrentHolidayStatus(): { isHoliday: boolean, reason?: string, type?: string } {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const todayMonthDay = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // 1. Resmi tatilleri kontrol et
    const officialHoliday = ACADEMIC_HOLIDAYS.officialHolidays.find(h => h.date === todayMonthDay);
    if (officialHoliday) {
        return { isHoliday: true, reason: officialHoliday.name, type: 'OFFICIAL' };
    }

    // 2. Yaz tatilini kontrol et
    const summerStart = new Date(`${year}-${ACADEMIC_HOLIDAYS.summerBreak.start.replace('-', '-')}`);
    const summerEnd = new Date(`${year}-${ACADEMIC_HOLIDAYS.summerBreak.end.replace('-', '-')}`);
    if (today >= summerStart && today <= summerEnd) {
        return { isHoliday: true, reason: ACADEMIC_HOLIDAYS.summerBreak.name, type: 'LONG_BREAK' };
    }
    
    // 3. Yarıyıl tatilini kontrol et
    const semesterStart = new Date(`${year}-${ACADEMIC_HOLIDAYS.semesterBreak.start.replace('-', '-')}`);
    const semesterEnd = new Date(`${year}-${ACADEMIC_HOLIDAYS.semesterBreak.end.replace('-', '-')}`);
    if (today >= semesterStart && today <= semesterEnd) {
        return { isHoliday: true, reason: ACADEMIC_HOLIDAYS.semesterBreak.name, type: 'LONG_BREAK' };
    }

    // Tatil değilse
    return { isHoliday: false };
}

// --- Tip Tanımları (Geliştirildi) ---
interface Topic {
    konuAdi: string;
    islenmeHaftasi: number;
    importance?: 'high' | 'medium' | 'low';
    examRelevance?: { [key: string]: 'high' | 'medium' | 'low' };
    difficulty?: 'high' | 'medium' | 'low';
    estimatedHours?: number;
    // YENİ: Alanlara göre önceliklendirme için
    academicTrackWeight?: { [track: string]: number }; // Örn: { "Sayısal": 1.5, "Eşit Ağırlık": 1.0 }
}

interface Unit {
    uniteAdi: string;
    konular: Topic[];
}

interface Subject {
    dersAdi: string;
    uniteVeTemalar: Unit[];
}

interface ClassData {
    sinifDuzeyi: string;
    aciklama: string;
    dersler: Subject[];
}

interface TopicPoolItem {
    ders: string;
    unite: string;
    konu: string;
    onem: string;
    sinavIlgisi: string;
    zorluk: string;
    sure: number; // dakika
    trackWeight?: number; // Alan önceliği için eklendi
}

// YENİ: Alanlara göre ana dersleri tanımlayan bir harita
const ACADEMIC_TRACK_SUBJECTS = {
    'Sayısal': ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türk Dili ve Edebiyatı'],
    'Eşit Ağırlık': ['Matematik', 'Türk Dili ve Edebiyatı', 'Tarih', 'Coğrafya'],
    'Sözel': ['Türk Dili ve Edebiyatı', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü ve Ahlak Bilgisi'],
    'Dil': ['Yabancı Dil', 'Türk Dili ve Edebiyatı'],
};

/**
 * Belirtilen sınıf seviyesi için konu havuzunu oluşturan yardımcı fonksiyon.
 * @param {string} gradeNumber - Konuların alınacağı sınıf seviyesi.
 * @param {ClassData} classData - Sınıfa ait müfredat verisi.
 * @param {string[]} subjectsToInclude - Plana dahil edilecek derslerin listesi.
 * @param {string} academicTrack - Öğrencinin akademik alanı.
 * @param {string | undefined} targetExam - Hedeflenen sınav (örn: 'YKS', 'LGS').
 * @returns {TopicPoolItem[]} Oluşturulan konu havuzu.
 */
const getTopicPoolForGrade = (gradeNumber: string, classData: ClassData, subjectsToInclude: string[], academicTrack: string, targetExam?: string): TopicPoolItem[] => {
    console.log(`Aranıyor: "${gradeNumber}" sınıfı için konu havuzu`);
    console.log('Dahil edilecek dersler:', subjectsToInclude);
    
    if (!classData) {
        console.warn(`"${gradeNumber}" sınıf için müfredat verisi bulunamadı.`);
        return [];
    }

    console.log(`"${gradeNumber}" sınıfı için ${classData.dersler.length} ders bulundu.`);
    console.log('Mevcut dersler:', classData.dersler.map(d => d.dersAdi));

    const topicPool: TopicPoolItem[] = [];
    
    classData.dersler.forEach((subject) => {
        console.log(`İnceleniyor: "${subject.dersAdi}" dersi`);
        
        if (subjectsToInclude.length === 0 || subjectsToInclude.includes(subject.dersAdi)) {
            console.log(`"${subject.dersAdi}" dersi dahil ediliyor.`);
            
            subject.uniteVeTemalar.forEach((unit) => {
                console.log(`  Unite: "${unit.uniteAdi}" - ${unit.konular.length} konu`);
                
                unit.konular.forEach((topic) => {
                    // Akademik alana göre ağırlık hesaplama
                    let trackWeight = topic.academicTrackWeight?.[academicTrack] || 1;
                    
                    // Akademik alan derslerini kontrol et ve ağırlığı artır
                    if (ACADEMIC_TRACK_SUBJECTS[academicTrack] && ACADEMIC_TRACK_SUBJECTS[academicTrack].includes(subject.dersAdi)) {
                        trackWeight *= 1.5; // Alan derslerine %50 daha fazla ağırlık ver
                    }
                    
                    topicPool.push({
                        ders: subject.dersAdi,
                        unite: unit.uniteAdi,
                        konu: topic.konuAdi,
                        onem: topic.importance || 'medium',
                        sinavIlgisi: targetExam ? (topic.examRelevance?.[targetExam] || 'medium') : 'medium',
                        zorluk: topic.difficulty || 'medium',
                        sure: (topic.estimatedHours || 1) * 60, // Dakikaya çevir
                        trackWeight: trackWeight, // Alan önceliği ekle
                    });
                });
            });
        } else {
            console.log(`"${subject.dersAdi}" dersi dahil edilmiyor.`);
        }
    });
    
    console.log(`"${gradeNumber}" sınıfı için toplamda ${topicPool.length} konu havuza eklendi.`);
    return topicPool;
};

// --- ANA FONKSİYON: generateInitialLongTermPlan (Büyük Ölçüde Geliştirildi) ---
export const generateInitialLongTermPlan = onCall({ timeoutSeconds: 300, memory: '1GiB' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    const userId = request.auth.uid;

    // 1. Profil verisini Firestore'dan çek (artık request.data yerine doğrudan kullanıcı profilinden alıyoruz)
    const privateProfileSnap = await db.doc(`users/${userId}/privateProfile/profile`).get();
    if (!privateProfileSnap.exists) {
        throw new HttpsError('not-found', 'Kullanıcı profili bulunamadı. Önce onboarding tamamlanmalı.');
    }
    const profile = privateProfileSnap.data();
    const {
        grade,
        academicTrack,
        targetExam,
        dailyHours,
        studyDays,
        confidenceLevels,
        learningStyle,
        targetUniversity,
        // Gelişmiş profil verilerini de al (varsa)
        diagnosticTestResults,
        diagnosticSummary,
        strengthAreas,
        weaknessAreas,
        recommendedFocus,
        learningHabits,
        learningRecommendations
    } = profile;

    if (!grade || !academicTrack || !targetExam || !dailyHours || !studyDays || !confidenceLevels) {
        throw new HttpsError('invalid-argument', 'Profilde eksik bilgi var.');
    }

    // 2. Müfredat verisini çek
    let curriculum: ClassData[] = [];
    try {
        const curriculumSnapshot = await db.collection('curriculum').get();
        if (curriculumSnapshot.empty) {
            throw new HttpsError('not-found', 'Hiç müfredat verisi bulunamadı.');
        }
        curriculum = curriculumSnapshot.docs.map(doc => doc.data() as ClassData);
    } catch (error: any) {
        throw new HttpsError('internal', `Müfredat verisi alınamadı: ${error.message}`);
    }

    // 3. Sınıf düzeyini ve plan türünü belirle
    let numericGrade: number;
    if (grade === 'Mezun') {
        numericGrade = 12;
    } else {
        numericGrade = parseInt(grade);
        if (isNaN(numericGrade)) {
            throw new HttpsError('invalid-argument', `Geçersiz sınıf değeri: "${grade}"`);
        }
    }
    
    // 4. Tatil durumunu kontrol et ve plan türünü belirle
    const holidayStatus = checkCurrentHolidayStatus();
    let planType = request.data?.planType || 'regular';
    
    // Tatil dönemindeyse ve kullanıcı özel bir plan türü belirtmediyse tatil planı öner
    if (holidayStatus.isHoliday && planType === 'regular') {
        if (holidayStatus.type === 'LONG_BREAK') {
            // Uzun tatillerde dengeli plan öner
            planType = 'holiday_balanced';
        } else {
            // Kısa tatillerde tekrar planı öner
            planType = 'holiday_review';
        }
    }
    
    let topicPool: (TopicPoolItem & { confidenceWeight: number })[] = [];
    
    // Plan türüne göre uygun sınıf düzeyi ve konu havuzunu belirle
    if (planType === 'holiday_review') {
        // Tekrar planı: Önceki sınıf düzeyinin konularını kullan
        const previousGradeString = `${numericGrade - 1}. Sınıf`;
        const previousClassData = curriculum.find(c => c.sinifDuzeyi === previousGradeString);
        
        if (!previousClassData) {
            throw new HttpsError('not-found', `${previousGradeString} sınıfı için müfredat verisi bulunamadı.`);
        }
        
        const subjectsToInclude = previousClassData.dersler.map((subject) => subject.dersAdi);
        topicPool = getTopicPoolForGradeWithConfidence(previousGradeString, previousClassData, subjectsToInclude, academicTrack, targetExam, confidenceLevels);
        
        console.log(`Tatil tekrar planı için ${previousGradeString} konuları kullanılıyor. Toplam: ${topicPool.length} konu.`);
    }
    else if (planType === 'holiday_prepare') {
        // Hazırlık planı: Sonraki sınıf düzeyinin konularını kullan
        const nextGradeString = `${numericGrade + 1}. Sınıf`;
        const nextClassData = curriculum.find(c => c.sinifDuzeyi === nextGradeString);
        
        if (!nextClassData) {
            throw new HttpsError('not-found', `${nextGradeString} sınıfı için müfredat verisi bulunamadı.`);
        }
        
        const subjectsToInclude = nextClassData.dersler.map((subject) => subject.dersAdi);
        topicPool = getTopicPoolForGradeWithConfidence(nextGradeString, nextClassData, subjectsToInclude, academicTrack, targetExam, confidenceLevels);
        
        console.log(`Tatil hazırlık planı için ${nextGradeString} konuları kullanılıyor. Toplam: ${topicPool.length} konu.`);
    }
    else if (planType === 'holiday_balanced') {
        // Dengeli plan: Hem önceki hem sonraki sınıf düzeyinin konularını karıştır
        const previousGradeString = `${numericGrade - 1}. Sınıf`;
        const nextGradeString = `${numericGrade + 1}. Sınıf`;
        
        const previousClassData = curriculum.find(c => c.sinifDuzeyi === previousGradeString);
        const nextClassData = curriculum.find(c => c.sinifDuzeyi === nextGradeString);
        
        if (!previousClassData) {
            throw new HttpsError('not-found', `${previousGradeString} sınıfı için müfredat verisi bulunamadı.`);
        }
        
        if (!nextClassData) {
            throw new HttpsError('not-found', `${nextGradeString} sınıfı için müfredat verisi bulunamadı.`);
        }
        
        const previousSubjects = previousClassData.dersler.map((subject) => subject.dersAdi);
        const nextSubjects = nextClassData.dersler.map((subject) => subject.dersAdi);
        
        // Önceki ve sonraki sınıf düzeyleri için konu havuzlarını oluştur
        const previousTopicPool = getTopicPoolForGradeWithConfidence(previousGradeString, previousClassData, previousSubjects, academicTrack, targetExam, confidenceLevels);
        const nextTopicPool = getTopicPoolForGradeWithConfidence(nextGradeString, nextClassData, nextSubjects, academicTrack, targetExam, confidenceLevels);
        
        // Önceki sınıftan %60, sonraki sınıftan %40 konu al
        const previousTopicsCount = Math.ceil(30 * 0.6); // 30 konu için %60
        const nextTopicsCount = Math.floor(30 * 0.4); // 30 konu için %40
        
        // Önem ve güven seviyesine göre sırala
        const sortedPreviousTopics = previousTopicPool
            .sort((a, b) => (b.confidenceWeight + (b.onem === 'high' ? 1 : 0)) - (a.confidenceWeight + (a.onem === 'high' ? 1 : 0)))
            .slice(0, previousTopicsCount);
            
        const sortedNextTopics = nextTopicPool
            .sort((a, b) => (b.confidenceWeight + (b.onem === 'high' ? 1 : 0)) - (a.confidenceWeight + (a.onem === 'high' ? 1 : 0)))
            .slice(0, nextTopicsCount);
        
        // İki havuzu birleştir
        topicPool = [...sortedPreviousTopics, ...sortedNextTopics];
        
        console.log(`Dengeli tatil planı için ${previousGradeString} (${sortedPreviousTopics.length} konu) ve ${nextGradeString} (${sortedNextTopics.length} konu) karışık olarak kullanılıyor. Toplam: ${topicPool.length} konu.`);
    }
    else {
        // Normal plan: Mevcut sınıf düzeyinin konularını kullan
        const gradeString = `${numericGrade}. Sınıf`;
        const currentClassData = curriculum.find(c => c.sinifDuzeyi === gradeString);
        
        if (!currentClassData) {
            throw new HttpsError('not-found', `${gradeString} sınıfı için müfredat verisi bulunamadı.`);
        }
        
        const subjectsToInclude = currentClassData.dersler.map((subject) => subject.dersAdi);
        topicPool = getTopicPoolForGradeWithConfidence(gradeString, currentClassData, subjectsToInclude, academicTrack, targetExam, confidenceLevels);
        
        console.log(`Normal plan için ${gradeString} konuları kullanılıyor. Toplam: ${topicPool.length} konu.`);
    }
    
    if (topicPool.length === 0) {
        throw new HttpsError('not-found', 'Konu havuzu boş.');
    }

    // 5. AI Prompts (Aşama 1: Stratejik Seçim)
    const topicSummaryForAI = topicPool.map(t => ({
        konu: `${t.ders} - ${t.konu}`,
        onem: t.onem,
        zorluk: t.zorluk,
        trackWeight: t.trackWeight ?? 1,
        confidenceWeight: t.confidenceWeight ?? 1
    }));
    
    // Teşhis sonuçları ve öğrenme alışkanlıklarını prompt'a ekle
    let diagnosticPrompt = '';
    if (weaknessAreas && weaknessAreas.length > 0) {
        diagnosticPrompt += `
- Kullanıcının teşhis testinde zayıf olduğu alanlar: ${weaknessAreas.join(', ')}
- Bu alanlara öncelik ver ve temel konulara odaklan.`;
    }
    
    if (recommendedFocus && recommendedFocus.length > 0) {
        diagnosticPrompt += `
- Önerilen odak alanları: ${recommendedFocus.join(', ')}
- Bu konularda özellikle pekiştirme çalışmaları ekle.`;
    }
    
    if (learningHabits) {
        diagnosticPrompt += `
- Kullanıcının ortalama odaklanma süresi: ${learningHabits.focusDuration} dakika
- Pomodoro oturumlarını bu süreye göre ayarla.`;
    }
    
    const selectionPrompt = `
Sen uzman bir eğitim koçusun. Aşağıdaki öğrenci profili ve konu listesine göre, 4 haftalık bir çalışma planı için bu öğrenciye özel en stratejik ve öncelikli 30 konuyu seç.

ÖĞRENCİ PROFİLİ:
- Sınıf: ${grade}. sınıf
- Alanı: ${academicTrack}
- Hedef Sınav: ${targetExam}
- Hedef Üniversite: ${targetUniversity || 'Belirtilmemiş'}
- Günlük Çalışma Süresi: ${dailyHours} saat
- Çalışma Günleri: ${studyDays.join(', ')}
- Öğrenme Stili: ${learningStyle}
- Güven Seviyeleri: ${JSON.stringify(confidenceLevels)}
${diagnosticPrompt}

KURALLAR:
- ${academicTrack} alan derslerine öncelik ver (trackWeight'i yüksek olanlar).
- "high" önemdeki konuları mutlaka dahil et.
- Güven seviyesi "low" olan derslerin temel konularına öncelik ver (confidenceWeight'i yüksek olanlar).
- Temel atma konularını ve hedefe yönelik ileri seviye konuları dengele.
- Konular arasında mantıksal bir sıra olmasına dikkat et (örn: 'Sayılar' konusu 'Fonksiyonlar'dan önce gelmeli).
- Sadece ve sadece seçtiğin konuların adlarını içeren bir JSON dizisi olarak cevap ver. Örneğin: ["Matematik - Sayılar", "Fizik - Vektörler", ...]. Başka hiçbir metin ekleme.

MEVCUT KONULARIN ÖZETİ (${topicSummaryForAI.length} adet):
${JSON.stringify(topicSummaryForAI.slice(0, 300))}
`;

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const selectionResult = await model.generateContent(selectionPrompt);
    let selectedTopicsNames: string[];
    try {
        const cleanedResponse = selectionResult.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
        selectedTopicsNames = JSON.parse(cleanedResponse);
    } catch (e) {
        selectedTopicsNames = topicPool
            .sort((a, b) => (b.trackWeight + (b.confidenceWeight ?? 1)) - (a.trackWeight + (a.confidenceWeight ?? 1)))
            .slice(0, 30)
            .map(t => `${t.ders} - ${t.konu}`);
    }
    const finalTopicPool = topicPool.filter(t => selectedTopicsNames.includes(`${t.ders} - ${t.konu}`));

    // 6. AI Prompts (Aşama 2: Detaylı Plan)
    // Resmi tatil tarihlerini tanımla
    const officialHolidays = ACADEMIC_HOLIDAYS.officialHolidays.map(h => {
      // Şu anki yılı al
      const currentYear = new Date().getFullYear();
      // Ay-Gün formatını YYYY-MM-DD formatına çevir
      const [month, day] = h.date.split('-');
      return `${currentYear}-${month}-${day}`;
    });

    // Plan türüne göre özel prompt eklemeleri
    let planTypeSpecificPrompt = '';

    if (planType === 'holiday_review') {
      planTypeSpecificPrompt = `
ÖNEMLİ PLAN ODAĞI: Bu bir tekrar planıdır. Öğrenci geçen eğitim yılını (${numericGrade - 1}. Sınıf) tamamladı. Bu planda, o yıla ait temel konuları, özellikle de öğrencinin zayıf olduğu dersleri pekiştirmeye odaklan. Amaç, yeni döneme sağlam bir temel ile başlamak.`;
    } 
    else if (planType === 'holiday_prepare') {
      planTypeSpecificPrompt = `
ÖNEMLİ PLAN ODAĞI: Bu bir ön hazırlık planıdır. Öğrenci bir sonraki eğitim yılına (${numericGrade + 1}. Sınıf) başlayacak. Bu planda, yeni yılın ilk dönem konularına hafif bir giriş yap. Amaç, öğrenciyi bunaltmadan merak uyandırmak ve temel kavramlara aşinalık kazandırmak.`;
    }
    else if (planType === 'holiday_balanced') {
      planTypeSpecificPrompt = `
ÖNEMLİ PLAN ODAĞI: Bu dengeli bir tatil planıdır. Planın yaklaşık %60'ını öğrencinin bitirdiği yıla (${numericGrade - 1}. Sınıf) ait önemli konuların tekrarı, %40'ını ise yeni eğitim yılına (${numericGrade + 1}. Sınıf) ait giriş seviyesi konular oluşturmalıdır.`;
    }

    // Resmi tatil günlerini prompt'a ekle
    const holidayPrompt = `
Aşağıdaki tarihler resmi tatildir ve bu günlere kesinlikle ders görevi atanmamalıdır. Planında bu günleri isRestDay: true olarak işaretle: ${JSON.stringify(officialHolidays)}`;

    // Teşhis sonuçları ve öğrenme alışkanlıklarını kullanarak kişiselleştirilmiş talimatlar oluştur
    let personalizedInstructions = '';
    
    // Teşhis sonuçlarına göre özel talimatlar
    if (weaknessAreas && weaknessAreas.length > 0) {
        // Zayıf alanlar için özel talimatlar ekle
        weaknessAreas.forEach(area => {
            personalizedInstructions += `
- Kullanıcının teşhis testinde '${area}' konusunda zayıf olduğu tespit edildi. Planın ilk haftasına bu konuyu pekiştirecek bir temel atma görevi ekle.`;
        });
    }
    
    // Öğrenme stiline göre özel talimatlar
    if (learningStyle) {
        personalizedInstructions += `
- Kullanıcının öğrenme stili '${learningStyle}' olarak belirlendi.`;
        
        if (learningStyle === 'visual') {
            personalizedInstructions += ` Konu anlatımlarını desteklemek için her konuya bir adet kaliteli ve ücretsiz YouTube videosu (Khan Academy, Rehber Matematik vb.) linki içeren bir resource objesi ekle.`;
        } else if (learningStyle === 'auditory') {
            personalizedInstructions += ` Her konu için sesli anlatım kaynakları ve podcast önerileri ekle.`;
        } else if (learningStyle === 'kinesthetic') {
            personalizedInstructions += ` Her konuya uygulamalı etkinlikler ve interaktif simülasyonlar ekle.`;
        } else if (learningStyle === 'reading') {
            personalizedInstructions += ` Her konu için kaliteli ders notları ve makale önerileri ekle.`;
        }
    }
    
    // Öğrenme alışkanlıklarına göre özel talimatlar
    if (learningHabits) {
        const focusDuration = learningHabits.focusDuration;
        
        if (focusDuration <= 30) {
            personalizedInstructions += `
- Kullanıcının odaklanma süresi ${focusDuration} dakika. Tüm çalışma bloklarını Pomodoro tekniğine göre (${focusDuration} dk ders, 5 dk mola) pomodoroSessions dizisi olarak yapılandır.`;
        } else if (focusDuration <= 45) {
            personalizedInstructions += `
- Kullanıcının odaklanma süresi ${focusDuration} dakika. Çalışma bloklarını (${focusDuration} dk ders, 10 dk mola) şeklinde yapılandır.`;
        } else {
            personalizedInstructions += `
- Kullanıcının odaklanma süresi ${focusDuration} dakika. Uzun çalışma bloklarını (${focusDuration} dk ders, 15 dk mola) şeklinde yapılandır.`;
        }
        
        // Tercih edilen çalışma zamanı
        if (learningHabits.preferredStudyTime === 'morning') {
            personalizedInstructions += `
- Kullanıcı sabah saatlerinde daha verimli çalışıyor. Zor ve analitik konuları sabah çalışılacak şekilde planla.`;
        } else if (learningHabits.preferredStudyTime === 'night') {
            personalizedInstructions += `
- Kullanıcı gece saatlerinde daha verimli çalışıyor. Yaratıcı düşünme ve problem çözme gerektiren konuları akşam çalışılacak şekilde planla.`;
        }
    }

    const planPrompt = `
Sen kişiselleştirilmiş ders planları hazırlayan bir yapay zeka koçusun. Aşağıdaki öğrenci profili ve SEÇİLMİŞ KONU HAVUZU'nu kullanarak 4 haftalık ultra kişiselleştirilmiş bir çalışma planı oluştur.

ÖĞRENCİ PROFİLİ:
- Sınıf: ${grade}. sınıf
- Alanı: ${academicTrack}
- Hedef Sınav: ${targetExam}
- Hedef Üniversite: ${targetUniversity || 'Belirtilmemiş'}
- Günlük Çalışma Süresi: ${dailyHours} saat
- Çalışma Günleri: ${studyDays.join(', ')}
- Öğrenme Stili: ${learningStyle}
- Güven Seviyeleri: ${JSON.stringify(confidenceLevels)}

KİŞİSELLEŞTİRİLMİŞ TALİMATLAR:${personalizedInstructions}

PLANLAMA KURALLARI:
1. Plan tam olarak 4 hafta olmalı.
2. Görevleri SADECE belirtilen çalışma günlerine ata. Diğer günler dinlenme günüdür ve "isRestDay": true olmalıdır.
3. Günlük toplam görev süresi ${dailyHours} saati (${dailyHours * 60} dakikayı) geçmemeli.
4. Her dailyTasks objesi, birden fazla Pomodoro oturumu içerebilir. Her Pomodoro: { type, description, durationInMinutes, isBreak, isCompleted } şeklinde olmalı.
5. Her konu için, o konuyu en iyi anlatan Türkçe bir YouTube videosu veya web makalesi öner ve resource alanına ekle: { type: 'video'|'article', title, url }.
6. Öğrenme stili 'visual' ise daha fazla 'video izleme' ve 'konu haritası çıkarma' görevi ekle. 'kinesthetic' ise daha fazla 'uygulamalı soru çözümü' ve 'deney simülasyonu' görevi ekle.
7. Feynman açıklaması somut ve örnekli olmalı. Quiz soruları, güven seviyesine göre zorlukta olmalı (low: kolay, high: zor).
${planTypeSpecificPrompt}
${holidayPrompt}

SEÇİLMİŞ KONU HAVUZU:
${JSON.stringify(finalTopicPool)}

ÖNEMLİ - JSON FORMAT:
Cevabın SADECE aşağıda belirtilen yapıda bir JSON objesi olsun. Başka hiçbir açıklama, metin veya kod bloğu işareti ekleme. Tarihleri bugünden başlayarak doğru şekilde ata.

{
  "planTitle": "${grade}. Sınıf ${academicTrack} ${planType === 'regular' ? 'Ultra Kişiselleştirilmiş' : 'Tatil'} Planı",
  "weeks": [
    {
      "weekNumber": 1,
      "days": [
        {
          "day": "Pazartesi",
          "date": "YYYY-MM-DD",
          "isRestDay": false,
          "dailyTasks": [
            {
              "subject": "Ders adı",
              "topic": "Konu adı",
              "mainTaskTitle": "Konu Çalışması ve Pratik",
              "pomodoroSessions": [
                { "type": "study", "description": "Konu anlatımı video izleme", "durationInMinutes": 25, "isCompleted": false },
                { "type": "break", "description": "Kısa Mola", "durationInMinutes": 5, "isBreak": true, "isCompleted": true },
                { "type": "practice", "description": "Alıştırma çözümü", "durationInMinutes": 25, "isCompleted": false }
              ],
              "resource": { "type": "video", "title": "Konu Anlatımı", "url": "https://youtube.com/..." },
              "feynman": { /* ... */ }
            }
          ]
        }
      ]
    }
  ]
}
`;
    const planResult = await model.generateContent(planPrompt);
    let planJson;
    try {
        const cleanedResponse = planResult.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
        planJson = JSON.parse(cleanedResponse);
        if (!planJson.weeks || !Array.isArray(planJson.weeks)) {
            throw new Error('Geçersiz yanıt formatı: "weeks" dizisi bulunamadı.');
        }
    } catch (error: any) {
        planJson = buildValidJsonStructure(planResult.response.text(), finalTopicPool, dailyHours);
    }

    // Firestore'a kaydet
    const userPlanRef = db.doc(`users/${userId}/plan/user_plan`);
    const firestorePlanData = {
        ...planJson,
        userId: userId,
        grade: grade,
        academicTrack: academicTrack,
        dailyHours: dailyHours,
        studyDays: studyDays,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await userPlanRef.set(firestorePlanData);
    await db.doc(`users/${userId}`).update({
        onboardingCompleted: true,
        planGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return {
        success: true,
        message: 'Plan başarıyla oluşturuldu ve kaydedildi!',
        planId: userPlanRef.id,
    };
});

/**
 * Onboarding sırasında kullanıcıdan alınan profil bilgilerini Firestore'a kaydeden fonksiyon.
 * users/{userId}/privateProfile altına kaydeder.
 */
export const completeOnboardingProfile = onCall({ timeoutSeconds: 60 }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    const userId = request.auth.uid;
    const data = request.data;

    // Beklenen alanlar
    const {
        fullName,
        grade,
        academicTrack,
        targetUniversity,
        targetExam,
        learningStyle,
        confidenceLevels,
        preferredStudyTimes,
        studyDays,
        dailyHours
    } = data;

    // Temel doğrulama
    if (!fullName || !grade || !academicTrack || !targetExam || !learningStyle || !confidenceLevels || !preferredStudyTimes || !studyDays || !dailyHours) {
        throw new HttpsError('invalid-argument', 'Tüm alanlar zorunludur. Eksik bilgi var.');
    }

    // Firestore referansı
    const privateProfileRef = db.doc(`users/${userId}/privateProfile/profile`);

    const privateProfileData = {
        fullName,
        grade,
        academicTrack,
        targetUniversity,
        targetExam,
        learningStyle,
        confidenceLevels,
        preferredStudyTimes,
        studyDays,
        dailyHours,
        onboardingCompleted: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
        await privateProfileRef.set(privateProfileData, { merge: true });
        // Ana kullanıcı dökümanına da onboardingCompleted flag'i ekle
        await db.doc(`users/${userId}`).set({ onboardingCompleted: true }, { merge: true });
        return { success: true, message: 'Profil başarıyla kaydedildi.' };
    } catch (error: any) {
        console.error('Profil kaydedilirken hata:', error);
        throw new HttpsError('internal', error.message || 'Profil kaydedilemedi.');
    }
});

/**
 * Gelişmiş onboarding: Mini teşhis sınavı sonuçlarını ve öğrenme alışkanlıklarını kaydeder.
 * Kullanıcı profilini daha detaylı ve veri odaklı hale getirir.
 */
export const createAdvancedProfile = onCall({ timeoutSeconds: 60 }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    const userId = request.auth.uid;
    const data = request.data;

    // Teşhis sınavı sonuçları (isteğe bağlı)
    const diagnosticTestResults = data.diagnosticTestResults;
    
    // Öğrenme alışkanlıkları analizi
    const learningHabits = data.learningHabits;
    
    if (!diagnosticTestResults && !learningHabits) {
        throw new HttpsError('invalid-argument', 'En az bir veri türü (diagnosticTestResults veya learningHabits) gereklidir.');
    }

    try {
        // Önce mevcut profil bilgilerini al
        const privateProfileRef = db.doc(`users/${userId}/privateProfile/profile`);
        const profileSnap = await privateProfileRef.get();
        
        if (!profileSnap.exists) {
            throw new HttpsError('not-found', 'Temel profil bulunamadı. Önce temel onboarding tamamlanmalı.');
        }
        
        // Yeni verileri ekle
        const advancedProfileData: any = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            advancedProfileCompleted: true
        };
        
        // Teşhis sınavı sonuçlarını ekle (varsa)
        if (diagnosticTestResults) {
            // Sınav sonuçlarını işle
            const processedResults = processTestResults(diagnosticTestResults);
            advancedProfileData.diagnosticTestResults = diagnosticTestResults;
            advancedProfileData.diagnosticSummary = processedResults.summary;
            advancedProfileData.strengthAreas = processedResults.strengthAreas;
            advancedProfileData.weaknessAreas = processedResults.weaknessAreas;
            advancedProfileData.recommendedFocus = processedResults.recommendedFocus;
        }
        
        // Öğrenme alışkanlıklarını ekle (varsa)
        if (learningHabits) {
            advancedProfileData.learningHabits = learningHabits;
            
            // Öğrenme alışkanlıklarına göre tavsiyeler oluştur
            const learningRecommendations = generateLearningRecommendations(learningHabits);
            advancedProfileData.learningRecommendations = learningRecommendations;
        }
        
        // Firestore'a kaydet (merge: true ile mevcut verileri koruyarak)
        await privateProfileRef.set(advancedProfileData, { merge: true });
        
        // Kullanıcı ana dökümanını güncelle
        await db.doc(`users/${userId}`).update({
            advancedProfileCompleted: true,
            lastProfileUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return { 
            success: true, 
            message: 'Gelişmiş profil başarıyla kaydedildi.',
            profileSummary: {
                strengthAreas: advancedProfileData.strengthAreas || [],
                weaknessAreas: advancedProfileData.weaknessAreas || [],
                recommendedFocus: advancedProfileData.recommendedFocus || []
            }
        };
    } catch (error: any) {
        console.error('Gelişmiş profil kaydedilirken hata:', error);
        throw new HttpsError('internal', error.message || 'Gelişmiş profil kaydedilemedi.');
    }
});

/**
 * Teşhis sınavı sonuçlarını işleyerek güçlü ve zayıf alanları belirler
 */
function processTestResults(testResults: any) {
    // Derslere göre doğru/yanlış oranlarını hesapla
    const subjectPerformance: {[subject: string]: {correct: number, total: number, avgTime: number}} = {};
    
    // Her bir soru için sonuçları işle
    testResults.questions.forEach((q: any) => {
        const subject = q.subject;
        
        if (!subjectPerformance[subject]) {
            subjectPerformance[subject] = {correct: 0, total: 0, avgTime: 0};
        }
        
        subjectPerformance[subject].total++;
        if (q.isCorrect) {
            subjectPerformance[subject].correct++;
        }
        
        // Ortalama süreyi hesapla (saniye cinsinden)
        subjectPerformance[subject].avgTime = 
            ((subjectPerformance[subject].avgTime * (subjectPerformance[subject].total - 1)) + q.timeSpent) / 
            subjectPerformance[subject].total;
    });
    
    // Güçlü ve zayıf alanları belirle
    const strengthAreas: string[] = [];
    const weaknessAreas: string[] = [];
    const recommendedFocus: string[] = [];
    
    for (const subject in subjectPerformance) {
        const performance = subjectPerformance[subject];
        const correctRate = performance.correct / performance.total;
        
        // %70 üzeri başarı oranı güçlü alan
        if (correctRate >= 0.7) {
            strengthAreas.push(subject);
        } 
        // %50 altı başarı oranı zayıf alan
        else if (correctRate < 0.5) {
            weaknessAreas.push(subject);
            recommendedFocus.push(`${subject} - Temel Kavramlar`);
        }
        // Orta seviye başarı ama yavaş çözüm süresi
        else if (performance.avgTime > 60) { // 60 saniyeden fazla süren sorular
            recommendedFocus.push(`${subject} - Hız Kazanma Çalışmaları`);
        }
    }
    
    // Özet bilgileri oluştur
    const summary = {
        totalQuestions: testResults.questions.length,
        correctAnswers: testResults.questions.filter((q: any) => q.isCorrect).length,
        averageTime: testResults.questions.reduce((acc: number, q: any) => acc + q.timeSpent, 0) / testResults.questions.length,
        subjectPerformance
    };
    
    return {
        summary,
        strengthAreas,
        weaknessAreas,
        recommendedFocus
    };
}

/**
 * Öğrenme alışkanlıklarına göre tavsiyeler oluşturur
 */
function generateLearningRecommendations(learningHabits: any) {
    const recommendations: string[] = [];
    
    // Odaklanma süresi
    if (learningHabits.focusDuration < 25) {
        recommendations.push('Pomodoro tekniği ile kısa odaklanma periyotları (15-20 dk) ve sık molalar dene.');
    } else if (learningHabits.focusDuration >= 45) {
        recommendations.push('Uzun odaklanma süren avantajını kullanarak derin öğrenme seansları planla.');
    }
    
    // Erteleme eğilimi
    if (learningHabits.procrastinationLevel > 7) {
        recommendations.push('Görevleri küçük parçalara böl ve "5 dakika kuralı" ile başlama direncini kır.');
        recommendations.push('Günlük rutinler oluştur ve çalışma zamanlarını sabitleyerek alışkanlık geliştir.');
    }
    
    // Öğrenme zamanı tercihi
    if (learningHabits.preferredStudyTime === 'morning') {
        recommendations.push('Sabah saatlerinde analitik ve hafıza gerektiren konulara odaklan.');
    } else if (learningHabits.preferredStudyTime === 'night') {
        recommendations.push('Akşam saatlerinde yaratıcı düşünme ve problem çözme çalışmaları yap.');
    }
    
    // Öğrenme ortamı tercihi
    if (learningHabits.preferredEnvironment === 'quiet') {
        recommendations.push('Düzenli bir çalışma alanı oluştur ve gürültü engelleyici kulaklıklar kullan.');
    } else if (learningHabits.preferredEnvironment === 'background_noise') {
        recommendations.push('Kahve dükkanı ambiyansı veya lofi müzik ile çalışma verimliliğini artır.');
    }
    
    return recommendations;
}

/**
 * YENİ: AI'dan geçerli JSON alınamadığında mantıklı bir yedek plan oluşturan fonksiyon.
 */
function buildValidJsonStructure(text: string, topicPool: TopicPoolItem[], dailyHours: number): any {
            try {
              console.log('Manuel JSON yapısı oluşturuluyor...');
              
              // Metinden başlık bilgisi çekmeyi dene
              let planTitle = '4 Haftalık Kişiselleştirilmiş Çalışma Planı';
              try {
                const titleMatch = text.match(/"planTitle":\s*"([^"]+)"/);
                if (titleMatch && titleMatch[1]) {
                  planTitle = titleMatch[1];
                  console.log('Plan başlığı metinden çıkarıldı:', planTitle);
                }
              } catch (titleErr) {
                console.error('Başlık çıkarılamadı:', titleErr);
              }
              
              // Varsayılan bir 4 haftalık çalışma planı şablonu
              const plan = {
                planTitle: planTitle,
                weeks: []
              };
              
              // Konu havuzunu hazırla
              // Önce önem sırasına göre sırala (medium öncelikli)
              const sortedTopics = [...topicPool].sort((a, b) => {
                const priorityValues = {'high': 3, 'medium': 2, 'low': 1};
                const priorityA = priorityValues[a.onem as keyof typeof priorityValues] || 2;
                const priorityB = priorityValues[b.onem as keyof typeof priorityValues] || 2;
                return priorityB - priorityA; // Yüksek öncelik önce
              });
              
              // Benzersiz dersleri bul
              const subjects = Array.from(new Set(sortedTopics.map(t => t.ders)));
              console.log(`Manuel plan için benzersiz ders sayısı: ${subjects.length}`);
              
              // Tarih belirle - bugünden itibaren
              const today = new Date();
              const startDate = new Date(today);
              startDate.setDate(today.getDate() - today.getDay() + 1); // Bu haftanın Pazartesi günü
              
              // Her hafta için bir şablon ekle
              for (let i = 1; i <= 4; i++) {
                const week = {
                  weekNumber: i,
                  days: []
                };
                
                // Haftanın günleri
                const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
                
                for (let j = 0; j < 7; j++) {
                  const currentDate = new Date(startDate);
                  currentDate.setDate(startDate.getDate() + (i-1)*7 + j);
                  
                  const day = {
                    day: dayNames[j],
                    date: currentDate.toISOString().split('T')[0], // YYYY-MM-DD formatı
                    isRestDay: j === 6, // Pazar günleri dinlenme günü
                    dailyTasks: []
                  };
                  
                  if (!day.isRestDay) {
                    // Her gün için tahmini çalışma saati
                    const dailyTaskCount = Math.min(5, Math.max(2, Math.floor(dailyHours * 1.5))); // En az 2, en fazla 5 görev
                    let totalDuration = 0;
                    
                    // Ders bazında görevleri dağıt
                    let usedSubjectIndices: number[] = [];
                    
                    for (let t = 0; t < dailyTaskCount; t++) {
                      // Eşit dağılım için subjects dizisini döngüsel olarak kullan
                      // ama aynı gün aynı dersi tekrarlama
                      let subjectIndex = (i + j + t) % subjects.length;
                      
                      // Eğer bu ders bugün kullanıldıysa, başka bir ders seç
                      let attempts = 0;
                      while (usedSubjectIndices.includes(subjectIndex) && attempts < subjects.length) {
                        subjectIndex = (subjectIndex + 1) % subjects.length;
                        attempts++;
                      }
                      
                      usedSubjectIndices.push(subjectIndex);
                      const currentSubject = subjects[subjectIndex];
                      
                      // Bu derse ait konuları bul ve önem sırasına göre sıralanmış halinden seç
                      const topicsForSubject = sortedTopics.filter(topic => topic.ders === currentSubject);
                      
                      if (topicsForSubject.length > 0) {
                        // Konular içinde ilk 20'den seç (önem sırası yüksek olanlar)
                        const randomIndex = Math.floor(Math.random() * Math.min(20, topicsForSubject.length));
                        const selectedTopic = topicsForSubject[randomIndex];
                        
                        // Her görev için süreyi hesapla (30-60 dakika arası)
                        const taskDuration = Math.max(30, Math.min(60, selectedTopic.sure));
                        totalDuration += taskDuration;
                        
                        // Günlük toplam süre sınırını aşıyorsa, görevi ekleme
                        if (totalDuration > dailyHours * 60) {
                          totalDuration -= taskDuration;
                          continue;
                        }
                        
                        day.dailyTasks.push({
                          subject: selectedTopic.ders,
                          topic: selectedTopic.konu,
                          unit: selectedTopic.unite,
                          durationInMinutes: taskDuration,
                          isCompleted: false,
                          feynman: {
                            explanation: `${selectedTopic.konu} - ${selectedTopic.unite} ünitesindeki bu konu, sınıf seviyesine uygun olarak çalışılmalıdır.`,
                            analogyPrompt: `${selectedTopic.konu} konusunu günlük hayatta neye benzetebiliriz?`,
                            quiz: [
                              {
                                question: `${selectedTopic.konu} konusuyla ilgili soru:`,
                                options: [`${selectedTopic.konu} ile ilgili A seçeneği`, `${selectedTopic.konu} ile ilgili B seçeneği`, `${selectedTopic.konu} ile ilgili C seçeneği`],
                                correctAnswer: `${selectedTopic.konu} ile ilgili A seçeneği`
                              }
                            ]
                          }
                        });
                      }
                    }
                    
                    // Eğer hiç görev eklenememiş ise, bir tane genel görev ekle
                    if (day.dailyTasks.length === 0) {
                      day.dailyTasks.push({
                        subject: "Genel Tekrar",
                        topic: "Günlük çalışma",
                        durationInMinutes: 60,
                        isCompleted: false,
                        feynman: {
                          explanation: "Bugün için konuları genel olarak tekrar et.",
                          analogyPrompt: "Öğrenme sürecini bir yolculuğa benzetebilir misin?",
                          quiz: [
                            {
                              question: "Etkili çalışma için hangisi önemlidir?",
                              options: ["Düzenli tekrar yapmak", "Sadece sınavdan önce çalışmak", "Hiç ara vermeden çalışmak"],
                              correctAnswer: "Düzenli tekrar yapmak"
                            }
                          ]
                        }
                      });
                    }
                  }
                  
                  week.days.push(day);
                }
                
                plan.weeks.push(week);
              }
              
              console.log(`Manuel plan oluşturuldu. Toplam hafta: ${plan.weeks.length}, Toplam görev: ${plan.weeks.reduce((acc, week) => acc + week.days.reduce((dacc, day) => dacc + day.dailyTasks.length, 0), 0)}`);
              return plan;
            } catch (error) {
              console.error('Manuel JSON yapısı oluşturulurken hata:', error);
              throw error;
            }
          };

// --- YENİ: Konu havuzunu confidenceLevels ile ağırlıklandıran fonksiyon ---
function getTopicPoolForGradeWithConfidence(
    gradeNumber: string,
    classData: ClassData,
    subjectsToInclude: string[],
    academicTrack: string,
    targetExam: string,
    confidenceLevels: { [subject: string]: 'low' | 'medium' | 'high' }
): (TopicPoolItem & { confidenceWeight: number })[] {
    // Önce temel konu havuzunu getTopicPoolForGrade fonksiyonu ile oluştur
    const baseTopicPool = getTopicPoolForGrade(gradeNumber, classData, subjectsToInclude, academicTrack, targetExam);
    
    // Sonra güven seviyelerine göre ağırlıklandırma ekle
    return baseTopicPool.map(topic => {
        const confidence = confidenceLevels[topic.ders] || 'medium';
        let confidenceWeight = 1;
        
        // Güven seviyesine göre ağırlık belirle
        if (confidence === 'low') confidenceWeight = 2.0;      // Düşük güven = daha fazla çalışma gerekli
        else if (confidence === 'medium') confidenceWeight = 1.0; // Orta güven = normal çalışma
        else if (confidence === 'high') confidenceWeight = 0.7;  // Yüksek güven = daha az çalışma yeterli
        
        return {
            ...topic,
            confidenceWeight
        };
    });
}

// --- Oyunlaştırma Rozet Kriterleri ---
const BADGE_CRITERIA: { [badge: string]: (profile: any, stats: any, planData: any) => boolean } = {
    'hafta1_fatihi': (profile, stats) => stats.streak >= 7,
    'matematik_canavari': (profile, stats, planData) => {
        // Matematik görevlerinden 20 tane tamamladıysa
        let count = 0;
        for (const week of planData.weeks) {
            for (const day of week.days) {
                for (const task of (day.dailyTasks || [])) {
                    if (task.subject && task.subject.toLowerCase().includes('matematik') && task.isCompleted) {
                        count++;
                    }
                }
            }
        }
        return count >= 20;
    },
    'gece_kusu': (profile, stats, planData) => {
        // Gece 10'dan sonra 10 görev tamamladıysa
        let count = 0;
        for (const week of planData.weeks) {
            for (const day of week.days) {
                for (const task of (day.dailyTasks || [])) {
                    if (task.isCompleted && task.completedAt) {
                        const hour = new Date(task.completedAt).getHours();
                        if (hour >= 22) count++;
                    }
                }
            }
        }
        return count >= 10;
    }
};

// --- Rozet ve seviye kontrol fonksiyonu ---
async function checkAndAwardBadges(userId: string, profile: any, stats: any, planData: any) {
    const gamificationRef = db.doc(`users/${userId}/gamification`);
    const gamSnap = await gamificationRef.get();
    let badges: string[] = (gamSnap.exists && gamSnap.data().badges) ? gamSnap.data().badges : [];
    let newBadges: string[] = [];
    for (const badge in BADGE_CRITERIA) {
        if (!badges.includes(badge) && BADGE_CRITERIA[badge](profile, stats, planData)) {
            badges.push(badge);
            newBadges.push(badge);
        }
    }
    if (newBadges.length > 0) {
        await gamificationRef.set({ badges }, { merge: true });
    }
    return newBadges;
}

/**
 * Kullanıcının planla etkileşimini yöneten merkezi fonksiyon.
 * actionType: 'TASK_COMPLETED' | 'DAY_SKIPPED' | 'TOPIC_FEEDBACK' | 'SOS_BUTTON_PRESSED'
 * payload: ilgili aksiyonun parametreleri
 */
export const handleUserAction = onCall({ timeoutSeconds: 60 }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    const userId = request.auth.uid;
    const { actionType, payload } = request.data || {};
    if (!actionType || !payload) {
        throw new HttpsError('invalid-argument', 'actionType ve payload zorunludur.');
    }

    // Plan referansı
    const userPlanRef = db.doc(`users/${userId}/plan/user_plan`);
    const planSnap = await userPlanRef.get();
    if (!planSnap.exists) {
        throw new HttpsError('not-found', 'Kullanıcıya ait plan bulunamadı.');
    }
    const planData = planSnap.data();

    // Profil referansı
    const privateProfileRef = db.doc(`users/${userId}/privateProfile/profile`);
    const privateProfileSnap = await privateProfileRef.get();
    if (!privateProfileSnap.exists) {
        throw new HttpsError('not-found', 'Kullanıcı profili bulunamadı.');
    }
    const profile = privateProfileSnap.data();

    // Gamification referansı
    const gamificationRef = db.doc(`users/${userId}/gamification`);
    let gamificationSnap = await gamificationRef.get();
    let gamification = gamificationSnap.exists ? gamificationSnap.data() : { xp: 0, level: 1, streak: 0, badges: [] };

    // AI motoru
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    if (actionType === 'TASK_COMPLETED') {
        // payload: { weekIndex, dayIndex, taskIndex, sessionIndex }
        const { weekIndex, dayIndex, taskIndex, sessionIndex } = payload;
        if (
            planData &&
            planData.weeks &&
            planData.weeks[weekIndex] &&
            planData.weeks[weekIndex].days[dayIndex] &&
            planData.weeks[weekIndex].days[dayIndex].dailyTasks[taskIndex]
        ) {
            // Pomodoro oturumu varsa onu işaretle, yoksa tüm görevi tamamla
            if (typeof sessionIndex === 'number' && planData.weeks[weekIndex].days[dayIndex].dailyTasks[taskIndex].pomodoroSessions) {
                planData.weeks[weekIndex].days[dayIndex].dailyTasks[taskIndex].pomodoroSessions[sessionIndex].isCompleted = true;
            } else {
                planData.weeks[weekIndex].days[dayIndex].dailyTasks[taskIndex].isCompleted = true;
            }
            // --- Oyunlaştırma ---
            // XP hesapla (görev zorluğuna göre)
            let xpToAdd = 10;
            const task = planData.weeks[weekIndex].days[dayIndex].dailyTasks[taskIndex];
            if (task.zorluk === 'high') xpToAdd = 50;
            else if (task.zorluk === 'medium') xpToAdd = 25;
            // XP ekle
            gamification.xp += xpToAdd;
            // Seviye hesapla (ör: her 500 XP'de bir seviye)
            const newLevel = Math.floor(gamification.xp / 500) + 1;
            if (newLevel > gamification.level) {
                gamification.level = newLevel;
            }
            // Streak güncelle (bugün çalıştıysa artır, yoksa sıfırla)
            const today = new Date().toISOString().split('T')[0];
            if (!gamification.lastCompletedDate || gamification.lastCompletedDate !== today) {
                if (gamification.lastCompletedDate) {
                    // Son tamamlanan gün ile bugün arasında 1 gün fark varsa streak artır
                    const last = new Date(gamification.lastCompletedDate);
                    const now = new Date(today);
                    const diff = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
                    if (diff === 1) gamification.streak++;
                    else gamification.streak = 1;
                } else {
                    gamification.streak = 1;
                }
                gamification.lastCompletedDate = today;
            }
            // Görev tamamlanma saatini kaydet (gece kuşu için)
            if (task) {
                task.completedAt = new Date().toISOString();
            }
            // Rozet kontrolü
            const newBadges = await checkAndAwardBadges(userId, profile, gamification, planData);
            // Firestore'a kaydet
            await gamificationRef.set({
                xp: gamification.xp,
                level: gamification.level,
                streak: gamification.streak,
                badges: gamification.badges,
                lastCompletedDate: gamification.lastCompletedDate
            }, { merge: true });
            await userPlanRef.set(planData, { merge: true });
            return { success: true, message: 'Görev tamamlandı ve oyunlaştırma güncellendi.', xp: gamification.xp, level: gamification.level, streak: gamification.streak, newBadges };
        } else {
            throw new HttpsError('invalid-argument', 'Geçersiz görev indeksi.');
        }
    }

    if (actionType === 'DAY_SKIPPED') {
        // payload: { date: 'YYYY-MM-DD' }
        const { date } = payload;
        if (!date) {
            throw new HttpsError('invalid-argument', 'date parametresi zorunludur.');
        }

        // Atlanan günü bul
        let skippedDay = null;
        let skippedWeekIndex = -1;
        let skippedDayIndex = -1;
        let found = false;

        // Planı dolaşarak belirtilen tarihi bul
        for (let weekIndex = 0; weekIndex < planData.weeks.length; weekIndex++) {
            const week = planData.weeks[weekIndex];
            for (let dayIndex = 0; dayIndex < week.days.length; dayIndex++) {
                const day = week.days[dayIndex];
                if (day.date === date) {
                    skippedDay = day;
                    skippedWeekIndex = weekIndex;
                    skippedDayIndex = dayIndex;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (!found) {
            throw new HttpsError('not-found', 'Belirtilen tarih planda bulunamadı.');
        }

        // Dinlenme günü ise işlem yapma
        if (skippedDay.isRestDay) {
            return { success: true, message: 'Bu zaten bir dinlenme günü, görev yok.' };
        }

        // Atlanan gündeki görevleri topla
        const skippedTasks = skippedDay.dailyTasks || [];
        if (skippedTasks.length === 0) {
            return { success: true, message: 'Bu günde görev bulunmuyor.' };
        }

        // Tamamlanmamış görevleri filtrele
        const incompleteTasks = skippedTasks.filter(task => !task.isCompleted);
        if (incompleteTasks.length === 0) {
            return { success: true, message: 'Bu günün tüm görevleri zaten tamamlanmış.' };
        }

        // AI'a mikro-istek göndererek görevleri yeniden dağıt
        const redistributePrompt = `
Sen bir eğitim koçusun. Bir öğrenci ${date} tarihindeki çalışma gününü atlamak zorunda kaldı.
Bu günde tamamlanmamış ${incompleteTasks.length} görev var. Bu görevleri, planın geri kalanındaki uygun günlere yeniden dağıtman gerekiyor.

ATLANMIŞ GÖREVLER:
${JSON.stringify(incompleteTasks.map(t => ({ subject: t.subject, topic: t.topic, duration: t.durationInMinutes || 30 })))}

MEVCUT PLAN:
${JSON.stringify(planData.weeks.map(w => ({
            weekNumber: w.weekNumber,
            days: w.days.map(d => ({
                date: d.date,
                day: d.day,
                isRestDay: d.isRestDay,
                taskCount: (d.dailyTasks || []).length,
                remainingMinutes: profile.dailyHours * 60 - (d.dailyTasks || []).reduce((acc, t) => acc + (t.durationInMinutes || 30), 0)
            }))
        })))}

KURALLAR:
1. Sadece çalışma günlerine görev ekle (isRestDay: false olan günler)
2. Hiçbir günün toplam görev süresi ${profile.dailyHours} saati (${profile.dailyHours * 60} dakikayı) geçmemeli
3. Mümkünse görevleri aynı derslerin olduğu günlere ekle
4. Görevleri en yakın günlerden başlayarak dağıt, ama hiçbir günü aşırı yükleme

Cevabın aşağıdaki formatta JSON olmalı:
{
  "taskDistribution": [
    {
      "taskIndex": 0, // Atlanmış görevler dizisindeki indeks
      "targetWeekIndex": 2, // Hedef hafta indeksi
      "targetDayIndex": 3, // Hedef gün indeksi
      "reason": "Bu görev için en uygun gün, çünkü..." // Kısa açıklama
    }
  ]
}
`;

        try {
            const redistributeResult = await model.generateContent(redistributePrompt);
            const cleanedResponse = redistributeResult.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
            const redistribution = JSON.parse(cleanedResponse);

            if (!redistribution.taskDistribution || !Array.isArray(redistribution.taskDistribution)) {
                throw new Error('Geçersiz AI yanıtı: taskDistribution dizisi bulunamadı.');
            }

            // Görevleri yeniden dağıt
            for (const move of redistribution.taskDistribution) {
                const taskToMove = incompleteTasks[move.taskIndex];
                if (taskToMove) {
                    // Hedef günü kontrol et ve görev ekle
                    if (
                        planData.weeks[move.targetWeekIndex] &&
                        planData.weeks[move.targetWeekIndex].days[move.targetDayIndex]
                    ) {
                        const targetDay = planData.weeks[move.targetWeekIndex].days[move.targetDayIndex];
                        if (!targetDay.dailyTasks) {
                            targetDay.dailyTasks = [];
                        }
                        
                        // Görev başlığını güncelle (yeniden planlandığını belirt)
                        const updatedTask = {
                            ...taskToMove,
                            mainTaskTitle: `${taskToMove.mainTaskTitle || taskToMove.topic} (Yeniden Planlandı)`,
                            isRescheduled: true,
                            originalDate: date
                        };
                        
                        targetDay.dailyTasks.push(updatedTask);
                    }
                }
            }

            // Atlanan günü dinlenme günü olarak işaretle
            planData.weeks[skippedWeekIndex].days[skippedDayIndex].isRestDay = true;
            planData.weeks[skippedWeekIndex].days[skippedDayIndex].skippedDay = true;
            planData.weeks[skippedWeekIndex].days[skippedDayIndex].dailyTasks = [];

            // Planı güncelle
            await userPlanRef.set(planData, { merge: true });
            return { 
                success: true, 
                message: 'Gün atlandı ve görevler yeniden dağıtıldı.',
                redistribution: redistribution.taskDistribution 
            };
        } catch (error: any) {
            console.error('Görevleri yeniden dağıtırken hata:', error);
            throw new HttpsError('internal', `Görevleri yeniden dağıtırken hata: ${error.message}`);
        }
    }

    if (actionType === 'TOPIC_FEEDBACK') {
        // payload: { topic: 'Türev', feedback: 'difficult'|'easy' }
        const { topic, feedback } = payload;
        if (!topic || !feedback) {
            throw new HttpsError('invalid-argument', 'topic ve feedback zorunludur.');
        }
        
        // Konuya ait dersi bul
        let relatedSubject = null;
        for (const ders in profile.confidenceLevels) {
            if (topic.toLowerCase().includes(ders.toLowerCase())) {
                relatedSubject = ders;
                break;
            }
        }
        
        if (relatedSubject) {
            // confidenceLevels güncelle
            let newLevel = profile.confidenceLevels[relatedSubject];
            if (feedback === 'difficult') {
                if (newLevel === 'high') newLevel = 'medium';
                else if (newLevel === 'medium') newLevel = 'low';
            } else if (feedback === 'easy') {
                if (newLevel === 'low') newLevel = 'medium';
                else if (newLevel === 'medium') newLevel = 'high';
            }
            profile.confidenceLevels[relatedSubject] = newLevel;
            await privateProfileRef.set({ confidenceLevels: profile.confidenceLevels }, { merge: true });
        }

        // Gelecek haftaya eklenecek görev için AI'a istek gönder
        const topicPrompt = `
Sen bir eğitim koçusun. Bir öğrenci "${topic}" konusunu ${feedback === 'difficult' ? 'zor' : 'kolay'} bulduğunu belirtti.

${feedback === 'difficult' ? 
`Öğrencinin bu konuyu daha iyi anlaması için, konuyu pekiştirecek bir görev tasarla. Bu görev:
1. Temel kavramları daha basit şekilde açıklamalı
2. Adım adım çözümlü örnekler içermeli
3. Görsel ve somut öğrenme materyalleri içermeli` 
: 
`Öğrenci bu konuyu kolay bulduğu için, bir sonraki seviyeye geçmesini sağlayacak daha zorlayıcı bir görev tasarla. Bu görev:
1. Daha ileri seviye kavramları içermeli
2. Analitik düşünme gerektiren problemler içermeli
3. Konuyu farklı alanlara uygulama fırsatı vermeli`}

Cevabın aşağıdaki formatta JSON olmalı:
{
  "subject": "${relatedSubject || topic.split(' ')[0]}",
  "topic": "${topic}",
  "mainTaskTitle": "${feedback === 'difficult' ? 'Pekiştirme' : 'İleri Seviye'} Çalışması: ${topic}",
  "description": "Görev açıklaması",
  "durationInMinutes": 45,
  "pomodoroSessions": [
    { 
      "type": "study", 
      "description": "Detaylı görev açıklaması", 
      "durationInMinutes": 25, 
      "isCompleted": false 
    },
    { 
      "type": "break", 
      "description": "Kısa Mola", 
      "durationInMinutes": 5, 
      "isBreak": true, 
      "isCompleted": false 
    },
    { 
      "type": "practice", 
      "description": "Uygulama", 
      "durationInMinutes": 15, 
      "isCompleted": false 
    }
  ],
  "resource": { 
    "type": "video", 
    "title": "Önerilen Kaynak", 
    "url": "https://example.com" 
  }
}
`;

        try {
            const topicResult = await model.generateContent(topicPrompt);
            const cleanedResponse = topicResult.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
            const newTask = JSON.parse(cleanedResponse);

            // Planın son haftasını bul
            const currentWeek = new Date().getDay();
            let targetWeekIndex = -1;
            let targetDayIndex = -1;

            // Önce mevcut haftayı bul
            for (let i = 0; i < planData.weeks.length; i++) {
                const week = planData.weeks[i];
                for (let j = 0; j < week.days.length; j++) {
                    const day = week.days[j];
                    const dayDate = new Date(day.date);
                    if (dayDate > new Date() && !day.isRestDay) {
                        // Gelecekteki ilk uygun günü bul
                        if (targetWeekIndex === -1) {
                            targetWeekIndex = i;
                            targetDayIndex = j;
                            break;
                        }
                    }
                }
                if (targetWeekIndex !== -1) break;
            }

            // Uygun gün bulunamadıysa son haftanın ilk çalışma gününü kullan
            if (targetWeekIndex === -1) {
                targetWeekIndex = planData.weeks.length - 1;
                for (let j = 0; j < planData.weeks[targetWeekIndex].days.length; j++) {
                    if (!planData.weeks[targetWeekIndex].days[j].isRestDay) {
                        targetDayIndex = j;
                        break;
                    }
                }
            }

            // Hedef günü kontrol et ve görev ekle
            if (
                targetWeekIndex >= 0 &&
                targetDayIndex >= 0 &&
                planData.weeks[targetWeekIndex] &&
                planData.weeks[targetWeekIndex].days[targetDayIndex]
            ) {
                const targetDay = planData.weeks[targetWeekIndex].days[targetDayIndex];
                if (!targetDay.dailyTasks) {
                    targetDay.dailyTasks = [];
                }

                // Geri bildirime göre görev ekle
                const adaptiveTask = {
                    ...newTask,
                    isAdaptive: true,
                    adaptiveReason: feedback === 'difficult' ? 'pekiştirme' : 'ilerleme',
                    addedAt: new Date().toISOString()
                };

                targetDay.dailyTasks.push(adaptiveTask);

                // Planı güncelle
                await userPlanRef.set(planData, { merge: true });
                return {
                    success: true,
                    message: `Konu geri bildirimi kaydedildi ve ${feedback === 'difficult' ? 'pekiştirici' : 'ilerletici'} görev eklendi.`,
                    newTask: adaptiveTask,
                    targetDate: targetDay.date
                };
            } else {
                throw new HttpsError('not-found', 'Görev eklenecek uygun gün bulunamadı.');
            }
        } catch (error: any) {
            console.error('Konu geri bildirimi işlenirken hata:', error);
            throw new HttpsError('internal', `Konu geri bildirimi işlenirken hata: ${error.message}`);
        }
    }

    if (actionType === 'SOS_BUTTON_PRESSED') {
        // payload: { imageUrl: 'https://...', questionText: '...' }
        const { imageUrl, questionText } = payload;
        
        if (!questionText && !imageUrl) {
            throw new HttpsError('invalid-argument', 'En az bir tanesi (imageUrl veya questionText) gereklidir.');
        }

        // Görüntü varsa OCR ile metne çevir
        let extractedText = '';
        if (imageUrl) {
            try {
                // Google Cloud Vision API ile OCR
                const vision = require('@google-cloud/vision');
                const client = new vision.ImageAnnotatorClient();
                
                const [result] = await client.textDetection(imageUrl);
                const detections = result.textAnnotations;
                if (detections && detections.length > 0) {
                    extractedText = detections[0].description;
                }
            } catch (error: any) {
                console.error('OCR işlemi sırasında hata:', error);
                // OCR başarısız olsa bile devam et, kullanıcının girdiği metin varsa onu kullan
            }
        }

        // AI'a çözüm için istek gönder
        const sosPrompt = `
Sen bir eğitim koçusun. Bir öğrenci aşağıdaki soruyu çözmekte zorlanıyor ve yardım istiyor:

${questionText || ''}

${extractedText ? `OCR ile tespit edilen metin: ${extractedText}` : ''}

Lütfen bu sorunun çözümünü aşağıdaki formatta adım adım açıkla:

1. Önce soruyu analiz et ve ne sorulduğunu netleştir.
2. Çözüm için gerekli formül, kural veya kavramları belirt.
3. Çözümü adım adım göster, her adımın mantığını açıkla.
4. Sonucu net bir şekilde belirt.
5. Öğrencinin benzer soruları çözebilmesi için bir ipucu ver.

Cevabın aşağıdaki formatta JSON olmalı:
{
  "analysis": "Sorunun analizi...",
  "conceptsNeeded": ["Gerekli kavram 1", "Gerekli kavram 2"],
  "steps": [
    {
      "step": 1,
      "explanation": "İlk adım açıklaması",
      "formula": "Kullanılan formül (varsa)"
    },
    {
      "step": 2,
      "explanation": "İkinci adım açıklaması"
    }
  ],
  "result": "Sonuç",
  "tip": "Benzer sorular için ipucu"
}
`;

        try {
            const sosResult = await model.generateContent(sosPrompt);
            const cleanedResponse = sosResult.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
            const solution = JSON.parse(cleanedResponse);

            // Çözümü kullanıcı geçmişine kaydet
            const userSosRef = db.collection(`users/${userId}/sos_history`).doc();
            await userSosRef.set({
                question: questionText || extractedText,
                imageUrl: imageUrl || null,
                solution: solution,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // Gamification - SOS kullanımı için XP ekle
            gamification.xp += 5;
            await gamificationRef.set({
                xp: gamification.xp
            }, { merge: true });

            return {
                success: true,
                message: 'SOS çözümü hazırlandı.',
                solution: solution,
                xp: gamification.xp
            };
        } catch (error: any) {
            console.error('SOS çözümü oluşturulurken hata:', error);
            throw new HttpsError('internal', `SOS çözümü oluşturulurken hata: ${error.message}`);
        }
    }

    throw new HttpsError('invalid-argument', 'Bilinmeyen actionType.');
});

// Tatil durumunu kontrol eden fonksiyon
export const checkHolidayStatus = onCall((request) => {
    return checkCurrentHolidayStatus();
});

// Deneme sınavı analizi ve konu bağlantıları için Cloud Functions

/**
 * Deneme sınavı sonucunu analiz eder ve içgörüler oluşturur
 */
export const analyzeExamResult = onCall({ timeoutSeconds: 60 }, async (request) => {
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
        
        // Analiz sonuçlarını Firestore'a kaydet
        await db.doc(`users/${userId}/mock_exams/${examId}/analysis/result`).set({
            ...analysis,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        return {
            success: true,
            message: 'Deneme sınavı analizi başarıyla oluşturuldu.',
            analysis,
        };
    } catch (e: any) {
        console.error('Deneme sınavı analizi hatası:', e);
        throw new HttpsError('internal', `Deneme sınavı analizi yapılamadı: ${e.message}`);
    }
});

/**
 * Son deneme sınavı sonuçlarını analiz eder ve zayıf alanları belirler
 */
export const analyzeRecentExams = onCall({ timeoutSeconds: 60 }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { examCount = 3 } = request.data || {};
    
    try {
        // Son deneme sınavı sonuçlarını getir
        const examsSnapshot = await db
            .collection(`users/${userId}/mock_exams`)
            .orderBy('examDate', 'desc')
            .limit(examCount)
            .get();
        
        if (examsSnapshot.empty) {
            return {
                weakAreas: [],
                strongAreas: [],
                recommendations: [],
                message: 'Henüz deneme sınavı sonucu bulunmuyor.',
            };
        }
        
        const exams = examsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // AI'a analiz için istek gönder
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const analysisPrompt = `
Sen bir eğitim koçusun. Aşağıdaki son ${examCount} deneme sınavı sonucunu analiz et ve öğrencinin güçlü ve zayıf alanlarını belirle.

DENEME SINAVI SONUÇLARI:
${JSON.stringify(exams)}

Lütfen aşağıdaki formatta bir JSON nesnesi döndür:

{
  "weakAreas": [
    {
      "subject": "Ders adı",
      "topic": "Konu adı",
      "successRate": 25.5, // Başarı oranı (yüzde)
      "reason": "Bu konunun zayıf olma nedeni"
    }
  ],
  "strongAreas": [
    {
      "subject": "Ders adı",
      "topic": "Konu adı",
      "successRate": 85.5, // Başarı oranı (yüzde)
      "reason": "Bu konunun güçlü olma nedeni"
    }
  ],
  "recommendations": [
    {
      "title": "Öneri başlığı",
      "description": "Detaylı açıklama",
      "priority": "high" // "high", "medium", "low"
    }
  ],
  "trends": {
    "overall": "increasing", // "increasing", "decreasing", "stable"
    "subjects": {
      "Matematik": "decreasing",
      "Fizik": "increasing"
    }
  }
}
`;
        
        const analysisResult = await model.generateContent(analysisPrompt);
        const cleanedResponse = analysisResult.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
        const analysis = JSON.parse(cleanedResponse);
        
        // Analiz sonuçlarını Firestore'a kaydet
        await db.doc(`users/${userId}/performance/recent_analysis`).set({
            ...analysis,
            examCount,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        return {
            ...analysis,
            success: true,
            message: 'Son deneme sınavları analizi başarıyla oluşturuldu.',
        };
    } catch (e: any) {
        console.error('Son deneme sınavları analizi hatası:', e);
        throw new HttpsError('internal', `Son deneme sınavları analizi yapılamadı: ${e.message}`);
    }
});

/**
 * Konu haritası oluşturur
 */
export const generateTopicMap = onCall({ timeoutSeconds: 60 }, async (request) => {
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
export const generateTopicConnection = onCall({ timeoutSeconds: 60 }, async (request) => {
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
 * Metin veya URL'den YKS formatında özet oluşturur
 */
export const generateSummary = onCall({ timeoutSeconds: 120 }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const { text, url } = request.data || {};
    if (!text && !url) {
        throw new HttpsError('invalid-argument', 'text veya url parametrelerinden en az biri zorunludur.');
    }

    try {
        // AI motoru
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let contentToSummarize = text || '';
        
        // URL varsa içeriği çek
        if (url && !text) {
            // URL'den içerik çekme işlemi burada yapılacak
            // Bu örnekte basit bir placeholder kullanıyoruz
            contentToSummarize = `URL içeriği: ${url}`;
        }

        const summaryPrompt = `
Sen bir YKS eğitim uzmanısın. Aşağıdaki metni YKS sınavına hazırlanan öğrenciler için özetlemen gerekiyor.

Metin:
${contentToSummarize}

Lütfen bu metni aşağıdaki formatta özetle:
1. Ana Kavramlar: Metindeki temel kavramları liste halinde ver.
2. Özet: Metni kısa ve öz bir şekilde özetle (maksimum 250 kelime).
3. Formüller ve Kurallar: Varsa, metinde geçen önemli formülleri ve kuralları listele.
4. Örnek Sorular: Bu konuyla ilgili YKS'de çıkabilecek 2 örnek soru oluştur.

Özetin YKS formatında, anlaşılır ve akılda kalıcı olmasına dikkat et. Gereksiz detayları çıkar, önemli noktalara odaklan.
`;

        const summaryResult = await model.generateContent(summaryPrompt);
        const summary = summaryResult.response.text();

        // Kullanıcının özet geçmişine kaydet
        const userId = request.auth.uid;
        const summaryRef = db.collection(`users/${userId}/summaries`).doc();
        await summaryRef.set({
            originalText: text || null,
            originalUrl: url || null,
            summary: summary,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return { 
            success: true, 
            summary: summary 
        };
    } catch (error: any) {
        console.error('Özet oluşturulurken hata:', error);
        throw new HttpsError('internal', `Özet oluşturulurken hata: ${error.message}`);
    }
});

/**
 * Ders ve konu bilgisine göre kavram haritası oluşturur
 */
export const generateConceptMap = onCall({ timeoutSeconds: 120 }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const { subject, topic } = request.data || {};
    if (!subject) {
        throw new HttpsError('invalid-argument', 'subject parametresi zorunludur.');
    }

    try {
        // AI motoru
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const conceptMapPrompt = `
Sen bir YKS eğitim uzmanısın. ${subject} dersi ${topic ? `ve özellikle "${topic}" konusu` : ''} için bir kavram haritası oluşturman gerekiyor.

Lütfen aşağıdaki JSON formatında bir kavram haritası oluştur:

{
  "subject": "${subject}",
  "topic": "${topic || 'Genel'}",
  "nodes": [
    {
      "id": "string",
      "topic": "string",
      "description": "string",
      "importance": number (0-1 arası)
    }
  ],
  "edges": [
    {
      "id": "string",
      "sourceId": "string",
      "targetId": "string",
      "relationshipType": "prerequisite|followup|related",
      "strength": number (0-1 arası),
      "description": "string"
    }
  ]
}

Kavram haritasının YKS müfredatına uygun olmasına, konular arasındaki ilişkileri doğru yansıtmasına ve öğrencilerin konuyu anlamasını kolaylaştıracak şekilde olmasına dikkat et.

Lütfen sadece JSON formatında yanıt ver, başka açıklama ekleme.
`;

        const conceptMapResult = await model.generateContent(conceptMapPrompt);
        const cleanedResponse = conceptMapResult.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
        const conceptMap = JSON.parse(cleanedResponse);

        // Kullanıcının kavram haritası geçmişine kaydet
        const userId = request.auth.uid;
        const conceptMapRef = db.collection(`users/${userId}/concept_maps`).doc();
        await conceptMapRef.set({
            ...conceptMap,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { 
            success: true, 
            ...conceptMap
        };
    } catch (error: any) {
        console.error('Kavram haritası oluşturulurken hata:', error);
        throw new HttpsError('internal', `Kavram haritası oluşturulurken hata: ${error.message}`);
    }
});

/**
 * Günlük olarak çalışan, kullanıcılara proaktif motivasyon mesajları gönderen fonksiyon
 */
export const sendProactiveMotivation = functions.scheduler.onSchedule(
  { 
    schedule: 'every 24 hours',
    timeZone: 'Europe/Istanbul'
  }, 
  async (event) => {
    try {
        // Tüm kullanıcıları al
        const usersSnapshot = await db.collection('users').get();
        
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            
            // Kullanıcının plan ve gamification verilerini al
            const userPlanSnap = await db.doc(`users/${userId}/plan/user_plan`).get();
            const gamificationSnap = await db.doc(`users/${userId}/gamification/data`).get();
            
            if (!userPlanSnap.exists || !gamificationSnap.exists) {
                continue; // Kullanıcının planı veya oyunlaştırma verisi yoksa atla
            }
            
            const planData = userPlanSnap.data();
            const gamification = gamificationSnap.data();
            
            // Motivasyon mesajı türünü belirle
            let motivationType = '';
            let motivationMessage = '';
            
            // 1. Son 2 gündür plan takip edilmemiş mi?
            const today = new Date();
            const twoDaysAgo = new Date(today);
            twoDaysAgo.setDate(today.getDate() - 2);
            
            const lastCompletedDate = gamification?.lastCompletedDate ? new Date(gamification.lastCompletedDate) : null;
            
            if (!lastCompletedDate || lastCompletedDate < twoDaysAgo) {
                motivationType = 'INACTIVE';
                motivationMessage = 'Son zamanlarda seni görmedik! Planına geri dönmek için bugün küçük bir adım at.';
            }
            // 2. Streak kaybedilmiş mi?
            else if (gamification?.streak === 0 && lastCompletedDate) {
                motivationType = 'LOST_STREAK';
                motivationMessage = 'Çalışma serini kaybettin! Hemen bugün çalışmaya başlayarak yeni bir seri başlatabilirsin.';
            }
            // 3. Belirli bir derste sürekli zorluk yaşanıyor mu?
            else {
                // Kullanıcının özel profilini al
                const privateProfileSnap = await db.doc(`users/${userId}/privateProfile/profile`).get();
                
                if (privateProfileSnap.exists) {
                    const profile = privateProfileSnap.data();
                    const confidenceLevels = profile?.confidenceLevels || {};
                    
                    // Güven seviyesi düşük olan dersleri bul
                    const lowConfidenceSubjects = Object.entries(confidenceLevels)
                        .filter(([_, level]) => level === 'low')
                        .map(([subject, _]) => subject);
                    
                    if (lowConfidenceSubjects.length > 0) {
                        motivationType = 'LOW_CONFIDENCE';
                        const subject = lowConfidenceSubjects[0];
                        motivationMessage = `${subject} dersinde zorlanıyor gibisin. Ekstra destek için SOS butonunu kullanabilir veya farklı çalışma teknikleri deneyebilirsin.`;
                    }
                }
            }
            
            // Motivasyon mesajı belirlendiyse bildirim gönder
            if (motivationType && motivationMessage) {
                // FCM token'ı al
                const fcmTokenSnap = await db.doc(`users/${userId}/devices/fcmToken`).get();
                const fcmToken = fcmTokenSnap.exists ? fcmTokenSnap.data()?.token : null;
                
                if (fcmToken) {
                    await admin.messaging().send({
                        token: fcmToken,
                        notification: {
                            title: 'OKUZ AI - Motivasyon Zamanı',
                            body: motivationMessage
                        },
                        data: {
                            type: 'MOTIVATION',
                            motivationType: motivationType
                        }
                    });
                    
                    // Bildirim geçmişine kaydet
                    await db.collection(`users/${userId}/notifications`).add({
                        type: 'MOTIVATION',
                        motivationType: motivationType,
                        message: motivationMessage,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        isRead: false
                    });
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Proaktif motivasyon mesajları gönderilirken hata:', error);
        return null;
    }
});

/**
 * Kullanıcının başarımlarını kontrol eden ve güncelleyen fonksiyon
 */
export const checkAchievements = onCall({ timeoutSeconds: 60 }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    
    try {
        // Kullanıcının oyunlaştırma verilerini al
        const gamificationRef = db.doc(`users/${userId}/gamification/data`);
        const gamificationSnap = await gamificationRef.get();
        
        if (!gamificationSnap.exists) {
            throw new HttpsError('not-found', 'Kullanıcının oyunlaştırma verisi bulunamadı.');
        }
        
        const gamification = gamificationSnap.data();
        
        // Kullanıcının plan verilerini al
        const userPlanRef = db.doc(`users/${userId}/plan/user_plan`);
        const planSnap = await userPlanRef.get();
        
        if (!planSnap.exists) {
            throw new HttpsError('not-found', 'Kullanıcıya ait plan bulunamadı.');
        }
        
        const planData = planSnap.data();
        
        // Kullanıcının profil verilerini al
        const privateProfileRef = db.doc(`users/${userId}/privateProfile/profile`);
        const privateProfileSnap = await privateProfileRef.get();
        
        if (!privateProfileSnap.exists) {
            throw new HttpsError('not-found', 'Kullanıcı profili bulunamadı.');
        }
        
        const profile = privateProfileSnap.data();
        
        // Başarımları kontrol et
        const achievements = gamification.achievements || [];
        const completedAchievements = [];
        const updatedAchievements = [...achievements];
        
        // Başarım tanımları
        const achievementDefinitions = [
            {
                id: 'streak_7_days',
                name: '7 Gün Serisi',
                description: '7 gün aralıksız çalışma',
                type: 'streak',
                checkCondition: () => gamification.streak >= 7,
                progress: gamification.streak,
                target: 7,
                xpReward: 100,
                badgeId: 'hafta1_fatihi'
            },
            {
                id: 'streak_30_days',
                name: '30 Gün Serisi',
                description: '30 gün aralıksız çalışma',
                type: 'streak',
                checkCondition: () => gamification.streak >= 30,
                progress: gamification.streak,
                target: 30,
                xpReward: 500,
                badgeId: 'ay1_fatihi'
            },
            {
                id: 'complete_100_tasks',
                name: '100 Görev',
                description: '100 görev tamamla',
                type: 'task',
                checkCondition: () => {
                    // Tamamlanan görev sayısını hesapla
                    let completedTaskCount = 0;
                    for (const week of (planData.weeks || [])) {
                        for (const day of (week.days || [])) {
                            for (const task of (day.dailyTasks || [])) {
                                if (task.isCompleted) {
                                    completedTaskCount++;
                                }
                            }
                        }
                    }
                    return completedTaskCount >= 100;
                },
                progress: (() => {
                    let completedTaskCount = 0;
                    for (const week of (planData.weeks || [])) {
                        for (const day of (week.days || [])) {
                            for (const task of (day.dailyTasks || [])) {
                                if (task.isCompleted) {
                                    completedTaskCount++;
                                }
                            }
                        }
                    }
                    return completedTaskCount;
                })(),
                target: 100,
                xpReward: 200,
                badgeId: 'gorev_ustasi'
            }
        ];
        
        // Her başarım tanımı için kontrol et
        for (const definition of achievementDefinitions) {
            // Mevcut başarım var mı kontrol et
            const existingAchievementIndex = updatedAchievements.findIndex(a => a.id === definition.id);
            
            if (existingAchievementIndex !== -1) {
                // Başarım zaten var, güncelle
                const existingAchievement = updatedAchievements[existingAchievementIndex];
                
                if (!existingAchievement.isCompleted) {
                    // Tamamlanmamış başarımı güncelle
                    const updatedAchievement = {
                        ...existingAchievement,
                        progress: definition.progress,
                    };
                    
                    // Koşul sağlanıyorsa tamamla
                    if (definition.checkCondition()) {
                        updatedAchievement.isCompleted = true;
                        updatedAchievement.completedAt = admin.firestore.FieldValue.serverTimestamp();
                        completedAchievements.push(updatedAchievement);
                        
                        // XP ekle
                        gamification.xp += definition.xpReward;
                        
                        // Rozet ekle
                        if (definition.badgeId && !gamification.badges.some(b => b.id === definition.badgeId)) {
                            // Rozet bilgilerini al
                            const badgeRef = db.doc(`badges/${definition.badgeId}`);
                            const badgeSnap = await badgeRef.get();
                            
                            if (badgeSnap.exists) {
                                const badgeData = badgeSnap.data();
                                gamification.badges.push({
                                    id: definition.badgeId,
                                    ...badgeData,
                                    awardedAt: admin.firestore.FieldValue.serverTimestamp()
                                });
                            }
                        }
                    }
                    
                    updatedAchievements[existingAchievementIndex] = updatedAchievement;
                }
            } else {
                // Başarım yoksa ekle
                const newAchievement = {
                    id: definition.id,
                    name: definition.name,
                    description: definition.description,
                    type: definition.type,
                    progress: definition.progress,
                    target: definition.target,
                    isCompleted: false,
                    xpReward: definition.xpReward,
                    badgeId: definition.badgeId,
                    completedAt: null, // Tamamlanmadığı için null
                };
                
                // Koşul sağlanıyorsa tamamla
                if (definition.checkCondition()) {
                    newAchievement.isCompleted = true;
                    newAchievement.completedAt = admin.firestore.FieldValue.serverTimestamp();
                    completedAchievements.push(newAchievement);
                    
                    // XP ekle
                    gamification.xp += definition.xpReward;
                    
                    // Rozet ekle
                    if (definition.badgeId && !gamification.badges.some(b => b.id === definition.badgeId)) {
                        // Rozet bilgilerini al
                        const badgeRef = db.doc(`badges/${definition.badgeId}`);
                        const badgeSnap = await badgeRef.get();
                        
                        if (badgeSnap.exists) {
                            const badgeData = badgeSnap.data();
                            gamification.badges.push({
                                id: definition.badgeId,
                                ...badgeData,
                                awardedAt: admin.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    }
                }
                
                updatedAchievements.push(newAchievement);
            }
        }
        
        // Seviye kontrolü
        const newLevel = Math.floor(gamification.xp / 500) + 1;
        if (newLevel > gamification.level) {
            gamification.level = newLevel;
        }
        
        // Firestore'a kaydet
        await gamificationRef.set({
            ...gamification,
            achievements: updatedAchievements
        }, { merge: true });
        
        return {
            success: true,
            completedAchievements,
            xp: gamification.xp,
            level: gamification.level,
            badges: gamification.badges
        };
    } catch (error: any) {
        console.error('Başarımlar kontrol edilirken hata:', error);
        throw new HttpsError('internal', `Başarımlar kontrol edilirken hata: ${error.message}`);
    }
});