import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryBenchmarkService } from './query-benchmark.service';

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  timestamp: Date;
}

export interface DatabaseMetrics {
  connectionCount: number;
  queryCount: number;
  slowQueries: number;
  averageQueryTime: number;
  cacheHitRate: number;
}

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBenchmark: QueryBenchmarkService,
  ) {}

  async collectMetrics(): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    
    try {
      // Basic performance metrics
      const cpuUsage = process.cpuUsage();
      const memoryUsage = process.memoryUsage();
      
      // Simple database health check
      await this.prisma.user.count();
      
      const responseTime = Date.now() - startTime;
      
      const metrics: PerformanceMetrics = {
        cpuUsage: cpuUsage.user / 1000000, // Convert to seconds
        memoryUsage: memoryUsage.heapUsed / 1024 / 1024, // Convert to MB
        responseTime,
        throughput: 1, // Simplified
        errorRate: 0, // Simplified
        timestamp: new Date(),
      };

      this.addMetric(metrics);
      return metrics;
    } catch (error) {
      this.logger.error('Failed to collect metrics:', error);
      throw error;
    }
  }

  async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      // Simplified database metrics
      const userCount = await this.prisma.user.count();
      
      return {
        connectionCount: 1, // Simplified
        queryCount: userCount,
        slowQueries: 0, // Simplified
        averageQueryTime: 10, // Simplified
        cacheHitRate: 0.95, // Simplified
      };
    } catch (error) {
      this.logger.error('Failed to get database metrics:', error);
      throw error;
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  async clearMetrics(): Promise<void> {
    this.metrics = [];
    this.logger.log('Performance metrics cleared');
  }

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    metrics: PerformanceMetrics | null;
    issues: string[];
  }> {
    const latestMetrics = this.getLatestMetrics();
    const issues: string[] = [];

    if (!latestMetrics) {
      return {
        status: 'critical',
        metrics: null,
        issues: ['No metrics available'],
      };
    }

    if (latestMetrics.responseTime > 5000) {
      issues.push('High response time');
    }

    if (latestMetrics.memoryUsage > 1000) {
      issues.push('High memory usage');
    }

    if (latestMetrics.errorRate > 0.1) {
      issues.push('High error rate');
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (issues.length > 2) {
      status = 'critical';
    } else if (issues.length > 0) {
      status = 'warning';
    }

    return {
      status,
      metrics: latestMetrics,
      issues,
    };
  }
}