import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PlanType } from '@prisma/client';
import { OptimizedQueryService } from '../../common/prisma/optimized-query.service';
import { CacheService } from '../../common/cache/cache.service';
import { QueueService } from '../../services/queue.service';

export interface PlanStructure {
  title: string;
  description: string;
  subjects: string[];
  goals: string[];
  weeks?: any[];
  totalSessions?: number;
  duration?: number;
}

export interface SessionStructure {
  subject: string;
  topic: string;
  duration: number;
  difficulty: string;
  type: string;
  startTime: Date;
  objectives?: string[];
  resources?: string[];
  techniques?: string[];
}

export interface PlanCreateData {
  userId: string;
  plan: PlanStructure;
  sessions: SessionStructure[];
  planType?: string;
  targetExam?: string;
  isActive?: boolean;
}

export interface PlanUpdateData {
  title?: string;
  description?: string;
  subjects?: string[];
  goals?: string[];
  isActive?: boolean;
}

@Injectable()
export class PlanPersistenceOptimizedService {
  private readonly logger = new Logger(PlanPersistenceOptimizedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly optimizedQuery: OptimizedQueryService,
    private readonly cache: CacheService,
    private readonly queue: QueueService,
  ) {}

  /**
   * N+1 problemi çözülmüş kullanıcı planlarını getir
   */
  async getUserPlans(userId: string, options: { includeInactive?: boolean } = {}): Promise<any[]> {
    try {
      this.logger.log(`Getting user plans for: ${userId}`);

      // Optimized query service kullan
      const plans = await this.optimizedQuery.getPlansWithSessions(userId, {
        cache: true,
        cacheTTL: 1800, // 30 dakika
      });

      // Filtreleme
      if (!options.includeInactive) {
        return plans.filter(plan => plan.isActive);
      }

      return plans;
    } catch (error) {
      this.logger.error(`Failed to get user plans: ${error instanceof Error ? error.message : 'Unknown error'}`, { userId });
      throw new BadRequestException('Failed to get user plans');
    }
  }

  /**
   * N+1 problemi çözülmüş plan detayını getir
   */
  async getPlan(userId: string, planId: string): Promise<any> {
    try {
      this.logger.log(`Getting plan: ${planId} for user: ${userId}`);

      // Cache kontrolü
      const cacheKey = `plan:${planId}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for plan: ${planId}`);
        return cached;
      }

      // Optimized query ile plan ve session'ları tek sorguda getir
      const plan = await (this.prisma as any).plan.findFirst({
        where: { 
          id: planId, 
          userId 
        },
        include: {
          studySessions: {
            orderBy: { startTime: 'asc' },
            select: {
              id: true,
              subject: true,
              topic: true,
              startTime: true,
              duration: true,
              // difficulty: true, // Bu property kaldırıldı
              type: true,
              isCompleted: true,
              performance: true,
              objectives: true,
              resources: true,
              techniques: true,
            },
          },
        },
      });

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      // Cache'e kaydet
      await this.cache.set(cacheKey, plan, 3600); // 1 saat

