import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
@// import { CacheModule } from '../common/cache/cache.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { QueueModule } from '../services/queue.module';

// Core AI Services
import { AIOrchestrator } from './ai-orchestrator.service';
import { AIConfigService } from './ai-config.service';
import { PromptRegistry } from './prompt-registry.service';
import { AILoggerService } from './ai-logger.service';

// New AI Services
import { PromptVersioningService } from './prompt-versioning.service';
import { AIRateLimitService } from './ai-rate-limit.service';
import { PromptTestingService } from './prompt-testing.service';
import { AIMonitoringService } from './ai-monitoring.service';

// Legacy Services (for backward compatibility)
import { AIService } from './ai.service';

@Module({
  imports: [
    ConfigModule,
    CacheModule,
    PrismaModule,
    MonitoringModule,
    QueueModule,
  ],
  providers: [
    // Core AI Services
    AIOrchestrator,
    AIConfigService,
    PromptRegistry,
    AILoggerService,
    
    // New AI Services
    PromptVersioningService,
    AIRateLimitService,
    PromptTestingService,
    AIMonitoringService,
    
    // Legacy Services
    AIService,
  ],
  exports: [
    // Primary AI Orchestrator
    AIOrchestrator,
    
    // Supporting Services
    AIConfigService,
    PromptRegistry,
    AILoggerService,
    PromptVersioningService,
    AIRateLimitService,
    PromptTestingService,
    AIMonitoringService,
    
    // Legacy Services (for backward compatibility)
    AIService,
  ],
})
export class AIModule {}