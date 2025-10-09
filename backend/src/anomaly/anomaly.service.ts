import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

interface AnomalyResult {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  data: any;
  detectedAt: Date;
  threshold?: number;
  actualValue?: number;
}

@Injectable()
export class AnomalyService {
  private readonly logger = new Logger(AnomalyService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async detectAnomalies() {
    this.logger.log('Anomali tespiti başlatılıyor...');
    
    try {
      const anomalies: AnomalyResult[] = [];

      // 1. Öğrenci kayıt anomali tespiti
      const registrationAnomalies = await this.detectRegistrationAnomalies();
      anomalies.push(...registrationAnomalies);

      // 2. Not ortalaması anomali tespiti
      const gpaAnomalies = await this.detectGpaAnomalies();
      anomalies.push(...gpaAnomalies);

      // 3. Giriş aktivitesi anomali tespiti
      const activityAnomalies = await this.detectActivityAnomalies();
      anomalies.push(...activityAnomalies);

      // 4. Sistem performans anomali tespiti
      const performanceAnomalies = await this.detectPerformanceAnomalies();
      anomalies.push(...performanceAnomalies);

      // Anomalileri kaydet ve bildirim gönder
      for (const anomaly of anomalies) {
        await this.saveAnomaly(anomaly);
        await this.sendNotification(anomaly);
      }

      this.logger.log(`${anomalies.length} anomali tespit edildi`);
    } catch (error) {
      this.logger.error('Anomali tespiti sırasında hata:', error);
    }
  }

  private async detectRegistrationAnomalies(): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];

