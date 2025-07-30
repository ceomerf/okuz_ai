import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Test kullanıcısı oluştur
  const testUser = await prisma.user.create({
    data: {
      email: 'test@okuz.ai',
      password: 'hashedpassword123',
      role: 'STUDENT',
      studentProfile: {
        create: {
          firstName: 'Test',
          lastName: 'Student',
          grade: 10,
          school: 'Test School',
          gradeLevel: '10th Grade',
          subjects: ['Mathematics', 'Physics', 'Chemistry'],
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
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      subjects: ['Mathematics', 'Physics'],
      goals: ['Matematik testi çöz', 'Fizik formülleri ezberle'],
    },
  });

  // Test achievement oluştur
  const testAchievement = await prisma.achievement.create({
    data: {
      userId: testUser.id,
      title: 'İlk Çalışma Seansı',
      description: 'İlk çalışma seansını tamamladın!',
      points: 100,
      type: 'STUDY_SESSION',
    },
  });

  console.log('Seed data created:', { testUser, testPlan, testAchievement });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
