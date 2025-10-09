import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { AIService } from '../ai/ai.service';
import { PromptRegistry } from '../ai/prompt-registry.service'; // DÜZELTME: doğru sınıf adı
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface PerformanceAnalysis {
  id: string;
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  overallScore: number; // 1-10 scale
  strengths: string[];
  weaknesses: string[];
  recommendations: {
    focusAreas: string[];
    studyMethods: string[];
    timeManagement: string[];
    motivation: string[];
  };
  trends: {
    performance: 'improving' | 'stable' | 'declining';
    consistency: 'high' | 'medium' | 'low';
    engagement: 'high' | 'medium' | 'low';
  };
  insights: {
    bestStudyTime: string;
    mostEffectiveSubjects: string[];
    productivityPatterns: string[];
    learningStyle: string;
  };
  aiAnalysis: {
    summary: string;
    detailedAnalysis: string;
    actionPlan: string[];
    nextWeekFocus: string;
  };
  createdAt: Date;
}

export interface WeeklyProgressReport {
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  totalStudyTime: number; // minutes
  completedSessions: number;
  averageScore: number;
  subjectsStudied: string[];
  achievements: string[];
  challenges: string[];
  recommendations: string[];
  nextWeekGoals: string[];
  aiInsights: string;
}

export interface PerformanceMetrics {
  userId: string;
  period: string;
  studyTime: number;
  sessionsCompleted: number;
  averageScore: number;
  consistency: number;
  improvement: number;
  engagement: number;
  focus: number;
  retention: number;
}

@Injectable()
export class ProgressAnalyzerService implements OnModuleInit {
  private readonly logger = new Logger(ProgressAnalyzerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly aiService: AIService,
    private readonly promptRegistry: PromptRegistry, // DÜZELTME
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('ProgressAnalyzerService initialized');
  }

  /**
   * Haftalık performans analizi oluştur
   */
  async generateWeeklyAnalysis(userId: string, weekStart: Date): Promise<PerformanceAnalysis | null> {
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Performans verilerini al
      const performanceData = await this.getPerformanceData(userId, weekStart, weekEnd);
      
      if (!performanceData || performanceData.sessions.length === 0) {
        this.logger.warn(`No performance data found for user ${userId} for week ${weekStart.toISOString()}`);
        return null;
      }

      // AI ile analiz oluştur
      const aiAnalysis = await this.generateAIAnalysis(userId, performanceData);
      
      // Analiz sonucunu oluştur
      const analysis: PerformanceAnalysis = {
        id: `analysis_${userId}_${weekStart.getTime()}`,
        userId,
        period: 'weekly',
        startDate: weekStart,
        endDate: weekEnd,
        overallScore: this.calculateOverallScore(performanceData),
        strengths: this.identifyStrengths(performanceData),
        weaknesses: this.identifyWeaknesses(performanceData),
        recommendations: this.generateRecommendations(performanceData, aiAnalysis),
        trends: this.analyzeTrends(performanceData),
        insights: this.generateInsights(performanceData),
        aiAnalysis,
        createdAt: new Date(),
      };

      // Veritabanına kaydet
      await this.saveAnalysis(analysis);

      // Event emit
      this.eventEmitter.emit('analysis.completed', {
        userId,
        analysisId: analysis.id,
        period: 'weekly',
        overallScore: analysis.overallScore,
      });

      this.logger.log(`Weekly analysis generated for user ${userId}`);
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to generate weekly analysis: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Günlük performans analizi oluştur
   */
  async generateDailyAnalysis(userId: string, date: Date): Promise<PerformanceAnalysis | null> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const performanceData = await this.getPerformanceData(userId, startOfDay, endOfDay);
      
      if (!performanceData || performanceData.sessions.length === 0) {
        return null;
      }

      const aiAnalysis = await this.generateAIAnalysis(userId, performanceData);
      
      const analysis: PerformanceAnalysis = {
        id: `analysis_${userId}_${date.getTime()}`,
        userId,
        period: 'daily',
        startDate: startOfDay,
        endDate: endOfDay,
        overallScore: this.calculateOverallScore(performanceData),
        strengths: this.identifyStrengths(performanceData),
        weaknesses: this.identifyWeaknesses(performanceData),
        recommendations: this.generateRecommendations(performanceData, aiAnalysis),
        trends: this.analyzeTrends(performanceData),
        insights: this.generateInsights(performanceData),
        aiAnalysis,
        createdAt: new Date(),
      };

      await this.saveAnalysis(analysis);
      
      this.logger.log(`Daily analysis generated for user ${userId}`);
      return analysis;
    } catch (error) {
      this.logger.error(`Failed to generate daily analysis: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Haftalık ilerleme raporu oluştur
   */
  async generateWeeklyReport(userId: string, weekStart: Date): Promise<WeeklyProgressReport | null> {
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const performanceData = await this.getPerformanceData(userId, weekStart, weekEnd);
      
      if (!performanceData) {
        return null;
      }

      const report: WeeklyProgressReport = {
        userId,
        weekStart,
        weekEnd,
        totalStudyTime: this.calculateTotalStudyTime(performanceData),
        completedSessions: performanceData.sessions.length,
        averageScore: this.calculateAverageScore(performanceData),
        subjectsStudied: this.getSubjectsStudied(performanceData),
        achievements: this.identifyAchievements(performanceData),
        challenges: this.identifyChallenges(performanceData),
        recommendations: this.generateWeeklyRecommendations(performanceData),
        nextWeekGoals: this.generateNextWeekGoals(performanceData),
        aiInsights: await this.generateAIInsights(userId, performanceData),
      };

      // Veritabanına kaydet
      await this.saveWeeklyReport(report);

      this.logger.log(`Weekly report generated for user ${userId}`);
      return report;
    } catch (error) {
      this.logger.error(`Failed to generate weekly report: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Performans verilerini al
   */
  private async getPerformanceData(userId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      // Study sessions
      const sessions = await (this.prisma as any).studySession.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          plan: true,
        },
      });

