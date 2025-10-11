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
  }): Promise<BackupJob> {
    try {
      return await this.backupRestoreService.createBackup(
        backupData.name,
        backupData.type || 'full'
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
    @Param('backupId') backupId: string
  ): Promise<RestoreJob> {
    try {
      return await this.backupRestoreService.createRestore(backupId);
    } catch (error) {
      throw new HttpException(
        'Failed to restore backup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('jobs')
  async getAllBackups(): Promise<BackupJob[]> {
    try {
      return await this.backupRestoreService.getAllBackups();
    } catch (error) {
      throw new HttpException(
        'Failed to get backup jobs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('jobs/:id')
  async getBackupById(@Param('id') id: string): Promise<BackupJob | null> {
    try {
      return await this.backupRestoreService.getBackupById(id);
    } catch (error) {
      throw new HttpException(
        'Failed to get backup job',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('restores')
  async getAllRestores(): Promise<RestoreJob[]> {
    try {
      return await this.backupRestoreService.getAllRestores();
    } catch (error) {
      throw new HttpException(
        'Failed to get restore jobs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('restores/:id')
  async getRestoreById(@Param('id') id: string): Promise<RestoreJob | null> {
    try {
      return await this.backupRestoreService.getRestoreById(id);
    } catch (error) {
      throw new HttpException(
        'Failed to get restore job',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('schedules')
  async createSchedule(@Body() scheduleData: {
    name: string;
    schedule: string;
    isActive?: boolean;
  }): Promise<BackupSchedule> {
    try {
      return await this.backupRestoreService.createSchedule(scheduleData);
    } catch (error) {
      throw new HttpException(
        'Failed to create backup schedule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('schedules')
  async getAllSchedules(): Promise<BackupSchedule[]> {
    try {
      return await this.backupRestoreService.getAllSchedules();
    } catch (error) {
      throw new HttpException(
        'Failed to get backup schedules',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('schedules/:id')
  async getScheduleById(@Param('id') id: string): Promise<BackupSchedule | null> {
    try {
      return await this.backupRestoreService.getScheduleById(id);
    } catch (error) {
      throw new HttpException(
        'Failed to get backup schedule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('schedules/:id')
  async updateSchedule(
    @Param('id') id: string,
    @Body() scheduleData: {
      name?: string;
      schedule?: string;
      isActive?: boolean;
    }
  ): Promise<BackupSchedule> {
    try {
      return await this.backupRestoreService.updateSchedule(id, scheduleData);
    } catch (error) {
      throw new HttpException(
        'Failed to update backup schedule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('schedules/:id')
  async deleteSchedule(@Param('id') id: string): Promise<void> {
    try {
      await this.backupRestoreService.deleteSchedule(id);
    } catch (error) {
      throw new HttpException(
        'Failed to delete backup schedule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cleanup')
  async cleanupOldBackups(@Body() cleanupData: {
    daysToKeep: number;
  }): Promise<{ deletedCount: number }> {
    try {
      const deletedCount = await this.backupRestoreService.cleanupOldBackups(cleanupData.daysToKeep);
      return { deletedCount };
    } catch (error) {
      throw new HttpException(
        'Failed to cleanup old backups',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}