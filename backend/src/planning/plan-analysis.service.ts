import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PlanAnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Plan ilerlemesini hesaplar
   */
  calculatePlanProgress(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    const completed = sessions.filter(s => s.isCompleted).length;
    return Math.round((completed / sessions.length) * 100);
  }

  /**
   * Bir sonraki çalışma seansını bulur
   */
  getNextSession(sessions: any[]) {
    const now = new Date();
    const upcomingSessions = sessions
      .filter(s => !s.isCompleted && new Date(s.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    return upcomingSessions[0] || null;
  }

  /**
   * Plan analitiklerini hesaplar
   */
  async getPlanAnalytics(planId: string) {
    const sessions = await this.prisma.studySession.findMany({
      where: { planId },
    });

    const completed = sessions.filter(s => s.isCompleted);
    const avgPerformance = completed.length > 0 ? 
      completed.reduce((sum, s) => sum + (s.performance || 0), 0) / completed.length : 0;

    return {
      completionRate: sessions.length > 0 ? (completed.length / sessions.length) * 100 : 0,
      averagePerformance: Math.round(avgPerformance),
      totalStudyTime: completed.reduce((sum, s) => sum + s.duration, 0),
      streakDays: this.calculateStreakDays(completed),
      subjectBreakdown: this.getSubjectBreakdown(sessions),
    };
  }

  // Materialized view: user_weekly_stats_mv (Aşama 2)
  async ensureWeeklyStatsMV() {
    // Not: Prisma migrate yerine runtime safeguard; prod’da migration tercih edilir
    await (this.prisma as any).$executeRawUnsafe(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS user_weekly_stats_mv AS
      SELECT
        ss."userId" as user_id,
        date_trunc('week', ss."startTime")::date as week_start,
        COUNT(*) FILTER (WHERE ss."isCompleted" = true) as completed_sessions,
        COUNT(*) as total_sessions,
        COALESCE(SUM(ss."duration"),0) as total_minutes
      FROM "StudySession" ss
      GROUP BY 1,2;
      CREATE INDEX IF NOT EXISTS idx_user_weekly_stats_mv_user_week ON user_weekly_stats_mv(user_id, week_start);
    `);
  }

  async refreshWeeklyStatsMV() {
    await (this.prisma as any).$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY user_weekly_stats_mv');
  }

  async getWeeklyStatsFromMV(userId: string, weeksBack = 1) {
    await this.ensureWeeklyStatsMV();
    const rows = await (this.prisma as any).$queryRawUnsafe(
      `SELECT * FROM user_weekly_stats_mv WHERE user_id = $1 ORDER BY week_start DESC LIMIT $2`,
      userId,
      weeksBack
    );
    return rows;
  }

  /**
   * Streak günlerini hesaplar
   */
  private calculateStreakDays(sessions: any[]): number {
    if (sessions.length === 0) return 0;

    const dates = [...new Set(sessions.map(s => 
      new Date(s.createdAt).toISOString().split('T')[0]
    ))].sort();

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const current = new Date(dates[i]);
      const previous = new Date(dates[i-1]);
      const diffDays = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Ders bazlı analiz yapar
   */
  private getSubjectBreakdown(sessions: any[]) {
    const breakdown: Record<string, any> = {};
    
    sessions.forEach(session => {
      if (!breakdown[session.subject]) {
        breakdown[session.subject] = {
          total: 0,
          completed: 0,
          totalTime: 0,
          completedTime: 0,
          avgPerformance: 0,
        };
      }
      
      breakdown[session.subject].total++;
      breakdown[session.subject].totalTime += session.duration;
      
      if (session.isCompleted) {
        breakdown[session.subject].completed++;
        breakdown[session.subject].completedTime += session.duration;
        breakdown[session.subject].avgPerformance += session.performance || 0;
      }
    });

    Object.keys(breakdown).forEach(subject => {
      const data = breakdown[subject];
      data.completionRate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
      data.avgPerformance = data.completed > 0 ? data.avgPerformance / data.completed : 0;
    });

    return breakdown;
  }

  /**
   * Plan önerilerini oluşturur
   */
  async getPlanRecommendations(plan: any) {
    const recommendations = [];
    const progress = this.calculatePlanProgress(plan.sessions);

    if (progress < 30) {
      recommendations.push({
        type: 'motivation',
        title: 'Motivasyonu Artır',
        description: 'Küçük hedefler koyarak başlayın',
        priority: 'high',
      });
    }

    if (progress > 80) {
      recommendations.push({
        type: 'advancement',
        title: 'İleri Seviye',
        description: 'Daha zor konulara geçmeyi düşünün',
        priority: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * Kullanıcı bağlamını analiz eder (N+1 problemi çözülmüş versiyon)
   */
  async analyzeUserContext(userId: string) {
    // Tek sorgu ile tüm ilgili verileri çek
    const userWithData = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studySessions: {
          orderBy: { createdAt: 'desc' },
          take: 200,
        },
        quizzes: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        examResults: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        plans: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            studySessions: true,
          },
        },
      },
    });

    if (!userWithData) {
      throw new Error('User not found');
    }

    const { studySessions, quizzes, examResults, plans } = userWithData;

    // 1) Performans geçmişi (deneme netleri ve konu bazlı başarı)
    const subjectPerformance = this.analyzeSubjectPerformance(studySessions, quizzes, examResults);
    const topicSuccessRates: Record<string, number> = {};
    const topicBuckets: Record<string, number[]> = {};
    
    quizzes.forEach((q: any) => {
      const key = (q.topic || q.subject || 'Genel').toString();
      const scorePct = q.totalScore && q.totalScore > 0 ? (q.score / q.totalScore) * 100 : 0;
      if (!topicBuckets[key]) topicBuckets[key] = [];
      topicBuckets[key].push(scorePct);
    });
    
    examResults.forEach((e: any) => {
      const key = (e.topic || e.subject || 'Genel').toString();
      const scorePct = e.totalScore && e.totalScore > 0 ? (e.score / e.totalScore) * 100 : 0;
      if (!topicBuckets[key]) topicBuckets[key] = [];
      topicBuckets[key].push(scorePct);
    });
    
    Object.keys(topicBuckets).forEach((k) => {
      const scores = topicBuckets[k];
      topicSuccessRates[k] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    });

    // 2) Çalışma alışkanlıkları
    const studyHabits = this.analyzeStudyHabits(studySessions);
    
    // 3) Zayıf ve güçlü alanlar
    const weakAreas = this.identifyWeakAreas(topicSuccessRates, subjectPerformance);
    const strongAreas = this.identifyStrongAreas(topicSuccessRates, subjectPerformance);

    return {
      subjectPerformance,
      topicSuccessRates,
      studyHabits,
      weakAreas,
      strongAreas,
      preferredStudyHours: studyHabits.preferredHours,
      subjectTimeAllocation: studyHabits.timeAllocation,
    };
  }

  /**
   * Ders performansını analiz eder
   */
  private calculateSubjectAverages(performance: Record<string, number[]>): Record<string, number> {
    const averages: Record<string, number> = {};
    Object.keys(performance).forEach(subject => {
      const scores = performance[subject];
      averages[subject] = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    });
    return averages;
  }

  private analyzeSubjectPerformance(studySessions: any[], quizResults: any[], examResults: any[]) {
    const performance: Record<string, number[]> = {};
    
    // Study sessions'dan performans çıkar
    studySessions.forEach(session => {
      if (session.subject && session.performance) {
        if (!performance[session.subject]) {
          performance[session.subject] = [];
        }
        performance[session.subject].push(session.performance);
      }
    });

    // Quiz sonuçlarından performans çıkar
    quizResults.forEach(quiz => {
      if (quiz.subject && quiz.totalScore > 0) {
        const score = (quiz.score / quiz.totalScore) * 100;
        if (!performance[quiz.subject]) {
          performance[quiz.subject] = [];
        }
        performance[quiz.subject].push(score);
      }
    });

    // Exam sonuçlarından performans çıkar
    examResults.forEach(exam => {
      if (exam.subject && exam.totalScore > 0) {
        const score = (exam.score / exam.totalScore) * 100;
        if (!performance[exam.subject]) {
          performance[exam.subject] = [];
        }
        performance[exam.subject].push(score);
      }
    });

    // Ortalama performansları hesapla
    const averages: Record<string, number> = {};
    Object.keys(performance).forEach(subject => {
      const scores = performance[subject];
      averages[subject] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });

    return averages;
  }

  /**
   * Çalışma alışkanlıklarını analiz eder
   */
  private analyzeStudyHabits(studySessions: any[]) {
    const hourCounts: Record<number, number> = {};
    const subjectTime: Record<string, number> = {};
    const sessionDurations: number[] = [];

    studySessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      
      if (session.subject) {
        subjectTime[session.subject] = (subjectTime[session.subject] || 0) + session.duration;
      }
      
      sessionDurations.push(session.duration);
    });

    // En çok çalışılan saatleri bul
    const preferredHours = Object.keys(hourCounts)
      .map(hour => parseInt(hour))
      .sort((a, b) => hourCounts[b] - hourCounts[a])
      .slice(0, 3)
      .map(hour => {
        if (hour < 6) return 'Gece';
        if (hour < 12) return 'Sabah';
        if (hour < 18) return 'Öğleden sonra';
        return 'Akşam';
      });

    return {
      preferredHours,
      timeAllocation: subjectTime,
      averageSessionDuration: sessionDurations.length > 0 
        ? sessionDurations.reduce((sum, dur) => sum + dur, 0) / sessionDurations.length 
        : 0,
    };
  }

  /**
   * Zayıf alanları tespit eder
   */
  private identifyWeakAreas(topicSuccessRates: Record<string, number>, subjectPerformance: Record<string, number>): string[] {
    const weakAreas: string[] = [];
    
    Object.entries(topicSuccessRates).forEach(([topic, rate]) => {
      if (rate < 60) {
        weakAreas.push(topic);
      }
    });

    Object.entries(subjectPerformance).forEach(([subject, performance]) => {
      if (performance < 60) {
        weakAreas.push(subject);
      }
    });

    return [...new Set(weakAreas)];
  }

  /**
   * Güçlü alanları tespit eder
   */
  private identifyStrongAreas(topicSuccessRates: Record<string, number>, subjectPerformance: Record<string, number>): string[] {
    const strongAreas: string[] = [];
    
    Object.entries(topicSuccessRates).forEach(([topic, rate]) => {
      if (rate >= 80) {
        strongAreas.push(topic);
      }
    });

    Object.entries(subjectPerformance).forEach(([subject, performance]) => {
      if (performance >= 80) {
        strongAreas.push(subject);
      }
    });

    return [...new Set(strongAreas)];
  }
}
