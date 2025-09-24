import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// curriculum_data.dart dosyasından konuları yükleme fonksiyonu
async function loadTopicsFromDartFile() {
  console.log('[SEED] curriculum_data.dart dosyasından konular yükleniyor...');
  
  try {
    let dartPath = path.resolve(__dirname, '../../lib/models/curriculum_data.dart');
    if (!fs.existsSync(dartPath)) {
      // Fallback: çalışılan dizin backend ise buradan hesapla
      const alt = path.resolve(process.cwd(), '../lib/models/curriculum_data.dart');
      if (fs.existsSync(alt)) {
        dartPath = alt;
      } else {
        throw new Error('curriculum_data.dart dosyası bulunamadı');
      }
    }
    
    const dartContent = fs.readFileSync(dartPath, 'utf8');
    // curriculum = [ ... ]; bloğunu yakala (non-greedy)
    const match = dartContent.match(/curriculum\s*=\s*\[(.*?)\];/s);
    if (!match || !match[1]) {
      throw new Error('curriculum verisi bulunamadı');
    }
    
    let jsonLike = `[${match[1]}]`;
    // Satır içi yorumları ve gereksiz trailing virgülleri temizle
    jsonLike = jsonLike.replace(/\n\s*\/\/.*$/gm, '');
    jsonLike = jsonLike.replace(/,\s*([\]}])/g, '$1');
    
    const curriculum = JSON.parse(jsonLike);
    type Level = { sinif_duzeyi: string; dersler: any[] };
    
    const toGrade = (s: string): number => {
      const match = s.match(/(\d+)/);
      return match ? parseInt(match[1]) : 9;
    };
    
    const rows: any[] = [];
    
    (curriculum as Level[]).forEach((level) => {
      const grade = toGrade(level.sinif_duzeyi);
      const modelYear = level.aciklama || '2025-2026';
      
      (level.dersler || []).forEach((ders: any) => {
        const officialSubjectName: string = ders.ders_adi;
        const subject = SUBJECT_NORMALIZATION_MAP[officialSubjectName] || officialSubjectName;
        
        // Temalar
        if (Array.isArray(ders.temalar)) {
          ders.temalar.forEach((tema: any) => {
            const unit = String(tema.tema_adi || 'Genel');
            (tema.konular || []).forEach((k: any) => {
              let topicName: string;
              let monthVal: number | undefined = undefined;
              if (k && typeof k === 'object') {
                topicName = String(k.topic || k.name || k.title || 'Konu');
                if (typeof k.month === 'number') monthVal = k.month;
              } else {
                topicName = String(k);
              }
              if (monthVal == null) {
                monthVal = MONTH_DISTRIBUTION[topicName];
                if (monthVal == null) {
                  monthVal = 9; // Default ay
                }
              }
              rows.push({ 
                grade, 
                subject, 
                unit, 
                topic: topicName, 
                month: monthVal, 
                officialSubjectName,
                modelYear,
                outcomes: [], 
                tytWeight: 0, 
                aytWeight: 0 
              });
            });
          });
        }
        
        // Üniteler
        if (Array.isArray(ders.uniteler)) {
          ders.uniteler.forEach((unite: any) => {
            const unit = String(unite.unite_adi || 'Genel');
            (unite.konular || []).forEach((k: any) => {
              let topicName: string;
              let monthVal: number | undefined = undefined;
              if (k && typeof k === 'object') {
                topicName = String(k.topic || k.name || k.title || 'Konu');
                if (typeof k.month === 'number') monthVal = k.month;
              } else {
                topicName = String(k);
              }
              if (monthVal == null) {
                monthVal = MONTH_DISTRIBUTION[topicName];
                if (monthVal == null) {
                  monthVal = 9; // Default ay
                }
              }
              rows.push({ 
                grade, 
                subject, 
                unit, 
                topic: topicName, 
                month: monthVal, 
                officialSubjectName,
                modelYear,
                outcomes: [], 
                tytWeight: 0, 
                aytWeight: 0 
              });
            });
          });
        }
      });
    });
    
    // Duplicate'leri kaldır (grade, subject, topic bazında)
    const uniqKey = (r: any) => `${r.grade}|${(r.subject||'').toLowerCase()}|${(r.topic||'').toLowerCase()}`;
    const uniqMap = new Map<string, typeof rows[number]>();
    rows.forEach(r => { if (!uniqMap.has(uniqKey(r))) uniqMap.set(uniqKey(r), r); });
    const uniqueRows = Array.from(uniqMap.values());
    
    // batch createMany
    const batchSize = 1000;
    for (let i = 0; i < uniqueRows.length; i += batchSize) {
      const chunk = uniqueRows.slice(i, i + batchSize);
      await prisma.mebTopic.createMany({ data: chunk });
    }
    
    console.log(`[SEED] ${uniqueRows.length} konu curriculum_data.dart dosyasından yüklendi.`);
    
  } catch (error) {
    console.error('[SEED] curriculum_data.dart yükleme hatası:', error);
    throw error;
  }
}

