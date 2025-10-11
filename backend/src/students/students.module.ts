import { Module } from '@nestjs/common';
import { StudentsManagementController } from './students-management.controller';
import { StudentsManagementService } from './students-management.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudentsManagementController],
  providers: [StudentsManagementService],
  exports: [StudentsManagementService],
})
export class StudentsModule {}
