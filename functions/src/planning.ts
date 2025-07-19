// src/planning.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from 'firebase-admin';
import { db, getGenAI, checkCurrentHolidayStatus } from './utils';
import { ClassData, TopicPoolItem, PlanGenerationQueueItem } from './types';
import { ACADEMIC_TRACK_SUBJECTS } from './config';
import curriculumData from './maarif_modeli_data.json';

// 🚀 AKILLI MVP STRATEJISI: Resource Optimizasyonu
// Ultra hafif - Basit kontrol ve okuma işlemleri
const ultraLightOptions = {
  memory: "128MiB" as const,
  timeoutSeconds: 30,
  concurrency: 25,
  minInstances: 0,
  maxInstances: 3
};

// Hafif - Orta seviye mantık
// Kullanılmayan lightOptions kaldırıldı

// Orta - Karmaşık hesaplamalar
const mediumOptions = {
  memory: "512MiB" as const,
  timeoutSeconds: 120,
  concurrency: 5,
  minInstances: 0,
  maxInstances: 2
};

// AI Yoğun - Gemini API + karmaşık hesaplamalar
const heavyOptions = {
  memory: "1GiB" as const,
  timeoutSeconds: 300,
  concurrency: 2,
  minInstances: 0,
  maxInstances: 1
};

// Queue İşleyici - Maksimum performans
// Kullanılmayan queueOptions kaldırıldı

/**
 * 🎯 MVP CORE: Frontend için tatil durumunu kontrol eden API
 * ⚡ Zaten optimal: 128MB (Basit status check)
 */
export const checkHolidayStatus = onCall(ultraLightOptions, async (request) => {
    try {
        const holidayStatus = checkCurrentHolidayStatus();
        
        return {
            success: true,
            isHoliday: holidayStatus.isHoliday,
            holidayReason: holidayStatus.reason || null,
            holidayType: holidayStatus.type || null,
            message: holidayStatus.isHoliday 
                ? `Şu anda ${holidayStatus.reason} döneminde` 
                : 'Normal eğitim dönemi'
        };
    } catch (error: any) {
        console.error('Tatil durumu kontrol hatası:', error);
        throw new HttpsError('internal', `Tatil durumu kontrol edilemedi: ${error.message}`);
    }
});

/**
 * Belirtilen sınıf seviyesi için konu havuzunu oluşturan yardımcı fonksiyon.
 * SAVUNMACI PROGRAMLAMA İLE GÜNCELLENMİŞ VERSİYON
 */
export const getTopicPoolForGrade = (
    gradeNumber: string,
    classData: ClassData,
    subjectsToInclude: string[],
    academicTrack: string,
    targetExam?: string
): TopicPoolItem[] => {
    // Unique identifier for debugging - using grade and timestamp
    const documentId = `${gradeNumber}_${Date.now()}`;
    console.log(`İşleniyor: "${documentId}" dökümanı, Sınıf: "${gradeNumber}"`);
    
    const topicPool: TopicPoolItem[] = [];
    
    if (!classData) {
        console.error(`HATA: "${documentId}" dökümanı null veya undefined!`);
        return [];
    }

    // SAVUNMACI KONTROL 1: 'dersler' alanı bir dizi mi?
    if (!Array.isArray(classData.dersler)) {
        console.error(`HATA: "${documentId}" dökümanında 'dersler' alanı bir dizi değil veya tanımsız!`);
        console.error(`classData.dersler değeri:`, classData.dersler);
        console.error(`classData.dersler tipi:`, typeof classData.dersler);
        return []; // Boş dizi döndürerek fonksiyonun çökmesini engelle
    }

    console.log(`"${gradeNumber}" sınıfı için ${classData.dersler.length} ders bulundu.`);
    console.log('Dahil edilecek dersler:', subjectsToInclude);

    classData.dersler.forEach((subject, subjectIndex) => {
        try { // Her bir dersi işlerken hata olabileceğini varsay
            if (!subject || typeof subject !== 'object') {
                console.error(`HATA: "${documentId}" dökümanında, ders index ${subjectIndex} geçersiz:`, subject);
                return; // Bu dersi atla
            }

            if (!subject.dersAdi) {
                console.error(`HATA: "${documentId}" dökümanında, ders index ${subjectIndex} için 'dersAdi' tanımsız:`, subject);
                return; // Bu dersi atla
            }

            console.log(`İnceleniyor: "${subject.dersAdi}" dersi`);
            
            if (subjectsToInclude.length === 0 || subjectsToInclude.includes(subject.dersAdi)) {
                console.log(`"${subject.dersAdi}" dersi dahil ediliyor.`);
                
                // SAVUNMACI KONTROL 2: 'uniteVeTemalar' alanı bir dizi mi?
                if (!Array.isArray(subject.uniteVeTemalar)) {
                    console.error(`HATA: "${documentId}" dökümanında, "${subject.dersAdi}" dersi için 'uniteVeTemalar' alanı bir dizi değil veya tanımsız!`);
                    console.error(`uniteVeTemalar değeri:`, subject.uniteVeTemalar);
                    console.error(`uniteVeTemalar tipi:`, typeof subject.uniteVeTemalar);
                    return; // Bu dersi atla, döngüye devam et
                }

                subject.uniteVeTemalar.forEach((unit, unitIndex) => {
                    try { // Her bir üniteyi işlerken hata olabileceğini varsay
                        if (!unit || typeof unit !== 'object') {
                            console.error(`HATA: "${documentId}" dökümanında, "${subject.dersAdi}" dersi unite index ${unitIndex} geçersiz:`, unit);
                            return; // Bu üniteyi atla
                        }

                        if (!unit.uniteAdi) {
                            console.error(`HATA: "${documentId}" dökümanında, "${subject.dersAdi}" dersi unite index ${unitIndex} için 'uniteAdi' tanımsız:`, unit);
                            return; // Bu üniteyi atla
                        }
                        
                        // SAVUNMACI KONTROL 3: 'konular' alanı bir dizi mi?
                        if (!Array.isArray(unit.konular)) {
                            console.error(`HATA: "${documentId}" dökümanında, "${unit.uniteAdi}" ünitesi için 'konular' alanı bir dizi değil veya tanımsız!`);
                            console.error(`konular değeri:`, unit.konular);
                            console.error(`konular tipi:`, typeof unit.konular);
                            return; // Bu üniteyi atla
                        }

                        console.log(`  Unite: "${unit.uniteAdi}" - ${unit.konular.length} konu`);

                        unit.konular.forEach((topic, topicIndex) => {
                            try {
                                if (!topic || typeof topic !== 'object') {
                                    console.error(`HATA: "${documentId}" dökümanında, "${unit.uniteAdi}" ünitesi konu index ${topicIndex} geçersiz:`, topic);
                                    return; // Bu konuyu atla
                                }

                                if (!topic.konuAdi) {
                                    console.error(`HATA: "${documentId}" dökümanında, "${unit.uniteAdi}" ünitesi konu index ${topicIndex} için 'konuAdi' tanımsız:`, topic);
                                    return; // Bu konuyu atla
                                }

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

                            } catch (topicError: any) {
                                console.error(`HATA: "${documentId}" dökümanında, "${unit.uniteAdi}" ünitesi konu index ${topicIndex} işlenirken bir hata oluştu: ${topicError.message}`);
                                console.error('Konu verisi:', topic);
                            }
                        });
                    } catch (unitError: any) {
                        console.error(`HATA: "${documentId}" dökümanında, "${unit.uniteAdi}" ünitesi işlenirken bir hata oluştu: ${unitError.message}`);
                        console.error('Ünite verisi:', unit);
                    }
                });
            } else {
                console.log(`"${subject.dersAdi}" dersi dahil edilmiyor.`);
            }
        } catch (subjectError: any) {
            console.error(`HATA: "${documentId}" dökümanında, ders index ${subjectIndex} işlenirken bir hata oluştu: ${subjectError.message}`);
            console.error('Ders verisi:', subject);
        }
    });
    
    console.log(`"${gradeNumber}" sınıfı için toplamda ${topicPool.length} konu havuza eklendi.`);
    return topicPool;
};

/**
 * Konu havuzunu confidenceLevels ile ağırlıklandıran fonksiyon
 */
export function getTopicPoolForGradeWithConfidence(
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
        
        // trackWeight ile confidenceWeight'i birleştir
        // Eğer bir konu hem akademik alana göre önemliyse (trackWeight yüksek) hem de öğrenci o derste kendine güvenmiyorsa (confidenceWeight yüksek)
        // bu konu en yüksek önceliği almalıdır
        const combinedWeight = confidenceWeight * (topic.trackWeight || 1);
        
        return {
            ...topic,
            confidenceWeight: combinedWeight
        };
    });
}

/**
 * AI'dan geçerli JSON alınamadığında mantıklı bir yedek plan oluşturan fonksiyon
 */
export function buildValidJsonStructure(text: string, topicPool: TopicPoolItem[], dailyHours: number): any {
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
}

/**
 * Uzun dönemli çalışma planı oluşturan ana fonksiyon
 * Artık hem tek kullanıcı hem de aile hesabı sistemini destekler
 */
