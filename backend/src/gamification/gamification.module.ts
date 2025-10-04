import { Module } from '@nestjs/common';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { PrismaModule } from '../common/prisma/prisma.module';
// import { GeminiModule } from '../services/gemini.module'; // DEVRE DIŞI - OPENAI KULLANILIYOR

@Module({
  imports: [PrismaModule], // GeminiModule kaldırıldı - OPENAI KULLANILIYOR
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
