import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersManagementController } from './users-management.controller';
import { UsersManagementService } from './users-management.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PlanningModule } from '../planning/planning.module';
@// import { CacheModule } from '../common/cache/cache.module';

@Module({
  @// imports: [PrismaModule, PlanningModule, CacheModule],
  controllers: [UsersController, UsersManagementController],
  providers: [UsersService, UsersManagementService],
  exports: [UsersService, UsersManagementService],
})
export class UsersModule {}
