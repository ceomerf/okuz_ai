import { Module } from '@nestjs/common';
import { AnomalyController } from './anomaly.controller';
import { AnomalyService } from './anomaly.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AnomalyController],
  providers: [AnomalyService],
  exports: [AnomalyService],
})
export class AnomalyModule {}
