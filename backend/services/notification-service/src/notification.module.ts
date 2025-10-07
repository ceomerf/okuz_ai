import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../../../shared/common/src/prisma/prisma.module';
import { NotificationController } from './controllers/notification.controller';
import { TemplateController } from './controllers/template.controller';
import { PreferenceController } from './controllers/preference.controller';
import { ChannelController } from './controllers/channel.controller';
import { HealthController } from './controllers/health.controller';
import { NotificationService } from './services/notification.service';
import { TemplateService } from './services/template.service';
import { PreferenceService } from './services/preference.service';
import { PushNotificationService } from './services/push-notification.service';
import { EmailService } from './services/email.service';
import { SMSService } from './services/sms.service';
import { WebSocketService } from './services/websocket.service';
import { QueueService } from './services/queue.service';
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
    NotificationController,
    TemplateController,
    PreferenceController,
    ChannelController,
    HealthController,
  ],
  providers: [
    NotificationService,
    TemplateService,
    PreferenceService,
    PushNotificationService,
    EmailService,
    SMSService,
    WebSocketService,
    QueueService,
    JwtAuthGuard,
    RolesGuard,
    RateLimitGuard,
  ],
  exports: [
    NotificationService,
    TemplateService,
    PreferenceService,
    PushNotificationService,
    EmailService,
    SMSService,
    WebSocketService,
    QueueService,
  ],
})
export class NotificationModule {}
