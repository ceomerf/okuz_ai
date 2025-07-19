import { Router, Request, Response } from 'express';
import { authenticateToken } from '../utils/auth';
import { asyncHandler } from '../utils/errorHandler';
import { HttpError } from '../utils/errorHandler';
import { db } from '../utils/firebase';
import { callGeminiAPI, parseGeminiJSON } from '../utils/gemini';
import { logger } from '../utils/logger';
import { AuthenticatedRequest, ApiResponse, TopicPoolItem } from '../types/index';

const router = Router();

// Curriculum data - Firebase Functions'tan kopyalanmış
const ACADEMIC_TRACK_SUBJECTS: Record<string, string[]> = {
  'sayisal': ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü'],
  'sozel': ['Türkçe', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü', 'Matematik', 'Edebiyat'],
  'esitagirlik': ['Matematik', 'Türkçe', 'Sosyal Bilimler', 'Fen Bilimleri'],
  'dil': ['Yabancı Dil', 'Türkçe', 'Matematik', 'Sosyal Bilimler']
};

// Holiday status checker (basitleştirilmiş)
const checkCurrentHolidayStatus = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  // Basit tatil kontrolü - gerçek implementasyon daha karmaşık olabilir
  if ((month === 6 && day >= 15) || month === 7 || (month === 8 && day <= 31)) {
    return { isHoliday: true, reason: 'Yaz Tatili', type: 'summer' };
  }
  
  return { isHoliday: false, reason: null, type: null };
};

/**
 * POST /api/v1/planning/checkHolidayStatus
 * Tatil durumunu kontrol eder
 */
