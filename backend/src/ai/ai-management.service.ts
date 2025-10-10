import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AIServiceStatus {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  lastActivity: string;
  responseTime: number;
  usage: {
    requests: number;
    tokens: number;
    cost: number;
  };
  health: {
    cpu: number;
    memory: number;
    uptime: number;
  };
}

export interface AIModelInfo {
  id: string;
  name: string;
  version: string;
  type: 'text' | 'image' | 'audio' | 'video';
  status: 'active' | 'inactive' | 'training';
  accuracy: number;
  lastTrained: string;
  usage: {
    requests: number;
    tokens: number;
    cost: number;
  };
  performance: {
    responseTime: number;
    successRate: number;
    errorRate: number;
  };
}

export interface AILogEntry {
  id: string;
  timestamp: string;
  service: string;
  model: string;
  action: string;
  input: any;
  output: any;
  duration: number;
  tokens: number;
  cost: number;
  status: 'success' | 'error' | 'warning';
  error?: string;
}

export interface AIDashboardData {
  services: AIServiceStatus[];
  models: AIModelInfo[];
  logs: AILogEntry[];
  analytics: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
  };
  usageAnalytics: {
    daily: { date: string; requests: number; tokens: number; cost: number }[];
    monthly: { month: string; requests: number; tokens: number; cost: number }[];
    yearly: { year: string; requests: number; tokens: number; cost: number }[];
  };
  alerts: {
    id: string;
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: string;
    resolved: boolean;
  }[];
}

@Injectable()
export class AIManagementService {
  private readonly logger = new Logger(AIManagementService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboardData(): Promise<AIDashboardData> {
    try {
      const [services, models, logs, analytics, usageAnalytics, alerts] = await Promise.all([
        this.getAIServices(),
        this.getAIModels(),
        this.getAILogs(),
        this.getAnalytics(),
        this.getUsageAnalytics(),
        this.getAlerts(),
      ]);

      return {
        services,
        models,
        logs,
        analytics,
        usageAnalytics,
        alerts,
      };
    } catch (error) {
      this.logger.error('Failed to get AI management dashboard data:', error);
      throw error;
    }
  }

  private async getAIServices(): Promise<AIServiceStatus[]> {
    try {
      // AI servislerini veritabanından al
      const services = await this.prisma.aIService.findMany({
        take: 10,
        orderBy: { lastActivity: 'desc' },
      });

      return services.map(service => ({
        id: service.id,
        name: service.name,
        status: service.status as any,
        lastActivity: service.lastActivity.toISOString(),
        responseTime: service.responseTime || 0,
        usage: {
          requests: service.requests || 0,
          tokens: service.tokens || 0,
          cost: service.cost || 0,
        },
        health: {
          cpu: service.cpuUsage || 0,
          memory: service.memoryUsage || 0,
          uptime: service.uptime || 0,
        },
      }));
    } catch (error) {
      this.logger.warn('Could not get AI services:', error);
      return [];
    }
  }

  private async getAIModels(): Promise<AIModelInfo[]> {
    try {
      const models = await this.prisma.aIModel.findMany({
        take: 10,
        orderBy: { lastTrained: 'desc' },
      });

      return models.map(model => ({
        id: model.id,
        name: model.name,
        version: model.version,
        type: model.type as any,
        status: model.status as any,
        accuracy: model.accuracy || 0,
        lastTrained: model.lastTrained.toISOString(),
        usage: {
          requests: model.requests || 0,
          tokens: model.tokens || 0,
          cost: model.cost || 0,
        },
        performance: {
          responseTime: model.responseTime || 0,
          successRate: model.successRate || 0,
          errorRate: model.errorRate || 0,
        },
      }));
    } catch (error) {
      this.logger.warn('Could not get AI models:', error);
      return [];
    }
  }

  private async getAILogs(): Promise<AILogEntry[]> {
    try {
      const logs = await this.prisma.aILog.findMany({
        take: 50,
        orderBy: { timestamp: 'desc' },
      });

      return logs.map(log => ({
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        service: log.service,
        model: log.model,
        action: log.action,
        input: log.input,
        output: log.output,
        duration: log.duration,
        tokens: log.tokens,
        cost: log.cost,
        status: log.status as any,
        error: log.error,
      }));
    } catch (error) {
      this.logger.warn('Could not get AI logs:', error);
      return [];
    }
  }

  private async getAnalytics() {
    try {
      const [totalRequests, totalTokens, totalCost, averageResponseTime, successRate, errorRate] = await Promise.all([
        this.getTotalRequests(),
        this.getTotalTokens(),
        this.getTotalCost(),
        this.getAverageResponseTime(),
        this.getSuccessRate(),
        this.getErrorRate(),
      ]);

      return {
        totalRequests,
        totalTokens,
        totalCost,
        averageResponseTime,
        successRate,
        errorRate,
      };
    } catch (error) {
      this.logger.warn('Could not get analytics:', error);
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageResponseTime: 0,
        successRate: 0,
        errorRate: 0,
      };
    }
  }

  private async getTotalRequests(): Promise<number> {
    try {
      const result = await this.prisma.aILog.aggregate({
        _count: { id: true },
      });
      return result._count.id;
    } catch (error) {
      this.logger.warn('Could not get total requests:', error);
      return 0;
    }
  }

  private async getTotalTokens(): Promise<number> {
    try {
      const result = await this.prisma.aILog.aggregate({
        _sum: { tokens: true },
      });
      return result._sum.tokens || 0;
    } catch (error) {
      this.logger.warn('Could not get total tokens:', error);
      return 0;
    }
  }

