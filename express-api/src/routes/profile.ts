import { Router, Request, Response } from 'express';
import { authenticateToken } from '../utils/auth';
import { asyncHandler } from '../utils/errorHandler';
import { HttpError } from '../utils/errorHandler';
import { db } from '../utils/firebase';
import { logger } from '../utils/logger';
import { AuthenticatedRequest, ApiResponse, StudentProfile } from '../types';
import * as admin from 'firebase-admin';

const router = Router();

/**
 * POST /api/v1/profile/complete-onboarding
 * Onboarding sırasında kullanıcıdan alınan profil bilgilerini kaydet
 */
router.post('/complete-onboarding', authenticateToken, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.uid;
  const data = req.body;

  if (!data) {
    throw new HttpError('Veri gereklidir', 400);
  }

  try {
    logger.info(`👤 Onboarding tamamlanıyor - User: ${userId}, AccountType: ${data.accountType}`);

    const userRef = db.doc(`users/${userId}`);
    const batch = db.batch();

    // Hesap tipini kontrol et
    const accountType = data.accountType === 'parent' ? 'parent' : 'student';

    // Kullanıcı dokümanını güncelle
    batch.set(userRef, {
      accountType,
      isOnboardingCompleted: true,
      fullName: data.fullName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    if (accountType === 'parent') {
      // Veli hesabı için ek bilgiler
      batch.update(userRef, {
        parentName: data.parentName,
        isParent: true,
        isStudent: false
      });
    } else {
      // Öğrenci hesabı için profil bilgileri
      const profileData = {
        userId,
        grade: data.grade,
        academicTrack: data.academicTrack,
        targetUniversity: data.targetUniversity,
        targetExam: data.targetExam,
        learningStyle: data.learningStyle,
        confidenceLevels: data.confidenceLevels,
        preferredStudyTimes: data.preferredStudyTimes,
        preferredSessionDuration: data.preferredSessionDuration,
        studyDays: data.studyDays,
        dailyHours: data.dailyHours,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const privateProfileRef = db.doc(`users/${userId}/privateProfile/profile`);
      batch.set(privateProfileRef, profileData);
    }

    // Gamification verilerini başlat
    const gamificationRef = db.doc(`users/${userId}/gamification/data`);
    batch.set(gamificationRef, {
      xp: 0,
      level: 1,
      streak: 0,
      badges: [],
      achievements: [],
      lastActivityDate: admin.firestore.FieldValue.serverTimestamp()
    });

    // Batch commit
    await batch.commit();

    logger.info(`✅ Onboarding tamamlandı - User: ${userId}, Type: ${accountType}`);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Onboarding başarıyla tamamlandı!',
        accountType,
        userId,
        setupComplete: true
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Onboarding tamamlama hatası:', error);
    throw new HttpError(`Onboarding tamamlanamadı: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/profile/completeOnboardingProfile
 * Onboarding sırasında kullanıcıdan alınan profil bilgilerini kaydet
 */
router.post('/completeOnboardingProfile', authenticateToken, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.uid;
  const { onboardingData, accountType = 'single' } = req.body;

  if (!onboardingData) {
    throw new HttpError('onboardingData gereklidir', 400);
  }

  try {
    logger.info(`👤 Profil oluşturuluyor - User: ${userId}, Type: ${accountType}`);

    const userRef = db.doc(`users/${userId}`);
    const batch = db.batch();

    if (accountType === 'family') {
      // Aile hesabı kurulumu
      const familyAccountId = db.collection('temp').doc().id;
      
      // Ana kullanıcı dokümanını güncelle
      batch.set(userRef, {
        accountType: 'family',
        familyAccountId,
        isOnboardingCompleted: true,
        parentInfo: {
          name: onboardingData.parentName || 'Veli',
          email: req.user?.email || '',
          role: 'parent'
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // İlk öğrenci profili oluştur
      const firstProfileId = db.collection('temp').doc().id;
      const studentProfileData: StudentProfile = {
        profileId: firstProfileId,
        profileName: onboardingData.studentName || 'Öğrenci',
        grade: onboardingData.grade || '12',
        academicTrack: onboardingData.academicTrack || 'sayisal',
        targetUniversity: onboardingData.targetUniversity || '',
        targetExam: onboardingData.targetExam || 'YKS',
        learningStyle: onboardingData.learningStyle || 'visual',
        confidenceLevels: onboardingData.confidenceLevels || {},
        preferredStudyTimes: onboardingData.preferredStudyTimes || [],
        studyDays: onboardingData.studyDays || [],
        dailyHours: onboardingData.dailyHours || 2,
        preferredSessionDuration: onboardingData.preferredSessionDuration || 45,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Profili aile hesabına ekle
      const profileRef = db.doc(`users/${userId}/profiles/${firstProfileId}`);
      batch.set(profileRef, studentProfileData);

      // Aktif profil olarak ayarla
      batch.update(userRef, {
        selectedProfileId: firstProfileId,
        profileCount: 1
      });

    } else {
      // Tek kullanıcı hesabı kurulumu
      batch.set(userRef, {
        accountType: 'single',
        isOnboardingCompleted: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Profil bilgilerini kaydet
      const profileData = {
        ...onboardingData,
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const privateProfileRef = db.doc(`users/${userId}/privateProfile/profile`);
      batch.set(privateProfileRef, profileData);
    }

    // Gamification verilerini başlat
    const gamificationRef = db.doc(`users/${userId}/gamification/data`);
    batch.set(gamificationRef, {
      xp: 0,
      level: 1,
      streak: 0,
      badges: [],
      achievements: [],
      lastActivityDate: admin.firestore.FieldValue.serverTimestamp()
    });

    // Batch commit
    await batch.commit();

    logger.info(`✅ Profil oluşturuldu - User: ${userId}, Type: ${accountType}`);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Profil başarıyla oluşturuldu!',
        accountType,
        userId,
        setupComplete: true
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Profil oluşturma hatası:', error);
    throw new HttpError(`Profil oluşturulamadı: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/profile/createAdvancedProfile
 * Gelişmiş profil oluşturma (aile hesabına yeni öğrenci ekleme)
 */
router.post('/createAdvancedProfile', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const { profileData, profileName } = req.body;

  if (!profileData || !profileName) {
    throw new HttpError('profileData ve profileName gereklidir', 400);
  }

  try {
    logger.info(`👥 Gelişmiş profil oluşturuluyor - User: ${userId}, Name: ${profileName}`);

    // Kullanıcının aile hesabı olup olmadığını kontrol et
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      throw new HttpError('Kullanıcı hesabı bulunamadı', 404);
    }

    const userData = userDoc.data();
    if (userData?.accountType !== 'family') {
      throw new HttpError('Bu işlem sadece aile hesapları için geçerlidir', 400);
    }

    // Yeni profil ID oluştur
    const newProfileId = db.collection('temp').doc().id;
    
    const studentProfile: StudentProfile = {
      profileId: newProfileId,
      profileName,
      grade: profileData.grade || '12',
      academicTrack: profileData.academicTrack || 'sayisal',
      targetUniversity: profileData.targetUniversity || '',
      targetExam: profileData.targetExam || 'YKS',
      learningStyle: profileData.learningStyle || 'visual',
      confidenceLevels: profileData.confidenceLevels || {},
      preferredStudyTimes: profileData.preferredStudyTimes || [],
      studyDays: profileData.studyDays || [],
      dailyHours: profileData.dailyHours || 2,
      preferredSessionDuration: profileData.preferredSessionDuration || 45,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Profili kaydet
    const profileRef = db.doc(`users/${userId}/profiles/${newProfileId}`);
    await profileRef.set(studentProfile);

    // Profil sayısını güncelle
    const currentProfileCount = userData?.profileCount || 1;
    await db.doc(`users/${userId}`).update({
      profileCount: currentProfileCount + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`✅ Gelişmiş profil oluşturuldu - User: ${userId}, ProfileId: ${newProfileId}`);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Yeni profil başarıyla oluşturuldu!',
        profileId: newProfileId,
        profileName,
        totalProfiles: currentProfileCount + 1
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Gelişmiş profil oluşturma hatası:', error);
    throw new HttpError(`Profil oluşturulamadı: ${error.message}`, 500);
  }
}));

/**
 * GET /api/v1/profile/getUserProfiles
 * Kullanıcının tüm profillerini getirir
 */
router.get('/getUserProfiles', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;

  try {
    logger.info(`📋 Profiller getiriliyor - User: ${userId}`);

    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      throw new HttpError('Kullanıcı hesabı bulunamadı', 404);
    }

    const userData = userDoc.data();
    const accountType = userData?.accountType || 'single';

    let profiles: any[] = [];

    if (accountType === 'family') {
      // Aile hesabının tüm profillerini getir
      const profilesSnapshot = await db.collection(`users/${userId}/profiles`).get();
      profiles = profilesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } else {
      // Tek kullanıcı hesabının profilini getir
      const profileDoc = await db.doc(`users/${userId}/privateProfile/profile`).get();
      if (profileDoc.exists) {
        profiles = [{
          id: 'main_profile',
          ...profileDoc.data()
        }];
      }
    }

    logger.info(`✅ Profiller getirildi - User: ${userId}, Count: ${profiles.length}`);

    const response: ApiResponse = {
      success: true,
      data: {
        accountType,
        profiles,
        selectedProfileId: userData?.selectedProfileId || null,
        totalProfiles: profiles.length
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Profil getirme hatası:', error);
    throw new HttpError(`Profiller getirilemedi: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/profile/switchProfile
 * Aile hesabında aktif profili değiştirir
 */
router.post('/switchProfile', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const { profileId } = req.body;

  if (!profileId) {
    throw new HttpError('profileId gereklidir', 400);
  }

  try {
    logger.info(`🔄 Profil değiştiriliyor - User: ${userId}, ProfileId: ${profileId}`);

    // Profilin var olup olmadığını kontrol et
    const profileDoc = await db.doc(`users/${userId}/profiles/${profileId}`).get();
    if (!profileDoc.exists) {
      throw new HttpError('Profil bulunamadı', 404);
    }

    // Aktif profili güncelle
    await db.doc(`users/${userId}`).update({
      selectedProfileId: profileId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`✅ Profil değiştirildi - User: ${userId}, ProfileId: ${profileId}`);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Aktif profil başarıyla değiştirildi!',
        selectedProfileId: profileId
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Profil değiştirme hatası:', error);
    throw new HttpError(`Profil değiştirilemedi: ${error.message}`, 500);
  }
}));

export default router; 