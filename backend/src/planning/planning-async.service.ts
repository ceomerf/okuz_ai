import { Injectable, Logger } from '@nestjs/common';
import { OutboxService } from '../common/outbox/outbox.service';
import { BullMQService } from '../common/queue/bullmq.service';

@Injectable()
export class PlanningAsyncService {
  private readonly logger = new Logger(PlanningAsyncService.name);

  constructor(
    private readonly outboxService: OutboxService,
    private readonly bullMQService: BullMQService,
  ) {
    this.setupWorkers();
  }

  /**
   * Setup background workers for async processing
   */
  private setupWorkers(): void {
    // Gamification worker
    this.bullMQService.createWorker('gamification', async (job) => {
      return this.processGamificationJob(job);
    });

    // Analytics worker
    this.bullMQService.createWorker('analytics', async (job) => {
      return this.processAnalyticsJob(job);
    });

    // Notifications worker
    this.bullMQService.createWorker('notifications', async (job) => {
      return this.processNotificationJob(job);
    });

    // Email worker
    this.bullMQService.createWorker('email', async (job) => {
      return this.processEmailJob(job);
    });
  }

  /**
   * Process gamification job
   */
  private async processGamificationJob(job: any): Promise<void> {
    const { userId, sessionId, performance, subject } = job.data;
    
    this.logger.log(`Processing gamification for user ${userId}, session ${sessionId}`);
    
    try {
      // Simulate gamification processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for achievements
      if (performance >= 90) {
        await this.outboxService.createEvent(
          userId,
          'USER',
          'ACHIEVEMENT_UNLOCKED',
          {
            achievementId: 'high_performance',
            achievementName: 'High Performance',
            userId,
            sessionId,
          }
        );
      }

      // Update user stats
      await this.outboxService.createEvent(
        userId,
        'USER',
        'STATS_UPDATED',
        {
          userId,
          performance,
          subject,
          sessionId,
        }
      );

      this.logger.log(`Gamification processed for user ${userId}`);
    } catch (error) {
      this.logger.error(`Gamification processing failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Process analytics job
   */
  private async processAnalyticsJob(job: any): Promise<void> {
    const { userId, sessionId, duration, performance } = job.data;
    
    this.logger.log(`Processing analytics for user ${userId}, session ${sessionId}`);
    
    try {
      // Simulate analytics processing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update analytics data
      await this.outboxService.createEvent(
        userId,
        'USER',
        'ANALYTICS_UPDATED',
        {
          userId,
          sessionId,
          duration,
          performance,
          timestamp: new Date(),
        }
      );

      this.logger.log(`Analytics processed for user ${userId}`);
    } catch (error) {
      this.logger.error(`Analytics processing failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Process notification job
   */
  private async processNotificationJob(job: any): Promise<void> {
    const { userId, type, title, message, data } = job.data;
    
    this.logger.log(`Processing notification for user ${userId}: ${type}`);
    
    try {
      // Simulate notification processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Here you would integrate with your notification service
      // For now, just log the notification
      this.logger.log(`Notification sent to user ${userId}: ${title} - ${message}`);
      
    } catch (error) {
      this.logger.error(`Notification processing failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Process email job
   */
  private async processEmailJob(job: any): Promise<void> {
    const { userId, email, reportData } = job.data;
    
    this.logger.log(`Processing email for user ${userId}: ${email}`);
    
    try {
      // Simulate email processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would integrate with your email service
      // For now, just log the email
      this.logger.log(`Email sent to ${email} for user ${userId}`);
      
    } catch (error) {
      this.logger.error(`Email processing failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<Record<string, any>> {
    return this.bullMQService.getAllQueueStats();
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    await this.bullMQService.pauseQueue(queueName);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    await this.bullMQService.resumeQueue(queueName);
  }

  /**
   * Clean old jobs from a queue
   */
  async cleanQueue(queueName: string): Promise<void> {
    await this.bullMQService.cleanQueue(queueName);
  }
}
