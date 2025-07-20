import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as admin from 'firebase-admin';
import { authenticateToken, AuthenticatedRequest } from '../utils/auth';

const router = express.Router();
const db = admin.firestore();

interface InviteTokenData {
  token: string;
  parentId?: string;
  studentId?: string;
  createdAt: admin.firestore.Timestamp;
  isUsed: boolean;
  usedAt: null | admin.firestore.Timestamp;
}

/**
 * POST /api/invite/student
 * Veli tarafından öğrenci davet token'ı oluşturur
 */
router.post('/student', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { parentId } = req.body;
    
    // Kullanıcı kimliği kontrolü
    if (!parentId || parentId !== req.user?.uid) {
      return res.status(403).json({ 
        error: 'Yetkisiz erişim' 
      });
    }
    
    // Benzersiz token oluştur
    const token = uuidv4();
    
    // Token verisini hazırla
    const tokenData: InviteTokenData = {
      token,
      parentId,
      createdAt: admin.firestore.Timestamp.now(),
      isUsed: false,
      usedAt: null,
      studentId: null,
    };
    
    // Firestore'a kaydet
    await db.collection('studentInviteTokens').doc(token).set(tokenData);
    
    // Başarılı yanıt
    return res.status(200).json({
      token,
      parentId,
      createdAt: new Date().toISOString(),
      isUsed: false,
    });
    
  } catch (error) {
    console.error('Öğrenci davet token oluşturma hatası:', error);
    return res.status(500).json({ 
      error: 'Öğrenci davet token oluşturulamadı' 
    });
  }
});

/**
 * GET /api/invite/student/:token
 * Öğrenci davet token'ını doğrular
 */
router.get('/student/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Token'ı Firestore'dan al
    const tokenDoc = await db.collection('studentInviteTokens').doc(token).get();
    
    // Token bulunamadıysa
    if (!tokenDoc.exists) {
      return res.status(404).json({ 
        error: 'Öğrenci davet token bulunamadı' 
      });
    }
    
    const tokenData = tokenDoc.data() as InviteTokenData;
    
    if (!tokenData) {
      return res.status(404).json({ 
        error: 'Token verisi bulunamadı' 
      });
    }
    
    // Token kullanılmış mı kontrol et
    if (tokenData.isUsed) {
      return res.status(400).json({ 
        error: 'Bu öğrenci davet token zaten kullanılmış' 
      });
    }
    
    // Token süresi dolmuş mu kontrol et (7 gün)
    const createdAt = tokenData.createdAt.toDate();
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 7) {
      return res.status(400).json({ 
        error: 'Bu öğrenci davet token süresi dolmuş' 
      });
    }
    
    // Veli bilgilerini al
    const parentDoc = await db.collection('users').doc(tokenData.parentId).get();
    let parentName = 'Veli';
    
    if (parentDoc.exists) {
      const parentData = parentDoc.data();
      if (parentData) {
        parentName = parentData.fullName || parentData.displayName || 'Veli';
      }
    }
    
    // Token geçerli, bilgileri döndür
    return res.status(200).json({
      token: tokenData.token,
      parentId: tokenData.parentId,
      parentName,
      createdAt: tokenData.createdAt.toDate().toISOString(),
      isUsed: tokenData.isUsed,
    });
    
  } catch (error) {
    console.error('Öğrenci davet token doğrulama hatası:', error);
    return res.status(500).json({ 
      error: 'Öğrenci davet token doğrulanamadı' 
    });
  }
});

/**
 * POST /api/invite/parent
 * Öğrenci tarafından veli davet token'ı oluşturur
 */
