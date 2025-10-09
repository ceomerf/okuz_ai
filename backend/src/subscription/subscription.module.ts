import { Module } from '@nestjs/common';
import { SubscriptionManagementController } from './subscription-management.controller';
import { SubscriptionManagementService } from './subscription-management.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionManagementController],
  providers: [SubscriptionManagementService],
  exports: [SubscriptionManagementService],
})
export class SubscriptionModule {}