const admin = require('firebase-admin');

/**
 * Firebase Authentication token'ını doğrula
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Authorization header'ından token'ı al
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Token bulunamadı' 
      });
    }
    
    // Token'ı doğrula
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Kullanıcı bilgilerini req nesnesine ekle
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };
    
    next();
  } catch (error) {
    console.error('Token doğrulama hatası:', error);
    return res.status(403).json({ 
      error: 'Geçersiz token' 
    });
  }
};

module.exports = {
  authenticateToken,
}; 