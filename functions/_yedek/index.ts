import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Initialize Firebase
admin.initializeApp();

// Re-export all functions from specialized modules
export * from './analysis';
export * from './profile';
export * from './planning';
export * from './gamification';
export * from './utils';
export * from './subscription';

// Export specific new functions from interaction to avoid conflicts
export { 
  handleUserAction,
  startSocraticDialogue,
  endSocraticDialogue,
  getPersonalizedPath,
  completePathStep,
  getUserLearningPaths,
  getPreExamStrategy,
  analyzeUserMood,
  getAdaptiveTheme,
  generateWeeklyStory,
  // Yeni veli paneli fonksiyonları
  getParentDashboardData,
  updateStudentStatus,
  getWeeklyParentReport
} from './interaction';

// logStudySession tipi
interface StudySessionData {
  durationInMinutes: number;
  subject: string;
  topic: string;
  isManualEntry: boolean;
  date: string;
  // Yeni analytics alanı
  analytics?: {
    pauseCount?: number;
    sessionCompletionState?: string;
    userFeeling?: string;
    [key: string]: any; // Diğer ek verilere de izin ver
  };
}

export const logStudySession = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Bu işlem için kimlik doğrulama gereklidir.');
  }

  const userId = request.auth.uid;
  const { profileId, ...sessionDataRaw } = request.data;
  const sessionData = sessionDataRaw as StudySessionData;

  if (!sessionData.durationInMinutes || !sessionData.subject || !sessionData.topic || !sessionData.date) {
    throw new functions.https.HttpsError('invalid-argument', 'Eksik veya geçersiz veri gönderildi.');
  }

  try {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // 1. Gelen tüm veriyi analytics altına kaydet
    const dailyLogRef = userRef.collection('analytics').doc('daily_logs');
    await dailyLogRef.collection('sessions').add({
      ...sessionData,
      timestamp,
      userId,
    });
    
    // 2. Gamification ve Performans Güncellemesi
    const gamificationRef = userRef.collection('gamification').doc('stats');
    const performanceRef = userRef.collection('performance').doc('summary');

    const [gamificationSnap, performanceSnap] = await db.getAll(gamificationRef, performanceRef);

    let currentXP = gamificationSnap.exists ? gamificationSnap.data()?.xp || 0 : 0;
    
    // XP hesaplaması
    let xpGained = Math.floor(sessionData.durationInMinutes * 1.5); // Temel XP
    if (sessionData.analytics) {
      if (sessionData.analytics.sessionCompletionState === 'completed') xpGained += 15;
      if (sessionData.analytics.sessionCompletionState === 'interrupted') xpGained = Math.floor(xpGained * 0.7);
      if (sessionData.analytics.pauseCount === 0) xpGained += 10;
      if (sessionData.analytics.pauseCount !== undefined && sessionData.analytics.pauseCount > 3) xpGained -= 5;
      if (sessionData.analytics.userFeeling === 'confident') xpGained += 5;
    }
    xpGained = Math.max(5, xpGained); // Minimum 5 XP
    
    const newTotalXP = currentXP + xpGained;
    
    // checkLevelUp fonksiyonunu utils'ten import et
    const { checkLevelUp } = await import('./utils');
    const levelInfo = checkLevelUp(currentXP, newTotalXP);

    // Veritabanı güncellemelerini bir transaction içinde yap
    await db.runTransaction(async (transaction) => {
      // Gamification verilerini güncelle
      transaction.set(gamificationRef, {
        xp: newTotalXP,
        level: levelInfo.newLevel,
        lastStudyDate: sessionData.date,
      }, { merge: true });

      // Genel performans istatistiklerini güncelle
      const totalStudyTimeMinutes = (performanceSnap.data()?.totalStudyTimeMinutes || 0) + sessionData.durationInMinutes;
      const totalSessionCount = (performanceSnap.data()?.totalSessionCount || 0) + 1;

      transaction.set(performanceRef, {
        totalStudyTimeMinutes: totalStudyTimeMinutes,
        totalSessionCount: totalSessionCount,
        averageSessionDuration: Math.round(totalStudyTimeMinutes / totalSessionCount),
        lastUpdated: timestamp,
      }, { merge: true });
    });
    
    return {
      success: true,
      data: { xpGained, totalXP: newTotalXP, levelInfo },
    };

  } catch (error: any) {
    console.error("logStudySession hatası:", error);
    throw new functions.https.HttpsError('internal', 'İşlem sırasında bir hata oluştu.', error.message);
  }
});