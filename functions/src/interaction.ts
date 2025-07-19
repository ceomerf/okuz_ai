// src/interaction.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import { db, getGenAI, calculateXP, checkLevelUp, validateDateFormat, callGeminiAPI, getDocumentFields } from './utils';
import { checkAndAwardBadges } from './gamification';
import { updateCurriculumProgress } from './planning';
import { StudySessionInput, StudySessionLog, PerformanceStats } from './types';

// 🚀 AKILLI MVP STRATEJISI: Resource Optimizasyonu
// Ultra hafif - Basit CRUD ve kontrol işlemleri
// Kullanılmayan ultraLightOptions kaldırıldı

// Hafif - Orta seviye business logic
const lightOptions = {
  memory: "256MiB" as const,
  timeoutSeconds: 60,
  concurrency: 12,
  minInstances: 0,
  maxInstances: 3
};

// Orta - Firestore heavy operations
const mediumOptions = {
  memory: "512MiB" as const,
  timeoutSeconds: 120,
  concurrency: 5,
  minInstances: 0,
  maxInstances: 2
};

// AI Yoğun - Gemini API çağrıları
const heavyOptions = {
  memory: "1GiB" as const,
  timeoutSeconds: 300,
  concurrency: 2,
  minInstances: 0,
  maxInstances: 1
};

/**
 * 🎯 MVP CORE: Kullanıcının planla etkileşimini yöneten merkezi fonksiyon.
 * ⚡ Optimizasyon: 512MB -> 256MB (AI çağrısı yok, sadece business logic)
 * Artık hem tek kullanıcı hem de aile hesabı sistemini destekler.
 * actionType: 'TASK_COMPLETED' | 'DAY_SKIPPED' | 'TOPIC_FEEDBACK' | 'SOS_BUTTON_PRESSED'
 * payload: ilgili aksiyonun parametreleri
 * profileId: (opsiyonel) aile hesabı sisteminde hangi öğrenci profili için işlem yapılacağı
 */
export const handleUserAction = onCall(lightOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    const userId = request.auth.uid;
    const { actionType, payload, profileId } = request.data || {};
    if (!actionType || !payload) {
        throw new HttpsError('invalid-argument', 'actionType ve payload zorunludur.');
    }

    // Hesap tipini ve profil yollarını belirle
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
        throw new HttpsError('not-found', 'Kullanıcı hesabı bulunamadı.');
    }
    
    const userData = userDoc.data();
    const accountType = userData?.accountType || 'single';
    
    let planPath: string;
    let profilePath: string;
    let gamificationPath: string;
    
    if (accountType === 'family') {
        // Aile hesabı modu
        const targetProfileId = profileId || userData?.selectedProfileId;
        if (!targetProfileId) {
            throw new HttpsError('invalid-argument', 'Aile hesabı için profileId belirtilmeli veya selectedProfileId ayarlanmış olmalı.');
        }
        
        planPath = `users/${userId}/studentProfiles/${targetProfileId}/plan/user_plan`;
        profilePath = `users/${userId}/studentProfiles/${targetProfileId}/privateProfile/profile`;
        gamificationPath = `users/${userId}/studentProfiles/${targetProfileId}/gamification/data`;
        
        console.log(`Aile hesabı modu: İşlem profileId=${targetProfileId} için yapılıyor`);
    } else {
        // Tek kullanıcı modu (geriye uyumluluk)
        planPath = `users/${userId}/plan/user_plan`;
        profilePath = `users/${userId}/privateProfile/profile`;
        gamificationPath = `users/${userId}/gamification/data`;
        
        console.log(`Tek kullanıcı modu: İşlem yapılıyor`);
    }

    // Premium erişim kontrolü
    try {
        const userRef = db.doc(`users/${userId}`);
        const userSnap = await userRef.get();
        
        if (userSnap.exists) {
            const userData = userSnap.data();
            const subscription = userData?.subscription;
            const now = admin.firestore.Timestamp.now();
            
            // Trial durumunu kontrol et
            let isTrialActive = false;
            if (subscription?.trialStartDate && subscription?.trialEndDate) {
                isTrialActive = now.toDate() < subscription.trialEndDate.toDate();
            }
            
            // Premium durumunu kontrol et
            const isPremium = subscription?.subscriptionTier !== 'free' || isTrialActive;
            
            if (!isPremium) {
                throw new HttpsError('permission-denied', 'Bu özelliğe erişim için premium abonelik gereklidir.');
            }
        }
    } catch (error: any) {
        if (error instanceof HttpsError) {
            throw error;
        }
        // Hata durumunda devam et (eski kullanıcılar için)
    }

    // Plan referansı
    const userPlanRef = db.doc(planPath);
    const planSnap = await userPlanRef.get();
    if (!planSnap.exists) {
        throw new HttpsError('not-found', 'Kullanıcıya ait plan bulunamadı.');
    }
    const planData = planSnap.data();

    // Profil referansı
    const privateProfileRef = db.doc(profilePath);
    const privateProfileSnap = await privateProfileRef.get();
    if (!privateProfileSnap.exists) {
        throw new HttpsError('not-found', 'Kullanıcı profili bulunamadı.');
    }
    const profile = privateProfileSnap.data();

    // Gamification referansı
    const gamificationRef = db.doc(gamificationPath);
    let gamificationSnap = await gamificationRef.get();
    let gamification = gamificationSnap.exists ? gamificationSnap.data() : { 
        xp: 0, 
        level: 1, 
        streak: 0, 
        badges: [],
        profileId: accountType === 'family' ? (profileId || userData?.selectedProfileId) : undefined,
        userId: userId
    };

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
            
            // 🚨 ÇOK ÖNEMLİ: Müfredat ilerlemesini güncelle (2. hafta ve sonrası için)
            try {
                if (task && task.subject && task.topic) {
                    const completedTopics = {
                        [task.subject]: [task.topic]
                    };
                    await updateCurriculumProgress(userId, completedTopics, profileId);
                    console.log(`✅ Müfredat ilerlemesi güncellendi: ${task.subject} - ${task.topic}`);
                }
            } catch (progressError) {
                console.error('⚠️ Müfredat ilerlemesi güncellenirken hata (kritik değil):', progressError);
                // Bu hata kritik değil, görev tamamlama devam edebilir
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
        const redistributionPrompt = `
Sen bir eğitim koçusun. Öğrenci aşağıdaki görevleri tamamlayamadı ve bu günü atladı:
${JSON.stringify(incompleteTasks.map(t => `${t.subject}: ${t.topic}`))}

Bu görevleri önümüzdeki günlere dağıtman gerekiyor. Lütfen şu kurallara göre dağıt:
1. Önemli konuları öne al
2. Aynı derse ait konuları aynı güne koymaya çalış
3. Hafta sonları daha yoğun olabilir

Cevabını şu formatta JSON olarak ver:
{
  "tasks": [
    {
      "subject": "Matematik",
      "topic": "Trigonometri",
      "daysFromNow": 2,
      "explanation": "Bu görev X gün sonraya taşındı çünkü..."
    }
  ]
}

Sadece JSON döndür.`;

        try {
            const redistributionResult = await model.generateContent(redistributionPrompt);
            const cleanedResponse = redistributionResult.response.text().trim().replace(/```json|```/g, '');
            const redistributionData = JSON.parse(cleanedResponse);

            if (!redistributionData.tasks || !Array.isArray(redistributionData.tasks)) {
                throw new Error('Beklenmeyen yanıt formatı');
            }

            // Görevleri yeni günlere ekle
            const today = new Date();
            for (const task of redistributionData.tasks) {
                // Yeni tarihi hesapla
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + task.daysFromNow);
                const targetDateString = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

                // Bu tarihteki günü bul
                let targetWeekIndex = -1;
                let targetDayIndex = -1;
                let targetDay = null;

                outerLoop: for (let weekIndex = 0; weekIndex < planData.weeks.length; weekIndex++) {
                    const week = planData.weeks[weekIndex];
                    for (let dayIndex = 0; dayIndex < week.days.length; dayIndex++) {
                        const day = week.days[dayIndex];
                        if (day.date === targetDateString && !day.isRestDay) {
                            targetWeekIndex = weekIndex;
                            targetDayIndex = dayIndex;
                            targetDay = day;
                            break outerLoop;
                        }
                    }
                }

                // Uygun gün bulunamadıysa, bugünden itibaren en yakın çalışma gününü bul
                if (targetWeekIndex === -1) {
                    let daysToAdd = 1;
                    while (daysToAdd < 14) { // En fazla 2 hafta ileriye taşı
                        const nextDate = new Date(today);
                        nextDate.setDate(today.getDate() + daysToAdd);
                        const nextDateString = nextDate.toISOString().split('T')[0];

                        outerLoop: for (let weekIndex = 0; weekIndex < planData.weeks.length; weekIndex++) {
                            const week = planData.weeks[weekIndex];
                            for (let dayIndex = 0; dayIndex < week.days.length; dayIndex++) {
                                const day = week.days[dayIndex];
                                if (day.date === nextDateString && !day.isRestDay) {
                                    targetWeekIndex = weekIndex;
                                    targetDayIndex = dayIndex;
                                    targetDay = day;
                                    break outerLoop;
                                }
                            }
                        }

                        if (targetWeekIndex !== -1) break;
                        daysToAdd++;
                    }
                }

                // Uygun gün bulunduysa, görevi ekle
                if (targetWeekIndex !== -1 && targetDayIndex !== -1 && targetDay) {
                    // Orijinal görevi bul
                    const originalTask = incompleteTasks.find(t => 
                        t.subject === task.subject && t.topic === task.topic
                    );

                    if (originalTask) {
                        // Görevi yeni güne ekle, ancak incompleteTasks'ta orijinalini işaretle
                        originalTask.isReassigned = true;
                        originalTask.reassignedTo = targetDateString;

                        // Yeni görevi ekle (orijinal görevin kopyası)
                        planData.weeks[targetWeekIndex].days[targetDayIndex].dailyTasks.push({
                            ...originalTask,
                            isCompleted: false,
                            isReassigned: false,
                            note: `Bu görev ${date} tarihinden taşındı.`,
                            reassignmentReason: task.explanation
                        });
                    }
                }
            }

            // Orijinal görevleri isReassigned özelliği ile işaretle
            planData.weeks[skippedWeekIndex].days[skippedDayIndex].dailyTasks = 
                planData.weeks[skippedWeekIndex].days[skippedDayIndex].dailyTasks.map(task => {
                    if (!task.isCompleted) {
                        return { ...task, isSkipped: true };
                    }
                    return task;
                });

            // Güncellenmiş planı kaydet
            await userPlanRef.set(planData, { merge: true });

            return {
                success: true,
                message: 'Gün atlandı ve görevler yeniden dağıtıldı.',
                skippedDay: date,
                reassignedTasks: redistributionData.tasks
            };
        } catch (error: any) {
            console.error('Görev yeniden dağıtma hatası:', error);
            throw new HttpsError('internal', `Görevler yeniden dağıtılamadı: ${error.message}`);
        }
    }

    if (actionType === 'TOPIC_FEEDBACK') {
        // payload: { weekIndex, dayIndex, taskIndex, feedback: 'easy'|'difficult', topic }
        const { weekIndex, dayIndex, taskIndex, feedback, topic } = payload;
        if (!feedback || !['easy', 'difficult'].includes(feedback) || !topic) {
            throw new HttpsError('invalid-argument', 'Geçersiz geri bildirim.');
        }

        // İlgili dersi bul
        let relatedSubject = null;
        if (
            planData &&
            planData.weeks &&
            planData.weeks[weekIndex] &&
            planData.weeks[weekIndex].days[dayIndex] &&
            planData.weeks[weekIndex].days[dayIndex].dailyTasks[taskIndex]
        ) {
            relatedSubject = planData.weeks[weekIndex].days[dayIndex].dailyTasks[taskIndex].subject;
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

            // Hedef güne görevi ekle
            if (targetWeekIndex !== -1 && targetDayIndex !== -1) {
                const fullTask = {
                    ...newTask,
                    isCompleted: false,
                    isRecommended: true,
                    recommendationReason: feedback === 'difficult' ? 
                        'Bu konu zor bulunduğu için pekiştirici çalışma.' : 
                        'Bu konu kolay bulunduğu için ileri seviye çalışma.'
                };

                // Feynman bileşenini ekle (yoksa)
                if (!fullTask.feynman) {
                    fullTask.feynman = {
                        explanation: `${topic} konusunda ${feedback === 'difficult' ? 'temel kavramları pekiştirme' : 'ileri seviye uygulama'}.`,
                        analogyPrompt: `${topic} konusunu günlük hayattan bir örnekle açıklayabilir misin?`,
                        quiz: [
                            {
                                question: `${topic} ile ilgili bir soru`,
                                options: ["Seçenek A", "Seçenek B", "Seçenek C"],
                                correctAnswer: "Seçenek A"
                            }
                        ]
                    };
                }

                planData.weeks[targetWeekIndex].days[targetDayIndex].dailyTasks.push(fullTask);
                await userPlanRef.set(planData, { merge: true });

                return {
                    success: true,
                    message: `'${topic}' konusu için yeni bir görev eklendi.`,
                    feedback,
                    newTask: fullTask,
                    targetDate: planData.weeks[targetWeekIndex].days[targetDayIndex].date
                };
            } else {
                throw new HttpsError('internal', 'Görev eklemek için uygun bir gün bulunamadı.');
            }

        } catch (error: any) {
            console.error('Konu geri bildirimi işlenirken hata:', error);
            throw new HttpsError('internal', `Konu geri bildirimi işlenemedi: ${error.message}`);
        }
    }

    if (actionType === 'SOS_BUTTON_PRESSED') {
        // payload: { imageUrl?, questionText?, subject?, topic? }
        const { imageUrl, questionText, subject, topic } = payload;
        
        if (!questionText && !imageUrl) {
            throw new HttpsError('invalid-argument', 'Soru metni veya görüntü gereklidir.');
        }

        try {
            let processedQuestionText = questionText;
            
            // OCR işlemi (görüntü varsa) - şimdilik basit placeholder
            if (imageUrl && !questionText) {
                processedQuestionText = "Matematik sorusu: x^2 + 5x + 6 = 0 denklemini çözünüz.";
                console.log('OCR placeholder kullanılıyor:', processedQuestionText);
            }

            if (!processedQuestionText) {
                // Eğer hem questionText hem de imageUrl boşsa, örnek soru kullan
                processedQuestionText = "Matematik sorusu: 2x + 3 = 7 denklemini çözünüz.";
                console.log('Varsayılan örnek soru kullanılıyor:', processedQuestionText);
            }

            console.log('İşlenecek soru metni:', processedQuestionText);

            // Ultra Basitleştirilmiş AI Prompt
            const sosPrompt = `Bu matematik sorusunu çöz ve JSON formatında yanıt ver:

Soru: ${processedQuestionText}

JSON formatında yanıt ver:
{
  "questionAnalysis": {"identifiedSubject": "Matematik", "identifiedTopic": "Denklemler"},
  "stepByStepSolution": [{"step": 1, "explanation": "Denklemi çöz", "calculation": "x = 2"}],
  "conceptualDeepDive": {"title": "Denklem Çözme", "explanation": "Denklem çözme yöntemi", "formula": "ax + b = 0"},
  "commonPitfalls": [{"mistake": "İşaret hatası", "description": "Dikkat edilmesi gereken nokta"}],
  "actionablePrescription": {"title": "Öneri", "recommendation": "Daha fazla pratik yap", "task": {"type": "practice", "description": "Benzer sorular çöz", "title": "Pratik Yap", "url": "https://example.com"}}
}`;

            console.log('SOS AI prompt gönderiliyor...');
            const sosResult = await model.generateContent(sosPrompt);
            const rawResponse = sosResult.response.text();
            console.log('AI ham yanıtı:', rawResponse.substring(0, 500) + '...');
            
            const cleanedResponse = rawResponse.trim().replace(/```json\n?|```\n?/g, '');
            console.log('Temizlenmiş yanıt:', cleanedResponse.substring(0, 500) + '...');
            
            let sosData;
            try {
                sosData = JSON.parse(cleanedResponse);
            } catch (parseError) {
                console.error('JSON parse hatası:', parseError);
                console.error('Parse edilemeyen içerik:', cleanedResponse);
                
                // Fallback: Sabit bir yapı döndür
                console.log('Fallback SOS yanıtı kullanılıyor...');
                sosData = {
                    questionAnalysis: {
                        identifiedSubject: subject || "Matematik",
                        identifiedTopic: topic || "Genel"
                    },
                    stepByStepSolution: [
                        {
                            step: 1,
                            explanation: "Sorunu analiz ediyoruz ve çözüm yolunu belirliyoruz.",
                            calculation: "Adım adım çözüm"
                        }
                    ],
                    conceptualDeepDive: {
                        title: "Temel Kavram",
                        explanation: "Bu soruyu çözmek için gerekli temel kavramları açıklayalım.",
                        formula: "Temel formül"
                    },
                    commonPitfalls: [
                        {
                            mistake: "Yaygın Hata",
                            description: "Bu tür sorularda öğrencilerin sık yaptığı hatalar."
                        }
                    ],
                    actionablePrescription: {
                        title: "Önerim",
                        recommendation: "Bu konuyu pekiştirmek için daha fazla pratik yapmanızı öneririm.",
                        task: {
                            type: "practice",
                            description: "Benzer sorular çözerek konuyu pekiştirin.",
                            title: "Pratik Yapın",
                            url: "https://example.com"
                        }
                    }
                };
            }

            // Sonucu validate et
            if (!sosData.questionAnalysis || !sosData.stepByStepSolution || !sosData.conceptualDeepDive || !sosData.commonPitfalls || !sosData.actionablePrescription) {
                console.error('Eksik alanlar tespit edildi:', {
                    hasQuestionAnalysis: !!sosData.questionAnalysis,
                    hasStepByStepSolution: !!sosData.stepByStepSolution,
                    hasConceptualDeepDive: !!sosData.conceptualDeepDive,
                    hasCommonPitfalls: !!sosData.commonPitfalls,
                    hasActionablePrescription: !!sosData.actionablePrescription
                });
                throw new Error('AI yanıtı beklenen formatı içermiyor');
            }

            // SOS yardım kaydı
            const sosDocRef = await db.collection(`users/${userId}/sos_helps`).add({
                ...sosData,
                originalQuestion: processedQuestionText,
                providedSubject: subject,
                providedTopic: topic,
                hasImage: !!imageUrl,
                imageUrl: imageUrl || null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                timestamp: Date.now()
            });

            return {
                success: true,
                message: 'SOS analizi tamamlandı.',
                sosData,
                sosId: sosDocRef.id
            };

        } catch (error: any) {
            console.error('SOS analizi sırasında hata:', error);
            throw new HttpsError('internal', `SOS analizi başarısız: ${error.message}`);
        }
    }

    throw new HttpsError('invalid-argument', 'Geçersiz actionType. Desteklenen değerler: TASK_COMPLETED, DAY_SKIPPED, TOPIC_FEEDBACK, SOS_BUTTON_PRESSED');
});

