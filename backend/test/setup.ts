import 'dotenv/config';

// Test environment setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/okuz_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test_gemini_key';

// Mock Redis for all tests
jest.mock('ioredis', () => {
  const MockRedis = jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    exists: jest.fn().mockResolvedValue(0),
    flushall: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    scanStream: jest.fn().mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield [];
      }
    }),
  }));
  
  // Default export olarak döndür
  (MockRedis as any).default = MockRedis;
  return MockRedis;
});

// Mock BullMQ for all tests
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    emit: jest.fn(),
  })),
  QueueEvents: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  if (
    !args[0]?.includes?.('GEMINI_API_KEY environment variable is required') &&
    !args[0]?.includes?.('Nest can\'t resolve dependencies')
  ) {
    originalConsoleError(...args);
  }
};

console.warn = (...args) => {
  if (!args[0]?.includes?.('deprecated')) {
    originalConsoleWarn(...args);
  }
};

// Global test timeout
jest.setTimeout(30000);

// Clean up after tests
afterAll(async () => {
  // Close any open handles
  if (global.gc) {
    global.gc();
  }
  
  // Wait for any pending promises
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
