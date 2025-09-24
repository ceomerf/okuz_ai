import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  // MEB konularını seed et (lib/models/curriculum_data.dart kaynağından)
  const mebTopicCount = await prisma.mebTopic.count();
  if (mebTopicCount === 0) {
    try {
      let dartPath = path.resolve(__dirname, '../../lib/models/curriculum_data.dart');
      if (!fs.existsSync(dartPath)) {
        // Fallback: çalışılan dizin backend ise buradan hesapla
        const alt = path.resolve(process.cwd(), '../lib/models/curriculum_data.dart');
        if (fs.existsSync(alt)) {
          dartPath = alt;
        }
      }
      const dartContent = fs.readFileSync(dartPath, 'utf8');
      // curriculum = [ ... ]; bloğunu yakala (non-greedy)
      const match = dartContent.match(/curriculum\s*=\s*\[(.*?)\];/s);
      if (match && match[1]) {
        let jsonLike = `[${match[1]}]`;
        // Satır içi yorumları ve gereksiz trailing virgülleri temizlemeye çalış
        jsonLike = jsonLike.replace(/\n\s*\/\/.*$/gm, '');
        // Virgül + kapanışları düzelt
        jsonLike = jsonLike.replace(/,\s*([\]}])/g, '$1');
        // JSON.parse dene
        const curriculum = JSON.parse(jsonLike);
        type Level = { sinif_duzeyi: string; dersler: any[] };
        const toGrade = (s: string): number => {
          const m = (s || '').match(/(\d+)/);
          return m ? parseInt(m[1], 10) : 0;
        };
        const rows: Array<{ grade: number; subject: string; unit: string; topic: string; month?: number; outcomes: string[]; tytWeight: number; aytWeight: number }> = [];
        // Akademik ay sırası: Eyl(9)→Eki(10)→Kas(11)→Ara(12)→Oca(1)→...→Haz(6)
        const academicMonthOrder = [9,10,11,12,1,2,3,4,5,6];
        const nextAcademicMonth = (current: number): number => {
          const idx = academicMonthOrder.indexOf(current);
          return academicMonthOrder[(idx >= 0 ? idx + 1 : 0) % academicMonthOrder.length];
        };
        // Konu sırasına göre yaklaşık ay atamak için ders bazlı sayaç
        const subjectToApproxMonth: Record<string, number> = {};
        (curriculum as Level[]).forEach((level) => {
          const grade = toGrade(level.sinif_duzeyi);
          (level.dersler || []).forEach((ders: any) => {
            const subject: string = ders.ders_adi;
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
                  // Ay verilmemişse, ders bazlı artan ay dağıtımı uygula
                  if (monthVal == null) {
                    const currentApprox = subjectToApproxMonth[subject] ?? 9;
                    monthVal = currentApprox;
                    subjectToApproxMonth[subject] = nextAcademicMonth(currentApprox);
                  }
                  rows.push({ grade, subject, unit, topic: topicName, month: monthVal, outcomes: [], tytWeight: 0, aytWeight: 0 });
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
                    const currentApprox = subjectToApproxMonth[subject] ?? 9;
                    monthVal = currentApprox;
                    subjectToApproxMonth[subject] = nextAcademicMonth(currentApprox);
                  }
                  rows.push({ grade, subject, unit, topic: topicName, month: monthVal, outcomes: [], tytWeight: 0, aytWeight: 0 });
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
          await prisma.mebTopic.createMany({ data: chunk, skipDuplicates: true });
        }
        console.log(`Seeded MebTopic from curriculum_data.dart: ${uniqueRows.length} unique records`);
      } else {
        console.warn('curriculum_data.dart içinde curriculum dizisi bulunamadı. MebTopic seed atlandı.');
      }
    } catch (err) {
      console.error('MebTopic seeding failed:', err);
    }
  }
  // Test kullanıcısını kontrol et, varsa kullan, yoksa oluştur
  let testUser = await prisma.user.findUnique({
    where: { email: 'test@okuz.ai' },
  });

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: 'test@okuz.ai',
        password: 'hashedpassword123',
        name: 'Test Student',
        role: 'STUDENT',
        studentProfile: {
          create: {
            grade: 10,
            field: 'MF',
            goals: ['Matematik öğren', 'Fizik çalış'],
            learningStyle: 'visual',
            strengths: ['Analitik düşünme'],
            weaknesses: ['Hızlı okuma'],
            interests: ['Bilim', 'Teknoloji'],
          },
        },
      },
    });
  }

  // Test planı oluştur
  const testPlan = await prisma.plan.create({
    data: {
      userId: testUser.id,
      title: 'Haftalık Çalışma Planı',
      description: 'Bu hafta matematik ve fizik çalışacağım',
      type: 'WEEKLY',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      subjects: ['Mathematics', 'Physics'],
      goals: ['Matematik testi çöz', 'Fizik formülleri ezberle'],
      isActive: true,
    },
  });

  // Test achievement oluştur
  const testAchievement = await prisma.achievement.create({
    data: {
      userId: testUser.id,
      title: 'İlk Çalışma Seansı',
      description: 'İlk çalışma seansını tamamladın!',
      points: 100,
      type: 'MILESTONE',
    },
  });

  // Bugünkü dersler için örnek veriler oluştur
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Biyoloji dersi - 10:00
  const biologySession = await prisma.studySession.create({
    data: {
      userId: testUser.id,
      planId: testPlan.id,
      subject: 'Biyoloji',
      topic: 'Oksijenli ve Oksijensiz Solunum',
      duration: 60,
      startTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10:00
      endTime: new Date(today.getTime() + 11 * 60 * 60 * 1000), // 11:00
      isCompleted: false,
    },
  });

  // Türkçe dersi - 15:00
  const turkishSession = await prisma.studySession.create({
    data: {
      userId: testUser.id,
      planId: testPlan.id,
      subject: 'Türkçe',
      topic: 'İstanbul Kültür Üniversitesi',
      duration: 45,
      startTime: new Date(today.getTime() + 15 * 60 * 60 * 1000), // 15:00
      endTime: new Date(today.getTime() + 15 * 60 * 60 * 1000 + 45 * 60 * 1000), // 15:45
      isCompleted: false,
    },
  });

  console.log('Seed data created:', { 
    testUser, 
    testPlan, 
    testAchievement, 
    biologySession, 
    turkishSession 
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
