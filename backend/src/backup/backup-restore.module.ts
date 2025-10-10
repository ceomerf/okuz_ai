import { Module } from '@nestjs/common';
import { BackupRestoreController } from './backup-restore.controller';
import { BackupRestoreService } from './backup-restore.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BackupRestoreController],
  providers: [BackupRestoreService],
  exports: [BackupRestoreService],
})
export class BackupRestoreModule {}
