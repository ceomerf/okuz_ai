import { Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Logger } from '@nestjs/common';
import { QueueService } from '../../services/queue.service';
import { MetricsService } from '../../monitoring/metrics.service';
import { ReplanService } from '../replan.service';

// Bu dosya ayrı bir süreçte çalıştırılmak üzere tasarlanmıştır (örn. pm2 process)
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('ReplanWorker');

  const queueService = app.get(QueueService);
  const metrics = app.get(MetricsService);
  const replanService = app.get(ReplanService);

  const connection = queueService.getConnection();
  const events = new QueueEvents('replan', { connection });

  events.on('failed', async ({ jobId, failedReason }) => {
    logger.error(`[replan] failed jobId=${jobId} reason=${failedReason}`);
  });

  events.on('stalled', ({ jobId }) => {
    logger.warn(`[replan] stalled jobId=${jobId}`);
  });

  events.on('completed', ({ jobId }) => {
    logger.log(`[replan] completed jobId=${jobId}`);
  });

  const worker = new Worker(
    'replan',
    async (job) => {
      try {
        const started = Date.now();
        const payload = job.data as { scope: 'daily' | 'weekly'; userId: string; planId: string };
        await replanService.processReevaluationJob(payload);
        metrics.recordQueueProcessingTime('replan', Date.now() - started, true);
      } catch (err: any) {
        logger.error(`[replan] handler error jobId=${job.id} message=${err?.message || err}`);
        metrics.recordQueueProcessingTime('replan', 0, false);
        throw err;
      }
    },
    { connection, concurrency: 5 }
  );

  worker.on('failed', async (job, err) => {
    if (!job) return;
    logger.error(`[replan] worker failed jobId=${job.id} attemptsMade=${job.attemptsMade} reason=${err?.message || err}`);
    if (job.attemptsMade >= (job.opts.attempts || 0)) {
      // Tüm denemeler tükendi, DLQ'ya taşı
      try {
        await queueService.enqueueToDlq('replan', job.data, err?.message || 'unknown', job.attemptsMade);
        logger.warn(`[replan] job moved to DLQ jobId=${job.id}`);
      } catch (dlqErr: any) {
        logger.error(`[replan] DLQ enqueue failed jobId=${job.id} reason=${dlqErr?.message || dlqErr}`);
      }
    }
  });

  worker.on('completed', (job) => {
    if (!job) return;
    logger.log(`[replan] worker completed jobId=${job.id}`);
  });
}

bootstrap().catch((e) => {
  // Son çare logu; process yöneticisi yeniden başlatacaktır
  // eslint-disable-next-line no-console
  console.error('Replan worker bootstrap failed', e);
  process.exit(1);
});


