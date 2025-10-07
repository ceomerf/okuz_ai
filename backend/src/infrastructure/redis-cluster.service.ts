import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redis, { Cluster } from 'ioredis';

export interface RedisNode {
  id: string;
  host: string;
  port: number;
  role: 'master' | 'slave' | 'sentinel';
  status: 'online' | 'offline' | 'loading';
  memory: {
    used: number;
    peak: number;
    available: number;
  };
  connections: {
    current: number;
    max: number;
  };
  performance: {
    opsPerSecond: number;
    hitRate: number;
    missRate: number;
    evicted: number;
  };
  replication: {
    masterId?: string;
    slaveCount: number;
    lag: number;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    lastCheck: Date;
    errorRate: number;
  };
  metadata: Record<string, any>;
}

export interface RedisCluster {
  id: string;
  name: string;
  nodes: RedisNode[];
  shards: number;
  replicationFactor: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  capacity: {
    maxMemory: number;
    usedMemory: number;
    maxConnections: number;
    currentConnections: number;
  };
  performance: {
    throughput: number;
    latency: {
      p50: number;
      p95: number;
      p99: number;
    };
    hitRate: number;
    missRate: number;
  };
  metadata: Record<string, any>;
}

export interface RedisShard {
  id: string;
  nodes: RedisNode[];
  hashRange: {
    start: number;
    end: number;
  };
  status: 'healthy' | 'degraded' | 'unhealthy';
  capacity: {
    maxMemory: number;
    usedMemory: number;
    maxConnections: number;
    currentConnections: number;
  };
  performance: {
    throughput: number;
    latency: number;
    hitRate: number;
    missRate: number;
  };
}

export interface RedisOperation {
  id: string;
  type: 'get' | 'set' | 'del' | 'exists' | 'expire' | 'ttl';
  key: string;
  value?: any;
  ttl?: number;
  shardId: string;
  nodeId: string;
  timestamp: Date;
  duration: number;
  success: boolean;
  error?: string;
}

