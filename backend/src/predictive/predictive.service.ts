import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

interface PredictionResult {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  timeframe: string;
  factors: string[];
  recommendations: string[];
}

@Injectable()
export class PredictiveService {
  private readonly logger = new Logger(PredictiveService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async generatePredictions() {
    this.logger.log('Tahminsel analitik modelleri çalıştırılıyor...');
    
    try {
      // 1. Öğrenci başarı oranı tahmini
      const successPrediction = await this.predictStudentSuccess();
      
      // 2. Kurs popülerliği tahmini
      const popularityPrediction = await this.predictCoursePopularity();
      
      // 3. Kayıt trendi tahmini
      const registrationPrediction = await this.predictRegistrationTrend();
      
      // 4. Sistem kullanım tahmini
      const usagePrediction = await this.predictSystemUsage();

      this.logger.log('Tahminsel analitik modelleri tamamlandı');
    } catch (error) {
      this.logger.error('Tahminsel analitik hatası:', error);
    }
  }

  private async predictStudentSuccess(): Promise<PredictionResult> {
    try {
      // Son 6 ayın verilerini al
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const students = await (this.prisma as any).user.findMany({
        where: {
          role: 'STUDENT',
          createdAt: {
            gte: sixMonthsAgo,
          },
        },
        select: {
          gpa: true,
          createdAt: true,
          lastActiveAt: true,
        },
      });

      // Mevcut başarı oranı
      const currentSuccessRate = students.filter((s: any) => s.gpa && s.gpa >= 3.0).length / students.length;
      
      // Trend analizi (basit lineer regresyon)
      const monthlyData = this.calculateMonthlySuccessRates(students);
      const trend = this.calculateTrend(monthlyData);
      
      // Tahmin (basit projeksiyon)
      const predictedSuccessRate = Math.max(0, Math.min(1, currentSuccessRate + trend * 0.1));
      
      return {
        metric: 'Öğrenci Başarı Oranı',
        currentValue: Math.round(currentSuccessRate * 100),
        predictedValue: Math.round(predictedSuccessRate * 100),
        confidence: 0.75,
        trend: trend > 0.05 ? 'UP' : trend < -0.05 ? 'DOWN' : 'STABLE',
        timeframe: '3 ay',
        factors: [
          'Not ortalaması dağılımı',
          'Aktif öğrenci oranı',
          'Sistem kullanım sıklığı'
        ],
        recommendations: [
          trend < 0 ? 'Öğrenci destek programları artırılmalı' : 'Mevcut destek programları sürdürülmeli',
          'Düşük performanslı öğrenciler için ek kaynaklar sağlanmalı'
        ]
      };
    } catch (error) {
      this.logger.error('Öğrenci başarı tahmini hatası:', error);
      throw error;
    }
  }

  private async predictCoursePopularity(): Promise<PredictionResult> {
    try {
      // Kurs verilerini al
      const courses = await (this.prisma as any).course.findMany({
        include: {
          enrollments: true,
        },
      });

      // Mevcut popülerlik
      const currentPopularity = courses.map((course: any) => ({
        id: course.id,
        name: course.name,
        enrollmentCount: course.enrollments.length,
        popularity: course.enrollments.length / Math.max(1, courses.length),
      }));

      // Trend analizi
      const avgEnrollments = currentPopularity.reduce((sum: any, c: any) => sum + c.enrollmentCount, 0) / courses.length;
      const trend = this.calculateEnrollmentTrend(currentPopularity);
      
      return {
        metric: 'Kurs Popülerliği',
        currentValue: Math.round(avgEnrollments),
        predictedValue: Math.round(avgEnrollments * (1 + trend)),
        confidence: 0.65,
        trend: trend > 0.1 ? 'UP' : trend < -0.1 ? 'DOWN' : 'STABLE',
        timeframe: '2 ay',
        factors: [
          'Mevcut kayıt sayıları',
          'Kurs içerik kalitesi',
          'Öğrenci geri bildirimleri'
        ],
        recommendations: [
          'Popüler kurslar için kapasite artırılmalı',
          'Az popüler kurslar için içerik gözden geçirilmeli'
        ]
      };
    } catch (error) {
      this.logger.error('Kurs popülerlik tahmini hatası:', error);
      throw error;
    }
  }

  private async predictRegistrationTrend(): Promise<PredictionResult> {
    try {
      // Son 12 ayın kayıt verilerini al
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const registrations = await (this.prisma as any).user.findMany({
        where: {
          createdAt: {
            gte: twelveMonthsAgo,
          },
        },
        select: {
          createdAt: true,
          role: true,
        },
      });

      // Aylık kayıt sayıları
      const monthlyRegistrations = this.calculateMonthlyRegistrations(registrations);
      const trend = this.calculateTrend(monthlyRegistrations);
      
      // Son ayın kayıt sayısı
      const lastMonth = monthlyRegistrations[monthlyRegistrations.length - 1] || 0;
      const predictedNextMonth = Math.max(0, lastMonth * (1 + trend));
      
      return {
        metric: 'Aylık Kayıt Sayısı',
        currentValue: lastMonth,
        predictedValue: Math.round(predictedNextMonth),
        confidence: 0.70,
        trend: trend > 0.1 ? 'UP' : trend < -0.1 ? 'DOWN' : 'STABLE',
        timeframe: '1 ay',
        factors: [
          'Geçmiş kayıt trendleri',
          'Mevsimsel etkiler',
          'Pazarlama kampanyaları'
        ],
        recommendations: [
          trend > 0 ? 'Kayıt artışı için altyapı hazırlanmalı' : 'Kayıt düşüşü için pazarlama stratejisi gözden geçirilmeli',
          'Yeni kullanıcı deneyimi iyileştirmeleri yapılmalı'
        ]
      };
    } catch (error) {
      this.logger.error('Kayıt trendi tahmini hatası:', error);
      throw error;
    }
  }

  private async predictSystemUsage(): Promise<PredictionResult> {
    try {
      // Son 30 günün aktivite verilerini al
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeUsers = await (this.prisma as any).user.count({
        where: {
          lastActiveAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      const totalUsers = await (this.prisma as any).user.count();
      const currentUsageRate = activeUsers / Math.max(1, totalUsers);
      
      // Basit trend hesaplama
      const dailyActivity = await this.calculateDailyActivity(thirtyDaysAgo);
      const trend = this.calculateTrend(dailyActivity);
      
      return {
        metric: 'Sistem Kullanım Oranı',
        currentValue: Math.round(currentUsageRate * 100),
        predictedValue: Math.round(Math.max(0, Math.min(100, currentUsageRate * 100 * (1 + trend)))),
        confidence: 0.60,
        trend: trend > 0.05 ? 'UP' : trend < -0.05 ? 'DOWN' : 'STABLE',
        timeframe: '1 ay',
        factors: [
          'Kullanıcı aktivite sıklığı',
          'Sistem performansı',
          'Kullanıcı memnuniyeti'
        ],
        recommendations: [
          'Kullanıcı aktivitesini artırmak için gamification özellikleri eklenmeli',
          'Sistem performansı optimize edilmeli'
        ]
      };
    } catch (error) {
      this.logger.error('Sistem kullanım tahmini hatası:', error);
      throw error;
    }
  }

  private calculateMonthlySuccessRates(students: any[]): number[] {
    const monthlyData: { [key: string]: { total: number; success: number } } = {};
    
    students.forEach(student => {
      const month = student.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { total: 0, success: 0 };
      }
      monthlyData[month].total++;
      if (student.gpa && student.gpa >= 3.0) {
        monthlyData[month].success++;
      }
    });

    return Object.values(monthlyData).map(data => 
      data.total > 0 ? data.success / data.total : 0
    );
  }

  private calculateMonthlyRegistrations(registrations: any[]): number[] {
    const monthlyData: { [key: string]: number } = {};
    
    registrations.forEach(reg => {
      const month = reg.createdAt.toISOString().substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    return Object.values(monthlyData);
  }

  private async calculateDailyActivity(since: Date): Promise<number[]> {
    const dailyData: number[] = [];
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(since);
      date.setDate(date.getDate() + i);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = await (this.prisma as any).user.count({
        where: {
          lastActiveAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });
      
      dailyData.push(count);
    }
    
    return dailyData;
  }

  private calculateTrend(data: number[]): number {
    if (data.length < 2) return 0;
    
    // Basit lineer regresyon
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private calculateEnrollmentTrend(courses: any[]): number {
    if (courses.length < 2) return 0;
    
    const enrollments = courses.map(c => c.enrollmentCount);
    return this.calculateTrend(enrollments);
  }

  async getPredictions(): Promise<{
    success: boolean;
    data: PredictionResult[];
  }> {
    try {
      const predictions = await Promise.all([
        this.predictStudentSuccess(),
        this.predictCoursePopularity(),
        this.predictRegistrationTrend(),
        this.predictSystemUsage(),
      ]);

      return {
        success: true,
        data: predictions,
      };
    } catch (error) {
      this.logger.error('Tahmin getirme hatası:', error);
      return {
        success: false,
        data: [],
      };
    }
  }

  async getPredictionHistory(): Promise<{
    success: boolean;
    data: any[];
  }> {
    try {
      // Gelecekte PredictionHistory tablosu eklenebilir
      return {
        success: true,
        data: [],
      };
    } catch (error) {
      this.logger.error('Tahmin geçmişi getirme hatası:', error);
      return {
        success: false,
        data: [],
      };
    }
  }
}