// Ders adlarını normalize eden harita
const SUBJECT_NORMALIZATION_MAP: Record<string, string> = {
  'İleri Matematik': 'Matematik',
  'İleri Fizik': 'Fizik',
  'İleri Kimya': 'Kimya',
  'İleri Biyoloji': 'Biyoloji',
  'Türk Dili ve Edebiyatı': 'Türkçe',
  'T.C. İnkılap Tarihi ve Atatürkçülük': 'Tarih',
  'Din Kültürü ve Ahlak Bilgisi': 'Din Kültürü',
};

// Tahmini ay dağılımı (manuel olarak zenginleştirilmeli)
const MONTH_DISTRIBUTION: Record<string, number> = {
  'Trigonometri': 9,
  'Vektörler': 9,
  'Redoks': 10,
  'Organik Bileşikler': 11,
  'Türev': 10,
  'İntegral': 11,
  'Limit ve Süreklilik': 9,
  'Logaritma': 9,
  'Kuvvet ve Hareket': 9,
  'İş ve Enerji': 10,
  'Atom ve Periyodik Sistem': 9,
  'Kimyasal Bağlar': 10,
  'Gazlar': 11,
  'Hücre Bölünmesi': 9,
  'Kalıtım': 10,
  'Ekosistem': 11,
  'Paragrafta Anlam': 9,
  'Cümlede Anlam': 10,
  'Ses Bilgisi': 11,
};

async function main() {
  // MEB konularını seed et (lib/models/curriculum_data.dart kaynağından)
  const mebTopicCount = await prisma.mebTopic.count();
  if (mebTopicCount === 0) {
    try {
      await loadTopicsFromDartFile();
    } catch (error) {
      console.error('[SEED] MebTopic seeding failed:', error);
    }
  } else {
    console.log('[SEED] MebTopic zaten mevcut, atlanıyor.');
  }

  // Test verilerini oluştur
  const testUser = await prisma.user.create({
    data: {
      email: 'test@okuz.ai',
      password: 'hashedpassword123',
      name: 'Test Student',
      role: 'STUDENT',
    },
  });

  const testPlan = await prisma.plan.create({
    data: {
      userId: testUser.id,
      title: 'Haftalık Çalışma Planı',
      description: 'Bu hafta matematik ve fizik çalışacağım',
      type: 'WEEKLY',
      subjects: ['Mathematics', 'Physics'],
      goals: ['Matematik testi çöz', 'Fizik formülleri ezberle'],
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  const testAchievement = await prisma.achievement.create({
    data: {
      userId: testUser.id,
      title: 'İlk Çalışma Seansı',
      description: 'İlk çalışma seansını tamamladın!',
      type: 'MILESTONE',
      points: 100,
    },
  });

  const biologySession = await prisma.studySession.create({
    data: {
      planId: testPlan.id,
      userId: testUser.id,
      subject: 'Biyoloji',
      topic: 'Oksijenli ve Oksijensiz Solunum',
      duration: 60,
      startTime: new Date('2025-09-24T08:00:00Z'),
      endTime: new Date('2025-09-24T09:00:00Z'),
    },
  });

  const turkishSession = await prisma.studySession.create({
    data: {
      planId: testPlan.id,
      userId: testUser.id,
      subject: 'Türkçe',
      topic: 'İstanbul Kültür Üniversitesi',
      duration: 45,
      startTime: new Date('2025-09-24T13:00:00Z'),
      endTime: new Date('2025-09-24T13:45:00Z'),
    },
  });

  console.log('Seed data created:', {
    testUser,
    testPlan,
    testAchievement,
    biologySession,
    turkishSession,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });