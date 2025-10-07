import { Injectable, Logger } from '@nestjs/common';
import { OutboxService } from '../common/outbox/outbox.service';
import { QueueService } from '../common/queue/queue.service';
import { DatabaseService } from '../common/database/database.service';

@Injectable()
export class PlanningEnhancedService {
  private readonly logger = new Logger(PlanningEnhancedService.name);

  constructor(
    private readonly outboxService: OutboxService,
    private readonly queueService: QueueService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Complete a study session with async processing
   */
  async completeSession(sessionId: string, userId: string, performance: number, subject: string): Promise<{
    success: boolean;
    message: string;
    sessionId: string;
  }> {
    try {
      this.logger.log(`Completing session ${sessionId} for user ${userId}`);

      // 1. Update session status in database (write operation)
      await this.databaseService.executeWrite(async (writeClient) => {
        await writeClient.studySession.update({
          where: { id: sessionId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            performance,
          },
        });
      });

      // 2. Create outbox event for async processing
      await this.outboxService.createEvent(
        sessionId,
        'STUDY_SESSION',
        'SESSION_COMPLETED',
        {
          userId,
          sessionId,
          performance,
          subject,
          completedAt: new Date(),
        }
      );

      // 3. Return immediate response (200 OK)
      return {
        success: true,
        message: 'Session completed successfully',
        sessionId,
      };

    } catch (error) {
      this.logger.error(`Failed to complete session ${sessionId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Create a new plan with async processing
   */
  async createPlan(userId: string, planData: any): Promise<{
    success: boolean;
    planId: string;
    message: string;
  }> {
    try {
      this.logger.log(`Creating plan for user ${userId}`);

      // 1. Create plan in database (write operation)
      const plan = await this.databaseService.executeWrite(async (writeClient) => {
        return writeClient.plan.create({
          data: {
            ...planData,
            userId,
            status: 'ACTIVE',
          },
        });
      });

      // 2. Create outbox event for async processing
      await this.outboxService.createEvent(
        plan.id,
        'PLAN',
        'PLAN_CREATED',
        {
          userId,
          planId: plan.id,
          planType: planData.planType,
          createdAt: new Date(),
        }
      );

      // 3. Return immediate response
      return {
        success: true,
        planId: plan.id,
        message: 'Plan created successfully',
      };

    } catch (error) {
      this.logger.error(`Failed to create plan for user ${userId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get user plans using read replica
   */
  async getUserPlans(userId: string, options: {
    page?: number;
    limit?: number;
    status?: string;
    planType?: string;
  } = {}): Promise<any> {
    const { page = 1, limit = 10, status, planType } = options;

    return this.databaseService.executeRead(async (readClient) => {
      const whereClause: any = { userId };
      if (status) whereClause.status = status;
      if (planType) whereClause.planType = planType;

      const [plans, total] = await Promise.all([
        readClient.plan.findMany({
          where: whereClause,
          include: {
            studySessions: {
              select: {
                id: true,
                status: true,
                performance: true,
                completedAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        readClient.plan.count({ where: whereClause }),
      ]);

      return {
        plans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    });
  }

  /**
   * Get plan analytics using read replica
   */
  async getPlanAnalytics(planId: string): Promise<any> {
    return this.databaseService.executeRead(async (readClient) => {
      const plan = await readClient.plan.findUnique({
        where: { id: planId },
        include: {
          studySessions: {
            select: {
              id: true,
              status: true,
              performance: true,
              completedAt: true,
              duration: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!plan) {
        throw new Error('Plan not found');
      }

      const completedSessions = plan.studySessions.filter(s => s.status === 'COMPLETED');
      const totalSessions = plan.studySessions.length;
      const averagePerformance = completedSessions.length > 0 
        ? completedSessions.reduce((sum, s) => sum + (s.performance || 0), 0) / completedSessions.length
        : 0;

      return {
        plan,
        analytics: {
          totalSessions,
          completedSessions: completedSessions.length,
          averagePerformance,
          completionRate: totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0,
        },
      };
    });
  }

  /**
   * Get system-wide analytics using read replica
   */
  async getSystemAnalytics(dateRange: { start: Date; end: Date }): Promise<any> {
    return this.databaseService.executeRead(async (readClient) => {
      const [
        totalPlans,
        activePlans,
        completedSessions,
        averagePerformance,
        topSubjects,
      ] = await Promise.all([
        readClient.plan.count({
          where: {
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
        }),
        readClient.plan.count({
          where: {
            status: 'ACTIVE',
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
        }),
        readClient.studySession.count({
          where: {
            status: 'COMPLETED',
            completedAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
        }),
        readClient.studySession.aggregate({
          where: {
            status: 'COMPLETED',
            completedAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
          _avg: {
            performance: true,
          },
        }),
        readClient.studySession.groupBy({
          by: ['subject'],
          where: {
            status: 'COMPLETED',
            completedAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: 5,
        }),
      ]);

      return {
        totalPlans,
        activePlans,
        completedSessions,
        averagePerformance: averagePerformance._avg.performance || 0,
        topSubjects: topSubjects.map(s => ({
          subject: s.subject,
          sessionCount: s._count.id,
        })),
        period: {
          start: dateRange.start,
          end: dateRange.end,
        },
      };
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<Record<string, any>> {
    return this.queueService.getQueueStats();
  }

  /**
   * Get outbox statistics
   */
  async getOutboxStats(): Promise<{
    total: number;
    pending: number;
    processed: number;
    failed: number;
  }> {
    return this.outboxService.getOutboxStats();
  }
}
