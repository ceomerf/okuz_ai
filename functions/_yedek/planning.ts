// src/planning.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import { db, getGenAI, checkCurrentHolidayStatus } from './utils';
import { ClassData, TopicPoolItem } from './types';
import { ACADEMIC_TRACK_SUBJECTS } from './config';
import curriculumData from './maarif_modeli_data.json';

// Remove the duplicate checkHolidayStatus function and use the imported one
// ACADEMIC_HOLIDAYS değişkenini config.ts'den import ediyorum

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
export const generateInitialLongTermPlan = onCall({ timeoutSeconds: 300, memory: '1GiB' }, async (request) => {
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
        learningHabits
    } = profile;

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
    // Grade'i JSON formatına çevir (örn: "10" -> "10. Sınıf")
    const gradeFormatted = grade === 'Mezun' ? '12. Sınıf' : `${grade}. Sınıf`;
    console.log(`Grade dönüştürme: "${grade}" -> "${gradeFormatted}"`);
    
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
        grade,
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
    let planTypeSpecificPrompt = '';
    let holidayPrompt = '';
    
    if (planType === 'holiday') {
        holidayPrompt = `
ÖNEMLİ - TATİL PLANLAMASI:
Şu anda ${holidayStatus.reason} dönemindesiniz. Tatil dönemine uygun bir çalışma planı oluşturun:
1. Daha rahat bir tempo belirle, günde en fazla ${dailyHours - 1} saat çalışma planla.
2. Çalışmayı sabah erken saatlerde yoğunlaştır, öğleden sonra aktivitelere zaman bırak.
3. Tatil ruhuna uygun motivasyon mesajları ekle, ancak disiplini de koru.
4. Her güne en az bir eğlenceli öğrenme aktivitesi ekle (belgesel, eğitici oyun, vb.).`;
    } else if (planType === 'exam_prep') {
        planTypeSpecificPrompt = `
ÖNEMLİ - SINAV HAZIRLIK:
Bu plan yoğun bir sınav hazırlık planıdır:
1. "high" sınav ilgisine sahip (sinavIlgisi) konulara öncelik ver.
2. Günlük çalışmayı en verimli saatlere yoğunlaştır.
3. Her hafta en az 2 tekrar günü ve 1 deneme sınavı planla.
4. Konu tekrarları ve soru çözümleri arasında dengeli bir dağılım yap.`;
    }
    
    // 10. Konu seçimi için AI'a istek gönder
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
${performancePromptSection}

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
            if (finalTopicPool.length < 20) {
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
                
                finalTopicPool = [...finalTopicPool, ...remainingTopics.slice(0, 30 - finalTopicPool.length)];
            }
            
        } catch (error) {
            console.error('Konu seçimi parse edilemedi, varsayılan seçim kullanılacak:', error);
            // Hata durumunda en önemli 30 konuyu seç
            finalTopicPool = topicPoolWithConfidence
                .sort((a, b) => {
                    const importanceValues = { 'high': 3, 'medium': 2, 'low': 1 };
                    const importanceA = importanceValues[a.onem as keyof typeof importanceValues];
                    const importanceB = importanceValues[b.onem as keyof typeof importanceValues];
                    
                    if (importanceA !== importanceB) return importanceB - importanceA;
                    return (b.confidenceWeight || 1) - (a.confidenceWeight || 1);
                })
                .slice(0, 30);
        }
        
        // 11. Ana plan oluşturma isteği
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
${performancePromptSection}

KİŞİSELLEŞTİRİLMİŞ TALİMATLAR:${personalizedInstructions}
${adaptivePlanningRules}

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
  "planTitle": "4 Haftalık Kişiselleştirilmiş Çalışma Planı: [BAŞLIK]",
  "weeks": [
    {
      "weekNumber": 1,
      "days": [
        {
          "day": "Pazartesi",
          "date": "2023-03-20",
          "isRestDay": false,
          "dailyTasks": [
            {
              "subject": "Matematik",
              "topic": "Trigonometri",
              "unit": "Temel Kavramlar",
              "durationInMinutes": 60,
              "isCompleted": false,
              "pomodoroSessions": [
                {
                  "type": "learn",
                  "description": "Video izleme",
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
                  "description": "Alıştırma",
                  "durationInMinutes": 25,
                  "isCompleted": false
                }
              ],
              "resource": {
                "type": "video",
                "title": "Trigonometri Temelleri",
                "url": "https://www.youtube.com/watch?v=example"
              },
              "feynman": {
                "explanation": "Trigonometri, üçgenlerin açıları ve kenarları arasındaki ilişkileri inceler. Örneğin, dik üçgende hipotenüs karesi, diğer iki kenarın karelerinin toplamına eşittir.",
                "analogyPrompt": "Trigonometriyi günlük hayatta nerede görüyoruz?",
                "quiz": [
                  {
                    "question": "Sin 30 derece kaçtır?",
                    "options": ["1/2", "√3/2", "√2/2"],
                    "correctAnswer": "1/2"
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}`;

        // 12. Ana plan için AI'a istek gönder
        const planResult = await model.generateContent(planPrompt);
        const planText = planResult.response.text();
        
        let finalPlan;
        
        // AI yanıtını parse etmeyi dene, hata olursa yedek plan oluştur
        try {
            const cleanedPlanText = planText.replace(/```json|```/g, '').trim();
            finalPlan = JSON.parse(cleanedPlanText);
            
            // Temel doğrulama
            if (!finalPlan.weeks || !Array.isArray(finalPlan.weeks) || finalPlan.weeks.length === 0) {
                throw new Error('Plan hafta bilgisi içermiyor');
            }
            
        } catch (error) {
            console.error('AI yanıtı geçerli JSON değil, yedek plan oluşturuluyor:', error);
            finalPlan = buildValidJsonStructure(planText, finalTopicPool, dailyHours);
        }
        
        // 13. Planı Firestore'a kaydet
        const planDocRef = db.doc(planDataPath);
        await planDocRef.set({
            ...finalPlan,
            planType,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // 14. Ana kullanıcı belgesini güncelle
        await db.doc(`users/${userId}`).set({ 
            hasPlan: true,
            planType,
            planCreatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        return {
            success: true,
            planType,
            holidayInfo: holidayStatus.isHoliday ? {
                isHoliday: true,
                reason: holidayStatus.reason
            } : null,
            message: 'Plan başarıyla oluşturuldu'
        };
        
    } catch (error: any) {
        console.error('Plan oluşturma hatası:', error);
        throw new HttpsError('internal', `Plan oluşturulurken hata: ${error.message}`);
    }
}); 

/**
 * AI destekli akıllı yeniden planlama önerisi
 */
export const suggestTaskReschedule = onCall({ timeoutSeconds: 180, memory: '512MiB' }, async (request) => {
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
export const applyTaskReschedule = onCall({ timeoutSeconds: 120 }, async (request) => {
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