router.post('/checkHolidayStatus', asyncHandler(async (req: Request, res: Response) => {
  try {
    const holidayStatus = checkCurrentHolidayStatus();
    
    const response: ApiResponse = {
      success: true,
      data: {
        isHoliday: holidayStatus.isHoliday,
        holidayReason: holidayStatus.reason || null,
        holidayType: holidayStatus.type || null,
        message: holidayStatus.isHoliday 
          ? `Şu anda ${holidayStatus.reason} döneminde` 
          : 'Normal eğitim dönemi'
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('Tatil durumu kontrol hatası:', error);
    throw new HttpError(`Tatil durumu kontrol edilemedi: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/planning/generateInitialLongTermPlan
 * 3 günlük task pool oluşturur (Firebase Functions'tan dönüştürülmüş)
 */
// @ts-ignore
router.post('/generateInitialLongTermPlan', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user!.uid;
  const { profileId, planType = 'adaptive', customRequests = [] } = req.body as any;

  try {
    logger.info(`🎯 Plan oluşturma başladı - User: ${userId}, ProfileId: ${profileId}`);

    // Kullanıcı hesap tipini belirle
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      throw new HttpError('Kullanıcı hesabı bulunamadı', 404);
    }
    
    const userData = userDoc.data();
    const accountType = userData?.accountType || 'single';
    
    // Profil yolunu belirle
    let profilePath: string;
    if (accountType === 'family') {
      const activeProfileId = profileId || userData?.selectedProfileId;
      if (!activeProfileId) {
        throw new HttpError('Aile hesabı için profil ID gereklidir', 400);
      }
      profilePath = `users/${userId}/profiles/${activeProfileId}`;
    } else {
      profilePath = `users/${userId}/privateProfile/profile`;
    }

    // Profil verilerini çek
    const profileSnap = await db.doc(profilePath).get();
    if (!profileSnap.exists) {
      throw new HttpError('Kullanıcı profili bulunamadı', 404);
    }

    const profile = profileSnap.data() as any;
    const { 
      grade, 
      academicTrack, 
      confidenceLevels = {}, 
      dailyHours = 2,
      preferredSessionDuration = 45
    } = profile;

    // Konu havuzu oluştur (basitleştirilmiş)
    const subjects = ACADEMIC_TRACK_SUBJECTS[academicTrack] || ACADEMIC_TRACK_SUBJECTS['sayisal'];
    let topicPool: TopicPoolItem[] = [];

    // Her ders için sample konular ekle
    subjects.forEach(subject => {
      const confidence = confidenceLevels[subject] || 'medium';
      
      // Sample topics (gerçek uygulamada curriculum data'dan gelir)
      const sampleTopics = [
        `${subject} - Temel Kavramlar`,
        `${subject} - İleri Konular`,
        `${subject} - Problem Çözme`
      ];

      sampleTopics.forEach(topic => {
        topicPool.push({
          sinif: grade,
          ders: subject,
          unite: 'Genel',
          konu: topic,
          alt_konular: [],
          onem_derecesi: confidence === 'low' ? 9 : confidence === 'medium' ? 7 : 5,
          zorluk_seviyesi: confidence === 'low' ? 3 : confidence === 'medium' ? 5 : 7,
          tahmini_sure: preferredSessionDuration,
          confidence,
          completed: false
        });
      });
    });

    // AI ile konu seçimi
    const selectionPrompt = `
Sen bir eğitim planlamacısısın. Aşağıdaki konu havuzundan öğrencinin seviyesine uygun 3 günlük çalışma planı için konular seç.

ÖĞRENCİ PROFİLİ:
- Sınıf: ${grade}
- Alan: ${academicTrack}
- Günlük Hedef: ${dailyHours} saat
- Oturum Süresi: ${preferredSessionDuration} dakika
- Zayıf Alanlar: ${Object.entries(confidenceLevels).filter(([_, conf]) => conf === 'low').map(([subj]) => subj).join(', ') || 'Yok'}

KONU HAVUZU:
${topicPool.map(topic => `${topic.ders} - ${topic.konu} (Önem: ${topic.onem_derecesi}, Zorluk: ${topic.zorluk_seviyesi})`).join('\n')}

GÖREV: 3 günlük çalışma için toplam 6-9 konu seç. Zayıf alanlara öncelik ver.

Sadece seçtiğin konuların tam adlarını JSON array formatında döndür:
["Matematik - Temel Kavramlar", "Fizik - İleri Konular", ...]
`;

    const aiResponse = await callGeminiAPI(selectionPrompt);
    const selectedTopics = parseGeminiJSON(aiResponse);

    if (!Array.isArray(selectedTopics)) {
      throw new HttpError('AI yanıtı geçersiz format', 500);
    }

    // Seçilen konuları filtrele
    const finalTopicPool = topicPool.filter(topic => {
      const topicFullName = `${topic.ders} - ${topic.konu}`;
      return selectedTopics.some(selected => 
        selected === topicFullName || 
        selected === topic.konu || 
        selected.includes(topic.konu)
      );
    });

    // Task pool'u Firestore'a kaydet
    const taskPoolRef = db.collection(`users/${userId}/task_pools`);
    const taskPoolDoc = await taskPoolRef.add({
      userId,
      profileId: accountType === 'family' ? (profileId || userData?.selectedProfileId) : null,
      taskPool: finalTopicPool,
      totalTasks: finalTopicPool.length,
      preferredSessionDuration,
      dailyHours,
      planType,
      isFlexible: true,
      createdAt: new Date(),
      status: 'active'
    });

    logger.info(`✅ Task pool oluşturuldu: ${taskPoolDoc.id}, ${finalTopicPool.length} görev`);

    const response: ApiResponse = {
      success: true,
      data: {
        taskPoolId: taskPoolDoc.id,
        taskPool: finalTopicPool,
        totalTasks: finalTopicPool.length,
        estimatedDays: 3,
        message: '3 günlük esnek görev havuzu oluşturuldu!'
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Plan oluşturma hatası:', error);
    throw new HttpError(`Plan oluşturulamadı: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/planning/savePlacedTasks
 * Kullanıcının yerleştirdiği görevleri plana dönüştürür
 */
router.post('/savePlacedTasks', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user!.uid;
  const { taskPoolId, placedTasks, profileId } = req.body as any;

  if (!taskPoolId || !placedTasks) {
    throw new HttpError('taskPoolId ve placedTasks gereklidir', 400);
  }

  try {
    logger.info(`💾 Yerleştirilen görevler kaydediliyor - User: ${userId}`);

    // Task pool'u doğrula
    const taskPoolDoc = await db.doc(`users/${userId}/task_pools/${taskPoolId}`).get();
    if (!taskPoolDoc.exists) {
      throw new HttpError('Task pool bulunamadı', 404);
    }

    // Geleneksel plan formatına dönüştür
    const planData = {
      userId,
      profileId: profileId || null,
      taskPoolId,
      weeks: [
        {
          weekNumber: 1,
          days: placedTasks.map((dayTasks: any, dayIndex: number) => ({
            dayNumber: dayIndex + 1,
            date: new Date(Date.now() + dayIndex * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            dailyTasks: dayTasks.map((task: any, taskIndex: number) => ({
              taskId: `task_${dayIndex}_${taskIndex}`,
              subject: task.ders,
              topic: task.konu,
              estimatedDuration: task.tahmini_sure,
              difficulty: task.zorluk_seviyesi,
              importance: task.onem_derecesi,
              completed: false,
              sessions: [
                {
                  sessionIndex: 0,
                  completed: false,
                  startTime: null,
                  endTime: null,
                  notes: ""
                }
              ]
            }))
          }))
        }
      ],
      metadata: {
        planType: 'user_placed',
        createdAt: new Date(),
        isFlexible: false,
        totalDays: 3,
        source: 'interactive_planning'
      }
    };

    // Planı kaydet
    const planRef = db.collection(`users/${userId}/study_plans`);
    const planDoc = await planRef.add(planData);

    // Task pool'u completed olarak işaretle
    await db.doc(`users/${userId}/task_pools/${taskPoolId}`).update({
      status: 'completed',
      convertedToPlanId: planDoc.id,
      completedAt: new Date()
    });

    logger.info(`✅ Plan oluşturuldu: ${planDoc.id}`);

    const response: ApiResponse = {
      success: true,
      data: {
        planId: planDoc.id,
        message: 'Görevler başarıyla plana dönüştürüldü!'
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Görev kaydetme hatası:', error);
    throw new HttpError(`Görevler kaydedilemedi: ${error.message}`, 500);
  }
}));

/**
 * GET /api/v1/planning/queue-status
 * Plan oluşturma queue durumunu kontrol eder
 */
router.get('/queue-status', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user!.uid;
  
  try {
    logger.info(`📋 Queue durumu kontrol ediliyor - User: ${userId}`);

    // Kullanıcının aktif planını kontrol et
    const planQuery = await db.collection(`users/${userId}/study_plans`)
      .where('metadata.isActive', '==', true)
      .orderBy('metadata.createdAt', 'desc')
      .limit(1)
      .get();

    if (!planQuery.empty) {
      // Aktif plan var
      const response: ApiResponse = {
        success: true,
        data: {
          status: 'completed',
          queuePosition: null,
          message: 'Planınız hazır!',
          planId: planQuery.docs[0].id
        },
        timestamp: new Date().toISOString()
      };
      return res.status(200).json(response);
    }

    // Queue'da bekleyen plan var mı kontrol et
    const queueQuery = await db.collection(`users/${userId}/plan_queue`)
      .where('status', 'in', ['pending', 'processing'])
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!queueQuery.empty) {
      const queueItem = queueQuery.docs[0].data();
      const response: ApiResponse = {
        success: true,
        data: {
          status: queueItem.status,
          queuePosition: queueItem.queuePosition || 1,
          message: queueItem.status === 'pending' 
            ? 'Planınız sırada bekliyor...' 
            : 'Planınız oluşturuluyor...',
          estimatedTime: queueItem.estimatedTime
        },
        timestamp: new Date().toISOString()
      };
      return res.status(200).json(response);
    }

    // Hiç plan yok
    const response: ApiResponse = {
      success: true,
      data: {
        status: 'not_found',
        queuePosition: null,
        message: 'Henüz plan oluşturulmamış'
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Queue durumu kontrol hatası:', error);
    throw new HttpError(`Queue durumu kontrol edilemedi: ${error.message}`, 500);
  }
}));

export default router; 