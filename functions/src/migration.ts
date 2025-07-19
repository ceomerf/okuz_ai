// src/migration.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import { db } from './utils';
import { StudentProfile, UserDocument } from './types';

// 🚀 AKILLI MVP STRATEJISI: Migration Optimizasyonu
// Hafif migrasyon - Tek kullanıcı için
const lightMigrationOptions = {
  memory: "256MiB" as const,
  timeoutSeconds: 120,
  concurrency: 3,
  minInstances: 0,
  maxInstances: 2
};

// Ağır migrasyon - Bulk operations için
const heavyMigrationOptions = {
  memory: "512MiB" as const,
  timeoutSeconds: 300,
  concurrency: 1,
  minInstances: 0,
  maxInstances: 1
};

/**
 * 🎯 MVP CORE: Mevcut tek kullanıcı hesabını aile hesabına migrate eden fonksiyon
 * ⚡ Optimizasyon: 512MB -> 256MB (Tek kullanıcı migration)
 * Bu fonksiyon mevcut kullanıcı verilerini koruyarak yeni yapıya taşır
 */
export const migrateToFamilyAccount = onCall(lightMigrationOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    
    const userId = request.auth.uid;
    const { parentName, firstStudentName } = request.data || {};
    
    if (!parentName || !firstStudentName) {
        throw new HttpsError('invalid-argument', 'parentName ve firstStudentName zorunludur.');
    }

    try {
        console.log(`Migrasyon başlatılıyor: userId=${userId}`);

        // 1. Mevcut kullanıcı verilerini kontrol et
        const userRef = db.doc(`users/${userId}`);
        const userSnap = await userRef.get();
        
        if (!userSnap.exists) {
            throw new HttpsError('not-found', 'Kullanıcı bulunamadı.');
        }
        
        const userData = userSnap.data() as UserDocument;
        
        // Zaten aile hesabıysa hata ver
        if (userData.accountType === 'family') {
            throw new HttpsError('already-exists', 'Bu hesap zaten aile hesabıdır.');
        }

        // 2. Mevcut profil verilerini al
        const profileRef = db.doc(`users/${userId}/privateProfile/profile`);
        const profileSnap = await profileRef.get();
        
        if (!profileSnap.exists) {
            throw new HttpsError('not-found', 'Kullanıcı profili bulunamadı.');
        }
        
        const profileData = profileSnap.data()!;
        console.log(`Profil verileri bulundu: ${Object.keys(profileData).length} alan`);

        // 3. Benzersiz profil ID oluştur
        const profileId = db.collection('temp').doc().id;
        console.log(`Yeni profil ID: ${profileId}`);

        // 4. Yeni öğrenci profili oluştur
        const studentProfileData: StudentProfile = {
            profileId,
            profileName: firstStudentName,
            grade: profileData.grade || '12',
            academicTrack: profileData.academicTrack || 'sayisal',
            targetUniversity: profileData.targetUniversity || '',
            targetExam: profileData.targetExam || 'YKS',
            learningStyle: profileData.learningStyle || 'visual',
            confidenceLevels: profileData.confidenceLevels || {},
            preferredStudyTimes: profileData.preferredStudyTimes || [],
            studyDays: profileData.studyDays || [],
            dailyHours: profileData.dailyHours || 2,
            preferredSessionDuration: profileData.preferredSessionDuration || 45, // 🚀 YENİ: Varsayılan 45 dakika
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            currentStatus: {
                activity: 'inactive',
                lastSeen: admin.firestore.FieldValue.serverTimestamp()
            }
        };

        // 5. Öğrenci profilini kaydet
        const studentProfileRef = db.doc(`users/${userId}/studentProfiles/${profileId}`);
        await studentProfileRef.set(studentProfileData);
        console.log('Öğrenci profili oluşturuldu');

        // 6. Profil detaylarını yeni konuma kopyala
        const newProfileDetailRef = db.doc(`users/${userId}/studentProfiles/${profileId}/privateProfile/profile`);
        await newProfileDetailRef.set({
            ...profileData,
            profileId,
            migrationDate: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('Profil detayları kopyalandı');

        // 7. Gamification verilerini migrate et
        await migrateGamificationData(userId, profileId);

        // 8. Plan verilerini migrate et
        await migratePlanData(userId, profileId);

        // 9. Analytics verilerini migrate et
        await migrateAnalyticsData(userId, profileId);

        // 10. Performance verilerini migrate et
        await migratePerformanceData(userId, profileId);

        // 11. Ana kullanıcı dokümanını güncelle
        await userRef.update({
            accountType: 'family',
            parentName,
            selectedProfileId: profileId,
            activeStudentCount: 1,
            maxStudentProfiles: 3, // Varsayılan limit
            migrationDate: admin.firestore.FieldValue.serverTimestamp(),
            migrationCompleted: true,
        });
        console.log('Ana kullanıcı dokümanı güncellendi');

        return {
            success: true,
            message: 'Hesap başarıyla aile hesabına dönüştürüldü.',
            profileId,
            profileName: firstStudentName,
        };

    } catch (error: any) {
        console.error('Migrasyon hatası:', error);
        throw new HttpsError('internal', error.message || 'Migrasyon işlemi başarısız.');
    }
});

/**
 * Gamification verilerini yeni yapıya migrate eder
 */
async function migrateGamificationData(userId: string, profileId: string): Promise<void> {
    try {
        const oldGamificationRef = db.doc(`users/${userId}/gamification/data`);
        const gamificationSnap = await oldGamificationRef.get();
        
        if (gamificationSnap.exists) {
            const gamificationData = gamificationSnap.data()!;
            
            // Yeni konuma kopyala
            const newGamificationRef = db.doc(`users/${userId}/studentProfiles/${profileId}/gamification/data`);
            await newGamificationRef.set({
                ...gamificationData,
                profileId,
                userId,
                migratedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            console.log('Gamification verileri migrate edildi');
        }
    } catch (error) {
        console.error('Gamification migrasyon hatası:', error);
        // Gamification verileri kritik değil, hatayı yut
    }
}

/**
 * Plan verilerini yeni yapıya migrate eder
 */
async function migratePlanData(userId: string, profileId: string): Promise<void> {
    try {
        const oldPlanRef = db.doc(`users/${userId}/plan/user_plan`);
        const planSnap = await oldPlanRef.get();
        
        if (planSnap.exists) {
            const planData = planSnap.data()!;
            
            // Yeni konuma kopyala
            const newPlanRef = db.doc(`users/${userId}/studentProfiles/${profileId}/plan/user_plan`);
            await newPlanRef.set({
                ...planData,
                profileId,
                migratedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            console.log('Plan verileri migrate edildi');
        }
    } catch (error) {
        console.error('Plan migrasyon hatası:', error);
    }
}

/**
 * Analytics verilerini yeni yapıya migrate eder
 */
async function migrateAnalyticsData(userId: string, profileId: string): Promise<void> {
    try {
        // Analytics koleksiyonunu migrate et
        const oldAnalyticsRef = db.collection(`users/${userId}/analytics/daily_logs/sessions`);
        const analyticsSnap = await oldAnalyticsRef.get();
        
        if (!analyticsSnap.empty) {
            const batch = db.batch();
            
            for (const doc of analyticsSnap.docs) {
                const sessionData = doc.data();
                const newSessionRef = db.doc(`users/${userId}/studentProfiles/${profileId}/analytics/daily_logs/sessions/${doc.id}`);
                
                batch.set(newSessionRef, {
                    ...sessionData,
                    profileId,
                    migratedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            
            await batch.commit();
            console.log(`${analyticsSnap.size} analytics kayıt migrate edildi`);
        }
    } catch (error) {
        console.error('Analytics migrasyon hatası:', error);
    }
}

/**
 * Performance verilerini yeni yapıya migrate eder
 */
async function migratePerformanceData(userId: string, profileId: string): Promise<void> {
    try {
        // Performance analytics
        const oldPerformanceRef = db.doc(`users/${userId}/performance_analytics`);
        const performanceSnap = await oldPerformanceRef.get();
        
        if (performanceSnap.exists) {
            const performanceData = performanceSnap.data()!;
            const newPerformanceRef = db.doc(`users/${userId}/studentProfiles/${profileId}/performance_analytics`);
            
            await newPerformanceRef.set({
                ...performanceData,
                profileId,
                migratedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            console.log('Performance analytics migrate edildi');
        }

        // Performance collection
        const oldPerfCollectionRef = db.doc(`users/${userId}/performance/analytics`);
        const perfCollectionSnap = await oldPerfCollectionRef.get();
        
        if (perfCollectionSnap.exists) {
            const perfData = perfCollectionSnap.data()!;
            const newPerfRef = db.doc(`users/${userId}/studentProfiles/${profileId}/performance/analytics`);
            
            await newPerfRef.set({
                ...perfData,
                profileId,
                migratedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            console.log('Performance collection migrate edildi');
        }
    } catch (error) {
        console.error('Performance migrasyon hatası:', error);
    }
}

/**
 * Tüm kullanıcıları otomatik migrate eden admin fonksiyonu (dikkatli kullanılmalı)
 */
export const bulkMigrateToFamilyAccounts = onCall(heavyMigrationOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }

    // Admin kontrolü (sadece belirli email adreslerine izin ver)
    const adminEmails = ['admin@okuz.ai', 'migration@okuz.ai'];
    const userEmail = request.auth.token.email;
    
    if (!adminEmails.includes(userEmail)) {
        throw new HttpsError('permission-denied', 'Bu işlem için admin yetkisi gereklidir.');
    }

    try {
        console.log('Bulk migrasyon başlatılıyor...');
        
        // Tek kullanıcı hesaplarını bul
        const usersSnapshot = await db.collection('users')
            .where('accountType', '==', 'single')
            .limit(50) // Güvenlik için limit
            .get();

        let migratedCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const userDoc of usersSnapshot.docs) {
            try {
                const userId = userDoc.id;
                const userData = userDoc.data();
                
                // Profil verilerini kontrol et
                const profileSnap = await db.doc(`users/${userId}/privateProfile/profile`).get();
                if (!profileSnap.exists) {
                    console.log(`Kullanıcı ${userId} için profil bulunamadı, atlanıyor`);
                    continue;
                }

                const profileData = profileSnap.data()!;
                const studentName = profileData.fullName || 'Öğrenci';
                const parentName = userData.email?.split('@')[0] || 'Veli';

                // Migrate et
                await migrateUserToFamilyAccount(userId, parentName, studentName);
                migratedCount++;
                
                console.log(`Kullanıcı ${userId} başarıyla migrate edildi`);
                
            } catch (error: any) {
                errorCount++;
                const errorMsg = `User ${userDoc.id}: ${error.message}`;
                errors.push(errorMsg);
                console.error('Kullanıcı migrasyon hatası:', errorMsg);
            }
        }

        return {
            success: true,
            migratedCount,
            errorCount,
            errors: errors.slice(0, 10), // İlk 10 hatayı döndür
            message: `${migratedCount} kullanıcı başarıyla migrate edildi, ${errorCount} hata oluştu.`,
        };

    } catch (error: any) {
        console.error('Bulk migrasyon hatası:', error);
        throw new HttpsError('internal', error.message || 'Bulk migrasyon başarısız.');
    }
});

/**
 * Tekil kullanıcı migrasyon helper fonksiyonu
 */
async function migrateUserToFamilyAccount(userId: string, parentName: string, studentName: string): Promise<void> {
    // Bu fonksiyon migrateToFamilyAccount ile aynı mantığı kullanır
    // Ancak request/auth parametreleri olmadan çalışır
    
    const profileId = db.collection('temp').doc().id;
    
    // Mevcut verileri al
    const profileSnap = await db.doc(`users/${userId}/privateProfile/profile`).get();
    if (!profileSnap.exists) {
        throw new Error('Profil bulunamadı');
    }
    
    const profileData = profileSnap.data()!;
    
    // Student profile oluştur
    const studentProfileData: StudentProfile = {
        profileId,
        profileName: studentName,
        grade: profileData.grade || '12',
        academicTrack: profileData.academicTrack || 'sayisal',
        targetUniversity: profileData.targetUniversity || '',
        targetExam: profileData.targetExam || 'YKS',
        learningStyle: profileData.learningStyle || 'visual',
        confidenceLevels: profileData.confidenceLevels || {},
        preferredStudyTimes: profileData.preferredStudyTimes || [],
        studyDays: profileData.studyDays || [],
        dailyHours: profileData.dailyHours || 2,
        preferredSessionDuration: profileData.preferredSessionDuration || 45, // 🚀 YENİ: Varsayılan 45 dakika
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        currentStatus: {
            activity: 'inactive',
            lastSeen: admin.firestore.FieldValue.serverTimestamp()
        }
    };

    // Verileri migrate et
    await db.doc(`users/${userId}/studentProfiles/${profileId}`).set(studentProfileData);
    await db.doc(`users/${userId}/studentProfiles/${profileId}/privateProfile/profile`).set({
        ...profileData,
        profileId,
        migrationDate: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Diğer verileri migrate et
    await migrateGamificationData(userId, profileId);
    await migratePlanData(userId, profileId);
    await migrateAnalyticsData(userId, profileId);
    await migratePerformanceData(userId, profileId);

    // Ana kullanıcı dokümanını güncelle
    await db.doc(`users/${userId}`).update({
        accountType: 'family',
        parentName,
        selectedProfileId: profileId,
        activeStudentCount: 1,
        maxStudentProfiles: 3,
        migrationDate: admin.firestore.FieldValue.serverTimestamp(),
        migrationCompleted: true,
    });
} 