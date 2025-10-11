import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BackupJob {
  id: string;
  status: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RestoreJob {
  id: string;
  status: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackupSchedule {
  id: string;
  name: string;
  schedule: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackupDashboard {
  recentBackups: BackupJob[];
  recentRestores: RestoreJob[];
  schedules: BackupSchedule[];
  stats: {
    totalBackups: number;
    totalRestores: number;
    successRate: number;
    totalSize: number;
    lastBackup?: Date;
    nextScheduled?: Date;
  };
}

@Injectable()
export class BackupRestoreService {
  private readonly logger = new Logger(BackupRestoreService.name);
  private readonly backupDir = process.env.BACKUP_DIR || './backups';

  constructor(private readonly prisma: PrismaService) {
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(name: string, type: 'full' | 'incremental' | 'differential' = 'full'): Promise<BackupJob> {
    try {
      const backupJob = await this.prisma.backupJob.create({
        data: {
          status: 'pending',
          progress: 0,
        },
      });

      // Start backup process asynchronously
      this.performBackup(backupJob.id, name, type);

      return {
        id: backupJob.id,
        status: backupJob.status,
        progress: backupJob.progress,
        createdAt: backupJob.createdAt,
        updatedAt: backupJob.updatedAt,
      };
    } catch (error) {
      this.logger.error('Failed to create backup:', error);
      throw error;
    }
  }

  private async performBackup(jobId: string, name: string, type: string): Promise<void> {
    try {
      await this.prisma.backupJob.update({
        where: { id: jobId },
        data: { status: 'running' },
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${name}_${type}_${timestamp}.sql`;
      const filePath = path.join(this.backupDir, fileName);

      // Update progress
      await this.prisma.backupJob.update({
        where: { id: jobId },
        data: { progress: 25 },
      });

      // Perform database backup (this is a simplified example)
      // In a real implementation, you would use pg_dump for PostgreSQL
      const backupCommand = `pg_dump ${process.env.DATABASE_URL} > ${filePath}`;
      
      await execAsync(backupCommand);

      // Update progress
      await this.prisma.backupJob.update({
        where: { id: jobId },
        data: { progress: 75 },
      });

      // Get file size
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      // Complete backup
      await this.prisma.backupJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          progress: 100,
        },
      });

      this.logger.log(`Backup completed: ${fileName} (${fileSize} bytes)`);
    } catch (error) {
      this.logger.error('Backup failed:', error);
      
      await this.prisma.backupJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
        },
      });
    }
  }

  async getBackupById(id: string): Promise<BackupJob | null> {
    try {
      const backup = await this.prisma.backupJob.findUnique({
        where: { id },
      });

      if (!backup) {
        return null;
      }

      return {
        id: backup.id,
        status: backup.status,
        progress: backup.progress,
        createdAt: backup.createdAt,
        updatedAt: backup.updatedAt,
      };
    } catch (error) {
      this.logger.error('Failed to get backup by ID:', error);
      throw error;
    }
  }

  async getAllBackups(): Promise<BackupJob[]> {
    try {
      const backups = await this.prisma.backupJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return backups.map(backup => ({
        id: backup.id,
        status: backup.status,
        progress: backup.progress,
        createdAt: backup.createdAt,
        updatedAt: backup.updatedAt,
      }));
    } catch (error) {
      this.logger.error('Failed to get all backups:', error);
      throw error;
    }
  }

  async createRestore(backupId: string): Promise<RestoreJob> {
    try {
      const restoreJob = await this.prisma.restoreJob.create({
        data: {
          status: 'pending',
          progress: 0,
        },
      });

      // Start restore process asynchronously
      this.performRestore(restoreJob.id, backupId);

      return {
        id: restoreJob.id,
        status: restoreJob.status,
        progress: restoreJob.progress,
        createdAt: restoreJob.createdAt,
        updatedAt: restoreJob.updatedAt,
      };
    } catch (error) {
      this.logger.error('Failed to create restore:', error);
      throw error;
    }
  }

  private async performRestore(jobId: string, backupId: string): Promise<void> {
    try {
      await this.prisma.restoreJob.update({
        where: { id: jobId },
        data: { status: 'running' },
      });

      // Update progress
      await this.prisma.restoreJob.update({
        where: { id: jobId },
        data: { progress: 25 },
      });

      // Find backup file (simplified - in real implementation, you'd store file paths)
      const backupFiles = fs.readdirSync(this.backupDir);
      const backupFile = backupFiles.find(file => file.includes(backupId));
      
      if (!backupFile) {
        throw new Error('Backup file not found');
      }

      const filePath = path.join(this.backupDir, backupFile);

      // Update progress
      await this.prisma.restoreJob.update({
        where: { id: jobId },
        data: { progress: 50 },
      });

      // Perform database restore (this is a simplified example)
      const restoreCommand = `psql ${process.env.DATABASE_URL} < ${filePath}`;
      
      await execAsync(restoreCommand);

      // Update progress
      await this.prisma.restoreJob.update({
        where: { id: jobId },
        data: { progress: 75 },
      });

      // Complete restore
      await this.prisma.restoreJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          progress: 100,
        },
      });

      this.logger.log(`Restore completed for backup: ${backupId}`);
    } catch (error) {
      this.logger.error('Restore failed:', error);
      
      await this.prisma.restoreJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
        },
      });
    }
  }

  async getRestoreById(id: string): Promise<RestoreJob | null> {
    try {
      const restore = await this.prisma.restoreJob.findUnique({
        where: { id },
      });

      if (!restore) {
        return null;
      }

      return {
        id: restore.id,
        status: restore.status,
        progress: restore.progress,
        createdAt: restore.createdAt,
        updatedAt: restore.updatedAt,
      };
    } catch (error) {
      this.logger.error('Failed to get restore by ID:', error);
      throw error;
    }
  }

  async getAllRestores(): Promise<RestoreJob[]> {
    try {
      const restores = await this.prisma.restoreJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return restores.map(restore => ({
        id: restore.id,
        status: restore.status,
        progress: restore.progress,
        createdAt: restore.createdAt,
        updatedAt: restore.updatedAt,
      }));
    } catch (error) {
      this.logger.error('Failed to get all restores:', error);
      throw error;
    }
  }

  async createSchedule(data: {
    name: string;
    schedule: string;
    isActive?: boolean;
  }): Promise<BackupSchedule> {
    try {
      const schedule = await this.prisma.backupSchedule.create({
        data: {
          name: data.name,
          schedule: data.schedule,
          isActive: data.isActive ?? true,
        },
      });

      return {
        id: schedule.id,
        name: schedule.name,
        schedule: schedule.schedule,
        isActive: schedule.isActive,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      };
    } catch (error) {
      this.logger.error('Failed to create schedule:', error);
      throw error;
    }
  }

  async getScheduleById(id: string): Promise<BackupSchedule | null> {
    try {
      const schedule = await this.prisma.backupSchedule.findUnique({
        where: { id },
      });

      if (!schedule) {
        return null;
      }

      return {
        id: schedule.id,
        name: schedule.name,
        schedule: schedule.schedule,
        isActive: schedule.isActive,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      };
    } catch (error) {
      this.logger.error('Failed to get schedule by ID:', error);
      throw error;
    }
  }

  async getAllSchedules(): Promise<BackupSchedule[]> {
    try {
      const schedules = await this.prisma.backupSchedule.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return schedules.map(schedule => ({
        id: schedule.id,
        name: schedule.name,
        schedule: schedule.schedule,
        isActive: schedule.isActive,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      }));
    } catch (error) {
      this.logger.error('Failed to get all schedules:', error);
      throw error;
    }
  }

  async updateSchedule(id: string, data: {
    name?: string;
    schedule?: string;
    isActive?: boolean;
  }): Promise<BackupSchedule> {
    try {
      const schedule = await this.prisma.backupSchedule.update({
        where: { id },
        data,
      });

      return {
        id: schedule.id,
        name: schedule.name,
        schedule: schedule.schedule,
        isActive: schedule.isActive,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      };
    } catch (error) {
      this.logger.error('Failed to update schedule:', error);
      throw error;
    }
  }

  async deleteSchedule(id: string): Promise<void> {
    try {
      await this.prisma.backupSchedule.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error('Failed to delete schedule:', error);
      throw error;
    }
  }

  async getBackupDashboard(): Promise<BackupDashboard> {
    try {
      const [recentBackups, recentRestores, schedules, stats] = await Promise.all([
        this.getRecentBackups(),
        this.getRecentRestores(),
        this.getAllSchedules(),
        this.getBackupStats(),
      ]);

      return {
        recentBackups,
        recentRestores,
        schedules,
        stats,
      };
    } catch (error) {
      this.logger.error('Failed to get backup dashboard:', error);
      throw error;
    }
  }

  private async getRecentBackups(): Promise<BackupJob[]> {
    try {
      const backups = await this.prisma.backupJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return backups.map(backup => ({
        id: backup.id,
        status: backup.status,
        progress: backup.progress,
        createdAt: backup.createdAt,
        updatedAt: backup.updatedAt,
      }));
    } catch (error) {
      this.logger.warn('Could not get recent backups:', error);
      return [];
    }
  }

  private async getRecentRestores(): Promise<RestoreJob[]> {
    try {
      const restores = await this.prisma.restoreJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return restores.map(restore => ({
        id: restore.id,
        status: restore.status,
        progress: restore.progress,
        createdAt: restore.createdAt,
        updatedAt: restore.updatedAt,
      }));
    } catch (error) {
      this.logger.warn('Could not get recent restores:', error);
      return [];
    }
  }

  private async getBackupStats(): Promise<{
    totalBackups: number;
    totalRestores: number;
    successRate: number;
    totalSize: number;
    lastBackup?: Date;
    nextScheduled?: Date;
  }> {
    try {
      const [totalBackups, totalRestores, completedBackups, failedBackups] = await Promise.all([
        this.prisma.backupJob.count(),
        this.prisma.restoreJob.count(),
        this.prisma.backupJob.count({ where: { status: 'completed' } }),
        this.prisma.backupJob.count({ where: { status: 'failed' } }),
      ]);

      const successRate = totalBackups > 0 ? (completedBackups / totalBackups) * 100 : 0;

      // Get last backup
      const lastBackup = await this.prisma.backupJob.findFirst({
        where: { status: 'completed' },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate total size (simplified - in real implementation, you'd store file sizes)
      const backupFiles = fs.readdirSync(this.backupDir);
      let totalSize = 0;
      
      for (const file of backupFiles) {
        try {
          const stats = fs.statSync(path.join(this.backupDir, file));
          totalSize += stats.size;
        } catch (error) {
          // Ignore files that can't be read
        }
      }

      return {
        totalBackups,
        totalRestores,
        successRate,
        totalSize,
        lastBackup: lastBackup?.createdAt,
        nextScheduled: undefined, // Would need to implement scheduling logic
      };
    } catch (error) {
      this.logger.warn('Could not get backup stats:', error);
      return {
        totalBackups: 0,
        totalRestores: 0,
        successRate: 0,
        totalSize: 0,
      };
    }
  }

  async cleanupOldBackups(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Delete old backup jobs
      const result = await this.prisma.backupJob.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      // Delete old restore jobs
      await this.prisma.restoreJob.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      // Delete old backup files
      const backupFiles = fs.readdirSync(this.backupDir);
      let deletedFiles = 0;

      for (const file of backupFiles) {
        try {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            deletedFiles++;
          }
        } catch (error) {
          // Ignore files that can't be deleted
        }
      }

      this.logger.log(`Cleaned up ${result.count} old backup jobs and ${deletedFiles} files`);
      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup old backups:', error);
      throw error;
    }
  }
}