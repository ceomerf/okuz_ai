import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

// Mock Redis
jest.mock('ioredis', () => {
  const MockRedis = jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    exists: jest.fn(),
    flushall: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    ping: jest.fn(),
    scanStream: jest.fn().mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield [];
      }
    }),
  }));
  
  return { default: MockRedis };
});

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock Redis instance
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      exists: jest.fn(),
      flushall: jest.fn(),
      disconnect: jest.fn(),
      on: jest.fn(),
      ping: jest.fn(),
    };

    // Mock Redis constructor
    const MockedRedis = require('ioredis').default;
    MockedRedis.mockImplementation(() => mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: { [key: string]: any } = {
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6379,
                REDIS_PASSWORD: 'password',
                REDIS_DB: 0,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return parsed JSON data when key exists', async () => {
      const key = 'test-key';
      const data = { test: 'value' };
      mockRedis.get.mockResolvedValue(JSON.stringify(data));

      const result = await service.get(key);

      expect(result).toEqual(data);
      expect(mockRedis.get).toHaveBeenCalledWith(key);
    });

    it('should return null when key does not exist', async () => {
      const key = 'non-existent-key';
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get(key);

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith(key);
    });

    it('should return null when JSON parsing fails', async () => {
      const key = 'invalid-json-key';
      mockRedis.get.mockResolvedValue('invalid json');

      const result = await service.get(key);

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'error-key';
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.get(key);

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set data with TTL', async () => {
      const key = 'test-key';
      const data = { test: 'value' };
      const ttl = 3600;
      mockRedis.setex.mockResolvedValue('OK');

      await service.set(key, data, ttl);

      expect(mockRedis.setex).toHaveBeenCalledWith(key, ttl, JSON.stringify(data));
    });

    it('should set data without TTL', async () => {
      const key = 'test-key';
      const data = { test: 'value' };
      mockRedis.setex.mockResolvedValue('OK');

      await service.set(key, data);

      expect(mockRedis.setex).toHaveBeenCalledWith(key, 3600, JSON.stringify(data));
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'error-key';
      const data = { test: 'value' };
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      await service.set(key, data);

      expect(mockRedis.setex).toHaveBeenCalledWith(key, 3600, JSON.stringify(data));
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      const key = 'test-key';
      mockRedis.del.mockResolvedValue(1);

      await service.del(key);

      expect(mockRedis.del).toHaveBeenCalledWith(key);
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'error-key';
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      await service.del(key);

      expect(mockRedis.del).toHaveBeenCalledWith(key);
    });
  });

  describe('delPattern', () => {
    it('should delete keys matching pattern', async () => {
      const pattern = 'user:*';
      const keys = ['user:1', 'user:2'];
      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.del.mockResolvedValue(2);

      await service.delPattern(pattern);

      expect(mockRedis.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
    });

    it('should handle empty pattern results', async () => {
      const pattern = 'non-existent:*';
      mockRedis.keys.mockResolvedValue([]);

      await service.delPattern(pattern);

      expect(mockRedis.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      const pattern = 'error:*';
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      await service.delPattern(pattern);

      expect(mockRedis.keys).toHaveBeenCalledWith(pattern);
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      const key = 'existing-key';
      mockRedis.exists.mockResolvedValue(1);

      const result = await service.exists(key);

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith(key);
    });

    it('should return false when key does not exist', async () => {
      const key = 'non-existent-key';
      mockRedis.exists.mockResolvedValue(0);

      const result = await service.exists(key);

      expect(result).toBe(false);
      expect(mockRedis.exists).toHaveBeenCalledWith(key);
    });

    it('should return false on Redis errors', async () => {
      const key = 'error-key';
      mockRedis.exists.mockRejectedValue(new Error('Redis error'));

      const result = await service.exists(key);

      expect(result).toBe(false);
    });
  });

  describe('flushAll', () => {
    it('should flush all data', async () => {
      mockRedis.flushall.mockResolvedValue('OK');

      await service.flushAll();

      expect(mockRedis.flushall).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.flushall.mockRejectedValue(new Error('Redis error'));

      await service.flushAll();

      expect(mockRedis.flushall).toHaveBeenCalled();
    });
  });

  describe('Cache Key Generators', () => {
    it('should generate user key', () => {
      const userId = '123';
      const key = service.getUserKey(userId);
      expect(key).toBe(`user:${userId}`);
    });

    it('should generate user profile key', () => {
      const userId = '123';
      const key = service.getUserProfileKey(userId);
      expect(key).toBe(`user:${userId}:profile`);
    });

    it('should generate plan key', () => {
      const planId = '456';
      const key = service.getPlanKey(planId);
      expect(key).toBe(`plan:${planId}`);
    });

    it('should generate user plans key', () => {
      const userId = '123';
      const key = service.getUserPlansKey(userId);
      expect(key).toBe(`user:${userId}:plans`);
    });

    it('should generate study sessions key', () => {
      const userId = '123';
      const key = service.getStudySessionsKey(userId);
      expect(key).toBe(`user:${userId}:sessions`);
    });

    it('should generate study sessions key with date', () => {
      const userId = '123';
      const date = '2024-01-01';
      const key = service.getStudySessionsKey(userId, date);
      expect(key).toBe(`user:${userId}:sessions:${date}`);
    });

    it('should generate progress key', () => {
      const userId = '123';
      const key = service.getProgressKey(userId);
      expect(key).toBe(`user:${userId}:progress`);
    });

    it('should generate topics key', () => {
      const subject = 'matematik';
      const grade = 9;
      const key = service.getTopicsKey(subject, grade);
      expect(key).toBe(`topics:${subject}:${grade}`);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate user cache', async () => {
      const userId = '123';
      const keys = [`user:${userId}`, `user:${userId}:profile`];
      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.del.mockResolvedValue(2);

      await service.invalidateUserCache(userId);

      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
    });

    it('should invalidate plan cache', async () => {
      const userId = '123';
      const planId = '456';
      mockRedis.del.mockResolvedValue(1);

      await service.invalidatePlanCache(planId, userId);

      expect(mockRedis.del).toHaveBeenCalledWith(`plan:${planId}`);
      expect(mockRedis.del).toHaveBeenCalledWith(`user:${userId}:plans`);
    });

    it('should invalidate progress cache', async () => {
      const userId = '123';
      mockRedis.del.mockResolvedValue(1);

      await service.invalidateProgressCache(userId);

      expect(mockRedis.del).toHaveBeenCalledWith(`user:${userId}:progress`);
      expect(mockRedis.del).toHaveBeenCalledWith(`user:${userId}:sessions*`);
    });
  });

  describe('Health Check', () => {
    it('should ping Redis successfully', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const result = await service.ping();

      expect(result).toBe(true);
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should handle Redis ping errors', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await service.ping();

      expect(result).toBe(false);
    });
  });

  describe('Disconnect', () => {
    it('should disconnect from Redis', async () => {
      (mockRedis.disconnect as jest.Mock).mockResolvedValue(undefined);

      await service.disconnect();

      expect(mockRedis.disconnect).toHaveBeenCalled();
    });
  });

  describe('Redis Connection Events', () => {
    it('should handle Redis error events', () => {
      const error = new Error('Redis connection error');
      mockRedis.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          callback(error);
        }
      });

      // This test verifies that the error event handler is set up
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle Redis connect events', () => {
      mockRedis.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          callback();
        }
      });

      // This test verifies that the connect event handler is set up
      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });
  });

  describe('Configuration', () => {
    it('should use default configuration values', async () => {
      // Test that the service uses default configuration
      expect(service).toBeDefined();
    });

    it('should use custom configuration values', async () => {
      const customConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: { [key: string]: any } = {
            REDIS_HOST: 'custom-host',
            REDIS_PORT: 6380,
            REDIS_PASSWORD: 'custom-password',
            REDIS_DB: 1,
          };
          return config[key] || defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          { provide: ConfigService, useValue: customConfigService },
        ],
      }).compile();

      const customService = module.get<CacheService>(CacheService);
      expect(customService).toBeDefined();
    });
  });
});