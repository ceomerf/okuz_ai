import { PrismaClient } from '@prisma/client';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/okuz_ai_test';

export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');
  
  try {
    // Clean up test database
    console.log('🗑️ Cleaning up test database...');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DATABASE_URL,
        },
      },
    });
    
    // Connect to test database
    await prisma.$connect();
    
    // Clean up all test data
    await prisma.aiRequestLog.deleteMany();
    await prisma.aiUsageAnalytics.deleteMany();
    await prisma.aiPromptTemplate.deleteMany();
    await prisma.studySession.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.user.deleteMany();
    
    // Disconnect
    await prisma.$disconnect();
    
    console.log('✅ Global test teardown completed successfully');
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
    // Don't exit with error code to avoid masking test failures
  }
}