      // Performance history
      const performanceHistory = await (this.prisma as any).studentPerformanceHistory.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Study goals
      const goals = await (this.prisma as any).studyGoal.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Achievements
      const achievements = await (this.prisma as any).achievement.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      return {
        sessions,
        performanceHistory,
        goals,
        achievements,
        period: {
          start: startDate,
          end: endDate,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get performance data: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * AI analizi oluştur
   */
  private async generateAIAnalysis(userId: string, performanceData: any): Promise<any> {
    try {
      const prompt = await this.promptRegistry.getPrompt('progress_analysis', {
        userId,
        performanceData: JSON.stringify(performanceData),
        period: performanceData.period,
        sessionsCount: performanceData.sessions.length,
        totalStudyTime: this.calculateTotalStudyTime(performanceData),
        averageScore: this.calculateAverageScore(performanceData),
      });

      const aiResponse = await this.aiService.generateContent({
        // DÜZELTME: AIRequestOptions yerine AIRequest kullanıldı
        prompt,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        userId,
      });

      return JSON.parse(aiResponse.content); // DÜZELTME: string içerik parse
    } catch (error) {
      this.logger.error(`Failed to generate AI analysis: ${error instanceof Error ? error.message : "Unknown error"}`);
      return {
        summary: 'Analysis completed',
        detailedAnalysis: 'Detailed analysis not available',
        actionPlan: ['Continue current study pattern'],
        nextWeekFocus: 'Maintain current performance',
      };
    }
  }

  /**
   * Genel skor hesapla
   */
  private calculateOverallScore(performanceData: any): number {
    const sessions = performanceData.sessions;
    if (sessions.length === 0) return 5;

    const averageScore = sessions.reduce((sum: number, session: any) => sum + (session.score || 0), 0) / sessions.length;
    const consistency = this.calculateConsistency(sessions);
    const engagement = this.calculateEngagement(sessions);
    
    return Math.round((averageScore + consistency + engagement) / 3);
  }

  /**
   * Tutarlılık hesapla
   */
  private calculateConsistency(sessions: any[]): number {
    if (sessions.length < 2) return 5;
    
    const scores = sessions.map((s: any) => s.score || 0); // DÜZELTME: tip eklendi
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum: number, score: number) => sum + Math.pow(score - mean, 2), 0) / scores.length; // DÜZELTME
    const standardDeviation = Math.sqrt(variance);
    
    // Düşük standart sapma = yüksek tutarlılık
    return Math.max(1, Math.min(10, 10 - standardDeviation));
  }

  /**
   * Katılım hesapla
   */
  private calculateEngagement(sessions: any[]): number {
    if (sessions.length === 0) return 5;
    
    const totalTime = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const averageSessionTime = totalTime / sessions.length;
    
    // Uzun ortalama session süresi = yüksek katılım
    return Math.min(10, Math.max(1, averageSessionTime / 10));
  }

  /**
   * Güçlü yönleri belirle
   */
  private identifyStrengths(performanceData: any): string[] {
    const strengths: string[] = [];
    const sessions = performanceData.sessions;
    
    if (sessions.length === 0) return strengths;
    
    const averageScore = this.calculateAverageScore(performanceData);
    const consistency = this.calculateConsistency(sessions);
    const totalTime = this.calculateTotalStudyTime(performanceData);
    
    if (averageScore >= 8) strengths.push('High performance scores');
    if (consistency >= 8) strengths.push('Consistent study habits');
    if (totalTime >= 300) strengths.push('Dedicated study time');
    if (sessions.length >= 5) strengths.push('Regular study sessions');
    
    return strengths;
  }

