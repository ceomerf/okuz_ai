import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PlanningQueryService } from './planning-query.service';
import { PlanningPersistenceService } from './planning-persistence.service';
import { PlanningRuleService } from './planning-rule.service';
import { ReplanService } from './replan.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { GeminiModule } from '../services/gemini.module';
import { GeminiFunctionCallingService } from '../services/gemini-fc.service';
import { PlanGenerationService } from './plan-generation.service';
import { PlanValidationService } from './plan-validation.service';
import { PlanPersistenceService } from './plan-persistence.service';
import { PlanAnalysisService } from './plan-analysis.service';
import { ScheduleAdjustmentService } from './schedule-adjustment.service';
import { AdaptiveInsightsService } from './adaptive-insights.service';
import { AdaptiveStrategyService } from './adaptive-strategy.service';
import { DigitalDossierService } from './digital-dossier.service';
import { AiAnalysisService } from './ai-analysis.service';
import { TopicManagementService } from './topic-management.service';
import { ProgressTrackingService } from './progress-tracking.service';
import { AssessmentService } from './assessment.service';
import { CoachingService } from './coaching.service';
import { SolverService } from '../services/solver.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { MetricsService } from '../monitoring/metrics.service';
import { CacheModule } from '../common/cache/cache.module';
import { CacheService } from '../common/cache/cache.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [PrismaModule, GeminiModule, CacheModule, ConfigModule, AuthModule, RealtimeModule, MonitoringModule],
  controllers: [PlanningController],
  providers: [
    PlanningService, 
    PlanningQueryService, 
    PlanningPersistenceService, 
    PlanningRuleService, 
    ReplanService, 
    GeminiFunctionCallingService, 
    PlanGenerationService, 
    PlanValidationService, 
    PlanPersistenceService, 
    PlanAnalysisService,
    ScheduleAdjustmentService, 
    AdaptiveInsightsService, 
    AdaptiveStrategyService, 
    DigitalDossierService,
    AiAnalysisService,
    TopicManagementService,
    ProgressTrackingService,
    AssessmentService,
    CoachingService,
    CacheService,
    SolverService,
    RealtimeGateway,
    MetricsService
  ],
  exports: [
    PlanningService, 
    PlanningQueryService, 
    PlanningPersistenceService, 
    PlanningRuleService, 
    ReplanService, 
    PlanGenerationService, 
    PlanValidationService, 
    PlanPersistenceService, 
    PlanAnalysisService,
    ScheduleAdjustmentService, 
    AdaptiveInsightsService, 
    AdaptiveStrategyService, 
    DigitalDossierService
  ],
})
export class PlanningModule {}
