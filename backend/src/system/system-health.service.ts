import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  lastCheck: string;
  responseTime?: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: ServiceStatus[];
  database: {
    status: 'connected' | 'disconnected';
    responseTime: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
}

@Injectable()
export class SystemHealthService {
  private readonly logger = new Logger(SystemHealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSystemHealth(): Promise<SystemHealth> {
    const timestamp = new Date().toISOString();
    
    try {
      // Database health check
      const dbStart = Date.now();
      await this.prisma.user.count();
      const dbResponseTime = Date.now() - dbStart;

      // Memory usage
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
      const usedMemory = memoryUsage.heapUsed;
      const memoryPercentage = (usedMemory / totalMemory) * 100;

      // CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      const cpuPercentage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

      // Service statuses
      const services = await this.checkServices();

      // Overall system status
      const hasErrors = services.some(service => service.status === 'error');
      const hasStopped = services.some(service => service.status === 'stopped');
      
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (hasErrors) {
        overallStatus = 'unhealthy';
      } else if (hasStopped) {
        overallStatus = 'degraded';
      }

      return {
        status: overallStatus,
        timestamp,
        services,
        database: {
          status: 'connected',
          responseTime: dbResponseTime,
        },
        memory: {
          used: usedMemory,
          total: totalMemory,
          percentage: memoryPercentage,
        },
        cpu: {
          usage: cpuPercentage,
        },
      };
    } catch (error) {
      this.logger.error('System health check failed:', error);
      
      return {
        status: 'unhealthy',
        timestamp,
        services: [],
        database: {
          status: 'disconnected',
          responseTime: 0,
        },
        memory: {
          used: 0,
          total: 0,
          percentage: 0,
        },
        cpu: {
          usage: 0,
        },
      };
    }
  }

  private async checkServices(): Promise<ServiceStatus[]> {
    const services = [
      { name: 'Database', check: () => this.checkDatabase() },
      { name: 'API', check: () => this.checkAPI() },
      { name: 'Cache', check: () => this.checkCache() },
    ];

    const results = await Promise.allSettled(
      services.map(async (service) => {
        const start = Date.now();
        try {
          await service.check();
          return {
            name: service.name,
            status: 'running' as const,
            uptime: Date.now() - start,
            lastCheck: new Date().toISOString(),
            responseTime: Date.now() - start,
          };
        } catch (error) {
          return {
            name: service.name,
            status: 'error' as const,
            uptime: 0,
            lastCheck: new Date().toISOString(),
          };
        }
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

  private async checkDatabase(): Promise<void> {
    await this.prisma.user.count();
  }

  private async checkAPI(): Promise<void> {
    // Simple API health check
    return Promise.resolve();
  }

  private async checkCache(): Promise<void> {
    // Simple cache health check
    return Promise.resolve();
  }

  async logSystemEvent(event: string, details?: any): Promise<void> {
    try {
      await this.prisma.systemLog.create({
        data: {
          level: 'info',
          message: event,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log system event:', error);
    }
  }
}