  /**
   * Zayıf yönleri belirle
   */
  private identifyWeaknesses(performanceData: any): string[] {
    const weaknesses: string[] = [];
    const sessions = performanceData.sessions;
    
    if (sessions.length === 0) return ['No study sessions completed'];
    
    const averageScore = this.calculateAverageScore(performanceData);
    const consistency = this.calculateConsistency(sessions);
    const totalTime = this.calculateTotalStudyTime(performanceData);
    
    if (averageScore < 6) weaknesses.push('Low performance scores');
    if (consistency < 6) weaknesses.push('Inconsistent study habits');
    if (totalTime < 120) weaknesses.push('Limited study time');
    if (sessions.length < 3) weaknesses.push('Infrequent study sessions');
    
    return weaknesses;
  }

  /**
   * Öneriler oluştur
   */
  private generateRecommendations(performanceData: any, aiAnalysis: any): any {
    const recommendations: any = {
      focusAreas: [],
      studyMethods: [],
      timeManagement: [],
      motivation: [],
    };

    const sessions = performanceData.sessions;
    const averageScore = this.calculateAverageScore(performanceData);
    const consistency = this.calculateConsistency(sessions);

    // Focus areas
    if (averageScore < 7) {
      recommendations.focusAreas.push('Improve understanding of difficult topics');
    }
    if (consistency < 7) {
      recommendations.focusAreas.push('Develop consistent study schedule');
    }

    // Study methods
    if (averageScore < 7) {
      recommendations.studyMethods.push('Try different learning techniques');
      recommendations.studyMethods.push('Break down complex topics into smaller parts');
    }

    // Time management
    const totalTime = this.calculateTotalStudyTime(performanceData);
    if (totalTime < 180) {
      recommendations.timeManagement.push('Increase daily study time');
    }

    // Motivation
    if (sessions.length < 3) {
      recommendations.motivation.push('Set achievable daily goals');
      recommendations.motivation.push('Track progress to stay motivated');
    }

    return recommendations;
  }

