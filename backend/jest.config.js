module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Root directory
  rootDir: './src',
  
  // Test patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.e2e.ts',
    '**/__tests__/**/*.integration.ts',
    '**/*.test.ts',
    '**/*.e2e.ts',
    '**/*.integration.ts',
    '**/*.spec.ts'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '../coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 98,
      functions: 98,
      lines: 98,
      statements: 98
    },
    // Module-specific thresholds
    './auth/': {
      branches: 98,
      functions: 98,
      lines: 98,
      statements: 98
    },
    './planning/': {
      branches: 98,
      functions: 98,
      lines: 98,
      statements: 98
    },
    './ai/': {
      branches: 98,
      functions: 98,
      lines: 98,
      statements: 98
    }
  },
  
  // Coverage collection
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/__tests__/**',
    '!**/test/**',
    '!**/*.config.js',
    '!**/*.config.ts',
    '!**/main.ts',
    '!**/prisma/**',
    '!**/migrations/**'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/../test/setup/jest.setup.ts'
  ],
  
  // Global setup (disabled for unit tests)
  // globalSetup: '<rootDir>/../test/setup/global.setup.ts',
  // globalTeardown: '<rootDir>/../test/setup/global.teardown.ts',
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@test/(.*)$': '<rootDir>/../test/$1',
    '^@fixtures/(.*)$': '<rootDir>/../test/fixtures/$1',
    '^@mocks/(.*)$': '<rootDir>/../test/mocks/$1',
    // ESM problemli paketler için mock/haritalama
    '^uuid$': '<rootDir>/../test/mocks/uuid.ts',
    '^ioredis$': '<rootDir>/../test/mocks/ioredis.js',
    '^bcryptjs$': '<rootDir>/../test/mocks/bcryptjs.ts'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Test timeout
  testTimeout: 30000,
  
  // Detect open handles
  detectOpenHandles: true,
  forceExit: true,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Parallel execution
  maxWorkers: '50%',
  
  // Cache
  cache: true,
  cacheDirectory: '<rootDir>/../.jest-cache',
  
  // Watch mode
  watchPathIgnorePatterns: [
    '<rootDir>/../node_modules/',
    '<rootDir>/../coverage/',
    '<rootDir>/../.jest-cache/'
  ]
};
