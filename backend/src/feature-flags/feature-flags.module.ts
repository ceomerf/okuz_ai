import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../common/prisma/prisma.module';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsService } from '../common/feature-flags/feature-flags.service';

@Module({
  imports: [ConfigModule, /* CacheModule.register(), */ PrismaModule],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}