  /**
   * Trend analizi
   */
  private analyzeTrends(performanceData: any): any {
    const sessions = performanceData.sessions;
    if (sessions.length < 2) {
      return {
        performance: 'stable',
        consistency: 'medium',
        engagement: 'medium',
      };
    }

    const scores = sessions.map((s: any) => s.score || 0); // DÜZELTME
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum: number, score: number) => sum + score, 0) / firstHalf.length; // DÜZELTME
    const secondHalfAvg = secondHalf.reduce((sum: number, score: number) => sum + score, 0) / secondHalf.length; // DÜZELTME
    
    let performance: 'improving' | 'stable' | 'declining' = 'stable';
    if (secondHalfAvg > firstHalfAvg + 1) performance = 'improving';
    else if (secondHalfAvg < firstHalfAvg - 1) performance = 'declining';

    const consistency = this.calculateConsistency(sessions);
    const engagement = this.calculateEngagement(sessions);

    return {
      performance,
      consistency: consistency >= 8 ? 'high' : consistency >= 6 ? 'medium' : 'low',
      engagement: engagement >= 8 ? 'high' : engagement >= 6 ? 'medium' : 'low',
    };
  }

  /**
   * İçgörüler oluştur
   */
  private generateInsights(performanceData: any): any {
    const sessions = performanceData.sessions;
    
    // En iyi çalışma zamanı
    const hourCounts: Record<number, number> = {};
    sessions.forEach((session: any) => { // DÜZELTME
      const hour = new Date(session.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const bestHour = Object.entries(hourCounts).reduce((a, b) => hourCounts[Number(a[0])] > hourCounts[Number(b[0])] ? a : b)[0];
    const bestStudyTime = this.getTimeOfDay(Number(bestHour));

    // En etkili konular
    const subjectScores: Record<string, number[]> = {};
    sessions.forEach((session: any) => { // DÜZELTME
      const subject = session.plan?.subject || 'Unknown';
      if (!subjectScores[subject]) subjectScores[subject] = [];
      subjectScores[subject].push(session.score || 0);
    });

    const mostEffectiveSubjects = Object.entries(subjectScores)
      .map(([subject, scores]) => ({
        subject,
        averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 3)
      .map(item => item.subject);

    return {
      bestStudyTime,
      mostEffectiveSubjects,
      productivityPatterns: ['Morning sessions show higher performance'],
      learningStyle: 'Visual and hands-on learning preferred',
    };
  }

  /**
   * AI içgörüleri oluştur
   */
  private async generateAIInsights(userId: string, performanceData: any): Promise<string> {
    try {
      const prompt = await this.promptRegistry.getPrompt('weekly_insights', {
        userId,
        performanceData: JSON.stringify(performanceData),
        totalStudyTime: this.calculateTotalStudyTime(performanceData),
        averageScore: this.calculateAverageScore(performanceData),
        sessionsCount: performanceData.sessions.length,
      });

      const aiResponse = await this.aiService.generateContent({
        // DÜZELTME
        prompt,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 500,
        userId,
      });

      return aiResponse.content; // DÜZELTME: string döndür
    } catch (error) {
      this.logger.error(`Failed to generate AI insights: ${error instanceof Error ? error.message : "Unknown error"}`);
      return 'AI insights not available at this time.';
    }
  }

  /**
   * Yardımcı metodlar
   */
  private calculateTotalStudyTime(performanceData: any): number {
    return performanceData.sessions.reduce((sum: number, session: any) => sum + (session.duration || 0), 0);
  }

  private calculateAverageScore(performanceData: any): number {
    const sessions = performanceData.sessions;
    if (sessions.length === 0) return 0;
    return sessions.reduce((sum: number, session: any) => sum + (session.score || 0), 0) / sessions.length;
  }

  private getSubjectsStudied(performanceData: any): string[] {
    const subjects = new Set<string>();
    performanceData.sessions.forEach((session: any) => {
      if (session.plan?.subject) {
        subjects.add(session.plan.subject);
      }
    });
    return Array.from(subjects);
  }

  private identifyAchievements(performanceData: any): string[] {
    return performanceData.achievements.map((achievement: any) => achievement.title);
  }

  private identifyChallenges(performanceData: any): string[] {
    const challenges: string[] = [];
    const averageScore = this.calculateAverageScore(performanceData);
    
    if (averageScore < 6) {
      challenges.push('Difficulty with current study material');
    }
    
    return challenges;
  }

  private generateWeeklyRecommendations(performanceData: any): string[] {
    const recommendations: string[] = [];
    const averageScore = this.calculateAverageScore(performanceData);
    const totalTime = this.calculateTotalStudyTime(performanceData);
    
    if (averageScore < 7) {
      recommendations.push('Focus on understanding difficult concepts');
    }
    
    if (totalTime < 300) {
      recommendations.push('Increase study time for better results');
    }
    
    return recommendations;
  }

  private generateNextWeekGoals(performanceData: any): string[] {
    const goals: string[] = [];
    const averageScore = this.calculateAverageScore(performanceData);
    
    if (averageScore < 8) {
      goals.push('Improve average score to 8+');
    }
    
    goals.push('Maintain consistent study schedule');
    goals.push('Complete all planned study sessions');
    
    return goals;
  }

  private getTimeOfDay(hour: number): string {
    if (hour < 6) return 'Late night';
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  }

  private async saveAnalysis(analysis: PerformanceAnalysis): Promise<void> {
    try {
      await (this.prisma as any).performanceAnalysis.create({
        data: {
          id: analysis.id,
          userId: analysis.userId,
          period: analysis.period,
          startDate: analysis.startDate,
          endDate: analysis.endDate,
          overallScore: analysis.overallScore,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          recommendations: analysis.recommendations,
          trends: analysis.trends,
          insights: analysis.insights,
          aiAnalysis: analysis.aiAnalysis,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save analysis: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async saveWeeklyReport(report: WeeklyProgressReport): Promise<void> {
    try {
      await (this.prisma as any).weeklyProgressReport.create({
        data: {
          userId: report.userId,
          weekStart: report.weekStart,
          weekEnd: report.weekEnd,
          totalStudyTime: report.totalStudyTime,
          completedSessions: report.completedSessions,
          averageScore: report.averageScore,
          subjectsStudied: report.subjectsStudied,
          achievements: report.achievements,
          challenges: report.challenges,
          recommendations: report.recommendations,
          nextWeekGoals: report.nextWeekGoals,
          aiInsights: report.aiInsights,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save weekly report: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Haftalık analiz cron job
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM) // DÜZELTME: Geçerli cron enum değeri
  async generateWeeklyAnalyses(): Promise<void> {
    try {
      const lastMonday = new Date();
      lastMonday.setDate(lastMonday.getDate() - lastMonday.getDay() + 1);
      lastMonday.setHours(0, 0, 0, 0);

      // Tüm aktif kullanıcılar için haftalık analiz oluştur
      const users = await (this.prisma as any).user.findMany({
        where: {
          role: 'STUDENT',
        },
        select: { id: true },
      });

      for (const user of users) {
        await this.generateWeeklyAnalysis(user.id, lastMonday);
      }

      this.logger.log(`Weekly analyses generated for ${users.length} users`);
    } catch (error) {
      this.logger.error(`Failed to generate weekly analyses: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Health check
   */
  getHealthStatus(): { status: 'healthy' | 'unhealthy' } {
    return { status: 'healthy' };
  }
}
