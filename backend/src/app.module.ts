import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { GeminiModule } from './services/gemini.module';
import { QueueModule } from './services/queue.module';
import { CacheModule } from './services/cache.module';
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
        JWT_REFRESH_SECRET: Joi.string().min(32).optional(),
        GEMINI_API_KEY: Joi.string().required(),
        GEMINI_MODEL: Joi.string().optional(),
        CORS_ORIGINS: Joi.string().allow('').optional(),
        PROMETHEUS_PORT: Joi.number().port().optional(),
        SWAGGER_ENABLE: Joi.boolean().optional(),
      }),
    }),
    PrismaModule,
    ScheduleModule.forRoot(),
    GeminiModule,
    QueueModule,
    CacheModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
