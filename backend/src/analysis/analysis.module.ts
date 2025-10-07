import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { PrismaModule } from '../common/prisma/prisma.module';
// import { GeminiModule } from '../services/gemini.module'; // DEVRE DIŞI - OPENAI KULLANILIYOR
import { OpenAIService } from '../services/openai.service';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    // GeminiModule, // DEVRE DIŞI - OPENAI KULLANILIYOR
    CacheModule.register({ ttl: 120, max: 200 }),
    MonitoringModule,
    ConfigModule,
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService, OpenAIService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
