import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService } from '../cache/cache.service';

export interface BatchQueryOptions {
  batchSize?: number;
  cache?: boolean;
  cacheTTL?: number;
}

export interface OptimizedUserData {
  id: string;
  name: string;
  email: string;
  studentProfile?: {
    grade: number;
    field: string;
  };
  studySessions: Array<{
    id: string;
    subject: string;
    topic: string;
    startTime: Date;
    duration: number;
    isCompleted: boolean;
    performance?: number;
  }>;
  quizzes: Array<{
    id: string;
    topic: string;
    score: number;
    totalScore: number;
    createdAt: Date;
  }>;
  examResults: Array<{
    id: string;
    subject: string;
    topic: string;
    score: number;
    totalScore: number;
    examType: string;
    createdAt: Date;
  }>;
  plans: Array<{
    id: string;
    title: string;
    subjects: string[];
    isActive: boolean;
    sessions: Array<{
      id: string;
      subject: string;
      topic: string;
      startTime: Date;
      duration: number;
    }>;
  }>;
}

@Injectable()
export class OptimizedQueryService {
  private readonly logger = new Logger(OptimizedQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * N+1 problemi çözülmüş kullanıcı verilerini getir
   */
  async getUserWithAllData(userId: string, options: BatchQueryOptions = {}): Promise<OptimizedUserData | null> {
    const cacheKey = `user:${userId}:all_data`;
    
    // Cache kontrolü
    if (options.cache !== false) {
      const cached = await this.cache.get<OptimizedUserData>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for user: ${userId}`);
        return cached;
      }
    }

    try {
      // Tek sorgu ile tüm verileri çek
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          studentProfile: {
            select: {
              grade: true,
              field: true,
            },
          },
          studySessions: {
            orderBy: { startTime: 'desc' },
            take: 200,
            select: {
              id: true,
              subject: true,
              topic: true,
              startTime: true,
              duration: true,
              isCompleted: true,
              performance: true,
            },
          },
          quizzes: {
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
              id: true,
              topic: true,
              score: true,
              totalScore: true,
              createdAt: true,
            },
          },
          examResults: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
              id: true,
              subject: true,
              topic: true,
              score: true,
              totalScore: true,
              examType: true,
              createdAt: true,
            },
          },
          plans: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              title: true,
              subjects: true,
              isActive: true,
              studySessions: {
                orderBy: { startTime: 'asc' },
                select: {
                  id: true,
                  subject: true,
                  topic: true,
                  startTime: true,
                  duration: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      // Cache'e kaydet
      if (options.cache !== false) {
        const cacheTTL = options.cacheTTL || 3600; // 1 saat
        await this.cache.set(cacheKey, user, cacheTTL);
      }

      // Tip eşleme: studySessions -> sessions
      const mapped = user ? {
        ...user,
        plans: user.plans.map((p: any) => ({
          id: p.id,
          title: p.title,
          subjects: p.subjects,
          isActive: p.isActive,
          sessions: p.studySessions?.map((s: any) => ({
            id: s.id,
            subject: s.subject,
            topic: s.topic,
            startTime: s.startTime,
            duration: s.duration,
          })) ?? [],
        })),
      } as OptimizedUserData : null;

      return mapped;
    } catch (error) {
      this.logger.error(`Failed to get user data: ${error instanceof Error ? error.message : String(error)}`, { userId });
      throw error;
    }
  }

  /**
   * N+1 problemi çözülmüş koç öğrenci listesi
   */
  async getCoachStudentsOptimized(coachId: string, options: BatchQueryOptions = {}): Promise<any[]> {
    const cacheKey = `coach:${coachId}:students`;
    
    // Cache kontrolü
    if (options.cache !== false) {
      const cached = await this.cache.get<any[]>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for coach students: ${coachId}`);
        return cached;
      }
    }

