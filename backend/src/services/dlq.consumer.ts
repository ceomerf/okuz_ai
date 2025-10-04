import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { QueueService } from './queue.service';
import { Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

/**
 * Basit DLQ tüketici: DLQ kuyruğundaki (replan:dlq, generate-plan:dlq) işleri listeler veya yeniden kuyruğa alır.
 * Kullanım: node dist/src/services/dlq.consumer.js list | requeue <queue> <limit>
 */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('DLQConsumer');
  const queueService = app.get(QueueService);
  const conn = queueService.getConnection();

  const args = process.argv.slice(2);
  const cmd = args[0] || 'list';

  const dlqs: Record<string, Queue> = {
    replan: new Queue('replan:dlq', { connection: conn }),
    'generate-plan': new Queue('generate-plan:dlq', { connection: conn }),
  } as any;

  if (cmd === 'list') {
    for (const [name, q] of Object.entries(dlqs)) {
      const jobs = await q.getJobs(['waiting', 'delayed', 'failed'], 0, 50);
      logger.log(`[${name}] DLQ size=${jobs.length}`);
      for (const j of jobs) {
        logger.log(`  id=${j.id} reason=${(j.data && j.data._dlq && j.data._dlq.failedReason) || 'n/a'}`);
      }
    }
  } else if (cmd === 'requeue') {
    const target = args[1] as 'replan' | 'generate-plan';
    const limit = parseInt(args[2] || '10', 10);
    if (!target || !dlqs[target]) {
      logger.error('Usage: requeue <replan|generate-plan> <limit>');
      process.exit(1);
    }
    const dead = dlqs[target];
    const jobs = await dead.getJobs(['waiting', 'delayed', 'failed'], 0, limit);
    for (const j of jobs) {
      const original = { ...j.data };
      delete (original as any)._dlq;
      await queueService.addJob(target, original, { attempts: 3 });
      await j.remove();
      logger.log(`[${target}] requeued job from DLQ id=${j.id}`);
    }
  } else {
    logger.error(`Unknown command: ${cmd}`);
    process.exit(1);
  }

  await app.close();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('DLQ consumer failed', e);
  process.exit(1);
});


