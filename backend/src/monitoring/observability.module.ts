import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
@// import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SentryService } from './sentry.service';
import { APIMetricsService } from './api-metrics.service';
import { TracingService } from './tracing.service';
import { MetricsService } from './metrics.service';
import { WebSocketMetricsService } from './websocket-metrics.service';

@Module({
  imports: [
    ConfigModule,
    CacheModule,
    PrismaModule,
  ],
  providers: [
    SentryService,
    APIMetricsService,
    TracingService,
    MetricsService,
    WebSocketMetricsService,
  ],
  exports: [
    SentryService,
    APIMetricsService,
    TracingService,
    MetricsService,
    WebSocketMetricsService,
  ],
})
export class ObservabilityModule {}
