import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../../../shared/common/src/prisma/prisma.module';
import { PlanningController } from './controllers/planning.controller';
import { SessionsController } from './controllers/sessions.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { HealthController } from './controllers/health.controller';
import { PlanningService } from './services/planning.service';
import { SessionService } from './services/session.service';
import { AnalyticsService } from './services/analytics.service';
import { PlanGenerationService } from './services/plan-generation.service';
import { PlanValidationService } from './services/plan-validation.service';
import { PlanOptimizationService } from './services/plan-optimization.service';
import { PlanPersistenceService } from './services/plan-persistence.service';
import { PlanningFacade } from './services/planning-facade.service';
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
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get<number>('THROTTLE_TTL', 60) as number,
        limit: configService.get<number>('THROTTLE_LIMIT', 10) as number,
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get<number>('CACHE_TTL', 300) as number,
        max: configService.get<number>('CACHE_MAX', 100) as number,
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
  ],
  controllers: [
    PlanningController,
    SessionsController,
    AnalyticsController,
    HealthController,
  ],
  providers: [
    PlanningService,
    SessionService,
    AnalyticsService,
    PlanGenerationService,
    PlanValidationService,
    PlanOptimizationService,
    PlanPersistenceService,
    PlanningFacade,
    JwtAuthGuard,
    RolesGuard,
    RateLimitGuard,
  ],
  exports: [
    PlanningService,
    SessionService,
    AnalyticsService,
    PlanningFacade,
  ],
})
export class PlanningModule {}
