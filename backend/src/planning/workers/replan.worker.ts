import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReplanService } from '../replan.service';
import { MetricsService } from '../../monitoring/metrics.service';

// Basit worker örneği (ayrı süreçte instantiate edilmesi önerilir)
const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

const prisma = new PrismaService();
const metrics = new MetricsService();
const replan = new ReplanService(prisma as any, {} as any, { addJob: async () => {} } as any, metrics);

export const replanWorker = new Worker(
  'replan',
  async (job) => {
    const payload = job.data as { scope: 'daily' | 'weekly'; userId: string; planId: string };
    await replan.processReevaluationJob(payload);
  },
  { connection }
);


