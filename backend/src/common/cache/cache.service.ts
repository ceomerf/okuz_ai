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
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
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
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
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
