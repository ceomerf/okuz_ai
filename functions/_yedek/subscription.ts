// src/subscription.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import { db } from './utils';
import { SubscriptionData } from './types';

// Resource optimizasyonu için global options
const lightOptions = {
  memory: "128MiB" as const,
  timeoutSeconds: 30,
  concurrency: 20,
  minInstances: 0,
  maxInstances: 3
};

/**
 * Kullanıcının trial durumunu başlatır (onboarding tamamlandığında)
 */
export const startUserTrial = onCall(lightOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    const userId = request.auth.uid;

    try {
        const userRef = db.doc(`users/${userId}`);
        const now = admin.firestore.Timestamp.now();
        const trialEndDate = new Date(now.toDate().getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 gün sonra

        const subscriptionData: SubscriptionData = {
            subscriptionTier: 'free',
            trialStartDate: now,
            trialEndDate: admin.firestore.Timestamp.fromDate(trialEndDate),
            isTrialActive: true,
            autoRenew: false
        };

        await userRef.set({
            subscription: subscriptionData,
            isPremium: false
        }, { merge: true });

        return { 
            success: true, 
            message: 'Trial başlatıldı',
            trialEndDate: trialEndDate.toISOString()
        };
    } catch (error: any) {
        console.error('Trial başlatma hatası:', error);
        throw new HttpsError('internal', error.message || 'Trial başlatılamadı.');
    }
});

/**
 * Kullanıcının subscription durumunu kontrol eder
 */
export const checkSubscriptionStatus = onCall(lightOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    const userId = request.auth.uid;

    try {
        const userRef = db.doc(`users/${userId}`);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            throw new HttpsError('not-found', 'Kullanıcı bulunamadı.');
        }

        const userData = userSnap.data();
        const subscription = userData?.subscription as SubscriptionData | undefined;
        const now = admin.firestore.Timestamp.now();

        if (!subscription) {
            return {
                hasSubscription: false,
                isTrialActive: false,
                isPremium: false,
                subscriptionTier: 'free',
                canAccessPremiumFeatures: false
            };
        }

        // Trial durumunu kontrol et
        let isTrialActive = false;
        if (subscription.trialStartDate && subscription.trialEndDate) {
            isTrialActive = now.toDate() < subscription.trialEndDate.toDate();
        }

        // Premium durumunu kontrol et
        const isPremium = subscription.subscriptionTier !== 'free' || isTrialActive;
        const canAccessPremiumFeatures = isPremium;

        // Trial süresi dolmuşsa güncelle
        if (subscription.isTrialActive && !isTrialActive) {
            await userRef.update({
                'subscription.isTrialActive': false,
                'isPremium': subscription.subscriptionTier !== 'free'
            });
        }

        return {
            hasSubscription: true,
            isTrialActive,
            isPremium,
            subscriptionTier: subscription.subscriptionTier,
            canAccessPremiumFeatures,
            trialEndDate: subscription.trialEndDate?.toDate().toISOString(),
            subscriptionEndDate: subscription.subscriptionEndDate?.toDate().toISOString()
        };
    } catch (error: any) {
        console.error('Subscription durumu kontrol hatası:', error);
        throw new HttpsError('internal', error.message || 'Subscription durumu kontrol edilemedi.');
    }
});

/**
 * Kullanıcıyı premium yapar (test amaçlı)
 */
export const upgradeToPremium = onCall(lightOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    const userId = request.auth.uid;
    const { tier = 'ai_pro' } = request.data || {};

    try {
        const userRef = db.doc(`users/${userId}`);
        const now = admin.firestore.Timestamp.now();
        const subscriptionEndDate = new Date(now.toDate().getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 gün sonra

        const subscriptionData: SubscriptionData = {
            subscriptionTier: tier as 'ai_pro' | 'mentor_plus',
            trialStartDate: now,
            trialEndDate: now,
            isTrialActive: false,
            subscriptionStartDate: now,
            subscriptionEndDate: admin.firestore.Timestamp.fromDate(subscriptionEndDate),
            lastPaymentDate: now,
            autoRenew: true
        };

        await userRef.set({
            subscription: subscriptionData,
            isPremium: true
        }, { merge: true });

        return { 
            success: true, 
            message: 'Premium abonelik başlatıldı',
            subscriptionTier: tier
        };
    } catch (error: any) {
        console.error('Premium yükseltme hatası:', error);
        throw new HttpsError('internal', error.message || 'Premium yükseltme başarısız.');
    }
});

