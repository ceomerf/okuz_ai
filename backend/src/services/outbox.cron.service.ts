import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxWorker } from './outbox.worker';

@Injectable()
export class OutboxCronService {
  private readonly logger = new Logger(OutboxCronService.name);
  constructor(private readonly worker: OutboxWorker) {}

  // Sık aralıkla küçük batch: düşük gecikme + düşük yük
  @Cron(CronExpression.EVERY_10_SECONDS)
  async tick() {
    const res = await this.worker.processBatch(200);
    if (res.processed > 0) {
      this.logger.log(`outbox_tick processed=${res.processed} tookMs=${res.tookMs}`);
    }
  }
}


