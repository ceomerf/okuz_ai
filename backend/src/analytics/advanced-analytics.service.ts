import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

export interface UserEngagementMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  engagementRate: number;
  averageSessionDuration: number;
  bounceRate: number;
  retentionRate: {
    day1: number;
    day7: number;
    day30: number;
  };
}

export interface LearningAnalytics {
  totalClasses: number;
  completedClasses: number;
  averageGrade: number;
  learningProgress: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  subjectPerformance: {
    subject: string;
    averageGrade: number;
    completionRate: number;
    students: number;
  }[];
  timeSpentAnalytics: {
    daily: { date: string; hours: number }[];
    weekly: { week: string; hours: number }[];
    monthly: { month: string; hours: number }[];
  };
}

export interface RevenueAnalytics {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  averageRevenuePerUser: number;
  revenueBySource: {
    source: string;
    amount: number;
    percentage: number;
  }[];
  subscriptionAnalytics: {
    activeSubscriptions: number;
    newSubscriptions: number;
    churnRate: number;
    lifetimeValue: number;
  };
  paymentAnalytics: {
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    averagePaymentAmount: number;
  };
}

export interface PerformanceAnalytics {
  systemPerformance: {
    averageResponseTime: number;
    uptime: number;
    errorRate: number;
    throughput: number;
  };
  userPerformance: {
    averageLoginTime: number;
    averagePageLoadTime: number;
    mobileUsage: number;
    desktopUsage: number;
  };
  contentPerformance: {
    mostViewedContent: {
      id: string;
      title: string;
      views: number;
      engagement: number;
    }[];
    leastViewedContent: {
      id: string;
      title: string;
      views: number;
      engagement: number;
    }[];
  };
}

export interface AdvancedAnalyticsData {
  userEngagement: UserEngagementMetrics;
  learningAnalytics: LearningAnalytics;
  revenueAnalytics: RevenueAnalytics;
  performanceAnalytics: PerformanceAnalytics;
  trends: {
    userGrowth: { date: string; users: number }[];
    revenueGrowth: { date: string; revenue: number }[];
    engagementTrends: { date: string; engagement: number }[];
  };
  predictions: {
    userGrowth: number;
    revenueProjection: number;
    churnPrediction: number;
    engagementForecast: number;
  };
}

