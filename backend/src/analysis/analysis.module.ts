import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { PrismaModule } from '../common/prisma/prisma.module';
// import { GeminiModule } from '../services/gemini.module'; // DEVRE DIŞI - OPENAI KULLANILIYOR

@Module({
  imports: [
    PrismaModule,
    // GeminiModule, // DEVRE DIŞI - OPENAI KULLANILIYOR
    CacheModule.register({ ttl: 120, max: 200 }),
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
