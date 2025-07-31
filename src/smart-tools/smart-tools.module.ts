import { Module } from '@nestjs/common';
import { SmartToolsController } from './smart-tools.controller';
import { SmartToolsService } from './smart-tools.service';
import { PrismaModule } from "../common/prisma/prisma.module"';
import { GeminiModule } from '../services/gemini.module';

@Module({
  imports: [PrismaModule, GeminiModule],
  controllers: [SmartToolsController],
  providers: [SmartToolsService],
  exports: [SmartToolsService],
})
export class SmartToolsModule {} 