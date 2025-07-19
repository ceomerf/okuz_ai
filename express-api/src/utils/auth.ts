import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

// Genişletilmiş Request tipi
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
  };
}

/**
 * JWT token doğrulama middleware
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Yetkisiz erişim. Geçerli bir token gerekli.' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Firebase token doğrulama
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Kullanıcı bilgilerini request nesnesine ekle
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'user',
    };
    
    next();
  } catch (error) {
    console.error('Token doğrulama hatası:', error);
    return res.status(403).json({ 
      error: 'Geçersiz token veya oturum süresi dolmuş.' 
    });
  }
}; 