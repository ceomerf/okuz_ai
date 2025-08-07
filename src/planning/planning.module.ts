import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { GeminiModule } from '../services/gemini.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, GeminiModule, AuthModule],
  controllers: [PlanningController],
  providers: [PlanningService],
  exports: [PlanningService],
})
export class PlanningModule {}
