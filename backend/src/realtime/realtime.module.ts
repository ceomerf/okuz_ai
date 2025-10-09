import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
// import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RealtimeGateway } from './realtime.gateway';
import { CoachingUpdatesGateway } from './coaching-updates.gateway';
import { ConnectionManagerService } from './connection-manager.service';
import { EventValidatorService } from './event-validator.service';
import { MetricsModule } from '../monitoring/metrics.module';
import { WebSocketMetricsService } from '../monitoring/websocket-metrics.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule,
    EventEmitterModule,
    // CacheModule,
    PrismaModule,
    MetricsModule,
  ],
  providers: [
    RealtimeGateway,
    CoachingUpdatesGateway,
    ConnectionManagerService,
    EventValidatorService,
    WebSocketMetricsService,
  ],
  exports: [
    RealtimeGateway,
    CoachingUpdatesGateway,
    ConnectionManagerService,
    EventValidatorService,
    WebSocketMetricsService,
  ],
})
export class RealtimeModule {}