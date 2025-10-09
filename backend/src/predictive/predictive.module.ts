import { Module } from '@nestjs/common';
import { PredictiveController } from './predictive.controller';
import { PredictiveService } from './predictive.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PredictiveController],
  providers: [PredictiveService],
  exports: [PredictiveService],
})
export class PredictiveModule {}