/**
 * Kurucu üye kampanyası - İlk 500 kişi için özel teklif
 */
export const joinFounderMembership = onCall(lightOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    const userId = request.auth.uid;

    try {
        // Kurucu üye sayısını kontrol et
        const founderCountSnapshot = await db.collection('users')
            .where('subscription.isFounderMember', '==', true)
            .count()
            .get();

        const currentFounderCount = founderCountSnapshot.data().count;
        
        if (currentFounderCount >= 500) {
            throw new HttpsError('resource-exhausted', 'Kurucu üye kampanyası dolmuştur. Standart abonelik seçeneklerimizi inceleyebilirsiniz.');
        }

        const userRef = db.doc(`users/${userId}`);
        const now = admin.firestore.Timestamp.now();
        
        // 1 yıllık abonelik (365 gün)
        const subscriptionEndDate = new Date(now.toDate().getTime() + (365 * 24 * 60 * 60 * 1000));
        
        // Kurucu üye ayrıcalığı 2 yıl geçerli
        const founderExpiryDate = new Date(now.toDate().getTime() + (2 * 365 * 24 * 60 * 60 * 1000));

        const subscriptionData: SubscriptionData = {
            subscriptionTier: 'founder',
            trialStartDate: now,
            trialEndDate: now,
            isTrialActive: false,
            subscriptionStartDate: now,
            subscriptionEndDate: admin.firestore.Timestamp.fromDate(subscriptionEndDate),
            lastPaymentDate: now,
            autoRenew: false, // Kurucu üyeler manuel yeniler
            isFounderMember: true,
            founderDiscountRate: 0.85, // %85 indirim
            founderExpiryDate: admin.firestore.Timestamp.fromDate(founderExpiryDate)
        };

        await userRef.set({
            subscription: subscriptionData,
            isPremium: true
        }, { merge: true });

        return { 
            success: true, 
            message: 'Kurucu üye olarak kaydoldunuz!',
            subscriptionTier: 'founder',
            founderNumber: currentFounderCount + 1,
            discountRate: 85
        };
    } catch (error: any) {
        console.error('Kurucu üye kayıt hatası:', error);
        throw new HttpsError('internal', error.message || 'Kurucu üye kaydı başarısız.');
    }
});

/**
 * Kurucu üye sayısını getir
 */
export const getFounderMemberCount = onCall(lightOptions, async (request) => {
    try {
        const founderCountSnapshot = await db.collection('users')
            .where('subscription.isFounderMember', '==', true)
            .count()
            .get();

        const currentFounderCount = founderCountSnapshot.data().count;
        const remainingSlots = Math.max(0, 500 - currentFounderCount);

        return {
            currentCount: currentFounderCount,
            remainingSlots: remainingSlots,
            isCampaignActive: remainingSlots > 0,
            totalSlots: 500
        };
    } catch (error: any) {
        console.error('Kurucu üye sayısı getirme hatası:', error);
        throw new HttpsError('internal', error.message || 'Kurucu üye sayısı alınamadı.');
    }
});

/**
 * Premium özelliklere erişim kontrolü
 */
export const checkPremiumAccess = onCall(lightOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }
    const userId = request.auth.uid;
    // const { feature } = request.data || {}; // Şu anda kullanılmıyor

    try {
        const userRef = db.doc(`users/${userId}`);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            throw new HttpsError('not-found', 'Kullanıcı bulunamadı.');
        }

        const userData = userSnap.data();
        const subscription = userData?.subscription as SubscriptionData | undefined;
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

        return { 
            success: true, 
            canAccess: true,
            subscriptionTier: subscription?.subscriptionTier || 'free',
            isTrialActive
        };
    } catch (error: any) {
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error('Premium erişim kontrolü hatası:', error);
        throw new HttpsError('internal', error.message || 'Erişim kontrolü başarısız.');
    }
}); 