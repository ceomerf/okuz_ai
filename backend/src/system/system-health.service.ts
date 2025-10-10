import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  timestamp: string;
  services: ServiceStatus[];
  metrics: SystemMetrics;
}

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  lastCheck: string;
  responseTime?: number;
}

export interface SystemMetrics {
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
}

@Injectable()
export class SystemHealthService {
  private readonly logger = new Logger(SystemHealthService.name);

  constructor(private prisma: PrismaService) {}

  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const [services, metrics] = await Promise.all([
        this.checkServices(),
        this.getSystemMetrics(),
      ]);

      const status = this.determineOverallStatus(services, metrics);
      
      return {
        status,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        services,
        metrics,
      };
    } catch (error) {
      this.logger.error('Failed to get system health:', error);
      throw error;
    }
  }

  private async checkServices(): Promise<ServiceStatus[]> {
    const services = [
      { name: 'Database', check: () => this.checkDatabase() },
      { name: 'Redis', check: () => this.checkRedis() },
      { name: 'API Gateway', check: () => this.checkApiGateway() },
      { name: 'Auth Service', check: () => this.checkAuthService() },
      { name: 'Notification Service', check: () => this.checkNotificationService() },
    ];

    const results = await Promise.allSettled(
      services.map(async (service) => {
        const startTime = Date.now();
        const result = await service.check();
        const responseTime = Date.now() - startTime;
        
        return {
          name: service.name,
          status: result ? 'running' : 'error',
          uptime: result ? process.uptime() : 0,
          lastCheck: new Date().toISOString(),
          responseTime,
        };
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: services[index].name,
          status: 'error' as const,
          uptime: 0,
          lastCheck: new Date().toISOString(),
        };
      }
    });
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      // Redis health check implementation
      // Bu kısım Redis client'ınızın implementasyonuna göre değişecek
      return true;
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  private async checkApiGateway(): Promise<boolean> {
    try {
      // API Gateway health check
      return true;
    } catch (error) {
      this.logger.error('API Gateway health check failed:', error);
      return false;
    }
  }

  private async checkAuthService(): Promise<boolean> {
    try {
      // Auth Service health check
      return true;
    } catch (error) {
      this.logger.error('Auth Service health check failed:', error);
      return false;
    }
  }

  private async checkNotificationService(): Promise<boolean> {
    try {
      // Notification Service health check
      return true;
    } catch (error) {
      this.logger.error('Notification Service health check failed:', error);
      return false;
    }
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
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
      return {
        total: 0,
        used: 0,
        free: 0,
        usage: 0,
      };
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
    const networkInterfaces = os.networkInterfaces();
    let bytesReceived = 0;
    let bytesSent = 0;
    let packetsReceived = 0;
    let packetsSent = 0;

    Object.values(networkInterfaces).forEach(interfaces => {
      interfaces?.forEach(iface => {
        if (!iface.internal) {
          // Bu değerler gerçek implementasyonda network interface'lerden alınmalı
          bytesReceived += 0;
          bytesSent += 0;
          packetsReceived += 0;
          packetsSent += 0;
        }
      });
    });

    return {
      bytesReceived,
      bytesSent,
      packetsReceived,
      packetsSent,
    };
  }

  private determineOverallStatus(services: ServiceStatus[], metrics: SystemMetrics): 'healthy' | 'warning' | 'critical' {
    const criticalServices = services.filter(s => s.status === 'error');
    const warningServices = services.filter(s => s.status === 'stopped');
    
    if (criticalServices.length > 0) {
      return 'critical';
    }
    
    if (warningServices.length > 0 || metrics.cpu.usage > 80 || metrics.memory.usage > 90) {
      return 'warning';
    }
    
    return 'healthy';
  }

  async getSystemLogs(limit: number = 100): Promise<any[]> {
    try {
      // Sistem loglarını getir
      const logs = await this.prisma.systemLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
      
      return logs;
    } catch (error) {
      this.logger.error('Failed to get system logs:', error);
      return [];
    }
  }

  async createSystemLog(level: string, message: string, service: string): Promise<void> {
    try {
      await this.prisma.systemLog.create({
        data: {
          level,
          message,
          service,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to create system log:', error);
    }
  }
}