/**
 * Disiplinli Esneklik Zaman Takibi Sistemi
 * Hem otomatik zamanlayıcı hem de manuel çalışma kayıtlarını işler
 * Otomatik kayıtlar daha fazla XP verir (1.5x vs 0.75x)
 */
export const logStudySession = onCall(mediumOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }

    const userId = request.auth.uid;
    const sessionData: StudySessionInput = request.data || {};

    // Parametre doğrulaması
    const { durationInMinutes, subject, topic, isManualEntry, date } = sessionData;

    if (typeof durationInMinutes !== 'number' || durationInMinutes <= 0) {
        throw new HttpsError('invalid-argument', 'durationInMinutes pozitif bir sayı olmalıdır.');
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
        throw new HttpsError('invalid-argument', 'subject geçerli bir string olmalıdır.');
    }

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
        throw new HttpsError('invalid-argument', 'topic geçerli bir string olmalıdır.');
    }

    if (typeof isManualEntry !== 'boolean') {
        throw new HttpsError('invalid-argument', 'isManualEntry boolean değeri olmalıdır.');
    }

    if (!date || typeof date !== 'string' || !validateDateFormat(date)) {
        throw new HttpsError('invalid-argument', 'date YYYY-MM-DD formatında geçerli bir tarih olmalıdır.');
    }

    // Süre limiti kontrolü (maksimum 12 saat = 720 dakika)
    if (durationInMinutes > 720) {
        throw new HttpsError('invalid-argument', 'Çalışma süresi maksimum 12 saat (720 dakika) olabilir.');
    }

    try {
        // XP hesaplama
        const xpCalculation = calculateXP(durationInMinutes, isManualEntry);
        const timestamp = Date.now();

        // Transaction ile tüm güncellemeleri atomik olarak yap
        const result = await db.runTransaction(async (transaction) => {
            // Gamification dökümanını oku
                            const gamificationRef = db.doc(`users/${userId}/gamification/data`);
            const gamificationSnap = await transaction.get(gamificationRef);
            
            let gamificationData = gamificationSnap.exists ? gamificationSnap.data() : { 
                xp: 0, 
                level: 1, 
                streak: 0, 
                badges: [],
                totalStudyMinutes: 0
            };

            const oldXP = gamificationData.xp || 0;
            const newXP = oldXP + xpCalculation.xpToAdd;
            const levelInfo = checkLevelUp(oldXP, newXP);

            // Performance dökümanını oku
            const performanceRef = db.doc(`users/${userId}/performance`);
            const performanceSnap = await transaction.get(performanceRef);
            
            let performanceData: PerformanceStats = performanceSnap.exists ? performanceSnap.data() as PerformanceStats : {
                totalStudyTimeMinutes: 0,
                weeklyStudyTimeMinutes: 0,
                monthlyStudyTimeMinutes: 0,
                lastUpdated: timestamp,
                subjectBreakdown: {}
            };

            // Performance Analytics dökümanını oku (yeni analiz verileri için)
            const performanceAnalyticsRef = db.doc(`users/${userId}/performance_analytics`);
            const performanceAnalyticsSnap = await transaction.get(performanceAnalyticsRef);
            
            let analyticsData = performanceAnalyticsSnap.exists ? performanceAnalyticsSnap.data() : {
                totalMinutesStudied: 0,
                totalManualMinutes: 0,
                totalFocusMinutes: 0,
                sessionsBySubject: {},
                timeBySubject: {},
                totalSessions: 0,
                averageSessionDuration: 0,
                lastUpdated: timestamp
            };

            // Analytics log dökümanı oluştur
            const logRef = db.collection(`users/${userId}/analytics/daily_logs`).doc();
            const logData: StudySessionLog = {
                subject: subject.trim(),
                topic: topic.trim(),
                durationInMinutes,
                xpGained: xpCalculation.xpToAdd,
                timestamp,
                isManualEntry,
                date,
                userId
            };

            // Güncellemeleri transaction ile yap
            transaction.set(logRef, logData);

            // Gamification güncelle
            transaction.set(gamificationRef, {
                ...gamificationData,
                xp: newXP,
                level: levelInfo.newLevel,
                totalStudyMinutes: (gamificationData.totalStudyMinutes || 0) + durationInMinutes,
                lastStudySession: timestamp
            }, { merge: true });

            // Performance güncelle
            const updatedSubjectBreakdown = { ...performanceData.subjectBreakdown };
            updatedSubjectBreakdown[subject.trim()] = (updatedSubjectBreakdown[subject.trim()] || 0) + durationInMinutes;

            transaction.set(performanceRef, {
                totalStudyTimeMinutes: performanceData.totalStudyTimeMinutes + durationInMinutes,
                weeklyStudyTimeMinutes: performanceData.weeklyStudyTimeMinutes + durationInMinutes,
                monthlyStudyTimeMinutes: performanceData.monthlyStudyTimeMinutes + durationInMinutes,
                lastUpdated: timestamp,
                subjectBreakdown: updatedSubjectBreakdown
            }, { merge: true });

            // Performance Analytics güncelle (AI için detaylı analiz verileri)
            const subjectKey = subject.trim();
            
            // Aggregate verileri hesapla
            const newTotalMinutes = analyticsData.totalMinutesStudied + durationInMinutes;
            const newTotalManualMinutes = analyticsData.totalManualMinutes + (isManualEntry ? durationInMinutes : 0);
            const newTotalFocusMinutes = analyticsData.totalFocusMinutes + (isManualEntry ? 0 : durationInMinutes);
            const newTotalSessions = analyticsData.totalSessions + 1;
            
            // Ders bazında session sayısını güncelle
            const updatedSessionsBySubject = { ...analyticsData.sessionsBySubject };
            updatedSessionsBySubject[subjectKey] = (updatedSessionsBySubject[subjectKey] || 0) + 1;
            
            // Ders bazında toplam süreyi güncelle
            const updatedTimeBySubject = { ...analyticsData.timeBySubject };
            updatedTimeBySubject[subjectKey] = (updatedTimeBySubject[subjectKey] || 0) + durationInMinutes;
            
            // Ortalama session süresini hesapla
            const newAverageSessionDuration = Math.round(newTotalMinutes / newTotalSessions);

            transaction.set(performanceAnalyticsRef, {
                totalMinutesStudied: newTotalMinutes,
                totalManualMinutes: newTotalManualMinutes,
                totalFocusMinutes: newTotalFocusMinutes,
                sessionsBySubject: updatedSessionsBySubject,
                timeBySubject: updatedTimeBySubject,
                totalSessions: newTotalSessions,
                averageSessionDuration: newAverageSessionDuration,
                lastUpdated: timestamp,
                // Zorluk analizi için ek veriler
                lastSessionDuration: durationInMinutes,
                lastSessionSubject: subjectKey,
                lastSessionType: isManualEntry ? 'manual' : 'focus'
            }, { merge: true });

            return {
                logId: logRef.id,
                xpGained: xpCalculation.xpToAdd,
                totalXP: newXP,
                levelInfo,
                studyType: isManualEntry ? 'Manuel Kayıt' : 'Otomatik Zamanlayıcı',
                multiplier: xpCalculation.multiplier
            };
        });

        console.log(`Çalışma seansı kaydedildi - Kullanıcı: ${userId}, Süre: ${durationInMinutes}dk, XP: ${result.xpGained}, Tip: ${result.studyType}`);

        return {
            success: true,
            message: 'Çalışma seansı başarıyla kaydedildi.',
            data: result
        };

    } catch (error: any) {
        console.error('Çalışma seansı kaydedilirken hata:', error);
        throw new HttpsError('internal', `Çalışma seansı kaydedilemedi: ${error.message}`);
    }
}); 

