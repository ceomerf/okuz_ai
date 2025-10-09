import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { StudentsManagementController } from './students-management.controller';
import { StudentsManagementService } from './students-management.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudentsController, StudentsManagementController],
  providers: [StudentsService, StudentsManagementService],
  exports: [StudentsService, StudentsManagementService],
})
export class StudentsModule {}
