import { Injectable, Logger } from '@nestjs/common';
import { Queue, QueueEvents, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { MetricsService } from '../monitoring/metrics.service';

type QueueName = 'replan' | 'generate-plan';

@Injectable()
export class QueueService {
  private readonly connection: IORedis;
  private readonly queues: Record<QueueName, Queue>;
  private readonly dlqQueues: Record<QueueName, Queue>;
  private readonly events: Record<QueueName, QueueEvents>;
  private readonly logger = new Logger(QueueService.name);
  private readonly isTestMode = process.env.NODE_ENV === 'test';

  constructor(private readonly metrics?: MetricsService) {
    if (this.isTestMode) {
      // Test modunda gerçek Redis bağlantısı kurma
      this.connection = undefined as any;
      this.queues = {
        replan: undefined as any,
        'generate-plan': undefined as any,
      } as any;
      this.dlqQueues = {
        replan: undefined as any,
        'generate-plan': undefined as any,
      } as any;
      this.events = {
        replan: undefined as any,
        'generate-plan': undefined as any,
      } as any;
      return;
    }

    this.connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: null,
    } as any);
    // Ana kuyruklar
    this.queues = {
      replan: new Queue('replan', { connection: this.connection }),
      'generate-plan': new Queue('generate-plan', { connection: this.connection }),
    } as any;

    // Dead-letter kuyruklar (aynı redis üzerinde ayrı isimlerde)
    this.dlqQueues = {
      replan: new Queue('replan:dlq', { connection: this.connection }),
      'generate-plan': new Queue('generate-plan:dlq', { connection: this.connection }),
    } as any;

    // QueueEvents: completed/failed/stalled dinleyicileri
    this.events = {
      replan: new QueueEvents('replan', { connection: this.connection }),
      'generate-plan': new QueueEvents('generate-plan', { connection: this.connection }),
    } as any;

    this.bindEventListeners();
    this.sampleQueueSizes();
  }

  async addJob<T = any>(name: QueueName, payload: T, opts?: JobsOptions) {
    if (this.isTestMode) {
      return Promise.resolve({ id: `${name}:test-job`, name, data: payload } as any);
    }
    const queue = this.queues[name];
    const defaulted: JobsOptions = {
      attempts: 2,
      backoff: { type: 'exponential', delay: 15000 },
      removeOnComplete: 1000,
      removeOnFail: false,
      ...opts,
    };
    return queue.add(name, payload as any, defaulted);
  }

  getConnection() {
    return this.isTestMode ? undefined : this.connection;
  }

  /**
   * Bir işi DLQ'ya (dead-letter queue) yeniden kuyruğa ekler.
   * Orijinal payload'a hata bağlamını ekler.
   */
  async enqueueToDlq<T = any>(name: QueueName, payload: T, failedReason: string, attemptsMade: number) {
    const dlq = this.dlqQueues[name];
    const body = {
      ...((payload as unknown) as Record<string, any>),
      _dlq: {
        failedReason,
        attemptsMade,
        failedAt: new Date().toISOString(),
      },
    } as any;
    await dlq.add(`${name}:dlq`, body, { removeOnComplete: 1000, removeOnFail: 1000 });
  }

  private bindEventListeners() {
    for (const name of Object.keys(this.events) as Array<QueueName>) {
      const ev = this.events[name];

      ev.on('completed', ({ jobId, returnvalue }) => {
        this.logger.log(`[${name}] completed jobId=${jobId}`);
      });

      ev.on('stalled', ({ jobId }) => {
        this.logger.warn(`[${name}] stalled jobId=${jobId}`);
      });

      ev.on('failed', async ({ jobId, failedReason, prev }) => {
        // QueueEvents payload'unda attemptsMade yok; detay için worker tarafı daha uygun.
        // Burada sadece loglanır.
        this.logger.error(`[${name}] failed jobId=${jobId} reason=${failedReason} prev=${prev}`);
      });

      ev.on('error', (err) => {
        this.logger.error(`[${name}] queue events error: ${err?.message || err}`);
      });
    }
  }

  private async sampleQueueSizes() {
    try {
      for (const [name, q] of Object.entries(this.queues) as any) {
        const count = await q.count();
        if (this.metrics) {
          this.metrics.recordQueueSize(name, count);
        }
      }
    } catch (e) {
      this.logger.warn(`queue size sample failed: ${(e as any)?.message || e}`);
    } finally {
      setTimeout(() => this.sampleQueueSizes(), 15000);
    }
  }

  // Test için mock methodlar
  async processJob(jobId: string, data: any) {
    this.logger.log(`Processing job ${jobId} with data:`, data);
    return { success: true, jobId };
  }

  async getJobStatus(jobId: string) {
    return { id: jobId, status: 'completed', progress: 100 };
  }

  async getQueueStats(queueName: QueueName) {
    const queue = this.queues[queueName];
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();
    
    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  async pauseQueue(queueName: QueueName) {
    const queue = this.queues[queueName];
    await queue.pause();
    return { success: true, queueName };
  }

  async resumeQueue(queueName: QueueName) {
    const queue = this.queues[queueName];
    await queue.resume();
    return { success: true, queueName };
  }

  async clearQueue(queueName: QueueName) {
    const queue = this.queues[queueName];
    await queue.obliterate();
    return { success: true, queueName };
  }

  async retryJob(jobId: string, queueName: QueueName) {
    const queue = this.queues[queueName];
    const job = await queue.getJob(jobId);
    if (job) {
      await job.retry();
      return { success: true, jobId };
    }
    throw new Error('Job not found');
  }

  async removeJob(jobId: string, queueName: QueueName) {
    const queue = this.queues[queueName];
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      return { success: true, jobId };
    }
    throw new Error('Job not found');
  }

  async getJobLogs(jobId: string, queueName: QueueName) {
    const queue = this.queues[queueName];
    const job = await queue.getJob(jobId);
    if (job) {
      return {
        logs: job.log,
        progress: job.progress,
        status: await job.getState(),
      };
    }
    throw new Error('Job not found');
  }

  async getFailedJobs(queueName: QueueName) {
    const queue = this.queues[queueName];
    const failed = await queue.getFailed();
    return failed.map(job => ({
      id: job.id,
      data: job.data,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
    }));
  }

  async getCompletedJobs(queueName: QueueName) {
    const queue = this.queues[queueName];
    const completed = await queue.getCompleted();
    return completed.map(job => ({
      id: job.id,
      data: job.data,
      returnvalue: job.returnvalue,
      timestamp: job.timestamp,
    }));
  }

  async getActiveJobs(queueName: QueueName) {
    const queue = this.queues[queueName];
    const active = await queue.getActive();
    return active.map(job => ({
      id: job.id,
      data: job.data,
      progress: job.progress,
      timestamp: job.timestamp,
    }));
  }
}


