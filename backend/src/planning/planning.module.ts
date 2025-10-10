import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PlanningQueryService } from './planning-query.service';
import { PlanningPersistenceService } from './planning-persistence.service';
import { PlanningRuleService } from './planning-rule.service';
import { ReplanService } from './replan.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PlanGenerationService } from './services/plan-generation.service';
import { PlanValidationService } from './services/plan-validation.service';
import { PlanOptimizationService } from './services/plan-optimization.service';
import { PlanPersistenceService } from './services/plan-persistence.service';
import { PlanningFacade } from './planning-facade.service';
import { PlanAnalysisService } from './plan-analysis.service';
import { ScheduleAdjustmentService } from './schedule-adjustment.service';
import { AdaptiveInsightsService } from './adaptive-insights.service';
import { AdaptiveStrategyService } from './adaptive-strategy.service';
import { DigitalDossierService } from './digital-dossier.service';
import { AiAnalysisService } from './ai-analysis.service';
import { TopicManagementService } from './services/topic-management.service';
import { ProgressTrackingService } from './progress-tracking.service';
import { AssessmentService } from './assessment.service';
import { CoachingService } from './coaching.service';
import { SolverService } from '../services/solver.service';
import { MetricsService } from '../monitoring/metrics.service';
// import { CacheModule } from '../common/cache/cache.module';
import { CacheService } from '../common/cache/cache.service';
import { OpenAIService } from '../services/openai.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { CurriculumEngineService } from './services/curriculum-engine.service';
import { PerformanceAnalyzerService } from './services/performance-analyzer.service';
import { TopicPrioritizerService } from './services/topic-prioritizer.service';
import { OutboxService } from '../services/outbox.service';
import { OutboxWorker } from '../services/outbox.worker';
import { OutboxCronService } from '../services/outbox.cron.service';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueModule } from '../services/queue.module';
import { AIModule } from '../ai/ai.module';
import { AIService } from '../ai/ai.service';
import { LoggingService } from '../common/logging/logging.service';
import { ExceptionService } from '../common/exceptions/exception.service';

@Module({
  imports: [
    PrismaModule, 
    // CacheModule, 
    ConfigModule, 
    AuthModule, 
    RealtimeModule, 
    MonitoringModule, 
    ScheduleModule.forRoot(),
    QueueModule,
    AIModule
  ],
  controllers: [PlanningController],
  providers: [
    // Legacy services (deprecated - will be removed)
    PlanningService, 
    PlanningQueryService, 
    PlanningPersistenceService, 
    PlanningRuleService, 
    ReplanService, 
    
    // New modular services
    PlanningFacade,
    PlanGenerationService, 
    PlanValidationService, 
    PlanOptimizationService,
    PlanPersistenceService, 
    
    // Supporting services
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
    OpenAIService,
    SolverService,
    MetricsService,
    CurriculumEngineService,
    PerformanceAnalyzerService,
    TopicPrioritizerService,
    OutboxService,
    OutboxWorker,
    OutboxCronService,
    
    // New services
    AIService,
    LoggingService,
    ExceptionService
  ],
  exports: [
    // Primary facade service
    PlanningFacade,
    
    // Individual services for direct access
    PlanGenerationService, 
    PlanValidationService, 
    PlanOptimizationService,
    PlanPersistenceService,
    
    // Legacy services (for backward compatibility)
    PlanningService, 
    PlanningQueryService, 
    PlanningPersistenceService, 
    PlanningRuleService, 
    ReplanService, 
    
    // Supporting services
    PlanAnalysisService,
    ScheduleAdjustmentService, 
    AdaptiveInsightsService, 
    AdaptiveStrategyService, 
    DigitalDossierService,
    CurriculumEngineService,
    PerformanceAnalyzerService,
    TopicPrioritizerService,
    OutboxService,
    OutboxWorker,
    OutboxCronService
  ],
})
export class PlanningModule {}
