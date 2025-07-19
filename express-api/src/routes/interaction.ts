import { Router, Request, Response } from 'express';
import { authenticateToken } from '../utils/auth';
import { asyncHandler } from '../utils/errorHandler';
import { HttpError } from '../utils/errorHandler';
import { db } from '../utils/firebase';
import { logger } from '../utils/logger';
import { AuthenticatedRequest, ApiResponse, StudySessionInput } from '../types';
import * as admin from 'firebase-admin';

const router = Router();

/**
 * POST /api/v1/interaction/logStudySession
 * Çalışma oturumunu kaydeder
 */
router.post('/logStudySession', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const sessionData: StudySessionInput = req.body;

  if (!sessionData.subject || !sessionData.durationInMinutes || !sessionData.rating) {
    throw new HttpError('subject, durationInMinutes ve rating gereklidir', 400);
  }

  try {
    logger.info(`📚 Çalışma oturumu kaydediliyor - User: ${userId}, Subject: ${sessionData.subject}`);

    // Session ID oluştur
    const sessionId = db.collection('temp').doc().id;
    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // XP hesapla (basit formül)
    const baseXP = Math.floor(sessionData.durationInMinutes / 10) * 10; // Her 10 dakika için 10 XP
    const ratingBonus = (sessionData.rating - 3) * 5; // Rating 3'ün üstü için bonus
    const totalXP = Math.max(baseXP + ratingBonus, 5); // Minimum 5 XP

    const studySessionLog = {
      sessionId,
      userId,
      ...sessionData,
      timestamp: admin.firestore.Timestamp.fromDate(now),
      date: dateString,
      xpEarned: totalXP,
      streakContribution: sessionData.durationInMinutes >= 15 // 15 dakika üstü streak'e katkı
    };

    // Çalışma oturumunu kaydet
    await db.collection(`users/${userId}/study_logs`).add(studySessionLog);

    // XP'yi gamification'a ekle
    const gamificationRef = db.doc(`users/${userId}/gamification/data`);
    const gamDoc = await gamificationRef.get();
    
    let currentXP = 0;
    let currentLevel = 1;
    let currentStreak = 0;

    if (gamDoc.exists) {
      const gamData = gamDoc.data();
      currentXP = gamData?.xp || 0;
      currentLevel = gamData?.level || 1;
      currentStreak = gamData?.streak || 0;
    }

    // Yeni XP ve seviye hesapla
    const newXP = currentXP + totalXP;
    const newLevel = Math.floor(newXP / 1000) + 1;
    const leveledUp = newLevel > currentLevel;

    // Streak güncelle (bugün daha önce çalışma yapılmış mı?)
    const today = dateString;
    const recentSessions = await db.collection(`users/${userId}/study_logs`)
      .where('date', '==', today)
      .get();

    const isFirstSessionToday = recentSessions.size === 1; // Az önce eklediğimiz session
    let newStreak = currentStreak;

    if (isFirstSessionToday && sessionData.durationInMinutes >= 15) {
      newStreak = currentStreak + 1;
    }

    // Gamification güncelle
    await gamificationRef.set({
      xp: newXP,
      level: newLevel,
      streak: newStreak,
      lastActivityDate: admin.firestore.Timestamp.fromDate(now),
      lastSessionXP: totalXP
    }, { merge: true });

    // Performance stats güncelle
    const statsRef = db.doc(`users/${userId}/performance/stats`);
    const statsDoc = await statsRef.get();
    
    let stats = {
      totalStudyTimeMinutes: 0,
      totalSessions: 0,
      subjectBreakdown: {}
    };

    if (statsDoc.exists) {
      stats = { ...stats, ...statsDoc.data() };
    }

    // Stats güncelle
    stats.totalStudyTimeMinutes += sessionData.durationInMinutes;
    stats.totalSessions += 1;

    if (!stats.subjectBreakdown[sessionData.subject]) {
      stats.subjectBreakdown[sessionData.subject] = {
        totalTime: 0,
        sessionCount: 0,
        averageRating: 0
      };
    }

    const subjectStats = stats.subjectBreakdown[sessionData.subject];
    const oldAvgRating = subjectStats.averageRating || 0;
    const oldSessionCount = subjectStats.sessionCount || 0;

    subjectStats.totalTime += sessionData.durationInMinutes;
    subjectStats.sessionCount += 1;
    subjectStats.averageRating = ((oldAvgRating * oldSessionCount) + sessionData.rating) / subjectStats.sessionCount;

    (stats as any).lastUpdated = admin.firestore.Timestamp.fromDate(now);

    await statsRef.set(stats, { merge: true });

    logger.info(`✅ Çalışma oturumu kaydedildi - User: ${userId}, XP: +${totalXP}, Level: ${newLevel}${leveledUp ? ' (LEVEL UP!)' : ''}`);

    const response: ApiResponse = {
      success: true,
      data: {
        sessionId,
        xpEarned: totalXP,
        totalXP: newXP,
        currentLevel: newLevel,
        leveledUp,
        currentStreak: newStreak,
        streakIncreased: isFirstSessionToday && sessionData.durationInMinutes >= 15,
        message: 'Çalışma oturumu başarıyla kaydedildi!'
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Çalışma oturumu kaydetme hatası:', error);
    throw new HttpError(`Çalışma oturumu kaydedilemedi: ${error.message}`, 500);
  }
}));

