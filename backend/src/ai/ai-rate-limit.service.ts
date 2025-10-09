import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../common/cache/cache.service';
import { PrismaService } from '../common/prisma/prisma.service';

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface UserRateLimit {
  userId: string;
  tier: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  currentMinute: number;
  currentHour: number;
  currentDay: number;
  lastReset: Date;
}

@Injectable()
export class AIRateLimitService {
  private readonly logger = new Logger(AIRateLimitService.name);
  private readonly rateLimitConfigs: Map<string, RateLimitConfig> = new Map();
  private readonly userRateLimits: Map<string, UserRateLimit> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
  ) {
    this.setupRateLimitConfigs();
  }

  /**
   * Rate limit konfigürasyonlarını kur
   */
  private setupRateLimitConfigs(): void {
    // Default tier
    this.rateLimitConfigs.set('default', {
      requestsPerMinute: 10,
      requestsPerHour: 100,
      requestsPerDay: 1000,
      burstLimit: 5,
      windowMs: 60000, // 1 dakika
    });

    // Premium tier
    this.rateLimitConfigs.set('premium', {
      requestsPerMinute: 30,
      requestsPerHour: 500,
      requestsPerDay: 5000,
      burstLimit: 15,
      windowMs: 60000,
    });

    // Enterprise tier
    this.rateLimitConfigs.set('enterprise', {
      requestsPerMinute: 100,
      requestsPerHour: 2000,
      requestsPerDay: 20000,
      burstLimit: 50,
      windowMs: 60000,
    });

    // AI-specific limits
    this.rateLimitConfigs.set('ai_planning', {
      requestsPerMinute: 5,
      requestsPerHour: 50,
      requestsPerDay: 500,
      burstLimit: 2,
      windowMs: 60000,
    });

    this.rateLimitConfigs.set('ai_coaching', {
      requestsPerMinute: 15,
      requestsPerHour: 200,
      requestsPerDay: 2000,
      burstLimit: 8,
      windowMs: 60000,
    });

    this.rateLimitConfigs.set('ai_content', {
      requestsPerMinute: 20,
      requestsPerHour: 300,
      requestsPerDay: 3000,
      burstLimit: 10,
      windowMs: 60000,
    });
  }

  /**
   * Rate limit kontrolü
   */
  async checkRateLimit(
    userId: string,
    promptType?: string,
    organizationId?: string
  ): Promise<RateLimitResult> {
    try {
      // Kullanıcı tier'ını al
      const userTier = await this.getUserTier(userId);
      
      // Rate limit konfigürasyonunu al
      const configKey = promptType ? `ai_${promptType}` : 'default';
      const config = this.rateLimitConfigs.get(configKey) || this.rateLimitConfigs.get('default')!;
      
      // Organization rate limit kontrolü
      if (organizationId) {
        const orgResult = await this.checkOrganizationRateLimit(organizationId, config);
        if (!orgResult.allowed) {
          return orgResult;
        }
      }

      // User rate limit kontrolü
      const userResult = await this.checkUserRateLimit(userId, config, userTier);
      return userResult;
    } catch (error) {
      this.logger.error(`Rate limit check failed`, { error: (error instanceof Error ? error.message : String(error)), userId, promptType });
      // Hata durumunda rate limit'i geç
      return {
        allowed: true,
        remaining: 999,
        resetTime: new Date(Date.now() + 60000),
      };
    }
  }

  /**
   * User rate limit kontrolü
   */
  private async checkUserRateLimit(
    userId: string,
    config: RateLimitConfig,
    userTier: string
  ): Promise<RateLimitResult> {
    const cacheKey = `rate_limit:user:${userId}`;
    const now = new Date();
    
    // Mevcut rate limit verilerini al
    let userRateLimit = await this.cache.get<UserRateLimit>(cacheKey);
    
    if (!userRateLimit) {
      // Yeni kullanıcı için rate limit oluştur
      userRateLimit = {
        userId,
        tier: userTier,
        requestsPerMinute: config.requestsPerMinute,
        requestsPerHour: config.requestsPerHour,
        requestsPerDay: config.requestsPerDay,
        burstLimit: config.burstLimit,
        currentMinute: 0,
        currentHour: 0,
        currentDay: 0,
        lastReset: now,
      };
    }

    // Reset kontrolü
    const timeSinceReset = now.getTime() - userRateLimit.lastReset.getTime();
    
    if (timeSinceReset >= 60000) { // 1 dakika geçti
      userRateLimit.currentMinute = 0;
    }
    
    if (timeSinceReset >= 3600000) { // 1 saat geçti
      userRateLimit.currentHour = 0;
    }
    
    if (timeSinceReset >= 86400000) { // 1 gün geçti
      userRateLimit.currentDay = 0;
      userRateLimit.lastReset = now;
    }

    // Rate limit kontrolü
    if (userRateLimit.currentMinute >= userRateLimit.requestsPerMinute) {
      const resetTime = new Date(userRateLimit.lastReset.getTime() + 60000);
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime.getTime() - now.getTime()) / 1000),
      };
    }

    if (userRateLimit.currentHour >= userRateLimit.requestsPerHour) {
      const resetTime = new Date(userRateLimit.lastReset.getTime() + 3600000);
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime.getTime() - now.getTime()) / 1000),
      };
    }

    if (userRateLimit.currentDay >= userRateLimit.requestsPerDay) {
      const resetTime = new Date(userRateLimit.lastReset.getTime() + 86400000);
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime.getTime() - now.getTime()) / 1000),
      };
    }

    // Counter'ları artır
    userRateLimit.currentMinute++;
    userRateLimit.currentHour++;
    userRateLimit.currentDay++;

    // Cache'e kaydet
    await this.cache.set(cacheKey, userRateLimit, 86400); // 24 saat

    return {
      allowed: true,
      remaining: userRateLimit.requestsPerMinute - userRateLimit.currentMinute,
      resetTime: new Date(userRateLimit.lastReset.getTime() + 60000),
    };
  }

  /**
   * Organization rate limit kontrolü
   */
  private async checkOrganizationRateLimit(
    organizationId: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const cacheKey = `rate_limit:org:${organizationId}`;
    const now = new Date();
    
    // Organization rate limit verilerini al
    let orgRateLimit = await this.cache.get<UserRateLimit>(cacheKey);
    
    if (!orgRateLimit) {
      // Yeni organization için rate limit oluştur
      orgRateLimit = {
        userId: organizationId,
        tier: 'organization',
        requestsPerMinute: config.requestsPerMinute * 10, // 10x user limit
        requestsPerHour: config.requestsPerHour * 10,
        requestsPerDay: config.requestsPerDay * 10,
        burstLimit: config.burstLimit * 10,
        currentMinute: 0,
        currentHour: 0,
        currentDay: 0,
        lastReset: now,
      };
    }

    // Reset kontrolü
    const timeSinceReset = now.getTime() - orgRateLimit.lastReset.getTime();
    
    if (timeSinceReset >= 60000) {
      orgRateLimit.currentMinute = 0;
    }
    
    if (timeSinceReset >= 3600000) {
      orgRateLimit.currentHour = 0;
    }
    
    if (timeSinceReset >= 86400000) {
      orgRateLimit.currentDay = 0;
      orgRateLimit.lastReset = now;
    }

    // Rate limit kontrolü
    if (orgRateLimit.currentMinute >= orgRateLimit.requestsPerMinute) {
      const resetTime = new Date(orgRateLimit.lastReset.getTime() + 60000);
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime.getTime() - now.getTime()) / 1000),
      };
    }

    // Counter'ları artır
    orgRateLimit.currentMinute++;
    orgRateLimit.currentHour++;
    orgRateLimit.currentDay++;

    // Cache'e kaydet
    await this.cache.set(cacheKey, orgRateLimit, 86400);

    return {
      allowed: true,
      remaining: orgRateLimit.requestsPerMinute - orgRateLimit.currentMinute,
      resetTime: new Date(orgRateLimit.lastReset.getTime() + 60000),
    };
  }

  /**
   * Kullanıcı tier'ını al
   */
  private async getUserTier(userId: string): Promise<string> {
    try {
      const user = await (this.prisma as any).user.findUnique({
        where: { id: userId },
        select: { subscriptionStatus: true },
      });

      return user?.subscriptionStatus?.toLowerCase() || 'default';
    } catch (error) {
      this.logger.warn(`Failed to get user tier for ${userId}`, { error: (error instanceof Error ? error.message : String(error)) });
      return 'default';
    }
  }

  /**
   * Rate limit'i reset et
   */
  async resetRateLimit(userId: string, organizationId?: string): Promise<void> {
    try {
      const userCacheKey = `rate_limit:user:${userId}`;
      await this.cache.del(userCacheKey);

      if (organizationId) {
        const orgCacheKey = `rate_limit:org:${organizationId}`;
        await this.cache.del(orgCacheKey);
      }

      this.logger.log(`Rate limit reset for user: ${userId}${organizationId ? ` and org: ${organizationId}` : ''}`);
    } catch (error) {
      this.logger.error(`Failed to reset rate limit`, { error: (error instanceof Error ? error.message : String(error)) });
    }
  }

  /**
   * Rate limit istatistikleri
   */
  async getRateLimitStatistics(userId: string): Promise<{
    userTier: string;
    currentUsage: {
      minute: number;
      hour: number;
      day: number;
    };
    limits: {
      minute: number;
      hour: number;
      day: number;
    };
    resetTime: Date;
  }> {
    try {
      const userTier = await this.getUserTier(userId);
      const config = this.rateLimitConfigs.get('default')!;
      
      const cacheKey = `rate_limit:user:${userId}`;
      const userRateLimit = await this.cache.get<UserRateLimit>(cacheKey);

      if (!userRateLimit) {
        return {
          userTier,
          currentUsage: { minute: 0, hour: 0, day: 0 },
          limits: {
            minute: config.requestsPerMinute,
            hour: config.requestsPerHour,
            day: config.requestsPerDay,
          },
          resetTime: new Date(Date.now() + 60000),
        };
      }

      return {
        userTier,
        currentUsage: {
          minute: userRateLimit.currentMinute,
          hour: userRateLimit.currentHour,
          day: userRateLimit.currentDay,
        },
        limits: {
          minute: userRateLimit.requestsPerMinute,
          hour: userRateLimit.requestsPerHour,
          day: userRateLimit.requestsPerDay,
        },
        resetTime: new Date(userRateLimit.lastReset.getTime() + 60000),
      };
    } catch (error) {
      this.logger.error(`Failed to get rate limit statistics`, { error: (error instanceof Error ? error.message : String(error)) });
      throw error;
    }
  }

  /**
   * Rate limit konfigürasyonunu güncelle
   */
  async updateRateLimitConfig(
    tier: string,
    config: Partial<RateLimitConfig>
  ): Promise<void> {
    try {
      const existingConfig = this.rateLimitConfigs.get(tier);
      if (!existingConfig) {
        throw new Error(`Rate limit config for tier ${tier} not found`);
      }

      const updatedConfig = { ...existingConfig, ...config };
      this.rateLimitConfigs.set(tier, updatedConfig);

      this.logger.log(`Rate limit config updated for tier: ${tier}`);
    } catch (error) {
      this.logger.error(`Failed to update rate limit config`, { error: (error instanceof Error ? error.message : String(error)) });
      throw error;
    }
  }

  /**
   * Rate limit middleware
   */
  createRateLimitMiddleware() {
    return async (req: any, res: any, next: any) => {
      try {
        const userId = req.user?.id;
        const promptType = req.body?.promptType;
        const organizationId = req.user?.organizationId;

        if (!userId) {
          return next();
        }

        const result = await this.checkRateLimit(userId, promptType, organizationId);
        
        if (!result.allowed) {
          res.set({
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetTime.toISOString(),
            'Retry-After': result.retryAfter?.toString(),
          });
          
          throw new BadRequestException('Rate limit exceeded. Please try again later.');
        }

        res.set({
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toISOString(),
        });

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}
