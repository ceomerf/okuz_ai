import 'dotenv/config';

// Test environment setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/okuz_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test_gemini_key';

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
});