/**
 * GET /api/v1/interaction/getStudyHistory
 * Kullanıcının çalışma geçmişini getirir
 */
router.get('/getStudyHistory', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const { limit = 50, subject, dateFrom, dateTo } = req.query;

  try {
    logger.info(`📊 Çalışma geçmişi getiriliyor - User: ${userId}`);

    let query = db.collection(`users/${userId}/study_logs`)
      .orderBy('timestamp', 'desc');

    // Filtreler uygula
    if (subject) {
      query = query.where('subject', '==', subject);
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom as string);
      query = query.where('timestamp', '>=', admin.firestore.Timestamp.fromDate(fromDate));
    }

    if (dateTo) {
      const toDate = new Date(dateTo as string);
      query = query.where('timestamp', '<=', admin.firestore.Timestamp.fromDate(toDate));
    }

    const querySnapshot = await query.limit(Number(limit)).get();
    
    const studyHistory = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Özet istatistikler hesapla
    const totalSessions = studyHistory.length;
    const totalTime = studyHistory.reduce((sum, session) => sum + ((session as any).durationInMinutes || 0), 0);
    const averageRating = totalSessions > 0 
      ? studyHistory.reduce((sum, session) => sum + (session.rating || 0), 0) / totalSessions 
      : 0;

    // Ders bazında breakdown
    const subjectBreakdown: Record<string, any> = {};
    studyHistory.forEach(session => {
      const subject = session.subject;
      if (!subjectBreakdown[subject]) {
        subjectBreakdown[subject] = {
          sessionCount: 0,
          totalTime: 0,
          averageRating: 0,
          totalRating: 0
        };
      }
      subjectBreakdown[subject].sessionCount += 1;
      subjectBreakdown[subject].totalTime += session.durationInMinutes || 0;
      subjectBreakdown[subject].totalRating += session.rating || 0;
    });

    // Average rating hesapla
    Object.keys(subjectBreakdown).forEach(subject => {
      const breakdown = subjectBreakdown[subject];
      breakdown.averageRating = breakdown.totalRating / breakdown.sessionCount;
      delete breakdown.totalRating;
    });

    logger.info(`✅ Çalışma geçmişi hazırlandı - User: ${userId}, Sessions: ${totalSessions}`);

    const response: ApiResponse = {
      success: true,
      data: {
        studyHistory,
        summary: {
          totalSessions,
          totalTimeMinutes: totalTime,
          averageRating: Math.round(averageRating * 10) / 10,
          subjectBreakdown
        },
        filters: {
          subject: subject || null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          limit: Number(limit)
        }
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Çalışma geçmişi hatası:', error);
    throw new HttpError(`Çalışma geçmişi getirilemedi: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/interaction/getWeeklyParentReport
 * Veli için haftalık rapor oluşturur
 */
router.post('/getWeeklyParentReport', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const { profileId, weekOffset = 0 } = req.body;

  try {
    logger.info(`👨‍👩‍👧‍👦 Veli raporu oluşturuluyor - User: ${userId}, ProfileId: ${profileId}`);

    // Hesap tipini kontrol et
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      throw new HttpError('Kullanıcı hesabı bulunamadı', 404);
    }

    const userData = userDoc.data();
    const accountType = userData?.accountType || 'single';

    if (accountType !== 'family') {
      throw new HttpError('Bu özellik sadece aile hesapları için geçerlidir', 400);
    }

    // Profil bilgilerini al
    const activeProfileId = profileId || userData?.selectedProfileId;
    if (!activeProfileId) {
      throw new HttpError('Profil ID gereklidir', 400);
    }

    const profileDoc = await db.doc(`users/${userId}/profiles/${activeProfileId}`).get();
    if (!profileDoc.exists) {
      throw new HttpError('Profil bulunamadı', 404);
    }

    const profileData = profileDoc.data();

    // Hafta tarih aralığını hesapla
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (now.getDay() + 7 * weekOffset));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Bu hafta çalışma verilerini çek
    const weekSessions = await db.collection(`users/${userId}/study_logs`)
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(weekStart))
      .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(weekEnd))
      .orderBy('timestamp', 'desc')
      .get();

    const sessions = weekSessions.docs.map(doc => doc.data());

    // Haftalık istatistikler hesapla
    const totalStudyTime = sessions.reduce((sum, s) => sum + (s.durationInMinutes || 0), 0);
    const totalSessions = sessions.length;
    const averageRating = totalSessions > 0 
      ? sessions.reduce((sum, s) => sum + (s.rating || 0), 0) / totalSessions 
      : 0;

    // Günlük breakdown
    const dailyStats: Record<string, any> = {};
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const dayString = day.toISOString().split('T')[0];
      
      const daySessions = sessions.filter(s => s.date === dayString);
      dailyStats[dayString] = {
        date: dayString,
        dayName: day.toLocaleDateString('tr-TR', { weekday: 'long' }),
        sessionCount: daySessions.length,
        totalTime: daySessions.reduce((sum, s) => sum + (s.durationInMinutes || 0), 0),
        subjects: [...new Set(daySessions.map(s => s.subject))]
      };
    }

    // Ders bazında breakdown
    const subjectStats: Record<string, any> = {};
    sessions.forEach(session => {
      const subject = session.subject;
      if (!subjectStats[subject]) {
        subjectStats[subject] = {
          sessionCount: 0,
          totalTime: 0,
          averageRating: 0,
          ratings: []
        };
      }
      subjectStats[subject].sessionCount += 1;
      subjectStats[subject].totalTime += session.durationInMinutes || 0;
      subjectStats[subject].ratings.push(session.rating || 0);
    });

    // Average rating hesapla
    Object.keys(subjectStats).forEach(subject => {
      const stats = subjectStats[subject];
      stats.averageRating = stats.ratings.reduce((sum: number, r: number) => sum + r, 0) / stats.ratings.length;
      delete stats.ratings;
    });

    // Hedef karşılaştırması
    const targetDailyHours = profileData?.dailyHours || 2;
    const targetWeeklyMinutes = targetDailyHours * 60 * 7;
    const completionPercentage = Math.round((totalStudyTime / targetWeeklyMinutes) * 100);

    const report = {
      studentProfile: {
        name: profileData?.profileName || 'Öğrenci',
        grade: profileData?.grade || '12',
        targetExam: profileData?.targetExam || 'YKS'
      },
      weekPeriod: {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
        weekOffset
      },
      summary: {
        totalStudyTimeMinutes: totalStudyTime,
        totalStudyTimeHours: Math.round((totalStudyTime / 60) * 10) / 10,
        totalSessions,
        averageRating: Math.round(averageRating * 10) / 10,
        targetCompletionPercentage: completionPercentage,
        averageSessionDuration: totalSessions > 0 ? Math.round(totalStudyTime / totalSessions) : 0
      },
      dailyBreakdown: dailyStats,
      subjectBreakdown: subjectStats,
      insights: {
        mostStudiedSubject: Object.keys(subjectStats).reduce((max, subject) => 
          (subjectStats[subject].totalTime > (subjectStats[max]?.totalTime || 0)) ? subject : max, 
          Object.keys(subjectStats)[0] || 'Yok'
        ),
        bestPerformanceDay: Object.keys(dailyStats).reduce((max, day) => 
          (dailyStats[day].totalTime > (dailyStats[max]?.totalTime || 0)) ? day : max,
          Object.keys(dailyStats)[0]
        ),
        consistency: Math.round((Object.values(dailyStats).filter((day: any) => day.sessionCount > 0).length / 7) * 100)
      }
    };

    logger.info(`✅ Veli raporu hazırlandı - User: ${userId}, Week: ${weekStart.toISOString().split('T')[0]}`);

    const response: ApiResponse = {
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Veli raporu hatası:', error);
    throw new HttpError(`Veli raporu oluşturulamadı: ${error.message}`, 500);
  }
}));

export default router; 