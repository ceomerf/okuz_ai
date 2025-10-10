import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ExecutiveDashboardData {
  quickStats: {
    totalUsers: number;
    totalTeachers: number;
    totalStudents: number;
    totalClasses: number;
    totalRevenue: number;
    monthlyRevenue: number;
    systemUptime: number;
    activeUsers: number;
  };
  recentActivities: {
    id: string;
    type: 'user_registration' | 'class_created' | 'payment_received' | 'system_alert';
    title: string;
    description: string;
    timestamp: string;
    user?: string;
    amount?: number;
  }[];
  revenueAnalytics: {
    daily: { date: string; revenue: number }[];
    monthly: { month: string; revenue: number }[];
    yearly: { year: string; revenue: number }[];
  };
  userAnalytics: {
    daily: { date: string; users: number }[];
    monthly: { month: string; users: number }[];
    yearly: { year: string; users: number }[];
  };
  systemMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkTraffic: number;
    responseTime: number;
  };
  alerts: {
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    message: string;
    timestamp: string;
    resolved: boolean;
  }[];
}

@Injectable()
export class ExecutiveDashboardService {
  private readonly logger = new Logger(ExecutiveDashboardService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboardData(): Promise<ExecutiveDashboardData> {
    try {
      const [
        quickStats,
        recentActivities,
        revenueAnalytics,
        userAnalytics,
        systemMetrics,
        alerts,
      ] = await Promise.all([
        this.getQuickStats(),
        this.getRecentActivities(),
        this.getRevenueAnalytics(),
        this.getUserAnalytics(),
        this.getSystemMetrics(),
        this.getAlerts(),
      ]);

      return {
        quickStats,
        recentActivities,
        revenueAnalytics,
        userAnalytics,
        systemMetrics,
        alerts,
      };
    } catch (error) {
      this.logger.error('Failed to get executive dashboard data:', error);
      throw error;
    }
  }

  private async getQuickStats() {
    const [
      totalUsers,
      totalTeachers,
      totalStudents,
      totalClasses,
      totalRevenue,
      monthlyRevenue,
      activeUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'TEACHER' } }),
      this.prisma.user.count({ where: { role: 'STUDENT' } }),
      this.prisma.class.count(),
      this.getTotalRevenue(),
      this.getMonthlyRevenue(),
      this.getActiveUsers(),
    ]);

    return {
      totalUsers,
      totalTeachers,
      totalStudents,
      totalClasses,
      totalRevenue,
      monthlyRevenue,
      systemUptime: process.uptime(),
      activeUsers,
    };
  }

  private async getTotalRevenue(): Promise<number> {
    try {
      const result = await this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' },
      });
      return result._sum.amount || 0;
    } catch (error) {
      this.logger.warn('Could not get total revenue:', error);
      return 0;
    }
  }

  private async getMonthlyRevenue(): Promise<number> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const result = await this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth },
        },
      });
      return result._sum.amount || 0;
    } catch (error) {
      this.logger.warn('Could not get monthly revenue:', error);
      return 0;
    }
  }

  private async getActiveUsers(): Promise<number> {
    try {
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      return await this.prisma.user.count({
        where: {
          lastLoginAt: { gte: last24Hours },
        },
      });
    } catch (error) {
      this.logger.warn('Could not get active users:', error);
      return 0;
    }
  }

  private async getRecentActivities() {
    try {
      const activities = await this.prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      });

      return activities.map(activity => ({
        id: activity.id,
        type: activity.type as any,
        title: activity.title,
        description: activity.description,
        timestamp: activity.createdAt.toISOString(),
        user: activity.user?.name || activity.user?.email,
        amount: activity.metadata?.amount,
      }));
    } catch (error) {
      this.logger.warn('Could not get recent activities:', error);
      return [];
    }
  }

  private async getRevenueAnalytics() {
    try {
      const [daily, monthly, yearly] = await Promise.all([
        this.getDailyRevenue(),
        this.getMonthlyRevenueData(),
        this.getYearlyRevenueData(),
      ]);

      return { daily, monthly, yearly };
    } catch (error) {
      this.logger.warn('Could not get revenue analytics:', error);
      return {
        daily: [],
        monthly: [],
        yearly: [],
      };
    }
  }

  private async getDailyRevenue() {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: last30Days },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    const dailyRevenue = new Map<string, number>();
    
    payments.forEach(payment => {
      const date = payment.createdAt.toISOString().split('T')[0];
      dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + payment.amount);
    });

    return Array.from(dailyRevenue.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getMonthlyRevenueData() {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: last12Months },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    const monthlyRevenue = new Map<string, number>();
    
    payments.forEach(payment => {
      const month = payment.createdAt.toISOString().substring(0, 7);
      monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + payment.amount);
    });

    return Array.from(monthlyRevenue.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private async getYearlyRevenueData() {
    const last5Years = new Date();
    last5Years.setFullYear(last5Years.getFullYear() - 5);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: last5Years },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    const yearlyRevenue = new Map<string, number>();
    
    payments.forEach(payment => {
      const year = payment.createdAt.getFullYear().toString();
      yearlyRevenue.set(year, (yearlyRevenue.get(year) || 0) + payment.amount);
    });

    return Array.from(yearlyRevenue.entries())
      .map(([year, revenue]) => ({ year, revenue }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }

  private async getUserAnalytics() {
    try {
      const [daily, monthly, yearly] = await Promise.all([
        this.getDailyUserRegistrations(),
        this.getMonthlyUserRegistrations(),
        this.getYearlyUserRegistrations(),
      ]);

      return { daily, monthly, yearly };
    } catch (error) {
      this.logger.warn('Could not get user analytics:', error);
      return {
        daily: [],
        monthly: [],
        yearly: [],
      };
    }
  }

  private async getDailyUserRegistrations() {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const users = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: last30Days },
      },
      select: { createdAt: true },
    });

    const dailyUsers = new Map<string, number>();
    
    users.forEach(user => {
      const date = user.createdAt.toISOString().split('T')[0];
      dailyUsers.set(date, (dailyUsers.get(date) || 0) + 1);
    });

    return Array.from(dailyUsers.entries())
      .map(([date, users]) => ({ date, users }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getMonthlyUserRegistrations() {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    const users = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: last12Months },
      },
      select: { createdAt: true },
    });

    const monthlyUsers = new Map<string, number>();
    
    users.forEach(user => {
      const month = user.createdAt.toISOString().substring(0, 7);
      monthlyUsers.set(month, (monthlyUsers.get(month) || 0) + 1);
    });

    return Array.from(monthlyUsers.entries())
      .map(([month, users]) => ({ month, users }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private async getYearlyUserRegistrations() {
    const last5Years = new Date();
    last5Years.setFullYear(last5Years.getFullYear() - 5);

    const users = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: last5Years },
      },
      select: { createdAt: true },
    });

    const yearlyUsers = new Map<string, number>();
    
    users.forEach(user => {
      const year = user.createdAt.getFullYear().toString();
      yearlyUsers.set(year, (yearlyUsers.get(year) || 0) + 1);
    });

    return Array.from(yearlyUsers.entries())
      .map(([year, users]) => ({ year, users }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }

  private async getSystemMetrics() {
    // Bu değerler SystemHealthService'den alınabilir
    return {
      cpuUsage: 45.2,
      memoryUsage: 67.8,
      diskUsage: 23.4,
      networkTraffic: 1024,
      responseTime: 150,
    };
  }

  private async getAlerts() {
    try {
      const alerts = await this.prisma.alert.findMany({
        where: { resolved: false },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      return alerts.map(alert => ({
        id: alert.id,
        type: alert.type as any,
        title: alert.title,
        message: alert.message,
        timestamp: alert.createdAt.toISOString(),
        resolved: alert.resolved,
      }));
    } catch (error) {
      this.logger.warn('Could not get alerts:', error);
      return [];
    }
  }
}