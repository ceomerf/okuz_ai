import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  createdAt: Date;
}

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  totalLogs: number;
  logsByEntityType: { entityType: string; count: number }[];
  logsByAction: { action: string; count: number }[];
  logsByUser: { userId: string; userName: string; count: number }[];
  hourlyStats: { hour: string; count: number }[];
  dailyStats: { date: string; count: number }[];
}

export interface AuditLogDashboard {
  recentLogs: AuditLog[];
  stats: AuditLogStats;
  criticalEvents: AuditLog[];
  userActivity: {
    userId: string;
    userName: string;
    lastActivity: Date;
    activityCount: number;
  }[];
}

@Injectable()
export class AuditLoggingService {
  private readonly logger = new Logger(AuditLoggingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createAuditLog(data: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    changes?: any;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          changes: data.changes,
          metadata: data.metadata,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        id: auditLog.id,
        userId: auditLog.userId,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        changes: auditLog.changes,
        metadata: auditLog.metadata,
        ipAddress: auditLog.ipAddress,
        userAgent: auditLog.userAgent,
        timestamp: auditLog.timestamp,
        createdAt: auditLog.createdAt,
      };
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      throw error;
    }
  }

  async getAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLog[]> {
    try {
      const where: any = {};

      if (filter.userId) {
        where.userId = filter.userId;
      }

      if (filter.action) {
        where.action = filter.action;
      }

      if (filter.entityType) {
        where.entityType = filter.entityType;
      }

      if (filter.ipAddress) {
        where.ipAddress = filter.ipAddress;
      }

      if (filter.startDate || filter.endDate) {
        where.timestamp = {};
        if (filter.startDate) {
          where.timestamp.gte = new Date(filter.startDate);
        }
        if (filter.endDate) {
          where.timestamp.lte = new Date(filter.endDate);
        }
      }

      const logs = await this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: filter.limit || 100,
        skip: filter.offset || 0,
      });

      return logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        changes: log.changes,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
        createdAt: log.createdAt,
      }));
    } catch (error) {
      this.logger.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  async getAuditLogById(id: string): Promise<AuditLog | null> {
    try {
      const log = await this.prisma.auditLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!log) {
        return null;
      }

      return {
        id: log.id,
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        changes: log.changes,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
        createdAt: log.createdAt,
      };
    } catch (error) {
      this.logger.error('Failed to get audit log by ID:', error);
      throw error;
    }
  }

  async getAuditDashboard(): Promise<AuditLogDashboard> {
    try {
      const [recentLogs, stats, criticalEvents, userActivity] = await Promise.all([
        this.getRecentLogs(),
        this.getAuditStats(),
        this.getCriticalEvents(),
        this.getUserActivity(),
      ]);

      return {
        recentLogs,
        stats,
        criticalEvents,
        userActivity,
      };
    } catch (error) {
      this.logger.error('Failed to get audit dashboard:', error);
      throw error;
    }
  }

  private async getRecentLogs(): Promise<AuditLog[]> {
    try {
      const logs = await this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        changes: log.changes,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
        createdAt: log.createdAt,
      }));
    } catch (error) {
      this.logger.warn('Could not get recent logs:', error);
      return [];
    }
  }

  private async getAuditStats(): Promise<AuditLogStats> {
    try {
      const [
        totalLogs,
        logsByEntityType,
        logsByAction,
        logsByUser,
        hourlyStats,
        dailyStats,
      ] = await Promise.all([
        this.getTotalLogs(),
        this.getLogsByEntityType(),
        this.getLogsByAction(),
        this.getLogsByUser(),
        this.getHourlyStats(),
        this.getDailyStats(),
      ]);

      return {
        totalLogs,
        logsByEntityType,
        logsByAction,
        logsByUser,
        hourlyStats,
        dailyStats,
      };
    } catch (error) {
      this.logger.warn('Could not get audit stats:', error);
      return {
        totalLogs: 0,
        logsByEntityType: [],
        logsByAction: [],
        logsByUser: [],
        hourlyStats: [],
        dailyStats: [],
      };
    }
  }

  private async getTotalLogs(): Promise<number> {
    return this.prisma.auditLog.count();
  }

  private async getLogsByEntityType(): Promise<{ entityType: string; count: number }[]> {
    try {
      const result = await this.prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });

      return result.map((item) => ({
        entityType: item.entityType,
        count: item._count.id,
      }));
    } catch (error) {
      this.logger.warn('Could not get logs by entity type:', error);
      return [];
    }
  }

  private async getLogsByAction(): Promise<{ action: string; count: number }[]> {
    try {
      const result = await this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });

      return result.map((item) => ({
        action: item.action,
        count: item._count.id,
      }));
    } catch (error) {
      this.logger.warn('Could not get logs by action:', error);
      return [];
    }
  }

  private async getLogsByUser(): Promise<{ userId: string; userName: string; count: number }[]> {
    try {
      const result = await this.prisma.auditLog.groupBy({
        by: ['userId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      const userIds = result.map((item) => item.userId);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });

      const userMap = new Map(users.map((user) => [user.id, user.name || 'Unknown']));

      return result.map((item) => ({
        userId: item.userId,
        userName: userMap.get(item.userId) || 'Unknown',
        count: item._count.id,
      }));
    } catch (error) {
      this.logger.warn('Could not get logs by user:', error);
      return [];
    }
  }

  private async getHourlyStats(): Promise<{ hour: string; count: number }[]> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const result = await this.prisma.auditLog.groupBy({
        by: ['timestamp'],
        where: {
          timestamp: {
            gte: startOfDay,
          },
        },
        _count: { id: true },
        orderBy: { timestamp: 'asc' },
      });

      const hourlyMap = new Map<string, number>();
      
      result.forEach((item) => {
        const hour = item.timestamp.getHours().toString().padStart(2, '0');
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + item._count.id);
      });

      return Array.from(hourlyMap.entries()).map(([hour, count]) => ({
        hour,
        count,
      }));
    } catch (error) {
      this.logger.warn('Could not get hourly stats:', error);
      return [];
    }
  }

  private async getDailyStats(): Promise<{ date: string; count: number }[]> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.auditLog.groupBy({
        by: ['timestamp'],
        where: {
          timestamp: {
            gte: thirtyDaysAgo,
          },
        },
        _count: { id: true },
        orderBy: { timestamp: 'asc' },
      });

      const dailyMap = new Map<string, number>();
      
      result.forEach((item) => {
        const date = item.timestamp.toISOString().split('T')[0];
        dailyMap.set(date, (dailyMap.get(date) || 0) + item._count.id);
      });

      return Array.from(dailyMap.entries()).map(([date, count]) => ({
        date,
        count,
      }));
    } catch (error) {
      this.logger.warn('Could not get daily stats:', error);
      return [];
    }
  }

  private async getCriticalEvents(): Promise<AuditLog[]> {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: {
          action: {
            in: ['login_failed', 'unauthorized_access', 'suspicious_activity'],
          },
        },
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        changes: log.changes,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
        createdAt: log.createdAt,
      }));
    } catch (error) {
      this.logger.warn('Could not get critical events:', error);
      return [];
    }
  }

  private async getUserActivity(): Promise<{
    userId: string;
    userName: string;
    lastActivity: Date;
    activityCount: number;
  }[]> {
    try {
      const result = await this.prisma.auditLog.groupBy({
        by: ['userId'],
        _count: { id: true },
        _max: { timestamp: true },
        orderBy: { _max: { timestamp: 'desc' } },
        take: 10,
      });

      const userIds = result.map((item) => item.userId);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });

      const userMap = new Map(users.map((user) => [user.id, user.name || 'Unknown']));

      return result.map((item) => ({
        userId: item.userId,
        userName: userMap.get(item.userId) || 'Unknown',
        lastActivity: item._max.timestamp || new Date(),
        activityCount: item._count.id,
      }));
    } catch (error) {
      this.logger.warn('Could not get user activity:', error);
      return [];
    }
  }

  async deleteOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(`Deleted ${result.count} old audit logs`);
      return result.count;
    } catch (error) {
      this.logger.error('Failed to delete old audit logs:', error);
      throw error;
    }
  }

  async exportAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLog[]> {
    try {
      return this.getAuditLogs({
        ...filter,
        limit: 10000, // Export limit
      });
    } catch (error) {
      this.logger.error('Failed to export audit logs:', error);
      throw error;
    }
  }
}