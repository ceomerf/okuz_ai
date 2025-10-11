import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Veritabanı seeding başlıyor...');

  // 1. Rolleri oluştur
  console.log('📝 Roller oluşturuluyor...');
  const adminRole = await (prisma as any).role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Sistem yöneticisi - tüm yetkilere sahip',
    },
  });

  const teacherRole = await (prisma as any).role.upsert({
    where: { name: 'TEACHER' },
    update: {},
    create: {
      name: 'TEACHER',
      description: 'Öğretmen - öğrencileri yönetebilir',
    },
  });

  const studentRole = await (prisma as any).role.upsert({
    where: { name: 'STUDENT' },
    update: {},
    create: {
      name: 'STUDENT',
      description: 'Öğrenci - kendi verilerini yönetebilir',
    },
  });

  const parentRole = await (prisma as any).role.upsert({
    where: { name: 'PARENT' },
    update: {},
    create: {
      name: 'PARENT',
      description: 'Veli - çocuğunun verilerini görüntüleyebilir',
    },
  });

  // 2. İzinleri oluştur
  console.log('🔐 İzinler oluşturuluyor...');
  const permissions = [
    // Kullanıcı yönetimi
    { name: 'users.create', resource: 'users', action: 'create', description: 'Kullanıcı oluşturma' },
    { name: 'users.read', resource: 'users', action: 'read', description: 'Kullanıcı görüntüleme' },
    { name: 'users.update', resource: 'users', action: 'update', description: 'Kullanıcı güncelleme' },
    { name: 'users.delete', resource: 'users', action: 'delete', description: 'Kullanıcı silme' },
    
    // Öğrenci yönetimi
    { name: 'students.create', resource: 'students', action: 'create', description: 'Öğrenci oluşturma' },
    { name: 'students.read', resource: 'students', action: 'read', description: 'Öğrenci görüntüleme' },
    { name: 'students.update', resource: 'students', action: 'update', description: 'Öğrenci güncelleme' },
    { name: 'students.delete', resource: 'students', action: 'delete', description: 'Öğrenci silme' },
    
    // Öğretmen yönetimi
    { name: 'teachers.create', resource: 'teachers', action: 'create', description: 'Öğretmen oluşturma' },
    { name: 'teachers.read', resource: 'teachers', action: 'read', description: 'Öğretmen görüntüleme' },
    { name: 'teachers.update', resource: 'teachers', action: 'update', description: 'Öğretmen güncelleme' },
    { name: 'teachers.delete', resource: 'teachers', action: 'delete', description: 'Öğretmen silme' },
    
    // Kurs yönetimi
    { name: 'courses.create', resource: 'courses', action: 'create', description: 'Kurs oluşturma' },
    { name: 'courses.read', resource: 'courses', action: 'read', description: 'Kurs görüntüleme' },
    { name: 'courses.update', resource: 'courses', action: 'update', description: 'Kurs güncelleme' },
    { name: 'courses.delete', resource: 'courses', action: 'delete', description: 'Kurs silme' },
    
    // Dashboard
    { name: 'dashboard.read', resource: 'dashboard', action: 'read', description: 'Dashboard görüntüleme' },
    { name: 'analytics.read', resource: 'analytics', action: 'read', description: 'Analitik görüntüleme' },
    
    // Sistem yönetimi
    { name: 'system.manage', resource: 'system', action: 'manage', description: 'Sistem yönetimi' },
    { name: 'settings.manage', resource: 'settings', action: 'manage', description: 'Ayarlar yönetimi' },
  ];

  const createdPermissions = [];
  for (const permission of permissions) {
    const created = await (prisma as any).permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
    createdPermissions.push(created);
  }

  // 3. Rol-İzin ilişkilerini oluştur
  console.log('🔗 Rol-İzin ilişkileri oluşturuluyor...');
  
  // Admin - tüm izinler
  for (const permission of createdPermissions) {
    await (prisma as any).rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  // Teacher - öğrenci ve kurs yönetimi
  const teacherPermissions = createdPermissions.filter(p => 
    p.resource === 'students' || p.resource === 'courses' || p.resource === 'dashboard'
  );
  for (const permission of teacherPermissions) {
    await (prisma as any).rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: teacherRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: teacherRole.id,
        permissionId: permission.id,
      },
    });
  }

  // Student - sadece okuma izinleri
  const studentPermissions = createdPermissions.filter(p => 
    p.action === 'read' && (p.resource === 'students' || p.resource === 'courses' || p.resource === 'dashboard')
  );
  for (const permission of studentPermissions) {
    await (prisma as any).rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: studentRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: studentRole.id,
        permissionId: permission.id,
      },
    });
  }

  // Parent - sadece öğrenci okuma izni
  const parentPermissions = createdPermissions.filter(p => 
    p.resource === 'students' && p.action === 'read'
  );
  for (const permission of parentPermissions) {
    await (prisma as any).rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: parentRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: parentRole.id,
        permissionId: permission.id,
      },
    });
  }

  // 4. Varsayılan admin kullanıcısı oluştur
  console.log('👤 Varsayılan admin kullanıcısı oluşturuluyor...');
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@okuz.ai' },
    update: {},
    create: {
      email: 'admin@okuz.ai',
      password: hashedPassword,
      name: 'Sistem Yöneticisi',
      firstName: 'Sistem',
      lastName: 'Yöneticisi',
      role: 'ADMIN',
    },
  });

  // Admin kullanıcısına admin rolü ata
  await (prisma as any).userRoleMap.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  // 5. Test kullanıcıları oluştur
  console.log('🧪 Test kullanıcıları oluşturuluyor...');
  
  // Test öğretmeni
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@okuz.ai' },
    update: {},
    create: {
      email: 'teacher@okuz.ai',
      password: await bcrypt.hash('teacher123', 12),
      name: 'Test Öğretmeni',
      firstName: 'Test',
      lastName: 'Öğretmeni',
      role: 'TEACHER',
    },
  });

  await (prisma as any).userRoleMap.upsert({
    where: {
      userId_roleId: {
        userId: teacherUser.id,
        roleId: teacherRole.id,
      },
    },
    update: {},
    create: {
      userId: teacherUser.id,
      roleId: teacherRole.id,
    },
  });

  // Test öğrencisi
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@okuz.ai' },
    update: {},
    create: {
      email: 'student@okuz.ai',
      password: await bcrypt.hash('student123', 12),
      name: 'Test Öğrencisi',
      firstName: 'Test',
      lastName: 'Öğrencisi',
      role: 'STUDENT',
    },
  });

  await (prisma as any).userRoleMap.upsert({
    where: {
      userId_roleId: {
        userId: studentUser.id,
        roleId: studentRole.id,
      },
    },
    update: {},
    create: {
      userId: studentUser.id,
      roleId: studentRole.id,
    },
  });

  // Test velisi
  const parentUser = await prisma.user.upsert({
    where: { email: 'parent@okuz.ai' },
    update: {},
    create: {
      email: 'parent@okuz.ai',
      password: await bcrypt.hash('parent123', 12),
      name: 'Test Veli',
      firstName: 'Test',
      lastName: 'Veli',
      role: 'PARENT',
    },
  });

  await (prisma as any).userRoleMap.upsert({
    where: {
      userId_roleId: {
        userId: parentUser.id,
        roleId: parentRole.id,
      },
    },
    update: {},
    create: {
      userId: parentUser.id,
      roleId: parentRole.id,
    },
  });

  // 6. Test verileri oluştur
  console.log('📊 Test verileri oluşturuluyor...');
  
  // Öğrenci profili
  await prisma.studentProfile.upsert({
    where: { studentId: studentUser.id },
    update: {},
    create: {
      studentId: studentUser.id,
    },
  });

  // Gamification profili - Schema'da yok, yorum satırına alındı
  // await prisma.gamificationProfile.upsert({
  //   where: { userId: studentUser.id },
  //   update: {},
  //   create: {
  //     userId: studentUser.id,
  //     level: 1,
  //     experience: 0,
  //     energy: 100,
  //     maxEnergy: 100,
  //     streak: 0,
  //     totalPoints: 0,
  //     coins: 0,
  //   },
  // });

  // Study streak modeli şemada yoksa atlandı

  // Entity Schemas kısmı kaldırıldı - model mevcut değil

  console.log('✅ Veritabanı seeding tamamlandı!');
  console.log('📋 Oluşturulan kullanıcılar:');
  console.log('   👤 Admin: admin@okuz.ai / admin123');
  console.log('   👨‍🏫 Öğretmen: teacher@okuz.ai / teacher123');
  console.log('   👨‍🎓 Öğrenci: student@okuz.ai / student123');
  console.log('   👨‍👩‍👧‍👦 Veli: parent@okuz.ai / parent123');
  // Entity Schemas kısmı kaldırıldı
}

main()
  .catch((e) => {
    console.error('❌ Seeding hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });