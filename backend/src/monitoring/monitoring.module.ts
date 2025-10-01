import { Module } from '@nestjs/common';
import { MetricsModule } from './metrics.module';
import { HealthController } from './health.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { UsageResetService } from './usage-reset.service';

@Module({
  imports: [MetricsModule, PrismaModule],
  controllers: [HealthController],
  providers: [UsageResetService],
  exports: [MetricsModule],
})
export class MonitoringModule {}
