import { Module } from '@nestjs/common';
import { SmartToolsController } from './smart-tools.controller';
import { SmartToolsService } from './smart-tools.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { GeminiModule } from '../services/gemini.module';
import { OpenAIService } from '../services/openai.service';

@Module({
  imports: [PrismaModule, GeminiModule],
  controllers: [SmartToolsController],
  providers: [SmartToolsService, OpenAIService],
  exports: [SmartToolsService],
})
export class SmartToolsModule {} 