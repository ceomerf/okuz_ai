import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: any) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request);
    
    // Cache'den veri çek
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }

    // Cache'de yoksa, veriyi al ve cache'e kaydet
    return next.handle().pipe(
      tap(async (data) => {
        // 30 dakika cache süresi
        await this.cacheManager.set(cacheKey, data, 1800);
      }),
    );
  }

  private generateCacheKey(request: any): string {
    const { method, url, user } = request;
    const userId = user?.id || 'anonymous';
    return `cache:${method}:${url}:${userId}`;
  }
}

// Cache decorator
export function Cacheable(key: string, ttl: number = 1800) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${key}:${JSON.stringify(args)}`;
      const cachedData = await this.cacheManager?.get(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }
      
      const result = await method.apply(this, args);
      await this.cacheManager?.set(cacheKey, result, ttl);
      
      return result;
    };
  };
}
