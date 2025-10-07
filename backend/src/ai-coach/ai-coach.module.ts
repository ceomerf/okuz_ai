import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { RealTimeAICoachService } from './realtime-ai-coach.service';
import { ProgressAnalyzerService } from './progress-analyzer.service';
import { ProactiveCoachingService } from './proactive-coaching.service';
import { EmotionalAIService } from './emotional-ai.service';
import { PersonalizedDashboardService } from './personalized-dashboard.service';
import { AIExplainabilityService } from './ai-explainability.service';
import { BehaviorAnalysisService } from './behavior-analysis.service';
import { ContextAwareCoachingService } from './context-aware-coaching.service';

@Module({
  imports: [
    ConfigModule,
    CacheModule,
    HttpModule,
    PrismaModule,
    AIModule,
    RealtimeModule,
  ],
  providers: [
    RealTimeAICoachService,
    ProgressAnalyzerService,
    ProactiveCoachingService,
    EmotionalAIService,
    PersonalizedDashboardService,
    AIExplainabilityService,
    BehaviorAnalysisService,
    ContextAwareCoachingService,
  ],
  exports: [
    RealTimeAICoachService,
    ProgressAnalyzerService,
    ProactiveCoachingService,
    EmotionalAIService,
    PersonalizedDashboardService,
    AIExplainabilityService,
    BehaviorAnalysisService,
    ContextAwareCoachingService,
  ],
})
export class AICoachModule {}