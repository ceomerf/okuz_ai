import { Module } from '@nestjs/common';
import { ParentReportsController } from './parent-reports.controller';
import { ParentReportsService } from './parent-reports.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ParentReportsController],
  providers: [ParentReportsService],
  exports: [ParentReportsService],
})
export class ParentReportsModule {}