@Injectable()
export class RedisClusterService implements OnModuleInit {
  private readonly logger = new Logger(RedisClusterService.name);
  private clusterClient: Cluster | null = null;
  private readonly clusters: Map<string, RedisCluster> = new Map();
  private readonly shards: Map<string, RedisShard> = new Map();
  private readonly connections: Map<string, Redis> = new Map();
  private readonly operations: RedisOperation[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    try {
      const clusterNodesEnv = this.configService.get<string>('REDIS_CLUSTER_NODES');
      if (clusterNodesEnv) {
        const nodes = clusterNodesEnv.split(',').map((e) => {
          const [host, portStr] = e.trim().split(':');
          return { host, port: Number(portStr || 6379) };
        });
        this.clusterClient = new Redis.Cluster(nodes, {
          scaleReads: 'slave',
          redisOptions: {
            lazyConnect: true,
            tls: this.configService.get<string>('NODE_ENV') === 'production' ? ({} as any) : undefined,
          },
        } as any);
        await this.clusterClient.connect();
        this.logger.log(`Connected to Redis Cluster with ${nodes.length} nodes`);
      } else {
        await this.initializeClusters();
      }
    } catch (error) {
      this.logger.error(`Redis initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    this.logger.log('RedisClusterService initialized');
  }

  /**
   * Redis cluster'ları başlat
   */
  private async initializeClusters(): Promise<void> {
    try {
      const clusterConfigs = this.configService.get<RedisCluster[]>('REDIS_CLUSTERS', []);
      
      for (const config of clusterConfigs) {
        await this.addCluster(config);
      }
      
      this.logger.log(`Initialized ${this.clusters.size} Redis clusters`);
    } catch (error) {
      this.logger.error(`Failed to initialize Redis clusters: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cluster ekle
   */
  async addCluster(config: RedisCluster): Promise<void> {
    try {
      // Cluster bağlantılarını test et
      const isHealthy = await this.testClusterHealth(config);
      
      if (!isHealthy) {
        throw new Error(`Cluster ${config.id} is not healthy`);
      }
      
      this.clusters.set(config.id, config);
      
      // Shard'ları oluştur
      await this.createShards(config);
      
      // Event emit
      this.eventEmitter.emit('redis.cluster.added', {
        clusterId: config.id,
        config,
        timestamp: new Date(),
      });
      
      this.logger.log(`Redis cluster ${config.id} added successfully`);
    } catch (error) {
      this.logger.error(`Failed to add Redis cluster ${config.id}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Cluster kaldır
   */
  async removeCluster(clusterId: string): Promise<void> {
    try {
      const cluster = this.clusters.get(clusterId);
      
      if (!cluster) {
        throw new Error(`Cluster ${clusterId} not found`);
      }
      
      // Cluster'daki tüm bağlantıları kapat
      for (const node of cluster.nodes) {
        const connection = this.connections.get(node.id);
        if (connection) {
          await connection.quit();
          this.connections.delete(node.id);
        }
      }
      
      // Shard'ları kaldır
      for (const shard of this.shards.values()) {
        if (shard.nodes.some(n => cluster.nodes.includes(n))) {
          this.shards.delete(shard.id);
        }
      }
      
      this.clusters.delete(clusterId);
      
      // Event emit
      this.eventEmitter.emit('redis.cluster.removed', {
        clusterId,
        timestamp: new Date(),
      });
      
      this.logger.log(`Redis cluster ${clusterId} removed successfully`);
    } catch (error) {
      this.logger.error(`Failed to remove Redis cluster ${clusterId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Shard'ları oluştur
   */
  private async createShards(cluster: RedisCluster): Promise<void> {
    try {
      const shardCount = cluster.shards;
      const nodesPerShard = Math.ceil(cluster.nodes.length / shardCount);
      
      for (let i = 0; i < shardCount; i++) {
        const startIndex = i * nodesPerShard;
        const endIndex = Math.min(startIndex + nodesPerShard, cluster.nodes.length);
        const shardNodes = cluster.nodes.slice(startIndex, endIndex);
        
        const shard: RedisShard = {
          id: `shard_${cluster.id}_${i}`,
          nodes: shardNodes,
          hashRange: {
            start: i * (Math.floor(2 ** 32 / shardCount)),
            end: (i + 1) * (Math.floor(2 ** 32 / shardCount)) - 1,
          },
          status: 'healthy',
          capacity: {
            maxMemory: 0,
            usedMemory: 0,
            maxConnections: 0,
            currentConnections: 0,
          },
          performance: {
            throughput: 0,
            latency: 0,
            hitRate: 0,
            missRate: 0,
          },
        };
        
        this.shards.set(shard.id, shard);
      }
      
      this.logger.log(`Created ${shardCount} shards for cluster ${cluster.id}`);
    } catch (error) {
      this.logger.error(`Failed to create shards for cluster ${cluster.id}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Key için shard belirle
   */
  private getShardForKey(key: string): RedisShard {
    const hash = this.hashKey(key);
    const shardCount = this.shards.size;
    
    if (shardCount === 0) {
      throw new Error('No Redis shards available');
    }
    
    const shardIndex = hash % shardCount;
    const shardId = Array.from(this.shards.keys())[shardIndex];
    return this.shards.get(shardId)!;
  }

  /**
   * Key hash'leme
   */
  private hashKey(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Shard için node belirle
   */
  private getNodeForShard(shard: RedisShard): RedisNode {
    // Master node'u seç
    const masterNodes = shard.nodes.filter(n => n.role === 'master' && n.status === 'online');
    
    if (masterNodes.length === 0) {
      throw new Error(`No master nodes available for shard ${shard.id}`);
    }
    
    // En az yük altındaki master node'u seç
    return masterNodes.reduce((min, node) => 
      node.connections.current < min.connections.current ? node : min
    );
  }

  /**
   * Redis bağlantısı al
   */
  private async getConnection(node: RedisNode): Promise<Redis> {
    let connection = this.connections.get(node.id);
    
    if (!connection) {
      connection = new Redis({
        host: node.host,
        port: node.port,
        lazyConnect: true,
      } as any);
      
      this.connections.set(node.id, connection);
    }
    
    if (!connection.status || connection.status === 'end') {
      await connection.connect();
    }
    
    return connection;
  }

  /**
   * Key-value işlemleri
   */
  async get(key: string): Promise<string | null> {
    const startTime = Date.now();
    
    try {
      let value: string | null;
      if (this.clusterClient) {
        value = await this.clusterClient.get(key);
      } else {
        const shard = this.getShardForKey(key);
        const node = this.getNodeForShard(shard);
        const connection = await this.getConnection(node);
        value = await connection.get(key);
      }
      
      // Operation log
      const shardId = this.clusterClient ? 'cluster' : this.getShardForKey(key).id;
      const nodeId = this.clusterClient ? 'cluster' : this.getNodeForShard(this.getShardForKey(key)).id;
      this.logOperation({
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'get',
        key,
        shardId,
        nodeId,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: true,
      });
      
      return value;
    } catch (error) {
      this.logger.error(`Failed to get key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Operation log
      this.logOperation({
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'get',
        key,
        shardId: '',
        nodeId: '',
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      if (this.clusterClient) {
        if (ttl) {
          await this.clusterClient.setex(key, ttl, value);
        } else {
          await this.clusterClient.set(key, value);
        }
      } else {
        const shard = this.getShardForKey(key);
        const node = this.getNodeForShard(shard);
        const connection = await this.getConnection(node);
        if (ttl) {
          await connection.setex(key, ttl, value);
        } else {
          await connection.set(key, value);
        }
      }
      
      // Operation log
      const shardId = this.clusterClient ? 'cluster' : this.getShardForKey(key).id;
      const nodeId = this.clusterClient ? 'cluster' : this.getNodeForShard(this.getShardForKey(key)).id;
      this.logOperation({
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'set',
        key,
        value,
        ttl,
        shardId,
        nodeId,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: true,
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to set key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Operation log
      this.logOperation({
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'set',
        key,
        value,
        ttl,
        shardId: '',
        nodeId: '',
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const result = this.clusterClient 
        ? await this.clusterClient.del(key)
        : await (await this.getConnection(this.getNodeForShard(this.getShardForKey(key))))
            .del(key);
      
      // Operation log
      const shardId = this.clusterClient ? 'cluster' : this.getShardForKey(key).id;
      const nodeId = this.clusterClient ? 'cluster' : this.getNodeForShard(this.getShardForKey(key)).id;
      this.logOperation({
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'del',
        key,
        shardId,
        nodeId,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: true,
      });
      
      return result > 0;
    } catch (error) {
      this.logger.error(`Failed to delete key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Operation log
      this.logOperation({
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'del',
        key,
        shardId: '',
        nodeId: '',
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const result = this.clusterClient 
        ? await this.clusterClient.exists(key)
        : await (await this.getConnection(this.getNodeForShard(this.getShardForKey(key))))
            .exists(key);
      
      // Operation log
      const shardId = this.clusterClient ? 'cluster' : this.getShardForKey(key).id;
      const nodeId = this.clusterClient ? 'cluster' : this.getNodeForShard(this.getShardForKey(key)).id;
      this.logOperation({
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'exists',
        key,
        shardId,
        nodeId,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: true,
      });
      
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Operation log
      this.logOperation({
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'exists',
        key,
        shardId: '',
        nodeId: '',
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const result = this.clusterClient 
        ? await this.clusterClient.expire(key, ttl)
        : await (await this.getConnection(this.getNodeForShard(this.getShardForKey(key))))
            .expire(key, ttl);
      
      // Operation log
      const shardId = this.clusterClient ? 'cluster' : this.getShardForKey(key).id;
      const nodeId = this.clusterClient ? 'cluster' : this.getNodeForShard(this.getShardForKey(key)).id;
      this.logOperation({
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'expire',
        key,
        ttl,
        shardId,
        nodeId,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: true,
      });
      
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to set expiration for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Operation log
      this.logOperation({
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'expire',
        key,
        ttl,
        shardId: '',
        nodeId: '',
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    const startTime = Date.now();
    
    try {
      const result = this.clusterClient 
        ? await this.clusterClient.ttl(key)
        : await (await this.getConnection(this.getNodeForShard(this.getShardForKey(key))))
            .ttl(key);
      
      // Operation log
      const shardId = this.clusterClient ? 'cluster' : this.getShardForKey(key).id;
      const nodeId = this.clusterClient ? 'cluster' : this.getNodeForShard(this.getShardForKey(key)).id;
      this.logOperation({
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'ttl',
        key,
        shardId,
        nodeId,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: true,
      });
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to get TTL for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Operation log
      this.logOperation({
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'ttl',
        key,
        shardId: '',
        nodeId: '',
        timestamp: new Date(),
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      return -1;
    }
  }

  /**
   * Cluster sağlık kontrolü
   */
  private async testClusterHealth(cluster: RedisCluster): Promise<boolean> {
    try {
      for (const node of cluster.nodes) {
        const connection = await this.getConnection(node);
        const pong = await connection.ping();
        
        if (pong !== 'PONG') {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Cluster health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Operation log
   */
  private logOperation(operation: RedisOperation): void {
    this.operations.push(operation);
    
    // Son 1000 operation'ı tut
    if (this.operations.length > 1000) {
      this.operations.shift();
    }
  }

  /**
   * Cluster metriklerini topla
   */
  async collectClusterMetrics(): Promise<any[]> {
    try {
      const metrics: any[] = [];
      
      for (const [clusterId, cluster] of this.clusters) {
        const clusterMetrics = {
          clusterId,
          timestamp: new Date(),
          nodes: cluster.nodes.length,
          shards: cluster.shards,
          status: cluster.status,
          capacity: cluster.capacity,
          performance: cluster.performance,
        };
        
        metrics.push(clusterMetrics);
      }
      
      return metrics;
    } catch (error) {
      this.logger.error(`Failed to collect cluster metrics: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Shard rebalancing
   */
  async rebalanceShards(): Promise<void> {
    try {
      // Yüksek yük altındaki shard'ları tespit et
      const overloadedShards = Array.from(this.shards.values())
        .filter(shard => shard.performance.throughput > 1000); // Threshold
      
      if (overloadedShards.length === 0) {
        this.logger.log('No shard rebalancing needed');
        return;
      }
      
      // Rebalancing işlemini başlat
      for (const shard of overloadedShards) {
        await this.rebalanceShard(shard);
      }
      
      this.logger.log(`Rebalanced ${overloadedShards.length} shards`);
    } catch (error) {
      this.logger.error(`Failed to rebalance shards: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Shard rebalancing
   */
  private async rebalanceShard(shard: RedisShard): Promise<void> {
    try {
      // Shard'daki yükü diğer shard'lara dağıt
      // Burada gerçek rebalancing algoritması uygulanacak
      
      this.logger.log(`Rebalanced shard ${shard.id}`);
    } catch (error) {
      this.logger.error(`Failed to rebalance shard ${shard.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Günlük shard rebalancing cron job
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async dailyShardRebalancing(): Promise<void> {
    try {
      await this.rebalanceShards();
      this.logger.log('Daily shard rebalancing completed');
    } catch (error) {
      this.logger.error(`Daily shard rebalancing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cluster sağlık kontrolü cron job
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async clusterHealthCheck(): Promise<void> {
    try {
      for (const [clusterId, cluster] of this.clusters) {
        const isHealthy = await this.testClusterHealth(cluster);
        
        if (!isHealthy) {
          cluster.status = 'unhealthy';
          this.logger.warn(`Cluster ${clusterId} is unhealthy`);
        } else {
          cluster.status = 'healthy';
        }
      }
    } catch (error) {
      this.logger.error(`Cluster health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Health check
   */
  getHealthStatus(): { status: 'healthy' | 'unhealthy'; clusters: number; shards: number } {
    const totalClusters = this.clusters.size;
    const totalShards = this.shards.size;
    const healthyClusters = Array.from(this.clusters.values()).filter(c => c.status === 'healthy').length;
    
    return {
      status: healthyClusters > 0 ? 'healthy' : 'unhealthy',
      clusters: totalClusters,
      shards: totalShards,
    };
  }
}
