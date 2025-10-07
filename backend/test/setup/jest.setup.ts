import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../src/common/cache/cache.service';
import { QueueService } from '../../src/services/queue.service';

// Global test utilities
declare global {
  // eslint-disable-next-line no-var
  var testApp: INestApplication | undefined;
  // eslint-disable-next-line no-var
  var testModule: TestingModule | undefined;
  // eslint-disable-next-line no-var
  var testPrisma: PrismaService | undefined;
  // eslint-disable-next-line no-var
  var testConfig: ConfigService | undefined;
  // eslint-disable-next-line no-var
  var testCache: CacheService | undefined;
  // eslint-disable-next-line no-var
  var testQueue: QueueService | undefined;
}

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/okuz_ai_test';
const TEST_REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6380';

// Mock services
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  plan: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  studySession: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  aiRequestLog: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  flush: jest.fn(),
};

const mockQueueService = {
  add: jest.fn(),
  process: jest.fn(),
  getJobs: jest.fn(),
  clean: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      REDIS_URL: TEST_REDIS_URL,
      JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-for-testing-only',
      OPENAI_API_KEY: 'test-openai-api-key',
      CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
      BCRYPT_SALT_ROUNDS: '10',
      JWT_ACCESS_TOKEN_EXPIRATION: '1h',
      JWT_REFRESH_TOKEN_EXPIRATION: '7d',
      THROTTLER_SHORT_TTL: '60000',
      THROTTLER_SHORT_LIMIT: '5',
      THROTTLER_MEDIUM_TTL: '60000',
      THROTTLER_MEDIUM_LIMIT: '20',
      THROTTLER_LONG_TTL: '60000',
      THROTTLER_LONG_LIMIT: '100',
      AI_DEFAULT_MODEL: 'gpt-3.5-turbo',
      AI_DEFAULT_TEMPERATURE: '0.7',
      AI_DEFAULT_MAX_TOKENS: '2000',
      AI_DEFAULT_TIMEOUT: '30000',
      AI_DEFAULT_RETRIES: '2',
      AI_DEFAULT_CACHE_TTL: '1800',
      AI_RATE_LIMIT: '100',
    };
    return config[key];
  }),
};

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.REDIS_URL = TEST_REDIS_URL;
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
  process.env.OPENAI_API_KEY = 'test-openai-api-key';
  
  // Initialize test database connection
  if (globalThis.testPrisma) {
    await globalThis.testPrisma.$connect();
  }
});

// Global test teardown
afterAll(async () => {
  // Clean up test database
  if (globalThis.testPrisma) {
    await globalThis.testPrisma.$disconnect();
  }
  
  // Clear all mocks
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Before each test
beforeEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset database state
  if (globalThis.testPrisma) {
    // Clean up test data
    await globalThis.testPrisma.aiRequestLog.deleteMany();
    await globalThis.testPrisma.studySession.deleteMany();
    await globalThis.testPrisma.plan.deleteMany();
    await globalThis.testPrisma.user.deleteMany();
  }
  
  // Clear cache
  if (globalThis.testCache) {
    await globalThis.testCache.flushAll?.();
  }
});

// After each test
afterEach(async () => {
  // Clean up any remaining test data
  if (globalThis.testPrisma) {
    await globalThis.testPrisma.aiRequestLog.deleteMany();
    await globalThis.testPrisma.studySession.deleteMany();
    await globalThis.testPrisma.plan.deleteMany();
    await globalThis.testPrisma.user.deleteMany();
  }
});

// Test utilities
export const testUtils = {
  // Create test user
  async createTestUser(overrides: any = {}) {
    const defaultUser = {
      email: 'test@example.com',
      password: 'hashedpassword',
      name: 'Test User',
      role: 'STUDENT',
      ...overrides,
    };
    
    if (globalThis.testPrisma) {
      return await globalThis.testPrisma.user.create({
        data: defaultUser,
      });
    }
    
    return { id: 'test-user-id', ...defaultUser };
  },
  
  // Create test plan
  async createTestPlan(userId: string, overrides: any = {}) {
    const defaultPlan = {
      userId,
      title: 'Test Plan',
      description: 'Test Plan Description',
      subjects: ['Mathematics', 'Physics'],
      goals: ['Learn basics'],
      planType: 'DAILY',
      isActive: true,
      ...overrides,
    };
    
    if (globalThis.testPrisma) {
      return await globalThis.testPrisma.plan.create({
        data: defaultPlan,
      });
    }
    
    return { id: 'test-plan-id', ...defaultPlan };
  },
  
  // Create test session
  async createTestSession(planId: string, userId: string, overrides: any = {}) {
    const defaultSession = {
      planId,
      userId,
      subject: 'Mathematics',
      topic: 'Algebra',
      startTime: new Date(),
      duration: 60,
      difficulty: 'medium',
      sessionType: 'study',
      isCompleted: false,
      ...overrides,
    };
    
    if (globalThis.testPrisma) {
      return await globalThis.testPrisma.studySession.create({
        data: defaultSession,
      });
    }
    
    return { id: 'test-session-id', ...defaultSession };
  },
  
  // Mock OpenAI response
  mockOpenAIResponse(response: any) {
    // This will be handled by MSW in the actual tests
    return response;
  },
  
  // Wait for async operations
  async waitFor(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  // Generate test data
  generateTestData: {
    user: (overrides = {}) => ({
      email: `test-${Date.now()}@example.com`,
      password: 'hashedpassword',
      name: 'Test User',
      role: 'STUDENT',
      ...overrides,
    }),
    
    plan: (overrides = {}) => ({
      title: 'Test Plan',
      description: 'Test Plan Description',
      subjects: ['Mathematics', 'Physics'],
      goals: ['Learn basics'],
      planType: 'DAILY',
      isActive: true,
      ...overrides,
    }),
    
    session: (overrides = {}) => ({
      subject: 'Mathematics',
      topic: 'Algebra',
      startTime: new Date(),
      duration: 60,
      difficulty: 'medium',
      sessionType: 'study',
      isCompleted: false,
      ...overrides,
    }),
  },
};

// Export mock services for use in tests
export {
  mockPrismaService,
  mockCacheService,
  mockQueueService,
  mockConfigService,
  TEST_DATABASE_URL,
  TEST_REDIS_URL,
};

// Runtime mocks for problematic ESM/CJS libs
jest.mock('uuid', () => ({ v4: () => '00000000-0000-4000-8000-000000000000', __esModule: true }));

jest.mock('bcryptjs', () => ({
  __esModule: true,
  hash: async (data: string) => `hashed:${data}`,
  compare: async (data: string, hashed: string) => hashed === `hashed:${data}`,
  default: { hash: async (data: string) => `hashed:${data}`, compare: async (data: string, hashed: string) => hashed === `hashed:${data}` }
}));

jest.mock('ioredis', () => {
  class MockIORedis {
    constructor(..._args: any[]) {}
    connect = jest.fn(async () => undefined);
    disconnect = jest.fn(async () => undefined);
    on = jest.fn();
    ping = jest.fn(async () => 'PONG');
    get = jest.fn(async () => null);
    set = jest.fn(async () => 'OK');
    setex = jest.fn(async () => 'OK');
    del = jest.fn(async () => 1);
    keys = jest.fn(async () => []);
    ttl = jest.fn(async () => -1);
    info = jest.fn(async () => '');
    flushall = jest.fn(async () => 'OK');
    exists = jest.fn(async () => 0);
  }
  return { __esModule: true, default: MockIORedis };
});
