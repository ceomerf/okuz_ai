import { Controller, Get, Post, Put, Delete, Body, Param, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { BackupRestoreService, BackupDashboard, BackupJob, RestoreJob, BackupSchedule } from './backup-restore.service';

@Controller('backup')
export class BackupRestoreController {
  constructor(private readonly backupRestoreService: BackupRestoreService) {}

  @Get('dashboard')
  async getBackupDashboard(): Promise<BackupDashboard> {
    try {
      return await this.backupRestoreService.getBackupDashboard();
    } catch (error) {
      throw new HttpException(
        'Failed to get backup dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('create')
  async createBackup(@Body() backupData: {
    name: string;
    type?: 'full' | 'incremental' | 'differential';
    metadata?: any;
  }): Promise<BackupJob> {
    try {
      return await this.backupRestoreService.createBackup(
        backupData.name,
        backupData.type || 'full',
        backupData.metadata
      );
    } catch (error) {
      throw new HttpException(
        'Failed to create backup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('restore/:backupId')
  async restoreBackup(
    @Param('backupId') backupId: string,
    @Body() restoreData: { metadata?: any }
  ): Promise<RestoreJob> {
    try {
      return await this.backupRestoreService.restoreBackup(backupId, restoreData.metadata);
    } catch (error) {
      throw new HttpException(
        'Failed to restore backup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('download/:backupId')
  async downloadBackup(
    @Param('backupId') backupId: string,
    @Res() res: Response
  ): Promise<void> {
    try {
      const backup = await this.backupRestoreService.getBackupFile(backupId);
      
      if (!backup) {
        throw new HttpException(
          'Backup file not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const fileName = `backup_${backupId}.sql`;
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', backup.length);
      res.send(backup);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to download backup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('verify/:backupId')
  async verifyBackup(@Param('backupId') backupId: string): Promise<{
    isValid: boolean;
    fileSize: number;
    checksum: string;
    error?: string;
  }> {
    try {
      return await this.backupRestoreService.verifyBackup(backupId);
    } catch (error) {
      throw new HttpException(
        'Failed to verify backup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':backupId')
  async deleteBackup(@Param('backupId') backupId: string): Promise<void> {
    try {
      await this.backupRestoreService.deleteBackup(backupId);
    } catch (error) {
      throw new HttpException(
        'Failed to delete backup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cleanup')
  async cleanupOldBackups(@Body() cleanupData: {
    retentionDays: number;
  }): Promise<{ deletedCount: number }> {
    try {
      const deletedCount = await this.backupRestoreService.cleanupOldBackups(cleanupData.retentionDays);
      return { deletedCount };
    } catch (error) {
      throw new HttpException(
        'Failed to cleanup old backups',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('schedules')
  async createBackupSchedule(@Body() scheduleData: {
    name: string;
    type: 'full' | 'incremental' | 'differential';
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    retentionDays: number;
  }): Promise<BackupSchedule> {
    try {
      return await this.backupRestoreService.createBackupSchedule(scheduleData);
    } catch (error) {
      throw new HttpException(
        'Failed to create backup schedule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('schedules/:scheduleId')
  async updateBackupSchedule(
    @Param('scheduleId') scheduleId: string,
    @Body() scheduleData: Partial<BackupSchedule>
  ): Promise<BackupSchedule> {
    try {
      return await this.backupRestoreService.updateBackupSchedule(scheduleId, scheduleData);
    } catch (error) {
      throw new HttpException(
        'Failed to update backup schedule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('schedules/:scheduleId')
  async deleteBackupSchedule(@Param('scheduleId') scheduleId: string): Promise<void> {
    try {
      await this.backupRestoreService.deleteBackupSchedule(scheduleId);
    } catch (error) {
      throw new HttpException(
        'Failed to delete backup schedule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
