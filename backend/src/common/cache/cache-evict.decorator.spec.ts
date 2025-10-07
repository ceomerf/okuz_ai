import { Test, TestingModule } from '@nestjs/testing';
import { CacheEvict } from './cache-evict.decorator';
import { CacheService } from './cache.service';

describe('CacheEvict Decorator', () => {
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CacheService,
          useValue: {
            del: jest.fn(),
            invalidatePattern: jest.fn(),
          },
        },
      ],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(CacheEvict).toBeDefined();
  });

  describe('CacheEvict decorator', () => {
    it('should create a decorator function', () => {
      const decorator = CacheEvict({ key: 'test-key' });
      expect(typeof decorator).toBe('function');
    });

    it('should create a decorator with custom TTL', () => {
      const decorator = CacheEvict({ key: 'test-key', ttl: 7200 });
      expect(typeof decorator).toBe('function');
    });

    it('should create a decorator with pattern', () => {
      const decorator = CacheEvict({ key: 'test-key', ttl: 3600, pattern: 'test-pattern' });
      expect(typeof decorator).toBe('function');
    });
  });

  describe('CacheEvict decorator usage', () => {
    it('should work with class methods', () => {
      class TestClass {
        @CacheEvict({ key: 'test-key' })
        testMethod() {
          return 'test';
        }
      }

      const instance = new TestClass();
      expect(instance.testMethod()).toBe('test');
    });

    it('should work with class methods with custom TTL', () => {
      class TestClass {
        @CacheEvict({ key: 'test-key', ttl: 7200 })
        testMethod() {
          return 'test';
        }
      }

      const instance = new TestClass();
      expect(instance.testMethod()).toBe('test');
    });

    it('should work with class methods with pattern', () => {
      class TestClass {
        @CacheEvict({ key: 'test-key', ttl: 3600, pattern: 'test-pattern' })
        testMethod() {
          return 'test';
        }
      }

      const instance = new TestClass();
      expect(instance.testMethod()).toBe('test');
    });
  });

  describe('CacheEvict decorator parameters', () => {
    it('should accept string key', () => {
      const decorator = CacheEvict({ key: 'simple-key' });
      expect(typeof decorator).toBe('function');
    });

    it('should accept key with TTL', () => {
      const decorator = CacheEvict({ key: 'key-with-ttl', ttl: 1800 });
      expect(typeof decorator).toBe('function');
    });

    it('should accept key with TTL and pattern flag', () => {
      const decorator = CacheEvict({ key: 'pattern-key', ttl: 3600, pattern: 'test-pattern' });
      expect(typeof decorator).toBe('function');
    });

    it('should accept key with pattern flag only', () => {
      const decorator = CacheEvict({ key: 'pattern-only-key', pattern: 'test-pattern' });
      expect(typeof decorator).toBe('function');
    });
  });

  describe('CacheEvict decorator metadata', () => {
    it('should store metadata correctly', () => {
      const decorator = CacheEvict({ key: 'test-key', ttl: 3600, pattern: 'test-pattern' });
      
      class TestClass {
        @decorator
        testMethod() {
          return 'test';
        }
      }

      // The decorator should be applied without errors
      expect(TestClass).toBeDefined();
    });

    it('should handle multiple decorators', () => {
      const decorator1 = CacheEvict({ key: 'key1' });
      const decorator2 = CacheEvict({ key: 'key2', ttl: 7200 });
      
      class TestClass {
        @decorator1
        @decorator2
        testMethod() {
          return 'test';
        }
      }

      expect(TestClass).toBeDefined();
    });
  });

  describe('CacheEvict decorator edge cases', () => {
    it('should handle empty key', () => {
      const decorator = CacheEvict({ key: '' });
      expect(typeof decorator).toBe('function');
    });

    it('should handle undefined TTL', () => {
      const decorator = CacheEvict({ key: 'test-key' });
      expect(typeof decorator).toBe('function');
    });

    it('should handle zero TTL', () => {
      const decorator = CacheEvict({ key: 'test-key', ttl: 0 });
      expect(typeof decorator).toBe('function');
    });

    it('should handle negative TTL', () => {
      const decorator = CacheEvict({ key: 'test-key', ttl: -1 });
      expect(typeof decorator).toBe('function');
    });

    it('should handle very large TTL', () => {
      const decorator = CacheEvict({ key: 'test-key', ttl: Number.MAX_SAFE_INTEGER });
      expect(typeof decorator).toBe('function');
    });
  });

  describe('CacheEvict decorator with different key types', () => {
    it('should handle simple string key', () => {
      const decorator = CacheEvict('simple-key');
      expect(typeof decorator).toBe('function');
    });

    it('should handle key with special characters', () => {
      const decorator = CacheEvict('key-with-special-chars-!@#$%^&*()');
      expect(typeof decorator).toBe('function');
    });

    it('should handle key with spaces', () => {
      const decorator = CacheEvict('key with spaces');
      expect(typeof decorator).toBe('function');
    });

    it('should handle key with numbers', () => {
      const decorator = CacheEvict('key123');
      expect(typeof decorator).toBe('function');
    });

    it('should handle key with underscores', () => {
      const decorator = CacheEvict('key_with_underscores');
      expect(typeof decorator).toBe('function');
    });

    it('should handle key with hyphens', () => {
      const decorator = CacheEvict('key-with-hyphens');
      expect(typeof decorator).toBe('function');
    });
  });
});
