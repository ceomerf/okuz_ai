import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { ReplanService } from './replan.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { GeminiModule } from '../services/gemini.module';
import { GeminiFunctionCallingService } from '../services/gemini-fc.service';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [PrismaModule, GeminiModule, AuthModule, RealtimeModule, MonitoringModule],
  controllers: [PlanningController],
  providers: [PlanningService, ReplanService, GeminiFunctionCallingService],
  exports: [PlanningService, ReplanService],
})
export class PlanningModule {}
