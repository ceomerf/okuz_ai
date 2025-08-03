import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Test kullanıcısı oluştur
  const testUser = await prisma.user.create({
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
