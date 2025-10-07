import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import * as Joi from 'joi';

// Controllers
import { ApiGatewayController } from './controllers/api-gateway.controller';
import { HealthController } from './controllers/health.controller';

// Services
import { ApiGatewayService } from './services/api-gateway.service';
import { AuthService } from './services/auth.service';
import { RateLimitService } from './services/rate-limit.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { LoadBalancerService } from './services/load-balancer.service';

// Clients
import { PlanningServiceClient } from './clients/planning-service.client';
import { AuthServiceClient } from './clients/auth-service.client';
import { SmartToolsServiceClient } from './clients/smart-tools-service.client';
import { GamificationServiceClient } from './clients/gamification-service.client';
import { NotificationServiceClient } from './clients/notification-service.client';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

// Interceptors
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { CacheInterceptor } from './interceptors/cache.interceptor';

// Filters
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { CircuitBreakerFilter } from './filters/circuit-breaker.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.production', '.env.development'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
        PORT: Joi.number().port().default(3000),
        
        // JWT Configuration
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_ACCESS_TOKEN_EXPIRATION: Joi.string().default('1h'),
        JWT_REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),
        
        // Redis Configuration
        REDIS_URL: Joi.string().uri().required(),
        
        // Rate Limiting
        THROTTLER_SHORT_TTL: Joi.number().integer().min(1000).default(60000),
        THROTTLER_SHORT_LIMIT: Joi.number().integer().min(1).default(5),
        THROTTLER_MEDIUM_TTL: Joi.number().integer().min(1000).default(60000),
        THROTTLER_MEDIUM_LIMIT: Joi.number().integer().min(1).default(20),
        THROTTLER_LONG_TTL: Joi.number().integer().min(1000).default(60000),
        THROTTLER_LONG_LIMIT: Joi.number().integer().min(1).default(100),
        
        // Service URLs
        PLANNING_SERVICE_URL: Joi.string().uri().required(),
        AUTH_SERVICE_URL: Joi.string().uri().required(),
        SMART_TOOLS_SERVICE_URL: Joi.string().uri().required(),
        GAMIFICATION_SERVICE_URL: Joi.string().uri().required(),
        NOTIFICATION_SERVICE_URL: Joi.string().uri().required(),
        
        // Circuit Breaker
        CIRCUIT_BREAKER_TIMEOUT: Joi.number().integer().min(1000).default(5000),
        CIRCUIT_BREAKER_THRESHOLD: Joi.number().integer().min(1).default(5),
        CIRCUIT_BREAKER_RESET_TIMEOUT: Joi.number().integer().min(1000).default(30000),
        
        // Load Balancer
        LOAD_BALANCER_STRATEGY: Joi.string().valid('round-robin', 'least-connections', 'random').default('round-robin'),
        
        // CORS
        CORS_ALLOWED_ORIGINS: Joi.string().min(1).required(),
        
        // Monitoring
        PROMETHEUS_PORT: Joi.number().port().optional(),
        SWAGGER_ENABLE: Joi.boolean().default(true),
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
    
    // Throttler Module
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'short',
          ttl: parseInt(configService.get<string>('THROTTLER_SHORT_TTL') || '60000'),
          limit: parseInt(configService.get<string>('THROTTLER_SHORT_LIMIT') || '5'),
        },
        {
          name: 'medium',
          ttl: parseInt(configService.get<string>('THROTTLER_MEDIUM_TTL') || '60000'),
          limit: parseInt(configService.get<string>('THROTTLER_MEDIUM_LIMIT') || '20'),
        },
        {
          name: 'long',
          ttl: parseInt(configService.get<string>('THROTTLER_LONG_TTL') || '60000'),
          limit: parseInt(configService.get<string>('THROTTLER_LONG_LIMIT') || '100'),
        },
      ],
    }),
    
    // Cache Module
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        url: configService.get<string>('REDIS_URL'),
        ttl: 300, // 5 minutes default TTL
        max: 1000, // Maximum number of items in cache
      }),
    }),
  ],
  
  controllers: [
    ApiGatewayController,
    HealthController,
  ],
  
  providers: [
    // Core Services
    ApiGatewayService,
    AuthService,
    RateLimitService,
    CircuitBreakerService,
    LoadBalancerService,
    
    // Service Clients
    PlanningServiceClient,
    AuthServiceClient,
    SmartToolsServiceClient,
    GamificationServiceClient,
    NotificationServiceClient,
    
    // Guards
    JwtAuthGuard,
    RateLimitGuard,
    
    // Interceptors
    LoggingInterceptor,
    TransformInterceptor,
    CacheInterceptor,
    
    // Filters
    HttpExceptionFilter,
    CircuitBreakerFilter,
  ],
  
  exports: [
    ApiGatewayService,
    AuthService,
    RateLimitService,
    CircuitBreakerService,
    LoadBalancerService,
  ],
})
export class ApiGatewayModule {}