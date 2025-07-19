// src/profile.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import { db } from './utils';
import { StudentProfile, UserDocument, PlanGenerationQueueItem } from './types';

// 🚀 AKILLI MVP STRATEJISI: Resource Optimizasyonu
// Hafif fonksiyonlar - Basit CRUD işlemleri
const ultraLightOptions = {
  memory: "128MiB" as const,
  timeoutSeconds: 30,
  concurrency: 20,
  minInstances: 0,
  maxInstances: 3
};

// Orta seviye - Daha fazla mantık
// Kullanılmayan lightOptions kaldırıldı

// AI destekli fonksiyonlar
const mediumOptions = {
  memory: "512MiB" as const,
  timeoutSeconds: 120,
  concurrency: 5,
  minInstances: 0,
  maxInstances: 2
};

/**
 * 🎯 MVP CORE: Onboarding sırasında kullanıcıdan alınan profil bilgilerini Firestore'a kaydeden fonksiyon.
 * ⚡ Optimizasyon: 256MB -> 128MB (Basit Firestore write işlemi)
 * Artık hem tek kullanıcı hem de aile hesabı sistemini destekler.
 */
export const completeOnboardingProfile = onCall(ultraLightOptions, async (request) => {
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
        preferredSessionDuration, // 🚀 YENİ: İdeal çalışma süresi
        studyDays,
        dailyHours,
        // Yeni aile hesabı parametreleri
        profileId,
        profileName,
        accountType = 'single', // varsayılan: tek kullanıcı
        parentName,
        isNewProfile = false // Yeni öğrenci profili mi ekleniyor?
    } = data;

    // --- GÜNCELLEME BAŞLANGIÇ ---
    // Eğer veli onboarding ise sadece ad zorunlu, diğer alanlar zorunlu değil
    if (accountType === 'parent' || accountType === 'family') {
        if (!parentName && !fullName) {
            throw new HttpsError('invalid-argument', 'Veli hesabı için ad zorunludur.');
        }
        // Veli için öğrenci alanları zorunlu değil, fonksiyonun devamında sadece parentName/fullName ile ilerleyecek
    } else {
        // Öğrenci için mevcut zorunlu alanlar kontrolü
        if (!fullName || !grade || !academicTrack || !targetExam || !learningStyle || !confidenceLevels || !preferredStudyTimes || !preferredSessionDuration || !studyDays || !dailyHours) {
            throw new HttpsError('invalid-argument', 'Tüm alanlar zorunludur. Eksik bilgi var.');
        }
    }
    // --- GÜNCELLEME SONU ---

    try {
        // Ana kullanıcı dokümanını al/güncelle
        const userRef = db.doc(`users/${userId}`);
        const userSnap = await userRef.get();
        
        let userData: Partial<UserDocument> = {};
        if (userSnap.exists) {
            userData = userSnap.data() as UserDocument;
        }

        if (accountType === 'family') {
            // AİLE HESABI MODELİ
            if (!profileId || !profileName) {
                throw new HttpsError('invalid-argument', 'Aile hesabı için profileId ve profileName gereklidir.');
            }

            // Öğrenci profil verilerini hazırla
            const studentProfileData: StudentProfile = {
                profileId,
                profileName,
                grade,
                academicTrack,
                targetUniversity,
                targetExam,
                learningStyle,
                confidenceLevels,
                preferredStudyTimes,
                preferredSessionDuration: preferredSessionDuration || 25, // 🚀 YENİ
                studyDays,
                dailyHours,
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                currentStatus: {
                    activity: 'inactive',
                    lastSeen: admin.firestore.FieldValue.serverTimestamp()
                }
            };

            // Öğrenci profilini studentProfiles koleksiyonuna kaydet
            const studentProfileRef = db.doc(`users/${userId}/studentProfiles/${profileId}`);
            await studentProfileRef.set(studentProfileData);

            // Öğrenci için detay verileri oluştur
            const profileDetailData = {
                fullName,
                grade,
                academicTrack,
                targetUniversity,
                targetExam,
                learningStyle,
                confidenceLevels,
                preferredStudyTimes,
                preferredSessionDuration: preferredSessionDuration || 25, // 🚀 YENİ
                studyDays,
                dailyHours,
                onboardingCompleted: true,
                profileId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            // Profil detaylarını alt koleksiyona kaydet
            const profileDetailRef = db.doc(`users/${userId}/studentProfiles/${profileId}/privateProfile/profile`);
            await profileDetailRef.set(profileDetailData, { merge: true });

            // Ana kullanıcı dokümanını güncelle
            const updateData: Partial<UserDocument> = {
                accountType: 'family',
                selectedProfileId: profileId, // Şu anda aktif profil
                activeStudentCount: (userData.activeStudentCount || 0) + (isNewProfile ? 1 : 0),
                onboardingCompleted: true,
            };

            if (parentName) {
                updateData.parentName = parentName;
            }

            // İlk profil ise trial başlat
            if (!userSnap.exists || !userData.subscription) {
                const now = admin.firestore.Timestamp.now();
                const trialEndDate = new Date(now.toDate().getTime() + (7 * 24 * 60 * 60 * 1000));
                
                updateData.subscription = {
                    subscriptionTier: 'free',
                    trialStartDate: now,
                    trialEndDate: admin.firestore.Timestamp.fromDate(trialEndDate),
                    isTrialActive: true,
                    autoRenew: false
                };
                updateData.isPremium = false;
            }

            await userRef.set(updateData, { merge: true });

            // Öğrenci için gamification verisi oluştur
            const gamificationRef = db.doc(`users/${userId}/studentProfiles/${profileId}/gamification/data`);
            await gamificationRef.set({
                profileId,
                userId,
                xp: 0,
                level: 1,
                streak: 0,
                badges: [],
                subjectXP: {},
                achievements: [],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // 🚀 ASENKRON PLAN OLUŞTURMA: Queue'ya talep ekle
            try {
                await addToPlanGenerationQueue(userId, profileId);
                console.log(`✅ Aile hesabı öğrenci profili ${profileId} için plan oluşturma queue'sına eklendi`);
            } catch (queueError: any) {
                console.error(`⚠️ Plan queue'ya ekleme hatası (kritik değil):`, queueError);
                // Bu hata onboarding'i durdurmasın, plan manual olarak tetiklenebilir
            }

            return { 
                success: true, 
                accountType: 'family',
                profileId,
                message: `${profileName} profili başarıyla oluşturuldu. Planın hazırlanıyor!`,
                isNewProfile,
                planGenerationQueued: true
            };

        } else if (accountType === 'parent') {
            // VELİ HESABI MODELİ
            const privateProfileRef = db.doc(`users/${userId}/privateProfile/profile`);

            const privateProfileData = {
                fullName: parentName || fullName,
                accountType: 'parent',
                onboardingCompleted: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            await privateProfileRef.set(privateProfileData, { merge: true });
            
            // Trial başlat
            const now = admin.firestore.Timestamp.now();
            const trialEndDate = new Date(now.toDate().getTime() + (7 * 24 * 60 * 60 * 1000));
            
            const subscriptionData = {
                subscriptionTier: 'free',
                trialStartDate: now,
                trialEndDate: admin.firestore.Timestamp.fromDate(trialEndDate),
                isTrialActive: true,
                autoRenew: false
            };
            
            // Ana kullanıcı dökümanını güncelle
            await userRef.set({ 
                accountType: 'parent',
                parentName: parentName || fullName,
                onboardingCompleted: true,
                isPremium: false,
                subscription: subscriptionData
            }, { merge: true });
            
            return { 
                success: true, 
                accountType: 'parent',
                message: 'Veli profili başarıyla kaydedildi ve 7 günlük trial başlatıldı.',
                trialEndDate: trialEndDate.toISOString()
            };
        } else {
            // TEK KULLANICI MODELİ (Geriye uyumluluk)
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
                preferredSessionDuration: preferredSessionDuration || 25, // 🚀 YENİ
                studyDays,
                dailyHours,
                onboardingCompleted: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            // Ana kullanıcı dokümanını da güncelle
            await db.doc(`users/${userId}`).update({
                isOnboardingCompleted: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            await privateProfileRef.set(privateProfileData, { merge: true });
            
            // Trial başlat
            const now = admin.firestore.Timestamp.now();
            const trialEndDate = new Date(now.toDate().getTime() + (7 * 24 * 60 * 60 * 1000));
            
            const subscriptionData = {
                subscriptionTier: 'free',
                trialStartDate: now,
                trialEndDate: admin.firestore.Timestamp.fromDate(trialEndDate),
                isTrialActive: true,
                autoRenew: false
            };
            
            // Ana kullanıcı dökümanını güncelle
            await userRef.set({ 
                accountType: 'single',
                onboardingCompleted: true,
                isPremium: false,
                subscription: subscriptionData
            }, { merge: true });
            
            // 🚀 ASENKRON PLAN OLUŞTURMA: Queue'ya talep ekle (tek kullanıcı modu)
            try {
                await addToPlanGenerationQueue(userId); // profileId yok, tek kullanıcı
                console.log(`✅ Tek kullanıcı ${userId} için plan oluşturma queue'sına eklendi`);
            } catch (queueError: any) {
                console.error(`⚠️ Plan queue'ya ekleme hatası (kritik değil):`, queueError);
                // Bu hata onboarding'i durdurmasın, plan manual olarak tetiklenebilir
            }
            
            return { 
                success: true, 
                accountType: 'single',
                message: 'Profil başarıyla kaydedildi, trial başlatıldı ve planın hazırlanıyor!',
                trialEndDate: trialEndDate.toISOString(),
                planGenerationQueued: true
            };
        }
    } catch (error: any) {
        console.error('Profil kaydedilirken hata:', error);
        throw new HttpsError('internal', error.message || 'Profil kaydedilemedi.');
    }
});

/**
 * Plan oluşturma talebini queue'ya ekleyen yardımcı fonksiyon
 */
async function addToPlanGenerationQueue(
    userId: string, 
    profileId?: string, 
    startingPoint?: string,
    lastCompletedTopics?: { [subject: string]: string }
): Promise<void> {
    try {
        // Mevcut queue'yu kontrol et
        const existingQueueItem = await db.doc(`planGenerationQueue/${userId}`).get();
        if (existingQueueItem.exists) {
            const data = existingQueueItem.data() as PlanGenerationQueueItem;
            if (data.status === 'pending' || data.status === 'processing') {
                console.log(`Kullanıcı ${userId} için zaten aktif bir plan oluşturma talebi var, yeni talep eklenmedi`);
                return;
            }
        }

        // Sıradaki pozisyonu hesapla
        const pendingItems = await db.collection('planGenerationQueue')
            .where('status', '==', 'pending')
            .orderBy('requestTimestamp', 'asc')
            .get();
        
        const queuePosition = pendingItems.size + 1;
        
        // Tahmini tamamlanma zamanını hesapla (her plan için ortalama 5 dakika varsayıyoruz)
        const averageProcessingTimeMinutes = 5;
        const estimatedCompletionTime = new Date(Date.now() + (queuePosition * averageProcessingTimeMinutes * 60 * 1000));

        const queueItem: PlanGenerationQueueItem = {
            status: 'pending',
            userId,
            profileId,
            requestTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            queuePosition,
            estimatedCompletionTime: admin.firestore.Timestamp.fromDate(estimatedCompletionTime),
            startingPoint: (startingPoint as 'current' | 'behind' | 'ahead') || 'current',
            lastCompletedTopics: lastCompletedTopics || {},
            planType: 'regular',
            retryCount: 0
        };

        await db.doc(`planGenerationQueue/${userId}`).set(queueItem);
        console.log(`✅ Kullanıcı ${userId} plan oluşturma queue'sına eklendi. Sıra: ${queuePosition}`);
        
    } catch (error: any) {
        console.error(`❌ Plan queue'ya ekleme hatası (${userId}):`, error);
        throw error;
    }
}

/**
 * Gelişmiş onboarding: Mini teşhis sınavı sonuçlarını ve öğrenme alışkanlıklarını kaydeder.
 * Kullanıcı profilini daha detaylı ve veri odaklı hale getirir.
 */
export const createAdvancedProfile = onCall(mediumOptions, async (request) => {
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
    
    // Test sonuçları özeti
    const summary = {
        totalQuestions: testResults.questions.length,
        correctAnswers: testResults.questions.filter((q: any) => q.isCorrect).length,
        totalTime: testResults.totalTimeSpent,
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