router.post('/parent', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { studentId } = req.body;
    
    // Kullanıcı kimliği kontrolü
    if (!studentId || studentId !== req.user?.uid) {
      return res.status(403).json({ 
        error: 'Yetkisiz erişim' 
      });
    }
    
    // Benzersiz token oluştur
    const token = uuidv4();
    
    // Token verisini hazırla
    const tokenData: InviteTokenData = {
      token,
      studentId,
      createdAt: admin.firestore.Timestamp.now(),
      isUsed: false,
      usedAt: null,
      parentId: null,
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
 * GET /api/invite/parent/:token
 * Veli davet token'ını doğrular
 */
router.get('/parent/:token', async (req, res) => {
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
    
    const tokenData = tokenDoc.data() as InviteTokenData;
    
    if (!tokenData) {
      return res.status(404).json({ 
        error: 'Token verisi bulunamadı' 
      });
    }
    
    // Token kullanılmış mı kontrol et
    if (tokenData.isUsed) {
      return res.status(400).json({ 
        error: 'Bu veli davet token zaten kullanılmış' 
      });
    }
    
    // Token süresi dolmuş mu kontrol et (7 gün)
    const createdAt = tokenData.createdAt.toDate();
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 7) {
      return res.status(400).json({ 
        error: 'Bu veli davet token süresi dolmuş' 
      });
    }
    
    // Öğrenci bilgilerini al
    const studentDoc = await db.collection('users').doc(tokenData.studentId).get();
    let studentName = 'Öğrenci';
    
    if (studentDoc.exists) {
      const studentData = studentDoc.data();
      if (studentData) {
        studentName = studentData.fullName || studentData.displayName || 'Öğrenci';
      }
    }
    
    // Token geçerli, bilgileri döndür
    return res.status(200).json({
      token: tokenData.token,
      studentId: tokenData.studentId,
      studentName,
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
 * POST /api/invite/register-student
 * Davet token kullanarak öğrenci kaydı yapar
 */
router.post('/register-student', async (req, res) => {
  try {
    const { token, student } = req.body;
    
    // Gerekli alanları kontrol et
    if (!token || !student || !student.name || !student.age || !student.grade) {
      return res.status(400).json({ 
        error: 'Eksik bilgi' 
      });
    }
    
    // Token'ı Firestore'dan al
    const tokenDoc = await db.collection('studentInviteTokens').doc(token).get();
    
    // Token bulunamadıysa
    if (!tokenDoc.exists) {
      return res.status(404).json({ 
        error: 'Öğrenci davet token bulunamadı' 
      });
    }
    
    const tokenData = tokenDoc.data() as InviteTokenData;
    
    if (!tokenData) {
      return res.status(404).json({ 
        error: 'Token verisi bulunamadı' 
      });
    }
    
    // Token kullanılmış mı kontrol et
    if (tokenData.isUsed) {
      return res.status(400).json({ 
        error: 'Bu öğrenci davet token zaten kullanılmış' 
      });
    }
    
    // Veli ID'sini al
    const parentId = tokenData.parentId;
    
    if (!parentId) {
      return res.status(400).json({ 
        error: 'Geçersiz token: Veli ID bulunamadı' 
      });
    }
    
    // Öğrenci verisi oluştur
    const studentData = {
      name: student.name,
      age: student.age,
      grade: student.grade,
      parentId,
      createdAt: admin.firestore.Timestamp.now(),
    };
    
    // Batch işlemi başlat
    const batch = db.batch();
    
    // Yeni öğrenci dokümanı oluştur
    const studentRef = db.collection('students').doc();
    batch.set(studentRef, studentData);
    
    // Token'ı kullanıldı olarak işaretle
    const tokenRef = db.collection('studentInviteTokens').doc(token);
    batch.update(tokenRef, {
      isUsed: true,
      usedAt: admin.firestore.Timestamp.now(),
      studentId: studentRef.id,
    });
    
    // Veli dokümanına öğrenciyi ekle
    const parentRef = db.collection('users').doc(parentId);
    const parentDoc = await parentRef.get();
    
    if (parentDoc.exists) {
      // Öğrenci profili oluştur
      const studentProfile = {
        studentId: studentRef.id,
        studentName: student.name,
        grade: student.grade,
        addedAt: admin.firestore.Timestamp.now(),
      };
      
      // Veli dokümanını güncelle
      batch.update(parentRef, {
        studentProfiles: admin.firestore.FieldValue.arrayUnion(studentProfile),
      });
    }
    
    // Batch işlemini çalıştır
    await batch.commit();
    
    // Başarılı yanıt
    return res.status(200).json({
      success: true,
      message: 'Öğrenci kaydı başarılı',
      student: {
        id: studentRef.id,
        name: student.name,
        age: student.age,
        grade: student.grade,
        parentId,
        createdAt: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error('Öğrenci kayıt hatası:', error);
    return res.status(500).json({ 
      error: 'Öğrenci kaydı yapılamadı' 
    });
  }
});

/**
 * POST /api/invite/register-parent
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
    
    const tokenData = tokenDoc.data() as InviteTokenData;
    
    if (!tokenData) {
      return res.status(404).json({ 
        error: 'Token verisi bulunamadı' 
      });
    }
    
    // Token kullanılmış mı kontrol et
    if (tokenData.isUsed) {
      return res.status(400).json({ 
        error: 'Bu veli davet token zaten kullanılmış' 
      });
    }
    
    // Öğrenci ID'sini al
    const studentId = tokenData.studentId;
    
    if (!studentId) {
      return res.status(400).json({ 
        error: 'Geçersiz token: Öğrenci ID bulunamadı' 
      });
    }
    
    // Veli verisi oluştur
    const parentData = {
      name: parent.name,
      relation: parent.relation,
      phone: parent.phone,
      studentId,
      createdAt: admin.firestore.Timestamp.now(),
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
      usedAt: admin.firestore.Timestamp.now(),
      parentId: parentRef.id,
    });
    
    // Öğrenci dokümanına veliyi ekle
    const studentRef = db.collection('users').doc(studentId);
    const studentDoc = await studentRef.get();
    
    if (studentDoc.exists) {
      // Veli profili oluştur
      const parentProfile = {
        parentId: parentRef.id,
        parentName: parent.name,
        relation: parent.relation,
        addedAt: admin.firestore.Timestamp.now(),
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

export default router; 