export const generateInitialLongTermPlan = onCall(heavyOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { profileId } = request.data || {}; // Yeni: profileId parametresi

    if (!userId) {
        throw new HttpsError('invalid-argument', 'userId zorunludur.');
    }

    // Hesap tipini ve profil yollarını belirle
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
        throw new HttpsError('not-found', 'Kullanıcı hesabı bulunamadı.');
    }
    
    const userData = userDoc.data();
    const accountType = userData?.accountType || 'single';
    
    let profileDataPath: string;
    let planDataPath: string;
    let performanceAnalyticsPath: string;
    
    if (accountType === 'family') {
        // Aile hesabı modu
        if (!profileId) {
            // profileId belirtilmediyse seçili profili kullan
            const selectedProfileId = userData?.selectedProfileId;
            if (!selectedProfileId) {
                throw new HttpsError('invalid-argument', 'Aile hesabı için profileId belirtilmeli veya selectedProfileId ayarlanmış olmalı.');
            }
            
            profileDataPath = `users/${userId}/studentProfiles/${selectedProfileId}/privateProfile/profile`;
            planDataPath = `users/${userId}/studentProfiles/${selectedProfileId}/plan/user_plan`;
            performanceAnalyticsPath = `users/${userId}/studentProfiles/${selectedProfileId}/performance_analytics/summary`;
        } else {
            // Belirtilen profileId'yi kullan
            profileDataPath = `users/${userId}/studentProfiles/${profileId}/privateProfile/profile`;
            planDataPath = `users/${userId}/studentProfiles/${profileId}/plan/user_plan`;
            performanceAnalyticsPath = `users/${userId}/studentProfiles/${profileId}/performance_analytics/summary`;
        }
        
        console.log(`Aile hesabı modu: Plan profileId=${profileId || userData?.selectedProfileId} için oluşturuluyor`);
    } else {
        // Tek kullanıcı modu (geriye uyumluluk)
        profileDataPath = `users/${userId}/privateProfile/profile`;
        planDataPath = `users/${userId}/plan/user_plan`;
        performanceAnalyticsPath = `users/${userId}/performance_analytics/summary`;
        
        console.log(`Tek kullanıcı modu: Plan oluşturuluyor`);
    }

    // 1. Profil verisini Firestore'dan çek
    const privateProfileSnap = await db.doc(profileDataPath).get();
    if (!privateProfileSnap.exists) {
        throw new HttpsError('not-found', 'Kullanıcı profili bulunamadı. Önce onboarding tamamlanmalı.');
    }
    
    const profile = privateProfileSnap.data();

    // 1.1. Performance analytics verisini çek (AI için kullanılacak)
    let performanceAnalytics = null;
    try {
        // Performance analytics summary dökümanına erişim (yol artık çift sayıda bölümden oluşuyor)
        const performanceAnalyticsRef = db.doc(`${performanceAnalyticsPath}`);
        const performanceAnalyticsSnap = await performanceAnalyticsRef.get();
        
        if (performanceAnalyticsSnap.exists) {
            performanceAnalytics = performanceAnalyticsSnap.data();
            console.log(`Kullanıcı ${userId} için performans analizi verisi bulundu.`);
        } else {
            console.log(`Kullanıcı ${userId} için performans analizi verisi bulunamadı. Plan oluşturmaya devam ediliyor.`);
        }
    } catch (error: any) {
        console.error("Performans verileri okunurken bir hata oluştu:", error);
        // Hata olsa bile plan oluşturmaya devam et, ama logla.
        performanceAnalytics = null;
    }
    const {
        grade,
        academicTrack,
        targetExam,
        dailyHours,
        studyDays,
        confidenceLevels,
        learningStyle,
        targetUniversity,
        strengthAreas,
        weaknessAreas,
        recommendedFocus,
        learningHabits,
        preferredSessionDuration // 🚀 YENİ: İdeal seans süresi
    } = profile;

    // Starting point'i request'ten al (onboarding sırasında gönderilir)
    const startingPoint = request.data?.startingPoint || 'current';
    
    // En son tamamlanan konular (ders bazında)
    const lastCompletedTopics = request.data?.lastCompletedTopics || {};

    if (!grade || !academicTrack || !targetExam || !dailyHours || !studyDays || !confidenceLevels) {
        throw new HttpsError('invalid-argument', 'Profilde eksik bilgi var.');
    }

    // 2. Müfredat verisini JSON dosyasından çek
    let curriculum: ClassData[] = [];
    try {
        curriculum = curriculumData as ClassData[];
        console.log(`Müfredat verisi başarıyla yüklendi: ${curriculum.length} sınıf seviyesi bulundu`);
        
        if (!curriculum || curriculum.length === 0) {
            throw new HttpsError('not-found', 'Müfredat JSON dosyası boş veya yüklenemedi.');
        }
    } catch (error: any) {
        console.error('Müfredat JSON dosyası okunamadı:', error);
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
    
    // 4. Tatil durumunu kontrol et
    const holidayStatus = checkCurrentHolidayStatus();
    let planType = request.data?.planType || 'regular';
    
    // Tatil dönemindeyse ve kullanıcı özel bir plan türü belirtmediyse tatil planı öner
    if (holidayStatus.isHoliday && !request.data?.planType) {
        planType = 'holiday';
        console.log(`Tatil zamanı tespit edildi: ${holidayStatus.reason}. Tatil planı önerilecek.`);
    }
    
    // 5. Doğru sınıf verisini bul
    // Tatil durumuna ve başlangıç noktasına göre sınıf seviyesini ayarla
    let effectiveGrade = grade;
    
    // Tatil döneminde ve "next_grade_prep" planı değilse, mevcut sınıf seviyesini kullan
    if (holidayStatus.isHoliday && planType !== 'holiday_next_grade_prep') {
        if (grade === 'Mezun') {
            // Mezun öğrenci tatilde 12. sınıf konularını çalışır
            effectiveGrade = '12';
            console.log(`🏖️ Tatil dönemi - Mezun öğrenci: 12. sınıf konuları çalışılacak`);
        } else {
            // Öğrenci "10. sınıfa geçeceğim" dediğinde şu anda 9. sınıfta demektir
            const numericGrade = parseInt(grade);
            if (!isNaN(numericGrade) && numericGrade > 9) {
                effectiveGrade = (numericGrade - 1).toString();
                console.log(`🏖️ Tatil dönemi - Girilen sınıf: ${grade} -> Çalışılacak seviye: ${effectiveGrade} (mevcut sınıf)`);
            }
        }
    } else if (planType === 'holiday_next_grade_prep') {
        if (grade === 'Mezun') {
            // Mezun öğrenci için "ileri seviye" üniversite hazırlık konuları
            effectiveGrade = '12';
            console.log(`🚀 Mezun öğrenci - Üniversite hazırlık seviyesi: 12. sınıf+`);
        } else {
            // Üst sınıfa hazırlık planında girilen sınıf seviyesini kullan
            console.log(`🚀 Üst sınıfa hazırlık - Hedef sınıf seviyesi: ${grade}`);
        }
    } else {
        // Normal dönemde starting point'e göre seviye ayarla
        if (startingPoint === 'behind') {
            // Geride kalmış - önceki sınıf seviyesinden başla
            if (grade === 'Mezun') {
                effectiveGrade = '11'; // Mezun öğrenci geride ise 11. sınıf
            } else {
                const numericGrade = parseInt(grade);
                if (!isNaN(numericGrade) && numericGrade > 9) {
                    effectiveGrade = (numericGrade - 1).toString();
                }
            }
            console.log(`🔄 Geride kaldım - Girilen sınıf: ${grade} -> Çalışılacak seviye: ${effectiveGrade}`);
        } else if (startingPoint === 'ahead') {
            // İlerde olmak istiyor - ileri seviye konular
            if (grade === 'Mezun') {
                effectiveGrade = '12'; // Mezun için ileri seviye yine 12. sınıf ama zor konular
            } else {
                const numericGrade = parseInt(grade);
                if (!isNaN(numericGrade) && numericGrade < 12) {
                    effectiveGrade = (numericGrade + 1).toString();
                }
            }
            console.log(`🚀 İlerde olmak istiyorum - Girilen sınıf: ${grade} -> Çalışılacak seviye: ${effectiveGrade}`);
        } else {
            // Normal seviye (current) - sınıf seviyesinde
            console.log(`⚖️ Seviyemde - Sınıf seviyesi: ${grade}`);
        }
    }
    
    // Grade'i JSON formatına çevir (örn: "10" -> "10. Sınıf")
    const gradeFormatted = effectiveGrade === 'Mezun' ? '12. Sınıf' : `${effectiveGrade}. Sınıf`;
    console.log(`Grade dönüştürme: "${grade}" -> "${gradeFormatted}" (etkili sınıf)`);
    
    const classData = curriculum.find(c => c.sinifDuzeyi === gradeFormatted);
    if (!classData) {
        console.error(`Müfredat'ta aranacak sınıf formatı: "${gradeFormatted}"`);
        console.error('Mevcut sınıf düzeyleri:', curriculum.map(c => c.sinifDuzeyi));
        throw new HttpsError('not-found', `"${gradeFormatted}" sınıfı için müfredat verisi bulunamadı.`);
    }
    
    // 6. Hangi derslerin dahil edileceğini belirle
    let subjectsToInclude: string[] = [];
    
    // Akademik alana göre dersleri ekle
    if (ACADEMIC_TRACK_SUBJECTS[academicTrack]) {
        subjectsToInclude = [...ACADEMIC_TRACK_SUBJECTS[academicTrack]];
    } else {
        // Alan bulunamadıysa tüm dersleri dahil et
        // SAVUNMACI KONTROL: classData.dersler array mi?
        if (Array.isArray(classData.dersler)) {
            try {
                subjectsToInclude = classData.dersler
                    .filter(d => d && d.dersAdi) // Geçerli dersAdi olan dersleri filtrele
                    .map(d => d.dersAdi);
                console.log(`${subjectsToInclude.length} ders akademik alana dahil edildi`);
            } catch (error: any) {
                console.error('Ders listesi oluşturulurken hata:', error);
                subjectsToInclude = []; // Güvenli fallback
            }
        } else {
            console.error(`HATA: "${grade}" sınıfı için classData.dersler bir dizi değil:`, classData.dersler);
            subjectsToInclude = []; // Güvenli fallback
        }
    }
    
    // 7. Konu havuzunu oluştur
    const topicPoolWithConfidence = getTopicPoolForGradeWithConfidence(
        effectiveGrade,
        classData,
        subjectsToInclude,
        academicTrack,
        targetExam,
        confidenceLevels
    );
    
    // AI için konu özeti
    const topicSummaryForAI = topicPoolWithConfidence.map(t => ({
        ders: t.ders,
        unite: t.unite,
        konu: t.konu,
        onem: t.onem,
        confidenceWeight: t.confidenceWeight
    }));
    
    // 8. Gelişmiş profil bilgileri için prompt'a eklenecek metin
    let diagnosticPrompt = '';
    if (strengthAreas && weaknessAreas) {
        diagnosticPrompt = `
- Güçlü Alanları: ${strengthAreas.join(', ')}
- Geliştirilmesi Gereken Alanlar: ${weaknessAreas.join(', ')}
- Önerilen Odak Alanları: ${recommendedFocus ? recommendedFocus.join(', ') : 'Belirtilmemiş'}`;
    }
    
    let personalizedInstructions = '';
    if (learningStyle) {
        personalizedInstructions += `\n- ${learningStyle} öğrenme stiline uygun aktiviteler ekle.`;
    }
    if (weaknessAreas && weaknessAreas.length > 0) {
        personalizedInstructions += `\n- Özellikle şu alanlara öncelik ver: ${weaknessAreas.join(', ')}.`;
    }
    if (learningHabits) {
        personalizedInstructions += `\n- Öğrencinin dikkat süresi ${learningHabits.focusDuration || 30} dakika, görevleri bu süreye göre planla.`;
    }

    // 8.1. Performance Analytics verilerini analiz et ve AI için hazırla
    let performancePromptSection = '';
    let adaptivePlanningRules = '';
    
    if (performanceAnalytics && performanceAnalytics.totalSessions > 0) {
        // En çok çalışılan ders
        const mostStudiedSubject = Object.entries(performanceAnalytics.timeBySubject)
            .sort(([,a], [,b]) => (b as number) - (a as number))[0];
        
        // En az çalışılan ders
        const leastStudiedSubject = Object.entries(performanceAnalytics.timeBySubject)
            .sort(([,a], [,b]) => (a as number) - (b as number))[0];
        
        // Zorlanma sinyalleri - ortalamadan %30 fazla süre harcanan dersler
        const averageSessionDuration = performanceAnalytics.averageSessionDuration;
        const difficultySignals: string[] = [];
        
        Object.entries(performanceAnalytics.timeBySubject).forEach(([subject, totalTime]) => {
            const sessionCount = performanceAnalytics.sessionsBySubject[subject] || 1;
            const subjectAverageSession = (totalTime as number) / sessionCount;
            
            if (subjectAverageSession > averageSessionDuration * 1.3) {
                difficultySignals.push(subject);
            }
        });
        
        // AI için performans profili
        performancePromptSection = `

**ÖĞRENCİNİN GEÇMİŞ PERFORMANS VERİLERİ (ANALİZ EDİLECEK):**
* **Ortalama Odaklanma Süresi:** ${averageSessionDuration} dakika.
* **Toplam Çalışma Seansi:** ${performanceAnalytics.totalSessions} seans.
* **En Çok Çalışılan Ders:** ${mostStudiedSubject ? mostStudiedSubject[0] : 'Veri yok'} (${mostStudiedSubject ? mostStudiedSubject[1] : 0} dakika).
* **En Az İlgilenilen Ders:** ${leastStudiedSubject ? leastStudiedSubject[0] : 'Veri yok'} (${leastStudiedSubject ? leastStudiedSubject[1] : 0} dakika).
* **Manuel vs Otomatik Çalışma Oranı:** Manuel: ${performanceAnalytics.totalManualMinutes} dk, Odak Modu: ${performanceAnalytics.totalFocusMinutes} dk.
* **Zorlanma Sinyalleri:** ${difficultySignals.length > 0 ? difficultySignals.join(', ') : 'Belirgin zorluk tespit edilmedi'}.`;

        // 8.2. Focus Profile Analytics verilerini al
        let focusAnalytics = null;
        try {
            // Aile hesabı yapısına uygun yol belirleme
            let focusAnalyticsPath: string;
            if (accountType === 'family') {
                const activeProfileId = profileId || userData?.selectedProfileId;
                focusAnalyticsPath = `users/${userId}/studentProfiles/${activeProfileId}/performance/analytics`;
            } else {
                focusAnalyticsPath = `users/${userId}/performance/analytics`;
            }
            
            const focusAnalyticsSnap = await db.doc(focusAnalyticsPath).get();
            focusAnalytics = focusAnalyticsSnap.exists ? focusAnalyticsSnap.data() : null;
            
            if (focusAnalytics) {
                console.log(`Kullanıcı ${userId} için odak profili verisi bulundu.`);
            } else {
                console.log(`Kullanıcı ${userId} için odak profili verisi bulunamadı.`);
            }
        } catch (error: any) {
            console.error("Odak profili verileri okunurken bir hata oluştu:", error);
            focusAnalytics = null;
        }
        
        // Adaptif planlama kuralları
        adaptivePlanningRules = `

**PERFORMANS VERİSİNE DAYALI ADAPTIF PLANLAMA KURALLARI:**
${averageSessionDuration < 30 ? 
`* KISA DİKKAT SÜRESİ ADAPTASYONU: Öğrencinin ortalama odaklanma süresi ${averageSessionDuration} dakika olduğu için, tüm Pomodoro seanslarını maksimum 25 dakika olarak planla. Daha kısa ama sık molalar ver.` : 
averageSessionDuration > 45 ? 
`* UZUN DİKKAT SÜRESİ AVANTAJI: Öğrenci ${averageSessionDuration} dakika odaklanabiliyor. 45-50 dakikalık daha uzun çalışma blokları oluşturabilirsin.` : 
`* STANDART DİKKAT SÜRESİ: ${averageSessionDuration} dakika odaklanma süresi normale yakın, standart 25 dakikalık Pomodoro'lar kullan.`}

${leastStudiedSubject && (leastStudiedSubject[1] as number) < (mostStudiedSubject ? mostStudiedSubject[1] as number : 0) * 0.3 ? 
`* DERS DENGESİ DÜZELTMESİ: "${leastStudiedSubject[0]}" dersi çok az çalışıldığı tespit edildi. Gelecek haftanın ilk günlerine bu dersten motivasyon artırıcı, kolay başlangıç görevleri ekle.` : ''}

${difficultySignals.length > 0 ? 
`* ZORLUK AYARI: "${difficultySignals.join('", "')}" derslerinde zorlanma sinyali var. Bu derslerin konularını parçala, daha temel seviyeden başla, adım adım örnekler ve pekiştirme görevleri ekle.` : ''}

${performanceAnalytics.totalManualMinutes > performanceAnalytics.totalFocusMinutes * 2 ? 
`* DİSİPLİN TEŞVİKİ: Çok fazla manuel kayıt kullanıyor. Odak modunu teşvik edecek kısa, başarılabilir görevler planla.` : 
performanceAnalytics.totalFocusMinutes > performanceAnalytics.totalManualMinutes * 3 ? 
`* ODAK MODU USTASI: Odak modunu çok iyi kullanıyor. Daha uzun ve derin çalışma seansları planlayabilirsin.` : ''}`;

        // 8.3. Yeni Focus Profile Analytics kuralları (updateUserFocusProfile fonksiyonundan gelen veriler)
        if (focusAnalytics) {
            const focusProfileRules = `

**ODAK PROFİLİ ANALİZİNE DAYALI YENİ PLANLAMA KURALLARI:**
${focusAnalytics.mostPausedSubject && focusAnalytics.mostPausedSubject !== 'N/A' ? 
`* ODAK PROFİLİ KURALΙ (MOLA VERİSİ): Eğer öğrencinin 'en çok mola verdiği ders' ${focusAnalytics.mostPausedSubject} ise ve ortalama odaklanma süresi ${focusAnalytics.averageFocusDuration || averageSessionDuration} dakikanın altındaysa, bir sonraki planda ${focusAnalytics.mostPausedSubject} çalışma bloklarını daha kısa tut (örn: 15-20 dk) ve aralarına daha sık, kısa molalar ekle. Görevleri daha küçük parçalara böl.` : ''}

${focusAnalytics.mostConfusingTopics && focusAnalytics.mostConfusingTopics.length > 0 ? 
`* ZORLUK AYARI KURALΙ (KONU HAKİMİYETİ): Eğer 'en çok zorlandığı konular' listesinde ${focusAnalytics.mostConfusingTopics.slice(0, 2).map(topic => `'${topic.split(' - ')[1] || topic}'`).join(', ')} varsa, bu konuları 'yüksek riskli' olarak kabul et. Bir sonraki hafta için bu konulardan önce, onların öncülü olan konuları içeren 20 dakikalık bir 'Temel Tekrar' görevi oluştur. Ayrıca, bu görevlerin yanına bir 'Adım Adım Çözümlü Örnekler' oturumu ekle.` : ''}

${focusAnalytics.strongestTopics && focusAnalytics.strongestTopics.length > 0 ? 
`* GÜÇLÜ YÖNLERİ KULLANMA KURALΙ (MORAL BOOST): Eğer öğrencinin 'en hakim olduğu konular' listesinde ${focusAnalytics.strongestTopics.slice(0, 2).map(topic => `'${topic.split(' - ')[1] || topic}'`).join(', ')} varsa, bu konuları kullanarak öğrencinin moralini yükselt. Haftanın ortasına, bu konulardan zorlayıcı ama keyifli bir 'Yeni Nesil Soru Çözümü' görevi ekleyerek ona 'başarı' hissini tattır. Bu görevleri 'Kendine Güven Artırıcı' olarak etiketle.` : ''}

${focusAnalytics.averageFocusDuration ? 
`* SÜRE OPTİMİZASYONU: Öğrencinin odaklanma verileri ${focusAnalytics.averageFocusDuration} dakikalık ortalama seans süresini gösteriyor. Tüm görevleri bu süreye optimize et. Bu sürenin %80'i kadar olan görevleri 'Hızlı Giriş', tam süre olanları 'Standart Çalışma', %120'si olanları 'Derin Odaklanma' olarak kategorize et.` : ''}`;
            
            adaptivePlanningRules += focusProfileRules;
        }
        
    } else {
        performancePromptSection = `

**ÖĞRENCİNİN GEÇMİŞ PERFORMANS VERİLERİ:**
* Bu kullanıcı için henüz çalışma verisi bulunmuyor. İlk planı oluşturuyoruz.`;
        
        adaptivePlanningRules = `

**YENİ KULLANICI PLANLAMA KURALLARI:**
* İlk hafta daha kısa görevlerle başla (20-25 dakika).
* Çeşitli ders ve konu türleri sun, tercihlerini keşfetmesine yardım et.
* Motive edici ve başarılabilir hedefler koy.
* Her dersten en temel konularla başla, güven kazandır.
* Odak modunu tanıtacak açıklayıcı görevler ekle.`;
    }
    
    // 9. Plan türüne göre ek talimatlar
    let holidayPrompt = '';
    
    if (planType === 'holiday' || planType.startsWith('holiday_')) {
        // Genel tatil prompt'u
        holidayPrompt = `
ÖNEMLİ - TATİL PLANLAMASI:
Şu anda ${holidayStatus.reason} dönemindesiniz. Tatil dönemine uygun bir çalışma planı oluşturun:`;

        // Plan türüne göre özel talimatlar
        if (planType === 'holiday_balanced') {
            holidayPrompt += `
DENGELI TATİL PLANI:
1. Günde ${Math.max(2, dailyHours - 1)} saat rahat tempo ile çalış.
2. Tüm dersleri dengeli şekilde kapsayacak konular seç.
3. Çalışmayı sabah erken saatlerde yoğunlaştır, öğleden sonra tatil aktivitelerine zaman bırak.
4. Esnek çalışma saatleri belirle, tatil ruhuna uygun motivasyon mesajları ekle.
5. Her güne en az bir eğlenceli öğrenme aktivitesi ekle (belgesel, eğitici oyun, vb.).`;
        } else if (planType === 'holiday_next_grade_prep') {
            if (grade === 'Mezun') {
                holidayPrompt += `
ÜNİVERSİTE HAZIRLIK PLANI (MEZUN):
1. Mezun öğrenci - ÜNİVERSİTE SİSTEMİNE ve seçilen bölüme hazırlık odaklan.
2. 12. sınıf konularını derinlemesine işle ve üniversite matematiği/fiziği/kimyası gibi ileri seviye konulara giriş yap.
3. Hedef üniversite bölümüne göre özel konulara ağırlık ver.
4. Günde ${Math.max(3, dailyHours)} saat ile yoğun ama etkili çalışma planla.
5. "Üniversitede avantaj yakalama" motivasyonu ile görevler oluştur.`;
            } else {
                const currentGrade = parseInt(grade) - 1; // Mevcut sınıf
                holidayPrompt += `
ÜST SINIFA HAZIRLIK PLANI:
1. Mevcut sınıf: ${currentGrade}. sınıf - ${grade}. SINIF (geçilecek sınıf) konularına hazırlık odaklan.
2. Hazırlık seviyesinde, merak uyandırıcı giriş konuları seç.
3. İleride avantaj sağlayacak temel kavramları vurgula.
4. Günde ${Math.max(2, dailyHours)} saat ile biraz daha yoğun ama keyifli çalışma planla.
5. "Gelecekte kolaylık sağlayacak" motivasyonu ile görevler oluştur.`;
            }
        } else if (planType === 'holiday_review_past') {
            holidayPrompt += `
GEÇMİŞ KONULARI PEKİŞTİRME PLANI:
1. Güven seviyesi "low" olan derslerin EN TEMEL konularına odaklan.
2. Unutulan ve eksik kalan konuları güçlendir.
3. Temel matematik ve fen konularına ağırlık ver.
4. Tekrar ve pekiştirme odaklı görevler oluştur.
5. "Sağlam temel atma" motivasyonu ile çalışma planla.
6. Günde ${Math.max(2, dailyHours - 1)} saat rahat tempo ile ilerleme sağla.`;
        }
    } else if (planType === 'exam_prep') {
        // Bu alan planTypeSpecificPrompt olarak kullanılmıyordu, kaldırıldı
    }
    
    // 10. Konu seçimi için AI'a istek gönder
    const selectionPrompt = `
Sen uzman bir eğitim stratejisti ve teşhis uzmanısın. Aşağıdaki öğrenci profili ve konu listesine göre, 7 günlük stratejik "Değer Kanıtı" planı için bu öğrenciye özel en etkili 10-15 konuyu seç.

ÖĞRENCİ PROFİLİ:
- Sınıf: ${effectiveGrade}. sınıf ${holidayStatus.isHoliday && effectiveGrade !== grade ? `(${grade}. sınıfa geçecek)` : effectiveGrade !== grade ? `(asıl sınıf: ${grade})` : ''}
- Başlangıç Noktası: ${startingPoint === 'behind' ? 'Geride kaldım' : startingPoint === 'ahead' ? 'İlerde olmak istiyorum' : 'Seviyemde'}
- Alanı: ${academicTrack}
- Hedef Sınav: ${targetExam}
- Hedef Üniversite: ${targetUniversity || 'Belirtilmemiş'}
- Günlük Çalışma Süresi: ${dailyHours} saat
- Çalışma Günleri: ${studyDays.join(', ')}
- Öğrenme Stili: ${learningStyle}
- Güven Seviyeleri (EN ÖNEMLİ): ${JSON.stringify(confidenceLevels)}
- En Son İşlenen Konular: ${Object.keys(lastCompletedTopics).length > 0 ? JSON.stringify(lastCompletedTopics) : 'Belirtilmemiş'}
${diagnosticPrompt}
${performancePromptSection}

STRATEJİK KONU SEÇİM KURALLARI:
1. EN SON İŞLENEN KONULARDAN DEVAM ET: Her ders için öğrencinin belirttiği "en son işlediği konu"dan sonra gelen konuları öncelikle seç.
2. TEŞHIS KONULARI (Gün 1-2): Güven seviyesi "low" olan derslerde, son işlenen konunun hemen ardından gelen temel konuları seç.
3. MORAL KONULARI (Gün 3-4): Güven seviyesi "medium" olan derslerde, son konudan devam ederek tatmin edici konuları seç.
4. KÖPRÜ KONULARI (Gün 5-6): Güven seviyesi "high" olan derslerde, son konudan sonraki ileri konulara geçiş yap.
5. KALDI YAZIN YERDEN DEVAM MANTII: Öğrenci her derste kaldığı yerden devam etmeli, geriye gitmemeli (sadece eksiklik varsa).
6. TOPLAM KONU SAYISI: 10-15 arası olmalı (7 günde işlenebilir miktarda).

Sadece ve sadece seçtiğin konuların adlarını içeren bir JSON dizisi olarak cevap ver. Örneğin: ["Matematik - Sayılar", "Fizik - Vektörler", ...]. Başka hiçbir metin ekleme.

MEVCUT KONULARIN ÖZETİ (${topicSummaryForAI.length} adet):
${JSON.stringify(topicSummaryForAI.slice(0, 300))}
`;

    try {
        // AI motorunu başlat
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const selectionResult = await model.generateContent(selectionPrompt);
        
        let selectedTopicsNames: string[];
        let finalTopicPool: TopicPoolItem[] = [];
        
        try {
            // AI'ın cevabını JSON olarak parse et
            const selectionText = selectionResult.response.text();
            selectedTopicsNames = JSON.parse(selectionText.replace(/```json|```/g, '').trim());
            
            if (!Array.isArray(selectedTopicsNames)) {
                throw new Error('AI yanıtı bir dizi değil');
            }
            
            // Seçilen konuları tam konu havuzu ile eşleştir
            finalTopicPool = topicPoolWithConfidence.filter(topic => {
                const topicFullName = `${topic.ders} - ${topic.konu}`;
                return selectedTopicsNames.some(name => 
                    name === topicFullName || 
                    name === topic.konu || 
                    name.includes(topic.konu)
                );
            });
            
            // Yeterli konu seçilemediyse en önemli konuları ekle
            if (finalTopicPool.length < 10) {
                const remainingTopics = topicPoolWithConfidence
                    .filter(t => !finalTopicPool.some(selected => selected.konu === t.konu))
                    .sort((a, b) => {
                        // Önce önem, sonra confidenceWeight'e göre sırala
                        const importanceValues = { 'high': 3, 'medium': 2, 'low': 1 };
                        const importanceA = importanceValues[a.onem as keyof typeof importanceValues];
                        const importanceB = importanceValues[b.onem as keyof typeof importanceValues];
                        
                        if (importanceA !== importanceB) return importanceB - importanceA;
                        return (b.confidenceWeight || 1) - (a.confidenceWeight || 1);
                    });
                
                finalTopicPool = [...finalTopicPool, ...remainingTopics.slice(0, 15 - finalTopicPool.length)];
            }
            
        } catch (error) {
            console.error('Konu seçimi parse edilemedi, varsayılan seçim kullanılacak:', error);
            // Hata durumunda en önemli 15 konuyu seç (7 günlük plan için)
            finalTopicPool = topicPoolWithConfidence
                .sort((a, b) => {
                    const importanceValues = { 'high': 3, 'medium': 2, 'low': 1 };
                    const importanceA = importanceValues[a.onem as keyof typeof importanceValues];
                    const importanceB = importanceValues[b.onem as keyof typeof importanceValues];
                    
                    if (importanceA !== importanceB) return importanceB - importanceA;
                    return (b.confidenceWeight || 1) - (a.confidenceWeight || 1);
                })
                .slice(0, 15);
        }
        
        // 🚀 STRATEJİK DÖNÜŞÜM: Esnek 3 Günlük Başlangıç Paketi
        
        // Zayıf dersleri filtrele (sadece bunlara odaklanacağız)
        const weakSubjects = Object.entries(confidenceLevels)
            .filter(([_, confidence]) => confidence === 'low')
            .map(([subject, _]) => subject);
        
        console.log(`🎯 Zayıf dersler tespit edildi: ${weakSubjects.join(', ')}`);
        
        // İdeal seans süresi - varsayılan 25 dakika
        const sessionDuration = preferredSessionDuration || 25;
        console.log(`⏱️ İdeal seans süresi: ${sessionDuration} dakika`);
        
        const planPrompt = `
Rol: Sen, bir öğrencinin zayıf noktalarını anlayan ve ona özel, kısa ama etkili başlangıç programları tasarlayan bir Usta Eğitim Stratejistisin.

Ana Görev: Aşağıdaki öğrenci profili ve konu havuzunu kullanarak, öğrencinin ilk 3 gününü en verimli şekilde geçirmesini sağlayacak, henüz bir takvime yerleştirilmemiş, esnek bir "görev havuzu" oluştur.

ÖĞRENCİ PROFİLİ:

Zayıf Olduğu Dersler (En Önemli Veri): ${weakSubjects.length > 0 ? weakSubjects.join(', ') : 'Tüm derslerde orta seviye'}

İdeal Seans Süresi: ${sessionDuration} dakika.

Güven Seviyeleri: ${JSON.stringify(confidenceLevels)}

Diğer Bilgiler:
- Sınıf: ${effectiveGrade}. sınıf
- Alan: ${academicTrack}
- Günlük Çalışma Hedefi: ${dailyHours} saat
- Öğrenme Stili: ${learningStyle}

PLANLAMA İLKELERİ (HARFİYEN UYULACAK):

1. 🎯 Odaklanma: Plan, sadece ve sadece öğrencinin "zayıf" olarak belirttiği derslere odaklanmalıdır. Bu 3 gün, en büyük eksikleri kapatmak için bir fırsattır.

2. 📚 Tutarlılık: Önerdiğin konular, bu zayıf derslerin en temel ve başlangıç seviyesindeki konuları olmalıdır. Abuk subuk, ileri seviye konular önerme.

3. ⏱️ Seanslara Bölme: Toplamda 3 günlük çalışmaya yetecek kadar görev öner. Her bir görevi, öğrencinin ideal seans süresine (${sessionDuration} dakika) uygun "seanslar" halinde yapılandır. Örneğin, 90 dakikalık bir konu, 3 adet 30 dakikalık seansa bölünebilir (Konu Anlatımı, Örnek Çözümü, Pratik Testi gibi).

4. ⚖️ Denge: Eğer öğrencinin ideal seans süresi kısaysa (örn: 30 dk), bir güne çok fazla farklı ders koymaktan kaçın. Günde en fazla 2-3 farklı derse odaklan.

SEÇİLMİŞ KONU HAVUZU (SADECE ZAYIF DERSLERDEN):
${JSON.stringify(finalTopicPool.filter(topic => weakSubjects.includes(topic.ders)))}

ÇIKTI FORMATI:
Cevabını SADECE aşağıdaki JSON formatında ver. Bu bir takvim değil, kullanıcının kendisinin yerleştireceği bir görev havuzudur.

    {
  "suggestedTasks": [
        {
      "taskId": "task_1",
              "subject": "Matematik",
      "topic": "Fonksiyonların Temelleri",
      "sessionType": "Konu Anlatımı",
      "durationInMinutes": ${sessionDuration},
      "isPlaced": false,
      "difficulty": "beginner",
      "priority": "high"
    },
    {
      "taskId": "task_2",
      "subject": "Matematik",
      "topic": "Fonksiyonların Temelleri",
      "sessionType": "Pratik Testi",
      "durationInMinutes": ${sessionDuration},
      "isPlaced": false,
      "difficulty": "beginner",
      "priority": "high"
    },
    {
      "taskId": "task_3",
      "subject": "Fizik",
      "topic": "Vektörlere Giriş",
      "sessionType": "Video İzleme",
      "durationInMinutes": ${Math.min(sessionDuration + 15, 60)},
      "isPlaced": false,
      "difficulty": "beginner",
      "priority": "medium"
    }
  ],
  "totalEstimatedHours": 2.5,
  "focusAreas": ${JSON.stringify(weakSubjects)},
  "recommendations": {
    "dailyTaskLimit": ${sessionDuration <= 30 ? 2 : 3},
    "sessionBreaks": "Her ${sessionDuration} dakika sonra 5-10 dakika mola",
    "completionGoal": "3 gün içinde tüm görevleri tamamla"
  }
}`;

        // 12. 🚀 Esnek Görev Havuzu için AI'a istek gönder
        const planResult = await model.generateContent(planPrompt);
        const planText = planResult.response.text();
        
        let taskResponse;
        
        // AI yanıtını parse etmeyi dene, hata olursa yedek görevler oluştur
        try {
            const cleanedPlanText = planText.replace(/```json|```/g, '').trim();
            taskResponse = JSON.parse(cleanedPlanText);
            
            // Temel doğrulama - yeni format için
            if (!taskResponse.suggestedTasks || !Array.isArray(taskResponse.suggestedTasks) || taskResponse.suggestedTasks.length === 0) {
                throw new Error('Görev havuzu oluşturulamadı');
            }
            
            console.log(`✅ AI ${taskResponse.suggestedTasks.length} görev önerdi`);
            
        } catch (error) {
            console.error('AI yanıtı geçerli JSON değil, yedek görevler oluşturuluyor:', error);
            
            // Yedek görev havuzu oluştur
            const fallbackTasks = [];
            let taskCounter = 1;
            
            for (const topic of finalTopicPool.slice(0, 6)) { // İlk 6 konu
                if (weakSubjects.includes(topic.ders)) {
                    fallbackTasks.push({
                        taskId: `task_${taskCounter++}`,
                        subject: topic.ders,
                        topic: topic.konu,
                        sessionType: "Konu Anlatımı",
                        durationInMinutes: sessionDuration,
                        isPlaced: false,
                        difficulty: "beginner",
                        priority: topic.onem === 'high' ? 'high' : 'medium'
                    });
                }
            }
            
            taskResponse = {
                suggestedTasks: fallbackTasks,
                totalEstimatedHours: (fallbackTasks.length * sessionDuration) / 60,
                focusAreas: weakSubjects,
                recommendations: {
                    dailyTaskLimit: sessionDuration <= 30 ? 2 : 3,
                    sessionBreaks: `Her ${sessionDuration} dakika sonra 5-10 dakika mola`,
                    completionGoal: "3 gün içinde tüm görevleri tamamla"
                }
            };
        }
        
        // 13. 🚀 YENİ FORMAT: Esnek Görev Havuzunu Firestore'a kaydet
        const planDocRef = db.doc(planDataPath);
        await planDocRef.set({
            // Yeni format - esnek görev havuzu
            taskPool: taskResponse,
            planType: 'flexible_start', // Yeni plan türü
            isFlexiblePlan: true,
            targetedWeaknesses: weakSubjects,
            sessionDuration: sessionDuration,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'ready_for_placement' // Kullanıcı görevleri yerleştirebilir
        });
        
        // 14. Ana kullanıcı belgesini güncelle
        await db.doc(`users/${userId}`).set({ 
            hasPlan: true,
            planType: 'flexible_start',
            planCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
            flexibleTasksAvailable: taskResponse.suggestedTasks.length
        }, { merge: true });
        
        return {
            success: true,
            planType: 'flexible_start',
            taskPool: taskResponse,
            message: `🎯 ${taskResponse.suggestedTasks.length} esnek görev hazır! İstediğin zaman yerleştirebilirsin.`,
            weakSubjectsFocus: weakSubjects,
            sessionOptimized: `${sessionDuration} dakikalık seanslara optimize edildi`
        };
        
    } catch (error: any) {
        console.error('Plan oluşturma hatası:', error);
        throw new HttpsError('internal', `Plan oluşturulurken hata: ${error.message}`);
    }
}); 

/**
 * Sınıf seviyesi ve seçilen derslere göre müfredattan konuları döndüren fonksiyon
 */
export const getTopicsForGradeAndSubjects = onCall(ultraLightOptions, async (request) => {
    const { grade, selectedSubjects } = request.data || {};
    
    if (!grade || !selectedSubjects || !Array.isArray(selectedSubjects)) {
        throw new HttpsError('invalid-argument', 'grade ve selectedSubjects parametreleri zorunludur.');
    }

    try {
        // Müfredat verisini yükle
        const curriculum = curriculumData as ClassData[];
        
        // Sınıf seviyesini belirle
        const result: { [subject: string]: Array<{konuAdi: string, uniteAdi?: string, islenmeHaftasi?: number}> } = {};
        
        // 12. sınıf ve mezun öğrenciler için tüm sınıflardan konular
        if (grade === '12' || grade === 'Mezun') {
            console.log('12. sınıf veya mezun öğrenci - tüm sınıfların konuları gösterilecek');
            
            // Tüm sınıf seviyelerini kontrol et
            for (const classData of curriculum) {
                for (const subject of selectedSubjects) {
                    const matchingCourse = classData.dersler?.find(course => 
                        course.dersAdi && course.dersAdi.toLowerCase().includes(subject.toLowerCase())
                    );
                    
                    if (matchingCourse && matchingCourse.uniteVeTemalar) {
                        if (!result[subject]) result[subject] = [];
                        
                        for (const unit of matchingCourse.uniteVeTemalar) {
                            if (unit.konular) {
                                for (const topic of unit.konular) {
                                    if (topic.konuAdi) {
                                        result[subject].push({
                                            konuAdi: topic.konuAdi,
                                            uniteAdi: unit.uniteAdi,
                                            islenmeHaftasi: topic.islenmeHaftasi
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // 9, 10, 11. sınıf öğrenciler için sadece kendi seviyesi
            const gradeFormatted = `${grade}. Sınıf`;
            const classData = curriculum.find(c => c.sinifDuzeyi === gradeFormatted);
            
            if (!classData) {
                throw new HttpsError('not-found', `${gradeFormatted} için müfredat verisi bulunamadı.`);
            }
            
            console.log(`${gradeFormatted} öğrenci - sadece bu seviyenin konuları gösterilecek`);
            
            for (const subject of selectedSubjects) {
                const matchingCourse = classData.dersler?.find(course => 
                    course.dersAdi && course.dersAdi.toLowerCase().includes(subject.toLowerCase())
                );
                
                if (matchingCourse && matchingCourse.uniteVeTemalar) {
                    result[subject] = [];
                    
                    for (const unit of matchingCourse.uniteVeTemalar) {
                        if (unit.konular) {
                            for (const topic of unit.konular) {
                                if (topic.konuAdi) {
                                    result[subject].push({
                                        konuAdi: topic.konuAdi,
                                        uniteAdi: unit.uniteAdi,
                                        islenmeHaftasi: topic.islenmeHaftasi
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Konuları hafta sırasına göre sırala
        Object.keys(result).forEach(subject => {
            result[subject].sort((a, b) => (a.islenmeHaftasi || 0) - (b.islenmeHaftasi || 0));
        });
        
        console.log(`Toplam ${Object.keys(result).length} ders için konular hazırlandı`);
        
        return {
            success: true,
            subjectTopics: result,
            totalSubjects: Object.keys(result).length,
            totalTopics: Object.values(result).reduce((sum, topics) => sum + topics.length, 0)
        };
        
    } catch (error: any) {
        console.error('Konular yüklenirken hata:', error);
        throw new HttpsError('internal', `Konular yüklenemedi: ${error.message}`);
    }
});

/**
 * AI destekli akıllı yeniden planlama önerisi
 */
export const suggestTaskReschedule = onCall(mediumOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { taskInfo, currentDate, reason, profileId } = request.data;
    
    if (!taskInfo || !currentDate) {
        throw new HttpsError('invalid-argument', 'Görev bilgisi ve tarih gereklidir.');
    }

    try {
        // Hesap tipini ve profil yollarını belirle
        const userDoc = await db.doc(`users/${userId}`).get();
        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'Kullanıcı hesabı bulunamadı.');
        }
        
        const userData = userDoc.data();
        const accountType = userData?.accountType || 'single';
        
        let planDataPath: string;
        let profileDataPath: string;
        
        if (accountType === 'family') {
            // Aile hesabı modu
            const activeProfileId = profileId || userData?.selectedProfileId;
            if (!activeProfileId) {
                throw new HttpsError('invalid-argument', 'Aile hesabı için profileId belirtilmeli veya selectedProfileId ayarlanmış olmalı.');
            }
            
            planDataPath = `users/${userId}/studentProfiles/${activeProfileId}/plan/user_plan`;
            profileDataPath = `users/${userId}/studentProfiles/${activeProfileId}/privateProfile/profile`;
        } else {
            // Tek kullanıcı modu
            planDataPath = `users/${userId}/plan/user_plan`;
            profileDataPath = `users/${userId}/privateProfile/profile`;
        }

        // 1. Kullanıcının mevcut planını çek
        const userPlanSnap = await db.doc(planDataPath).get();
        if (!userPlanSnap.exists) {
            throw new HttpsError('not-found', 'Kullanıcı planı bulunamadı.');
        }
        
        const userPlan = userPlanSnap.data();
        
        // 2. Kullanıcı profilini çek
        const profileSnap = await db.doc(profileDataPath).get();
        if (!profileSnap.exists) {
            throw new HttpsError('not-found', 'Kullanıcı profili bulunamadı.');
        }
        
        const profile = profileSnap.data();
        
        // 3. Haftanın analizi için tüm günleri topla
        const allDays = userPlan.weeks.reduce((days: any[], week: any) => {
            return days.concat(week.days);
        }, []);
        
        // 4. AI'dan akıllı öneri al
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const analysisPrompt = `
Sen öğrenci koçu bir yapay zekasın. Bir öğrenci sana şu görevi ertelemek istiyor ve senin akıllı bir çözüm önermen gerekiyor.

ERTELENMEK İSTENEN GÖREV:
- Ders: ${taskInfo.subject}
- Konu: ${taskInfo.topic}
- Süre: ${taskInfo.durationInMinutes} dakika
- Mevcut Tarih: ${currentDate}
- Erteleme Sebebi: ${reason || 'Belirtilmemiş'}

ÖĞRENCİ PROFİLİ:
- Sınıf: ${profile.grade}
- Günlük Çalışma Hedefi: ${profile.dailyHours} saat
- Çalışma Günleri: ${profile.studyDays.join(', ')}
- Hedef Sınav: ${profile.targetExam}
- Öğrenme Stili: ${profile.learningStyle}

HAFTALIK PROGRAM ANALİZİ:
${JSON.stringify(allDays.slice(0, 14))} // Sadece yaklaşık 2 hafta

GÖREVIN:
1. Haftanın en uygun günlerini analiz et (yoğunluk, konu dağılımı, dinlenme günleri)
2. Öğrencinin çalışma alışkanlıklarını dikkate al
3. Konunun önemini ve diğer görevlerle olan ilişkisini değerlendir
4. 2-3 alternatif tarih öner ve her birini gerekçelendir
5. Motivasyon artırıcı bir mesaj ekle

Cevabın şu JSON formatında olsun:
{
  "recommendations": [
    {
      "date": "2023-03-22",
      "dayName": "Perşembe",
      "timeSlot": "Öğleden sonra",
      "reason": "Bu gün program hafif ve aynı dersten başka konular var. Sinerjik çalışma fırsatı.",
      "confidence": 95,
      "additionalNotes": "Matematik konuları birlikte çalışmak daha verimli olur."
    }
  ],
  "motivationalMessage": "Merak etme! Her başarılı öğrenci bazen esneklik gösterir. Önemli olan planı tamamen bırakmamak.",
  "studyTips": [
    "Bu konuyu başka matematik konularıyla birlikte çalış",
    "Pomodoro tekniği kullanarak odaklanabilirsin"
  ],
  "weeklyAnalysis": {
    "currentLoad": "Bu hafta yoğunluğun orta seviyede",
    "lightestDay": "Cuma",
    "heaviestDay": "Pazartesi",
    "suggestedOptimization": "Pazartesi günü biraz hafifletip daha dengeli dağıtabilirsin"
  }
}
`;

        const aiResponse = await model.generateContent(analysisPrompt);
        const responseText = aiResponse.response.text();
        
        let suggestion;
        try {
            const cleanedText = responseText.replace(/```json|```/g, '').trim();
            suggestion = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('AI yanıtı parse edilemedi:', parseError);
            // Fallback öneri
            suggestion = {
                recommendations: [
                    {
                        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        dayName: "Yarın",
                        timeSlot: "Öğleden sonra",
                        reason: "Bir gün sonraya ertelemek genellikle iyi bir çözümdür.",
                        confidence: 75,
                        additionalNotes: "Yarın için zaman ayırmaya çalış."
                    }
                ],
                motivationalMessage: "Planında esneklik göstermen normal. Önemli olan hedefine odaklanman!",
                studyTips: [
                    "Bu görevi yarın ilk iş olarak yapmayı dene",
                    "Kısa molalar vererek çalışman daha verimli olur"
                ],
                weeklyAnalysis: {
                    currentLoad: "Program analizi yapılamadı",
                    lightestDay: "Belirsiz",
                    heaviestDay: "Belirsiz", 
                    suggestedOptimization: "Genel olarak görevleri eşit dağıtmaya çalış"
                }
            };
        }
        
        // 5. Öneriyi analiz verisiyle birlikte log'la
        console.log(`Reschedule suggestion for user ${userId}:`, {
            originalTask: taskInfo,
            originalDate: currentDate,
            suggestions: suggestion.recommendations.length,
            aiConfidence: suggestion.recommendations[0]?.confidence || 0
        });
        
        return {
            success: true,
            suggestion: suggestion,
            analysisDate: new Date().toISOString(),
            originalTask: taskInfo
        };
        
    } catch (error: any) {
        console.error('Yeniden planlama önerisi hatası:', error);
        throw new HttpsError('internal', `AI destekli yeniden planlama hatası: ${error.message}`);
    }
});

/**
 * Görev yeniden planlama işlemini uygular
 */
export const applyTaskReschedule = onCall(mediumOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { originalDate, newDate, taskInfo, rescheduleReason, profileId } = request.data;
    
    if (!originalDate || !newDate || !taskInfo) {
        throw new HttpsError('invalid-argument', 'Eksik yeniden planlama bilgileri.');
    }

    try {
        // Hesap tipini ve plan yolunu belirle
        const userDoc = await db.doc(`users/${userId}`).get();
        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'Kullanıcı hesabı bulunamadı.');
        }
        
        const userData = userDoc.data();
        const accountType = userData?.accountType || 'single';
        
        let planDataPath: string;
        if (accountType === 'family') {
            const activeProfileId = profileId || userData?.selectedProfileId;
            if (!activeProfileId) {
                throw new HttpsError('invalid-argument', 'Aile hesabı için profileId belirtilmeli veya selectedProfileId ayarlanmış olmalı.');
            }
            planDataPath = `users/${userId}/studentProfiles/${activeProfileId}/plan/user_plan`;
        } else {
            planDataPath = `users/${userId}/plan/user_plan`;
        }

        // 1. Kullanıcının planını çek
        const userPlanRef = db.doc(planDataPath);
        const userPlanSnap = await userPlanRef.get();
        
        if (!userPlanSnap.exists) {
            throw new HttpsError('not-found', 'Kullanıcı planı bulunamadı.');
        }
        
        const userPlan = userPlanSnap.data();
        
        // 2. Orijinal görevi bul ve sil
        let taskFound = false;
        let updatedPlan = { ...userPlan };
        
        for (let weekIndex = 0; weekIndex < updatedPlan.weeks.length; weekIndex++) {
            const week = updatedPlan.weeks[weekIndex];
            for (let dayIndex = 0; dayIndex < week.days.length; dayIndex++) {
                const day = week.days[dayIndex];
                
                if (day.date === originalDate) {
                    const taskIndex = day.dailyTasks.findIndex((task: any) => 
                        task.subject === taskInfo.subject && 
                        task.topic === taskInfo.topic
                    );
                    
                    if (taskIndex !== -1) {
                        // Görevi sil
                        updatedPlan.weeks[weekIndex].days[dayIndex].dailyTasks.splice(taskIndex, 1);
                        taskFound = true;
                        break;
                    }
                }
            }
            if (taskFound) break;
        }
        
        if (!taskFound) {
            throw new HttpsError('not-found', 'Yeniden planlanacak görev bulunamadı.');
        }
        
        // 3. Görevi yeni tarihe ekle
        let targetDayFound = false;
        for (let weekIndex = 0; weekIndex < updatedPlan.weeks.length; weekIndex++) {
            const week = updatedPlan.weeks[weekIndex];
            for (let dayIndex = 0; dayIndex < week.days.length; dayIndex++) {
                const day = week.days[dayIndex];
                
                if (day.date === newDate) {
                    // Yeniden planlama metadata'sı ekle
                    const rescheduledTask = {
                        ...taskInfo,
                        isRescheduled: true,
                        rescheduleHistory: [
                            {
                                originalDate: originalDate,
                                newDate: newDate,
                                reason: rescheduleReason,
                                timestamp: new Date().toISOString()
                            }
                        ]
                    };
                    
                    updatedPlan.weeks[weekIndex].days[dayIndex].dailyTasks.push(rescheduledTask);
                    targetDayFound = true;
                    break;
                }
            }
            if (targetDayFound) break;
        }
        
        if (!targetDayFound) {
            throw new HttpsError('not-found', 'Hedef tarih planda bulunamadı.');
        }
        
        // 4. Güncellenmiş planı kaydet
        await userPlanRef.update({
            ...updatedPlan,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastReschedule: {
                date: new Date().toISOString(),
                taskSubject: taskInfo.subject,
                taskTopic: taskInfo.topic,
                fromDate: originalDate,
                toDate: newDate,
                reason: rescheduleReason
            }
        });
        
        console.log(`Task rescheduled for user ${userId}: ${taskInfo.subject} - ${taskInfo.topic} from ${originalDate} to ${newDate}`);
        
        return {
            success: true,
            message: 'Görev başarıyla yeniden planlandı',
            rescheduledTask: taskInfo,
            oldDate: originalDate,
            newDate: newDate
        };
        
    } catch (error: any) {
        console.error('Görev yeniden planlama hatası:', error);
        throw new HttpsError('internal', `Görev yeniden planlanırken hata: ${error.message}`);
    }
}); 

/**
 * Premium kullanıcılar için haftalık plan oluşturan fonksiyon
 * Bir önceki haftanın performansını analiz ederek yeni haftalık plan oluşturur
 */
export const generateWeeklyPremiumPlan = onCall(heavyOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { profileId, weekNumber } = request.data || {};

    if (!userId) {
        throw new HttpsError('invalid-argument', 'userId zorunludur.');
    }

    // Premium erişim kontrolü
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
        throw new HttpsError('not-found', 'Kullanıcı hesabı bulunamadı.');
    }
    
    const userData = userDoc.data();
    const subscription = userData?.subscription;
    
    // Premium durumunu kontrol et
    let isPremium = false;
    if (subscription?.subscriptionTier !== 'free') {
        isPremium = true;
    } else if (subscription?.trialStartDate && subscription?.trialEndDate) {
        const trialEnd = subscription.trialEndDate.toDate();
        isPremium = new Date() < trialEnd;
    }
    
    if (!isPremium) {
        throw new HttpsError('permission-denied', 'Bu özellik premium üyeler için rezervedir.');
    }

    const accountType = userData?.accountType || 'single';
    
    let profileDataPath: string;
    let planDataPath: string;
    let performanceAnalyticsPath: string;
    
    if (accountType === 'family') {
        const targetProfileId = profileId || userData?.selectedProfileId;
        if (!targetProfileId) {
            throw new HttpsError('invalid-argument', 'Aile hesabı için profileId gereklidir.');
        }
        
        profileDataPath = `users/${userId}/studentProfiles/${targetProfileId}/privateProfile/profile`;
        planDataPath = `users/${userId}/studentProfiles/${targetProfileId}/plan/user_plan`;
        performanceAnalyticsPath = `users/${userId}/studentProfiles/${targetProfileId}/performance_analytics/summary`;
    } else {
        profileDataPath = `users/${userId}/privateProfile/profile`;
        planDataPath = `users/${userId}/plan/user_plan`;
        performanceAnalyticsPath = `users/${userId}/performance_analytics/summary`;
    }

    // 1. Profil ve performans verilerini çek
    const privateProfileSnap = await db.doc(profileDataPath).get();
    if (!privateProfileSnap.exists) {
        throw new HttpsError('not-found', 'Kullanıcı profili bulunamadı.');
    }
    
    const profile = privateProfileSnap.data();

    // 2. Önceki hafta performans analizi
    let performanceAnalytics = null;
    try {
        const performanceAnalyticsSnap = await db.doc(`${performanceAnalyticsPath}`).get();
        if (performanceAnalyticsSnap.exists) {
            performanceAnalytics = performanceAnalyticsSnap.data();
        }
    } catch (error: any) {
        console.error("Performans verileri okunurken hata:", error);
    }

    // 3. Müfredat verisini al
    let curriculum: ClassData[] = [];
    try {
        curriculum = curriculumData as ClassData[];
    } catch (error: any) {
        throw new HttpsError('internal', `Müfredat verisi alınamadı: ${error.message}`);
    }

    const {
        grade,
        academicTrack,
        targetExam,
        dailyHours,
        studyDays,
        confidenceLevels,
        learningStyle,
        targetUniversity,
    } = profile;

    // 4. Konu havuzunu oluştur - KRİTİK: Sonraki haftalarda müfredattan devam sistemi
    const gradeFormatted = grade === 'Mezun' ? '12. Sınıf' : `${grade}. Sınıf`;
    const classData = curriculum.find(c => c.sinifDuzeyi === gradeFormatted);
    if (!classData) {
        throw new HttpsError('not-found', `"${gradeFormatted}" sınıfı için müfredat verisi bulunamadı.`);
    }

    let subjectsToInclude: string[] = [];
    if (ACADEMIC_TRACK_SUBJECTS[academicTrack]) {
        subjectsToInclude = [...ACADEMIC_TRACK_SUBJECTS[academicTrack]];
    } else {
        if (Array.isArray(classData.dersler)) {
            subjectsToInclude = classData.dersler
                .filter(d => d && d.dersAdi)
                .map(d => d.dersAdi);
        }
    }

    // 🚨 ÇOK ÖNEMLİ: 2. hafta ve sonrası için müfredattan devam et
    console.log(`📚 Hafta ${weekNumber || 2} - Müfredat bazlı konu seçimi başlıyor...`);
    
    const topicPoolForWeek = await getNextCurriculumTopics(
        userId,
        grade,
        classData,
        subjectsToInclude,
        academicTrack,
        targetExam,
        profileId
    );

    // Güven seviyesi bilgilerini ekle
    const topicPoolWithConfidence = topicPoolForWeek.map(topic => ({
        ...topic,
        userConfidenceLevel: confidenceLevels[topic.ders] || 'medium'
    }));

    console.log(`🎯 Seçilen konu sayısı: ${topicPoolWithConfidence.length}`);

    // 5. Premium haftalık plan prompt'u
    const weeklyPlanPrompt = `
Sen premium kullanıcılar için haftalık çalışma planları oluşturan uzman bir AI koçusun. Aşağıdaki kullanıcının profili ve performans verilerine göre, bir sonraki hafta için stratejik bir çalışma planı oluştur.

ÖĞRENCİ PROFİLİ:
- Sınıf: ${grade}. sınıf
- Alanı: ${academicTrack}
- Hedef Sınav: ${targetExam}
- Hedef Üniversite: ${targetUniversity || 'Belirtilmemiş'}
- Günlük Çalışma Süresi: ${dailyHours} saat
- Çalışma Günleri: ${studyDays.join(', ')}
- Güven Seviyeleri: ${JSON.stringify(confidenceLevels)}
- Öğrenme Stili: ${learningStyle}

PERFORMANS ANALİZİ:
${performanceAnalytics ? `
- Toplam Çalışma Seansı: ${performanceAnalytics.totalSessions || 0}
- Ortalama Seans Süresi: ${performanceAnalytics.averageSessionDuration || 25} dakika
- En Çok Çalışılan Ders: ${Object.entries(performanceAnalytics.timeBySubject || {}).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'Veri yok'}
- En Az Çalışılan Ders: ${Object.entries(performanceAnalytics.timeBySubject || {}).sort(([,a], [,b]) => (a as number) - (b as number))[0]?.[0] || 'Veri yok'}
` : 'İlk hafta - performans verisi henüz yok'}

PREMIUM HAFTALIK PLAN KURALLARI:
1. Plan tam olarak 1 HAFTA (7 gün) olmalı
2. Hafta numarası: ${weekNumber || 2} (2. hafta ve sonrası)
3. Önceki hafta performansını dikkate al ve zayıf alanları güçlendir
4. Güven seviyesi düşük konulara daha fazla odaklan
5. Motivasyon artırıcı başarı görevleri ekle
6. Her gün için anlamlı tema ve amaç belirle

MEVCUT KONU HAVUZU:
${JSON.stringify(topicPoolWithConfidence.slice(0, 50))}

ÖNEMLİ - JSON FORMAT:
Cevabın SADECE aşağıdaki yapıda bir JSON objesi olsun.

{
  "planTitle": "Hafta ${weekNumber || 2} - İlerleme Planın",
  "weekNumber": ${weekNumber || 2},
  "weeklyMotivationMessage": "Bu hafta daha da güçleniyorsun! Her gün seni hedefe bir adım daha yaklaştıracak.",
  "weeks": [
    {
      "weekNumber": ${weekNumber || 2},
      "weekTheme": "İlerleme ve Güçlenme Haftası",
      "days": [
        {
          "day": "Pazartesi",
          "date": "${new Date().toISOString().split('T')[0]}",
          "dayTheme": "Güçlü Başlangıç Günü",
          "isRestDay": false,
          "dailyTasks": [
            {
              "subject": "Matematik",
              "topic": "İleri Konular",
              "unit": "Pratik Uygulamalar",
              "durationInMinutes": 60,
              "isCompleted": false,
              "taskPurpose": "gelişim",
              "confidenceLevel": "medium",
              "pomodoroSessions": [
                {
                  "type": "learn",
                  "description": "Konu derinleştirme",
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
                  "description": "Uygulama yapma",
                  "durationInMinutes": 25,
                  "isCompleted": false
                }
              ],
              "resource": {
                "type": "video",
                "title": "İleri Matematik Konuları",
                "url": "https://www.youtube.com/watch?v=example"
              },
              "feynman": {
                "explanation": "Detaylı açıklama...",
                "analogyPrompt": "Bu konuyu günlük hayatta nerede kullanıyoruz?",
                "quiz": [
                  {
                    "question": "Örnek soru?",
                    "options": ["A", "B", "C"],
                    "correctAnswer": "A"
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ],
  "weekSummary": {
    "totalTopics": 12,
    "focusAreas": ["İlerleme", "Pekiştirme", "Yeni Konular"],
    "summaryText": "Bu hafta performansını artırmaya odaklanıyoruz! Premium üyeliğinle sürekli gelişmeye devam et."
  }
}`;

    try {
        // AI motorunu başlat
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const planResult = await model.generateContent(weeklyPlanPrompt);
        
        const planText = planResult.response.text();
        let finalPlan;
        
        try {
            const cleanedPlanText = planText.replace(/```json|```/g, '').trim();
            finalPlan = JSON.parse(cleanedPlanText);
        } catch (error) {
            console.error('AI yanıtı parse edilemedi:', error);
            throw new HttpsError('internal', 'Plan oluşturulurken AI yanıtı işlenemedi.');
        }
        
        // 6. Planı Firestore'a kaydet
        const planDocRef = db.doc(planDataPath);
        await planDocRef.set({
            ...finalPlan,
            planType: 'premium_weekly',
            weekNumber: weekNumber || 2,
            isFirstWeek: false, // 2. hafta ve sonrası - curriculum progression kullanıldı
            usedLastCompletedTopics: false, // Müfredattan devam edildi
            usedCurriculumProgression: true, // Normal müfredat sırasından devam
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // 7. Ana kullanıcı belgesini güncelle
        await db.doc(`users/${userId}`).update({ 
            hasPlan: true,
            planType: 'premium_weekly',
            currentWeek: weekNumber || 2,
            lastPlanUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return {
            success: true,
            planType: 'premium_weekly',
            weekNumber: weekNumber || 2,
            message: `Hafta ${weekNumber || 2} planı başarıyla oluşturuldu`
        };
        
    } catch (error: any) {
        console.error('Premium haftalık plan oluşturma hatası:', error);
        throw new HttpsError('internal', `Plan oluşturulurken hata: ${error.message}`);
    }
}); 

/**
 * Müfredat ilerlemesini takip eden ve sonraki haftalarda normal müfredattan devam eden yardımcı fonksiyon
 */
async function getNextCurriculumTopics(
    userId: string, 
    grade: string, 
    classData: ClassData,
    subjectsToInclude: string[],
    academicTrack: string,
    targetExam?: string,
    profileId?: string
): Promise<TopicPoolItem[]> {
    try {
        // Profil yolunu belirle (family account vs single account)
        const progressPath = profileId 
            ? `users/${userId}/studentProfiles/${profileId}/curriculum_progress/progress`
            : `users/${userId}/curriculum_progress/progress`;
        
        // Müfredat ilerlemesini oku
        const progressDoc = await db.doc(progressPath).get();
        let curriculumProgress: { [subject: string]: string[] } = {};
        
        if (progressDoc.exists) {
            curriculumProgress = progressDoc.data()?.completedTopics || {};
            console.log('📊 Mevcut müfredat ilerlemesi:', curriculumProgress);
        } else {
            console.log('📚 İlk hafta - müfredat ilerlemesi henüz yok, sıfırdan başlıyor');
        }

        // Tam konu havuzunu oluştur
        const fullTopicPool = getTopicPoolForGrade(
            grade,
            classData,
            subjectsToInclude,
            academicTrack,
            targetExam
        );

        // Her ders için bir sonraki konuları bul
        const nextTopics: TopicPoolItem[] = [];
        
        for (const subject of subjectsToInclude) {
            const subjectTopics = fullTopicPool.filter(topic => topic.ders === subject);
            const completedTopics = curriculumProgress[subject] || [];
            
            // Henüz tamamlanmamış konuları bul (müfredat sırasına göre)
            const remainingTopics = subjectTopics.filter(topic => 
                !completedTopics.includes(topic.konu)
            );
            
            // Haftalık olarak her dersten 2-3 konu seç
            const topicsPerSubject = Math.min(3, remainingTopics.length);
            const selectedTopics = remainingTopics.slice(0, topicsPerSubject);
            
            console.log(`📚 ${subject}: ${completedTopics.length} tamamlandı, ${selectedTopics.length} yeni konu seçildi`);
            nextTopics.push(...selectedTopics);
        }

        console.log(`🎯 Toplam seçilen sonraki konular: ${nextTopics.length}`);
        return nextTopics;
        
    } catch (error) {
        console.error('❌ Müfredat ilerlemesi alınırken hata:', error);
        // Hata durumunda normal konu havuzunu döndür
        return getTopicPoolForGrade(grade, classData, subjectsToInclude, academicTrack, targetExam);
    }
}

/**
 * Tamamlanan konuları müfredat ilerlemesine kaydeden fonksiyon
 */
export async function updateCurriculumProgress(
    userId: string,
    completedTopics: { [subject: string]: string[] },
    profileId?: string
): Promise<void> {
    try {
        const progressPath = profileId 
            ? `users/${userId}/studentProfiles/${profileId}/curriculum_progress/progress`
            : `users/${userId}/curriculum_progress/progress`;
        
        // Mevcut ilerlemeyi oku
        const progressDoc = await db.doc(progressPath).get();
        let existingProgress: { [subject: string]: string[] } = {};
        
        if (progressDoc.exists) {
            existingProgress = progressDoc.data()?.completedTopics || {};
        }
        
        // Yeni tamamlanan konuları ekle
        const updatedProgress = { ...existingProgress };
        
        for (const [subject, topics] of Object.entries(completedTopics)) {
            if (!updatedProgress[subject]) {
                updatedProgress[subject] = [];
            }
            
            // Yeni konuları ekle (duplicates'ten kaçın)
            for (const topic of topics) {
                if (!updatedProgress[subject].includes(topic)) {
                    updatedProgress[subject].push(topic);
                }
            }
        }
        
        // Güncellenmiş ilerlemeyi kaydet
        await db.doc(progressPath).set({
            completedTopics: updatedProgress,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            totalCompletedTopics: Object.values(updatedProgress).flat().length
        }, { merge: true });
        
        console.log('✅ Müfredat ilerlemesi güncellendi:', updatedProgress);
        
    } catch (error) {
        console.error('❌ Müfredat ilerlemesi güncellenirken hata:', error);
        throw error;
    }
}

// =================================================================
// ASENKRON PLAN OLUŞTURMA QUEUE SİSTEMİ
// =================================================================

/**
 * Her 5 dakikada bir çalışan scheduled function
 * Sıradaki plan oluşturma taleplerini işler
 */
export const processPlanGenerationQueue = onSchedule({
    schedule: "every 5 minutes",
    timeZone: "Europe/Istanbul",
    memory: "2GiB",
    timeoutSeconds: 300,
    maxInstances: 1, // Aynı anda sadece 1 instance çalışsın
}, async (event) => {
    console.log('🚀 Plan oluşturma queue işleme başladı...', new Date().toISOString());
    
    try {
        // Sıradaki en eski 2 pending talebi çek (CPU quota'yı aşmamak için)
        const pendingJobs = await db.collection('planGenerationQueue')
            .where('status', '==', 'pending')
            .orderBy('requestTimestamp', 'asc')
            .limit(2)
            .get();

        if (pendingJobs.empty) {
            console.log('📭 İşlenecek plan talebi bulunamadı');
            return;
        }

        console.log(`📋 ${pendingJobs.size} plan talebi işlenecek`);

        // Her bir talebi parallel olarak işle
        const processingPromises = pendingJobs.docs.map(async (doc) => {
            const queueItem = doc.data() as PlanGenerationQueueItem;
            const userId = doc.id;

            try {
                console.log(`🔄 Plan oluşturma başladı: ${userId}${queueItem.profileId ? ` (profil: ${queueItem.profileId})` : ''}`);
                
                // Status'ü processing olarak güncelle
                await doc.ref.update({
                    status: 'processing',
                    processingStartTime: admin.firestore.FieldValue.serverTimestamp(),
                    retryCount: (queueItem.retryCount || 0) + 1
                });

                // Plan oluşturma işlemini gerçekleştir
                // NOT: Bu kısım sonradan implementasyonu tamamlanacak
                // Şimdilik mock implementation ile test ediyoruz
                
                console.log(`🔄 Plan oluşturma işlemi simüle ediliyor: ${userId}`);
                console.log(`📋 Plan parametreleri:`, {
                    profileId: queueItem.profileId,
                    startingPoint: queueItem.startingPoint || 'current',
                    planType: queueItem.planType || 'regular'
                });
                
                // TODO: generateInitialLongTermPlan mantığını internal fonksiyona çıkar
                // Ve burada çağır. Şimdilik placeholder:
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2 saniye simülasyon
                
                // Mock başarılı sonuç
                const planResult = { success: true };

                if (planResult.success) {
                    // Başarılı - status'ü completed yap
                    await doc.ref.update({
                        status: 'completed',
                        processingEndTime: admin.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log(`✅ Plan başarıyla oluşturuldu: ${userId}`);
                } else {
                    throw new Error('Plan oluşturma başarısız oldu');
                }

            } catch (error: any) {
                console.error(`❌ Plan oluşturma hatası (${userId}):`, error);
                
                // Max retry sayısını kontrol et
                const maxRetries = 3;
                const currentRetries = queueItem.retryCount || 0;
                
                if (currentRetries >= maxRetries) {
                    // Max retry aşıldı - failed olarak işaretle
                    await doc.ref.update({
                        status: 'failed',
                        errorMessage: error.message || 'Bilinmeyen hata',
                        processingEndTime: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`🚨 Plan oluşturma tamamen başarısız oldu: ${userId} (${currentRetries} deneme)`);
                } else {
                    // Tekrar denenebilir - pending'e geri döndür
                    await doc.ref.update({
                        status: 'pending',
                        errorMessage: `Hata: ${error.message}. Tekrar denenecek.`
                    });
                    console.log(`🔄 Plan oluşturma tekrar denenecek: ${userId} (${currentRetries + 1}/${maxRetries})`);
                }
            }
        });

        // Tüm işlemlerin tamamlanmasını bekle
        await Promise.all(processingPromises);
        
        console.log('✅ Plan oluşturma queue işleme tamamlandı');

    } catch (error: any) {
                 console.error('❌ Queue işleme genel hatası:', error);
     }
});

/**
 * 🚀 YENİ: Esnek Plan Kurulum - Kullanıcının yerleştirdiği görevleri kaydet
 */
export const savePlacedTasks = onCall(ultraLightOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { dayTasks, totalTasks, profileId } = request.data || {};
    
    if (!dayTasks || !totalTasks) {
        throw new HttpsError('invalid-argument', 'dayTasks ve totalTasks zorunludur.');
    }

    try {
        // Hesap tipini ve profil yollarını belirle
        const userDoc = await db.doc(`users/${userId}`).get();
        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'Kullanıcı hesabı bulunamadı.');
        }
        
        const userData = userDoc.data();
        const accountType = userData?.accountType || 'single';
        
        let planDataPath: string;
        
        if (accountType === 'family') {
            // Aile hesabı modu
            const targetProfileId = profileId || userData?.selectedProfileId;
            if (!targetProfileId) {
                throw new HttpsError('invalid-argument', 'Aile hesabı için profileId belirtilmeli.');
            }
            planDataPath = `users/${userId}/studentProfiles/${targetProfileId}/plan/user_plan`;
        } else {
            // Tek kullanıcı modu
            planDataPath = `users/${userId}/plan/user_plan`;
        }

        // Esnek planı geleneksel plana dönüştür
        const convertedPlan = {
            planTitle: "3 Günlük Başlangıç Planın",
            planType: 'flexible_converted',
            weeklyMotivationMessage: "Harika bir başlangıç yaptın! Kendi planını kurarak kontrolü eline aldın.",
            weeks: [
                {
                    weekNumber: 1,
                    weekTheme: "Kişisel Plan Haftan",
                    days: Object.entries(dayTasks).map(([dayNumber, tasks]) => {
                        const dayNames = ['', 'Pazartesi', 'Salı', 'Çarşamba'];
                        const dayEmojis = ['', '🌅', '⚡', '🎯'];
                        const dayNum = parseInt(dayNumber);
                        
                        return {
                            day: dayNames[dayNum] || `Gün ${dayNum}`,
                            date: new Date(Date.now() + (dayNum - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            dayTheme: `${dayEmojis[dayNum]} ${dayNum}. Gün`,
                            isRestDay: false,
                            dailyTasks: (tasks as any[]).map((task: any) => ({
                                subject: task.subject,
                                topic: task.topic,
                                unit: task.sessionType,
                                durationInMinutes: task.duration,
                                isCompleted: false,
                                taskPurpose: "user_placed",
                                confidenceLevel: task.difficulty === 'beginner' ? 'low' : 'medium',
                                pomodoroSessions: [
                                    {
                                        type: "learn",
                                        description: task.sessionType,
                                        durationInMinutes: task.duration,
                                        isCompleted: false
                                    }
                                ],
                                resource: {
                                    type: "study",
                                    title: `${task.subject} - ${task.topic}`,
                                    url: ""
                                },
                                feynman: {
                                    explanation: `${task.topic} konusunu derinlemesine öğren.`,
                                    analogyPrompt: `${task.topic} konusunu günlük hayattan bir örnekle açıklayabilir misin?`,
                                    quiz: [
                                        {
                                            question: `${task.topic} hakkında temel bir soru`,
                                            options: ["Doğru", "Yanlış", "Kısmen doğru"],
                                            correctAnswer: "Doğru"
                                        }
                                    ]
                                }
                            }))
                        };
                    })
                }
            ],
            weekSummary: {
                totalTopics: totalTasks,
                focusAreas: ["Kişisel Planlama", "Zayıf Alan Güçlendirme"],
                summaryText: `Tebrikler! ${totalTasks} görevi kendi tercihlerinle yerleştirdin. Bu, öğrenme yolculuğundaki ilk büyük adımın!`
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            isFlexiblePlan: false, // Artık geleneksel formata dönüştürüldü
            userPlaced: true // Kullanıcı tarafından yerleştirildi
        };

        // Planı kaydet
        const planDocRef = db.doc(planDataPath);
        await planDocRef.set(convertedPlan);

        // Ana kullanıcı belgesini güncelle
        await db.doc(`users/${userId}`).set({
            hasPlan: true,
            planType: 'flexible_converted',
            planCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastPlanUpdate: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return {
            success: true,
            message: 'Plan başarıyla kaydedildi!',
            totalTasks,
            planType: 'flexible_converted'
        };

    } catch (error: any) {
        console.error('Plan kaydetme hatası:', error);
        throw new HttpsError('internal', `Plan kaydedilemedi: ${error.message}`);
    }
});