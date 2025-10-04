import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PlanPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kullanıcının planlarını getirir
   */
  async getUserPlans(userId: string): Promise<any> {
    const plans = await this.prisma.plan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        sessions: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    return plans.map(plan => ({
      id: plan.id,
      title: plan.title,
      description: plan.description,
      type: plan.type,
      subjects: plan.subjects,
      goals: plan.goals,
      startDate: plan.startDate,
      endDate: plan.endDate,
      isActive: plan.isActive,
      sessions: plan.sessions,
    }));
  }

  /**
   * Belirli bir planı getirir
   */
  async getPlan(userId: string, planId: string): Promise<any> {
    let plan = await this.prisma.plan.findFirst({
      where: { id: planId, userId },
      include: {
        sessions: {
          orderBy: { startTime: 'asc' },
        },
        user: {
          select: {
            id: true,
            name: true,
            studentProfile: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  /**
   * Plan oluşturur
   */
  async createPlan(planData: any): Promise<any> {
    return this.prisma.plan.create({
      data: planData,
    });
  }

  /**
   * Plan ve session'ları birlikte kaydeder
   */
  async savePlanWithSessions(planData: any): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // Planı oluştur
      const plan = await tx.plan.create({
        data: planData.plan,
      });

      // Session'ları oluştur
      if (planData.sessions && planData.sessions.length > 0) {
        const sessionData = planData.sessions.map((session: any) => ({
          ...session,
          planId: plan.id,
        }));
        
        await tx.studySession.createMany({
          data: sessionData,
        });
      }

      return plan;
    });
  }

  /**
   * Plan günceller
   */
  async updatePlan(planId: string, updateData: any): Promise<any> {
    return this.prisma.plan.update({
      where: { id: planId },
      data: updateData,
    });
  }

  /**
   * Plan siler
   */
  async deletePlan(planId: string): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // Önce ilgili study session'ları sil
      await tx.studySession.deleteMany({
        where: { planId },
      });

      // Sonra planı sil
      return tx.plan.delete({
        where: { id: planId },
      });
    });
  }

  /**
   * Plan sahipliğini kontrol eder
   */
  async verifyPlanOwnership(userId: string, planId: string): Promise<boolean> {
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, userId },
      select: { id: true },
    });

    return !!plan;
  }

  /**
   * Study session oluşturur
   */
  async createStudySessions(planId: string, sessions: any[], userId: string): Promise<any[]> {
    const sessionData = sessions.map(session => ({
      planId,
      userId,
      subject: session.subject || 'Genel',
      topic: session.topic || 'Genel Konu',
      startTime: new Date(session.startTime || new Date()),
      duration: session.durationInMinutes || session.duration || 45,
      difficulty: session.difficulty || 'medium',
      type: session.type || 'study',
      objectives: session.objectives || [],
      resources: session.resources || [],
      techniques: session.techniques || [],
    }));

    const result = await this.prisma.studySession.createMany({
      data: sessionData,
    });
    return result as any;
  }

  /**
   * Study session günceller
   */
  async updateStudySession(sessionId: string, updateData: any): Promise<any> {
    return this.prisma.studySession.update({
      where: { id: sessionId },
      data: updateData,
    });
  }

  /**
   * Study session siler
   */
  async deleteStudySession(sessionId: string): Promise<any> {
    return this.prisma.studySession.delete({
      where: { id: sessionId },
    });
  }

  /**
   * Plan ile ilgili tüm session'ları getirir
   */
  async getPlanSessions(planId: string): Promise<any[]> {
    return this.prisma.studySession.findMany({
      where: { planId },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Kullanıcının aktif planını getirir
   */
  async getActivePlan(userId: string): Promise<any> {
    return this.prisma.plan.findFirst({
      where: { 
        userId,
        isActive: true,
      },
      include: {
        sessions: {
          orderBy: { startTime: 'asc' },
        },
      },
    });
  }

  /**
   * Planı aktif/pasif yapar
   */
  async setPlanActiveStatus(planId: string, isActive: boolean): Promise<any> {
    return this.prisma.plan.update({
      where: { id: planId },
      data: { isActive },
    });
  }

  /**
   * Plan istatistiklerini getirir
   */
  async getPlanStats(planId: string): Promise<any> {
    const sessions = await this.prisma.studySession.findMany({
      where: { planId },
    });

    const completed = sessions.filter(s => s.isCompleted);
    const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0);
    const completedTime = completed.reduce((sum, s) => sum + s.duration, 0);

    return {
      totalSessions: sessions.length,
      completedSessions: completed.length,
      totalStudyTime: totalTime,
      completedStudyTime: completedTime,
      completionRate: sessions.length > 0 ? (completed.length / sessions.length) * 100 : 0,
    };
  }
}