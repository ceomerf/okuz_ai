import { Module } from '@nestjs/common';
import { RealtimeNotificationsController } from './realtime-notifications.controller';
import { RealtimeNotificationsService } from './realtime-notifications.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RealtimeNotificationsController],
  providers: [RealtimeNotificationsService],
  exports: [RealtimeNotificationsService],
})
export class RealtimeNotificationsModule {}
