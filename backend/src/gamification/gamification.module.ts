import { Module } from '@nestjs/common';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { PrismaModule } from '../common/prisma/prisma.module';
// import { GeminiModule } from '../services/gemini.module'; // DEVRE DIŞI - OPENAI KULLANILIYOR
import { OpenAIService } from '../services/openai.service';
import { CacheModule } from '../services/cache.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, CacheModule, MonitoringModule, ConfigModule], // GeminiModule kaldırıldı - OPENAI KULLANILIYOR
  controllers: [GamificationController],
  providers: [GamificationService, OpenAIService],
  exports: [GamificationService],
})
export class GamificationModule {}
