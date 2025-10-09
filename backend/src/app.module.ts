import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
// import { GeminiModule } from './services/gemini.module'; // DEVRE DIŞI - OPENAI KULLANILIYOR
import { QueueModule } from './services/queue.module';
// import { CacheModule as CommonCacheModule } from './common/cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { ParentsModule } from './parents/parents.module';
import { SmartToolsModule } from './smart-tools/smart-tools.module';
import { GamificationModule } from './gamification/gamification.module';
import { PlanningModule } from './planning/planning.module';
import { AnalysisModule } from './analysis/analysis.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { InvitesModule } from './invites/invites.module';
import { InteractionModule } from './interaction/interaction.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SolverModule } from './services/solver.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { CoachingModule } from './coaching/coaching.module';
import { ParentReportsModule } from './parent-reports/parent-reports.module';
import { AICoachModule } from './ai-coach/ai-coach.module';
import { NotificationSettingsModule } from './notification-settings/notification-settings.module';
import { ReferralModule } from './referral/referral.module';
import { SystemModule } from './system/system.module';
import { RbacModule } from './rbac/rbac.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.production', '.env.development'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
        PORT: Joi.number().port().default(3000),
        DATABASE_URL: Joi.string().uri().required(),
        REDIS_URL: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        OPENAI_API_KEY: Joi.string().min(20).required(),
        CORS_ALLOWED_ORIGINS: Joi.string().min(1).required(),
        BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
        JWT_ACCESS_TOKEN_EXPIRATION: Joi.string().default('1h'),
        JWT_REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),
        THROTTLER_SHORT_TTL: Joi.number().integer().min(1000).default(60000),
        THROTTLER_SHORT_LIMIT: Joi.number().integer().min(1).default(5),
        THROTTLER_MEDIUM_TTL: Joi.number().integer().min(1000).default(60000),
        THROTTLER_MEDIUM_LIMIT: Joi.number().integer().min(1).default(20),
        THROTTLER_LONG_TTL: Joi.number().integer().min(1000).default(60000),
        THROTTLER_LONG_LIMIT: Joi.number().integer().min(1).default(100),
        PROMETHEUS_PORT: Joi.number().port().optional(),
        SWAGGER_ENABLE: Joi.boolean().default(true),
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'short',
          ttl: parseInt(configService.get<string>('THROTTLER_SHORT_TTL') || '60000'), // 1 dakika
          limit: parseInt(configService.get<string>('THROTTLER_SHORT_LIMIT') || '5'), // 5 istek
        },
        {
          name: 'medium',
          ttl: parseInt(configService.get<string>('THROTTLER_MEDIUM_TTL') || '60000'), // 1 dakika
          limit: parseInt(configService.get<string>('THROTTLER_MEDIUM_LIMIT') || '20'), // 20 istek
        },
        {
          name: 'long',
          ttl: parseInt(configService.get<string>('THROTTLER_LONG_TTL') || '60000'), // 1 dakika
          limit: parseInt(configService.get<string>('THROTTLER_LONG_LIMIT') || '100'), // 100 istek
        },
      ],
    }),
    EventEmitterModule.forRoot(),
    CacheModule.register({ isGlobal: true, ttl: 300, max: 100 }),
    PrismaModule,
    ScheduleModule.forRoot(),
    // GeminiModule, // DEVRE DIŞI - OPENAI KULLANILIYOR
    // OpenAIModule, // OpenAI modülü eklenebilir
    QueueModule,
    // CommonCacheModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    ParentsModule,
    SmartToolsModule,
    GamificationModule,
    PlanningModule,
    AnalysisModule,
    AnalyticsModule,
    InvitesModule,
    InteractionModule,
    NotificationsModule,
    SubscriptionModule,
    RealtimeModule,
    SolverModule,
    MonitoringModule,
    // Sprint 1: Koç paneli ve veli raporları
    CoachingModule,
    ParentReportsModule,
    AICoachModule,
    NotificationSettingsModule,
    ReferralModule,
    SystemModule,
    RbacModule,
    FeatureFlagsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
