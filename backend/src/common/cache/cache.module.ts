import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './cache.interceptor';
import { CacheEvictInterceptor } from './cache-evict.interceptor';

@Global()
@Module({
  imports: [
    ConfigModule,
    NestCacheModule.registerAsync({
      useFactory: () => ({
        ttl: 300, // 5 minutes
        max: 100, // maximum number of items in cache
      }),
    }),
  ],
  providers: [CacheService, CacheInterceptor, CacheEvictInterceptor],
  exports: [CacheService, CacheInterceptor, CacheEvictInterceptor],
})
export class CacheModule {}
