import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';
import { Reflector } from '@nestjs/core';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = this.getCacheKey(context, request);
    const ttl = this.getCacheTtl(context);

    if (!cacheKey) {
      return next.handle();
    }

    // Try to get from cache
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return of(cachedData);
    }

    // Execute the method and cache the result
    return next.handle().pipe(
      tap(async (data) => {
        if (data && !this.shouldSkipCache(data)) {
          try {
            await this.cacheService.set(cacheKey, data, ttl);
            this.logger.debug(`Cached data for key: ${cacheKey}`);
          } catch (error) {
            this.logger.error(`Cache set error for key ${cacheKey}:`, error);
          }
        }
      }),
    );
  }

  private getCacheKey(context: ExecutionContext, request: any): string | null {
    const cacheKey = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );

    if (!cacheKey) {
      return null;
    }

    // Replace placeholders in cache key
    let key = cacheKey;
    
    // Replace {userId} with actual user ID
    if (key.includes('{userId}') && request.user?.id) {
      key = key.replace('{userId}', request.user.id);
    }
    
    // Replace {id} with route parameter
    if (key.includes('{id}') && request.params?.id) {
      key = key.replace('{id}', request.params.id);
    }
    
    // Replace {planId} with route parameter
    if (key.includes('{planId}') && request.params?.planId) {
      key = key.replace('{planId}', request.params.planId);
    }

    return key;
  }

  private getCacheTtl(context: ExecutionContext): number | undefined {
    return this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler());
  }

  private shouldSkipCache(data: any): boolean {
    // Skip caching if data indicates an error
    if (data && typeof data === 'object') {
      if (data.error || data.message?.includes('error')) {
        return true;
      }
      
      // Skip caching if data is too large (prevent memory issues)
      const dataSize = JSON.stringify(data).length;
      if (dataSize > 1024 * 1024) { // 1MB limit
        this.logger.warn(`Skipping cache for large data: ${dataSize} bytes`);
        return true;
      }
      
      // Skip caching if data contains sensitive information
      if (data.password || data.token || data.secret) {
        this.logger.warn('Skipping cache for sensitive data');
        return true;
      }
    }
    return false;
  }
}

// Decorator for cache key
export const CacheKey = (key: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_KEY_METADATA, key, descriptor.value);
  };
};

// Decorator for cache TTL
export const CacheTTL = (ttl: number) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_TTL_METADATA, ttl, descriptor.value);
  };
};

// Combined decorator for easy use
export const Cacheable = (key: string, ttl?: number) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_KEY_METADATA, key, descriptor.value);
    if (ttl) {
      Reflect.defineMetadata(CACHE_TTL_METADATA, ttl, descriptor.value);
    }
  };
};
