import { Module } from '@nestjs/common';
import { ParentsController } from './parents.controller';
import { ParentsService } from './parents.service';
import { ParentsManagementController } from './parents-management.controller';
import { ParentsManagementService } from './parents-management.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ParentsController, ParentsManagementController],
  providers: [ParentsService, ParentsManagementService],
  exports: [ParentsService, ParentsManagementService],
})
export class ParentsModule {}
