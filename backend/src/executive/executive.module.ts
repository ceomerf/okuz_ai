import { Module } from '@nestjs/common';
import { ExecutiveDashboardController } from './executive-dashboard.controller';
import { ExecutiveDashboardService } from './executive-dashboard.service';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
  controllers: [ExecutiveDashboardController],
  providers: [ExecutiveDashboardService, PrismaService],
  exports: [ExecutiveDashboardService],
})
export class ExecutiveModule {}