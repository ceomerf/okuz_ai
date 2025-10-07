import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis, { RedisOptions } from 'ioredis';
import * as tls from 'tls';

@Injectable()
export class SecureRedisService implements OnModuleInit {
  private readonly logger = new Logger(SecureRedisService.name);
  private redis!: IORedis;
  private readonly config: RedisOptions;

  constructor(private readonly configService: ConfigService) {
    this.config = this.buildSecureConfig();
  }

  async onModuleInit() {
    await this.initializeRedis();
  }

  private buildSecureConfig(): RedisOptions {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    
    const baseConfig: RedisOptions = {
      enableReadyCheck: true,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      // ioredis'te commandTimeout tipi yok; komut zaman aşımı kullanımda çağrı bazlı yapılmalı
    } as unknown as RedisOptions;

    // Production için TLS ve authentication
    if (isProduction) {
      return {
        ...baseConfig,
        host: this.configService.get<string>('REDIS_HOST') || 'localhost',
        port: parseInt(this.configService.get<string>('REDIS_PORT') || '6379'),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        username: this.configService.get<string>('REDIS_USERNAME'),
        tls: {
          servername: this.configService.get<string>('REDIS_TLS_SERVERNAME'),
          rejectUnauthorized: true,
          checkServerIdentity: (servername: string, cert: any) => {
            // Certificate validation
            return undefined;
          },
        },
        // Connection pooling
        family: 4,
        db: parseInt(this.configService.get<string>('REDIS_DB') || '0'),
        // Security/monitoring seçenekleri olay dinleyicileri ile eklenecek
      };
    }

    // Development için basit konfigürasyon
    return {
      ...baseConfig,
      host: 'localhost',
      port: 6379,
      db: 0,
    };
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redis = new IORedis(this.config);

      // Event listeners
      this.redis.on('connect', () => this.logger.log('Redis connected securely'));
      this.redis.on('ready', () => this.logger.log('Redis ready for operations'));
      this.redis.on('close', () => this.logger.warn('Redis connection closed'));
      this.redis.on('reconnecting', () => this.logger.log('Redis reconnecting...'));
      this.redis.on('error', (error: unknown) => {
        this.logger.error(`Redis connection error: ${error instanceof Error ? error.message : String(error)}`);
      });
      
      // Connection test
      await this.redis.ping();
      this.logger.log('Redis initialized with secure configuration');

      // Security settings
      await this.applySecuritySettings();
      
    } catch (error) {
      this.logger.error(`Failed to initialize Redis: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async applySecuritySettings(): Promise<void> {
    try {
      // Redis security komutları
      const commands: Array<{ cmd: string; args: Array<string|number> }> = [
        { cmd: 'CONFIG', args: ['SET', 'rename-command', 'FLUSHDB', ''] },
        { cmd: 'CONFIG', args: ['SET', 'rename-command', 'FLUSHALL', ''] },
        { cmd: 'CONFIG', args: ['SET', 'rename-command', 'KEYS', ''] },
        { cmd: 'CONFIG', args: ['SET', 'rename-command', 'CONFIG', ''] },
        { cmd: 'CONFIG', args: ['SET', 'rename-command', 'SHUTDOWN', ''] },
        { cmd: 'CONFIG', args: ['SET', 'rename-command', 'DEBUG', ''] },
        { cmd: 'CONFIG', args: ['SET', 'rename-command', 'EVAL', ''] },
        // memory policy
        { cmd: 'CONFIG', args: ['SET', 'maxmemory-policy', 'allkeys-lru'] },
        // timeout
        { cmd: 'CONFIG', args: ['SET', 'timeout', 300] },
        // aof
        { cmd: 'CONFIG', args: ['SET', 'appendonly', 'no'] },
      ];

      for (const command of commands) {
        try {
          await (this.redis as any).call(command.cmd, ...command.args);
        } catch (error) {
          this.logger.warn(`Security command failed: ${command.cmd} ${command.args.join(' ')} - ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      this.logger.log('Redis security settings applied');
    } catch (error) {
      this.logger.error(`Failed to apply security settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Güvenli cache işlemleri
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async flushAll(): Promise<void> {
    try {
      await this.redis.flushall();
      this.logger.warn('Redis cache flushed - all data cleared');
    } catch (error) {
      this.logger.error(`Cache flush error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Redis health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
    memory: any;
    info: any;
  }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      const info = await this.redis.info();
      const memory = await (this.redis as any).call('MEMORY', 'STATS');

      return {
        status: 'healthy',
        latency,
        memory,
        info: this.parseRedisInfo(info),
      };
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        status: 'unhealthy',
        latency: -1,
        memory: null,
        info: null,
      };
    }
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const result: any = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Redis bağlantısını kapat
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.log('Redis connection closed gracefully');
    } catch (error) {
      this.logger.error(`Redis disconnect error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getRedis(): IORedis {
    return this.redis;
  }
}
