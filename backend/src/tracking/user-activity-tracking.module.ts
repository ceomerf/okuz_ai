import { Module } from '@nestjs/common';
import { UserActivityTrackingController } from './user-activity-tracking.controller';
import { UserActivityTrackingService } from './user-activity-tracking.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserActivityTrackingController],
  providers: [UserActivityTrackingService],
  exports: [UserActivityTrackingService],
})
export class UserActivityTrackingModule {}
