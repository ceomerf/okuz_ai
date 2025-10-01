import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UsageResetService {
  private readonly logger = new Logger(UsageResetService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Her ayın 1'i saat 00:10'da kota sıfırlama
  @Cron(CronExpression.EVERY_MONTH)
  async resetMonthlyTokenUsage() {
    try {
      await (this.prisma as any).userUsageControl.updateMany({
        data: {
          monthlyTokenUsed: 0,
          lastResetAt: new Date(),
        },
      });
      this.logger.log('Monthly token usage counters have been reset.');
    } catch (e) {
      this.logger.error(`Monthly token usage reset failed: ${(e as any)?.message || e}`);
    }
  }
}


