// src/gamification.ts
import { onCall } from "firebase-functions/v2/https";
import { db } from './utils';
import { BADGE_CRITERIA } from './config';

// 🚀 AKILLI MVP STRATEJISI: Gamification Optimizasyonu
const lightOptions = {
  memory: "256MiB" as const,
  timeoutSeconds: 60,
  concurrency: 10,
  minInstances: 0,
  maxInstances: 2
};

/**
 * Rozet ve seviye kontrol fonksiyonu
 */
export async function checkAndAwardBadges(userId: string, profile: any, stats: any, planData: any) {
    const gamificationRef = db.doc(`users/${userId}/gamification/data`);
    const gamSnap = await gamificationRef.get();
    let badges: string[] = (gamSnap.exists && gamSnap.data()?.badges) ? gamSnap.data()?.badges : [];
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
 * 🎯 MVP CORE: Global leaderboard verilerini getirir
 * ⚡ Optimizasyon: v2 API + 256MB memory limit
 */
export const getGlobalLeaderboard = onCall(lightOptions, async (request) => {
    try {
        const limit = (request.data as any)?.limit || 100;
        
        // Tüm kullanıcıların gamification verilerini çek
        const usersRef = db.collection('users');
        const usersSnapshot = await usersRef.get();
        
        const leaderboardData: Array<{
            userId: string;
            userName: string;
            xp: number;
            level: number;
            avatarUrl?: string;
        }> = [];
        
        // Her kullanıcının gamification verisini çek
        const promises = usersSnapshot.docs.map(async (userDoc) => {
            const userId = userDoc.id;
            
            try {
                // Önce tek kullanıcı formatını dene
                const gamificationRef = db.doc(`users/${userId}/gamification/data`);
                let gamificationSnap = await gamificationRef.get();
                
                // Eğer bulunamazsa aile hesabı formatını dene
                if (!gamificationSnap.exists) {
                    const profilesRef = db.collection(`users/${userId}/studentProfiles`);
                    const profilesSnap = await profilesRef.get();
                    
                    for (const profileDoc of profilesSnap.docs) {
                        const profileGamRef = db.doc(`users/${userId}/studentProfiles/${profileDoc.id}/gamification/data`);
                        const profileGamSnap = await profileGamRef.get();
                        
                        if (profileGamSnap.exists) {
                            const gamData = profileGamSnap.data();
                            const profileData = profileDoc.data();
                            
                            leaderboardData.push({
                                userId: `${userId}_${profileDoc.id}`,
                                userName: profileData.fullName || profileData.name || 'Anonim Kullanıcı',
                                xp: gamData?.xp || 0,
                                level: gamData?.level || 1,
                                avatarUrl: profileData.avatarUrl
                            });
                        }
                    }
                } else {
                    // Tek kullanıcı hesabı
                    const gamData = gamificationSnap.data();
                    const userData = userDoc.data();
                    
                    // Kullanıcı profil bilgilerini de çek
                    const profileRef = db.doc(`users/${userId}/privateProfile/profile`);
                    const profileSnap = await profileRef.get();
                    const profileData = profileSnap.exists ? profileSnap.data() : {};
                    
                    leaderboardData.push({
                        userId,
                        userName: profileData?.fullName || userData?.displayName || userData?.email?.split('@')[0] || 'Anonim Kullanıcı',
                        xp: gamData?.xp || 0,
                        level: gamData?.level || 1,
                        avatarUrl: profileData?.avatarUrl || userData?.photoURL
                    });
                }
            } catch (error) {
                console.log(`Kullanıcı ${userId} gamification verisi alınamadı:`, error);
                // Hata durumunda sessizce geç
            }
        });
        
        await Promise.all(promises);
        
        // XP'ye göre sırala ve limit uygula (tüm kullanıcıları dahil et)
        const sortedLeaderboard = leaderboardData
            .sort((a, b) => b.xp - a.xp) // XP'ye göre azalan sırada sırala
            .slice(0, limit); // Sadece limit kadar al
        
        return {
            success: true,
            leaderboard: sortedLeaderboard,
            totalUsers: sortedLeaderboard.length
        };
        
    } catch (error) {
        console.error('Global leaderboard hatası:', error);
        return {
            success: false,
            error: 'Sıralama verileri alınamadı',
            leaderboard: []
        };
    }
}); 