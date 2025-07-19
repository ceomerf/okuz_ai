import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

/**
 * Firebase Admin SDK'yı başlatır
 */
export const initializeFirebase = () => {
  // Zaten başlatılmışsa tekrar başlatma
  if (getApps().length > 0) {
    console.log('Firebase zaten başlatılmış, tekrar başlatılmıyor.');
    return;
  }

  try {
    // Servis hesabı anahtarı ile başlat
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      
      console.log('Firebase Admin SDK başlatıldı (servis hesabı ile)');
    } 
    // Varsayılan kimlik bilgileri ile başlat (Google Cloud, Firebase Hosting gibi)
    else {
      admin.initializeApp();
      console.log('Firebase Admin SDK başlatıldı (varsayılan kimlik bilgileri ile)');
    }
  } catch (error) {
    console.error('Firebase başlatma hatası:', error);
    throw new Error('Firebase başlatılamadı');
  }
};

/**
 * Firebase ID token doğrulama
 */
export const verifyIdToken = async (token: string): Promise<admin.auth.DecodedIdToken> => {
  try {
    return await admin.auth().verifyIdToken(token);
  } catch (error) {
    console.error('Token doğrulama hatası:', error);
    throw error;
  }
}; 