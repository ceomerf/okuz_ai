import { Injectable } from '@nestjs/common';
import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';

type QueueName = 'replan' | 'generate-plan';

@Injectable()
export class QueueService {
  private readonly connection: IORedis;
  private readonly queues: Record<QueueName, Queue>;

  constructor() {
    this.connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    this.queues = {
      replan: new Queue('replan', { connection: this.connection }),
      'generate-plan': new Queue('generate-plan', { connection: this.connection }),
    } as any;
  }

  async addJob<T = any>(name: QueueName, payload: T, opts?: JobsOptions) {
    const queue = this.queues[name];
    return queue.add(name, payload as any, opts);
  }

  getConnection() {
    return this.connection;
  }
}


