// src/notifications.ts
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import { db } from './utils';
import { PlanGenerationQueueItem, PlanReadyNotificationData } from './types';

/**
 * Plan oluşturma queue dökümanı güncellendiğinde tetiklenen bildirim sistemi
 * planGenerationQueue/{userId} dökümanı 'completed' durumuna geçtiğinde FCM bildirimi gönderir
 */
export const sendPlanReadyNotification = onDocumentUpdated({
    document: "planGenerationQueue/{userId}",
    memory: "256MiB",
    timeoutSeconds: 60,
}, async (event) => {
    // Güncelleme öncesi ve sonrası verileri al
    const beforeData = event.data?.before?.data() as PlanGenerationQueueItem | undefined;
    const afterData = event.data?.after?.data() as PlanGenerationQueueItem | undefined;
    const userId = event.params.userId;

    // Verilerin varlığını kontrol et
    if (!beforeData || !afterData) {
        console.log(`❌ Plan queue güncellemesi için veri bulunamadı: ${userId}`);
        return;
    }

    // Status 'completed' olmadıysa bildirim gönderme
    if (afterData.status !== 'completed') {
        console.log(`📝 Plan durumu henüz tamamlanmadı: ${userId} (${afterData.status})`);
        return;
    }

    // Önceki durum zaten 'completed' ise tekrar bildirim gönderme
    if (beforeData.status === 'completed') {
        console.log(`✅ Plan zaten tamamlanmış, bildirim gönderilmeyecek: ${userId}`);
        return;
    }

    console.log(`🔔 Plan tamamlandı, bildirim gönderiliyor: ${userId}`);

    try {
        // Kullanıcının FCM token'ını al
        const userDoc = await db.doc(`users/${userId}`).get();
        if (!userDoc.exists) {
            console.error(`❌ Kullanıcı bulunamadı: ${userId}`);
            return;
        }

        const userData = userDoc.data();
        const fcmToken = userData?.fcmToken;

        if (!fcmToken) {
            console.log(`⚠️ FCM token bulunamadı: ${userId}. Bildirim gönderilemiyor.`);
            return;
        }

        // Hesap tipine göre profil bilgisini al
        let profileName = '';
        const accountType = userData?.accountType || 'single';
        
        if (accountType === 'family' && afterData.profileId) {
            // Aile hesabı - öğrenci profil adını al
            const profileDoc = await db.doc(`users/${userId}/studentProfiles/${afterData.profileId}`).get();
            if (profileDoc.exists) {
                profileName = profileDoc.data()?.profileName || 'Öğrenci';
            }
        } else {
            // Tek kullanıcı - kullanıcı adını al
            const privateProfileDoc = await db.doc(`users/${userId}/privateProfile/profile`).get();
            if (privateProfileDoc.exists) {
                profileName = privateProfileDoc.data()?.fullName || 'Öğrenci';
            }
        }

        // Bildirim mesajını oluştur
        const notificationData: PlanReadyNotificationData = {
            type: 'plan_ready',
            userId,
            profileId: afterData.profileId,
            planType: afterData.planType || 'regular',
            title: '🎯 Planın Hazır!',
            body: profileName 
                ? `${profileName} için özel çalışma planı hazırlandı. Hemen başlayalım!`
                : 'Özel çalışma planın hazırlandı. Hemen başlayalım!',
            data: {
                userId,
                profileId: afterData.profileId || '',
                planType: afterData.planType || 'regular',
                screen: 'user_plan' // Frontend'de hangi ekrana yönlendirileceği
            }
        };

        // FCM bildirimi gönder
        const message = {
            token: fcmToken,
            notification: {
                title: notificationData.title,
                body: notificationData.body,
            },
            data: notificationData.data,
            android: {
                notification: {
                    icon: 'ic_notification',
                    color: '#FF6B35',
                    channelId: 'plan_notifications',
                    priority: 'high' as const,
                }
            },
            apns: {
                payload: {
                    aps: {
                        badge: 1,
                        sound: 'default',
                    }
                }
            }
        };

        const response = await admin.messaging().send(message);
        console.log(`✅ Plan hazır bildirimi gönderildi: ${userId} -> ${response}`);

        // İstatistik güncelle (opsiyonel)
        try {
            await db.doc(`users/${userId}`).update({
                lastNotificationSent: admin.firestore.FieldValue.serverTimestamp(),
                totalNotificationsSent: admin.firestore.FieldValue.increment(1)
            });
        } catch (statsError) {
            console.error('⚠️ Bildirim istatistikleri güncellenirken hata (kritik değil):', statsError);
        }

    } catch (error: any) {
        console.error(`❌ Plan hazır bildirimi gönderme hatası (${userId}):`, error);
        
        // FCM token geçersizse kullanıcı dökümanından kaldır
        if (error.code === 'messaging/registration-token-not-registered') {
            try {
                await db.doc(`users/${userId}`).update({
                    fcmToken: admin.firestore.FieldValue.delete()
                });
                console.log(`🧹 Geçersiz FCM token kaldırıldı: ${userId}`);
            } catch (cleanupError) {
                console.error(`❌ FCM token temizleme hatası: ${cleanupError}`);
            }
        }
    }
});

/**
 * Queue durumunu kontrol etmek için frontend'e API sağlayan fonksiyon
 */
export const getPlanGenerationStatus = onCall({
    memory: "128MiB",
    timeoutSeconds: 30,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bu fonksiyonu çağırmak için giriş yapmanız gerekiyor.');
    }

    const userId = request.auth.uid;

    try {
        const queueDoc = await db.doc(`planGenerationQueue/${userId}`).get();
        
        if (!queueDoc.exists) {
            return {
                success: true,
                status: 'not_found',
                message: 'Plan oluşturma talebi bulunamadı'
            };
        }

        const queueData = queueDoc.data() as PlanGenerationQueueItem;
        
        // Sıradaki pozisyonu yeniden hesapla (gerçek zamanlı)
        if (queueData.status === 'pending') {
            const pendingItemsBeforeThis = await db.collection('planGenerationQueue')
                .where('status', '==', 'pending')
                .where('requestTimestamp', '<', queueData.requestTimestamp)
                .get();
            
            queueData.queuePosition = pendingItemsBeforeThis.size + 1;
        }

        return {
            success: true,
            status: queueData.status,
            queuePosition: queueData.queuePosition,
            estimatedCompletionTime: queueData.estimatedCompletionTime,
            errorMessage: queueData.errorMessage,
            message: getStatusMessage(queueData)
        };

    } catch (error: any) {
        console.error('Plan durumu kontrol hatası:', error);
        throw new HttpsError('internal', `Plan durumu kontrol edilemedi: ${error.message}`);
    }
});

/**
 * Queue durumuna göre kullanıcı dostu mesaj oluşturan yardımcı fonksiyon
 */
function getStatusMessage(queueData: PlanGenerationQueueItem): string {
    switch (queueData.status) {
        case 'pending':
            const position = queueData.queuePosition || 1;
            if (position === 1) {
                return 'Planın birazdan hazırlanmaya başlayacak!';
            } else {
                return `Planın hazırlanıyor. Sırada ${position}. sıradasın.`;
            }
        
        case 'processing':
            return 'Planın şu anda hazırlanıyor, lütfen bekle...';
        
        case 'completed':
            return 'Planın hazır! Şimdi çalışmaya başlayabilirsin.';
        
        case 'failed':
            return queueData.errorMessage || 'Plan hazırlanırken bir hata oluştu. Lütfen tekrar dene.';
        
        default:
            return 'Plan durumu bilinmiyor.';
    }
} 