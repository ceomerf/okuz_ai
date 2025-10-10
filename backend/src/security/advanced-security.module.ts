import { Module } from '@nestjs/common';
import { AdvancedSecurityController } from './advanced-security.controller';
import { AdvancedSecurityService } from './advanced-security.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdvancedSecurityController],
  providers: [AdvancedSecurityService],
  exports: [AdvancedSecurityService],
})
export class AdvancedSecurityModule {}
