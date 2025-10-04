import { Injectable } from '@nestjs/common';

@Injectable()
export class PlanningService {
  async generatePlan(userId: string, planData: any) {
    return { jobId: 'mock-job-id', message: 'Plan generation started' };
  }

  async getUserPlans(userId: string) {
    return [];
  }
}
