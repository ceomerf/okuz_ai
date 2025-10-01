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

  constructor(private readonly metrics?: MetricsService) {
    this.connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
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
    return this.connection;
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
}