    try {
      // Son 1 saatteki kayıt sayısı
      const recentRegistrations = await (this.prisma as any).user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Son 1 saat
          },
        },
      });

      // Son 24 saatteki ortalama kayıt sayısı
      const avgRegistrations = await (this.prisma as any).user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Son 24 saat
          },
        },
      }) / 24;

      // Eğer son 1 saatteki kayıt sayısı, 24 saatlik ortalamanın 3 katından fazlaysa
      if (recentRegistrations > avgRegistrations * 3) {
        anomalies.push({
          type: 'REGISTRATION_SPIKE',
          severity: 'HIGH',
          message: `Son 1 saatte beklenmedik kayıt artışı: ${recentRegistrations} kayıt`,
          data: {
            recentRegistrations,
            avgRegistrations: Math.round(avgRegistrations),
            ratio: Math.round((recentRegistrations / avgRegistrations) * 100) / 100,
          },
          detectedAt: new Date(),
          threshold: avgRegistrations * 3,
          actualValue: recentRegistrations,
        });
      }

      // Eğer son 1 saatte hiç kayıt yoksa ve normalde olması gerekiyorsa
      if (recentRegistrations === 0 && avgRegistrations > 0.5) {
        anomalies.push({
          type: 'REGISTRATION_DROP',
          severity: 'MEDIUM',
          message: 'Son 1 saatte hiç kayıt olmamış',
          data: {
            recentRegistrations,
            avgRegistrations: Math.round(avgRegistrations),
          },
          detectedAt: new Date(),
        });
      }
    } catch (error) {
      this.logger.error('Kayıt anomali tespiti hatası:', error);
    }

    return anomalies;
  }

  private async detectGpaAnomalies(): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];

    try {
      // Son 24 saatte not ortalaması düşen öğrenciler
      const studentsWithGpaDrop = await (this.prisma as any).user.findMany({
        where: {
          role: 'STUDENT',
          gpa: {
            not: null,
          },
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gpa: true,
          updatedAt: true,
        },
      });

      // Not ortalaması 2.0'ın altına düşen öğrenciler
      const lowGpaStudents = studentsWithGpaDrop.filter((student: any) => 
        student.gpa && student.gpa < 2.0
      );

      if (lowGpaStudents.length > 0) {
        anomalies.push({
          type: 'GPA_DROP',
          severity: 'MEDIUM',
          message: `${lowGpaStudents.length} öğrencinin not ortalaması 2.0'ın altında`,
          data: {
            students: lowGpaStudents,
            count: lowGpaStudents.length,
          },
          detectedAt: new Date(),
        });
      }

      // Not ortalaması 4.0'ın üzerine çıkan öğrenciler (şüpheli)
      const highGpaStudents = studentsWithGpaDrop.filter((student: any) => 
        student.gpa && student.gpa > 4.0
      );

      if (highGpaStudents.length > 0) {
        anomalies.push({
          type: 'GPA_SUSPICIOUS',
          severity: 'LOW',
          message: `${highGpaStudents.length} öğrencinin not ortalaması 4.0'ın üzerinde`,
          data: {
            students: highGpaStudents,
            count: highGpaStudents.length,
          },
          detectedAt: new Date(),
        });
      }
    } catch (error) {
      this.logger.error('Not ortalaması anomali tespiti hatası:', error);
    }

    return anomalies;
  }

  private async detectActivityAnomalies(): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];

    try {
      // Son 1 saatte giriş yapan kullanıcı sayısı
      const recentActivity = await (this.prisma as any).user.count({
        where: {
          lastActiveAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
      });

      // Toplam aktif kullanıcı sayısı
      const totalUsers = await (this.prisma as any).user.count();

      // Eğer son 1 saatte hiç aktivite yoksa
      if (recentActivity === 0 && totalUsers > 0) {
        anomalies.push({
          type: 'NO_ACTIVITY',
          severity: 'HIGH',
          message: 'Son 1 saatte hiç kullanıcı aktivitesi yok',
          data: {
            recentActivity,
            totalUsers,
          },
          detectedAt: new Date(),
        });
      }

      // Eğer aktivite çok düşükse (toplam kullanıcının %5'i)
      const activityThreshold = totalUsers * 0.05;
      if (recentActivity < activityThreshold && totalUsers > 10) {
        anomalies.push({
          type: 'LOW_ACTIVITY',
          severity: 'MEDIUM',
          message: `Düşük kullanıcı aktivitesi: ${recentActivity}/${totalUsers}`,
          data: {
            recentActivity,
            totalUsers,
            threshold: activityThreshold,
          },
          detectedAt: new Date(),
        });
      }
    } catch (error) {
      this.logger.error('Aktivite anomali tespiti hatası:', error);
    }

    return anomalies;
  }

  private async detectPerformanceAnomalies(): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];

    try {
      // Veritabanı bağlantı testi
      const startTime = Date.now();
      await (this.prisma as any).user.count();
      const queryTime = Date.now() - startTime;

      // Eğer sorgu 5 saniyeden uzun sürerse
      if (queryTime > 5000) {
        anomalies.push({
          type: 'SLOW_DATABASE',
          severity: 'HIGH',
          message: `Veritabanı sorgusu yavaş: ${queryTime}ms`,
          data: {
            queryTime,
            threshold: 5000,
          },
          detectedAt: new Date(),
        });
      }

      // Eğer sorgu 2 saniyeden uzun sürerse
      if (queryTime > 2000) {
        anomalies.push({
          type: 'DATABASE_WARNING',
          severity: 'MEDIUM',
          message: `Veritabanı sorgusu yavaş: ${queryTime}ms`,
          data: {
            queryTime,
            threshold: 2000,
          },
          detectedAt: new Date(),
        });
      }
    } catch (error) {
      this.logger.error('Performans anomali tespiti hatası:', error);
    }

    return anomalies;
  }

  private async saveAnomaly(anomaly: AnomalyResult): Promise<void> {
    try {
      // Anomaliyi veritabanına kaydet (gelecekte AnomalyLog tablosu eklenebilir)
      this.logger.log(`Anomali kaydedildi: ${anomaly.type} - ${anomaly.message}`);
    } catch (error) {
      this.logger.error('Anomali kaydetme hatası:', error);
    }
  }

  private async sendNotification(anomaly: AnomalyResult): Promise<void> {
    try {
      // Kritik ve yüksek seviye anomaliler için bildirim gönder
      if (anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH') {
        this.logger.warn(`🚨 ${anomaly.severity} ANOMALI: ${anomaly.message}`);
        
        // Gelecekte WebSocket veya email bildirimi eklenebilir
        // await this.notificationService.sendCriticalAlert(anomaly);
      } else {
        this.logger.log(`⚠️ ${anomaly.severity} Anomali: ${anomaly.message}`);
      }
    } catch (error) {
      this.logger.error('Bildirim gönderme hatası:', error);
    }
  }

  async getAnomalyHistory(limit: number = 50): Promise<{
    success: boolean;
    data: any[];
  }> {
    try {
      // Gelecekte AnomalyLog tablosundan veri çekilecek
      return {
        success: true,
        data: [],
      };
    } catch (error) {
      this.logger.error('Anomali geçmişi getirme hatası:', error);
      return {
        success: false,
        data: [],
      };
    }
  }

  async getAnomalyStats(): Promise<{
    success: boolean;
    data: {
      total: number;
      bySeverity: Record<string, number>;
      byType: Record<string, number>;
    };
  }> {
    try {
      // Gelecekte istatistikler hesaplanacak
      return {
        success: true,
        data: {
          total: 0,
          bySeverity: {},
          byType: {},
        },
      };
    } catch (error) {
      this.logger.error('Anomali istatistikleri getirme hatası:', error);
      return {
        success: false,
        data: {
          total: 0,
          bySeverity: {},
          byType: {},
        },
      };
    }
  }
}
