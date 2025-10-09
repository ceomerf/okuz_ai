import { Module } from '@nestjs/common';
import { SmartToolsController } from './smart-tools.controller';
import { SmartToolsService } from './smart-tools.service';
import { QuestionSolverService } from './question-solver.service';
import { ContentGeneratorService } from './content-generator.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { OpenAIService } from '../services/openai.service';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [PrismaModule, MonitoringModule],
  controllers: [SmartToolsController],
  providers: [
    SmartToolsService,
    QuestionSolverService,
    ContentGeneratorService,
    OpenAIService,
  ],
  exports: [SmartToolsService],
})
export class SmartToolsModule {} 