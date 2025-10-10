import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system' | 'security';
  metadata?: any;
}

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  resource?: string;
  category?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  totalLogs: number;
  logsByCategory: { category: string; count: number }[];
  logsBySeverity: { severity: string; count: number }[];
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
    lastActivity: string;
    activityCount: number;
    riskScore: number;
  }[];
  systemHealth: {
    totalEvents: number;
    criticalEvents: number;
    securityEvents: number;
    dataEvents: number;
  };
}

@Injectable()
export class AuditLoggingService {
  private readonly logger = new Logger(AuditLoggingService.name);

  constructor(private prisma: PrismaService) {}

  async getAuditDashboard(): Promise<AuditLogDashboard> {
    try {
      const [recentLogs, stats, criticalEvents, userActivity, systemHealth] = await Promise.all([
        this.getRecentLogs(),
        this.getAuditStats(),
        this.getCriticalEvents(),
        this.getUserActivity(),
        this.getSystemHealth(),
      ]);

      return {
        recentLogs,
        stats,
        criticalEvents,
        userActivity,
        systemHealth,
      };
    } catch (error) {
      this.logger.error('Failed to get audit dashboard:', error);
      throw error;
    }
  }

  private async getRecentLogs(): Promise<AuditLog[]> {
    try {
      const logs = await this.prisma.auditLog.findMany({
        take: 20,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      });

      return logs.map(log => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        sessionId: log.sessionId,
        timestamp: log.timestamp.toISOString(),
        severity: log.severity as any,
        category: log.category as any,
        metadata: log.metadata,
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
        logsByCategory,
        logsBySeverity,
        logsByAction,
        logsByUser,
        hourlyStats,
        dailyStats,
      ] = await Promise.all([
        this.getTotalLogs(),
        this.getLogsByCategory(),
        this.getLogsBySeverity(),
        this.getLogsByAction(),
        this.getLogsByUser(),
        this.getHourlyStats(),
        this.getDailyStats(),
      ]);

      return {
        totalLogs,
        logsByCategory,
        logsBySeverity,
        logsByAction,
        logsByUser,
        hourlyStats,
        dailyStats,
      };
    } catch (error) {
      this.logger.warn('Could not get audit stats:', error);
      return {
        totalLogs: 0,
        logsByCategory: [],
        logsBySeverity: [],
        logsByAction: [],
        logsByUser: [],
        hourlyStats: [],
        dailyStats: [],
      };
    }
  }

  private async getTotalLogs(): Promise<number> {
    try {
      return await this.prisma.auditLog.count();
    } catch (error) {
      this.logger.warn('Could not get total logs:', error);
      return 0;
    }
  }

  private async getLogsByCategory() {
    try {
      const result = await this.prisma.auditLog.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });

