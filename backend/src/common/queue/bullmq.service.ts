import { Injectable, Logger } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

@Injectable()
export class BullMQService {
  private readonly logger = new Logger(BullMQService.name);
  private readonly redis: IORedis;
  private readonly queues: Map<string, Queue> = new Map();
  private readonly workers: Map<string, Worker> = new Map();

  constructor(private configService: ConfigService) {
    this.redis = new IORedis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
    });
  }

  /**
   * Create a new queue
   */
  createQueue(name: string): Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queue = new Queue(name, {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.queues.set(name, queue);
    this.logger.log(`Queue created: ${name}`);
    return queue;
  }

  /**
   * Add a job to a queue
   */
  async addJob(queueName: string, jobName: string, data: any, options?: any): Promise<Job> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(jobName, data, options);
    this.logger.log(`Job added to ${queueName}: ${jobName} (${job.id})`);
    return job;
  }

  /**
   * Create a worker for a queue
   */
  createWorker(queueName: string, processor: (job: Job) => Promise<any>): Worker {
    if (this.workers.has(queueName)) {
      return this.workers.get(queueName)!;
    }

    const worker = new Worker(queueName, processor, {
      connection: this.redis,
      concurrency: 5,
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    worker.on('completed', (job) => {
      this.logger.log(`Job completed: ${queueName}:${job.name} (${job.id})`);
    });

    worker.on('failed', (job, err) => {
      this.logger.error(`Job failed: ${queueName}:${job?.name} (${job?.id}): ${err.message}`);
    });

    worker.on('stalled', (jobId) => {
      this.logger.warn(`Job stalled: ${queueName}:${jobId}`);
    });

    this.workers.set(queueName, worker);
    this.logger.log(`Worker created for queue: ${queueName}`);
    return worker;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};
    
    for (const [queueName] of this.queues) {
      stats[queueName] = await this.getQueueStats(queueName);
    }

    return stats;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.log(`Queue paused: ${queueName}`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.log(`Queue resumed: ${queueName}`);
  }

  /**
   * Clean old jobs from a queue
   */
  async cleanQueue(queueName: string, grace: number = 24 * 60 * 60 * 1000): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.clean(grace, 100, 'completed');
    await queue.clean(grace, 100, 'failed');
    this.logger.log(`Queue cleaned: ${queueName}`);
  }

  /**
   * Get a queue by name
   */
  private getQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      return this.createQueue(queueName);
    }
    return this.queues.get(queueName)!;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.log('Shutting down BullMQ service...');
    
    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      this.logger.log(`Worker closed: ${name}`);
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      this.logger.log(`Queue closed: ${name}`);
    }

    // Close Redis connection
    await this.redis.quit();
    this.logger.log('BullMQ service shutdown complete');
  }
}
