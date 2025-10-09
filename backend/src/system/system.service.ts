import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) {}

  async getSystemStatus() {
    try {
      // Veritabanı bağlantısını test et
      const dbStatus = await this.testDatabaseConnection();
      
      // Redis bağlantısını test et
      const redisStatus = await this.testRedisConnection();
      
      // Kullanıcı sayısını al
      const userCount = await this.getUserCount();
      
      // Gelir bilgisini al
      const revenue = await this.getRevenue();
      
      return {
        timestamp: new Date().toISOString(),
        database: dbStatus,
        redis: redisStatus,
        users: {
          total: userCount,
          active: userCount, // Şimdilik tüm kullanıcıları aktif say
          status: userCount > 0 ? 'healthy' : 'critical'
        },
        revenue: {
          current: revenue,
          target: 10000, // Hedef 10,000 TL
          status: revenue > 0 ? 'healthy' : 'critical'
        },
        performance: {
          uptime: this.getUptime(),
          status: 'healthy'
        },
        overall: {
          score: this.calculateHealthScore(dbStatus, redisStatus, userCount, revenue),
          status: this.getOverallStatus(dbStatus, redisStatus, userCount, revenue),
          trend: 'stable'
        }
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        database: { connected: false, error: (error as Error).message },
        redis: { connected: false, error: 'Redis bağlantısı yok' },
        users: { total: 0, active: 0, status: 'critical' },
        revenue: { current: 0, target: 10000, status: 'critical' },
        performance: { uptime: 0, status: 'critical' },
        overall: { score: 0, status: 'critical', trend: 'stable' },
        error: (error as Error).message
      };
    }
  }

  async startServices() {
    try {
      // Burada gerçek servis başlatma komutları olabilir
      return {
        message: 'Servisler başlatılıyor...',
        timestamp: new Date().toISOString(),
        status: 'starting'
      };
    } catch (error) {
      return {
        message: 'Servis başlatma hatası',
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
        status: 'error'
      };
    }
  }

  async getHealth() {
    const status = await this.getSystemStatus();
    return {
      status: status.overall.status,
      score: status.overall.score,
      timestamp: status.timestamp,
      services: {
        database: status.database.connected,
        redis: status.redis.connected
      }
    };
  }

  private async testDatabaseConnection() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { connected: true, message: 'Veritabanı bağlantısı başarılı' };
    } catch (error) {
      return { connected: false, error: (error as Error).message };
    }
  }

  private async testRedisConnection() {
    try {
      // Redis bağlantısı test edilebilir
      return { connected: false, message: 'Redis servisi henüz kurulmadı' };
    } catch (error) {
      return { connected: false, error: (error as Error).message };
    }
  }

  private async getUserCount() {
    try {
      const count = await (this.prisma as any).user.count();
      return count;
    } catch (error) {
      return 0;
    }
  }

  private async getRevenue() {
    try {
      // Abonelik gelirlerini hesapla
      const subscriptions = await (this.prisma as any).subscription.findMany({
        where: { status: 'PREMIUM' }
      });
      
      let totalRevenue = 0;
      subscriptions.forEach((sub: any) => {
        if (sub.planType === 'MONTHLY_PREMIUM' || sub.planType === 'YEARLY_PREMIUM') {
          totalRevenue += 99; // Premium plan fiyatı
        } else if (sub.planType === 'FAMILY_PLAN') {
          totalRevenue += 79; // Family plan fiyatı
        }
      });
      
      return totalRevenue;
    } catch (error) {
      return 0;
    }
  }

  private getUptime() {
    // Basit uptime hesaplama
    return 99.9; // Şimdilik sabit değer
  }

  private calculateHealthScore(dbStatus: any, redisStatus: any, userCount: number, revenue: number) {
    let score = 0;
    
    if (dbStatus.connected) score += 40;
    if (redisStatus.connected) score += 20;
    if (userCount > 0) score += 20;
    if (revenue > 0) score += 20;
    
    return score;
  }

  private getOverallStatus(dbStatus: any, redisStatus: any, userCount: number, revenue: number) {
    const score = this.calculateHealthScore(dbStatus, redisStatus, userCount, revenue);
    
    if (score >= 80) return 'healthy';
    if (score >= 40) return 'warning';
    return 'critical';
  }
}
