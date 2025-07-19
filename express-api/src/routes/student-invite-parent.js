const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
const { authenticateToken } = require('../utils/auth');

// Firestore referansı
const db = admin.firestore();

/**
 * POST /api/student-invite-parent
 * Öğrencinin veli davet token'ı oluşturması
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.body;
    
    // Kullanıcı kimliği kontrolü
    if (!studentId || studentId !== req.user.uid) {
      return res.status(403).json({ 
        error: 'Yetkisiz erişim' 
      });
    }
    
    // Benzersiz token oluştur
    const token = uuidv4();
    
    // Token verisini hazırla
    const tokenData = {
      token,
      studentId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isUsed: false,
      usedAt: null,
    };
    
    // Firestore'a kaydet
    await db.collection('parentInviteTokens').doc(token).set(tokenData);
    
    // Başarılı yanıt
    return res.status(200).json({
      token,
      studentId,
      createdAt: new Date().toISOString(),
      isUsed: false,
    });
    
  } catch (error) {
    console.error('Veli davet token oluşturma hatası:', error);
    return res.status(500).json({ 
      error: 'Veli davet token oluşturulamadı' 
    });
  }
});

/**
 * GET /api/student-invite-parent/:token
 * Bir veli davet token'ını doğrular
 */
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Token'ı Firestore'dan al
    const tokenDoc = await db.collection('parentInviteTokens').doc(token).get();
    
    // Token bulunamadıysa
    if (!tokenDoc.exists) {
      return res.status(404).json({ 
        error: 'Veli davet token bulunamadı' 
      });
    }
    
    const tokenData = tokenDoc.data();
    
    // Token kullanılmış mı kontrol et
    if (tokenData.isUsed) {
      return res.status(400).json({ 
        error: 'Bu veli davet token zaten kullanılmış' 
      });
    }
    
    // Token süresi dolmuş mu kontrol et (7 gün)
    const createdAt = tokenData.createdAt.toDate();
    const now = new Date();
    const diffTime = Math.abs(now - createdAt);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 7) {
      return res.status(400).json({ 
        error: 'Bu veli davet token süresi dolmuş' 
      });
    }
    
    // Token geçerli, bilgileri döndür
    return res.status(200).json({
      token: tokenData.token,
      studentId: tokenData.studentId,
      createdAt: tokenData.createdAt.toDate().toISOString(),
      isUsed: tokenData.isUsed,
    });
    
  } catch (error) {
    console.error('Veli davet token doğrulama hatası:', error);
    return res.status(500).json({ 
      error: 'Veli davet token doğrulanamadı' 
    });
  }
});

/**
 * POST /api/register-parent
 * Davet token kullanarak veli kaydı yapar
 */
router.post('/register-parent', async (req, res) => {
  try {
    const { token, parent } = req.body;
    
    // Gerekli alanları kontrol et
    if (!token || !parent || !parent.name || !parent.relation || !parent.phone) {
      return res.status(400).json({ 
        error: 'Eksik bilgi' 
      });
    }
    
    // Token'ı Firestore'dan al
    const tokenDoc = await db.collection('parentInviteTokens').doc(token).get();
    
    // Token bulunamadıysa
    if (!tokenDoc.exists) {
      return res.status(404).json({ 
        error: 'Veli davet token bulunamadı' 
      });
    }
    
    const tokenData = tokenDoc.data();
    
    // Token kullanılmış mı kontrol et
    if (tokenData.isUsed) {
      return res.status(400).json({ 
        error: 'Bu veli davet token zaten kullanılmış' 
      });
    }
    
    // Öğrenci ID'sini al
    const studentId = tokenData.studentId;
    
    // Veli verisi oluştur
    const parentData = {
      name: parent.name,
      relation: parent.relation,
      phone: parent.phone,
      studentId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    // Batch işlemi başlat
    const batch = db.batch();
    
    // Yeni veli dokümanı oluştur
    const parentRef = db.collection('parents').doc();
    batch.set(parentRef, parentData);
    
    // Token'ı kullanıldı olarak işaretle
    const tokenRef = db.collection('parentInviteTokens').doc(token);
    batch.update(tokenRef, {
      isUsed: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Öğrenci dokümanına veliyi ekle
    const studentRef = db.collection('students').doc(studentId);
    const studentDoc = await studentRef.get();
    
    if (studentDoc.exists) {
      // Veli profili oluştur
      const parentProfile = {
        parentId: parentRef.id,
        parentName: parent.name,
        relation: parent.relation,
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      // Öğrenci dokümanını güncelle
      batch.update(studentRef, {
        parentProfiles: admin.firestore.FieldValue.arrayUnion(parentProfile),
      });
    }
    
    // Batch işlemini çalıştır
    await batch.commit();
    
    // Başarılı yanıt
    return res.status(200).json({
      success: true,
      message: 'Veli kaydı başarılı',
      parent: {
        id: parentRef.id,
        name: parent.name,
        relation: parent.relation,
        phone: parent.phone,
        studentId,
        createdAt: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error('Veli kayıt hatası:', error);
    return res.status(500).json({ 
      error: 'Veli kaydı yapılamadı' 
    });
  }
});

module.exports = router; 