/**
 * AI Sokrates - Canlı Sınav Modu
 * Kullanıcının bir konuya hakim olup olmadığını sorgulama tekniğiyle test eder
 */
export const startSocraticDialogue = onCall(heavyOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { subject, topic, conversationHistory = [], userMessage } = request.data || {};
    
    if (!subject || !topic) {
        throw new HttpsError('invalid-argument', 'Ders ve konu bilgileri zorunludur.');
    }

    try {
        // Kullanıcı profilini al
        const privateProfileRef = db.doc(`users/${userId}/privateProfile/profile`);
        const profileSnap = await privateProfileRef.get();
        if (!profileSnap.exists) {
            throw new HttpsError('not-found', 'Kullanıcı profili bulunamadı.');
        }
        const profile = profileSnap.data();

        // AI motoru
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let prompt = '';
        
        if (conversationHistory.length === 0) {
            // İlk soru - Sokrates rolü tanımla
            prompt = `Sen, efsanevi Sokrates'in öğretim yöntemini kullanan bir ${subject} öğretmenisin. 

GÖREV: "${topic}" konusunda bir YKS öğrencisinin gerçek anlayışını test et.

KURALLALAR:
1. ASLA direkt bilgi verme. Sadece sorular sor.
2. Öğrencinin cevaplarındaki mantık hatalarını, onlara doğrudan söylemek yerine, sorularla fark ettir.
3. Basit tanımlardan başla, sonra derinleştir.
4. Eğer yanlış cevap verirse, "Yanlış!" deme. Bunun yerine "Peki şunu düşün..." gibi yönlendirici sorular sor.
5. Her sorun maksimum 2 cümle olsun.
6. Öğrencinin seviyesi: ${profile.educationLevel || 'Lise'} ${profile.grade || '12'}. sınıf

Öğrenci Profili:
- Hedef: ${profile.targetScore || 'YKS'} 
- Zayıf Alanlar: ${profile.weakSubjects?.join(', ') || 'Belirtilmemiş'}

İlk sorunla başla. Dostça ama sorgulayıcı ol:`;

        } else {
            // Devam eden konuşma - geçmişi analiz et
            const historyText = conversationHistory.map((msg: any) => 
                `${msg.type === 'ai' ? 'Öğretmen' : 'Öğrenci'}: ${msg.content}`
            ).join('\n');
            
            prompt = `Sen Sokrates yöntemini kullanan bir ${subject} öğretmenisin. "${topic}" konusunu öğretiyorsun.

ŞİMDİYE KADARKI KONUŞMA:
${historyText}

ÖĞRENCİNİN SON CEVABI: "${userMessage}"

GÖREV: 
1. Öğrencinin son cevabını analiz et
2. Anlayışında eksik/hatalı nokta varsa, ona doğrudan söyleme
3. Bunun yerine, o eksikliği fark etmesini sağlayacak yeni bir soru sor
4. Eğer doğru anlıyorsa, konuyu biraz daha derinleştir
5. Maksimum 2 cümle

Bir sonraki sorunla devam et:`;
        }

        console.log('Sokrates AI prompt gönderiliyor...');
        const result = await model.generateContent(prompt);
        const aiResponse = result.response.text().trim();
        
        // Konuşma geçmişine ekle
        const updatedHistory = [...conversationHistory];
        if (userMessage) {
            updatedHistory.push({ type: 'user', content: userMessage, timestamp: Date.now() });
        }
        updatedHistory.push({ type: 'ai', content: aiResponse, timestamp: Date.now() });

        // Konuşmayı kaydet
        const dialogueRef = await db.collection(`users/${userId}/socratic_dialogues`).add({
            subject,
            topic,
            conversationHistory: updatedHistory,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        });

        console.log('Sokrates diyalogu kaydedildi:', dialogueRef.id);

        return {
            success: true,
            aiResponse,
            conversationHistory: updatedHistory,
            dialogueId: dialogueRef.id,
            message: 'Sokrates diyalogu devam ediyor'
        };

    } catch (error: any) {
        console.error('Sokrates diyalogu hatası:', error);
        throw new HttpsError('internal', `Sokrates diyalogu başarısız: ${error.message}`);
    }
});

/**
 * Sokrates Diyalogunu Sonlandır ve Değerlendirme Yap
 */
export const endSocraticDialogue = onCall(heavyOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { dialogueId, conversationHistory } = request.data || {};
    
    if (!dialogueId || !conversationHistory) {
        throw new HttpsError('invalid-argument', 'Diyalog ID ve konuşma geçmişi zorunludur.');
    }

    try {
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Değerlendirme prompt'u
        const historyText = conversationHistory.map((msg: any) => 
            `${msg.type === 'ai' ? 'Öğretmen' : 'Öğrenci'}: ${msg.content}`
        ).join('\n');

        const evaluationPrompt = `Bu Sokrates diyalogunu analiz et ve öğrencinin performansını değerlendir:

KONUŞMA:
${historyText}

GÖREV: Aşağıdaki JSON formatında değerlendirme yap:

{
  "comprehensionLevel": "beginner|intermediate|advanced",
  "strongPoints": ["Güçlü olduğu konular"],
  "weakPoints": ["Zayıf olduğu konular"], 
  "overallScore": 85,
  "feedback": "Kişisel geri bildirim",
  "nextSteps": ["Önerilen çalışma adımları"],
  "conceptualGaps": ["Kavramsal eksiklikler"],
  "encouragement": "Motivasyonel mesaj"
}`;

        const evaluationResult = await model.generateContent(evaluationPrompt);
        const evaluationText = evaluationResult.response.text().trim();
        
        let evaluation;
        try {
            evaluation = JSON.parse(evaluationText.replace(/```json\n?|```\n?/g, ''));
        } catch (parseError) {
            console.error('Değerlendirme JSON parse hatası:', parseError);
            // Fallback evaluation
            evaluation = {
                comprehensionLevel: "intermediate",
                strongPoints: ["Aktif katılım gösterdi"],
                weakPoints: ["Daha fazla pratik gerekli"],
                overallScore: 75,
                feedback: "İyi bir performans sergiledi, gelişime açık alanlar var.",
                nextSteps: ["Konuyu tekrar et", "Benzer sorular çöz"],
                conceptualGaps: ["Temel kavramları pekiştir"],
                encouragement: "Harika bir başlangıç! Devam et!"
            };
        }

        // Diyalogu güncelle
        await db.doc(`users/${userId}/socratic_dialogues/${dialogueId}`).update({
            status: 'completed',
            evaluation,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // XP ver (diyalog kalitesine göre)
        const gamificationRef = db.doc(`users/${userId}/gamification/data`);
        const gamSnap = await gamificationRef.get();
        let gamification = gamSnap.exists ? gamSnap.data() : { xp: 0, level: 1, streak: 0, badges: [] };
        
        const xpReward = Math.floor(evaluation.overallScore / 10) * 5; // Score'a göre XP
        gamification.xp += xpReward;
        await gamificationRef.set(gamification, { merge: true });

        return {
            success: true,
            evaluation,
            xpRewarded: xpReward,
            message: 'Sokrates diyalogu tamamlandı!'
        };

    } catch (error: any) {
        console.error('Sokrates değerlendirme hatası:', error);
        throw new HttpsError('internal', `Değerlendirme başarısız: ${error.message}`);
    }
}); 

/**
 * Curriculum data'da belirtilen konu için sınıf seviyesini bulur
 */
function findTopicGradeLevel(curriculumData: any[], subject: string, topic: string): string | null {
    for (const gradeData of curriculumData) {
        const gradeLevel = gradeData.sinifDuzeyi;
        
        for (const course of gradeData.dersler || []) {
            if (course.dersAdi && course.dersAdi.toLowerCase().includes(subject.toLowerCase())) {
                for (const unit of course.uniteVeTemalar || []) {
                    for (const topicData of unit.konular || []) {
                        if (topicData.konuAdi && 
                            (topicData.konuAdi.toLowerCase().includes(topic.toLowerCase()) ||
                             topic.toLowerCase().includes(topicData.konuAdi.toLowerCase()))) {
                            return gradeLevel;
                        }
                    }
                }
            }
        }
    }
    return null;
}

/**
 * AI Pathfinder - Kişiselleştirilmiş Öğrenme Patikası
 * Kullanıcının öğrenme stiline ve seviyesine göre özel öğrenme rotası oluşturur
 */
export const getPersonalizedPath = onCall(heavyOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { topic, subject, preferredDuration = 60, enforceGradeConsistency = false, validateResources = false } = request.data || {};
    
    if (!topic || !subject) {
        throw new HttpsError('invalid-argument', 'Konu ve ders bilgileri zorunludur.');
    }

    try {
        // Kullanıcı profilini al
        const privateProfileRef = db.doc(`users/${userId}/privateProfile/profile`);
        const profileSnap = await privateProfileRef.get();
        if (!profileSnap.exists) {
            throw new HttpsError('not-found', 'Kullanıcı profili bulunamadı.');
        }
        const profile = profileSnap.data();

        // İçerik tutarlılığı kontrolü
        let gradeConsistencyInfo = '';
        if (enforceGradeConsistency) {
            const curriculumData = require('./maarif_modeli_data.json');
            const userGrade = profile.grade || '12';
            
            // Konunun müfredattaki sınıf seviyesini bul
            const topicGradeLevel = findTopicGradeLevel(curriculumData, subject, topic);
            
            if (topicGradeLevel && topicGradeLevel !== userGrade) {
                gradeConsistencyInfo = `\n\nÖNEMLİ UYARI: "${topic}" konusu aslında ${topicGradeLevel}. sınıf müfredatında yer almaktadır, ancak kullanıcı ${userGrade}. sınıf seviyesindedir. Bu durumu dikkate alarak içeriği uygun seviyede hazırla.`;
                
                // Eğer çok büyük seviye farkı varsa hata fırlat
                const userGradeNum = parseInt(userGrade.replace(/\D/g, ''));
                const topicGradeNum = parseInt(topicGradeLevel.replace(/\D/g, ''));
                
                if (Math.abs(userGradeNum - topicGradeNum) > 2) {
                    console.warn(`Seviye uyarısı: ${topic} konusu ${topicGradeLevel} seviyesinde, kullanıcı ${userGrade} seviyesinde`);
                }
            }
        }

        // Son performans verilerini al
        const performanceRef = db.collection(`users/${userId}/study_logs`).orderBy('timestamp', 'desc').limit(10);
        const performanceSnap = await performanceRef.get();
        const performanceData = performanceSnap.docs.map(doc => doc.data());

        // Gamification verilerini al (seviye, zayıflıklar)
        const gamificationRef = db.doc(`users/${userId}/gamification/data`);
        const gamSnap = await gamificationRef.get();
        const gamData = gamSnap.exists ? gamSnap.data() : {};

        // AI motoru
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Kapsamlı profil analizi
        const userAnalysis = {
            learningStyle: profile.learningStyle || 'görsel',
            currentLevel: profile.grade || '12',
            targetScore: profile.targetScore || 'YKS',
            weakSubjects: profile.weakSubjects || [],
            strongSubjects: profile.strongSubjects || [],
            dailyStudyHours: profile.dailyGoal || 4,
            preferredStudyTimes: profile.preferredStudyTimes || ['akşam'],
            recentPerformance: performanceData.slice(0, 3),
            currentXP: gamData.xp || 0,
            level: gamData.level || 1,
            badges: gamData.badges || []
        };

        console.log('AI Pathfinder için kullanıcı analizi:', userAnalysis);

        // Kaynak arama ve kürasyon prompt'u
        const pathfinderPrompt = `Sen, dünyanın en yetenekli eğitim danışmanı ve kaynak küratörüsün. 

GÖREV: "${subject}" dersinin "${topic}" konusu için ${preferredDuration} dakikalık KİŞİSELLEŞTİRİLMİŞ öğrenme patikası oluştur.

ÖĞRENCİ PROFİLİ:
- Öğrenme Stili: ${userAnalysis.learningStyle}
- Seviye: ${userAnalysis.currentLevel}. sınıf 
- Hedef: ${userAnalysis.targetScore}
- Zayıf Alanlar: ${userAnalysis.weakSubjects.join(', ')}
- Güçlü Alanlar: ${userAnalysis.strongSubjects.join(', ')}
- Günlük Çalışma: ${userAnalysis.dailyStudyHours} saat
- Tercih Zamanları: ${userAnalysis.preferredStudyTimes.join(', ')}
- Mevcut Seviye: Level ${userAnalysis.level} (${userAnalysis.currentXP} XP)

SON PERFORMANS:
${userAnalysis.recentPerformance.map((perf, i) => 
  `${i+1}. ${perf.subject || 'Bilinmiyor'} - ${perf.duration || 0} dk - ${perf.rating || 3}/5 puan`
).join('\n')}

ÖZEL TALİMATLAR:
1. Bu öğrencinin öğrenme stiline (${userAnalysis.learningStyle}) MÜKEMMEL uyum sağla
2. Zayıf alanlarını güçlendirecek bağlantılar kur
3. Her adımda neden o kaynağı seçtiğini açıkla
4. Gerçekçi zaman dilimleri ver
5. Motivasyonel öğeler ekle
${validateResources ? '6. SADECE gerçek, erişilebilir ve çalışan kaynaklar öner. Placeholder URL\'ler kullanma.' : ''}
${gradeConsistencyInfo}

Aşağıdaki JSON formatında yanıt ver:

{
  "pathTitle": "Kişiselleştirilmiş başlık",
  "totalDuration": ${preferredDuration},
  "difficultyLevel": "kolay|orta|zor",
  "personalizedReason": "Bu patikayi neden bu şekilde tasarladığımızın açıklaması",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Adım başlığı",
      "type": "video|article|practice|interactive",
      "duration": 15,
      "description": "Bu adımda ne yapılacak",
      "resourceName": "Khan Academy - Türev Temelleri",
      "resourceUrl": "https://tr.khanacademy.org/...",
      "specificGuidance": "7:30-12:45 arasını izle, formülleri not al",
      "whyThisResource": "Görsel öğrenme stilin için ideal animasyonlar",
      "prerequisite": null,
      "expectedOutcome": "Türev kavramını görsel olarak anlayacaksın"
    }
  ],
  "alternativeResources": [
    {
      "title": "Plan B Kaynakları",
      "resources": ["YouTube - FenBilgisi", "Bilgiportal"]
    }
  ],
  "nextTopicSuggestion": "Türev Alma Kuralları",
  "motivationalNote": "Kişisel motivasyon mesajı",
  "estimatedXP": 120
}

KAYNAK ÖNERİLERİ:
- Khan Academy (Türkçe)
- YouTube: FenBilgisi, TonguçAkademi, MEB EBA
- Websites: bilgiportal.com, matematikçi.com
- Interaktif: GeoGebra, Desmos
- Kitaplar: Palme, Karekök, FDD

ÖNEMLİ: Gerçek, erişilebilir kaynaklar öner. URL'ler placeholder olabilir ama kaynak isimleri gerçek olmalı.`;

        console.log('AI Pathfinder prompt gönderiliyor...');
        const result = await model.generateContent(pathfinderPrompt);
        const aiResponse = result.response.text().trim();

        let learningPath;
        try {
            learningPath = JSON.parse(aiResponse.replace(/```json\n?|```\n?/g, ''));
        } catch (parseError) {
            console.error('Pathfinder JSON parse hatası:', parseError);
            console.log('AI Raw Response:', aiResponse);
            
            // Fallback path
            learningPath = {
                pathTitle: `${topic} - Kişisel Öğrenme Rotası`,
                totalDuration: preferredDuration,
                difficultyLevel: "orta",
                personalizedReason: `${userAnalysis.learningStyle} öğrenme stilinize uygun olarak hazırladık.`,
                steps: [
                    {
                        stepNumber: 1,
                        title: "Konuya Giriş",
                        type: "video",
                        duration: 20,
                        description: "Temel kavramları öğren",
                        resourceName: "Khan Academy Türkçe",
                        resourceUrl: validateResources ? "https://tr.khanacademy.org/math" : "https://tr.khanacademy.org",
                        specificGuidance: "Baştan sona izle ve notlar al",
                        whyThisResource: "Sistemli ve görsel anlatım",
                        prerequisite: null,
                        expectedOutcome: "Temel kavramları anlayacaksın"
                    },
                    {
                        stepNumber: 2,
                        title: "Pratik Yapma",
                        type: "practice",
                        duration: preferredDuration - 20,
                        description: "Örnekler üzerinde çalış",
                        resourceName: validateResources ? "MEB EBA Matematik" : "Online Alıştırmalar",
                        resourceUrl: validateResources ? "https://eba.gov.tr" : "#",
                        specificGuidance: "Kolay sorulardan başla",
                        whyThisResource: "Uygulama ile pekiştirme",
                        prerequisite: "Adım 1",
                        expectedOutcome: "Konuyu pratik olarak kavrayacaksın"
                    }
                ],
                alternativeResources: [
                    {
                        title: "Alternatif Video Kaynakları",
                        resources: validateResources ? 
                            ["MEB EBA TV", "Khan Academy Türkçe", "TonguçAkademi YouTube"] : 
                            ["YouTube FenBilgisi", "TonguçAkademi", "Matematik Kanalları"]
                    }
                ],
                nextTopicSuggestion: "İleri konular",
                motivationalNote: "Harika gidiyorsun! Devam et!",
                estimatedXP: 100
            };
        }

        // Öğrenme rotasını kaydet
        const pathRef = await db.collection(`users/${userId}/learning_paths`).add({
            ...learningPath,
            subject,
            topic,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active',
            progress: 0,
            completedSteps: []
        });

        console.log('AI Pathfinder rotası kaydedildi:', pathRef.id);

        return {
            success: true,
            learningPath,
            pathId: pathRef.id,
            message: 'Kişiselleştirilmiş öğrenme rotası hazırlandı!'
        };

    } catch (error: any) {
        console.error('AI Pathfinder hatası:', error);
        throw new HttpsError('internal', `Öğrenme rotası oluşturulamadı: ${error.message}`);
    }
});

