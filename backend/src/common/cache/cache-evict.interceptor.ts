import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';
import { Reflector } from '@nestjs/core';
import { CACHE_EVICT_METADATA, CacheEvictOptions } from './cache-evict.decorator';

@Injectable()
export class CacheEvictInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheEvictInterceptor.name);
  private cacheKeys: string[] = [];
  private usePattern: boolean = false;

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const getHandler = (context as any)?.getHandler;
    if (typeof getHandler !== 'function') {
      return next.handle();
    }
    const evictOptions = this.reflector.get<CacheEvictOptions>(
      CACHE_EVICT_METADATA,
      getHandler.call(context),
    );

    if (!evictOptions) {
      return next.handle();
    }

    // Execute the method first
    return next.handle().pipe(
      tap(async (data) => {
        // Only evict cache if the operation was successful
        if (data && !this.shouldSkipEviction(data)) {
          await this.evictCache(evictOptions, request);
        }
      }),
    );
  }

  private async evictCache(options: CacheEvictOptions, request: any): Promise<void> {
    try {
      if (options.allEntries) {
        await this.cacheService.flushAll();
        this.logger.debug('Evicted all cache entries');
        return;
      }

      if (options.pattern) {
        const resolvedPattern = this.resolvePattern(options.pattern, request);
        await this.cacheService.delPattern(resolvedPattern);
        this.logger.debug(`Evicted cache pattern: ${resolvedPattern}`);
      }

      if (options.key) {
        const resolvedKey = this.resolveKey(options.key, request);
        await this.cacheService.del(resolvedKey);
        this.logger.debug(`Evicted cache key: ${resolvedKey}`);
      }
    } catch (error) {
      this.logger.error('Cache eviction error:', error);
    }
  }

  private resolvePattern(pattern: string, request: any): string {
    let resolved = pattern;
    
    // Replace {userId} with actual user ID
    if (resolved.includes('{userId}') && request.user?.id) {
      resolved = resolved.replace('{userId}', request.user.id);
    }
    
    // Replace {id} with route parameter
    if (resolved.includes('{id}') && request.params?.id) {
      resolved = resolved.replace('{id}', request.params.id);
    }
    
    // Replace {planId} with route parameter
    if (resolved.includes('{planId}') && request.params?.planId) {
      resolved = resolved.replace('{planId}', request.params.planId);
    }

    return resolved;
  }

  private resolveKey(key: string, request: any): string {
    let resolved = key;
    
    // Replace {userId} with actual user ID
    if (resolved.includes('{userId}') && request.user?.id) {
      resolved = resolved.replace('{userId}', request.user.id);
    }
    
    // Replace {id} with route parameter
    if (resolved.includes('{id}') && request.params?.id) {
      resolved = resolved.replace('{id}', request.params.id);
    }
    
    // Replace {planId} with route parameter
    if (resolved.includes('{planId}') && request.params?.planId) {
      resolved = resolved.replace('{planId}', request.params.planId);
    }

    return resolved;
  }

  private shouldSkipEviction(data: any): boolean {
    // Skip eviction if data indicates an error
    if (data && typeof data === 'object') {
      if (data.error || data.message?.includes('error')) {
        return true;
      }
    }
    return false;
  }

  // Test için gerekli methodlar
  generateCacheKey(request: any): string {
    const { method, url, user } = request;
    const userId = user?.id || 'anonymous';
    return `cache:${method}:${url}:${userId}`;
  }

  shouldEvictCache(request: any): boolean {
    return request.method !== 'GET';
  }
}
