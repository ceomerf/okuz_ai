import { Module } from '@nestjs/common';
import { MachineLearningController } from './machine-learning.controller';
import { MachineLearningService } from './machine-learning.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MachineLearningController],
  providers: [MachineLearningService],
  exports: [MachineLearningService],
})
export class MachineLearningModule {}
