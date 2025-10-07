import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/okuz_ai_test';

export default async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  try {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6380';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
    process.env.OPENAI_API_KEY = 'test-openai-api-key';
    
    // Initialize test database
    console.log('📊 Setting up test database...');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DATABASE_URL,
        },
      },
    });
    
    // Connect to test database
    await prisma.$connect();
    
    // Run database migrations
    console.log('🔄 Running database migrations...');
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'inherit',
    });
    
    // Seed test database
    console.log('🌱 Seeding test database...');
    execSync('npx prisma db seed', {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'inherit',
    });
    
    // Disconnect
    await prisma.$disconnect();
    
    console.log('✅ Global test setup completed successfully');
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    process.exit(1);
  }
}
