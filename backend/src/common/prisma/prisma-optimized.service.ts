import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { QueryProfilerMiddleware } from './query-profiler.middleware';
import { QueryTracingService } from './query-tracing.service';
import { OptimizedQueryService } from './optimized-query.service';

@Injectable()
export class PrismaOptimizedService extends PrismaClient implements OnModuleInit {
  private queryProfiler: QueryProfilerMiddleware;
  private queryTracing: QueryTracingService;
  private optimizedQuery: OptimizedQueryService;

  constructor(
    queryProfiler: QueryProfilerMiddleware,
    queryTracing: QueryTracingService,
    optimizedQuery: OptimizedQueryService,
  ) {
    super();
    this.queryProfiler = queryProfiler;
    this.queryTracing = queryTracing;
    this.optimizedQuery = optimizedQuery;
  }

  async onModuleInit() {
    // Swagger üretimi veya test için veritabanı bağlantısını atla
    if (process.env.NODE_ENV === 'test' || process.env.SKIP_DB_CONNECTION === 'true') {
      console.log('Skipping database connection for test environment');
      return;
    }

    try {
      await this.$connect();
      console.log('Database connected successfully');
      
      // Middleware'leri ekle
      this.setupMiddlewares();
    } catch (error) {
      console.error('Database connection failed:', error);
      // Test ortamında hata verme
      if (process.env.NODE_ENV !== 'test') {
        throw error;
      }
    }
  }

  /**
   * Prisma middleware'lerini kur
   */
  private setupMiddlewares(): void {
    // Query profiling middleware
    this.$use(this.queryProfiler.createMiddleware());
    
    // Query tracing middleware
    this.$use(this.queryTracing.createTracingMiddleware());
    
    console.log('Prisma middlewares configured successfully');
  }

  /**
   * Optimized query service'e erişim
   */
  getOptimizedQuery(): OptimizedQueryService {
    return this.optimizedQuery;
  }

  /**
   * Query profiler'a erişim
   */
  getQueryProfiler(): QueryProfilerMiddleware {
    return this.queryProfiler;
  }

  /**
   * Query tracing service'e erişim
   */
  getQueryTracing(): QueryTracingService {
    return this.queryTracing;
  }

  /**
   * N+1 query problemlerini tespit et
   */
  async detectNPlusOneQueries(): Promise<{ detected: boolean; queries: string[] }> {
    return this.queryProfiler.detectNPlusOneQueries();
  }

  /**
   * Query profilini getir
   */
  async getQueryProfile(): Promise<any> {
    return this.queryProfiler.getQueryProfile();
  }

  /**
   * Yavaş sorguları getir
   */
  async getSlowQueries(threshold: number = 100): Promise<any[]> {
    return this.queryProfiler.getSlowQueries(threshold);
  }

  /**
   * Model bazlı istatistikleri getir
   */
  async getModelStatistics(): Promise<Record<string, any>> {
    return this.queryProfiler.getModelStatistics();
  }

  /**
   * Query metrics'i temizle
   */
  async clearQueryMetrics(): Promise<void> {
    this.queryProfiler.clearMetrics();
  }

  /**
   * Query trace data'yı export et
   */
  async exportQueryTraceData(): Promise<any[]> {
    return this.queryTracing.exportTraceData();
  }

  /**
   * Query trace data'yı temizle
   */
  async clearQueryTraceData(): Promise<void> {
    this.queryTracing.clearTraceData();
  }
}
