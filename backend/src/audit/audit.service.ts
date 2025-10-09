import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogData {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async logAction(auditData: AuditLogData): Promise<{
    success: boolean;
    auditId?: string;
    error?: string;
  }> {
    try {
      const auditLog = await (this.prisma as any).auditLog.create({
        data: {
          userId: auditData.userId,
          action: auditData.action,
          entityType: auditData.entityType,
          entityId: auditData.entityId,
          oldValues: auditData.oldValues || {},
          newValues: auditData.newValues || {},
          ipAddress: auditData.ipAddress,
          userAgent: auditData.userAgent,
          metadata: auditData.metadata || {},
          timestamp: new Date(),
        },
      });

      this.logger.log(`Audit log oluşturuldu: ${auditLog.id} - ${auditData.action}`);
      return { success: true, auditId: auditLog.id };
    } catch (error) {
      this.logger.error('Audit log oluşturma hatası:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getUserAuditLogs(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      action?: string;
      entityType?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<{
    success: boolean;
    data?: any[];
    total?: number;
    error?: string;
  }> {
    try {
      const { limit = 50, offset = 0, action, entityType, startDate, endDate } = options;

      const where: any = { userId };

      if (action) {
        where.action = action;
      }

      if (entityType) {
        where.entityType = entityType;
      }

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const [auditLogs, total] = await Promise.all([
        (this.prisma as any).auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        (this.prisma as any).auditLog.count({ where }),
      ]);

      return {
        success: true,
        data: auditLogs,
        total,
      };
    } catch (error) {
      this.logger.error('Kullanıcı audit logları getirme hatası:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getSystemAuditLogs(
    options: {
      limit?: number;
      offset?: number;
      action?: string;
      entityType?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<{
    success: boolean;
    data?: any[];
    total?: number;
    error?: string;
  }> {
    try {
      const { limit = 100, offset = 0, action, entityType, userId, startDate, endDate } = options;

      const where: any = {};

      if (action) {
        where.action = action;
      }

      if (entityType) {
        where.entityType = entityType;
      }

      if (userId) {
        where.userId = userId;
      }

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const [auditLogs, total] = await Promise.all([
        (this.prisma as any).auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        }),
        (this.prisma as any).auditLog.count({ where }),
      ]);

      return {
        success: true,
        data: auditLogs,
        total,
      };
    } catch (error) {
      this.logger.error('Sistem audit logları getirme hatası:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getAuditStats(options: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  } = {}): Promise<{
    success: boolean;
    data?: {
      totalActions: number;
      byAction: Record<string, number>;
      byEntityType: Record<string, number>;
      byUser: Record<string, number>;
      byDay: Record<string, number>;
    };
    error?: string;
  }> {
    try {
      const { startDate, endDate, userId } = options;

      const where: any = {};
      if (userId) where.userId = userId;
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const [totalActions, byAction, byEntityType, byUser, byDay] = await Promise.all([
        (this.prisma as any).auditLog.count({ where }),
        this.getStatsByField('action', where),
        this.getStatsByField('entityType', where),
        this.getUserStats(where),
        this.getDailyStats(where),
      ]);

      return {
        success: true,
        data: {
          totalActions,
          byAction,
          byEntityType,
          byUser,
          byDay,
        },
      };
    } catch (error) {
      this.logger.error('Audit istatistikleri getirme hatası:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async searchAuditLogs(
    searchTerm: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<{
    success: boolean;
    data?: any[];
    total?: number;
    error?: string;
  }> {
    try {
      const { limit = 50, offset = 0, startDate, endDate } = options;

      const where: any = {
        OR: [
          { action: { contains: searchTerm, mode: 'insensitive' } },
          { entityType: { contains: searchTerm, mode: 'insensitive' } },
          { entityId: { contains: searchTerm, mode: 'insensitive' } },
          { ipAddress: { contains: searchTerm, mode: 'insensitive' } },
        ],
      };

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const [auditLogs, total] = await Promise.all([
        (this.prisma as any).auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        }),
        (this.prisma as any).auditLog.count({ where }),
      ]);

      return {
        success: true,
        data: auditLogs,
        total,
      };
    } catch (error) {
      this.logger.error('Audit log arama hatası:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async exportAuditLogs(
    options: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      entityType?: string;
      action?: string;
    } = {},
  ): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const { startDate, endDate, userId, entityType, action } = options;

      const where: any = {};
      if (userId) where.userId = userId;
      if (entityType) where.entityType = entityType;
      if (action) where.action = action;
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const auditLogs = await (this.prisma as any).auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return {
        success: true,
        data: auditLogs,
      };
    } catch (error) {
      this.logger.error('Audit log export hatası:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async getStatsByField(field: string, where: any): Promise<Record<string, number>> {
    try {
      const results = await (this.prisma as any).auditLog.groupBy({
        by: [field],
        where,
        _count: true,
      });

      const stats: Record<string, number> = {};
      results.forEach((result: any) => {
        const key = result[field] || 'null';
        stats[key] = result._count;
      });

      return stats;
    } catch (error) {
      this.logger.error(`${field} istatistikleri getirme hatası:`, error);
      return {};
    }
  }

  private async getUserStats(where: any): Promise<Record<string, number>> {
    try {
      const results = await (this.prisma as any).auditLog.groupBy({
        by: ['userId'],
        where,
        _count: true,
      });

      const stats: Record<string, number> = {};
      for (const result of results) {
        const user = await (this.prisma as any).user.findUnique({
          where: { id: result.userId },
          select: { firstName: true, lastName: true },
        });
        
        const userName = user ? `${user.firstName} ${user.lastName}` : 'Bilinmeyen';
        stats[userName] = result._count;
      }

      return stats;
    } catch (error) {
      this.logger.error('Kullanıcı istatistikleri getirme hatası:', error);
      return {};
    }
  }

  private async getDailyStats(where: any): Promise<Record<string, number>> {
    try {
      const results = await (this.prisma as any).auditLog.findMany({
        where,
        select: { timestamp: true },
      });

      const dailyStats: Record<string, number> = {};
      results.forEach((result: any) => {
        const date = result.timestamp.toISOString().split('T')[0];
        dailyStats[date] = (dailyStats[date] || 0) + 1;
      });

      return dailyStats;
    } catch (error) {
      this.logger.error('Günlük istatistikler getirme hatası:', error);
      return {};
    }
  }
}
