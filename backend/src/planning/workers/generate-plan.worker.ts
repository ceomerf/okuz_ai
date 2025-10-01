import { Worker, QueueEvents } from 'bullmq';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Logger } from '@nestjs/common';
import { QueueService } from '../../services/queue.service';
import { PlanningService } from '../planning.service';
import { MetricsService } from '../../monitoring/metrics.service';

// Ayrı süreçte çalıştırılmak üzere tasarlanmıştır
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('GeneratePlanWorker');

  const queueService = app.get(QueueService);
  const planningService = app.get(PlanningService);
  const metrics = app.get(MetricsService);

  const connection = queueService.getConnection();
  const events = new QueueEvents('generate-plan', { connection });

  events.on('failed', async ({ jobId, failedReason }) => {
    logger.error(`[generate-plan] failed jobId=${jobId} reason=${failedReason}`);
  });

  events.on('stalled', ({ jobId }) => {
    logger.warn(`[generate-plan] stalled jobId=${jobId}`);
  });

  events.on('completed', ({ jobId }) => {
    logger.log(`[generate-plan] completed jobId=${jobId}`);
  });

  const worker = new Worker(
    'generate-plan',
    async (job) => {
      try {
        const started = Date.now();
        const data = job.data as { userId: string; payload: any };
        logger.log(`[generate-plan] handling jobId=${job.id} mode=${data?.payload?.mode || 'unknown'} userId=${data?.userId}`);
        await planningService.generatePlan({ ...data.payload, userId: data.userId });
        logger.log(`[generate-plan] persisted plan for jobId=${job.id} in ${Date.now() - started}ms`);
        metrics.recordQueueProcessingTime('generate-plan', Date.now() - started, true);
      } catch (err: any) {
        logger.error(`[generate-plan] handler error jobId=${job.id} message=${err?.message || err}`);
        metrics.recordQueueProcessingTime('generate-plan', 0, false);
        throw err;
      }
    },
    { connection, concurrency: 3 }
  );

  worker.on('failed', async (job, err) => {
    if (!job) return;
    logger.error(`[generate-plan] worker failed jobId=${job.id} attemptsMade=${job.attemptsMade} reason=${err?.message || err}`);
    if (job.attemptsMade >= (job.opts.attempts || 0)) {
      try {
        await queueService.enqueueToDlq('generate-plan', job.data, err?.message || 'unknown', job.attemptsMade);
        logger.warn(`[generate-plan] job moved to DLQ jobId=${job.id}`);
      } catch (dlqErr: any) {
        logger.error(`[generate-plan] DLQ enqueue failed jobId=${job.id} reason=${dlqErr?.message || dlqErr}`);
      }
    }
  });

  worker.on('completed', (job) => {
    if (!job) return;
    logger.log(`[generate-plan] worker completed jobId=${job.id}`);
  });
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('GeneratePlan worker bootstrap failed', e);
  process.exit(1);
});


