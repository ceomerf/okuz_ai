import { Injectable } from '@nestjs/common';
import IORedis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly redis: IORedis;

  constructor() {
    this.redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  }

  async get<T = any>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: any, ttlSeconds?: number) {
    const payload = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.redis.set(key, payload, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, payload);
    }
  }

  async del(patternOrKey: string) {
    if (!patternOrKey.includes('*')) {
      await this.redis.del(patternOrKey);
      return;
    }
    const stream = this.redis.scanStream({ match: patternOrKey, count: 200 });
    const keys: string[] = [];
    for await (const chunk of stream) {
      keys.push(...(chunk as string[]));
    }
    if (keys.length) await this.redis.del(keys);
  }
}


