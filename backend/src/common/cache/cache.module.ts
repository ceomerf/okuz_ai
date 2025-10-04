import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './cache.interceptor';
import { CacheEvictInterceptor } from './cache-evict.interceptor';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CacheService, CacheInterceptor, CacheEvictInterceptor],
  exports: [CacheService, CacheInterceptor, CacheEvictInterceptor],
})
export class CacheModule {}
