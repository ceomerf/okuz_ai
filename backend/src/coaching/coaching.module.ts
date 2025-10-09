import { Module } from '@nestjs/common';
import { CoachingController } from './coaching.controller';
import { CoachingService } from './coaching.service';
import { CoachingManagementController } from './coaching-management.controller';
import { CoachingManagementService } from './coaching-management.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CoachingController, CoachingManagementController],
  providers: [CoachingService, CoachingManagementService],
  exports: [CoachingService, CoachingManagementService],
})
export class CoachingModule {}