/**
 * Öğrenme Rotası Adımını Tamamla
 */
export const completePathStep = onCall(heavyOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { pathId, stepNumber, rating, notes } = request.data || {};
    
    if (!pathId || !stepNumber) {
        throw new HttpsError('invalid-argument', 'Rota ID ve adım numarası zorunludur.');
    }

    try {
        const pathRef = db.doc(`users/${userId}/learning_paths/${pathId}`);
        const pathSnap = await pathRef.get();
        
        if (!pathSnap.exists) {
            throw new HttpsError('not-found', 'Öğrenme rotası bulunamadı.');
        }

        const pathData = pathSnap.data();
        const completedSteps = pathData.completedSteps || [];
        
        // Adımı tamamla
        if (!completedSteps.includes(stepNumber)) {
            completedSteps.push(stepNumber);
            const progress = (completedSteps.length / pathData.steps.length) * 100;

            await pathRef.update({
                completedSteps,
                progress,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                [`step_${stepNumber}_completed_at`]: admin.firestore.FieldValue.serverTimestamp(),
                [`step_${stepNumber}_rating`]: rating || null,
                [`step_${stepNumber}_notes`]: notes || null
            });

            // XP ver
            const xpReward = Math.floor((pathData.estimatedXP || 100) / pathData.steps.length);
            const gamificationRef = db.doc(`users/${userId}/gamification/data`);
            const gamSnap = await gamificationRef.get();
            let gamification = gamSnap.exists ? gamSnap.data() : { xp: 0, level: 1, streak: 0, badges: [] };
            
            gamification.xp += xpReward;
            await gamificationRef.set(gamification, { merge: true });

            // Rota tamamlandı mı?
            if (progress >= 100) {
                await pathRef.update({
                    status: 'completed',
                    completedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // Bonus XP
                const bonusXP = Math.floor((pathData.estimatedXP || 100) * 0.2);
                gamification.xp += bonusXP;
                await gamificationRef.set(gamification, { merge: true });

                return {
                    success: true,
                    progress: 100,
                    xpRewarded: xpReward + bonusXP,
                    pathCompleted: true,
                    message: 'Tebrikler! Öğrenme rotasını tamamladın!'
                };
            }

            return {
                success: true,
                progress,
                xpRewarded: xpReward,
                pathCompleted: false,
                message: 'Adım tamamlandı! Bir sonraki adıma geçebilirsin.'
            };
        }

        return {
            success: true,
            message: 'Bu adım zaten tamamlanmış.'
        };

    } catch (error: any) {
        console.error('Adım tamamlama hatası:', error);
        throw new HttpsError('internal', `Adım tamamlanamadı: ${error.message}`);
    }
});

/**
 * Kullanıcının Aktif Öğrenme Rotalarını Getir
 */
export const getUserLearningPaths = onCall(heavyOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { limit = 10, status = 'active' } = request.data || {};

    try {
        const pathsRef = db.collection(`users/${userId}/learning_paths`)
            .where('status', '==', status)
            .orderBy('createdAt', 'desc')
            .limit(limit);
        
        const pathsSnap = await pathsRef.get();
        const paths = pathsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return {
            success: true,
            paths,
            count: paths.length
        };

    } catch (error: any) {
        console.error('Öğrenme rotaları getirme hatası:', error);
        throw new HttpsError('internal', `Rotalar getirilemedi: ${error.message}`);
    }
}); 

/**
 * Sınav Simülatörü ve Stratejisti - Maç Öncesi Strateji
 * Kullanıcının geçmiş performansına göre sınav öncesi kişisel strateji üretir
 */
