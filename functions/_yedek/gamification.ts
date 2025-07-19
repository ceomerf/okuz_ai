// src/gamification.ts
import { db } from './utils';
import { BADGE_CRITERIA } from './config';

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