  private async getTotalCost(): Promise<number> {
    try {
      const result = await this.prisma.aILog.aggregate({
        _sum: { cost: true },
      });
      return result._sum.cost || 0;
    } catch (error) {
      this.logger.warn('Could not get total cost:', error);
      return 0;
    }
  }

  private async getAverageResponseTime(): Promise<number> {
    try {
      const result = await this.prisma.aILog.aggregate({
        _avg: { duration: true },
      });
      return result._avg.duration || 0;
    } catch (error) {
      this.logger.warn('Could not get average response time:', error);
      return 0;
    }
  }

  private async getSuccessRate(): Promise<number> {
    try {
      const total = await this.prisma.aILog.count();
      const success = await this.prisma.aILog.count({
        where: { status: 'success' },
      });
      return total > 0 ? (success / total) * 100 : 0;
    } catch (error) {
      this.logger.warn('Could not get success rate:', error);
      return 0;
    }
  }

  private async getErrorRate(): Promise<number> {
    try {
      const total = await this.prisma.aILog.count();
      const errors = await this.prisma.aILog.count({
        where: { status: 'error' },
      });
      return total > 0 ? (errors / total) * 100 : 0;
    } catch (error) {
      this.logger.warn('Could not get error rate:', error);
      return 0;
    }
  }

  private async getUsageAnalytics() {
    try {
      const [daily, monthly, yearly] = await Promise.all([
        this.getDailyUsage(),
        this.getMonthlyUsage(),
        this.getYearlyUsage(),
      ]);

      return { daily, monthly, yearly };
    } catch (error) {
      this.logger.warn('Could not get usage analytics:', error);
      return {
        daily: [],
        monthly: [],
        yearly: [],
      };
    }
  }

  private async getDailyUsage() {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const logs = await this.prisma.aILog.findMany({
      where: {
        timestamp: { gte: last30Days },
      },
      select: {
        timestamp: true,
        tokens: true,
        cost: true,
      },
    });

    const dailyUsage = new Map<string, { requests: number; tokens: number; cost: number }>();
    
    logs.forEach(log => {
      const date = log.timestamp.toISOString().split('T')[0];
      const existing = dailyUsage.get(date) || { requests: 0, tokens: 0, cost: 0 };
      dailyUsage.set(date, {
        requests: existing.requests + 1,
        tokens: existing.tokens + log.tokens,
        cost: existing.cost + log.cost,
      });
    });

    return Array.from(dailyUsage.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getMonthlyUsage() {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    const logs = await this.prisma.aILog.findMany({
      where: {
        timestamp: { gte: last12Months },
      },
      select: {
        timestamp: true,
        tokens: true,
        cost: true,
      },
    });

    const monthlyUsage = new Map<string, { requests: number; tokens: number; cost: number }>();
    
    logs.forEach(log => {
      const month = log.timestamp.toISOString().substring(0, 7);
      const existing = monthlyUsage.get(month) || { requests: 0, tokens: 0, cost: 0 };
      monthlyUsage.set(month, {
        requests: existing.requests + 1,
        tokens: existing.tokens + log.tokens,
        cost: existing.cost + log.cost,
      });
    });

    return Array.from(monthlyUsage.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private async getYearlyUsage() {
    const last5Years = new Date();
    last5Years.setFullYear(last5Years.getFullYear() - 5);

    const logs = await this.prisma.aILog.findMany({
      where: {
        timestamp: { gte: last5Years },
      },
      select: {
        timestamp: true,
        tokens: true,
        cost: true,
      },
    });

    const yearlyUsage = new Map<string, { requests: number; tokens: number; cost: number }>();
    
    logs.forEach(log => {
      const year = log.timestamp.getFullYear().toString();
      const existing = yearlyUsage.get(year) || { requests: 0, tokens: 0, cost: 0 };
      yearlyUsage.set(year, {
        requests: existing.requests + 1,
        tokens: existing.tokens + log.tokens,
        cost: existing.cost + log.cost,
      });
    });

    return Array.from(yearlyUsage.entries())
      .map(([year, data]) => ({ year, ...data }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }

  private async getAlerts() {
    try {
      const alerts = await this.prisma.aIAlert.findMany({
        where: { resolved: false },
        take: 10,
        orderBy: { timestamp: 'desc' },
      });

      return alerts.map(alert => ({
        id: alert.id,
        type: alert.type as any,
        title: alert.title,
        message: alert.message,
        timestamp: alert.timestamp.toISOString(),
        resolved: alert.resolved,
      }));
    } catch (error) {
      this.logger.warn('Could not get alerts:', error);
      return [];
    }
  }

  async createAILog(
    service: string,
    model: string,
    action: string,
    input: any,
    output: any,
    duration: number,
    tokens: number,
    cost: number,
    status: 'success' | 'error' | 'warning',
    error?: string
  ): Promise<void> {
    try {
      await this.prisma.aILog.create({
        data: {
          service,
          model,
          action,
          input,
          output,
          duration,
          tokens,
          cost,
          status,
          error,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to create AI log:', error);
    }
  }

  async createAIAlert(
    type: 'error' | 'warning' | 'info',
    title: string,
    message: string
  ): Promise<void> {
    try {
      await this.prisma.aIAlert.create({
        data: {
          type,
          title,
          message,
          timestamp: new Date(),
          resolved: false,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create AI alert:', error);
    }
  }
}