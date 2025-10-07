import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../common/prisma/prisma.module';
import { MetricsModule } from '../monitoring/metrics.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { EmailService } from './email.service';
import { NotificationPreferenceService } from './notification-preference.service';

@Module({
  imports: [
    ConfigModule,
    CacheModule,
    PrismaModule,
    MetricsModule,
    RealtimeModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PushNotificationService,
    EmailService,
    NotificationPreferenceService,
  ],
  exports: [
    NotificationsService,
    PushNotificationService,
    EmailService,
    NotificationPreferenceService,
  ],
})
export class NotificationsModule {}