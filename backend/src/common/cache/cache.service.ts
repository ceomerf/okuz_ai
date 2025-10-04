import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis ready for operations');
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      this.logger.log('Redis reconnecting...');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value);
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        // Default TTL for cache entries (1 hour)
        await this.redis.setex(key, 3600, serialized);
      }
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  // Memory leak prevention - cache cleanup
  async cleanupExpiredKeys(): Promise<void> {
    try {
      // Redis automatically handles TTL, but we can add manual cleanup
      const keys = await this.redis.keys('*');
      const expiredKeys = [];
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) { // No expiration set
          expiredKeys.push(key);
        }
      }
      
      if (expiredKeys.length > 0) {
        await this.redis.del(...expiredKeys);
        this.logger.log(`Cleaned up ${expiredKeys.length} expired cache keys`);
      }
    } catch (error) {
      this.logger.error('Cache cleanup error:', error);
    }
  }

  // Cache memory usage monitoring
  async getMemoryUsage(): Promise<any> {
    try {
      const info = await this.redis.info('memory');
      const lines = info.split('\r\n');
      const memoryInfo: any = {};
      
      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          memoryInfo[key] = value;
        }
      });
      
      return memoryInfo;
    } catch (error) {
      this.logger.error('Cache memory usage error:', error);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async flushAll(): Promise<void> {
    try {
      await this.redis.flushall();
    } catch (error) {
      this.logger.error('Cache flush all error:', error);
    }
  }

  // Cache key generators
  getUserKey(userId: string): string {
    return `user:${userId}`;
  }

  getUserProfileKey(userId: string): string {
    return `user:${userId}:profile`;
  }

  getPlanKey(planId: string): string {
    return `plan:${planId}`;
  }

  getUserPlansKey(userId: string): string {
    return `user:${userId}:plans`;
  }

  getStudySessionsKey(userId: string, date?: string): string {
    const dateKey = date ? `:${date}` : '';
    return `user:${userId}:sessions${dateKey}`;
  }

  getProgressKey(userId: string): string {
    return `user:${userId}:progress`;
  }

  getTopicsKey(subject: string, grade: number): string {
    return `topics:${subject}:${grade}`;
  }

  // Cache invalidation patterns
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `user:${userId}`,
      `user:${userId}:*`,
    ];
    
    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  async invalidatePlanCache(planId: string, userId?: string): Promise<void> {
    await this.del(`plan:${planId}`);
    if (userId) {
      await this.del(`user:${userId}:plans`);
    }
  }

  async invalidateProgressCache(userId: string): Promise<void> {
    await this.del(`user:${userId}:progress`);
    await this.del(`user:${userId}:sessions*`);
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis ping error:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}
