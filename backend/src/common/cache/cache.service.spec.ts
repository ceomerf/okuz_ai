import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');
const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

describe('CacheService', () => {
  let service: CacheService;
  let configService: ConfigService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(async () => {
    // Reset mocks
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
      ping: jest.fn(),
      disconnect: jest.fn(),
      on: jest.fn(),
    } as any;

    // Mock Redis constructor
    MockedRedis.mockImplementation(() => mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
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
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('get', () => {
    it('should return parsed JSON data when key exists', async () => {
      const testData = { id: '1', name: 'Test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await service.get('test-key');

      expect(result).toEqual(testData);
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should return null when JSON parsing fails', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');

      const result = await service.get('invalid-key');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.get('error-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set data with TTL', async () => {
      const testData = { id: '1', name: 'Test' };
      mockRedis.setex.mockResolvedValue('OK');

      await service.set('test-key', testData, 300);

      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 300, JSON.stringify(testData));
    });

    it('should set data without TTL', async () => {
      const testData = { id: '1', name: 'Test' };
      mockRedis.set.mockResolvedValue('OK');

      await service.set('test-key', testData);

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', JSON.stringify(testData));
    });

    it('should handle Redis errors gracefully', async () => {
      const testData = { id: '1', name: 'Test' };
      mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));

      await expect(service.set('test-key', testData)).resolves.toBeUndefined();
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.del('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis connection failed'));

      await expect(service.del('test-key')).resolves.toBeUndefined();
    });
  });

  describe('delPattern', () => {
    it('should delete keys matching pattern', async () => {
      const keys = ['user:1', 'user:1:profile', 'user:1:plans'];
      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.del.mockResolvedValue(3);

      await service.delPattern('user:1*');

      expect(mockRedis.keys).toHaveBeenCalledWith('user:1*');
      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
    });

    it('should handle empty pattern results', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await service.delPattern('non-existent-pattern*');

      expect(mockRedis.keys).toHaveBeenCalledWith('non-existent-pattern*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis connection failed'));

      await expect(service.delPattern('error-pattern*')).resolves.toBeUndefined();
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await service.exists('test-key');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('test-key');
    });

    it('should return false when key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await service.exists('non-existent-key');

      expect(result).toBe(false);
    });

    it('should return false on Redis errors', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.exists('error-key');

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
      mockRedis.flushall.mockRejectedValue(new Error('Redis connection failed'));

      await expect(service.flushAll()).resolves.toBeUndefined();
    });
  });

  describe('Cache Key Generators', () => {
    it('should generate user key', () => {
      const result = service.getUserKey('user-1');
      expect(result).toBe('user:user-1');
    });

    it('should generate user profile key', () => {
      const result = service.getUserProfileKey('user-1');
      expect(result).toBe('user:user-1:profile');
    });

    it('should generate plan key', () => {
      const result = service.getPlanKey('plan-1');
      expect(result).toBe('plan:plan-1');
    });

    it('should generate user plans key', () => {
      const result = service.getUserPlansKey('user-1');
      expect(result).toBe('user:user-1:plans');
    });

    it('should generate study sessions key', () => {
      const result = service.getStudySessionsKey('user-1');
      expect(result).toBe('user:user-1:sessions');
    });

    it('should generate study sessions key with date', () => {
      const result = service.getStudySessionsKey('user-1', '2024-01-01');
      expect(result).toBe('user:user-1:sessions:2024-01-01');
    });

    it('should generate progress key', () => {
      const result = service.getProgressKey('user-1');
      expect(result).toBe('user:user-1:progress');
    });

    it('should generate topics key', () => {
      const result = service.getTopicsKey('Matematik', 12);
      expect(result).toBe('topics:Matematik:12');
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate user cache', async () => {
      mockRedis.keys.mockResolvedValue(['user:user-1', 'user:user-1:profile']);
      mockRedis.del.mockResolvedValue(2);

      await service.invalidateUserCache('user-1');

      expect(mockRedis.keys).toHaveBeenCalledWith('user:user-1*');
      expect(mockRedis.del).toHaveBeenCalledWith('user:user-1', 'user:user-1:profile');
    });

    it('should invalidate plan cache', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.invalidatePlanCache('plan-1', 'user-1');

      expect(mockRedis.del).toHaveBeenCalledWith('plan:plan-1');
      expect(mockRedis.del).toHaveBeenCalledWith('user:user-1:plans');
    });

    it('should invalidate progress cache', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.invalidateProgressCache('user-1');

      expect(mockRedis.del).toHaveBeenCalledWith('user:user-1:progress');
    });
  });

  describe('Health Check', () => {
    it('should return true when Redis is healthy', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const result = await service.ping();

      expect(result).toBe(true);
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should return false when Redis is unhealthy', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await service.ping();

      expect(result).toBe(false);
    });
  });

  describe('Disconnect', () => {
    it('should disconnect from Redis', async () => {
      mockRedis.disconnect.mockResolvedValue();

      await service.disconnect();

      expect(mockRedis.disconnect).toHaveBeenCalled();
    });
  });

  describe('Redis Connection Events', () => {
    it('should handle Redis error events', () => {
      const errorHandler = mockRedis.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1] as (err: Error) => void;

      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler).toBe('function');
    });

    it('should handle Redis connect events', () => {
      const connectHandler = mockRedis.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1] as () => void;

      expect(connectHandler).toBeDefined();
      expect(typeof connectHandler).toBe('function');
    });
  });

  describe('Configuration', () => {
    it('should use default configuration values', () => {
      expect(MockedRedis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        password: 'password',
        db: 0,
        maxRetriesPerRequest: 3,
      });
    });

    it('should use custom configuration values', async () => {
      const customConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config = {
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
          {
            provide: ConfigService,
            useValue: customConfigService,
          },
        ],
      }).compile();

      const customService = module.get<CacheService>(CacheService);

      expect(MockedRedis).toHaveBeenCalledWith({
        host: 'custom-host',
        port: 6380,
        password: 'custom-password',
        db: 1,
        maxRetriesPerRequest: 3,
      });
    });
  });
});
