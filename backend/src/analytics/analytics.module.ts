import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueModule } from '../services/queue.module';
import { AnalyticsEventsController } from './events.controller';
import { AnalyticsService } from '../common/analytics/analytics.service';
import { AnalyticsManagementController } from './analytics-management.controller';
import { AnalyticsManagementService } from './analytics-management.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule, QueueModule],
  controllers: [AnalyticsManagementController, AnalyticsEventsController],
  providers: [AnalyticsManagementService, AnalyticsService],
  exports: [AnalyticsManagementService, AnalyticsService],
})
export class AnalyticsModule {}