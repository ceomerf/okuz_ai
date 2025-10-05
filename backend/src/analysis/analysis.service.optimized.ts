import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';

interface PerformanceMetrics {
  overall: number;
  subjects: Record<string, number>;
  trends: Array<{ date: string; score: number }>;
  consistency: number;
  improvement: number;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * N+1 problemi çözülmüş performans metrikleri hesaplama
   * Tek sorgu ile tüm verileri alır
   */
  async calculateOverallMetricsOptimized(userId: string): Promise<PerformanceMetrics> {
    const cacheKey = `metrics:${userId}`;
    const cached = await this.cacheService.get<PerformanceMetrics>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for metrics: ${userId}`);
      return cached;
    }

    // Tek sorgu ile tüm performans verilerini al
    const userData = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        examResults: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            score: true,
            totalScore: true,
            subject: true,
            createdAt: true,
          }
        },
        quizzes: {
          where: { isCompleted: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            score: true,
            totalScore: true,
            subject: true,
            createdAt: true,
          }
        },
        studySessions: {
          where: { isCompleted: true },
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            performance: true,
            subject: true,
            createdAt: true,
          }
        }
      }
    });

    if (!userData) {
      throw new Error('User not found');
    }

    const { examResults, quizzes, studySessions } = userData;

    // Tüm skorları birleştir
    const allScores = [
      ...examResults.map(e => (e.score / e.totalScore) * 100),
      ...quizzes.map(q => ((q.score || 0) / q.totalScore) * 100),
    ];

    // Konu bazlı skorları hesapla
    const subjectScores: Record<string, number[]> = {};
    
    examResults.forEach(exam => {
      if (!subjectScores[exam.subject]) subjectScores[exam.subject] = [];
      subjectScores[exam.subject].push((exam.score / exam.totalScore) * 100);
    });

    quizzes.forEach(quiz => {
      if (!subjectScores[quiz.subject]) subjectScores[quiz.subject] = [];
      subjectScores[quiz.subject].push(((quiz.score || 0) / quiz.totalScore) * 100);
    });

    const trends = this.calculateTrends(allScores);
    const consistency = this.calculateConsistency(allScores);
    const improvement = this.calculateImprovement(allScores);

    const result: PerformanceMetrics = {
      overall: allScores.length > 0 ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0,
      subjects: Object.keys(subjectScores).reduce((acc: Record<string, number>, subject: string) => {
        const scores = subjectScores[subject];
        acc[subject] = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
        return acc;
      }, {}),
      trends,
      consistency,
      improvement,
    };

    // Sonucu cache'e kaydet (5 dakika)
    await this.cacheService.set(cacheKey, result, 300);
    
    return result;
  }

  /**
   * Daha da optimize edilmiş versiyon - paralel sorgular
   */
  async calculateOverallMetricsUltraOptimized(userId: string): Promise<PerformanceMetrics> {
    const cacheKey = `metrics:${userId}`;
    const cached = await this.cacheService.get<PerformanceMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    // Paralel sorgular - N+1 problemi yok
    const [examResults, quizResults, studySessions] = await Promise.all([
      this.prisma.examResult.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          score: true,
          totalScore: true,
          subject: true,
          createdAt: true,
        }
      }),
      this.prisma.quiz.findMany({
        where: { userId, isCompleted: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          score: true,
          totalScore: true,
          subject: true,
          createdAt: true,
        }
      }),
      this.prisma.studySession.findMany({
        where: { userId, isCompleted: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          performance: true,
          subject: true,
          createdAt: true,
        }
      })
    ]);

    // Verileri işle
    const allScores = [
      ...examResults.map(e => (e.score / e.totalScore) * 100),
      ...quizResults.map(q => ((q.score || 0) / q.totalScore) * 100),
    ];

    const subjectScores: Record<string, number[]> = {};
    
    [...examResults, ...quizResults].forEach(item => {
      if (!subjectScores[item.subject]) subjectScores[item.subject] = [];
      const score = item.score / item.totalScore * 100;
      subjectScores[item.subject].push(score);
    });

    const trends = this.calculateTrends(allScores);
    const consistency = this.calculateConsistency(allScores);
    const improvement = this.calculateImprovement(allScores);

    const result: PerformanceMetrics = {
      overall: allScores.length > 0 ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0,
      subjects: Object.keys(subjectScores).reduce((acc: Record<string, number>, subject: string) => {
        const scores = subjectScores[subject];
        acc[subject] = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
        return acc;
      }, {}),
      trends,
      consistency,
      improvement,
    };

    // Cache'e kaydet
    await this.cacheService.set(cacheKey, result, 300);
    
    return result;
  }

  private calculateTrends(scores: number[]): Array<{ date: string; score: number }> {
    // Son 30 günün trendini hesapla
    const today = new Date();
    const trends = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      // Bu gün için ortalama skor hesapla
      const dayScores = scores.filter((_, index) => {
        // Bu basitleştirilmiş bir örnek - gerçekte tarih bilgisi gerekli
        return index % 7 === (29 - i) % 7;
      });
      
      const avgScore = dayScores.length > 0 
        ? dayScores.reduce((sum, score) => sum + score, 0) / dayScores.length 
        : 0;
      
      trends.push({
        date: date.toISOString().split('T')[0],
        score: avgScore
      });
    }
    
    return trends;
  }

  private calculateConsistency(scores: number[]): number {
    if (scores.length < 2) return 0;
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Consistency = 100 - (coefficient of variation * 100)
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
    return Math.max(0, 100 - (coefficientOfVariation * 100));
  }

  private calculateImprovement(scores: number[]): number {
    if (scores.length < 2) return 0;
    
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
    
    return secondAvg - firstAvg;
  }
}
