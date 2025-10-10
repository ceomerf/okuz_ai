import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BackupJob {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'running' | 'completed' | 'failed';
  size: number;
  createdAt: string;
  completedAt?: string;
  filePath?: string;
  error?: string;
  metadata?: any;
}

export interface RestoreJob {
  id: string;
  backupId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  error?: string;
  metadata?: any;
}

export interface BackupSchedule {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  isActive: boolean;
  retentionDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface BackupDashboard {
  recentBackups: BackupJob[];
  recentRestores: RestoreJob[];
  schedules: BackupSchedule[];
  stats: {
    totalBackups: number;
    totalSize: number;
    lastBackup: string;
    nextBackup: string;
    successRate: number;
  };
  storageInfo: {
    totalSpace: number;
    usedSpace: number;
    availableSpace: number;
    backupCount: number;
  };
}

@Injectable()
export class BackupRestoreService {
  private readonly logger = new Logger(BackupRestoreService.name);
  private readonly backupDir = path.join(process.cwd(), 'backups');
  private readonly dbConfig = {
    host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]?.split(':')[0] || 'localhost',
    port: process.env.DATABASE_URL?.split(':')[5]?.split('/')[0] || '5432',
    database: process.env.DATABASE_URL?.split('/').pop() || 'okuz_ai',
    username: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'postgres',
    password: process.env.DATABASE_URL?.split(':')[3]?.split('@')[0] || '',
  };

  constructor(private prisma: PrismaService) {
    // Backup dizinini oluştur
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async getBackupDashboard(): Promise<BackupDashboard> {
    try {
      const [recentBackups, recentRestores, schedules, stats, storageInfo] = await Promise.all([
        this.getRecentBackups(),
        this.getRecentRestores(),
        this.getBackupSchedules(),
        this.getBackupStats(),
        this.getStorageInfo(),
      ]);

      return {
        recentBackups,
        recentRestores,
        schedules,
        stats,
        storageInfo,
      };
    } catch (error) {
      this.logger.error('Failed to get backup dashboard:', error);
      throw error;
    }
  }

  private async getRecentBackups(): Promise<BackupJob[]> {
    try {
      const backups = await this.prisma.backupJob.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      return backups.map(backup => ({
        id: backup.id,
        name: backup.name,
        type: backup.type as any,
        status: backup.status as any,
        size: backup.size,
        createdAt: backup.createdAt.toISOString(),
        completedAt: backup.completedAt?.toISOString(),
        filePath: backup.filePath,
        error: backup.error,
        metadata: backup.metadata,
      }));
    } catch (error) {
      this.logger.warn('Could not get recent backups:', error);
      return [];
    }
  }

  private async getRecentRestores(): Promise<RestoreJob[]> {
    try {
      const restores = await this.prisma.restoreJob.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      return restores.map(restore => ({
        id: restore.id,
        backupId: restore.backupId,
        status: restore.status as any,
        createdAt: restore.createdAt.toISOString(),
        completedAt: restore.completedAt?.toISOString(),
        error: restore.error,
        metadata: restore.metadata,
      }));
    } catch (error) {
      this.logger.warn('Could not get recent restores:', error);
      return [];
    }
  }

  private async getBackupSchedules(): Promise<BackupSchedule[]> {
    try {
      const schedules = await this.prisma.backupSchedule.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      return schedules.map(schedule => ({
        id: schedule.id,
        name: schedule.name,
        type: schedule.type as any,
        frequency: schedule.frequency as any,
        time: schedule.time,
        dayOfWeek: schedule.dayOfWeek,
        dayOfMonth: schedule.dayOfMonth,
        isActive: schedule.isActive,
        retentionDays: schedule.retentionDays,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString(),
      }));
    } catch (error) {
      this.logger.warn('Could not get backup schedules:', error);
      return [];
    }
  }

  private async getBackupStats() {
    try {
      const [totalBackups, completedBackups, totalSize, lastBackup, nextBackup] = await Promise.all([
        this.prisma.backupJob.count(),
        this.prisma.backupJob.count({ where: { status: 'completed' } }),
        this.prisma.backupJob.aggregate({
          _sum: { size: true },
          where: { status: 'completed' },
        }),
        this.getLastBackup(),
        this.getNextBackup(),
      ]);

      const successRate = totalBackups > 0 ? (completedBackups / totalBackups) * 100 : 0;

      return {
        totalBackups,
        totalSize: totalSize._sum.size || 0,
        lastBackup: lastBackup || '',
        nextBackup: nextBackup || '',
        successRate,
      };
    } catch (error) {
      this.logger.warn('Could not get backup stats:', error);
      return {
        totalBackups: 0,
        totalSize: 0,
        lastBackup: '',
        nextBackup: '',
        successRate: 0,
      };
    }
  }

  private async getLastBackup(): Promise<string | null> {
    try {
      const lastBackup = await this.prisma.backupJob.findFirst({
        where: { status: 'completed' },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      });

      return lastBackup?.completedAt?.toISOString() || null;
    } catch (error) {
      this.logger.warn('Could not get last backup:', error);
      return null;
    }
  }

  private async getNextBackup(): Promise<string | null> {
    try {
      // Bu değer schedule'lara göre hesaplanabilir
      return null;
    } catch (error) {
      this.logger.warn('Could not get next backup:', error);
      return null;
    }
  }

  private async getStorageInfo() {
    try {
      const stats = fs.statSync(this.backupDir);
      const totalSpace = 100 * 1024 * 1024 * 1024; // 100GB placeholder
      const usedSpace = this.getDirectorySize(this.backupDir);
      const availableSpace = totalSpace - usedSpace;
      const backupCount = await this.prisma.backupJob.count({ where: { status: 'completed' } });

      return {
        totalSpace,
        usedSpace,
        availableSpace,
        backupCount,
      };
    } catch (error) {
      this.logger.warn('Could not get storage info:', error);
      return {
        totalSpace: 0,
        usedSpace: 0,
        availableSpace: 0,
        backupCount: 0,
      };
    }
  }

  private getDirectorySize(dirPath: string): number {
    let totalSize = 0;
    
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          totalSize += this.getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      this.logger.warn('Could not calculate directory size:', error);
    }
    
    return totalSize;
  }

