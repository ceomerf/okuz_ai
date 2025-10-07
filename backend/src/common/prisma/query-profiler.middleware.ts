import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  model: string;
  operation: string;
  params: any;
  resultCount?: number;
}

export interface QueryProfile {
  totalQueries: number;
  totalDuration: number;
  averageDuration: number;
  slowestQuery: QueryMetrics | null;
  queriesByModel: Record<string, number>;
  queriesByOperation: Record<string, number>;
  nPlusOneDetected: boolean;
  nPlusOneQueries: string[];
}

@Injectable()
export class QueryProfilerMiddleware {
  private readonly logger = new Logger(QueryProfilerMiddleware.name);
  private queryMetrics: QueryMetrics[] = [];
  private readonly maxQueries = 1000; // Son 1000 sorguyu tut
  private readonly slowQueryThreshold = 100; // 100ms üzeri yavaş sorgu

  constructor(private readonly configService: ConfigService) {}

  /**
   * Prisma middleware'i oluştur
   */
  createMiddleware() {
    return async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
      const startTime = Date.now();
      const query = this.formatQuery(params);
      
      try {
        const result = await next(params);
        const duration = Date.now() - startTime;
        
        // Query metrics kaydet
        const metrics: QueryMetrics = {
          query,
          duration,
          timestamp: new Date(),
          model: params.model || 'unknown',
          operation: params.action,
          params: params.args,
          resultCount: Array.isArray(result) ? result.length : (result ? 1 : 0),
        };

        this.recordQuery(metrics);
        
        // Yavaş sorguları logla
        if (duration > this.slowQueryThreshold) {
          this.logger.warn(`Slow query detected: ${duration}ms`, {
            query,
            model: params.model,
            operation: params.action,
            duration,
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.logger.error(`Query failed: ${duration}ms`, {
          query,
          model: params.model,
          operation: params.action,
          error: (error instanceof Error ? error.message : String(error)),
        });
        throw error;
      }
    };
  }

  /**
   * Query'yi formatla
   */
  private formatQuery(params: Prisma.MiddlewareParams): string {
    const { model, action, args } = params;
    return `${model}.${action}(${JSON.stringify(args, null, 2)})`;
  }

  /**
   * Query metrics kaydet
   */
  private recordQuery(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics);
    
    // Eski query'leri temizle
    if (this.queryMetrics.length > this.maxQueries) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxQueries);
    }
  }

  /**
   * N+1 problemlerini tespit et
   */
  detectNPlusOneQueries(): { detected: boolean; queries: string[] } {
    const nPlusOneQueries: string[] = [];
    const queryGroups = new Map<string, QueryMetrics[]>();

    // Query'leri grupla (model + operation)
    this.queryMetrics.forEach(metric => {
      const key = `${metric.model}.${metric.operation}`;
      if (!queryGroups.has(key)) {
        queryGroups.set(key, []);
      }
      queryGroups.get(key)!.push(metric);
    });

    // Her grup için N+1 kontrolü
    queryGroups.forEach((queries, key) => {
      if (queries.length > 5) { // 5'ten fazla aynı query
        const timeSpan = queries[queries.length - 1].timestamp.getTime() - queries[0].timestamp.getTime();
        if (timeSpan < 1000) { // 1 saniye içinde
          nPlusOneQueries.push(`${key} (${queries.length} queries in ${timeSpan}ms)`);
        }
      }
    });

    return {
      detected: nPlusOneQueries.length > 0,
      queries: nPlusOneQueries,
    };
  }

  /**
   * Query profilini oluştur
   */
  getQueryProfile(): QueryProfile {
    if (this.queryMetrics.length === 0) {
      return {
        totalQueries: 0,
        totalDuration: 0,
        averageDuration: 0,
        slowestQuery: null,
        queriesByModel: {},
        queriesByOperation: {},
        nPlusOneDetected: false,
        nPlusOneQueries: [],
      };
    }

    const totalDuration = this.queryMetrics.reduce((sum, q) => sum + q.duration, 0);
    const averageDuration = totalDuration / this.queryMetrics.length;
    
    const slowestQuery = this.queryMetrics.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest
    );

    const queriesByModel: Record<string, number> = {};
    const queriesByOperation: Record<string, number> = {};

    this.queryMetrics.forEach(metric => {
      queriesByModel[metric.model] = (queriesByModel[metric.model] || 0) + 1;
      queriesByOperation[metric.operation] = (queriesByOperation[metric.operation] || 0) + 1;
    });

    const nPlusOne = this.detectNPlusOneQueries();

    return {
      totalQueries: this.queryMetrics.length,
      totalDuration,
      averageDuration,
      slowestQuery,
      queriesByModel,
      queriesByOperation,
      nPlusOneDetected: nPlusOne.detected,
      nPlusOneQueries: nPlusOne.queries,
    };
  }

  /**
   * Yavaş sorguları getir
   */
  getSlowQueries(threshold: number = 100): QueryMetrics[] {
    return this.queryMetrics.filter(q => q.duration > threshold);
  }

  /**
   * Model bazlı query istatistikleri
   */
  getModelStatistics(): Record<string, { count: number; totalDuration: number; averageDuration: number }> {
    const modelStats: Record<string, { count: number; totalDuration: number; averageDuration: number }> = {};

    this.queryMetrics.forEach(metric => {
      if (!modelStats[metric.model]) {
        modelStats[metric.model] = { count: 0, totalDuration: 0, averageDuration: 0 };
      }
      modelStats[metric.model].count++;
      modelStats[metric.model].totalDuration += metric.duration;
    });

    // Ortalama süreleri hesapla
    Object.keys(modelStats).forEach(model => {
      const stats = modelStats[model];
      stats.averageDuration = stats.totalDuration / stats.count;
    });

    return modelStats;
  }

  /**
   * Query metrics'i temizle
   */
  clearMetrics(): void {
    this.queryMetrics = [];
  }

  /**
   * Query metrics'i export et
   */
  exportMetrics(): QueryMetrics[] {
    return [...this.queryMetrics];
  }

  /**
   * Query profilini logla
   */
  logQueryProfile(): void {
    const profile = this.getQueryProfile();
    
    this.logger.log('Query Profile Summary', {
      totalQueries: profile.totalQueries,
      totalDuration: `${profile.totalDuration}ms`,
      averageDuration: `${profile.averageDuration.toFixed(2)}ms`,
      slowestQuery: profile.slowestQuery ? `${profile.slowestQuery.duration}ms` : 'N/A',
      nPlusOneDetected: profile.nPlusOneDetected,
      nPlusOneQueries: profile.nPlusOneQueries,
    });

    // Model istatistikleri
    const modelStats = this.getModelStatistics();
    Object.entries(modelStats).forEach(([model, stats]) => {
      this.logger.log(`Model: ${model}`, {
        count: stats.count,
        totalDuration: `${stats.totalDuration}ms`,
        averageDuration: `${stats.averageDuration.toFixed(2)}ms`,
      });
    });
  }
}
