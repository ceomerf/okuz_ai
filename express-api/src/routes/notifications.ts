import { Router, Request, Response } from 'express';
import { authenticateToken } from '../utils/auth';
import { asyncHandler } from '../utils/errorHandler';
import { HttpError } from '../utils/errorHandler';
import { db, messaging } from '../utils/firebase';
import { logger } from '../utils/logger';
import { AuthenticatedRequest, ApiResponse } from '../types';

const router = Router();

/**
 * POST /api/v1/notifications/sendPlanReadyNotification
 * Plan hazır olduğunda bildirim gönderir
 */
router.post('/sendPlanReadyNotification', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId, planId, profileId, customMessage } = req.body;

  if (!userId || !planId) {
    throw new HttpError('userId ve planId gereklidir', 400);
  }

  try {
    logger.info(`🔔 Plan hazır bildirimi gönderiliyor - User: ${userId}, Plan: ${planId}`);

    // Kullanıcının FCM token'ını al
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      throw new HttpError('Kullanıcı bulunamadı', 404);
    }

    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken;

    if (!fcmToken) {
      logger.warn(`⚠️ FCM token bulunamadı - User: ${userId}`);
      const response: ApiResponse = {
        success: false,
        error: 'FCM token bulunamadı',
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }

    // Profil adını al (eğer varsa)
    let profileName = 'Planınız';
    if (profileId && userData?.accountType === 'family') {
      const profileDoc = await db.doc(`users/${userId}/profiles/${profileId}`).get();
      if (profileDoc.exists) {
        profileName = `${profileDoc.data()?.profileName || 'Öğrenci'} için planınız`;
      }
    }

    // Bildirim mesajını oluştur
    const notification = {
      title: '🎉 Planınız Hazır!',
      body: customMessage || `${profileName} başarıyla oluşturuldu. Hemen inceleyin!`
    };

    const message = {
      notification,
      data: {
        type: 'plan_ready',
        planId,
        userId,
        profileId: profileId || '',
        timestamp: new Date().toISOString()
      },
      token: fcmToken
    };

    // FCM bildirimi gönder
    const result = await messaging.send(message);

    // Bildirim geçmişine kaydet
    await db.collection(`users/${userId}/notifications`).add({
      type: 'plan_ready',
      title: notification.title,
      body: notification.body,
      planId,
      profileId: profileId || null,
      sentAt: new Date(),
      messageId: result,
      status: 'sent'
    });

    logger.info(`✅ Plan hazır bildirimi gönderildi - User: ${userId}, MessageId: ${result}`);

    const response: ApiResponse = {
      success: true,
      data: {
        messageId: result,
        message: 'Bildirim başarıyla gönderildi'
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Plan hazır bildirimi hatası:', error);
    throw new HttpError(`Bildirim gönderilemedi: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/notifications/getPlanGenerationStatus
 * Plan oluşturma durumunu sorgular
 */
router.post('/getPlanGenerationStatus', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const { taskPoolId } = req.body;

  try {
    logger.info(`📊 Plan oluşturma durumu kontrol ediliyor - User: ${userId}`);

    let query = db.collection(`users/${userId}/task_pools`)
      .orderBy('createdAt', 'desc');

    if (taskPoolId) {
      // Specific task pool status
      const taskPoolDoc = await db.doc(`users/${userId}/task_pools/${taskPoolId}`).get();
      if (!taskPoolDoc.exists) {
        throw new HttpError('Task pool bulunamadı', 404);
      }

      const taskPoolData = taskPoolDoc.data();
      
      const response: ApiResponse = {
        success: true,
        data: {
          taskPoolId,
          status: taskPoolData?.status || 'unknown',
          createdAt: taskPoolData?.createdAt,
          completedAt: taskPoolData?.completedAt || null,
          convertedToPlanId: taskPoolData?.convertedToPlanId || null,
          totalTasks: taskPoolData?.totalTasks || 0,
          isFlexible: taskPoolData?.isFlexible || false
        },
        timestamp: new Date().toISOString()
      };

      return res.status(200).json(response);
    }

    // Kullanıcının son task pool'larını getir
    const taskPoolsSnapshot = await query.limit(10).get();
    
    const taskPools = taskPoolsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Aktif task pool'ları say
    const activePools = taskPools.filter(pool => pool.status === 'active').length;
    const completedPools = taskPools.filter(pool => pool.status === 'completed').length;
    const totalPools = taskPools.length;

    logger.info(`✅ Plan durumu kontrol edildi - User: ${userId}, Active: ${activePools}, Total: ${totalPools}`);

    const response: ApiResponse = {
      success: true,
      data: {
        summary: {
          activePools,
          completedPools,
          totalPools
        },
        recentTaskPools: taskPools,
        lastActivity: totalPools > 0 ? taskPools[0].createdAt : null
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Plan durumu kontrol hatası:', error);
    throw new HttpError(`Plan durumu kontrol edilemedi: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/notifications/registerFCMToken
 * FCM token kaydeder
 */
router.post('/registerFCMToken', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const { fcmToken, deviceInfo } = req.body;

  if (!fcmToken) {
    throw new HttpError('FCM token gereklidir', 400);
  }

  try {
    logger.info(`🔔 FCM token kaydediliyor - User: ${userId}`);

    // FCM token'ı kullanıcı belgesine kaydet
    await db.doc(`users/${userId}`).update({
      fcmToken,
      deviceInfo: deviceInfo || null,
      fcmTokenUpdatedAt: new Date()
    });

    // FCM token geçmişini kaydet (debugging için)
    await db.collection(`users/${userId}/fcm_tokens`).add({
      token: fcmToken,
      deviceInfo: deviceInfo || null,
      registeredAt: new Date(),
      isActive: true
    });

    logger.info(`✅ FCM token kaydedildi - User: ${userId}`);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'FCM token başarıyla kaydedildi'
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ FCM token kaydetme hatası:', error);
    throw new HttpError(`FCM token kaydedilemedi: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/notifications/sendCustomNotification
 * Özel bildirim gönderir
 */
router.post('/sendCustomNotification', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { targetUserId, title, body, data, immediate = true } = req.body;

  if (!targetUserId || !title || !body) {
    throw new HttpError('targetUserId, title ve body gereklidir', 400);
  }

  try {
    logger.info(`📤 Özel bildirim gönderiliyor - Target: ${targetUserId}, Title: ${title}`);

    // Hedef kullanıcının FCM token'ını al
    const targetUserDoc = await db.doc(`users/${targetUserId}`).get();
    if (!targetUserDoc.exists) {
      throw new HttpError('Hedef kullanıcı bulunamadı', 404);
    }

    const targetUserData = targetUserDoc.data();
    const fcmToken = targetUserData?.fcmToken;

    if (!fcmToken) {
      throw new HttpError('Hedef kullanıcının FCM token\'ı bulunamadı', 400);
    }

    const message = {
      notification: { title, body },
      data: {
        type: 'custom',
        timestamp: new Date().toISOString(),
        ...data
      },
      token: fcmToken
    };

    let result: string;
    
    if (immediate) {
      // Hemen gönder
      result = await messaging.send(message);
    } else {
      // Zamanlanmış gönderim için kuyruğa ekle (basit implementasyon)
      await db.collection('notification_queue').add({
        message,
        targetUserId,
        scheduledFor: new Date(Date.now() + 60000), // 1 dakika sonra
        status: 'pending'
      });
      result = 'scheduled';
    }

    // Bildirim geçmişine kaydet
    await db.collection(`users/${targetUserId}/notifications`).add({
      type: 'custom',
      title,
      body,
      data: data || {},
      sentAt: new Date(),
      messageId: result,
      status: immediate ? 'sent' : 'scheduled',
      senderUserId: req.user!.uid
    });

    logger.info(`✅ Özel bildirim ${immediate ? 'gönderildi' : 'zamanlandı'} - Target: ${targetUserId}, MessageId: ${result}`);

    const response: ApiResponse = {
      success: true,
      data: {
        messageId: result,
        status: immediate ? 'sent' : 'scheduled',
        message: `Bildirim başarıyla ${immediate ? 'gönderildi' : 'zamanlandı'}`
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Özel bildirim hatası:', error);
    throw new HttpError(`Bildirim gönderilemedi: ${error.message}`, 500);
  }
}));

/**
 * GET /api/v1/notifications/getUserNotifications
 * Kullanıcının bildirimlerini getirir
 */
router.get('/getUserNotifications', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const { limit = 50, type, unreadOnly = false } = req.query;

  try {
    logger.info(`📨 Kullanıcı bildirimleri getiriliyor - User: ${userId}`);

    let query = db.collection(`users/${userId}/notifications`)
      .orderBy('sentAt', 'desc');

    if (type) {
      query = query.where('type', '==', type);
    }

    if (unreadOnly === 'true') {
      query = query.where('readAt', '==', null);
    }

    const notificationsSnapshot = await query.limit(Number(limit)).get();
    
    const notifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Özet istatistikler
    const totalCount = notifications.length;
    const unreadCount = notifications.filter(n => !n.readAt).length;
    const typeBreakdown: Record<string, number> = {};

    notifications.forEach(n => {
      typeBreakdown[n.type] = (typeBreakdown[n.type] || 0) + 1;
    });

    logger.info(`✅ Kullanıcı bildirimleri hazırlandı - User: ${userId}, Total: ${totalCount}, Unread: ${unreadCount}`);

    const response: ApiResponse = {
      success: true,
      data: {
        notifications,
        summary: {
          totalCount,
          unreadCount,
          typeBreakdown
        },
        filters: {
          type: type || null,
          unreadOnly: unreadOnly === 'true',
          limit: Number(limit)
        }
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Kullanıcı bildirimleri hatası:', error);
    throw new HttpError(`Bildirimler getirilemedi: ${error.message}`, 500);
  }
}));

export default router; 