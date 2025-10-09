import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PlanningPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlanWithSessionsAtomic(planData: any, sessions: any[]) {
    const [plan] = await this.prisma.$transaction([
      (this.prisma as any).plan.create({ data: planData }),
    ]);
    if (sessions?.length) {
      const patched = sessions.map((s) => ({ ...s, planId: plan.id }));
      await this.prisma.$transaction([
        (this.prisma as any).studySession.createMany({ data: patched, skipDuplicates: true })
      ]);
    }
    return plan;
  }
}


