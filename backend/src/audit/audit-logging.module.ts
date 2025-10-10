import { Module } from '@nestjs/common';
import { AuditLoggingController } from './audit-logging.controller';
import { AuditLoggingService } from './audit-logging.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AuditLoggingController],
  providers: [AuditLoggingService],
  exports: [AuditLoggingService],
})
export class AuditLoggingModule {}
