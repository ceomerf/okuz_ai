import { Module } from '@nestjs/common';
import { ExecutiveDashboardController } from './executive-dashboard.controller';
import { ExecutiveDashboardService } from './executive-dashboard.service';
import { ExecutiveWebController } from './executive-web.controller';
import { AutoManagementService } from './auto-management.service';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
  controllers: [ExecutiveDashboardController, ExecutiveWebController],
  providers: [ExecutiveDashboardService, AutoManagementService, PrismaService],
  exports: [ExecutiveDashboardService],
})
export class ExecutiveModule {}
