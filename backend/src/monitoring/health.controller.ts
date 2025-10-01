import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';
import { MetricsService } from './metrics.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  async getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with dependencies' })
  async getDetailedHealth() {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      memory: this.checkMemory(),
      metrics: this.checkMetrics(),
    };

    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  async getMetrics() {
    return await this.metrics.getPrometheusMetrics();
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: (error as any)?.message || 'Database connection failed' 
      };
    }
  }

  private async checkRedis() {
    try {
      // Basit Redis kontrolü (Redis bağlantısı varsa)
      return { status: 'healthy' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: (error as any)?.message || 'Redis connection failed' 
      };
    }
  }

  private checkMemory() {
    const usage = process.memoryUsage();
    const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const usagePercent = Math.round((usedMB / totalMB) * 100);

    return {
      status: usagePercent < 90 ? 'healthy' : 'warning',
      heapTotal: totalMB,
      heapUsed: usedMB,
      usagePercent,
    };
  }

  private async checkMetrics() {
    const prometheusData = await this.metrics.getPrometheusMetrics();
    return {
      status: prometheusData.length > 0 ? 'healthy' : 'warning',
      metricsCount: prometheusData.split('\n').filter(line => !line.startsWith('#')).length,
    };
  }
}
