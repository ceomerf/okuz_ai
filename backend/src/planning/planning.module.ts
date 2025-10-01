import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { ReplanService } from './replan.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { GeminiModule } from '../services/gemini.module';
import { GeminiFunctionCallingService } from '../services/gemini-fc.service';
import { PlanGenerationService } from './plan-generation.service';
import { PlanValidationService } from './plan-validation.service';
import { PlanPersistenceService } from './plan-persistence.service';
import { ScheduleAdjustmentService } from './schedule-adjustment.service';
import { AdaptiveInsightsService } from './adaptive-insights.service';
import { AdaptiveStrategyService } from './adaptive-strategy.service';
import { DigitalDossierService } from './digital-dossier.service';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [PrismaModule, GeminiModule, AuthModule, RealtimeModule, MonitoringModule],
  controllers: [PlanningController],
  providers: [PlanningService, ReplanService, GeminiFunctionCallingService, PlanGenerationService, PlanValidationService, PlanPersistenceService, ScheduleAdjustmentService, AdaptiveInsightsService, AdaptiveStrategyService, DigitalDossierService],
  exports: [PlanningService, ReplanService, PlanGenerationService, PlanValidationService, PlanPersistenceService, ScheduleAdjustmentService, AdaptiveInsightsService, AdaptiveStrategyService, DigitalDossierService],
})
export class PlanningModule {}
