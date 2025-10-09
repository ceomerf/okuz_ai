import { Module } from '@nestjs/common';
import { CurriculumManagementController } from './curriculum-management.controller';
import { CurriculumManagementService } from './curriculum-management.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CurriculumManagementController],
  providers: [CurriculumManagementService],
  exports: [CurriculumManagementService],
})
export class CurriculumModule {}