export const getPreExamStrategy = onCall(heavyOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { examType = 'TYT', duration = 180, subjects = [] } = request.data || {};

    try {
        // Kullanıcı profilini al
        const privateProfileRef = db.doc(`users/${userId}/privateProfile/profile`);
        const profileSnap = await privateProfileRef.get();
        if (!profileSnap.exists) {
            throw new HttpsError('not-found', 'Kullanıcı profili bulunamadı.');
        }
        const profile = profileSnap.data();

        // Son 10 sınav performansını al
        const examsRef = db.collection(`users/${userId}/exam_results`)
            .orderBy('timestamp', 'desc')
            .limit(10);
        const examsSnap = await examsRef.get();
        const recentExams = examsSnap.docs.map(doc => doc.data());

        // Son çalışma verilerini al (performans analizi için)
        const studyRef = db.collection(`users/${userId}/study_logs`)
            .orderBy('timestamp', 'desc')
            .limit(20);
        const studySnap = await studyRef.get();
        const recentStudy = studySnap.docs.map(doc => doc.data());

        // Gamification verilerini al
        const gamificationRef = db.doc(`users/${userId}/gamification/data`);
        const gamSnap = await gamificationRef.get();
        const gamData = gamSnap.exists ? gamSnap.data() : {};

        // AI motoru
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Performans analizi
        const performanceAnalysis = {
            name: profile.name || 'Değerli öğrenci',
            targetScore: profile.targetScore || 'YKS',
            strongSubjects: profile.strongSubjects || [],
            weakSubjects: profile.weakSubjects || [],
            recentExamAverages: _calculateSubjectAverages(recentExams),
            timeManagementIssues: _analyzeTimeManagement(recentExams),
            commonMistakes: _identifyCommonMistakes(recentExams),
            streakInfo: {
                current: gamData.streak || 0,
                level: gamData.level || 1,
                xp: gamData.xp || 0
            },
            studyHabits: _analyzeStudyHabits(recentStudy),
            mentalState: _assessMentalState(profile, recentStudy)
        };

        console.log('Sınav öncesi performans analizi:', performanceAnalysis);

        // Koç tarzı strateji prompt'u
        const strategyPrompt = `Sen, dünya çapında başarılı sporcuları yetiştiren efsanevi bir koçsun. Şimdi, ${examType} sınavına hazırlanan "${performanceAnalysis.name}" adlı sporcuna (öğrencine) maç öncesi motivasyon ve strateji konuşması yapacaksın.

ÖĞRENCİ PROFİLİ:
- İsim: ${performanceAnalysis.name}
- Hedef: ${performanceAnalysis.targetScore}
- Seviye: Level ${performanceAnalysis.streakInfo.level} (${performanceAnalysis.streakInfo.xp} XP)
- Güçlü Yönler: ${performanceAnalysis.strongSubjects.join(', ')}
- Zayıf Alanlar: ${performanceAnalysis.weakSubjects.join(', ')}
- Güncel Seri: ${performanceAnalysis.streakInfo.current} gün

SON PERFORMANS ANALİZİ:
${Object.entries(performanceAnalysis.recentExamAverages).map(([subject, avg]) => 
  `- ${subject}: %${Math.round((avg as number) * 100)} ortalama`
).join('\n')}

ZAMAN YÖNETİMİ: ${performanceAnalysis.timeManagementIssues}
YAPIĞI HATALAR: ${performanceAnalysis.commonMistakes}
ÇALIŞMA ALIŞKANLIKLARI: ${performanceAnalysis.studyHabits}
MENTAL DURUM: ${performanceAnalysis.mentalState}

SINAV BİLGİLERİ:
- Sınav Türü: ${examType}
- Süre: ${duration} dakika
- Dersler: ${subjects.join(', ')}

GÖREV: Aşağıdaki JSON formatında, tam bir koç gibi, kişisel ve motivasyonel strateji ver:

{
  "preExamPep": "Kişisel motivasyon konuşması (coachun tarzında)",
  "strategicPlan": {
    "timeAllocation": {
      "${subjects[0] || 'Türkçe'}": "30 dakika - Güçlü alanın, buradan başla",
      "${subjects[1] || 'Matematik'}": "45 dakika - En zorlu bölüm, sakin ol"
    },
    "orderOfAttack": ["Hangi dersten başlayacağı ve neden"],
    "riskManagement": ["Hangi tuzaklara dikkat etmeli"],
    "confidenceBuilders": ["Özgüvenini artıracak taktikler"]
  },
  "personalizedTips": {
    "basedOnWeaknesses": ["Zayıf yönlerine özel tavsiyeler"],
    "basedOnStrengths": ["Güçlü yönlerini nasıl kullanacağı"],
    "mentalPrep": ["Mental hazırlık tavsiyeleri"]
  },
  "emergencyTactics": {
    "ifStuck": "Takılırsan ne yapacaksın",
    "timeRunningOut": "Zaman azalırsa stratejin",
    "panic": "Panik anında kendini nasıl toparlayacaksın"
  },
  "finalWords": "Son motivasyon cümlesi",
  "predictedOutcome": "Bu stratejilerle beklenen performans tahmini"
}

ÖNEMLİ: Samimi, dostça ama otoriter bir koç gibi konuş. İsimle hitap et. Geçmiş verilerini referans göster. Spor metaforları kullan.`;

        console.log('Sınav öncesi strateji prompt gönderiliyor...');
        const result = await model.generateContent(strategyPrompt);
        const aiResponse = result.response.text().trim();

        let strategy;
        try {
            strategy = JSON.parse(aiResponse.replace(/```json\n?|```\n?/g, ''));
        } catch (parseError) {
            console.error('Strateji JSON parse hatası:', parseError);
            // Fallback strategy
            strategy = {
                preExamPep: `${performanceAnalysis.name}, bu sınava hazırsın! Geçmiş performansın gösteriyor ki başarabilirsin.`,
                strategicPlan: {
                    timeAllocation: {
                        "Türkçe": "35 dakika - Güvenli başlangıç",
                        "Matematik": "40 dakika - Dikkatli çöz",
                        "Fen": "35 dakika - Güçlü yanın",
                        "Sosyal": "30 dakika - Hızlı bitir"
                    },
                    orderOfAttack: ["Güçlü derslerden başla", "Zor olanları ortaya bırak", "Kolay soruları garantile"],
                    riskManagement: ["Zor sorularda fazla takılma", "Zaman kontrolü yap", "Dikkatsizlik hatalarından kaçın"],
                    confidenceBuilders: ["Güçlü alanlarını hatırla", "Geçmiş başarılarını düşün", "Sakin nefes al"]
                },
                personalizedTips: {
                    basedOnWeaknesses: performanceAnalysis.weakSubjects.map(s => `${s} dersinde acele etme`),
                    basedOnStrengths: performanceAnalysis.strongSubjects.map(s => `${s} dersinde kendine güven`),
                    mentalPrep: ["Pozitif düşün", "Kendine güven", "Başarabilirsin"]
                },
                emergencyTactics: {
                    ifStuck: "2 dakikadan fazla uğraşma, işaretle ve devam et",
                    timeRunningOut: "Kalan soruları hızlıca tarayıp basit olanları çöz",
                    panic: "Derin nefes al, 10 saniye ara ver, odaklan"
                },
                finalWords: "Sen yaparsın! İnandığımız kadar güçlüsün!",
                predictedOutcome: "Bu stratejilerle hedef performansına ulaşabilirsin"
            };
        }

        // Stratejiyi kaydet
        const strategyRef = await db.collection(`users/${userId}/exam_strategies`).add({
            ...strategy,
            examType,
            duration,
            subjects,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            performanceAnalysis,
            status: 'pre_exam'
        });

        console.log('Sınav öncesi strateji kaydedildi:', strategyRef.id);

        return {
            success: true,
            strategy,
            strategyId: strategyRef.id,
            message: 'Kişisel sınav stratejin hazır!'
        };

    } catch (error: any) {
        console.error('Sınav öncesi strateji hatası:', error);
        throw new HttpsError('internal', `Strateji oluşturulamadı: ${error.message}`);
    }
});

/**
 * Sınav Simülatörü - Maç Sonu Analizi (Gelişmiş Versiyon)
 * Sınav sonuçlarını hikaye tarzında analiz eder ve gelecek için aksiyon planı oluşturur
 */
