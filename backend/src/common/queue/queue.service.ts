import { Injectable, Logger } from '@nestjs/common';
import { BullMQService } from './bullmq.service';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(private readonly bullMQService: BullMQService) {}

  /**
   * Add a job to the gamification queue
   */
  async addGamificationJob(jobName: string, data: any, options?: any): Promise<void> {
    await this.bullMQService.addJob('gamification', jobName, data, options);
    this.logger.log(`Gamification job added: ${jobName}`);
  }

  /**
   * Add a job to the analytics queue
   */
  async addAnalyticsJob(jobName: string, data: any, options?: any): Promise<void> {
    await this.bullMQService.addJob('analytics', jobName, data, options);
    this.logger.log(`Analytics job added: ${jobName}`);
  }

  /**
   * Add a job to the notifications queue
   */
  async addNotificationJob(jobName: string, data: any, options?: any): Promise<void> {
    await this.bullMQService.addJob('notifications', jobName, data, options);
    this.logger.log(`Notification job added: ${jobName}`);
  }

  /**
   * Add a job to the email queue
   */
  async addEmailJob(jobName: string, data: any, options?: any): Promise<void> {
    await this.bullMQService.addJob('email', jobName, data, options);
    this.logger.log(`Email job added: ${jobName}`);
  }

  /**
   * Generic method to add a job to any queue
   */
  async add(queueName: string, jobName: string, data: any, options?: any): Promise<void> {
    await this.bullMQService.addJob(queueName, jobName, data, options);
    this.logger.log(`Job added to ${queueName}: ${jobName}`);
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
