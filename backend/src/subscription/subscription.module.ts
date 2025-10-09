import { Module } from '@nestjs/common';
import { SubscriptionManagementController } from './subscription-management.controller';
import { SubscriptionManagementService } from './subscription-management.service';
import { SubscriptionService } from './subscription.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionManagementController],
  providers: [SubscriptionManagementService, SubscriptionService],
  exports: [SubscriptionManagementService, SubscriptionService],
})
export class SubscriptionModule {}