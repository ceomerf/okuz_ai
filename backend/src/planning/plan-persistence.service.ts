import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PlanPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async savePlanWithSessions(input: { plan: any; sessions: any[] }) {
    const { plan, sessions } = input;
    return this.prisma.$transaction(async (tx) => {
      const createdPlan = await tx.plan.create({ data: plan });
      if (sessions && sessions.length > 0) {
        await tx.studySession.createMany({ data: sessions.map((s) => ({ ...s, planId: createdPlan.id })), skipDuplicates: true });
      }
      return createdPlan;
    });
  }

  async updatePlan(input: { id: string; data: any }) {
    const { id, data } = input;
    return this.prisma.plan.update({ where: { id }, data });
  }

  async updateSession(input: { id: string; data: any }) {
    const { id, data } = input;
    return this.prisma.studySession.update({ where: { id }, data });
  }

  async bulkUpsertSessions(planId: string, sessions: any[]) {
    if (!sessions?.length) return { count: 0 };
    return this.prisma.$transaction(async (tx) => {
      await tx.studySession.createMany({ data: sessions.map((s) => ({ ...s, planId })), skipDuplicates: true });
      return { count: sessions.length };
    });
  }
}


