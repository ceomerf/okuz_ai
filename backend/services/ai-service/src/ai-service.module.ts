import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../../../shared/common/src/prisma/prisma.module';
import { AIController } from './controllers/ai.controller';
import { CoachingController } from './controllers/coaching.controller';
import { PromptsController } from './controllers/prompts.controller';
import { HealthController } from './controllers/health.controller';
import { AIService } from './services/ai.service';
import { AIConfigService } from './services/ai-config.service';
import { PromptRegistryService } from './services/prompt-registry.service';
import { AILoggerService } from './services/ai-logger.service';
import { RealTimeAICoachService } from './services/realtime-ai-coach.service';
import { ProgressAnalyzerService } from './services/progress-analyzer.service';
import { ProactiveCoachingService } from './services/proactive-coaching.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: (configService) => ({
        ttl: configService.get<number>('THROTTLE_TTL', 60),
        limit: configService.get<number>('THROTTLE_LIMIT', 10),
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      useFactory: (configService) => ({
        ttl: configService.get<number>('CACHE_TTL', 300),
        max: configService.get<number>('CACHE_MAX', 100),
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
  ],
  controllers: [
    AIController,
    CoachingController,
    PromptsController,
    HealthController,
  ],
  providers: [
    AIService,
    AIConfigService,
    PromptRegistryService,
    AILoggerService,
    RealTimeAICoachService,
    ProgressAnalyzerService,
    ProactiveCoachingService,
    JwtAuthGuard,
    RolesGuard,
    RateLimitGuard,
  ],
  exports: [
    AIService,
    AIConfigService,
    PromptRegistryService,
    AILoggerService,
    RealTimeAICoachService,
    ProgressAnalyzerService,
    ProactiveCoachingService,
  ],
})
export class AIServiceModule {}
