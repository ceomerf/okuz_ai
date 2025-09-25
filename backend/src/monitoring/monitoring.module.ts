import { Module } from '@nestjs/common';
import { MetricsModule } from './metrics.module';
import { HealthController } from './health.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [MetricsModule, PrismaModule],
  controllers: [HealthController],
  exports: [MetricsModule],
})
export class MonitoringModule {}
