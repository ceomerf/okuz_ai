import { jest } from '@jest/globals';

// Mock Redis client
export const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  flushall: jest.fn(),
  keys: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  lpush: jest.fn(),
  rpush: jest.fn(),
  lpop: jest.fn(),
  rpop: jest.fn(),
  llen: jest.fn(),
  lrange: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  sismember: jest.fn(),
  zadd: jest.fn(),
  zrem: jest.fn(),
  zrange: jest.fn(),
  zrank: jest.fn(),
  zscore: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  isOpen: true,
  isReady: true,
};

// Mock Redis service
export const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  flush: jest.fn(),
  keys: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  lpush: jest.fn(),
  rpush: jest.fn(),
  lpop: jest.fn(),
  rpop: jest.fn(),
  llen: jest.fn(),
  lrange: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  sismember: jest.fn(),
  zadd: jest.fn(),
  zrem: jest.fn(),
  zrange: jest.fn(),
  zrank: jest.fn(),
  zscore: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  isOpen: true,
  isReady: true,
};

// Mock Redis responses
export const mockRedisResponses = {
  // Cache responses
  cacheHit: 'cached_data',
  cacheMiss: null,
  
  // Rate limiting responses
  rateLimitExceeded: '100',
  rateLimitAvailable: '50',
  
  // Session responses
  sessionData: JSON.stringify({
    userId: 'test-user-1',
    email: 'test@example.com',
    role: 'STUDENT',
    isActive: true,
  }),
  
  // AI request responses
  aiRequestData: JSON.stringify({
    requestId: 'test-request-1',
    userId: 'test-user-1',
    promptType: 'plan_generation',
    model: 'gpt-3.5-turbo',
    response: 'AI generated response',
    tokens: 250,
    duration: 1500,
    success: true,
  }),
  
  // Queue responses
  queueData: JSON.stringify({
    id: 'test-job-1',
    type: 'ai_request',
    data: {
      promptType: 'plan_generation',
      context: { subject: 'Mathematics' },
    },
    status: 'waiting',
  }),
};

// Mock Redis utilities
export const mockRedisUtils = {
  // Reset all mocks
  resetAll: () => {
    Object.values(mockRedisClient).forEach(mock => {
      if (typeof mock === 'function' && mock.mockReset) {
        mock.mockReset();
      }
    });
    Object.values(mockRedisService).forEach(mock => {
      if (typeof mock === 'function' && mock.mockReset) {
        mock.mockReset();
      }
    });
  },
  
  // Setup cache hit scenario
  setupCacheHit: (key: string, value: any) => {
    mockRedisClient.get.mockResolvedValue(JSON.stringify(value));
    mockRedisService.get.mockResolvedValue(JSON.stringify(value));
  },
  
  // Setup cache miss scenario
  setupCacheMiss: (key: string) => {
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisService.get.mockResolvedValue(null);
  },
  
  // Setup rate limiting scenario
  setupRateLimit: (key: string, current: number, limit: number) => {
    mockRedisClient.get.mockResolvedValue(current.toString());
    mockRedisService.get.mockResolvedValue(current.toString());
    mockRedisClient.incr.mockResolvedValue(current + 1);
    mockRedisService.incr.mockResolvedValue(current + 1);
  },
  
  // Setup session scenario
  setupSession: (sessionId: string, sessionData: any) => {
    mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));
    mockRedisService.get.mockResolvedValue(JSON.stringify(sessionData));
  },
  
  // Setup AI request scenario
  setupAIRequest: (requestId: string, requestData: any) => {
    mockRedisClient.get.mockResolvedValue(JSON.stringify(requestData));
    mockRedisService.get.mockResolvedValue(JSON.stringify(requestData));
  },
  
  // Setup queue scenario
  setupQueue: (queueName: string, jobData: any) => {
    mockRedisClient.lpush.mockResolvedValue(1);
    mockRedisService.lpush.mockResolvedValue(1);
    mockRedisClient.rpop.mockResolvedValue(JSON.stringify(jobData));
    mockRedisService.rpop.mockResolvedValue(JSON.stringify(jobData));
  },
  
  // Setup error scenario
  setupError: (error: Error) => {
    mockRedisClient.get.mockRejectedValue(error);
    mockRedisService.get.mockRejectedValue(error);
  },
  
  // Setup connection scenario
  setupConnection: (isConnected: boolean) => {
    mockRedisClient.isOpen = isConnected;
    mockRedisClient.isReady = isConnected;
    mockRedisService.isOpen = isConnected;
    mockRedisService.isReady = isConnected;
  },
  
  // Setup ping scenario
  setupPing: (response: string) => {
    mockRedisClient.ping.mockResolvedValue(response);
    mockRedisService.ping.mockResolvedValue(response);
  },
};

