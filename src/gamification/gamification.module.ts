import { Module } from '@nestjs/common';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GeminiModule } from '../services/gemini.module';

@Module({
  imports: [PrismaModule, GeminiModule],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
