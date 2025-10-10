import { Module } from '@nestjs/common';
import { AdvancedReportingController } from './advanced-reporting.controller';
import { AdvancedReportingService } from './advanced-reporting.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdvancedReportingController],
  providers: [AdvancedReportingService],
  exports: [AdvancedReportingService],
})
export class AdvancedReportingModule {}
