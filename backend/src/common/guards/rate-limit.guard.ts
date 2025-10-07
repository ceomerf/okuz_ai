import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CacheService } from '../cache/cache.service';
import { ConfigService } from '@nestjs/config';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  skipIf?: (req: Request) => boolean;
  onLimitReached?: (req: Request, res: any) => void;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    const options = this.getRateLimitOptions(context);

    if (!options) {
      return true; // No rate limiting configured
    }

    // Skip if condition is met
    if (options.skipIf && options.skipIf(request)) {
      return true;
    }

    const key = this.generateKey(request, options);
    const current = await this.getCurrentCount(key);
    const ttl = await this.getTTL(key);

    if (current >= options.max) {
      const uid = (request as any)?.user?.id as string | undefined;
      this.logger.warn(`Rate limit exceeded for key: ${key}`, {
        userId: uid,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        current,
        max: options.max,
        endpoint: request.path,
        method: request.method,
      });

      // Call custom limit reached handler
      if (options.onLimitReached) {
        options.onLimitReached(request, response);
      }

      // Log security event
      this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        ip: request.ip,
        userId: uid,
        endpoint: request.path,
        userAgent: request.headers['user-agent'],
      });

      throw new HttpException(
        {
          message: options.message || 'Rate limit exceeded',
          retryAfter: Math.ceil(ttl / 1000),
          limit: options.max,
          remaining: 0,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Increment counter
    await this.incrementCount(key, options.windowMs);

    // Add rate limit headers
    response.setHeader('X-RateLimit-Limit', options.max);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - current - 1));
    response.setHeader('X-RateLimit-Reset', new Date(Date.now() + ttl).toISOString());
    response.setHeader('X-RateLimit-Window', Math.ceil(options.windowMs / 1000));

    return true;
  }

  private getRateLimitOptions(context: ExecutionContext): RateLimitOptions | null {
    // Controller veya method seviyesinde rate limit options'ı al
    const options = this.reflector.get<RateLimitOptions>('rateLimit', context.getHandler()) ||
                   this.reflector.get<RateLimitOptions>('rateLimit', context.getClass());
    
    return options;
  }

  private generateKey(request: Request, options: RateLimitOptions): string {
    // Custom key generator kullan
    if (options.keyGenerator) {
      return options.keyGenerator(request);
    }

    const userId = (request as any)?.user?.id as string | undefined;
    const ip = request.ip;
    const endpoint = request.path;
    
    // User-based rate limiting (preferred)
    if (userId) {
      return `rate_limit:user:${userId}:${endpoint}`;
    }
    
    // IP-based rate limiting (fallback)
    return `rate_limit:ip:${ip}:${endpoint}`;
  }

  private async getCurrentCount(key: string): Promise<number> {
    try {
      const count = await this.cacheService.get<number>(key);
      return count || 0;
    } catch (error) {
      this.logger.error(`Failed to get current count for key: ${key}`, error);
      return 0;
    }
  }

  private async getTTL(key: string): Promise<number> {
    try {
      // Redis TTL komutu kullanılabilir
      // Bu basit implementasyon için 60 saniye varsayıyoruz
      return 60000; // 60 seconds
    } catch (error) {
      this.logger.error(`Failed to get TTL for key: ${key}`, error);
      return 60000;
    }
  }

  private async incrementCount(key: string, windowMs: number): Promise<void> {
    try {
      const current = await this.getCurrentCount(key);
      await this.cacheService.set(key, current + 1, Math.ceil(windowMs / 1000));
    } catch (error) {
      this.logger.error(`Failed to increment count for key: ${key}`, error);
    }
  }

  private logSecurityEvent(eventType: string, data: any): void {
    this.logger.warn(`Security Event: ${eventType}`, {
      eventType,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }
}

// Decorator for easy use
export function RateLimit(options: RateLimitOptions) {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      // Method decorator
      Reflect.defineMetadata('rateLimit', options, descriptor.value);
    } else {
      // Class decorator
      Reflect.defineMetadata('rateLimit', options, target);
    }
  };
}
