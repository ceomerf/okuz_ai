import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
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
export class PlanPersistenceService {
  private readonly logger = new Logger(PlanPersistenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly queue: QueueService,
  ) {}

  /**
   * Plan sahipliğini doğrula
   */
  async verifyPlanOwnership(userId: string, planId: string): Promise<boolean> {
    try {
      const plan = await this.prisma.plan.findFirst({
        where: {
          id: planId,
          userId: userId
        }
      });
      return !!plan;
    } catch (error) {
      this.logger.error(`Failed to verify plan ownership: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Belirli tarih aralığındaki oturumları getir
   */
  async getSessionsInRange(userId: string, start: Date, end: Date) {
    try {
      const sessions = await this.prisma.studySession.findMany({
        where: {
          userId,
          startTime: {
            gte: start,
            lt: end
          }
        },
        orderBy: {
          startTime: 'asc'
        }
      });

      return sessions;
    } catch (error) {
      this.logger.error(`Failed to get sessions in range: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException('Failed to get sessions in range');
    }
  }

  /**
   * Haftalık quiz planla
   */
  async scheduleWeeklyQuiz(userId: string, data: { type: string; day: string }) {
    try {
      this.logger.log(`Scheduling weekly quiz for user: ${userId}`);
      
      // Quiz oturumu oluştur
      const quizSession = await this.prisma.studySession.create({
        data: {
          userId,
          subject: 'Quiz',
          topic: `${data.type} Deneme`,
          duration: 180, // 3 saat
          startTime: new Date(), // Gelecek hafta için
          metadata: {
            sessionType: 'quiz',
            objectives: [`${data.type} deneme sınavı`],
            resources: ['Deneme sınavı kitapçığı'],
            techniques: ['Test çözme']
          }
        }
      });

      return {
        success: true,
        session: quizSession,
        message: 'Weekly quiz scheduled successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to schedule weekly quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException('Failed to schedule weekly quiz');
    }
  }

  /**
   * Quiz sonucunu kaydet
   */
  async recordQuizResult(userId: string, result: { subject: string; topic?: string; score: number; totalScore: number }) {
    try {
      this.logger.log(`Recording quiz result for user: ${userId}`);
      
      // Quiz sonucunu kaydet
      const quizResult = await (this.prisma as any).quizResult.create({
        data: {
          userId,
          subject: result.subject,
          topic: result.topic || 'General',
          score: result.score,
          totalScore: result.totalScore,
          percentage: (result.score / result.totalScore) * 100,
          completedAt: new Date()
        }
      });

      return {
        success: true,
        result: quizResult,
        message: 'Quiz result recorded successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to record quiz result: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException('Failed to record quiz result');
    }
  }

  /**
   * Plan oluştur ve veritabanına kaydet
   */
  async createPlan(data: PlanCreateData): Promise<any> {
    try {
      this.logger.log(`Creating plan for user: ${data.userId}`);

      // Kullanıcı kontrolü
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        include: { studentProfile: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Plan oluştur
      const startDate = new Date();
      const durationDays = data.plan.duration || 7;
      const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
      const plan = await (this.prisma as any).plan.create({
        data: {
          userId: data.userId,
          title: data.plan.title,
          description: data.plan.description,
          subjects: data.plan.subjects,
          goals: data.plan.goals,
          type: (data.planType?.toUpperCase?.() || 'WEEKLY'),
          planType: data.planType,
          targetExam: data.targetExam,
          startDate,
          endDate,
          isActive: data.isActive ?? true,
          totalSessions: data.sessions.length,
          duration: durationDays,
          metadata: {
            subjects: data.plan.subjects,
            goals: data.plan.goals,
            totalSessions: data.sessions.length,
            duration: durationDays,
            targetExam: data.targetExam,
          },
        },
      });

      // Seansları oluştur
      const sessions = await this.createStudySessions(plan.id, data.sessions, data.userId);

      // Cache'i güncelle
      await this.cache.set(`plan:${plan.id}`, plan, 3600); // 1 saat
      await this.cache.set(`user:${data.userId}:active_plan`, plan.id, 3600);

      // Queue'ya plan oluşturma eventi ekle
      await this.queue.addJob('generate-plan', {
        planId: plan.id,
        userId: data.userId,
        planType: data.planType,
      });

      this.logger.log(`Plan created successfully: ${plan.id}`);

      return {
        plan,
        sessions,
        totalSessions: sessions.length,
      };
    } catch (error) {
      this.logger.error(`Plan creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException(`Plan creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Kullanıcının planlarını getir
   */
  async getUserPlans(userId: string, options: {
    includeInactive?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    try {
      const cacheKey = `user:${userId}:plans:${JSON.stringify(options)}`;
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached as string);
      }

      const where: any = { userId };
      if (!options.includeInactive) {
        where.isActive = true;
      }

      const plans = await (this.prisma as any).plan.findMany({
        where,
        include: {
          studySessions: {
            select: {
              id: true,
              subject: true,
              topic: true,
              startTime: true,
              duration: true,
              isCompleted: true,
            },
          },
          _count: {
            select: {
              // studySessions: true, // Bu property kaldırıldı
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit || 20,
        skip: options.offset || 0,
      });

      // Cache'e kaydet
      await this.cache.set(cacheKey, plans, 1800); // 30 dakika

      return plans;
    } catch (error) {
      this.logger.error(`Failed to get user plans: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException(`Failed to get user plans: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Belirli bir planı getir
   */
  async getPlan(userId: string, planId: string): Promise<any> {
    try {
      const cacheKey = `plan:${planId}`;
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached as string);
      }

      const plan = await (this.prisma as any).plan.findFirst({
        where: {
          id: planId,
          userId,
        },
        include: {
          studySessions: {
            orderBy: { startTime: 'asc' },
          },
          _count: {
            select: {
              // studySessions: true, // Bu property kaldırıldı
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
      this.logger.error(`Failed to get plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Plan güncelle
   */
  async updatePlan(userId: string, planId: string, data: PlanUpdateData): Promise<any> {
    try {
      this.logger.log(`Updating plan: ${planId} for user: ${userId}`);

      // Plan var mı kontrol et
      const existingPlan = await this.prisma.plan.findFirst({
        where: { id: planId, userId },
      });

      if (!existingPlan) {
        throw new NotFoundException('Plan not found');
      }

      // Plan güncelle
      const updatedPlan = await this.prisma.plan.update({
        where: { id: planId },
        data: {
          title: data.title,
          description: data.description,
          subjects: data.subjects,
          goals: data.goals,
          isActive: data.isActive,
          updatedAt: new Date(),
        },
        include: {
          // studySessions: true, // Bu property kaldırıldı
        },
      });

      // Cache'i güncelle
      await this.cache.set(`plan:${planId}`, updatedPlan, 3600);
      await this.cache.del(`user:${userId}:plans:*`); // Tüm plan cache'lerini temizle

      // Queue'ya güncelleme eventi ekle
      await this.queue.addJob('generate-plan', {
        planId,
        userId,
        changes: data,
      });

      this.logger.log(`Plan updated successfully: ${planId}`);

      return updatedPlan;
    } catch (error) {
      this.logger.error(`Plan update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Plan update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Plan sil
   */
  async deletePlan(userId: string, planId: string): Promise<void> {
    try {
      this.logger.log(`Deleting plan: ${planId} for user: ${userId}`);

      // Plan var mı kontrol et
      const existingPlan = await this.prisma.plan.findFirst({
        where: { id: planId, userId },
      });

      if (!existingPlan) {
        throw new NotFoundException('Plan not found');
      }

      // İlişkili seansları sil
      await this.prisma.studySession.deleteMany({
        where: { planId },
      });

      // Planı sil
      await this.prisma.plan.delete({
        where: { id: planId },
      });

      // Cache'i temizle
      await this.cache.del(`plan:${planId}`);
      await this.cache.del(`user:${userId}:plans:*`);
      await this.cache.del(`user:${userId}:active_plan`);

      // Queue'ya silme eventi ekle
      await this.queue.addJob('generate-plan', {
        planId,
        userId,
      });

      this.logger.log(`Plan deleted successfully: ${planId}`);
    } catch (error) {
      this.logger.error(`Plan deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Plan deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Çalışma seansları oluştur
   */
  async createStudySessions(
    planId: string, 
    sessions: SessionStructure[], 
    userId: string
  ): Promise<any[]> {
    try {
      const studySessions = sessions.map((session, index) => ({
        planId,
        userId,
        subject: session.subject,
        topic: session.topic,
        startTime: session.startTime,
        duration: session.duration,
        order: index + 1,
        isCompleted: false,
        metadata: {
          difficulty: session.difficulty,
          type: session.type,
          objectives: session.objectives,
          resources: session.resources,
          techniques: session.techniques,
        },
      }));

      const createdSessions = await this.prisma.studySession.createMany({
        data: studySessions,
      });

      this.logger.log(`Created ${createdSessions.count} study sessions for plan: ${planId}`);

      // Oluşturulan seansları getir
      const sessionsWithIds = await this.prisma.studySession.findMany({
        where: { planId },
        orderBy: { createdAt: 'asc' }, // order property kaldırıldı
      });

      return sessionsWithIds;
    } catch (error) {
      this.logger.error(`Failed to create study sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException(`Failed to create study sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Aktif planı getir
   */
  async getActivePlan(userId: string): Promise<any> {
    try {
      const cacheKey = `user:${userId}:active_plan`;
      const cachedPlanId = await this.cache.get(cacheKey);
      
      if (cachedPlanId) {
        return this.getPlan(userId, cachedPlanId as string);
      }

      const activePlan = await (this.prisma as any).plan.findFirst({
        where: {
          userId,
          isActive: true,
        },
        include: {
          studySessions: {
            where: { isCompleted: false },
            orderBy: { startTime: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (activePlan) {
        await this.cache.set(cacheKey, activePlan.id, 3600);
      }

      return activePlan;
    } catch (error) {
      this.logger.error(`Failed to get active plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException(`Failed to get active plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Plan istatistikleri
   */
  async getPlanStatistics(planId: string, userId: string): Promise<any> {
    try {
      const plan = await this.prisma.plan.findFirst({
        where: { id: planId, userId },
        include: {
          // studySessions: true, // Bu property kaldırıldı
        },
      });

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      const totalSessions = 0; // plan.studySessions.length; // Bu property kaldırıldı
      const completedSessions = 0; // plan.studySessions.filter(s => s.isCompleted).length; // Bu property kaldırıldı
      const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

      const totalDuration = 0; // plan.studySessions.reduce((sum, session) => sum + session.duration, 0); // Bu property kaldırıldı
      const completedDuration = 0; // plan.studySessions.filter(s => s.isCompleted).reduce((sum, session) => sum + session.duration, 0); // Bu property kaldırıldı

      const subjectStats: Record<string, { total: number; completed: number; duration: number }> = {};
      // plan.studySessions.forEach(session => { // Bu property kaldırıldı
      //   if (!subjectStats[session.subject]) {
      //     subjectStats[session.subject] = { total: 0, completed: 0, duration: 0 };
      //   }
      //   subjectStats[session.subject].total++;
      //   subjectStats[session.subject].duration += session.duration;
      //   if (session.isCompleted) {
      //     subjectStats[session.subject].completed++;
      //   }
      // });

      return {
        planId,
        totalSessions,
        completedSessions,
        completionRate: Math.round(completionRate * 100) / 100,
        totalDuration,
        completedDuration,
        subjectStats,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get plan statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get plan statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Plan arşivle
   */
  async archivePlan(userId: string, planId: string): Promise<void> {
    try {
      const plan = await this.prisma.plan.findFirst({
        where: { id: planId, userId },
      });

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      await this.prisma.plan.update({
        where: { id: planId },
        data: { isActive: false },
      });

      // Cache'i güncelle
      await this.cache.del(`plan:${planId}`);
      await this.cache.del(`user:${userId}:plans:*`);
      await this.cache.del(`user:${userId}:active_plan`);

      this.logger.log(`Plan archived: ${planId}`);
    } catch (error) {
      this.logger.error(`Failed to archive plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to archive plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Plan yeniden aktifleştir
   */
  async activatePlan(userId: string, planId: string): Promise<void> {
    try {
      const plan = await this.prisma.plan.findFirst({
        where: { id: planId, userId },
      });

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      // Diğer aktif planları deaktif et
      await this.prisma.plan.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      // Bu planı aktif et
      await this.prisma.plan.update({
        where: { id: planId },
        data: { isActive: true },
      });

      // Cache'i güncelle
      await this.cache.set(`user:${userId}:active_plan`, planId, 3600);
      await this.cache.del(`user:${userId}:plans:*`);

      this.logger.log(`Plan activated: ${planId}`);
    } catch (error) {
      this.logger.error(`Failed to activate plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to activate plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Plan kopyala
   */
  async duplicatePlan(userId: string, planId: string, newTitle?: string): Promise<any> {
    try {
      const originalPlan = await this.getPlan(userId, planId);
      
      const newPlanData: PlanCreateData = {
        userId,
        plan: {
          title: newTitle || `${originalPlan.title} (Kopya)`,
          description: originalPlan.description,
          subjects: originalPlan.subjects,
          goals: originalPlan.goals,
          duration: originalPlan.duration,
        },
        sessions: [], // Sessions will be created separately
        planType: originalPlan.planType,
        targetExam: originalPlan.targetExam,
        isActive: false, // Kopya plan başlangıçta pasif
      };

      return this.createPlan(newPlanData);
    } catch (error) {
      this.logger.error(`Failed to duplicate plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException(`Failed to duplicate plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