// Mock Redis configuration
export const mockRedisConfig = {
  host: 'localhost',
  port: 6380,
  password: 'test-password',
  db: 1,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryDelayOnClusterDown: 300,
  enableOfflineQueue: false,
  maxLoadingTimeout: 10000,
  enableReadyCheck: true,
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
  lazyConnect: true,
  maxLoadingTimeout: 10000,
  enableReadyCheck: true,
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
};

// Mock Redis test scenarios
export const mockRedisScenarios = {
  // Cache scenarios
  cacheScenarios: {
    hit: {
      key: 'cache:test:key',
      value: { data: 'cached_data', timestamp: Date.now() },
    },
    miss: {
      key: 'cache:test:key',
      value: null,
    },
    expired: {
      key: 'cache:test:key',
      value: null,
      ttl: -1,
    },
  },
  
  // Rate limiting scenarios
  rateLimitScenarios: {
    withinLimit: {
      key: 'rate_limit:user:123',
      current: 5,
      limit: 10,
    },
    atLimit: {
      key: 'rate_limit:user:123',
      current: 10,
      limit: 10,
    },
    exceeded: {
      key: 'rate_limit:user:123',
      current: 15,
      limit: 10,
    },
  },
  
  // Session scenarios
  sessionScenarios: {
    valid: {
      sessionId: 'session:123',
      data: {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'STUDENT',
        isActive: true,
        expiresAt: Date.now() + 3600000,
      },
    },
    expired: {
      sessionId: 'session:123',
      data: null,
    },
    invalid: {
      sessionId: 'session:123',
      data: null,
    },
  },
  
  // AI request scenarios
  aiRequestScenarios: {
    successful: {
      requestId: 'ai:request:123',
      data: {
        requestId: 'ai:request:123',
        userId: 'user-123',
        promptType: 'plan_generation',
        model: 'gpt-3.5-turbo',
        response: 'AI generated response',
        tokens: 250,
        duration: 1500,
        success: true,
      },
    },
    failed: {
      requestId: 'ai:request:123',
      data: {
        requestId: 'ai:request:123',
        userId: 'user-123',
        promptType: 'plan_generation',
        model: 'gpt-3.5-turbo',
        response: '',
        tokens: 0,
        duration: 500,
        success: false,
        error: 'Rate limit exceeded',
      },
    },
  },
  
  // Queue scenarios
  queueScenarios: {
    waiting: {
      queueName: 'ai:requests',
      jobData: {
        id: 'job-123',
        type: 'ai_request',
        data: {
          promptType: 'plan_generation',
          context: { subject: 'Mathematics' },
        },
        status: 'waiting',
      },
    },
    processing: {
      queueName: 'ai:requests',
      jobData: {
        id: 'job-123',
        type: 'ai_request',
        data: {
          promptType: 'plan_generation',
          context: { subject: 'Mathematics' },
        },
        status: 'processing',
      },
    },
    completed: {
      queueName: 'ai:requests',
      jobData: {
        id: 'job-123',
        type: 'ai_request',
        data: {
          promptType: 'plan_generation',
          context: { subject: 'Mathematics' },
        },
        status: 'completed',
        result: 'AI generated response',
      },
    },
  },
};
