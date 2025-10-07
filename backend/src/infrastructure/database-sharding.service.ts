import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface ShardConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  maxConnections: number;
  isActive: boolean;
  region: string;
  zone: string;
  capacity: {
    maxUsers: number;
    currentUsers: number;
    maxConnections: number;
    currentConnections: number;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    lastCheck: Date;
    errorRate: number;
  };
  metadata: Record<string, any>;
}

export interface ShardingStrategy {
  type: 'horizontal' | 'vertical' | 'functional' | 'geographic';
  shardKey: string;
  shardFunction: 'hash' | 'range' | 'consistent_hash' | 'directory';
  shardCount: number;
  replicationFactor: number;
  rebalancingThreshold: number;
  migrationStrategy: 'online' | 'offline' | 'hybrid';
}

export interface ShardMapping {
  userId: string;
  shardId: string;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  metadata: Record<string, any>;
}

export interface ShardMetrics {
  shardId: string;
  timestamp: Date;
  connections: number;
  queries: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  capacity: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}

@Injectable()
export class DatabaseShardingService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseShardingService.name);
  private readonly shards: Map<string, ShardConfig> = new Map();
  private readonly shardingStrategy: ShardingStrategy;
  private readonly shardMappings: Map<string, ShardMapping> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.shardingStrategy = {
      type: 'horizontal',
      shardKey: 'userId',
      shardFunction: 'consistent_hash',
      shardCount: this.configService.get<number>('SHARD_COUNT', 8),
      replicationFactor: this.configService.get<number>('REPLICATION_FACTOR', 2),
      rebalancingThreshold: this.configService.get<number>('REBALANCING_THRESHOLD', 0.8),
      migrationStrategy: 'online',
    };
  }

  async onModuleInit() {
    await this.initializeShards();
    this.logger.log('DatabaseShardingService initialized');
  }

  /**
   * Shard'ları başlat
   */
  private async initializeShards(): Promise<void> {
    try {
      const shardConfigs = this.configService.get<ShardConfig[]>('DATABASE_SHARDS', []);
      
      for (const config of shardConfigs) {
        await this.addShard(config);
      }
      
      this.logger.log(`Initialized ${this.shards.size} database shards`);
    } catch (error) {
      this.logger.error(`Failed to initialize shards: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Shard ekle
   */
  async addShard(config: ShardConfig): Promise<void> {
    try {
      // Shard bağlantısını test et
      const isHealthy = await this.testShardConnection(config);
      
      if (!isHealthy) {
        throw new Error(`Shard ${config.id} is not healthy`);
      }
      
      this.shards.set(config.id, config);
      
      // Event emit
      this.eventEmitter.emit('shard.added', {
        shardId: config.id,
        config,
        timestamp: new Date(),
      });
      
      this.logger.log(`Shard ${config.id} added successfully`);
    } catch (error) {
      this.logger.error(`Failed to add shard ${config.id}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Shard kaldır
   */
  async removeShard(shardId: string): Promise<void> {
    try {
      const shard = this.shards.get(shardId);
      
      if (!shard) {
        throw new Error(`Shard ${shardId} not found`);
      }
      
      // Shard'ı devre dışı bırak
      shard.isActive = false;
      
      // Kullanıcıları diğer shard'lara taşı
      await this.migrateUsersFromShard(shardId);
      
      this.shards.delete(shardId);
      
      // Event emit
      this.eventEmitter.emit('shard.removed', {
        shardId,
        timestamp: new Date(),
      });
      
      this.logger.log(`Shard ${shardId} removed successfully`);
    } catch (error) {
      this.logger.error(`Failed to remove shard ${shardId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Kullanıcı için shard belirle
   */
  async getShardForUser(userId: string): Promise<string> {
    try {
      // Cache'den kontrol et
      const cachedShard = await this.cache.get<string>(`shard:${userId}`);
      if (cachedShard) {
        return String(cachedShard);
      }
      
      // Shard mapping'den kontrol et
      const mapping = this.shardMappings.get(userId);
      if (mapping) {
        await this.cache.set(`shard:${userId}`, mapping.shardId, 3600);
        return mapping.shardId;
      }
      
      // Yeni shard belirle
      const shardId = this.determineShard(userId);
      
      // Shard mapping oluştur
      const shardMapping: ShardMapping = {
        userId,
        shardId,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 1,
        metadata: {},
      };
      
      this.shardMappings.set(userId, shardMapping);
      await this.cache.set(`shard:${userId}`, shardId, 3600);
      
      // Event emit
      this.eventEmitter.emit('shard.assigned', {
        userId,
        shardId,
        timestamp: new Date(),
      });
      
      return shardId;
    } catch (error) {
      this.logger.error(`Failed to get shard for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Shard belirleme algoritması
   */
  private determineShard(userId: string): string {
    const shardCount = this.shards.size;
    
    if (shardCount === 0) {
      throw new Error('No shards available');
    }
    
    switch (this.shardingStrategy.shardFunction) {
      case 'hash':
        return this.hashShard(userId, shardCount);
      case 'range':
        return this.rangeShard(userId, shardCount);
      case 'consistent_hash':
        return this.consistentHashShard(userId, shardCount);
      case 'directory':
        return this.directoryShard(userId, shardCount);
      default:
        return this.hashShard(userId, shardCount);
    }
  }

  /**
   * Hash tabanlı shard belirleme
   */
  private hashShard(userId: string, shardCount: number): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer
    }
    
    const shardIndex = Math.abs(hash) % shardCount;
    return Array.from(this.shards.keys())[shardIndex];
  }

  /**
   * Range tabanlı shard belirleme
   */
  private rangeShard(userId: string, shardCount: number): string {
    // Kullanıcı ID'sini sayısal değere çevir
    const numericId = this.stringToNumber(userId);
    const shardIndex = Math.floor(numericId / (Number.MAX_SAFE_INTEGER / shardCount));
    return Array.from(this.shards.keys())[Math.min(shardIndex, shardCount - 1)];
  }

  /**
   * Consistent hash tabanlı shard belirleme
   */
  private consistentHashShard(userId: string, shardCount: number): string {
    const hash = this.consistentHash(userId);
    const shardIndex = hash % shardCount;
    return Array.from(this.shards.keys())[shardIndex];
  }

  /**
   * Directory tabanlı shard belirleme
   */
  private directoryShard(userId: string, shardCount: number): string {
    // Kullanıcı ID'sinin ilk karakterine göre shard belirle
    const firstChar = userId.charAt(0).toLowerCase();
    const charCode = firstChar.charCodeAt(0);
    const shardIndex = charCode % shardCount;
    return Array.from(this.shards.keys())[shardIndex];
  }

  /**
   * Shard bağlantısını test et
   */
  private async testShardConnection(config: ShardConfig): Promise<boolean> {
    try {
      // Shard bağlantısını test et
      const startTime = Date.now();
      
      // Burada gerçek bağlantı testi yapılacak
      // Şimdilik mock response
      const responseTime = Date.now() - startTime;
      
      return responseTime < 1000; // 1 saniye altında
    } catch (error) {
      this.logger.error(`Shard connection test failed for ${config.id}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Shard'dan kullanıcıları taşı
   */
  private async migrateUsersFromShard(shardId: string): Promise<void> {
    try {
      const users = Array.from(this.shardMappings.entries())
        .filter(([_, mapping]) => mapping.shardId === shardId);
      
      for (const [userId, mapping] of users) {
        // Yeni shard belirle
        const newShardId = this.determineShard(userId);
        
        // Kullanıcıyı yeni shard'a taşı
        await this.migrateUser(userId, shardId, newShardId);
        
        // Mapping'i güncelle
        mapping.shardId = newShardId;
        mapping.lastAccessed = new Date();
        
        // Cache'i güncelle
        await this.cache.set(`shard:${userId}`, newShardId, 3600);
      }
      
      this.logger.log(`Migrated ${users.length} users from shard ${shardId}`);
    } catch (error) {
      this.logger.error(`Failed to migrate users from shard ${shardId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Kullanıcıyı shard'lar arası taşı
   */
  private async migrateUser(userId: string, fromShardId: string, toShardId: string): Promise<void> {
    try {
      // Kullanıcı verilerini kaynak shard'dan al
      const userData = await this.getUserDataFromShard(userId, fromShardId);
      
      // Kullanıcı verilerini hedef shard'a yaz
      await this.writeUserDataToShard(userId, userData, toShardId);
      
      // Kaynak shard'dan kullanıcı verilerini sil
      await this.deleteUserDataFromShard(userId, fromShardId);
      
      this.logger.log(`User ${userId} migrated from ${fromShardId} to ${toShardId}`);
    } catch (error) {
      this.logger.error(`Failed to migrate user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Shard'dan kullanıcı verilerini al
   */
  private async getUserDataFromShard(userId: string, shardId: string): Promise<any> {
    try {
      // Burada gerçek veri alma işlemi yapılacak
      // Şimdilik mock data
      return {
        userId,
        data: 'user_data',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get user data from shard ${shardId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Kullanıcı verilerini shard'a yaz
   */
  private async writeUserDataToShard(userId: string, userData: any, shardId: string): Promise<void> {
    try {
      // Burada gerçek veri yazma işlemi yapılacak
      // Şimdilik mock operation
      this.logger.log(`User data written to shard ${shardId}`);
    } catch (error) {
      this.logger.error(`Failed to write user data to shard ${shardId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Shard'dan kullanıcı verilerini sil
   */
  private async deleteUserDataFromShard(userId: string, shardId: string): Promise<void> {
    try {
      // Burada gerçek veri silme işlemi yapılacak
      // Şimdilik mock operation
      this.logger.log(`User data deleted from shard ${shardId}`);
    } catch (error) {
      this.logger.error(`Failed to delete user data from shard ${shardId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Shard metriklerini topla
   */
  async collectShardMetrics(): Promise<ShardMetrics[]> {
    try {
      const metrics: ShardMetrics[] = [];
      
      for (const [shardId, config] of this.shards) {
        const shardMetrics: ShardMetrics = {
          shardId,
          timestamp: new Date(),
          connections: config.capacity.currentConnections,
          queries: 0, // Burada gerçek query sayısı alınacak
          responseTime: config.health.responseTime,
          errorRate: config.health.errorRate,
          throughput: 0, // Burada gerçek throughput hesaplanacak
          latency: {
            p50: 0,
            p95: 0,
            p99: 0,
          },
          capacity: {
            cpu: 0,
            memory: 0,
            disk: 0,
            network: 0,
          },
        };
        
        metrics.push(shardMetrics);
      }
      
      return metrics;
    } catch (error) {
      this.logger.error(`Failed to collect shard metrics: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Shard rebalancing
   */
  async rebalanceShards(): Promise<void> {
    try {
      const metrics = await this.collectShardMetrics();
      
      // Yüksek yük altındaki shard'ları tespit et
      const overloadedShards = metrics.filter(m => m.connections > this.shardingStrategy.rebalancingThreshold);
      
      if (overloadedShards.length === 0) {
        this.logger.log('No shard rebalancing needed');
        return;
      }
      
      // Rebalancing işlemini başlat
      for (const overloadedShard of overloadedShards) {
        await this.rebalanceShard(overloadedShard.shardId);
      }
      
      this.logger.log(`Rebalanced ${overloadedShards.length} shards`);
    } catch (error) {
      this.logger.error(`Failed to rebalance shards: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Shard rebalancing
   */
  private async rebalanceShard(shardId: string): Promise<void> {
    try {
      // Shard'daki kullanıcıları diğer shard'lara dağıt
      const users = Array.from(this.shardMappings.entries())
        .filter(([_, mapping]) => mapping.shardId === shardId);
      
      for (const [userId, mapping] of users) {
        // Yeni shard belirle
        const newShardId = this.determineShard(userId);
        
        if (newShardId !== shardId) {
          // Kullanıcıyı yeni shard'a taşı
          await this.migrateUser(userId, shardId, newShardId);
          
          // Mapping'i güncelle
          mapping.shardId = newShardId;
          mapping.lastAccessed = new Date();
          
          // Cache'i güncelle
          await this.cache.set(`shard:${userId}`, newShardId, 3600);
        }
      }
      
      this.logger.log(`Rebalanced shard ${shardId}`);
    } catch (error) {
      this.logger.error(`Failed to rebalance shard ${shardId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Yardımcı metodlar
   */
  private stringToNumber(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer
    }
    return Math.abs(hash);
  }

  private consistentHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Günlük shard rebalancing cron job
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyShardRebalancing(): Promise<void> {
    try {
      await this.rebalanceShards();
      this.logger.log('Daily shard rebalancing completed');
    } catch (error) {
      this.logger.error(`Daily shard rebalancing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Shard sağlık kontrolü cron job
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async shardHealthCheck(): Promise<void> {
    try {
      for (const [shardId, config] of this.shards) {
        const isHealthy = await this.testShardConnection(config);
        
        if (!isHealthy) {
          config.health.status = 'unhealthy';
          this.logger.warn(`Shard ${shardId} is unhealthy`);
        } else {
          config.health.status = 'healthy';
        }
        
        config.health.lastCheck = new Date();
      }
    } catch (error) {
      this.logger.error(`Shard health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Health check
   */
  getHealthStatus(): { status: 'healthy' | 'unhealthy'; shards: number; activeShards: number } {
    const totalShards = this.shards.size;
    const activeShards = Array.from(this.shards.values()).filter(s => s.isActive).length;
    
    return {
      status: activeShards > 0 ? 'healthy' : 'unhealthy',
      shards: totalShards,
      activeShards,
    };
  }
}
