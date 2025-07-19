const admin = require('firebase-admin');
const curriculumData = require('./src/maarif_modeli_data.json');

// Firebase Admin SDK'yi başlat
admin.initializeApp();
const db = admin.firestore();

async function uploadCurriculum() {
  console.log('Müfredat verisi Firestore\'a yükleniyor...');
  
  try {
    const batch = db.batch();
    
    curriculumData.forEach((classData, index) => {
      const docRef = db.collection('curriculum').doc(`class_${index}`);
      batch.set(docRef, classData);
      console.log(`Eklendi: ${classData.sinifDuzeyi}`);
    });
    
    await batch.commit();
    console.log(`✅ Başarıyla ${curriculumData.length} sınıf seviyesi yüklendi!`);
    
    // Verification - veri kontrolü
    const snapshot = await db.collection('curriculum').get();
    console.log(`📊 Firestore'da ${snapshot.size} doküman bulundu`);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.sinifDuzeyi}: ${data.dersler.length} ders`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    process.exit(0);
  }
}

uploadCurriculum(); 