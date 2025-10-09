import { Module } from '@nestjs/common';
import { NlpController } from './nlp.controller';
import { NlpService } from './nlp.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NlpController],
  providers: [NlpService],
  exports: [NlpService],
})
export class NlpModule {}
