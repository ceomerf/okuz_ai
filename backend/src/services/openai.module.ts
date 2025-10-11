import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIService } from './openai.service';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { PrismaModule } from '../common/prisma/prisma.module';
// import { CacheModule } from './cache.module';

@Module({
  imports: [ConfigModule, MonitoringModule, PrismaModule, /* CacheModule */],
  providers: [OpenAIService],
  exports: [OpenAIService],
})
export class OpenAIModule {}

