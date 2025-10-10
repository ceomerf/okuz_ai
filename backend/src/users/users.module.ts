import { Module } from '@nestjs/common';
import { UsersManagementController } from './users-management.controller';
import { UsersManagementService } from './users-management.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersManagementController],
  providers: [UsersManagementService],
  exports: [UsersManagementService],
})
export class UsersModule {}
