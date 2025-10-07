import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
import { GatewayController } from './controllers/gateway.controller';
import { AuthProxyController } from './controllers/auth-proxy.controller';
import { PlanningProxyController } from './controllers/planning-proxy.controller';
import { AIProxyController } from './controllers/ai-proxy.controller';
import { NotificationProxyController } from './controllers/notification-proxy.controller';
import { HealthController } from './controllers/health.controller';
import { GatewayService } from './services/gateway.service';
import { AuthProxyService } from './services/auth-proxy.service';
import { PlanningProxyService } from './services/planning-proxy.service';
import { AIProxyService } from './services/ai-proxy.service';
import { NotificationProxyService } from './services/notification-proxy.service';
import { RateLimitService } from './services/rate-limit.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { LoadBalancerService } from './services/load-balancer.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { CircuitBreakerGuard } from './guards/circuit-breaker.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: (configService) => ({
        ttl: configService.get<number>('THROTTLE_TTL', 60),
        limit: configService.get<number>('THROTTLE_LIMIT', 100),
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      useFactory: (configService) => ({
        ttl: configService.get<number>('CACHE_TTL', 300),
        max: configService.get<number>('CACHE_MAX', 1000),
      }),
      inject: [ConfigService],
    }),
    HttpModule.registerAsync({
      useFactory: (configService) => ({
        timeout: configService.get<number>('HTTP_TIMEOUT', 5000),
        maxRedirects: configService.get<number>('HTTP_MAX_REDIRECTS', 5),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    GatewayController,
    AuthProxyController,
    PlanningProxyController,
    AIProxyController,
    NotificationProxyController,
    HealthController,
  ],
  providers: [
    GatewayService,
    AuthProxyService,
    PlanningProxyService,
    AIProxyService,
    NotificationProxyService,
    RateLimitService,
    CircuitBreakerService,
    LoadBalancerService,
    JwtAuthGuard,
    RolesGuard,
    RateLimitGuard,
    CircuitBreakerGuard,
  ],
  exports: [
    GatewayService,
    AuthProxyService,
    PlanningProxyService,
    AIProxyService,
    NotificationProxyService,
  ],
})
export class ApiGatewayModule {}