export const analyzeExamResult = onCall(heavyOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { 
        strategyId, 
        results, 
        examType = 'TYT', 
        totalQuestions, 
        duration,
        timeSpent 
    } = request.data || {};

    if (!results || !totalQuestions) {
        throw new HttpsError('invalid-argument', 'Sınav sonuçları ve toplam soru sayısı zorunludur.');
    }

    try {
        // Önceki stratejiyi al (eğer varsa)
        let preExamStrategy = null;
        if (strategyId) {
            const strategyRef = db.doc(`users/${userId}/exam_strategies/${strategyId}`);
            const strategySnap = await strategyRef.get();
            if (strategySnap.exists) {
                preExamStrategy = strategySnap.data();
            }
        }

        // Kullanıcı profilini al
        const privateProfileRef = db.doc(`users/${userId}/privateProfile/profile`);
        const profileSnap = await privateProfileRef.get();
        if (!profileSnap.exists) {
            throw new HttpsError('not-found', 'Kullanıcı profili bulunamadı.');
        }
        const profile = profileSnap.data();

        // Geçmiş sınav sonuçlarını al (trend analizi için)
        const previousExamsRef = db.collection(`users/${userId}/exam_results`)
            .orderBy('timestamp', 'desc')
            .limit(5);
        const previousExamsSnap = await previousExamsRef.get();
        const previousExams = previousExamsSnap.docs.map(doc => doc.data());

        // AI motoru
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Detaylı analiz verilerini hazırla
        const analysisData = {
            name: profile.name || 'Değerli sporcu',
            currentResults: results,
            totalQuestions,
            timeSpent,
            duration,
            timeEfficiency: timeSpent ? ((duration - timeSpent) / duration * 100) : 0,
            strategyFollowed: preExamStrategy ? true : false,
            previousPerformance: _calculateTrendAnalysis(previousExams),
            improvementAreas: _identifyImprovementAreas(results, previousExams),
            successAreas: _identifySuccessAreas(results, previousExams),
            missedOpportunities: _findMissedOpportunities(results)
        };

        console.log('Sınav sonu analiz verisi:', analysisData);

        // Hikayeci koç tarzı analiz prompt'u
        const analysisPrompt = `Sen, dünya çapında şampiyonlar yetiştiren efsanevi bir spor koçusun. Sporcun "${analysisData.name}" az önce önemli bir maçı (sınavı) tamamladı ve şimdi ona maç sonu analizi yapacaksın.

MAÇA DAİR BİLGİLER:
- Sınav Türü: ${examType}
- Toplam Soru: ${analysisData.totalQuestions}
- Harcanan Süre: ${analysisData.timeSpent}/${analysisData.duration} dakika
- Zaman Verimliliği: %${Math.round(analysisData.timeEfficiency)}

PERFORMANS SONUÇLARI:
${Object.entries(analysisData.currentResults).map(([subject, data]: [string, any]) => 
  `- ${subject}: ${data.correct}/${data.total} doğru (%${Math.round((data.correct/data.total)*100)})`
).join('\n')}

ÖNCEKI PERFORMANS TRENDİ:
${analysisData.previousPerformance}

BAŞARILI OLAN ALANLAR:
${analysisData.successAreas}

GELİŞİM GEREKTİREN ALANLAR:
${analysisData.improvementAreas}

KAÇIRILAN FIRSATLAR:
${analysisData.missedOpportunities}

MAÇ ÖNCESİ STRATEJİ TAKİP EDİLDİ Mİ: ${analysisData.strategyFollowed ? 'Evet' : 'Hayır'}

GÖREV: Aşağıdaki JSON formatında, bir koç gibi hikaye anlatarak analiz yap:

{
  "openingStatement": "Maça genel bakış - hikaye tarzında başlangıç",
  "performanceStory": {
    "highlights": ["Bu sınavdaki en parlak anları"],
    "challenges": ["Zorlandığı anlar ve neden"],
    "surprises": ["Beklenmedik olumlu/olumsuz durumlar"]
  },
  "technicalAnalysis": {
    "timeManagement": "Zaman yönetimi analizi - hikaye ile",
    "accuracyAssessment": "Doğruluk oranı değerlendirmesi",
    "strategicDecisions": "Aldığı iyi/kötü kararlar",
    "mentalState": "Mental durum gözlemi"
  },
  "trendAnalysis": {
    "comparedToPrevious": "Önceki sınavlara göre gelişim",
    "strengthsGrowing": ["Güçlenen alanlar"],
    "weaknessesPatterns": ["Devam eden zayıflık kalıpları"]
  },
  "actionPlan": {
    "immediate": ["Hemen yapması gerekenler (1 hafta)"],
    "shortTerm": ["Kısa vadeli hedefler (1 ay)"],
    "longTerm": ["Uzun vadeli gelişim planı"],
    "specificDrills": ["Özel çalışma egzersizleri"]
  },
  "motivationalClose": "Koçça kapanış - gelecek için moral",
  "nextGoal": "Bir sonraki hedef",
  "confidenceBuilder": "Özgüven artırıcı mesaj"
}

ÖNEMLİ: Hikaye anlatır gibi analiz yap. Spor metaforları kullan. Eleştirilerini yapıcı tut. İsmiyle hitap et. Başarıları vurgula, eksikleri büyütme.`;

        console.log('Sınav sonu analiz prompt gönderiliyor...');
        const result = await model.generateContent(analysisPrompt);
        const aiResponse = result.response.text().trim();

        let analysis;
        try {
            analysis = JSON.parse(aiResponse.replace(/```json\n?|```\n?/g, ''));
        } catch (parseError) {
            console.error('Analiz JSON parse hatası:', parseError);
            // Fallback analysis
            analysis = {
                openingStatement: `${analysisData.name}, bu sınavda gerçekten mücadele ettin! Şimdi birlikte sonuçları analiz edelim.`,
                performanceStory: {
                    highlights: ["Güçlü alanlarında başarılı oldun"],
                    challenges: ["Bazı konularda zorlandın ama pes etmedin"],
                    surprises: ["Beklenenden iyi performans gösterdiğin alanlar var"]
                },
                technicalAnalysis: {
                    timeManagement: "Zaman yönetimi konusunda gelişim gösteriyorsun",
                    accuracyAssessment: "Doğruluk oranın kabul edilebilir seviyede",
                    strategicDecisions: "Genel olarak doğru kararlar aldın",
                    mentalState: "Sakin ve odaklı görünüyordun"
                },
                trendAnalysis: {
                    comparedToPrevious: "Önceki sınavlara göre gelişim var",
                    strengthsGrowing: ["Güçlü alanların daha da güçleniyor"],
                    weaknessesPatterns: ["Bazı konularda hala çalışma gerekiyor"]
                },
                actionPlan: {
                    immediate: ["Zayıf konuları tekrar et"],
                    shortTerm: ["Düzenli deneme çözmeye devam et"],
                    longTerm: ["Hedef puanına ulaşmak için plan takibi"],
                    specificDrills: ["Hız ve doğruluk çalışmaları"]
                },
                motivationalClose: "Bu sınav bir adımdı, asıl hedefin uzakta. Devam et!",
                nextGoal: "Bir sonraki denemede daha iyi olmak",
                confidenceBuilder: "Sen başarabilirsin, veriler bunu gösteriyor!"
            };
        }

        // Sonucu veritabanına kaydet
        const examResultRef = await db.collection(`users/${userId}/exam_results`).add({
            ...analysisData.currentResults,
            analysis,
            examType,
            totalQuestions,
            duration,
            timeSpent,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            strategyId: strategyId || null,
            overallScore: _calculateOverallScore(analysisData.currentResults),
            efficiency: analysisData.timeEfficiency
        });

        // Stratejiyi güncelle (eğer varsa)
        if (strategyId) {
            await db.doc(`users/${userId}/exam_strategies/${strategyId}`).update({
                status: 'completed',
                results: analysisData.currentResults,
                analysis,
                completedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // XP ver (performansa göre)
        const overallScore = _calculateOverallScore(analysisData.currentResults);
        const xpReward = Math.floor(overallScore * 2); // Score'a göre XP
        
        const gamificationRef = db.doc(`users/${userId}/gamification/data`);
        const gamSnap = await gamificationRef.get();
        let gamification = gamSnap.exists ? gamSnap.data() : { xp: 0, level: 1, streak: 0, badges: [] };
        
        gamification.xp += xpReward;
        await gamificationRef.set(gamification, { merge: true });

        console.log('Sınav analizi kaydedildi:', examResultRef.id);

        return {
            success: true,
            analysis,
            examResultId: examResultRef.id,
            xpRewarded: xpReward,
            overallScore,
            message: 'Sınav analizin hazır! Koçunun tavsiyeleri seni bekliyor.'
        };

    } catch (error: any) {
        console.error('Sınav analizi hatası:', error);
        throw new HttpsError('internal', `Analiz oluşturulamadı: ${error.message}`);
    }
});

// Helper functions for exam analysis
function _calculateSubjectAverages(exams: any[]): Record<string, number> {
    const averages: Record<string, number> = {};
    if (exams.length === 0) return averages;

    const subjects = ['Türkçe', 'Matematik', 'Fen', 'Sosyal'];
    subjects.forEach(subject => {
        const scores = exams
            .filter(exam => exam[subject])
            .map(exam => exam[subject].correct / exam[subject].total);
        averages[subject] = scores.length > 0 
            ? scores.reduce((a, b) => a + b, 0) / scores.length 
            : 0;
    });

    return averages;
}

function _analyzeTimeManagement(exams: any[]): string {
    if (exams.length === 0) return "Yeterli veri yok";
    
    const timeIssues = exams.filter(exam => exam.timeSpent && exam.timeSpent > exam.duration * 0.95);
    return timeIssues.length > exams.length / 2 
        ? "Zaman yönetimi sorunu var" 
        : "Zaman yönetimi kabul edilebilir";
}

function _identifyCommonMistakes(exams: any[]): string {
    if (exams.length === 0) return "Yeterli veri yok";
    
    // Basit analiz - gerçek uygulamada daha detaylı olabilir
    return "Dikkatsizlik hataları ve zaman baskısı";
}

function _analyzeStudyHabits(studyLogs: any[]): string {
    if (studyLogs.length === 0) return "Düzenli çalışma verisi yok";
    
    const avgDuration = studyLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / studyLogs.length;
    return avgDuration > 60 ? "Düzenli çalışma alışkanlığı var" : "Çalışma süresi artırılmalı";
}

function _assessMentalState(profile: any, studyLogs: any[]): string {
    const recentStudy = studyLogs.slice(0, 5);
    const avgRating = recentStudy.reduce((sum, log) => sum + (log.rating || 3), 0) / recentStudy.length;
    
    if (avgRating >= 4) return "Pozitif ve motive";
    if (avgRating >= 3) return "Kararlı ama gelişim odaklı";
    return "Motivasyon desteği gerekli";
}

function _calculateTrendAnalysis(previousExams: any[]): string {
    if (previousExams.length < 2) return "Trend analizi için yeterli veri yok";
    
    // Basit trend analizi
    const latest = previousExams[0];
    const older = previousExams[1];
    
    if (latest.overallScore > older.overallScore) {
        return "Yükseliş trendinde";
    } else if (latest.overallScore < older.overallScore) {
        return "Düşüş trendinde - odaklanma gerekli";
    }
    return "Sabit performans";
}

function _identifyImprovementAreas(currentResults: any, previousExams: any[]): string {
    const subjects = Object.keys(currentResults);
    const weakSubjects = subjects.filter(subject => {
        const current = currentResults[subject];
        return current.correct / current.total < 0.6;
    });
    
    return weakSubjects.length > 0 
        ? `${weakSubjects.join(', ')} konularında gelişim gerekli`
        : "Genel olarak iyi performans";
}

function _identifySuccessAreas(currentResults: any, previousExams: any[]): string {
    const subjects = Object.keys(currentResults);
    const strongSubjects = subjects.filter(subject => {
        const current = currentResults[subject];
        return current.correct / current.total >= 0.8;
    });
    
    return strongSubjects.length > 0 
        ? `${strongSubjects.join(', ')} konularında başarılı`
        : "Tüm alanlarda gelişim fırsatı var";
}

function _findMissedOpportunities(currentResults: any): string {
    const subjects = Object.keys(currentResults);
    const nearMissSubjects = subjects.filter(subject => {
        const current = currentResults[subject];
        const accuracy = current.correct / current.total;
        return accuracy >= 0.6 && accuracy < 0.8;
    });
    
    return nearMissSubjects.length > 0 
        ? `${nearMissSubjects.join(', ')} konularında potansiyel var`
        : "Fırsatlar değerlendirilmiş";
}

function _calculateOverallScore(results: any): number {
    const subjects = Object.keys(results);
    const totalCorrect = subjects.reduce((sum, subject) => sum + results[subject].correct, 0);
    const totalQuestions = subjects.reduce((sum, subject) => sum + results[subject].total, 0);
    
    return totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
} 



// Dinamik tema sistemi fonksiyonları

/**
 * Internal helper for mood analysis
 */
async function performMoodAnalysis(userId: string) {
    console.log(`🧠 ${userId} için ruh hali analizi başlatılıyor...`);

    // Kullanıcı verilerini al
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        throw new HttpsError('not-found', 'Kullanıcı bulunamadı');
    }
    const userData = userDoc.data();

    // Son 7 günün çalışma verilerini al
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const studySessionsSnapshot = await db.collection('studySessions')
        .where('userId', '==', userId)
        .where('timestamp', '>=', weekAgo.getTime())
        .orderBy('timestamp', 'desc')
        .get();

    const recentSessions = studySessionsSnapshot.docs.map(doc => doc.data());

    // Performans analizini al
    const performanceDoc = await db.collection('userPerformance').doc(userId).get();
    const performanceData = performanceDoc.exists ? performanceDoc.data() : {};

    // AI ile ruh hali analizi
    const analysisPrompt = `
Sen bir öğrenci koçu ve psikoloğusun. Aşağıdaki verilere dayanarak öğrencinin ruh halini analiz et:

**Öğrenci Profili:**
- İsim: ${userData?.name || 'Bilinmiyor'}
- Hedef: ${userData?.targetExam || 'YKS'}
- Günlük Hedef: ${userData?.dailyGoal || 60} dakika

**Son 7 Günün Çalışma Verileri:**
${recentSessions.map(session => `- ${new Date(session.timestamp).toLocaleDateString()}: ${session.durationInMinutes} dk ${session.subject}`).join('\n')}

**Genel Performans:**
- Toplam Çalışma: ${performanceData?.totalStudyTimeMinutes || 0} dakika
- Haftalık Çalışma: ${performanceData?.weeklyStudyTimeMinutes || 0} dakika
- Son Güncelleme: ${performanceData?.lastUpdated ? new Date(performanceData.lastUpdated).toLocaleDateString() : 'Bilinmiyor'}

Aşağıdaki JSON formatında analiz yap:
{
    "energyLevel": "low/medium/high",
    "stressLevel": "low/medium/high", 
    "motivationLevel": "low/medium/high",
    "burnoutRisk": "low/medium/high",
    "consistencyScore": 0-100 arası sayı,
    "recentPerformanceTrend": "improving/stable/declining",
    "analysis": "Detaylı ruh hali analizi"
}

Önemli: Sadece JSON döndür, başka hiçbir metin ekleme.`;

    const response = await callGeminiAPI(analysisPrompt);
    const moodAnalysis = JSON.parse(response);

    // Ruh hali verisini oluştur
    const moodData = {
        energyLevel: moodAnalysis.energyLevel,
        stressLevel: moodAnalysis.stressLevel,
        motivationLevel: moodAnalysis.motivationLevel,
        burnoutRisk: moodAnalysis.burnoutRisk,
        consistencyScore: moodAnalysis.consistencyScore,
        recentPerformanceTrend: moodAnalysis.recentPerformanceTrend,
        lastMoodUpdate: Date.now()
    };

    // Firestore'a kaydet
    await db.collection('userEmotionalState').doc(userId).set({
        mood: moodData,
        lastAnalysis: Date.now()
    }, { merge: true });

    console.log(`✅ ${userId} ruh hali analizi tamamlandı`);

    return {
        mood: moodData,
        analysis: moodAnalysis.analysis
    };
}

/**
 * Kullanıcının ruh halini ve performansını analiz eder
 */
export const analyzeUserMood = onCall(heavyOptions, async (request) => {
    try {
        const { userId } = request.data;
        
        if (!userId) {
            throw new HttpsError('invalid-argument', 'userId gerekli');
        }

        const result = await performMoodAnalysis(userId);

        return {
            success: true,
            mood: result.mood,
            analysis: result.analysis
        };

    } catch (error) {
        console.error('🚨 Ruh hali analizi hatası:', error);
        throw new HttpsError('internal', 'Ruh hali analizi başarısız oldu');
    }
});

/**
 * Ruh haline göre adaptif tema önerisi
 */
export const getAdaptiveTheme = onCall(heavyOptions, async (request) => {
    try {
        const { userId } = request.data;
        
        if (!userId) {
            throw new HttpsError('invalid-argument', 'userId gerekli');
        }

        console.log(`🎨 ${userId} için adaptif tema oluşturuluyor...`);

        // Ruh hali verisini al
        const emotionalStateDoc = await db.collection('userEmotionalState').doc(userId).get();
        if (!emotionalStateDoc.exists) {
            // Eğer ruh hali analizi yoksa, önce analiz yap
            await performMoodAnalysis(userId);
            const newEmotionalStateDoc = await db.collection('userEmotionalState').doc(userId).get();
            if (!newEmotionalStateDoc.exists) {
                throw new HttpsError('internal', 'Ruh hali verisi oluşturulamadı');
            }
        }

        const emotionalData = emotionalStateDoc.exists ? emotionalStateDoc.data() : {};
        const mood = emotionalData.mood;

        // Tema konfigürasyonu oluştur
        let themeConfig;

        if (mood.burnoutRisk === 'high' || mood.stressLevel === 'high') {
            // Sakinleştirici tema
            themeConfig = {
                primaryColor: '#81C784', // Yumuşak yeşil
                accentColor: '#A5D6A7',
                backgroundColor: '#F1F8E9',
                cardColor: '#FFFFFF',
                textColor: '#2E7D32',
                buttonColor: '#66BB6A',
                energyEffectIntensity: 0.2,
                animationSpeed: 0.7,
                gradientIntensity: 0.3,
                themeType: 'calm',
                effectsEnabled: false
            };
        } else if (mood.energyLevel === 'high' && mood.motivationLevel === 'high') {
            // Enerjik tema
            themeConfig = {
                primaryColor: '#FF6B35', // Enerjik turuncu
                accentColor: '#FF8A65',
                backgroundColor: '#FFF3E0',
                cardColor: '#FFFFFF',
                textColor: '#E65100',
                buttonColor: '#FF7043',
                energyEffectIntensity: 0.8,
                animationSpeed: 1.3,
                gradientIntensity: 0.7,
                themeType: 'energetic',
                effectsEnabled: true
            };
        } else if (mood.motivationLevel === 'low' && mood.energyLevel === 'low') {
            // Motivasyon artırıcı tema
            themeConfig = {
                primaryColor: '#7986CB', // Motivasyonel mavi
                accentColor: '#9FA8DA',
                backgroundColor: '#E8EAF6',
                cardColor: '#FFFFFF',
                textColor: '#303F9F',
                buttonColor: '#5C6BC0',
                energyEffectIntensity: 0.5,
                animationSpeed: 1.0,
                gradientIntensity: 0.5,
                themeType: 'motivated',
                effectsEnabled: true
            };
        } else if (mood.recentPerformanceTrend === 'improving') {
            // Odaklanma teması
            themeConfig = {
                primaryColor: '#26A69A', // Odaklanma turkuazı
                accentColor: '#4DB6AC',
                backgroundColor: '#E0F2F1',
                cardColor: '#FFFFFF',
                textColor: '#00695C',
                buttonColor: '#26A69A',
                energyEffectIntensity: 0.6,
                animationSpeed: 1.1,
                gradientIntensity: 0.6,
                themeType: 'focused',
                effectsEnabled: true
            };
        } else {
            // Varsayılan tema
            themeConfig = {
                primaryColor: '#5E35B1', // Varsayılan mor
                accentColor: '#7E57C2',
                backgroundColor: '#EDE7F6',
                cardColor: '#FFFFFF',
                textColor: '#4527A0',
                buttonColor: '#673AB7',
                energyEffectIntensity: 0.4,
                animationSpeed: 1.0,
                gradientIntensity: 0.4,
                themeType: 'focused',
                effectsEnabled: false
            };
        }

        // Tema ayarlarını kaydet
        await db.collection('userEmotionalState').doc(userId).update({
            theme: themeConfig,
            lastAnalysis: Date.now()
        });

        console.log(`✅ ${userId} adaptif tema oluşturuldu: ${themeConfig.themeType}`);

        return {
            success: true,
            theme: themeConfig,
            moodSummary: {
                energyLevel: mood.energyLevel,
                stressLevel: mood.stressLevel,
                motivationLevel: mood.motivationLevel,
                burnoutRisk: mood.burnoutRisk
            }
        };

    } catch (error) {
        console.error('🚨 Adaptif tema hatası:', error);
        throw new HttpsError('internal', 'Adaptif tema oluşturulamadı');
    }
});

/**
 * Haftalık hikaye oluşturma
 */
export const generateWeeklyStory = onCall(heavyOptions, async (request) => {
    try {
        const { userId, weekOffset = 0 } = request.data;
        
        if (!userId) {
            console.error('❌ userId parametresi eksik');
            throw new HttpsError('invalid-argument', 'userId gerekli');
        }

        console.log(`📖 ${userId} için haftalık hikaye oluşturuluyor... (offset: ${weekOffset})`);

        // Kullanıcı verilerini al
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'Kullanıcı bulunamadı');
        }
        const userData = userDoc.data();

        // Haftanın başı ve sonu
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() - (weekOffset * 7));
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // O haftanın çalışma verilerini al
        let weekSessions: any[] = [];
        try {
            const studySessionsSnapshot = await db.collection('studySessions')
                .where('userId', '==', userId)
                .where('timestamp', '>=', weekStart.getTime())
                .where('timestamp', '<=', weekEnd.getTime())
                .orderBy('timestamp', 'asc')
                .get();

            weekSessions = studySessionsSnapshot.docs.map(doc => doc.data());
            console.log(`📊 ${weekSessions.length} çalışma seansı bulundu`);
        } catch (indexError: any) {
            console.warn('🔍 Index henüz hazır değil, alternatif sorgu deneniyor:', indexError.message);
            
            // Fallback: Index gerektirmeyen basit sorgu
            try {
                const fallbackSnapshot = await db.collection('studySessions')
                    .where('userId', '==', userId)
                    .get();
                
                // Client-side filtering
                const allSessions = fallbackSnapshot.docs.map(doc => doc.data());
                weekSessions = allSessions.filter(session => {
                    const sessionTime = session.timestamp;
                    return sessionTime >= weekStart.getTime() && sessionTime <= weekEnd.getTime();
                }).sort((a, b) => a.timestamp - b.timestamp);
                
                console.log(`📊 Fallback ile ${weekSessions.length} çalışma seansı bulundu`);
            } catch (fallbackError) {
                console.error('❌ Fallback sorgu da başarısız:', fallbackError);
                weekSessions = [];
            }
        }

        // Günlük toplam çalışma süreleri
        const dailyMinutes: { [key: string]: number } = {};
        const dailySessions: { [key: string]: any[] } = {};
        
        weekSessions.forEach(session => {
            const date = new Date(session.timestamp).toLocaleDateString();
            dailyMinutes[date] = (dailyMinutes[date] || 0) + session.durationInMinutes;
            if (!dailySessions[date]) dailySessions[date] = [];
            dailySessions[date].push(session);
        });

        // En iyi ve en kötü günleri bul
        const days = Object.keys(dailyMinutes);
        const bestDay = days.reduce((best, day) => 
            dailyMinutes[day] > (dailyMinutes[best] || 0) ? day : best, days[0]);
        const worstDay = days.reduce((worst, day) => 
            dailyMinutes[day] < (dailyMinutes[worst] || Infinity) ? day : worst, days[0]);

        // AI ile hikaye oluştur
        const storyPrompt = `
Sen yaratıcı bir hikaye anlatıcısısın. Öğrencinin haftalık çalışma verilerini hikayeleştir.

**Öğrenci:** ${userData?.name || 'Öğrenci'}
**Hedef:** ${userData?.targetExam || 'YKS'}
**Hafta:** ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}

**Haftalık Veriler:**
${Object.keys(dailyMinutes).map(date => `${date}: ${dailyMinutes[date]} dakika`).join('\n')}

**En İyi Gün:** ${bestDay} (${dailyMinutes[bestDay] || 0} dakika)
**En Zor Gün:** ${worstDay} (${dailyMinutes[worstDay] || 0} dakika)

Instagram Stories tarzında, duygusal ve motive edici bir haftalık hikaye oluştur.

JSON formatında döndür:
{
    "keyMoments": [
        {
            "day": "Pazartesi",
            "type": "success/challenge/breakthrough/streak",
            "description": "O günün hikayesi",
            "emoji": "Uygun emoji"
        }
    ],
    "celebrationMessage": "Haftalık başarı mesajı",
    "nextWeekMotivation": "Gelecek hafta için motivasyon",
    "weekSummary": "Haftanın genel özeti"
}

Önemli: Sadece JSON döndür, emoji ve pozitif dil kullan.`;

        console.log('🤖 AI ile hikaye oluşturuluyor...');
        const response = await callGeminiAPI(storyPrompt);
        
        let storyData;
        try {
            storyData = JSON.parse(response.replace(/```json\n?|```\n?/g, ''));
            console.log('✅ AI hikayesi başarıyla parse edildi');
        } catch (parseError) {
            console.error('❌ JSON parse hatası:', parseError);
            console.log('AI Response:', response);
            
            // Fallback story data
            storyData = {
                keyMoments: [
                    {
                        day: 'Bu Hafta',
                        type: 'motivation',
                        description: 'Her yeni hafta, hedeflerine ulaşmak için yeni bir şanstır!',
                        emoji: '🌟'
                    }
                ],
                celebrationMessage: 'Başarı yolculuğun devam ediyor! 🚀',
                nextWeekMotivation: 'Gelecek hafta daha da güçlü olacaksın!',
                weekSummary: 'Bu hafta önemli adımlar attın ve büyümeye devam ettin.'
            };
            console.log('🔧 Fallback hikaye verisi kullanıldı');
        }

        // Haftalık hikaye verisini oluştur
        const weeklyStory = {
            weekNumber: getWeekNumber(weekStart),
            year: weekStart.getFullYear(),
            totalStudyMinutes: Object.values(dailyMinutes).reduce((sum, min) => sum + min, 0),
            bestDay: {
                date: bestDay || weekStart.toLocaleDateString(),
                minutes: dailyMinutes[bestDay] || 0,
                achievement: storyData.keyMoments.find((m: any) => m.type === 'success')?.description || 'Harika bir gün!'
            },
            worstDay: {
                date: worstDay || weekStart.toLocaleDateString(),
                minutes: dailyMinutes[worstDay] || 0,
                challenge: storyData.keyMoments.find((m: any) => m.type === 'challenge')?.description || 'Zorlu bir gün'
            },
            keyMoments: storyData.keyMoments,
            weeklyStreak: calculateStreak(dailyMinutes),
            improvementAreas: generateImprovementAreas(weekSessions, userData),
            celebrationMessage: storyData.celebrationMessage,
            nextWeekMotivation: storyData.nextWeekMotivation,
            xpEarned: weekSessions.reduce((sum, session) => sum + (session.xpGained || 0), 0),
            totalXP: userData?.totalXP || 0
        };

        // Hikayeyi kaydet
        await db.collection('weeklyStories').doc(`${userId}_${weeklyStory.weekNumber}_${weeklyStory.year}`).set(weeklyStory);

        console.log(`✅ ${userId} haftalık hikaye oluşturuldu`);

        return {
            success: true,
            story: weeklyStory,
            weekSummary: storyData.weekSummary
        };

    } catch (error: any) {
        console.error('🚨 Haftalık hikaye hatası:', error);
        console.error('Error details:', error.message, error.code, error.stack);
        
        // Hata tipine göre özel mesaj
        if (error.code === 'not-found') {
            throw new HttpsError('not-found', 'Kullanıcı verileri bulunamadı');
        } else if (error.code === 'permission-denied') {
            throw new HttpsError('permission-denied', 'Bu işlemi gerçekleştirme yetkiniz yok');
        } else if (error.message?.includes('timeout') || error.message?.includes('deadline')) {
            throw new HttpsError('deadline-exceeded', 'İşlem zaman aşımına uğradı, lütfen tekrar deneyin');
        } else if (error.message?.includes('AI servisi')) {
            throw new HttpsError('unavailable', 'AI servisi geçici olarak kullanılamıyor');
        } else {
            throw new HttpsError('internal', `Haftalık hikaye oluşturulamadı: ${error.message || 'Bilinmeyen hata'}`);
        }
    }
});

