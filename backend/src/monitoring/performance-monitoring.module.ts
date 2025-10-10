import { Module } from '@nestjs/common';
import { PerformanceMonitoringController } from './performance-monitoring.controller';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PerformanceMonitoringController],
  providers: [PerformanceMonitoringService],
  exports: [PerformanceMonitoringService],
})
export class PerformanceMonitoringModule {}
