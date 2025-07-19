import { Router, Request, Response } from 'express';
import { authenticateToken } from '../utils/auth';
import { asyncHandler } from '../utils/errorHandler';
import { HttpError } from '../utils/errorHandler';
import { db } from '../utils/firebase';
import { logger } from '../utils/logger';
import { AuthenticatedRequest, ApiResponse } from '../types';

const router = Router();

/**
 * POST /api/v1/gamification/getGlobalLeaderboard
 * Global leaderboard verilerini getirir
 */
router.post('/getGlobalLeaderboard', asyncHandler(async (req: Request, res: Response) => {
  const { limit = 100 } = req.body;

  try {
    logger.info(`🏆 Leaderboard getiriliyor - Limit: ${limit}`);

    // Tüm kullanıcıların gamification verilerini çek
    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();

    const leaderboardData: Array<{
      userId: string;
      userName: string;
      xp: number;
      level: number;
      avatarUrl?: string;
      streak?: number;
      badges?: string[];
    }> = [];

    // Her kullanıcının gamification verisini çek
    const promises = usersSnapshot.docs.map(async (userDoc) => {
      const userId = userDoc.id;
      const userData = userDoc.data();

      try {
        // Gamification verisini çek
        const gamificationDoc = await db.doc(`users/${userId}/gamification/data`).get();
        
        if (gamificationDoc.exists) {
          const gamData = gamificationDoc.data();
          
          // Kullanıcı adını belirle
          let userName = 'Anonim Kullanıcı';
          
          // Önce profil verilerinden ismi almaya çalış
          if (userData?.accountType === 'family') {
            const selectedProfileId = userData?.selectedProfileId;
            if (selectedProfileId) {
              const profileDoc = await db.doc(`users/${userId}/profiles/${selectedProfileId}`).get();
              if (profileDoc.exists) {
                userName = profileDoc.data()?.profileName || userName;
              }
            }
          } else {
            const profileDoc = await db.doc(`users/${userId}/privateProfile/profile`).get();
            if (profileDoc.exists) {
              userName = profileDoc.data()?.name || profileDoc.data()?.profileName || userName;
            }
          }

          // Auth bilgilerinden email'i kullan (son çare)
          if (userName === 'Anonim Kullanıcı' && userData?.email) {
            userName = userData.email.split('@')[0];
          }

          leaderboardData.push({
            userId,
            userName,
            xp: gamData.xp || 0,
            level: gamData.level || 1,
            streak: gamData.streak || 0,
            badges: gamData.badges || [],
            avatarUrl: userData?.avatarUrl || null
          });
        }
      } catch (error) {
        logger.warn(`⚠️ Kullanıcı verisi alınamadı: ${userId}`, error);
      }
    });

    await Promise.all(promises);

    // XP'ye göre sırala ve limit uygula
    const sortedLeaderboard = leaderboardData
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit)
      .map((user, index) => ({
        ...user,
        rank: index + 1
      }));

    logger.info(`✅ Leaderboard hazırlandı - ${sortedLeaderboard.length} kullanıcı`);

    const response: ApiResponse = {
      success: true,
      data: {
        leaderboard: sortedLeaderboard,
        totalUsers: leaderboardData.length,
        topUser: sortedLeaderboard[0] || null,
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Leaderboard hatası:', error);
    throw new HttpError(`Leaderboard getirilemedi: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/gamification/getUserStats
 * Kullanıcının gamification istatistiklerini getirir
 */
router.post('/getUserStats', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const { profileId } = req.body;

  try {
    logger.info(`📊 Kullanıcı istatistikleri getiriliyor - User: ${userId}`);

    // Gamification verilerini çek
    const gamificationDoc = await db.doc(`users/${userId}/gamification/data`).get();
    
    if (!gamificationDoc.exists) {
      // Gamification verisi yoksa başlat
      const initialGamData = {
        xp: 0,
        level: 1,
        streak: 0,
        badges: [],
        achievements: [],
        lastActivityDate: new Date()
      };

      await db.doc(`users/${userId}/gamification/data`).set(initialGamData);
      
      const response: ApiResponse = {
        success: true,
        data: initialGamData,
        timestamp: new Date().toISOString()
      };

      return res.status(200).json(response);
    }

    const gamData = gamificationDoc.data();

    // Kullanıcının leaderboard'daki sırasını bul
    const allUsersGamData = await db.collectionGroup('data')
      .where('xp', '>', 0)
      .orderBy('xp', 'desc')
      .get();

    let userRank = 0;
    allUsersGamData.docs.forEach((doc, index) => {
      if (doc.ref.path.includes(`users/${userId}/gamification/data`)) {
        userRank = index + 1;
      }
    });

    // Seviye ilerlemesini hesapla
    const currentLevel = gamData.level || 1;
    const currentXP = gamData.xp || 0;
    const xpForCurrentLevel = (currentLevel - 1) * 1000; // Basit seviye sistemi
    const xpForNextLevel = currentLevel * 1000;
    const xpProgress = currentXP - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - currentXP;

    const userStats = {
      ...gamData,
      rank: userRank,
      levelProgress: {
        currentLevel,
        currentXP,
        xpProgress,
        xpNeeded,
        progressPercentage: Math.min((xpProgress / 1000) * 100, 100)
      },
      lastUpdated: new Date().toISOString()
    };

    logger.info(`✅ Kullanıcı istatistikleri hazırlandı - User: ${userId}, Level: ${currentLevel}, XP: ${currentXP}`);

    const response: ApiResponse = {
      success: true,
      data: userStats,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Kullanıcı istatistikleri hatası:', error);
    throw new HttpError(`İstatistikler getirilemedi: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/gamification/awardXP
 * Kullanıcıya XP verir
 */
router.post('/awardXP', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const { xpAmount, reason, activityType } = req.body;

  if (!xpAmount || xpAmount <= 0) {
    throw new HttpError('Geçerli bir XP miktarı gereklidir', 400);
  }

  try {
    logger.info(`🎯 XP veriliyor - User: ${userId}, Amount: ${xpAmount}, Reason: ${reason}`);

    const gamificationRef = db.doc(`users/${userId}/gamification/data`);
    const gamDoc = await gamificationRef.get();

    let currentData = {
      xp: 0,
      level: 1,
      streak: 0,
      badges: [],
      achievements: []
    };

    if (gamDoc.exists) {
      currentData = { ...currentData, ...gamDoc.data() };
    }

    // XP ekle
    const newXP = (currentData.xp || 0) + xpAmount;
    
    // Seviye kontrolü yap
    const newLevel = Math.floor(newXP / 1000) + 1;
    const leveledUp = newLevel > (currentData.level || 1);

    // Güncelleme verisi
    const updateData = {
      xp: newXP,
      level: newLevel,
      lastActivityDate: new Date(),
      lastXPGain: {
        amount: xpAmount,
        reason: reason || 'Aktivite tamamlandı',
        activityType: activityType || 'general',
        timestamp: new Date()
      }
    };

    // Seviye atlama varsa achievement ekle
    if (leveledUp) {
      const achievements = currentData.achievements || [];
      achievements.push({
        type: 'level_up',
        level: newLevel,
        timestamp: new Date(),
        title: `Seviye ${newLevel} Ulaşıldı!`,
        description: `Tebrikler! Seviye ${newLevel}'e ulaştınız.`
      });
      (updateData as any).achievements = achievements;
    }

    await gamificationRef.set(updateData, { merge: true });

    // XP geçmişi kaydet
    await db.collection(`users/${userId}/xp_history`).add({
      amount: xpAmount,
      reason: reason || 'Aktivite tamamlandı',
      activityType: activityType || 'general',
      timestamp: new Date(),
      totalXPAfter: newXP,
      levelAfter: newLevel
    });

    logger.info(`✅ XP verildi - User: ${userId}, NewXP: ${newXP}, Level: ${newLevel}${leveledUp ? ' (LEVEL UP!)' : ''}`);

    const response: ApiResponse = {
      success: true,
      data: {
        xpAwarded: xpAmount,
        totalXP: newXP,
        currentLevel: newLevel,
        leveledUp,
        newAchievements: leveledUp ? ['Seviye atlama!'] : []
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ XP verme hatası:', error);
    throw new HttpError(`XP verilemedi: ${error.message}`, 500);
  }
}));

export default router; 