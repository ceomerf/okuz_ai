import { Module } from '@nestjs/common';
import { APIRateLimitingController } from './api-rate-limiting.controller';
import { APIRateLimitingService } from './api-rate-limiting.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [APIRateLimitingController],
  providers: [APIRateLimitingService],
  exports: [APIRateLimitingService],
})
export class APIRateLimitingModule {}
