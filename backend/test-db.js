// test-db.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Bağlantı kuruluyor...');
  try {
    // Veritabanına bağlanıp basit bir sorgu göndermeyi dene
    // 'user' yerine kendi modelinizden birini yazın (örn: student)
    const recordCount = await prisma.user.count(); 
    console.log(`✅ BAŞARILI! Veritabanında ${recordCount} kayıt bulundu.`);
  } catch (e) {
    console.error('❌ HATA! Bağlantı kurulamadı.');
    console.error(e);
  } finally {
    await prisma.$disconnect();
    console.log('Bağlantı kapatıldı.');
  }
}

main();