  async createBackup(
    name: string,
    type: 'full' | 'incremental' | 'differential' = 'full',
    metadata?: any
  ): Promise<BackupJob> {
    try {
      const backup = await this.prisma.backupJob.create({
        data: {
          name,
          type,
          status: 'pending',
          size: 0,
          createdAt: new Date(),
          metadata: metadata || {},
        },
      });

      // Arka planda backup'ı başlat
      this.startBackup(backup.id, type);

      return {
        id: backup.id,
        name: backup.name,
        type: backup.type as any,
        status: backup.status as any,
        size: backup.size,
        createdAt: backup.createdAt.toISOString(),
        completedAt: backup.completedAt?.toISOString(),
        filePath: backup.filePath,
        error: backup.error,
        metadata: backup.metadata,
      };
    } catch (error) {
      this.logger.error('Failed to create backup:', error);
      throw error;
    }
  }

  private async startBackup(backupId: string, type: string): Promise<void> {
    try {
      // Backup'ı running olarak işaretle
      await this.prisma.backupJob.update({
        where: { id: backupId },
        data: { status: 'running' },
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backup_${type}_${timestamp}.sql`;
      const filePath = path.join(this.backupDir, fileName);

      // PostgreSQL backup komutu
      const pgDumpCommand = `pg_dump -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.username} -d ${this.dbConfig.database} -f ${filePath}`;
      
      // Environment variable ile password'ü set et
      const env = { ...process.env, PGPASSWORD: this.dbConfig.password };

      await execAsync(pgDumpCommand, { env });

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      // Backup'ı tamamla
      await this.prisma.backupJob.update({
        where: { id: backupId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          filePath,
          size: fileSize,
        },
      });

      this.logger.log(`Backup ${backupId} completed successfully`);
    } catch (error) {
      this.logger.error(`Backup ${backupId} failed:`, error);
      
      await this.prisma.backupJob.update({
        where: { id: backupId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: error.message,
        },
      });
    }
  }

  async restoreBackup(backupId: string, metadata?: any): Promise<RestoreJob> {
    try {
      const restore = await this.prisma.restoreJob.create({
        data: {
          backupId,
          status: 'pending',
          createdAt: new Date(),
          metadata: metadata || {},
        },
      });

      // Arka planda restore'u başlat
      this.startRestore(restore.id, backupId);

      return {
        id: restore.id,
        backupId: restore.backupId,
        status: restore.status as any,
        createdAt: restore.createdAt.toISOString(),
        completedAt: restore.completedAt?.toISOString(),
        error: restore.error,
        metadata: restore.metadata,
      };
    } catch (error) {
      this.logger.error('Failed to create restore job:', error);
      throw error;
    }
  }

  private async startRestore(restoreId: string, backupId: string): Promise<void> {
    try {
      // Restore'u running olarak işaretle
      await this.prisma.restoreJob.update({
        where: { id: restoreId },
        data: { status: 'running' },
      });

      // Backup dosyasını bul
      const backup = await this.prisma.backupJob.findUnique({
        where: { id: backupId },
      });

      if (!backup || !backup.filePath || !fs.existsSync(backup.filePath)) {
        throw new Error('Backup file not found');
      }

      // PostgreSQL restore komutu
      const psqlCommand = `psql -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.username} -d ${this.dbConfig.database} -f ${backup.filePath}`;
      
      // Environment variable ile password'ü set et
      const env = { ...process.env, PGPASSWORD: this.dbConfig.password };

      await execAsync(psqlCommand, { env });

      // Restore'u tamamla
      await this.prisma.restoreJob.update({
        where: { id: restoreId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      this.logger.log(`Restore ${restoreId} completed successfully`);
    } catch (error) {
      this.logger.error(`Restore ${restoreId} failed:`, error);
      
      await this.prisma.restoreJob.update({
        where: { id: restoreId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: error.message,
        },
      });
    }
  }

  async createBackupSchedule(scheduleData: {
    name: string;
    type: 'full' | 'incremental' | 'differential';
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    retentionDays: number;
  }): Promise<BackupSchedule> {
    try {
      const schedule = await this.prisma.backupSchedule.create({
        data: {
          name: scheduleData.name,
          type: scheduleData.type,
          frequency: scheduleData.frequency,
          time: scheduleData.time,
          dayOfWeek: scheduleData.dayOfWeek,
          dayOfMonth: scheduleData.dayOfMonth,
          isActive: true,
          retentionDays: scheduleData.retentionDays,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return {
        id: schedule.id,
        name: schedule.name,
        type: schedule.type as any,
        frequency: schedule.frequency as any,
        time: schedule.time,
        dayOfWeek: schedule.dayOfWeek,
        dayOfMonth: schedule.dayOfMonth,
        isActive: schedule.isActive,
        retentionDays: schedule.retentionDays,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to create backup schedule:', error);
      throw error;
    }
  }

  async updateBackupSchedule(
    scheduleId: string,
    scheduleData: Partial<BackupSchedule>
  ): Promise<BackupSchedule> {
    try {
      const schedule = await this.prisma.backupSchedule.update({
        where: { id: scheduleId },
        data: {
          name: scheduleData.name,
          type: scheduleData.type,
          frequency: scheduleData.frequency,
          time: scheduleData.time,
          dayOfWeek: scheduleData.dayOfWeek,
          dayOfMonth: scheduleData.dayOfMonth,
          isActive: scheduleData.isActive,
          retentionDays: scheduleData.retentionDays,
          updatedAt: new Date(),
        },
      });

      return {
        id: schedule.id,
        name: schedule.name,
        type: schedule.type as any,
        frequency: schedule.frequency as any,
        time: schedule.time,
        dayOfWeek: schedule.dayOfWeek,
        dayOfMonth: schedule.dayOfMonth,
        isActive: schedule.isActive,
        retentionDays: schedule.retentionDays,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to update backup schedule:', error);
      throw error;
    }
  }

  async deleteBackupSchedule(scheduleId: string): Promise<void> {
    try {
      await this.prisma.backupSchedule.delete({
        where: { id: scheduleId },
      });
    } catch (error) {
      this.logger.error('Failed to delete backup schedule:', error);
      throw error;
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    try {
      const backup = await this.prisma.backupJob.findUnique({
        where: { id: backupId },
      });

      if (backup?.filePath && fs.existsSync(backup.filePath)) {
        fs.unlinkSync(backup.filePath);
      }

      await this.prisma.backupJob.delete({
        where: { id: backupId },
      });
    } catch (error) {
      this.logger.error('Failed to delete backup:', error);
      throw error;
    }
  }

  async getBackupFile(backupId: string): Promise<Buffer | null> {
    try {
      const backup = await this.prisma.backupJob.findUnique({
        where: { id: backupId },
      });

      if (!backup || !backup.filePath || !fs.existsSync(backup.filePath)) {
        return null;
      }

      return fs.readFileSync(backup.filePath);
    } catch (error) {
      this.logger.error('Failed to get backup file:', error);
      return null;
    }
  }

  async cleanupOldBackups(retentionDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const oldBackups = await this.prisma.backupJob.findMany({
        where: {
          createdAt: { lt: cutoffDate },
          status: 'completed',
        },
      });

      let deletedCount = 0;

      for (const backup of oldBackups) {
        if (backup.filePath && fs.existsSync(backup.filePath)) {
          fs.unlinkSync(backup.filePath);
        }

        await this.prisma.backupJob.delete({
          where: { id: backup.id },
        });

        deletedCount++;
      }

      this.logger.log(`Cleaned up ${deletedCount} old backups`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup old backups:', error);
      throw error;
    }
  }

  async verifyBackup(backupId: string): Promise<{
    isValid: boolean;
    fileSize: number;
    checksum: string;
    error?: string;
  }> {
    try {
      const backup = await this.prisma.backupJob.findUnique({
        where: { id: backupId },
      });

      if (!backup || !backup.filePath || !fs.existsSync(backup.filePath)) {
        return {
          isValid: false,
          fileSize: 0,
          checksum: '',
          error: 'Backup file not found',
        };
      }

      const stats = fs.statSync(backup.filePath);
      const fileSize = stats.size;
      const fileBuffer = fs.readFileSync(backup.filePath);
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      return {
        isValid: true,
        fileSize,
        checksum,
      };
    } catch (error) {
      this.logger.error('Failed to verify backup:', error);
      return {
        isValid: false,
        fileSize: 0,
        checksum: '',
        error: error.message,
      };
    }
  }
}
