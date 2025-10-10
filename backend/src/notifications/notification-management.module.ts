import { Module } from '@nestjs/common';
import { NotificationManagementController } from './notification-management.controller';
import { NotificationManagementService } from './notification-management.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationManagementController],
  providers: [NotificationManagementService],
  exports: [NotificationManagementService],
})
export class NotificationManagementModule {}
