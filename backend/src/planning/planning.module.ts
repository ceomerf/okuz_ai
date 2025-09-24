import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { ReplanService } from './replan.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { GeminiModule } from '../services/gemini.module';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [PrismaModule, GeminiModule, AuthModule, RealtimeModule],
  controllers: [PlanningController],
  providers: [PlanningService, ReplanService],
  exports: [PlanningService, ReplanService],
})
export class PlanningModule {}