      return plan;
    } catch (error) {
      this.logger.error(`Failed to get plan: ${error instanceof Error ? error.message : 'Unknown error'}`, { userId, planId });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get plan');
    }
  }

  /**
   * Plan güncelle - optimized
   */
  async updatePlan(userId: string, planId: string, data: PlanUpdateData): Promise<any> {
    try {
      this.logger.log(`Updating plan: ${planId} for user: ${userId}`);

      // Plan varlığını kontrol et
      const existingPlan = await (this.prisma as any).plan.findFirst({
        where: { id: planId, userId },
        select: { id: true, isActive: true },
      });

      if (!existingPlan) {
        throw new NotFoundException('Plan not found');
      }

      // Plan güncelle
      const updatedPlan = await (this.prisma as any).plan.update({
        where: { id: planId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          title: true,
          description: true,
          subjects: true,
          goals: true,
          // planType: true, // Bu property kaldırıldı
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Cache'i güncelle
      await this.cache.set(`plan:${planId}`, updatedPlan, 3600);
      
      // User plans cache'ini temizle
      await this.cache.del(`user:${userId}:plans_with_sessions`);

      return updatedPlan;
    } catch (error) {
      this.logger.error(`Failed to update plan: ${error instanceof Error ? error.message : String(error)}`, { userId, planId });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update plan');
    }
  }

  /**
   * Plan sil - optimized
   */
  async deletePlan(userId: string, planId: string): Promise<boolean> {
    try {
      this.logger.log(`Deleting plan: ${planId} for user: ${userId}`);

      // Plan varlığını kontrol et
      const existingPlan = await (this.prisma as any).plan.findFirst({
        where: { id: planId, userId },
        select: { id: true },
      });

      if (!existingPlan) {
        throw new NotFoundException('Plan not found');
      }

      // Plan ve ilişkili session'ları sil
      await this.prisma.$transaction(async (tx) => {
        // Session'ları sil
        await tx.studySession.deleteMany({
          where: { planId },
        });

        // Plan'ı sil
        await tx.plan.delete({
          where: { id: planId },
        });
      });

      // Cache'i temizle
      await this.cache.del(`plan:${planId}`);
      await this.cache.del(`user:${userId}:plans_with_sessions`);

      return true;
    } catch (error) {
      this.logger.error(`Failed to delete plan: ${error instanceof Error ? error.message : String(error)}`, { userId, planId });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete plan');
    }
  }

  /**
   * N+1 problemi çözülmüş plan oluştur
   */
  async createPlan(data: PlanCreateData): Promise<any> {
    try {
      this.logger.log(`Creating plan for user: ${data.userId}`);

      // Kullanıcı kontrolü - optimized query kullan
      const user = await this.optimizedQuery.getUserWithAllData(data.userId, {
        cache: true,
        cacheTTL: 3600,
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Transaction ile plan ve session'ları oluştur
      const result = await this.prisma.$transaction(async (tx) => {
        // Plan oluştur
        const plan = await tx.plan.create({
          data: {
            userId: data.userId,
            title: data.plan.title,
            description: data.plan.description,
            subjects: data.plan.subjects,
            goals: data.plan.goals,
            type: (PlanType as any)[(data.planType || 'WEEKLY').toUpperCase()] || PlanType.WEEKLY,
            // planType: data.planType || 'DAILY', // Bu property kaldırıldı
            isActive: data.isActive ?? true,
            // totalSessions alanı şemada yoksa kaldır
            duration: data.plan.duration || 7,
            startDate: new Date(),
            endDate: new Date(Date.now() + (data.plan.duration || 7) * 24 * 60 * 60 * 1000),
            metadata: {
              subjects: data.plan.subjects,
              goals: data.plan.goals,
              totalSessions: data.sessions.length,
              duration: data.plan.duration || 7,
            },
          },
        });

        // Session'ları batch olarak oluştur
        const sessions = await tx.studySession.createMany({
          data: data.sessions.map(session => ({
            planId: plan.id,
            userId: data.userId,
            subject: session.subject,
            topic: session.topic,
            startTime: session.startTime,
            duration: session.duration,
            difficulty: session.difficulty,
            type: session.type,
            objectives: session.objectives,
            resources: session.resources,
            techniques: session.techniques,
          })),
        });

        return { plan, sessionCount: sessions.count };
      });

      // Cache'i güncelle
      await this.cache.set(`plan:${result.plan.id}`, result.plan, 3600);
      await this.cache.del(`user:${data.userId}:plans_with_sessions`);

      return result.plan;
    } catch (error) {
      this.logger.error(`Failed to create plan: ${error instanceof Error ? error.message : String(error)}`, { userId: data.userId });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to create plan');
    }
  }

  /**
   * N+1 problemi çözülmüş aktif planları getir
   */
  async getActivePlans(userId: string): Promise<any[]> {
    try {
      this.logger.log(`Getting active plans for user: ${userId}`);

      // Optimized query service kullan
      const plans = await this.optimizedQuery.getPlansWithSessions(userId, {
        cache: true,
        cacheTTL: 1800,
      });

      // Sadece aktif planları filtrele
      return plans.filter(plan => plan.isActive);
    } catch (error) {
      this.logger.error(`Failed to get active plans: ${error instanceof Error ? error.message : String(error)}`, { userId });
      throw new BadRequestException('Failed to get active plans');
    }
  }

  /**
   * N+1 problemi çözülmüş plan istatistikleri
   */
  async getPlanStatistics(userId: string): Promise<any> {
    try {
      this.logger.log(`Getting plan statistics for user: ${userId}`);

      // Optimized query service kullan
      const plans = await this.optimizedQuery.getPlansWithSessions(userId, {
        cache: true,
        cacheTTL: 1800,
      });

      const activePlans = plans.filter(plan => plan.isActive);
      const totalSessions = plans.reduce((sum, plan) => sum + plan.sessions.length, 0);
      const completedSessions = plans.reduce((sum, plan) => 
        sum + plan.sessions.filter((s: any) => s.isCompleted).length, 0
      );

      return {
        totalPlans: plans.length,
        activePlans: activePlans.length,
        totalSessions,
        completedSessions,
        completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
        averageSessionsPerPlan: plans.length > 0 ? totalSessions / plans.length : 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get plan statistics: ${error instanceof Error ? error.message : String(error)}`, { userId });
      throw new BadRequestException('Failed to get plan statistics');
    }
  }

  /**
   * N+1 problemi çözülmüş plan arama
   */
  async searchPlans(userId: string, query: string): Promise<any[]> {
    try {
      this.logger.log(`Searching plans for user: ${userId} with query: ${query}`);

      // Optimized query service kullan
      const plans = await this.optimizedQuery.getPlansWithSessions(userId, {
        cache: true,
        cacheTTL: 1800,
      });

      // Arama filtreleme
      const filteredPlans = plans.filter(plan => 
        plan.title.toLowerCase().includes(query.toLowerCase()) ||
        plan.description.toLowerCase().includes(query.toLowerCase()) ||
        plan.subjects.some((subject: string) => subject.toLowerCase().includes(query.toLowerCase())) ||
        plan.goals.some((goal: string) => goal.toLowerCase().includes(query.toLowerCase()))
      );

      return filteredPlans;
    } catch (error) {
      this.logger.error(`Failed to search plans: ${error instanceof Error ? error.message : String(error)}`, { userId, query });
      throw new BadRequestException('Failed to search plans');
    }
  }
}
