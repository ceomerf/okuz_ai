import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProfilerMiddleware } from '../prisma/query-profiler.middleware';
import { QueryTracingService } from '../prisma/query-tracing.service';
import { QueryBenchmarkService } from './query-benchmark.service';

export interface PerformanceMetrics {
  timestamp: Date;
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  nPlusOneQueries: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface PerformanceAlert {
  type: 'slow_query' | 'n_plus_one' | 'high_memory' | 'high_cpu';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  data: any;
}

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private readonly alertThresholds = {
    slowQuery: 100, // ms
    nPlusOneQueries: 5,
    memoryUsage: 0.8, // 80%
    cpuUsage: 0.8, // 80%
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly queryProfiler: QueryProfilerMiddleware,
    private readonly queryTracing: QueryTracingService,
    private readonly benchmarkService: QueryBenchmarkService,
  ) {}

  /**
   * Performance metriklerini topla
   */
  async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const timestamp = new Date();
    
    // Query profiler'dan metrikleri al
    const queryProfile = this.queryProfiler.getQueryProfile();
    const slowQueries = this.queryProfiler.getSlowQueries(this.alertThresholds.slowQuery);
    const nPlusOne = this.queryProfiler.detectNPlusOneQueries();
    
    // Sistem kaynaklarını al
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp,
      totalQueries: queryProfile.totalQueries,
      averageQueryTime: queryProfile.averageDuration,
      slowQueries: slowQueries.length,
      nPlusOneQueries: nPlusOne.queries.length,
      memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal,
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
    };
  }

  /**
   * Performance alertlerini kontrol et
   */
  async checkPerformanceAlerts(): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];
    const metrics = await this.collectPerformanceMetrics();
    
    // Slow query alert
    if (metrics.slowQueries > 0) {
      alerts.push({
        type: 'slow_query',
        message: `${metrics.slowQueries} slow queries detected`,
        severity: metrics.slowQueries > 10 ? 'high' : 'medium',
        timestamp: new Date(),
        data: { slowQueries: metrics.slowQueries },
      });
    }
    
    // N+1 query alert
    if (metrics.nPlusOneQueries > 0) {
      alerts.push({
        type: 'n_plus_one',
        message: `${metrics.nPlusOneQueries} N+1 queries detected`,
        severity: metrics.nPlusOneQueries > this.alertThresholds.nPlusOneQueries ? 'high' : 'medium',
        timestamp: new Date(),
        data: { nPlusOneQueries: metrics.nPlusOneQueries },
      });
    }
    
    // High memory alert
    if (metrics.memoryUsage > this.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'high_memory',
        message: `High memory usage: ${(metrics.memoryUsage * 100).toFixed(2)}%`,
        severity: metrics.memoryUsage > 0.9 ? 'critical' : 'high',
        timestamp: new Date(),
        data: { memoryUsage: metrics.memoryUsage },
      });
    }
    
    // High CPU alert
    if (metrics.cpuUsage > this.alertThresholds.cpuUsage) {
      alerts.push({
        type: 'high_cpu',
        message: `High CPU usage: ${(metrics.cpuUsage * 100).toFixed(2)}%`,
        severity: metrics.cpuUsage > 0.9 ? 'critical' : 'high',
        timestamp: new Date(),
        data: { cpuUsage: metrics.cpuUsage },
      });
    }
    
    return alerts;
  }

  /**
   * Performance dashboard verilerini getir
   */
  async getPerformanceDashboard(): Promise<{
    metrics: PerformanceMetrics;
    alerts: PerformanceAlert[];
    queryProfile: any;
    modelStatistics: any;
    recommendations: string[];
  }> {
    const metrics = await this.collectPerformanceMetrics();
    const alerts = await this.checkPerformanceAlerts();
    const queryProfile = this.queryProfiler.getQueryProfile();
    const modelStatistics = this.queryProfiler.getModelStatistics();
    const recommendations = this.generateRecommendations(metrics, queryProfile);
    
    return {
      metrics,
      alerts,
      queryProfile,
      modelStatistics,
      recommendations,
    };
  }

  /**
   * Performance önerileri oluştur
   */
  private generateRecommendations(metrics: PerformanceMetrics, queryProfile: any): string[] {
    const recommendations: string[] = [];
    
    // Slow query önerileri
    if (metrics.slowQueries > 0) {
      recommendations.push('Consider adding database indexes for frequently queried fields');
      recommendations.push('Review and optimize slow queries using EXPLAIN ANALYZE');
    }
    
    // N+1 query önerileri
    if (metrics.nPlusOneQueries > 0) {
      recommendations.push('Use optimized query services to reduce N+1 queries');
      recommendations.push('Consider implementing batch loading for related data');
    }
    
    // Memory önerileri
    if (metrics.memoryUsage > 0.7) {
      recommendations.push('Consider implementing query result caching');
      recommendations.push('Review memory usage patterns and optimize data structures');
    }
    
    // Query count önerileri
    if (queryProfile.totalQueries > 100) {
      recommendations.push('Consider implementing query batching');
      recommendations.push('Review query patterns and consolidate similar queries');
    }
    
    return recommendations;
  }

  /**
   * Performance trend analizi
   */
  async analyzePerformanceTrends(days: number = 7): Promise<{
    trend: 'improving' | 'declining' | 'stable';
    averageQueryTime: number;
    averageMemoryUsage: number;
    queryCountTrend: number;
  }> {
    // Bu fonksiyon gerçek implementasyonda historical data kullanacak
    // Şimdilik mock data döndürüyoruz
    
    const mockTrends = {
      trend: 'improving' as const,
      averageQueryTime: 45.2,
      averageMemoryUsage: 0.65,
      queryCountTrend: -15.3, // %15 azalma
    };
    
    this.logger.log(`Performance trends analyzed for ${days} days`, mockTrends);
    
    return mockTrends;
  }

  /**
   * Performance benchmark raporu
   */
  async generatePerformanceReport(): Promise<{
    benchmark: any;
    currentMetrics: PerformanceMetrics;
    alerts: PerformanceAlert[];
    recommendations: string[];
  }> {
    this.logger.log('Generating performance report...');
    
    const benchmark = await this.benchmarkService.generateBenchmarkReport();
    const currentMetrics = await this.collectPerformanceMetrics();
    const alerts = await this.checkPerformanceAlerts();
    const recommendations = this.generateRecommendations(currentMetrics, this.queryProfiler.getQueryProfile());
    
    return {
      benchmark,
      currentMetrics,
      alerts,
      recommendations,
    };
  }

  /**
   * Performance metriklerini temizle
   */
  async clearPerformanceMetrics(): Promise<void> {
    this.queryProfiler.clearMetrics();
    this.queryTracing.clearTraceData();
    this.logger.log('Performance metrics cleared');
  }

  /**
   * Performance monitoring'i başlat
   */
  async startPerformanceMonitoring(intervalMs: number = 60000): Promise<void> {
    this.logger.log(`Starting performance monitoring with ${intervalMs}ms interval`);
    
    setInterval(async () => {
      try {
        const metrics = await this.collectPerformanceMetrics();
        const alerts = await this.checkPerformanceAlerts();
        
        if (alerts.length > 0) {
          this.logger.warn(`Performance alerts detected: ${alerts.length}`, alerts);
        }
        
        this.logger.debug('Performance monitoring tick', {
          totalQueries: metrics.totalQueries,
          averageQueryTime: metrics.averageQueryTime,
          slowQueries: metrics.slowQueries,
          nPlusOneQueries: metrics.nPlusOneQueries,
        });
      } catch (error) {
        this.logger.error('Performance monitoring error', error);
      }
    }, intervalMs);
  }
}
