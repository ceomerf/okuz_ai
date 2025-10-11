import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

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

  constructor(private readonly prisma: PrismaService) {}

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
      this.logger.error('Failed to get dashboard data:', error);
      throw error;
    }
  }

  private async getQuickStats() {
    try {
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
        this.prisma.teacher.count(),
        this.prisma.student.count(),
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
    } catch (error) {
      this.logger.error('Failed to get quick stats:', error);
      return {
        totalUsers: 0,
        totalTeachers: 0,
        totalStudents: 0,
        totalClasses: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        systemUptime: 0,
        activeUsers: 0,
      };
    }
  }

  private async getTotalRevenue(): Promise<number> {
    try {
      const result = await this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' },
      });
      return Number(result._sum.amount || 0);
    } catch (error) {
      this.logger.error('Failed to get total revenue:', error);
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
      return Number(result._sum.amount || 0);
    } catch (error) {
      this.logger.error('Failed to get monthly revenue:', error);
      return 0;
    }
  }

  private async getActiveUsers(): Promise<number> {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      return await this.prisma.user.count({
        where: {
          lastActiveAt: { gte: oneDayAgo },
        },
      });
    } catch (error) {
      this.logger.error('Failed to get active users:', error);
      return 0;
    }
  }

  private async getRecentActivities() {
    try {
      const activities = await this.prisma.userActivity.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return activities.map(activity => ({
        id: activity.id,
        type: this.mapActivityType(activity.action),
        title: this.getActivityTitle(activity.action),
        description: this.getActivityDescription(activity.action),
        timestamp: activity.createdAt.toISOString(),
        user: activity.user.name || activity.user.email,
      }));
    } catch (error) {
      this.logger.error('Failed to get recent activities:', error);
      return [];
    }
  }

  private mapActivityType(action: string): 'user_registration' | 'class_created' | 'payment_received' | 'system_alert' {
    if (action.includes('register')) return 'user_registration';
    if (action.includes('class')) return 'class_created';
    if (action.includes('payment')) return 'payment_received';
    return 'system_alert';
  }

  private getActivityTitle(action: string): string {
    if (action.includes('register')) return 'New User Registration';
    if (action.includes('class')) return 'Class Created';
    if (action.includes('payment')) return 'Payment Received';
    return 'System Activity';
  }

  private getActivityDescription(action: string): string {
    return `User performed: ${action}`;
  }

  private async getRevenueAnalytics() {
    try {
      const payments = await this.prisma.payment.findMany({
        where: { status: 'COMPLETED' },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });

      const dailyRevenue = new Map<string, number>();
      const monthlyRevenue = new Map<string, number>();
      const yearlyRevenue = new Map<string, number>();

      payments.forEach(payment => {
        const date = payment.createdAt.toISOString().split('T')[0];
        const month = payment.createdAt.toISOString().substring(0, 7);
        const year = payment.createdAt.getFullYear().toString();

        dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + Number(payment.amount));
        monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + Number(payment.amount));
        yearlyRevenue.set(year, (yearlyRevenue.get(year) || 0) + Number(payment.amount));
      });

      return {
        daily: Array.from(dailyRevenue.entries()).map(([date, revenue]) => ({ date, revenue })),
        monthly: Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({ month, revenue })),
        yearly: Array.from(yearlyRevenue.entries()).map(([year, revenue]) => ({ year, revenue })),
      };
    } catch (error) {
      this.logger.error('Failed to get revenue analytics:', error);
      return {
        daily: [],
        monthly: [],
        yearly: [],
      };
    }
  }

  private async getUserAnalytics() {
    try {
      const users = await this.prisma.user.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });

      const dailyUsers = new Map<string, number>();
      const monthlyUsers = new Map<string, number>();
      const yearlyUsers = new Map<string, number>();

      users.forEach(user => {
        const date = user.createdAt.toISOString().split('T')[0];
        const month = user.createdAt.toISOString().substring(0, 7);
        const year = user.createdAt.getFullYear().toString();

        dailyUsers.set(date, (dailyUsers.get(date) || 0) + 1);
        monthlyUsers.set(month, (monthlyUsers.get(month) || 0) + 1);
        yearlyUsers.set(year, (yearlyUsers.get(year) || 0) + 1);
      });

      return {
        daily: Array.from(dailyUsers.entries()).map(([date, users]) => ({ date, users })),
        monthly: Array.from(monthlyUsers.entries()).map(([month, users]) => ({ month, users })),
        yearly: Array.from(yearlyUsers.entries()).map(([year, users]) => ({ year, users })),
      };
    } catch (error) {
      this.logger.error('Failed to get user analytics:', error);
      return {
        daily: [],
        monthly: [],
        yearly: [],
      };
    }
  }

  private async getSystemMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      
      return {
        cpuUsage: process.cpuUsage().user / 1000000,
        memoryUsage: memoryUsage.heapUsed / 1024 / 1024,
        diskUsage: 0, // Simplified
        networkTraffic: 0, // Simplified
        responseTime: 0, // Simplified
      };
    } catch (error) {
      this.logger.error('Failed to get system metrics:', error);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkTraffic: 0,
        responseTime: 0,
      };
    }
  }

  private async getAlerts() {
    try {
      const alerts = await this.prisma.aIAlert.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      return alerts.map(alert => ({
        id: alert.id,
        type: alert.level as 'warning' | 'error' | 'info',
        title: alert.title,
        message: alert.message,
        timestamp: alert.timestamp.toISOString(),
        resolved: alert.resolved,
      }));
    } catch (error) {
      this.logger.error('Failed to get alerts:', error);
      return [];
    }
  }
}