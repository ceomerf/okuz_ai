import { Module } from '@nestjs/common';
import { CrudController } from './crud.controller';
import { CrudService } from './crud.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SchemasModule } from '../schemas/schemas.module';

@Module({
  imports: [PrismaModule, SchemasModule],
  controllers: [CrudController],
  providers: [CrudService],
  exports: [CrudService],
})
export class CrudModule {}