      return result.map(item => ({
        category: item.category,
        count: item._count.id,
      }));
    } catch (error) {
      this.logger.warn('Could not get logs by category:', error);
      return [];
    }
  }

  private async getLogsBySeverity() {
    try {
      const result = await this.prisma.auditLog.groupBy({
        by: ['severity'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });

      return result.map(item => ({
        severity: item.severity,
        count: item._count.id,
      }));
    } catch (error) {
      this.logger.warn('Could not get logs by severity:', error);
      return [];
    }
  }

  private async getLogsByAction() {
    try {
      const result = await this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      return result.map(item => ({
        action: item.action,
        count: item._count.id,
      }));
    } catch (error) {
      this.logger.warn('Could not get logs by action:', error);
      return [];
    }
  }

  private async getLogsByUser() {
    try {
      const result = await this.prisma.auditLog.groupBy({
        by: ['userId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      const users = await this.prisma.user.findMany({
        where: {
          id: { in: result.map(r => r.userId) },
        },
        select: { id: true, name: true },
      });

      return result.map(item => {
        const user = users.find(u => u.id === item.userId);
        return {
          userId: item.userId,
          userName: user?.name || 'Unknown',
          count: item._count.id,
        };
      });
    } catch (error) {
      this.logger.warn('Could not get logs by user:', error);
      return [];
    }
  }

  private async getHourlyStats() {
    try {
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const logs = await this.prisma.auditLog.findMany({
        where: {
          timestamp: { gte: last24Hours },
        },
        select: { timestamp: true },
      });

      const hourlyData = new Map<string, number>();
      
      logs.forEach(log => {
        const hour = log.timestamp.toISOString().substring(0, 13) + ':00:00.000Z';
        hourlyData.set(hour, (hourlyData.get(hour) || 0) + 1);
      });

      return Array.from(hourlyData.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour.localeCompare(b.hour));
    } catch (error) {
      this.logger.warn('Could not get hourly stats:', error);
      return [];
    }
  }

  private async getDailyStats() {
    try {
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const logs = await this.prisma.auditLog.findMany({
        where: {
          timestamp: { gte: last30Days },
        },
        select: { timestamp: true },
      });

      const dailyData = new Map<string, number>();
      
      logs.forEach(log => {
        const date = log.timestamp.toISOString().split('T')[0];
        dailyData.set(date, (dailyData.get(date) || 0) + 1);
      });

      return Array.from(dailyData.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      this.logger.warn('Could not get daily stats:', error);
      return [];
    }
  }

  private async getCriticalEvents(): Promise<AuditLog[]> {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: {
          severity: { in: ['high', 'critical'] },
        },
        take: 10,
        orderBy: { timestamp: 'desc' },
      });

      return logs.map(log => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        sessionId: log.sessionId,
        timestamp: log.timestamp.toISOString(),
        severity: log.severity as any,
        category: log.category as any,
        metadata: log.metadata,
      }));
    } catch (error) {
      this.logger.warn('Could not get critical events:', error);
      return [];
    }
  }

  private async getUserActivity() {
    try {
      const users = await this.prisma.user.findMany({
        take: 10,
        orderBy: { lastLoginAt: 'desc' },
        select: {
          id: true,
          name: true,
          lastLoginAt: true,
        },
      });

      return users.map(user => ({
        userId: user.id,
        userName: user.name,
        lastActivity: user.lastLoginAt?.toISOString() || '',
        activityCount: 0, // Bu değer hesaplanabilir
        riskScore: 0, // Bu değer hesaplanabilir
      }));
    } catch (error) {
      this.logger.warn('Could not get user activity:', error);
      return [];
    }
  }

  private async getSystemHealth() {
    try {
      const [totalEvents, criticalEvents, securityEvents, dataEvents] = await Promise.all([
        this.prisma.auditLog.count(),
        this.prisma.auditLog.count({ where: { severity: 'critical' } }),
        this.prisma.auditLog.count({ where: { category: 'security' } }),
        this.prisma.auditLog.count({ where: { category: 'data_modification' } }),
      ]);

      return {
        totalEvents,
        criticalEvents,
        securityEvents,
        dataEvents,
      };
    } catch (error) {
      this.logger.warn('Could not get system health:', error);
      return {
        totalEvents: 0,
        criticalEvents: 0,
        securityEvents: 0,
        dataEvents: 0,
      };
    }
  }

  async logAuditEvent(
    userId: string,
    action: string,
    resource: string,
    ipAddress: string,
    resourceId?: string,
    oldValues?: any,
    newValues?: any,
    userAgent?: string,
    sessionId?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system' | 'security' = 'system',
    metadata?: any
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          oldValues,
          newValues,
          ipAddress,
          userAgent,
          sessionId,
          severity,
          category,
          metadata: metadata || {},
          timestamp: new Date(),
        },
      });

      this.logger.log(`Audit event logged: ${action} by user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to log audit event:', error);
    }
  }

  async getAuditLogs(filter: AuditLogFilter): Promise<AuditLog[]> {
    try {
      const where: any = {};

      if (filter.userId) where.userId = filter.userId;
      if (filter.action) where.action = filter.action;
      if (filter.resource) where.resource = filter.resource;
      if (filter.category) where.category = filter.category;
      if (filter.severity) where.severity = filter.severity;
      if (filter.ipAddress) where.ipAddress = filter.ipAddress;
      if (filter.startDate || filter.endDate) {
        where.timestamp = {};
        if (filter.startDate) where.timestamp.gte = new Date(filter.startDate);
        if (filter.endDate) where.timestamp.lte = new Date(filter.endDate);
      }

      const logs = await this.prisma.auditLog.findMany({
        where,
        take: filter.limit || 100,
        skip: filter.offset || 0,
        orderBy: { timestamp: 'desc' },
      });

      return logs.map(log => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        sessionId: log.sessionId,
        timestamp: log.timestamp.toISOString(),
        severity: log.severity as any,
        category: log.category as any,
        metadata: log.metadata,
      }));
    } catch (error) {
      this.logger.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  async exportAuditLogs(
    filter: AuditLogFilter,
    format: 'csv' | 'excel' | 'json' = 'csv'
  ): Promise<Buffer> {
    try {
      const logs = await this.getAuditLogs(filter);
      
      switch (format) {
        case 'csv':
          return this.exportToCSV(logs);
        case 'excel':
          return this.exportToExcel(logs);
        case 'json':
          return this.exportToJSON(logs);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      this.logger.error('Failed to export audit logs:', error);
      throw error;
    }
  }

  private exportToCSV(logs: AuditLog[]): Buffer {
    if (logs.length === 0) {
      return Buffer.from('');
    }

    const headers = Object.keys(logs[0]);
    const csvContent = [
      headers.join(','),
      ...logs.map(log => headers.map(header => `"${log[header as keyof AuditLog]}"`).join(','))
    ].join('\n');

    return Buffer.from(csvContent);
  }

  private exportToExcel(logs: AuditLog[]): Buffer {
    // Bu implementasyon ExcelJS kullanarak yapılabilir
    // Şimdilik CSV olarak döndürüyoruz
    return this.exportToCSV(logs);
  }

  private exportToJSON(logs: AuditLog[]): Buffer {
    const jsonData = {
      exportDate: new Date().toISOString(),
      recordCount: logs.length,
      data: logs,
    };

    return Buffer.from(JSON.stringify(jsonData, null, 2));
  }

  async deleteAuditLogs(olderThan: Date): Promise<number> {
    try {
      const result = await this.prisma.auditLog.deleteMany({
        where: {
          timestamp: { lt: olderThan },
        },
      });

      this.logger.log(`Deleted ${result.count} audit logs older than ${olderThan.toISOString()}`);
      return result.count;
    } catch (error) {
      this.logger.error('Failed to delete audit logs:', error);
      throw error;
    }
  }

  async getAuditLogSummary(startDate: string, endDate: string): Promise<any> {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: {
          timestamp: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      });

      const summary = {
        period: { startDate, endDate },
        totalLogs: logs.length,
        byCategory: this.groupBy(logs, 'category'),
        bySeverity: this.groupBy(logs, 'severity'),
        byAction: this.groupBy(logs, 'action'),
        byUser: this.groupBy(logs, 'userId'),
        criticalEvents: logs.filter(log => log.severity === 'critical').length,
        securityEvents: logs.filter(log => log.category === 'security').length,
      };

      return summary;
    } catch (error) {
      this.logger.error('Failed to get audit log summary:', error);
      throw error;
    }
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((groups, item) => {
      const value = item[key];
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }
}
