import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { SystemHealthController } from './system-health.controller';
import { SystemHealthService } from './system-health.service';
import { PrismaModule } from '../common/prisma/prisma.module';
// import { CacheModule } from '../common/cache/cache.module';

@Module({
  imports: [PrismaModule, /* CacheModule */],
  controllers: [SystemController, SystemHealthController],
  providers: [SystemService, SystemHealthService],
  exports: [SystemService, SystemHealthService],
})
export class SystemModule {}