// Yardımcı fonksiyonlar
function getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function calculateStreak(dailyMinutes: { [key: string]: number }): number {
    const dates = Object.keys(dailyMinutes).sort();
    let streak = 0;
    for (let i = dates.length - 1; i >= 0; i--) {
        if (dailyMinutes[dates[i]] > 0) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

function generateImprovementAreas(sessions: any[], userData: any): string[] {
    const subjects = new Set(sessions.map(s => s.subject));
    const areas: string[] = [];
    
    if (subjects.size < 2) {
        areas.push('Farklı derslere odaklanma');
    }
    
    const avgSession = sessions.reduce((sum, s) => sum + s.durationInMinutes, 0) / sessions.length;
    if (avgSession < 30) {
        areas.push('Çalışma sürelerini artırma');
    }
    
    const manualEntries = sessions.filter(s => s.isManualEntry).length;
    if (manualEntries > sessions.length * 0.7) {
        areas.push('Odaklanma modunu daha çok kullanma');
    }
    
    return areas.slice(0, 3);
}

/**
 * Veli kontrol paneli için öğrenci verilerini getir
 * Sadece veli'nin kendi studentProfiles koleksiyonu altındaki profileId için veri çeker
 */
export const getParentDashboardData = onCall(lightOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid; // Veli ID'si
    const { profileId } = request.data || {};
    
    if (!profileId) {
        throw new HttpsError('invalid-argument', 'profileId parametresi zorunludur.');
    }
    
    try {
        // Güvenlik kontrolü: profileId'nin bu veli'ye ait olduğunu doğrula
        const profileRef = db.doc(`users/${userId}/studentProfiles/${profileId}`);
        const profileSnap = await profileRef.get();
        
        if (!profileSnap.exists) {
            throw new HttpsError('not-found', 'Bu öğrenci profili bulunamadı veya erişim yetkiniz yok.');
        }
        
        const profileData = profileSnap.data();
        
        // 🚀 OPTİMİZE EDİLMİŞ: Paralel olarak sadece gerekli field'ları çek
        const [
            gamificationData,
            performanceData,
            planData,
            analyticsData
        ] = await Promise.all([
            getDocumentFields(`users/${userId}/studentProfiles/${profileId}/gamification/data`, 
                ['xp', 'level', 'streak', 'badges', 'achievements']),
            getDocumentFields(`users/${userId}/studentProfiles/${profileId}/performance`, 
                ['averageScore', 'totalStudyTime', 'completedTasks']),
            getDocumentFields(`users/${userId}/studentProfiles/${profileId}/plan/user_plan`, 
                ['currentWeek', 'totalWeeks', 'planStatus', 'nextTopic']),
            getDocumentFields(`users/${userId}/studentProfiles/${profileId}/performance_analytics`, 
                ['weeklyProgress', 'subjectPerformance'])
        ]);
        
        // Son 7 günün çalışma seanslarını çek
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const sessionsSnap = await db.collection(`users/${userId}/studentProfiles/${profileId}/study_sessions`)
            .where('timestamp', '>=', oneWeekAgo)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        // Verileri derle
        const dashboardData = {
            // Öğrenci profil bilgileri
            profile: {
                profileId,
                profileName: profileData?.profileName || 'Bilinmeyen',
                grade: profileData?.grade || 'Bilinmeyen',
                avatarUrl: profileData?.avatarUrl,
                currentStatus: profileData?.currentStatus || {
                    activity: 'inactive',
                    currentTopic: null,
                    lastSeen: new Date()
                }
            },
            
            // Gamification verileri
            gamification: gamificationData || {
                xp: 0,
                level: 1,
                streak: 0,
                badges: [],
                achievements: []
            },
            
            // Performans verileri
            performance: performanceData || {},
            
            // Plan bilgileri
            plan: planData || {
                currentWeek: 1,
                totalWeeks: 12,
                planStatus: 'active',
                nextTopic: null
            },
            
            // Analytics verileri
            analytics: analyticsData || {},
            
            // Son 7 günün çalışma seansları
            recentSessions: sessionsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })),
            
            // Özet istatistikler
            weeklyStats: {
                totalStudyTime: sessionsSnap.docs.reduce((total, doc) => {
                    return total + (doc.data().durationInMinutes || 0);
                }, 0),
                sessionsCount: sessionsSnap.docs.length,
                activeToday: profileData?.currentStatus?.activity === 'studying'
            }
        };
        
        return {
            success: true,
            data: dashboardData
        };
        
    } catch (error) {
        console.error('Veli paneli veri getirme hatası:', error);
        throw new HttpsError('internal', 'Veri getirilirken bir hata oluştu.');
    }
});

