import { Module } from '@nestjs/common';
import { AdvancedAnalyticsController } from './advanced-analytics.controller';
import { AdvancedAnalyticsService } from './advanced-analytics.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdvancedAnalyticsController],
  providers: [AdvancedAnalyticsService],
  exports: [AdvancedAnalyticsService],
})
export class AdvancedAnalyticsModule {}
