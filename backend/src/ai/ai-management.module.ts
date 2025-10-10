import { Module } from '@nestjs/common';
import { AIManagementController } from './ai-management.controller';
import { AIManagementService } from './ai-management.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AIManagementController],
  providers: [AIManagementService],
  exports: [AIManagementService],
})
export class AIManagementModule {}
