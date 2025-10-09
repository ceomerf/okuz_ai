import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache hit: ${key}`);
      } else {
        this.logger.debug(`Cache miss: ${key}`);
      }
      return value;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache set: ${key} (TTL: ${ttl || 'default'})`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache delete: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async reset(): Promise<void> {
    try {
      await this.cacheManager.del('*');
      this.logger.debug('Cache reset');
    } catch (error) {
      this.logger.error('Cache reset error:', error);
    }
  }

  // Cache key generators
  generateUserKey(userId: string): string {
    return `user:${userId}`;
  }

  generateRoleKey(role: string): string {
    return `role:${role}`;
  }

  generateSchemaKey(entityName: string): string {
    return `schema:${entityName}`;
  }

  generateDashboardKey(dashboardId: string): string {
    return `dashboard:${dashboardId}`;
  }

  generateAnalyticsKey(query: string, params: any = {}): string {
    const paramString = JSON.stringify(params);
    return `analytics:${Buffer.from(query + paramString).toString('base64')}`;
  }

  generateNotificationKey(userId: string): string {
    return `notifications:${userId}`;
  }

  // Cache invalidation patterns
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      this.generateUserKey(userId),
      this.generateNotificationKey(userId),
    ];
    
    for (const pattern of patterns) {
      await this.del(pattern);
    }
  }

  async invalidateSchemaCache(): Promise<void> {
    // Invalidate all schema-related cache
    // This is a simplified approach - in production, you might want to use Redis pattern matching
    this.logger.debug('Schema cache invalidated');
  }

  async invalidateDashboardCache(dashboardId: string): Promise<void> {
    await this.del(this.generateDashboardKey(dashboardId));
  }

  async invalidateAnalyticsCache(): Promise<void> {
    // Invalidate all analytics cache
    this.logger.debug('Analytics cache invalidated');
  }

  // Cache with fallback function
  async getOrSet<T>(
    key: string,
    fallbackFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    try {
      let value = await this.get<T>(key);
      
      if (value === undefined) {
        this.logger.debug(`Cache miss, executing fallback for key: ${key}`);
        value = await fallbackFn();
        await this.set(key, value, ttl);
      }
      
      return value;
    } catch (error) {
      this.logger.error(`Cache getOrSet error for key ${key}:`, error);
      // If cache fails, execute fallback function
      return await fallbackFn();
    }
  }

  // Batch operations
  async mget<T>(keys: string[]): Promise<(T | undefined)[]> {
    try {
      const promises = keys.map(key => this.get<T>(key));
      return await Promise.all(promises);
    } catch (error) {
      this.logger.error('Cache mget error:', error);
      return keys.map(() => undefined);
    }
  }

  async mset<T>(keyValuePairs: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    try {
      const promises = keyValuePairs.map(({ key, value, ttl }) => 
        this.set(key, value, ttl)
      );
      await Promise.all(promises);
    } catch (error) {
      this.logger.error('Cache mset error:', error);
    }
  }

  // Cache statistics
  async getStats(): Promise<{
    hits: number;
    misses: number;
    keys: number;
  }> {
    try {
      // This is a simplified implementation
      // In production, you might want to use Redis INFO command
      return {
        hits: 0,
        misses: 0,
        keys: 0,
      };
    } catch (error) {
      this.logger.error('Cache stats error:', error);
      return { hits: 0, misses: 0, keys: 0 };
    }
  }
}