    try {
      // Tek sorgu ile tüm koç-öğrenci verilerini çek
      const coachStudents = await this.prisma.coachStudent.findMany({
        where: { 
          coachId,
          isActive: true 
        },
        select: {
          id: true,
          assignedAt: true,
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              studentProfile: {
                select: {
                  grade: true,
                  field: true,
                },
              },
              studentCompliance: {
                orderBy: { date: 'desc' },
                take: 7,
                select: {
                  date: true,
                  planComplianceScore: true,
                  actualMinutes: true,
                },
              },
            },
          },
          notes: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              title: true,
              type: true,
              priority: true,
              createdAt: true,
            },
          },
        },
      });

      const result = coachStudents.map(cs => ({
        id: cs.student.id,
        name: cs.student.name,
        email: cs.student.email,
        grade: cs.student.studentProfile?.grade,
        field: cs.student.studentProfile?.field,
        assignedAt: cs.assignedAt,
        compliance: this.calculateComplianceMetrics(cs.student.studentCompliance as any),
        recentNotes: cs.notes,
      }));

      // Cache'e kaydet
      if (options.cache !== false) {
        const cacheTTL = options.cacheTTL || 1800; // 30 dakika
        await this.cache.set(cacheKey, result, cacheTTL);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to get coach students: ${error instanceof Error ? error.message : String(error)}`, { coachId });
      throw error;
    }
  }

  /**
   * N+1 problemi çözülmüş plan verilerini getir
   */
  async getPlansWithSessions(userId: string, options: BatchQueryOptions = {}): Promise<any[]> {
    const cacheKey = `user:${userId}:plans_with_sessions`;
    
    // Cache kontrolü
    if (options.cache !== false) {
      const cached = await this.cache.get<any[]>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for user plans: ${userId}`);
        return cached;
      }
    }

    try {
      // Tek sorgu ile tüm plan ve session verilerini çek
      const plans = await this.prisma.plan.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          description: true,
          subjects: true,
          goals: true,
          planType: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          studySessions: {
            orderBy: { startTime: 'asc' },
            select: {
              id: true,
              subject: true,
              topic: true,
              startTime: true,
              duration: true,
              difficulty: true,
              type: true,
              isCompleted: true,
              performance: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Cache'e kaydet
      if (options.cache !== false) {
        const cacheTTL = options.cacheTTL || 1800; // 30 dakika
        await this.cache.set(cacheKey, plans, cacheTTL);
      }

      return plans;
    } catch (error) {
      this.logger.error(`Failed to get user plans: ${error instanceof Error ? error.message : String(error)}`, { userId });
      throw error;
    }
  }

  /**
   * N+1 problemi çözülmüş parent report verilerini getir
   */
  async getParentReportData(parentId: string, childId: string, options: BatchQueryOptions = {}): Promise<any> {
    const cacheKey = `parent:${parentId}:child:${childId}:report`;
    
    // Cache kontrolü
    if (options.cache !== false) {
      const cached = await this.cache.get<any>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for parent report: ${parentId}-${childId}`);
        return cached;
      }
    }

    try {
      // Tek sorgu ile tüm parent report verilerini çek
      const parentChild = await (this.prisma as any).parentChild?.findFirst?.({
        where: { 
          parentId,
          childId,
          isActive: true 
        },
        select: {
          child: {
            select: {
              id: true,
              name: true,
              email: true,
              studentProfile: {
                select: {
                  grade: true,
                  field: true,
                },
              },
              studentCompliance: {
                orderBy: { date: 'desc' },
                take: 30,
                select: {
                  date: true,
                  planComplianceScore: true,
                  actualMinutes: true,
                  completedSessions: true,
                },
              },
              studySessions: {
                orderBy: { startTime: 'desc' },
                take: 100,
                select: {
                  id: true,
                  subject: true,
                  topic: true,
                  startTime: true,
                  duration: true,
                  isCompleted: true,
                  performance: true,
                },
              },
              plans: {
                where: { isActive: true },
                select: {
                  id: true,
                  title: true,
                  subjects: true,
                  studySessions: {
                    orderBy: { startTime: 'desc' },
                    take: 20,
                    select: {
                      id: true,
                      subject: true,
                      topic: true,
                      startTime: true,
                      duration: true,
                      isCompleted: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!parentChild) {
        return null;
      }

      const result = {
        child: parentChild.child,
        weeklyProgress: this.calculateWeeklyProgress(parentChild.child.studentCompliance),
        studyStats: this.calculateStudyStats(parentChild.child.studySessions),
        planProgress: this.calculatePlanProgress(parentChild.child.plans),
      };

      // Cache'e kaydet
      if (options.cache !== false) {
        const cacheTTL = options.cacheTTL || 3600; // 1 saat
        await this.cache.set(cacheKey, result, cacheTTL);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to get parent report: ${error instanceof Error ? error.message : String(error)}`, { parentId, childId });
      throw error;
    }
  }

  /**
   * Batch query ile çoklu kullanıcı verilerini getir
   */
  async getBatchUserData(userIds: string[], options: BatchQueryOptions = {}): Promise<OptimizedUserData[]> {
    const batchSize = options.batchSize || 50;
    const results: OptimizedUserData[] = [];

    // Batch'ler halinde işle
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(userId => this.getUserWithAllData(userId, options))
      );

      results.push(...batchResults.filter(Boolean) as OptimizedUserData[]);
    }

    return results;
  }

  /**
   * Uyum metriklerini hesapla
   */
  private calculateComplianceMetrics(compliance: any[]): any {
    if (!compliance || compliance.length === 0) {
      return { average: 0, trend: 'stable' };
    }

    const scores = compliance.map(c => c.complianceScore || 0);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Trend hesapla (son 3 gün vs önceki 3 gün)
    const recent = scores.slice(0, 3);
    const previous = scores.slice(3, 6);
    
    const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
    const previousAvg = previous.length > 0 ? 
      previous.reduce((sum, score) => sum + score, 0) / previous.length : recentAvg;
    
    const trend = recentAvg > previousAvg ? 'improving' : 
                  recentAvg < previousAvg ? 'declining' : 'stable';

    return { average, trend };
  }

  /**
   * Haftalık ilerlemeyi hesapla
   */
  private calculateWeeklyProgress(compliance: any[]): any {
    if (!compliance || compliance.length === 0) {
      return { average: 0, trend: 'stable' };
    }

    const weeklyData = compliance.slice(0, 7);
    const average = weeklyData.reduce((sum, c) => sum + (c.complianceScore || 0), 0) / weeklyData.length;
    
    return { average, data: weeklyData };
  }

  /**
   * Çalışma istatistiklerini hesapla
   */
  private calculateStudyStats(sessions: any[]): any {
    if (!sessions || sessions.length === 0) {
      return { totalSessions: 0, averageDuration: 0, completionRate: 0 };
    }

    const completedSessions = sessions.filter(s => s.isCompleted);
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const averageDuration = totalDuration / sessions.length;
    const completionRate = (completedSessions.length / sessions.length) * 100;

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      averageDuration,
      completionRate,
    };
  }

  /**
   * Plan ilerlemesini hesapla
   */
  private calculatePlanProgress(plans: any[]): any {
    if (!plans || plans.length === 0) {
      return { activePlans: 0, totalSessions: 0, completedSessions: 0 };
    }

    const totalSessions = plans.reduce((sum, plan) => sum + plan.sessions.length, 0);
    const completedSessions = plans.reduce((sum, plan) => 
      sum + plan.sessions.filter((s: any) => s.isCompleted).length, 0
    );

    return {
      activePlans: plans.length,
      totalSessions,
      completedSessions,
      completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
    };
  }
}