@Injectable()
export class AdvancedAnalyticsService {
  private readonly logger = new Logger(AdvancedAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async getAdvancedAnalytics(): Promise<AdvancedAnalyticsData> {
    try {
      const [
        userEngagement,
        learningAnalytics,
        revenueAnalytics,
        performanceAnalytics,
        trends,
        predictions,
      ] = await Promise.all([
        this.getUserEngagementMetrics(),
        this.getLearningAnalytics(),
        this.getRevenueAnalytics(),
        this.getPerformanceAnalytics(),
        this.getTrends(),
        this.getPredictions(),
      ]);

      return {
        userEngagement,
        learningAnalytics,
        revenueAnalytics,
        performanceAnalytics,
        trends,
        predictions,
      };
    } catch (error) {
      this.logger.error('Failed to get advanced analytics:', error);
      throw error;
    }
  }

  private async getUserEngagementMetrics(): Promise<UserEngagementMetrics> {
    try {
      const [
        totalUsers,
        activeUsers,
        newUsers,
        returningUsers,
        averageSessionDuration,
        bounceRate,
        retentionRates,
      ] = await Promise.all([
        this.getTotalUsers(),
        this.getActiveUsers(),
        this.getNewUsers(),
        this.getReturningUsers(),
        this.getAverageSessionDuration(),
        this.getBounceRate(),
        this.getRetentionRates(),
      ]);

      const engagementRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

      return {
        totalUsers,
        activeUsers,
        newUsers,
        returningUsers,
        engagementRate,
        averageSessionDuration,
        bounceRate,
        retentionRate: retentionRates,
      };
    } catch (error) {
      this.logger.warn('Could not get user engagement metrics:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        newUsers: 0,
        returningUsers: 0,
        engagementRate: 0,
        averageSessionDuration: 0,
        bounceRate: 0,
        retentionRate: { day1: 0, day7: 0, day30: 0 },
      };
    }
  }

  private async getTotalUsers(): Promise<number> {
    try {
      return await this.prisma.user.count();
    } catch (error) {
      this.logger.warn('Could not get total users:', error);
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

  private async getNewUsers(): Promise<number> {
    try {
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      return await this.prisma.user.count({
        where: {
          createdAt: { gte: last30Days },
        },
      });
    } catch (error) {
      this.logger.warn('Could not get new users:', error);
      return 0;
    }
  }

  private async getReturningUsers(): Promise<number> {
    try {
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      return await this.prisma.user.count({
        where: {
          lastLoginAt: { gte: last7Days },
          createdAt: { lt: last7Days },
        },
      });
    } catch (error) {
      this.logger.warn('Could not get returning users:', error);
      return 0;
    }
  }

  private async getAverageSessionDuration(): Promise<number> {
    try {
      // Bu değer session tablosundan alınabilir
      return 0; // Placeholder
    } catch (error) {
      this.logger.warn('Could not get average session duration:', error);
      return 0;
    }
  }

  private async getBounceRate(): Promise<number> {
    try {
      // Bu değer analytics tablosundan alınabilir
      return 0; // Placeholder
    } catch (error) {
      this.logger.warn('Could not get bounce rate:', error);
      return 0;
    }
  }

  private async getRetentionRates() {
    try {
      const [day1, day7, day30] = await Promise.all([
        this.getRetentionRate(1),
        this.getRetentionRate(7),
        this.getRetentionRate(30),
      ]);

      return { day1, day7, day30 };
    } catch (error) {
      this.logger.warn('Could not get retention rates:', error);
      return { day1: 0, day7: 0, day30: 0 };
    }
  }

  private async getRetentionRate(days: number): Promise<number> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const totalUsers = await this.prisma.user.count({
        where: { createdAt: { gte: startDate } },
      });

      if (totalUsers === 0) return 0;

      const retainedUsers = await this.prisma.user.count({
        where: {
          createdAt: { gte: startDate },
          lastLoginAt: { gte: new Date() },
        },
      });

      return (retainedUsers / totalUsers) * 100;
    } catch (error) {
      this.logger.warn(`Could not get ${days}-day retention rate:`, error);
      return 0;
    }
  }

  private async getLearningAnalytics(): Promise<LearningAnalytics> {
    try {
      const [
        totalClasses,
        completedClasses,
        averageGrade,
        learningProgress,
        subjectPerformance,
        timeSpentAnalytics,
      ] = await Promise.all([
        this.getTotalClasses(),
        this.getCompletedClasses(),
        this.getAverageGrade(),
        this.getLearningProgress(),
        this.getSubjectPerformance(),
        this.getTimeSpentAnalytics(),
      ]);

      return {
        totalClasses,
        completedClasses,
        averageGrade,
        learningProgress,
        subjectPerformance,
        timeSpentAnalytics,
      };
    } catch (error) {
      this.logger.warn('Could not get learning analytics:', error);
      return {
        totalClasses: 0,
        completedClasses: 0,
        averageGrade: 0,
        learningProgress: { beginner: 0, intermediate: 0, advanced: 0 },
        subjectPerformance: [],
        timeSpentAnalytics: { daily: [], weekly: [], monthly: [] },
      };
    }
  }

  private async getTotalClasses(): Promise<number> {
    try {
      return await this.prisma.class.count();
    } catch (error) {
      this.logger.warn('Could not get total classes:', error);
      return 0;
    }
  }

  private async getCompletedClasses(): Promise<number> {
    try {
      return await this.prisma.class.count({
        where: {},
      });
    } catch (error) {
      this.logger.warn('Could not get completed classes:', error);
      return 0;
    }
  }

  private async getAverageGrade(): Promise<number> {
    try {
      const result = await this.prisma.grade.aggregate({
        _avg: { score: true },
      });
      return result._avg.score || 0;
    } catch (error) {
      this.logger.warn('Could not get average grade:', error);
      return 0;
    }
  }

  private async getLearningProgress() {
    try {
      // Bu değerler öğrenci seviyelerine göre hesaplanabilir
      return {
        beginner: 0,
        intermediate: 0,
        advanced: 0,
      };
    } catch (error) {
      this.logger.warn('Could not get learning progress:', error);
      return { beginner: 0, intermediate: 0, advanced: 0 };
    }
  }

  private async getSubjectPerformance() {
    try {
      const subjects = await this.prisma.subject.findMany();

      return subjects.map(subject => {
        return {
          subject: subject.name,
          averageGrade: 0,
          completionRate: 0,
          students: 0,
        };
      });
    } catch (error) {
      this.logger.warn('Could not get subject performance:', error);
      return [];
    }
  }

  private async getTimeSpentAnalytics() {
    try {
      const [daily, weekly, monthly] = await Promise.all([
        this.getDailyTimeSpent(),
        this.getWeeklyTimeSpent(),
        this.getMonthlyTimeSpent(),
      ]);

      return { daily, weekly, monthly };
    } catch (error) {
      this.logger.warn('Could not get time spent analytics:', error);
      return { daily: [], weekly: [], monthly: [] };
    }
  }

  private async getDailyTimeSpent() {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const sessions = await this.prisma.studySession.findMany({
      where: {
        createdAt: { gte: last30Days },
      },
      select: {
        duration: true,
        createdAt: true,
      },
    });

    const dailyTime = new Map<string, number>();
    
    sessions.forEach(session => {
      const date = session.createdAt.toISOString().split('T')[0];
      dailyTime.set(date, (dailyTime.get(date) || 0) + session.duration);
    });

    return Array.from(dailyTime.entries())
      .map(([date, hours]) => ({ date, hours }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getWeeklyTimeSpent() {
    const last12Weeks = new Date();
    last12Weeks.setDate(last12Weeks.getDate() - 84);

    const sessions = await this.prisma.studySession.findMany({
      where: {
        createdAt: { gte: last12Weeks },
      },
      select: {
        duration: true,
        createdAt: true,
      },
    });

    const weeklyTime = new Map<string, number>();
    
    sessions.forEach(session => {
      const week = this.getWeekString(session.createdAt);
      weeklyTime.set(week, (weeklyTime.get(week) || 0) + session.duration);
    });

    return Array.from(weeklyTime.entries())
      .map(([week, hours]) => ({ week, hours }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  private async getMonthlyTimeSpent() {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    const sessions = await this.prisma.studySession.findMany({
      where: {
        createdAt: { gte: last12Months },
      },
      select: {
        duration: true,
        createdAt: true,
      },
    });

    const monthlyTime = new Map<string, number>();
    
    sessions.forEach(session => {
      const month = session.createdAt.toISOString().substring(0, 7);
      monthlyTime.set(month, (monthlyTime.get(month) || 0) + session.duration);
    });

    return Array.from(monthlyTime.entries())
      .map(([month, hours]) => ({ month, hours }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private getWeekString(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private getWeekNumber(date: Date): number {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDay.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
  }

  private async getRevenueAnalytics(): Promise<RevenueAnalytics> {
    try {
      const [
        totalRevenue,
        monthlyRevenue,
        revenueGrowth,
        averageRevenuePerUser,
        revenueBySource,
        subscriptionAnalytics,
        paymentAnalytics,
      ] = await Promise.all([
        this.getTotalRevenue(),
        this.getMonthlyRevenue(),
        this.getRevenueGrowth(),
        this.getAverageRevenuePerUser(),
        this.getRevenueBySource(),
        this.getSubscriptionAnalytics(),
        this.getPaymentAnalytics(),
      ]);

      return {
        totalRevenue,
        monthlyRevenue,
        revenueGrowth,
        averageRevenuePerUser,
        revenueBySource,
        subscriptionAnalytics,
        paymentAnalytics,
      };
    } catch (error) {
      this.logger.warn('Could not get revenue analytics:', error);
      return {
        totalRevenue: 0,
        monthlyRevenue: 0,
        revenueGrowth: 0,
        averageRevenuePerUser: 0,
        revenueBySource: [],
        subscriptionAnalytics: {
          activeSubscriptions: 0,
          newSubscriptions: 0,
          churnRate: 0,
          lifetimeValue: 0,
        },
        paymentAnalytics: {
          totalPayments: 0,
          successfulPayments: 0,
          failedPayments: 0,
          averagePaymentAmount: 0,
        },
      };
    }
  }

  private async getTotalRevenue(): Promise<number> {
    try {
      const result = await this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {},
      });
      return result._sum.amount ? result._sum.amount.toNumber() : 0;
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
      return result._sum.amount ? result._sum.amount.toNumber() : 0;
    } catch (error) {
      this.logger.warn('Could not get monthly revenue:', error);
      return 0;
    }
  }

  private async getRevenueGrowth(): Promise<number> {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const lastMonth = new Date(currentMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const [currentRevenue, lastMonthRevenue] = await Promise.all([
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            status: 'COMPLETED',
            createdAt: { gte: currentMonth },
          },
        }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            status: 'COMPLETED',
            createdAt: { gte: lastMonth, lt: currentMonth },
          },
        }),
      ]);

      const current = currentRevenue._sum.amount ? currentRevenue._sum.amount.toNumber() : 0;
      const last = lastMonthRevenue._sum.amount ? lastMonthRevenue._sum.amount.toNumber() : 0;

      return last > 0 ? ((current - last) / last) * 100 : 0;
    } catch (error) {
      this.logger.warn('Could not get revenue growth:', error);
      return 0;
    }
  }

  private async getAverageRevenuePerUser(): Promise<number> {
    try {
      const [totalRevenue, totalUsers] = await Promise.all([
        this.getTotalRevenue(),
        this.getTotalUsers(),
      ]);

      return totalUsers > 0 ? totalRevenue / totalUsers : 0;
    } catch (error) {
      this.logger.warn('Could not get average revenue per user:', error);
      return 0;
    }
  }

  private async getRevenueBySource() {
    try {
      // Bu değerler payment source'a göre gruplandırılabilir
      return [
        { source: 'Subscription', amount: 0, percentage: 0 },
        { source: 'One-time', amount: 0, percentage: 0 },
        { source: 'Premium', amount: 0, percentage: 0 },
      ];
    } catch (error) {
      this.logger.warn('Could not get revenue by source:', error);
      return [];
    }
  }

  private async getSubscriptionAnalytics() {
    try {
      const activeSubscriptions = await this.prisma.subscription.count({
        where: { status: 'ACTIVE' },
      });

      const newSubscriptions = await this.prisma.subscription.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });

      return {
        activeSubscriptions,
        newSubscriptions,
        churnRate: 0, // Bu değer hesaplanabilir
        lifetimeValue: 0, // Bu değer hesaplanabilir
      };
    } catch (error) {
      this.logger.warn('Could not get subscription analytics:', error);
      return {
        activeSubscriptions: 0,
        newSubscriptions: 0,
        churnRate: 0,
        lifetimeValue: 0,
      };
    }
  }

  private async getPaymentAnalytics() {
    try {
      const [totalPayments, successfulPayments, failedPayments, averageAmount] = await Promise.all([
        this.prisma.payment.count(),
        this.prisma.payment.count({ where: { status: 'COMPLETED' } }),
        this.prisma.payment.count({ where: { status: 'FAILED' } }),
        this.prisma.payment.aggregate({
          _avg: { amount: true },
          where: {},
        }),
      ]);

      return {
        totalPayments,
        successfulPayments,
        failedPayments,
        averagePaymentAmount: averageAmount._avg.amount ? averageAmount._avg.amount.toNumber() : 0,
      };
    } catch (error) {
      this.logger.warn('Could not get payment analytics:', error);
      return {
        totalPayments: 0,
        successfulPayments: 0,
        failedPayments: 0,
        averagePaymentAmount: 0,
      };
    }
  }

  private async getPerformanceAnalytics(): Promise<PerformanceAnalytics> {
    try {
      const [systemPerformance, userPerformance, contentPerformance] = await Promise.all([
        this.getSystemPerformance(),
        this.getUserPerformance(),
        this.getContentPerformance(),
      ]);

      return {
        systemPerformance,
        userPerformance,
        contentPerformance,
      };
    } catch (error) {
      this.logger.warn('Could not get performance analytics:', error);
      return {
        systemPerformance: {
          averageResponseTime: 0,
          uptime: 0,
          errorRate: 0,
          throughput: 0,
        },
        userPerformance: {
          averageLoginTime: 0,
          averagePageLoadTime: 0,
          mobileUsage: 0,
          desktopUsage: 0,
        },
        contentPerformance: {
          mostViewedContent: [],
          leastViewedContent: [],
        },
      };
    }
  }

  private async getSystemPerformance() {
    try {
      return {
        averageResponseTime: 0, // Bu değer system logs'tan alınabilir
        uptime: 0, // Bu değer system health'ten alınabilir
        errorRate: 0, // Bu değer error logs'tan alınabilir
        throughput: 0, // Bu değer system metrics'ten alınabilir
      };
    } catch (error) {
      this.logger.warn('Could not get system performance:', error);
      return {
        averageResponseTime: 0,
        uptime: 0,
        errorRate: 0,
        throughput: 0,
      };
    }
  }

  private async getUserPerformance() {
    try {
      return {
        averageLoginTime: 0, // Bu değer user sessions'tan alınabilir
        averagePageLoadTime: 0, // Bu değer analytics'ten alınabilir
        mobileUsage: 0, // Bu değer user agent'lardan alınabilir
        desktopUsage: 0, // Bu değer user agent'lardan alınabilir
      };
    } catch (error) {
      this.logger.warn('Could not get user performance:', error);
      return {
        averageLoginTime: 0,
        averagePageLoadTime: 0,
        mobileUsage: 0,
        desktopUsage: 0,
      };
    }
  }

  private async getContentPerformance() {
    try {
      return {
        mostViewedContent: [], // Bu değer content views'tan alınabilir
        leastViewedContent: [], // Bu değer content views'tan alınabilir
      };
    } catch (error) {
      this.logger.warn('Could not get content performance:', error);
      return {
        mostViewedContent: [],
        leastViewedContent: [],
      };
    }
  }

  private async getTrends() {
    try {
      const [userGrowth, revenueGrowth, engagementTrends] = await Promise.all([
        this.getUserGrowthTrend(),
        this.getRevenueGrowthTrend(),
        this.getEngagementTrends(),
      ]);

      return {
        userGrowth,
        revenueGrowth,
        engagementTrends,
      };
    } catch (error) {
      this.logger.warn('Could not get trends:', error);
      return {
        userGrowth: [],
        revenueGrowth: [],
        engagementTrends: [],
      };
    }
  }

  private async getUserGrowthTrend() {
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
      .map(([date, users]) => ({ date, users }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getRevenueGrowthTrend() {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: last12Months },
      },
      select: { amount: true, createdAt: true },
    });

    const monthlyRevenue = new Map<string, number>();
    
    payments.forEach(payment => {
      const month = payment.createdAt.toISOString().substring(0, 7);
      monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + payment.amount.toNumber());
    });

    return Array.from(monthlyRevenue.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getEngagementTrends() {
    // Bu değer user activity logs'tan hesaplanabilir
    return [];
  }

  private async getPredictions() {
    try {
      return {
        userGrowth: 0, // Bu değer ML modeli ile hesaplanabilir
        revenueProjection: 0, // Bu değer ML modeli ile hesaplanabilir
        churnPrediction: 0, // Bu değer ML modeli ile hesaplanabilir
        engagementForecast: 0, // Bu değer ML modeli ile hesaplanabilir
      };
    } catch (error) {
      this.logger.warn('Could not get predictions:', error);
      return {
        userGrowth: 0,
        revenueProjection: 0,
        churnPrediction: 0,
        engagementForecast: 0,
      };
    }
  }
}
