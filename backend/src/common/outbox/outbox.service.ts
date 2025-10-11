import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

export interface OutboxEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: any;
  createdAt: Date;
  processed: boolean;
  processedAt?: Date;
  retryCount: number;
}

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Create an outbox event for later processing
   */
  async createEvent(
    aggregateId: string,
    aggregateType: string,
    eventType: string,
    payload: any,
  ): Promise<void> {
    try {
      await (this.prisma as any).outboxEvent.create({
        data: {
          userId: 'system', // Default user for system events
          aggregateId,
          aggregateType,
          eventType,
          payload: JSON.stringify(payload),
          processed: false,
          retryCount: 0,
        },
      });

      this.logger.log(`Outbox event created: ${eventType} for ${aggregateType}:${aggregateId}`);
    } catch (error) {
      this.logger.error(`Failed to create outbox event: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Process pending outbox events
   */
  async processPendingEvents(): Promise<void> {
    const pendingEvents = await (this.prisma as any).outboxEvent.findMany({
      where: {
        processed: false,
        retryCount: { lt: 3 }, // Max 3 retries
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 100, // Process in batches
    });

    for (const event of pendingEvents) {
      try {
        await this.processEvent(event);
      } catch (error) {
        this.logger.error(`Failed to process event ${event.id}: ${(error as Error).message}`);
        await this.incrementRetryCount(event.id);
      }
    }
  }

  /**
   * Process a single outbox event
   */
  private async processEvent(event: any): Promise<void> {
    const payload = JSON.parse(event.payload);

    switch (event.eventType) {
      case 'SESSION_COMPLETED':
        await this.handleSessionCompleted(event.aggregateId, payload);
        break;
      case 'PLAN_CREATED':
        await this.handlePlanCreated(event.aggregateId, payload);
        break;
      case 'ACHIEVEMENT_UNLOCKED':
        await this.handleAchievementUnlocked(event.aggregateId, payload);
        break;
      case 'WEEKLY_REPORT_READY':
        await this.handleWeeklyReportReady(event.aggregateId, payload);
        break;
      case 'NOTIFICATION_SEND':
        await this.handleNotificationSend(event.aggregateId, payload);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event.eventType}`);
    }

    // Mark as processed
    await (this.prisma as any).outboxEvent.update({
      where: { id: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Handle session completed event
   */
  private async handleSessionCompleted(sessionId: string, payload: any): Promise<void> {
    // Add to gamification queue
    await this.queueService.add('gamification', 'update-achievements', {
      userId: payload.userId,
      sessionId,
      performance: payload.performance,
      subject: payload.subject,
    });

    // Add to analytics queue
    await this.queueService.add('analytics', 'process-session-data', {
      userId: payload.userId,
      sessionId,
      duration: payload.duration,
      performance: payload.performance,
    });

    this.logger.log(`Session completed event processed for session ${sessionId}`);
  }

  /**
   * Handle plan created event
   */
  private async handlePlanCreated(planId: string, payload: any): Promise<void> {
    // Add to notification queue
    await this.queueService.add('notifications', 'plan-created-notification', {
      userId: payload.userId,
      planId,
      planType: payload.planType,
    });

    this.logger.log(`Plan created event processed for plan ${planId}`);
  }

  /**
   * Handle achievement unlocked event
   */
  private async handleAchievementUnlocked(userId: string, payload: any): Promise<void> {
    // Add to notification queue
    await this.queueService.add('notifications', 'achievement-notification', {
      userId,
      achievementId: payload.achievementId,
      achievementName: payload.achievementName,
    });

    this.logger.log(`Achievement unlocked event processed for user ${userId}`);
  }

  /**
   * Handle weekly report ready event
   */
  private async handleWeeklyReportReady(userId: string, payload: any): Promise<void> {
    // Add to email queue
    await this.queueService.add('email', 'send-weekly-report', {
      userId,
      reportData: payload.reportData,
      email: payload.email,
    });

    this.logger.log(`Weekly report ready event processed for user ${userId}`);
  }

  /**
   * Handle notification send event
   */
  private async handleNotificationSend(userId: string, payload: any): Promise<void> {
    // Add to notification queue
    await this.queueService.add('notifications', 'send-notification', {
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
    });

    this.logger.log(`Notification send event processed for user ${userId}`);
  }

  /**
   * Increment retry count for failed events
   */
  private async incrementRetryCount(eventId: string): Promise<void> {
    await (this.prisma as any).outboxEvent.update({
      where: { id: eventId },
      data: {
        retryCount: { increment: 1 },
      },
    });
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
    const [total, pending, processed, failed] = await Promise.all([
      (this.prisma as any).outboxEvent.count(),
      (this.prisma as any).outboxEvent.count({ where: { processed: false } }),
      (this.prisma as any).outboxEvent.count({ where: { processed: true } }),
      (this.prisma as any).outboxEvent.count({ where: { retryCount: { gte: 3 } } }),
    ]);

    return { total, pending, processed, failed };
  }
}
