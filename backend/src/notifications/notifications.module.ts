import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../common/prisma/prisma.module';
import { MetricsModule } from '../monitoring/metrics.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { EmailService } from './email.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { BulkNotificationController } from './bulk-notification.controller';
import { BulkNotificationService } from './bulk-notification.service';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    CacheModule.register({ ttl: 300, max: 100 }),
    PrismaModule,
    MetricsModule,
    RealtimeModule,
  ],
  controllers: [NotificationsController, BulkNotificationController],
  providers: [
    NotificationsService,
    PushNotificationService,
    EmailService,
    NotificationPreferenceService,
    BulkNotificationService,
  ],
  exports: [
    NotificationsService,
    PushNotificationService,
    EmailService,
    NotificationPreferenceService,
    BulkNotificationService,
  ],
})
export class NotificationsModule {}