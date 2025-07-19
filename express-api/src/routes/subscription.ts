import { Router, Request, Response } from 'express';
import { authenticateToken } from '../utils/auth';
import { asyncHandler } from '../utils/errorHandler';
import { HttpError } from '../utils/errorHandler';
import { db } from '../utils/firebase';
import { logger } from '../utils/logger';
import { AuthenticatedRequest, ApiResponse, SubscriptionData } from '../types';
import * as admin from 'firebase-admin';

const router = Router();

/**
 * POST /api/v1/subscription/startUserTrial
 * Kullanıcının trial durumunu başlatır (onboarding tamamlandığında)
 */
router.post('/startUserTrial', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;

  try {
    logger.info(`🎯 Trial başlatılıyor - User: ${userId}`);

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

    logger.info(`✅ Trial başlatıldı - User: ${userId}, Bitiş: ${trialEndDate.toISOString()}`);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Trial başlatıldı',
        trialEndDate: trialEndDate.toISOString(),
        daysRemaining: 7
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('Trial başlatma hatası:', error);
    throw new HttpError(`Trial başlatılamadı: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/subscription/checkSubscriptionStatus
 * Kullanıcının subscription durumunu kontrol eder
 */
router.post('/checkSubscriptionStatus', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;

  try {
    logger.info(`📊 Subscription durumu kontrol ediliyor - User: ${userId}`);

    const userRef = db.doc(`users/${userId}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpError('Kullanıcı bulunamadı', 404);
    }

    const userData = userSnap.data();
    const subscription = userData?.subscription as SubscriptionData | undefined;
    const now = admin.firestore.Timestamp.now();

    if (!subscription) {
      const response: ApiResponse = {
        success: true,
        data: {
          hasSubscription: false,
          isTrialActive: false,
          isPremium: false,
          subscriptionTier: 'free',
          canAccessPremiumFeatures: false
        },
        timestamp: new Date().toISOString()
      };
      return res.status(200).json(response);
    }

    // Trial durumunu kontrol et
    let isTrialActive = false;
    let daysRemaining = 0;
    if (subscription.trialStartDate && subscription.trialEndDate) {
      isTrialActive = now.toDate() < subscription.trialEndDate.toDate();
      if (isTrialActive) {
        const msRemaining = subscription.trialEndDate.toDate().getTime() - now.toDate().getTime();
        daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
      }
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

    logger.info(`✅ Subscription durumu kontrol edildi - User: ${userId}, Premium: ${isPremium}`);

    const response: ApiResponse = {
      success: true,
      data: {
        hasSubscription: true,
        isTrialActive,
        isPremium,
        subscriptionTier: subscription.subscriptionTier,
        canAccessPremiumFeatures,
        daysRemaining: isTrialActive ? daysRemaining : 0,
        autoRenew: subscription.autoRenew || false
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('Subscription kontrol hatası:', error);
    throw new HttpError(`Subscription durumu kontrol edilemedi: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/subscription/upgradeToPremium
 * Kullanıcıyı premium'a yükseltir
 */
router.post('/upgradeToPremium', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const { planType = 'monthly', paymentMethod } = req.body;

  if (!paymentMethod) {
    throw new HttpError('Payment method gereklidir', 400);
  }

  try {
    logger.info(`💳 Premium upgrade başlatılıyor - User: ${userId}, Plan: ${planType}`);

    const userRef = db.doc(`users/${userId}`);
    const now = admin.firestore.Timestamp.now();
    
    // Plan süresini belirle
    const planDurationMs = planType === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const expiryDate = new Date(now.toDate().getTime() + planDurationMs);

    const subscriptionData: SubscriptionData = {
      subscriptionTier: 'premium',
      isTrialActive: false,
      autoRenew: true,
      purchaseDate: now,
      expiryDate: admin.firestore.Timestamp.fromDate(expiryDate)
    };

    await userRef.set({
      subscription: subscriptionData,
      isPremium: true,
      lastUpgrade: now
    }, { merge: true });

    // Upgrade event'ini logla
    await db.collection(`users/${userId}/subscription_events`).add({
      eventType: 'upgrade',
      fromTier: 'free',
      toTier: 'premium',
      planType,
      paymentMethod,
      timestamp: now,
      expiryDate: admin.firestore.Timestamp.fromDate(expiryDate)
    });

    logger.info(`✅ Premium upgrade tamamlandı - User: ${userId}, Bitiş: ${expiryDate.toISOString()}`);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Premium abonelik başarıyla aktivleştirildi!',
        subscriptionTier: 'premium',
        expiryDate: expiryDate.toISOString(),
        planType,
        isPremium: true
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('Premium upgrade hatası:', error);
    throw new HttpError(`Premium upgrade başarısız: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/subscription/joinFounderMembership
 * Kullanıcıyı founder membership'e dahil eder
 */
router.post('/joinFounderMembership', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const { inviteCode } = req.body;

  // Basit invite code kontrolü (gerçek uygulamada daha karmaşık olabilir)
  const validInviteCodes = ['FOUNDER2024', 'OKUZ_FOUNDER', 'EARLY_ACCESS'];
  
  if (!inviteCode || !validInviteCodes.includes(inviteCode)) {
    throw new HttpError('Geçersiz davet kodu', 400);
  }

  try {
    logger.info(`👑 Founder membership başlatılıyor - User: ${userId}, Code: ${inviteCode}`);

    const userRef = db.doc(`users/${userId}`);
    const now = admin.firestore.Timestamp.now();
    
    // Founder membership süresi (lifetime)
    const expiryDate = new Date('2030-12-31'); // 2030'a kadar geçerli

    const subscriptionData: SubscriptionData = {
      subscriptionTier: 'founder',
      isTrialActive: false,
      autoRenew: false,
      purchaseDate: now,
      expiryDate: admin.firestore.Timestamp.fromDate(expiryDate)
    };

    await userRef.set({
      subscription: subscriptionData,
      isPremium: true,
      isFounder: true,
      founderJoinDate: now,
      founderInviteCode: inviteCode
    }, { merge: true });

    // Founder event'ini logla
    await db.collection(`users/${userId}/subscription_events`).add({
      eventType: 'founder_join',
      toTier: 'founder',
      inviteCode,
      timestamp: now,
      isLifetime: true
    });

    logger.info(`✅ Founder membership tamamlandı - User: ${userId}`);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Founder membership başarıyla aktivleştirildi! 🎉',
        subscriptionTier: 'founder',
        isLifetime: true,
        isPremium: true,
        isFounder: true,
        specialBenefits: [
          'Lifetime premium access',
          'Priority support',
          'Founder badge',
          'Early access to new features'
        ]
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('Founder membership hatası:', error);
    throw new HttpError(`Founder membership başarısız: ${error.message}`, 500);
  }
}));

export default router; 