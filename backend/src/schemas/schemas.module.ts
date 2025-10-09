import { Module } from '@nestjs/common';
import { SchemasController } from './schemas.controller';
import { SchemasService } from './schemas.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SchemasController],
  providers: [SchemasService],
  exports: [SchemasService],
})
export class SchemasModule {}
