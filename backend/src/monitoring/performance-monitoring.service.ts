import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

export interface PerformanceMetrics {
  timestamp: string;
  system: {
    cpu: {
      usage: number;
      cores: number;
      loadAverage: number[];
    };
    memory: {
      total: number;
      used: number;
      free: number;
      usage: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
      usage: number;
    };
    network: {
      bytesReceived: number;
      bytesSent: number;
      packetsReceived: number;
      packetsSent: number;
    };
  };
  application: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    activeConnections: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  database: {
    connectionCount: number;
    queryTime: number;
    slowQueries: number;
    lockWaitTime: number;
  };
  api: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'cpu' | 'memory' | 'disk' | 'response_time' | 'error_rate' | 'database';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: string;
  resolved: boolean;
}

export interface PerformanceDashboard {
  currentMetrics: PerformanceMetrics;
  alerts: PerformanceAlert[];
  trends: {
    cpu: { timestamp: string; usage: number }[];
    memory: { timestamp: string; usage: number }[];
    responseTime: { timestamp: string; time: number }[];
    errorRate: { timestamp: string; rate: number }[];
  };
  summary: {
    systemHealth: 'healthy' | 'warning' | 'critical';
    uptime: number;
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

@Injectable()
export class PerformanceMonitoringService {
  private readonly logger = new Logger(PerformanceMonitoringService.name);
  private metricsHistory: PerformanceMetrics[] = [];
  private readonly MAX_HISTORY = 1000;

  constructor(private prisma: PrismaService) {}

  async collectMetrics(): Promise<PerformanceMetrics> {
    try {
      const [systemMetrics, applicationMetrics, databaseMetrics, apiMetrics] = await Promise.all([
        this.getSystemMetrics(),
        this.getApplicationMetrics(),
        this.getDatabaseMetrics(),
        this.getApiMetrics(),
      ]);

      const metrics: PerformanceMetrics = {
        timestamp: new Date().toISOString(),
        system: systemMetrics,
        application: applicationMetrics,
        database: databaseMetrics,
        api: apiMetrics,
      };

      // Metrikleri geçmişe ekle
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.MAX_HISTORY) {
        this.metricsHistory.shift();
      }

      // Veritabanına kaydet
      await this.saveMetrics(metrics);

      return metrics;
    } catch (error) {
      this.logger.error('Failed to collect metrics:', error);
      throw error;
    }
  }

  private async getSystemMetrics() {
    try {
      const cpuUsage = await this.getCpuUsage();
      const memoryInfo = this.getMemoryInfo();
      const diskInfo = await this.getDiskInfo();
      const networkInfo = this.getNetworkInfo();

      return {
        cpu: {
          usage: cpuUsage,
          cores: os.cpus().length,
          loadAverage: os.loadavg(),
        },
        memory: memoryInfo,
        disk: diskInfo,
        network: networkInfo,
      };
    } catch (error) {
      this.logger.warn('Could not get system metrics:', error);
      return {
        cpu: { usage: 0, cores: 0, loadAverage: [0, 0, 0] },
        memory: { total: 0, used: 0, free: 0, usage: 0 },
        disk: { total: 0, used: 0, free: 0, usage: 0 },
        network: { bytesReceived: 0, bytesSent: 0, packetsReceived: 0, packetsSent: 0 },
      };
    }
  }

  private async getCpuUsage(): Promise<number> {
    try {
      const { stdout } = await execAsync('top -l 1 -n 0 | grep "CPU usage"');
      const match = stdout.match(/(\d+\.\d+)% user/);
      return match ? parseFloat(match[1]) : 0;
    } catch (error) {
      this.logger.warn('Could not get CPU usage:', error);
      return 0;
    }
  }

  private getMemoryInfo() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usage = (used / total) * 100;

    return {
      total,
      used,
      free,
      usage: Math.round(usage * 100) / 100,
    };
  }

  private async getDiskInfo() {
    try {
      const { stdout } = await execAsync('df -h /');
      const lines = stdout.split('\n');
      const dataLine = lines[1];
      const parts = dataLine.split(/\s+/);
      
      const total = this.parseSize(parts[1]);
      const used = this.parseSize(parts[2]);
      const free = this.parseSize(parts[3]);
      const usage = (used / total) * 100;

      return {
        total,
        used,
        free,
        usage: Math.round(usage * 100) / 100,
      };
    } catch (error) {
      this.logger.warn('Could not get disk info:', error);
      return { total: 0, used: 0, free: 0, usage: 0 };
    }
  }

  private parseSize(sizeStr: string): number {
    const units = { K: 1024, M: 1024 * 1024, G: 1024 * 1024 * 1024, T: 1024 * 1024 * 1024 * 1024 };
    const match = sizeStr.match(/^(\d+\.?\d*)([KMGT])$/);
    if (match) {
      return parseFloat(match[1]) * units[match[2] as keyof typeof units];
    }
    return 0;
  }

  private getNetworkInfo() {
    // Bu değerler gerçek implementasyonda network interface'lerden alınmalı
    return {
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0,
    };
  }

