import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';

@Injectable()
export class SystemHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getSystemHealth() {
    const timestamp = new Date();
    const healthChecks = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.checkApiHealth(),
    ]);

    const [database, redis, api] = healthChecks.map(result => 
      result.status === 'fulfilled' ? result.value : 'ERROR'
    );

    const overall = database === 'OK' && redis === 'OK' && api === 'OK' 
      ? 'HEALTHY' 
      : 'DEGRADED';

    return {
      success: true,
      data: {
        database,
        redis,
        api,
        overall,
        timestamp,
      },
    };
  }

  async getSystemMetrics() {
    const timestamp = new Date();
    
    try {
      // Cache'den metrikleri al (10 saniye cache)
      const cacheKey = 'system:metrics';
      const cachedMetrics = await this.cacheService.get(cacheKey);
      
      if (cachedMetrics) {
        return {
          success: true,
          data: {
            ...cachedMetrics,
            timestamp,
          },
        };
      }

      // Gerçek zamanlı metrikleri hesapla
      const [
        activeUsers,
        requestsLastHour,
        errorRate,
        responseTime,
        uptime,
      ] = await Promise.all([
        this.getActiveUsersCount(),
        this.getRequestsLastHour(),
        this.getErrorRate(),
        this.getAverageResponseTime(),
        this.getSystemUptime(),
      ]);

      const metrics = {
        activeUsers,
        requestsLastHour,
        errorRate,
        responseTime,
        uptime,
        timestamp,
      };

      // Cache'e kaydet (10 saniye)
      await this.cacheService.set(cacheKey, metrics, 10);

      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Metrikler alınamadı',
        data: {
          activeUsers: 0,
          requestsLastHour: 0,
          errorRate: 0,
          responseTime: 0,
          uptime: 0,
          timestamp,
        },
      };
    }
  }

  async getServiceStatus() {
    const services = [
      { name: 'Database', status: await this.checkDatabaseHealth() },
      { name: 'Redis Cache', status: await this.checkRedisHealth() },
      { name: 'API Gateway', status: await this.checkApiHealth() },
      { name: 'Authentication', status: 'OK' },
      { name: 'File Storage', status: 'OK' },
    ];

    return {
      success: true,
      data: {
        services,
        overall: services.every(s => s.status === 'OK') ? 'HEALTHY' : 'DEGRADED',
        timestamp: new Date(),
      },
    };
  }

  private async checkDatabaseHealth(): Promise<string> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'OK';
    } catch (error) {
      return 'ERROR';
    }
  }

  private async checkRedisHealth(): Promise<string> {
    try {
      await this.cacheService.get('health:check');
      return 'OK';
    } catch (error) {
      return 'ERROR';
    }
  }

  private async checkApiHealth(): Promise<string> {
    // API sağlık kontrolü - basit bir test
    try {
      // Burada API endpoint'lerinin yanıt sürelerini kontrol edebiliriz
      return 'OK';
    } catch (error) {
      return 'ERROR';
    }
  }

  private async getActiveUsersCount(): Promise<number> {
    try {
      // Son 15 dakikada aktif olan kullanıcı sayısı
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      const activeUsers = await this.prisma.user.count({
        where: {
          lastActiveAt: {
            gte: fifteenMinutesAgo,
          },
        },
      });

      return activeUsers;
    } catch (error) {
      return 0;
    }
  }

  private async getRequestsLastHour(): Promise<number> {
    try {
      // Son 1 saatteki API istek sayısı (audit log'dan)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const requestCount = await this.prisma.auditLog.count({
        where: {
          timestamp: {
            gte: oneHourAgo,
          },
          action: {
            in: ['LOGIN', 'API_REQUEST', 'DATA_ACCESS'],
          },
        },
      });

      return requestCount;
    } catch (error) {
      return 0;
    }
  }

  private async getErrorRate(): Promise<number> {
    try {
      // Son 1 saatteki hata oranı
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const [totalRequests, errorRequests] = await Promise.all([
        this.prisma.auditLog.count({
          where: {
            timestamp: {
              gte: oneHourAgo,
            },
          },
        }),
        this.prisma.auditLog.count({
          where: {
            timestamp: {
              gte: oneHourAgo,
            },
            action: {
              contains: 'ERROR',
            },
          },
        }),
      ]);

      if (totalRequests === 0) return 0;
      return (errorRequests / totalRequests) * 100;
    } catch (error) {
      return 0;
    }
  }

  private async getAverageResponseTime(): Promise<number> {
    try {
      // Ortalama yanıt süresi (ms)
      // Bu veri audit log'da metadata olarak saklanabilir
      return 250; // Mock data
    } catch (error) {
      return 0;
    }
  }

  private async getSystemUptime(): Promise<number> {
    try {
      // Sistem uptime yüzdesi
      // Bu veri monitoring sisteminden alınabilir
      return 99.8; // Mock data
    } catch (error) {
      return 0;
    }
  }
}
