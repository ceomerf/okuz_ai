import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';

// Core Services
import { PlanningService } from './services/planning.service';
import { PlanningFacadeService } from './services/planning-facade.service';
import { PlanGenerationService } from './services/plan-generation.service';
import { PlanValidationService } from './services/plan-validation.service';
import { PlanOptimizationService } from './services/plan-optimization.service';
import { PlanPersistenceService } from './services/plan-persistence.service';
import { PlanAnalysisService } from './services/plan-analysis.service';

// Controllers
import { PlanningController } from './controllers/planning.controller';
import { HealthController } from './controllers/health.controller';

// Database
import { PrismaModule } from './database/prisma.module';

// Event Bus
import { EventBusService } from './events/event-bus.service';
import { MessageQueueService } from './queue/message-queue.service';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Interceptors
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';

// Filters
import { HttpExceptionFilter } from './filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.production', '.env.development'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
        PORT: Joi.number().port().default(3001),
        
        // Database
        PLANNING_DATABASE_URL: Joi.string().uri().required(),
        
        // Redis
        REDIS_URL: Joi.string().uri().required(),
        
        // JWT
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_ACCESS_TOKEN_EXPIRATION: Joi.string().default('1h'),
        
        // AI Services
        OPENAI_API_KEY: Joi.string().min(20).required(),
        
        // Event Bus
        EVENT_BUS_URL: Joi.string().uri().required(),
        EVENT_BUS_TOPIC: Joi.string().default('planning-events'),
        
        // Message Queue
        MESSAGE_QUEUE_URL: Joi.string().uri().required(),
        MESSAGE_QUEUE_TOPIC: Joi.string().default('planning-queue'),
        
        // Service Discovery
        SERVICE_REGISTRY_URL: Joi.string().uri().required(),
        SERVICE_NAME: Joi.string().default('planning-service'),
        SERVICE_VERSION: Joi.string().default('1.0.0'),
        
        // Monitoring
        PROMETHEUS_PORT: Joi.number().port().optional(),
        HEALTH_CHECK_INTERVAL: Joi.number().integer().min(1000).default(30000),
      }),
    }),
    
    // JWT Module
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION'),
        },
      }),
    }),
    
    // Passport Module
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // Cache Module
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        ttl: 300,
        max: 1000,
      }),
    }),
    
    // Schedule Module
    ScheduleModule.forRoot(),
    
    // Database Module
    PrismaModule,
  ],
  
  controllers: [
    PlanningController,
    HealthController,
  ],
  
  providers: [
    // Core Services
    PlanningService,
    PlanningFacadeService,
    PlanGenerationService,
    PlanValidationService,
    PlanOptimizationService,
    PlanPersistenceService,
    PlanAnalysisService,
    
    // Event Bus
    EventBusService,
    MessageQueueService,
    
    // Guards
    JwtAuthGuard,
    
    // Interceptors
    LoggingInterceptor,
    TransformInterceptor,
    
    // Filters
    HttpExceptionFilter,
  ],
  
  exports: [
    PlanningService,
    PlanningFacadeService,
    PlanGenerationService,
    PlanValidationService,
    PlanOptimizationService,
    PlanPersistenceService,
    PlanAnalysisService,
    EventBusService,
    MessageQueueService,
  ],
})
export class PlanningMicroserviceModule {}