  private async getApplicationMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      return {
        responseTime: 0, // Bu değer middleware'den alınabilir
        throughput: 0, // Bu değer request counter'dan alınabilir
        errorRate: 0, // Bu değer error counter'dan alınabilir
        activeConnections: 0, // Bu değer connection pool'dan alınabilir
        memoryUsage: memoryUsage.heapUsed,
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      };
    } catch (error) {
      this.logger.warn('Could not get application metrics:', error);
      return {
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        activeConnections: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      };
    }
  }

  private async getDatabaseMetrics() {
    try {
      // Database connection count
      const connectionCount = await this.getDatabaseConnectionCount();
      
      // Query performance
      const queryTime = await this.getAverageQueryTime();
      
      // Slow queries
      const slowQueries = await this.getSlowQueriesCount();
      
      // Lock wait time
      const lockWaitTime = await this.getLockWaitTime();

      return {
        connectionCount,
        queryTime,
        slowQueries,
        lockWaitTime,
      };
    } catch (error) {
      this.logger.warn('Could not get database metrics:', error);
      return {
        connectionCount: 0,
        queryTime: 0,
        slowQueries: 0,
        lockWaitTime: 0,
      };
    }
  }

  private async getDatabaseConnectionCount(): Promise<number> {
    try {
      // Bu değer Prisma connection pool'dan alınabilir
      return 0;
    } catch (error) {
      this.logger.warn('Could not get database connection count:', error);
      return 0;
    }
  }

  private async getAverageQueryTime(): Promise<number> {
    try {
      // Bu değer query logs'tan hesaplanabilir
      return 0;
    } catch (error) {
      this.logger.warn('Could not get average query time:', error);
      return 0;
    }
  }

  private async getSlowQueriesCount(): Promise<number> {
    try {
      // Bu değer slow query log'undan alınabilir
      return 0;
    } catch (error) {
      this.logger.warn('Could not get slow queries count:', error);
      return 0;
    }
  }

  private async getLockWaitTime(): Promise<number> {
    try {
      // Bu değer database lock metrics'ten alınabilir
      return 0;
    } catch (error) {
      this.logger.warn('Could not get lock wait time:', error);
      return 0;
    }
  }

  private async getApiMetrics() {
    try {
      const [totalRequests, successfulRequests, failedRequests, averageResponseTime] = await Promise.all([
        this.getTotalRequests(),
        this.getSuccessfulRequests(),
        this.getFailedRequests(),
        this.getAverageResponseTime(),
      ]);

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        p95ResponseTime: 0, // Bu değer response time histogram'dan alınabilir
        p99ResponseTime: 0, // Bu değer response time histogram'dan alınabilir
      };
    } catch (error) {
      this.logger.warn('Could not get API metrics:', error);
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
      };
    }
  }

  private async getTotalRequests(): Promise<number> {
    try {
      // Bu değer request counter'dan alınabilir
      return 0;
    } catch (error) {
      this.logger.warn('Could not get total requests:', error);
      return 0;
    }
  }

  private async getSuccessfulRequests(): Promise<number> {
    try {
      // Bu değer success counter'dan alınabilir
      return 0;
    } catch (error) {
      this.logger.warn('Could not get successful requests:', error);
      return 0;
    }
  }

  private async getFailedRequests(): Promise<number> {
    try {
      // Bu değer error counter'dan alınabilir
      return 0;
    } catch (error) {
      this.logger.warn('Could not get failed requests:', error);
      return 0;
    }
  }

  private async getAverageResponseTime(): Promise<number> {
    try {
      // Bu değer response time counter'dan alınabilir
      return 0;
    } catch (error) {
      this.logger.warn('Could not get average response time:', error);
      return 0;
    }
  }

  private async saveMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      await this.prisma.performanceMetrics.create({
        data: {
          timestamp: new Date(metrics.timestamp),
          cpuUsage: metrics.system.cpu.usage,
          memoryUsage: metrics.system.memory.usage,
          diskUsage: metrics.system.disk.usage,
          responseTime: metrics.application.responseTime,
          errorRate: metrics.application.errorRate,
          activeConnections: metrics.application.activeConnections,
          totalRequests: metrics.api.totalRequests,
          successfulRequests: metrics.api.successfulRequests,
          failedRequests: metrics.api.failedRequests,
          averageResponseTime: metrics.api.averageResponseTime,
        },
      });
    } catch (error) {
      this.logger.error('Failed to save metrics:', error);
    }
  }

  async getPerformanceDashboard(): Promise<PerformanceDashboard> {
    try {
      const currentMetrics = await this.collectMetrics();
      const alerts = await this.getActiveAlerts();
      const trends = await this.getTrends();
      const summary = await this.getSummary();

      return {
        currentMetrics,
        alerts,
        trends,
        summary,
      };
    } catch (error) {
      this.logger.error('Failed to get performance dashboard:', error);
      throw error;
    }
  }

  private async getActiveAlerts(): Promise<PerformanceAlert[]> {
    try {
      const alerts = await this.prisma.performanceAlert.findMany({
        where: { resolved: false },
        take: 10,
        orderBy: { timestamp: 'desc' },
      });

      return alerts.map(alert => ({
        id: alert.id,
        type: alert.type as any,
        severity: alert.severity as any,
        title: alert.title,
        message: alert.message,
        threshold: alert.threshold,
        currentValue: alert.currentValue,
        timestamp: alert.timestamp.toISOString(),
        resolved: alert.resolved,
      }));
    } catch (error) {
      this.logger.warn('Could not get active alerts:', error);
      return [];
    }
  }

  private async getTrends() {
    try {
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const metrics = await this.prisma.performanceMetrics.findMany({
        where: {
          timestamp: { gte: last24Hours },
        },
        orderBy: { timestamp: 'asc' },
        take: 100,
      });

      return {
        cpu: metrics.map(m => ({
          timestamp: m.timestamp.toISOString(),
          usage: m.cpuUsage,
        })),
        memory: metrics.map(m => ({
          timestamp: m.timestamp.toISOString(),
          usage: m.memoryUsage,
        })),
        responseTime: metrics.map(m => ({
          timestamp: m.timestamp.toISOString(),
          time: m.responseTime,
        })),
        errorRate: metrics.map(m => ({
          timestamp: m.timestamp.toISOString(),
          rate: m.errorRate,
        })),
      };
    } catch (error) {
      this.logger.warn('Could not get trends:', error);
      return {
        cpu: [],
        memory: [],
        responseTime: [],
        errorRate: [],
      };
    }
  }

  private async getSummary() {
    try {
      const latestMetrics = await this.prisma.performanceMetrics.findFirst({
        orderBy: { timestamp: 'desc' },
      });

      if (!latestMetrics) {
        return {
          systemHealth: 'healthy' as const,
          uptime: 0,
          totalRequests: 0,
          averageResponseTime: 0,
          errorRate: 0,
        };
      }

      const systemHealth = this.determineSystemHealth(latestMetrics);

      return {
        systemHealth,
        uptime: process.uptime(),
        totalRequests: latestMetrics.totalRequests,
        averageResponseTime: latestMetrics.averageResponseTime,
        errorRate: latestMetrics.errorRate,
      };
    } catch (error) {
      this.logger.warn('Could not get summary:', error);
      return {
        systemHealth: 'healthy' as const,
        uptime: 0,
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
      };
    }
  }

  private determineSystemHealth(metrics: any): 'healthy' | 'warning' | 'critical' {
    if (metrics.cpuUsage > 90 || metrics.memoryUsage > 95 || metrics.errorRate > 10) {
      return 'critical';
    }
    if (metrics.cpuUsage > 80 || metrics.memoryUsage > 85 || metrics.errorRate > 5) {
      return 'warning';
    }
    return 'healthy';
  }

  async createAlert(
    type: 'cpu' | 'memory' | 'disk' | 'response_time' | 'error_rate' | 'database',
    severity: 'low' | 'medium' | 'high' | 'critical',
    title: string,
    message: string,
    threshold: number,
    currentValue: number
  ): Promise<void> {
    try {
      await this.prisma.performanceAlert.create({
        data: {
          type,
          severity,
          title,
          message,
          threshold,
          currentValue,
          timestamp: new Date(),
          resolved: false,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create performance alert:', error);
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    try {
      await this.prisma.performanceAlert.update({
        where: { id: alertId },
        data: { resolved: true },
      });
    } catch (error) {
      this.logger.error('Failed to resolve alert:', error);
    }
  }

  async getMetricsHistory(limit: number = 100): Promise<PerformanceMetrics[]> {
    try {
      const metrics = await this.prisma.performanceMetrics.findMany({
        take: limit,
        orderBy: { timestamp: 'desc' },
      });

      return metrics.map(metric => ({
        timestamp: metric.timestamp.toISOString(),
        system: {
          cpu: { usage: metric.cpuUsage, cores: 0, loadAverage: [0, 0, 0] },
          memory: { total: 0, used: 0, free: 0, usage: metric.memoryUsage },
          disk: { total: 0, used: 0, free: 0, usage: metric.diskUsage },
          network: { bytesReceived: 0, bytesSent: 0, packetsReceived: 0, packetsSent: 0 },
        },
        application: {
          responseTime: metric.responseTime,
          throughput: 0,
          errorRate: metric.errorRate,
          activeConnections: metric.activeConnections,
          memoryUsage: 0,
          cpuUsage: 0,
        },
        database: {
          connectionCount: 0,
          queryTime: 0,
          slowQueries: 0,
          lockWaitTime: 0,
        },
        api: {
          totalRequests: metric.totalRequests,
          successfulRequests: metric.successfulRequests,
          failedRequests: metric.failedRequests,
          averageResponseTime: metric.averageResponseTime,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
        },
      }));
    } catch (error) {
      this.logger.error('Failed to get metrics history:', error);
      return [];
    }
  }
}