/**
 * Öğrencinin anlık durumunu güncelle (currentStatus)
 * Odak modu başlatma/bitirme için kullanılır
 */
export const updateStudentStatus = onCall(lightOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { profileId, activity, currentTopic } = request.data || {};
    
    if (!profileId || !activity) {
        throw new HttpsError('invalid-argument', 'profileId ve activity parametreleri zorunludur.');
    }
    
    // Activity değerinin geçerli olduğunu kontrol et
    const validActivities = ['inactive', 'studying', 'on_break'];
    if (!validActivities.includes(activity)) {
        throw new HttpsError('invalid-argument', 'Geçersiz activity değeri. Geçerli değerler: inactive, studying, on_break');
    }
    
    try {
        // Güvenlik kontrolü: profileId'nin bu kullanıcıya ait olduğunu doğrula
        const profileRef = db.doc(`users/${userId}/studentProfiles/${profileId}`);
        const profileSnap = await profileRef.get();
        
        if (!profileSnap.exists) {
            throw new HttpsError('not-found', 'Bu öğrenci profili bulunamadı veya erişim yetkiniz yok.');
        }
        
        // currentStatus'u güncelle
        const updateData = {
            'currentStatus.activity': activity,
            'currentStatus.lastSeen': admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Eğer studying modundaysa ve konu belirtildiyse
        if (activity === 'studying' && currentTopic) {
            updateData['currentStatus.currentTopic'] = currentTopic;
        } else if (activity === 'inactive') {
            // Inactive durumunda current topic'i temizle
            updateData['currentStatus.currentTopic'] = null;
        }
        
        await profileRef.update(updateData);
        
        return {
            success: true,
            message: 'Öğrenci durumu güncellendi',
            currentStatus: {
                activity,
                currentTopic: activity === 'studying' ? currentTopic : null,
                lastSeen: new Date()
            }
        };
        
    } catch (error) {
        console.error('Öğrenci durumu güncelleme hatası:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Durum güncellenirken bir hata oluştu.');
    }
});

/**
 * Veli için haftalık AI destekli rapor oluşturan fonksiyon
 * Öğrencinin haftalık performansını analiz eder ve veli için anlamlı içgörüler üretir
 */
export const getWeeklyParentReport = onCall(heavyOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { studentId } = request.data || {};
    
    if (!studentId) {
        throw new HttpsError('invalid-argument', 'studentId zorunludur.');
    }

    try {
        // Kullanıcının veli olduğunu doğrula
        const parentDoc = await db.doc(`users/${userId}`).get();
        if (!parentDoc.exists) {
            throw new HttpsError('not-found', 'Veli hesabı bulunamadı.');
        }

        const parentDataObj = parentDoc.data();
        if (parentDataObj?.accountType !== 'parent') {
            throw new HttpsError('permission-denied', 'Bu fonksiyon sadece veli hesapları tarafından çağrılabilir.');
        }

        // Öğrencinin bu veliye ait olduğunu doğrula
        const studentProfiles = parentDataObj?.studentProfiles || [];
        const hasStudent = studentProfiles.some((profile: any) => profile.studentUserId === studentId);
        
        if (!hasStudent) {
            throw new HttpsError('permission-denied', 'Bu öğrenci bu veli hesabına bağlı değil.');
        }

        // Haftalık veri toplama
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Haftanın başı (Pazar)
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Haftanın sonu (Cumartesi)
        weekEnd.setHours(23, 59, 59, 999);

        // Öğrenci verilerini topla
        const [profileSnapshot, gamificationSnapshot] = await Promise.all([
            // Profil bilgileri
            db.doc(`users/${studentId}`).get(),
            // Gamification verileri
            db.doc(`users/${studentId}/gamification/data`).get()
        ]);

        if (!profileSnapshot.exists) {
            throw new HttpsError('not-found', 'Öğrenci profili bulunamadı.');
        }

        const profileData = profileSnapshot.data()!;
        const gamificationData = gamificationSnapshot.exists ? gamificationSnapshot.data() : {};
        // const planData = planSnapshot.exists ? planSnapshot.data() : {};

        // Haftalık çalışma oturumlarını al
        const studySessionsQuery = await db
            .collection(`users/${studentId}/study_sessions`)
            .where('completedAt', '>=', admin.firestore.Timestamp.fromDate(weekStart))
            .where('completedAt', '<=', admin.firestore.Timestamp.fromDate(weekEnd))
            .orderBy('completedAt', 'desc')
            .get();

        const studySessions = studySessionsQuery.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Haftalık performans istatistikleri hesapla
        const weeklyStats = calculateWeeklyStats(studySessions, gamificationData);
        
        // AI için veri özeti hazırla
        const studentName = profileData.fullName || 'Öğrenci';
        const studentGrade = profileData.grade || 'Bilinmiyor';
        const currentStreak = gamificationData.streak || 0;
        const totalXP = gamificationData.totalXP || 0;
        const weeklyXP = gamificationData.weeklyXP || 0;
        const badges = gamificationData.badges || [];

        // Son hafta kazanılan rozetler
        const recentBadges = badges.filter((badge: any) => {
            const badgeDate = badge.earnedAt?.toDate ? badge.earnedAt.toDate() : new Date(badge.earnedAt);
            return badgeDate >= weekStart && badgeDate <= weekEnd;
        });

        // AI prompt'u oluştur
        const aiPrompt = `Sen deneyimli bir eğitim koçusun. Aşağıdaki verileri analiz et ve bir veliye, çocuğunun bu haftaki durumu hakkında hem tebrik edici hem de destekleyici bir özet yaz.

ÖĞRENCİ BİLGİLERİ:
- İsim: ${studentName}
- Sınıf: ${studentGrade}. sınıf
- Mevcut Streak: ${currentStreak} gün
- Toplam XP: ${totalXP}
- Bu hafta kazanılan XP: ${weeklyXP}

HAFTALIK PERFORMANS:
- Toplam çalışma süresi: ${weeklyStats.totalStudyMinutes} dakika
- Tamamlanan görev sayısı: ${weeklyStats.completedTasks}
- Ortalama günlük çalışma: ${weeklyStats.averageDailyMinutes} dakika
- En çok çalışılan ders: ${weeklyStats.topSubject || 'Belirtilmemiş'}
- En az çalışılan ders: ${weeklyStats.weakestSubject || 'Belirtilmemiş'}
- Bu hafta kazanılan rozet sayısı: ${recentBadges.length}
- Kazanılan rozetler: ${recentBadges.map((b: any) => b.name).join(', ') || 'Yok'}

ZORLANILAN KONULAR:
${weeklyStats.strugglingTopics.map((topic: any) => `- ${topic.subject}: ${topic.topic} (${topic.attempts} deneme)`).join('\n')}

BAŞARILI KONULAR:
${weeklyStats.successfulTopics.map((topic: any) => `- ${topic.subject}: ${topic.topic} (${topic.score}% başarı)`).join('\n')}

GÜNLÜK PERFORMANS DAĞILIMI:
${weeklyStats.dailyBreakdown.map((day: any) => `- ${day.dayName}: ${day.minutes} dakika çalışma`).join('\n')}

GÖREV:
Bu verileri analiz ederek aşağıdaki kriterlere uygun bir veli raporu yaz:

1. ÖVGÜ VE BAŞARILAR: Çocuğun başardığı şeyleri öne çıkar, velinin onu kutlamasını teşvik et
2. DESTEK GEREKTİREN ALANLAR: Hangi konularda zorluk çektiğini ve velinin nasıl yardımcı olabileceğini belirt
3. ÖNERILER: Somut, uygulanabilir tavsiyeler ver
4. MOTİVASYON: Pozitif ve destekleyici bir ton kullan

Yanıtın maksimum 200 kelime olsun ve samimi, destekleyici bir dil kullan. Veli için hazırladığın raporu JSON formatında şu şekilde döndür:

{
  "summary": "Ana özet (2-3 cümle)",
  "achievements": "Bu haftaki başarılar",
  "concerns": "Dikkat edilmesi gereken alanlar",
  "recommendations": "Somut öneriler",
  "motivationalMessage": "Destekleyici mesaj"
}`;

        // AI'dan rapor al
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(aiPrompt);
        const responseText = result.response.text();
        
        let aiReport;
        try {
            // JSON yanıtı parse et
            const cleanResponse = responseText.replace(/```json|```/g, '').trim();
            aiReport = JSON.parse(cleanResponse);
        } catch (parseError) {
            console.error('AI yanıtı parse edilemedi:', parseError);
            // Fallback rapor
            aiReport = {
                summary: `${studentName} bu hafta çalışmalarına devam etti.`,
                achievements: weeklyXP > 0 ? `Bu hafta ${weeklyXP} XP kazandı ve ${recentBadges.length} rozet aldı.` : 'Çalışma motivasyonunu korumaya devam ediyor.',
                concerns: weeklyStats.strugglingTopics.length > 0 ? `${weeklyStats.strugglingTopics[0]?.subject} dersinde biraz zorluk yaşıyor.` : 'Genel olarak iyi bir performans sergiliyor.',
                recommendations: 'Düzenli çalışma alışkanlığını devam ettirmesi için destekleyici olun.',
                motivationalMessage: 'Her adım başarıya doğru bir adımdır!'
            };
        }

        // Raporu kaydet
        const reportData = {
            studentId,
            parentId: userId,
            weekStart: admin.firestore.Timestamp.fromDate(weekStart),
            weekEnd: admin.firestore.Timestamp.fromDate(weekEnd),
            statistics: weeklyStats,
            aiReport,
            generatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const reportRef = await db.collection(`parent_reports`).add(reportData);

        return {
            success: true,
            reportId: reportRef.id,
            weeklyStats,
            aiReport,
            studentName,
            weekPeriod: {
                start: weekStart.toISOString(),
                end: weekEnd.toISOString()
            }
        };

    } catch (error) {
        console.error('Haftalık veli raporu oluşturma hatası:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Rapor oluşturulurken bir hata oluştu.');
    }
});

/**
 * Haftalık çalışma istatistiklerini hesaplayan yardımcı fonksiyon
 */
function calculateWeeklyStats(studySessions: any[], gamificationData: any) {
    const totalStudyMinutes = studySessions.reduce((total, session) => {
        return total + (session.durationInMinutes || 0);
    }, 0);

    const completedTasks = studySessions.length;
    const averageDailyMinutes = Math.round(totalStudyMinutes / 7);

    // Derslere göre grup
    const subjectStats: { [key: string]: { minutes: number, sessions: number } } = {};
    studySessions.forEach(session => {
        const subject = session.subject || 'Diğer';
        if (!subjectStats[subject]) {
            subjectStats[subject] = { minutes: 0, sessions: 0 };
        }
        subjectStats[subject].minutes += session.durationInMinutes || 0;
        subjectStats[subject].sessions += 1;
    });

    const subjects = Object.keys(subjectStats);
    const topSubject = subjects.length > 0 ? 
        subjects.reduce((a, b) => subjectStats[a].minutes > subjectStats[b].minutes ? a : b) : null;
    const weakestSubject = subjects.length > 1 ? 
        subjects.reduce((a, b) => subjectStats[a].minutes < subjectStats[b].minutes ? a : b) : null;

    // Zorlanılan konular (düşük performans veya çok tekrar)
    const strugglingTopics = studySessions
        .filter(session => session.score < 70 || session.attempts > 2)
        .map(session => ({
            subject: session.subject,
            topic: session.topic,
            score: session.score,
            attempts: session.attempts || 1
        }))
        .slice(0, 3);

    // Başarılı konular
    const successfulTopics = studySessions
        .filter(session => session.score >= 80)
        .map(session => ({
            subject: session.subject,
            topic: session.topic,
            score: session.score
        }))
        .slice(0, 3);

    // Günlük dağılım
    const dailyBreakdown = [];
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    
    for (let i = 0; i < 7; i++) {
        const dayMinutes = studySessions
            .filter(session => {
                const sessionDate = session.completedAt?.toDate ? session.completedAt.toDate() : new Date(session.completedAt);
                return sessionDate.getDay() === i;
            })
            .reduce((total, session) => total + (session.durationInMinutes || 0), 0);
        
        dailyBreakdown.push({
            dayName: days[i],
            minutes: dayMinutes
        });
    }

    return {
        totalStudyMinutes,
        completedTasks,
        averageDailyMinutes,
        topSubject,
        weakestSubject,
        strugglingTopics,
        successfulTopics,
        dailyBreakdown,
        subjectStats
    };
}