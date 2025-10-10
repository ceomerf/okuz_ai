import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata: any;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  duration?: number;
}

export interface ActivitySummary {
  totalActivities: number;
  uniqueUsers: number;
  mostActiveUsers: {
    userId: string;
    userName: string;
    activityCount: number;
  }[];
  mostCommonActions: {
    action: string;
    count: number;
  }[];
  activityByHour: { hour: number; count: number }[];
  activityByDay: { date: string; count: number }[];
}

export interface UserActivityAnalytics {
  userId: string;
  totalActivities: number;
  lastActivity: string;
  activityTypes: {
    login: number;
    logout: number;
    pageView: number;
    action: number;
    error: number;
  };
  sessionAnalytics: {
    totalSessions: number;
    averageSessionDuration: number;
    longestSession: number;
    shortestSession: number;
  };
  deviceAnalytics: {
    desktop: number;
    mobile: number;
    tablet: number;
    unknown: number;
  };
  locationAnalytics: {
    country?: string;
    city?: string;
    region?: string;
  };
  behaviorPatterns: {
    peakHours: number[];
    mostActiveDays: string[];
    averageActivitiesPerDay: number;
  };
}

export interface ActivityFilter {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class UserActivityTrackingService {
  private readonly logger = new Logger(UserActivityTrackingService.name);

  constructor(private prisma: PrismaService) {}

  async trackActivity(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<void> {
    try {
      await this.prisma.userActivity.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          metadata,
          ipAddress,
          userAgent,
          sessionId,
          timestamp: new Date(),
        },
      });

      this.logger.log(`Activity tracked: ${action} by user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to track activity:', error);
      throw error;
    }
  }

  async getUserActivities(filter: ActivityFilter): Promise<UserActivity[]> {
    try {
      const where: any = {};

      if (filter.userId) where.userId = filter.userId;
      if (filter.action) where.action = filter.action;
      if (filter.resource) where.resource = filter.resource;
      if (filter.startDate || filter.endDate) {
        where.timestamp = {};
        if (filter.startDate) where.timestamp.gte = new Date(filter.startDate);
        if (filter.endDate) where.timestamp.lte = new Date(filter.endDate);
      }

      const activities = await this.prisma.userActivity.findMany({
        where,
        take: filter.limit || 100,
        skip: filter.offset || 0,
        orderBy: { timestamp: 'desc' },
      });

      return activities.map(activity => ({
        id: activity.id,
        userId: activity.userId,
        action: activity.action,
        resource: activity.resource,
        resourceId: activity.resourceId,
        metadata: activity.metadata,
        timestamp: activity.timestamp.toISOString(),
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
        sessionId: activity.sessionId,
        duration: activity.duration,
      }));
    } catch (error) {
      this.logger.error('Failed to get user activities:', error);
      throw error;
    }
  }

  async getActivitySummary(period: 'day' | 'week' | 'month' | 'year' = 'day'): Promise<ActivitySummary> {
    try {
      const startDate = this.getStartDate(period);
      
      const [
        totalActivities,
        uniqueUsers,
        mostActiveUsers,
        mostCommonActions,
        activityByHour,
        activityByDay,
      ] = await Promise.all([
        this.getTotalActivities(startDate),
        this.getUniqueUsers(startDate),
        this.getMostActiveUsers(startDate),
        this.getMostCommonActions(startDate),
        this.getActivityByHour(startDate),
        this.getActivityByDay(startDate, period),
      ]);

      return {
        totalActivities,
        uniqueUsers,
        mostActiveUsers,
        mostCommonActions,
        activityByHour,
        activityByDay,
      };
    } catch (error) {
      this.logger.error('Failed to get activity summary:', error);
      throw error;
    }
  }

  private getStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private async getTotalActivities(startDate: Date): Promise<number> {
    try {
      return await this.prisma.userActivity.count({
        where: { timestamp: { gte: startDate } },
      });
    } catch (error) {
      this.logger.warn('Could not get total activities:', error);
      return 0;
    }
  }

  private async getUniqueUsers(startDate: Date): Promise<number> {
    try {
      const result = await this.prisma.userActivity.groupBy({
        by: ['userId'],
        where: { timestamp: { gte: startDate } },
      });
      return result.length;
    } catch (error) {
      this.logger.warn('Could not get unique users:', error);
      return 0;
    }
  }

  private async getMostActiveUsers(startDate: Date) {
    try {
      const result = await this.prisma.userActivity.groupBy({
        by: ['userId'],
        where: { timestamp: { gte: startDate } },
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

      return result.map(activity => {
        const user = users.find(u => u.id === activity.userId);
        return {
          userId: activity.userId,
          userName: user?.name || 'Unknown',
          activityCount: activity._count.id,
        };
      });
    } catch (error) {
      this.logger.warn('Could not get most active users:', error);
      return [];
    }
  }

  private async getMostCommonActions(startDate: Date) {
    try {
      const result = await this.prisma.userActivity.groupBy({
        by: ['action'],
        where: { timestamp: { gte: startDate } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      return result.map(action => ({
        action: action.action,
        count: action._count.id,
      }));
    } catch (error) {
      this.logger.warn('Could not get most common actions:', error);
      return [];
    }
  }

  private async getActivityByHour(startDate: Date) {
    try {
      const activities = await this.prisma.userActivity.findMany({
        where: { timestamp: { gte: startDate } },
        select: { timestamp: true },
      });

      const hourlyCounts = new Map<number, number>();
      
      activities.forEach(activity => {
        const hour = activity.timestamp.getHours();
        hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1);
      });

      return Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: hourlyCounts.get(hour) || 0,
      }));
    } catch (error) {
      this.logger.warn('Could not get activity by hour:', error);
      return Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
    }
  }

  private async getActivityByDay(startDate: Date, period: string) {
    try {
      const activities = await this.prisma.userActivity.findMany({
        where: { timestamp: { gte: startDate } },
        select: { timestamp: true },
      });

      const dailyCounts = new Map<string, number>();
      
      activities.forEach(activity => {
        const date = activity.timestamp.toISOString().split('T')[0];
        dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
      });

      return Array.from(dailyCounts.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      this.logger.warn('Could not get activity by day:', error);
      return [];
    }
  }

  async getUserActivityAnalytics(userId: string): Promise<UserActivityAnalytics> {
    try {
      const [
        totalActivities,
        lastActivity,
        activityTypes,
        sessionAnalytics,
        deviceAnalytics,
        locationAnalytics,
        behaviorPatterns,
      ] = await Promise.all([
        this.getUserTotalActivities(userId),
        this.getUserLastActivity(userId),
        this.getUserActivityTypes(userId),
        this.getUserSessionAnalytics(userId),
        this.getUserDeviceAnalytics(userId),
        this.getUserLocationAnalytics(userId),
        this.getUserBehaviorPatterns(userId),
      ]);

      return {
        userId,
        totalActivities,
        lastActivity,
        activityTypes,
        sessionAnalytics,
        deviceAnalytics,
        locationAnalytics,
        behaviorPatterns,
      };
    } catch (error) {
      this.logger.error('Failed to get user activity analytics:', error);
      throw error;
    }
  }

  private async getUserTotalActivities(userId: string): Promise<number> {
    try {
      return await this.prisma.userActivity.count({
        where: { userId },
      });
    } catch (error) {
      this.logger.warn('Could not get user total activities:', error);
      return 0;
    }
  }

  private async getUserLastActivity(userId: string): Promise<string> {
    try {
      const lastActivity = await this.prisma.userActivity.findFirst({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      });

      return lastActivity?.timestamp.toISOString() || '';
    } catch (error) {
      this.logger.warn('Could not get user last activity:', error);
      return '';
    }
  }

  private async getUserActivityTypes(userId: string) {
    try {
      const [login, logout, pageView, action, error] = await Promise.all([
        this.prisma.userActivity.count({ where: { userId, action: 'login' } }),
        this.prisma.userActivity.count({ where: { userId, action: 'logout' } }),
        this.prisma.userActivity.count({ where: { userId, action: 'page_view' } }),
        this.prisma.userActivity.count({ where: { userId, action: { not: { in: ['login', 'logout', 'page_view', 'error'] } } } }),
        this.prisma.userActivity.count({ where: { userId, action: 'error' } }),
      ]);

      return { login, logout, pageView, action, error };
    } catch (error) {
      this.logger.warn('Could not get user activity types:', error);
      return { login: 0, logout: 0, pageView: 0, action: 0, error: 0 };
    }
  }

  private async getUserSessionAnalytics(userId: string) {
    try {
      const sessions = await this.prisma.userActivity.findMany({
        where: { userId, sessionId: { not: null } },
        select: { sessionId: true, timestamp: true, duration: true },
        orderBy: { timestamp: 'asc' },
      });

      const sessionGroups = new Map<string, any[]>();
      sessions.forEach(session => {
        if (session.sessionId) {
          if (!sessionGroups.has(session.sessionId)) {
            sessionGroups.set(session.sessionId, []);
          }
          sessionGroups.get(session.sessionId)!.push(session);
        }
      });

      const sessionDurations = Array.from(sessionGroups.values()).map(session => {
        if (session.length === 0) return 0;
        const start = session[0].timestamp;
        const end = session[session.length - 1].timestamp;
        return end.getTime() - start.getTime();
      });

      const totalSessions = sessionGroups.size;
      const averageSessionDuration = sessionDurations.length > 0 
        ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length 
        : 0;
      const longestSession = sessionDurations.length > 0 ? Math.max(...sessionDurations) : 0;
      const shortestSession = sessionDurations.length > 0 ? Math.min(...sessionDurations) : 0;

      return {
        totalSessions,
        averageSessionDuration,
        longestSession,
        shortestSession,
      };
    } catch (error) {
      this.logger.warn('Could not get user session analytics:', error);
      return {
        totalSessions: 0,
        averageSessionDuration: 0,
        longestSession: 0,
        shortestSession: 0,
      };
    }
  }

  private async getUserDeviceAnalytics(userId: string) {
    try {
      const activities = await this.prisma.userActivity.findMany({
        where: { userId, userAgent: { not: null } },
        select: { userAgent: true },
      });

      let desktop = 0;
      let mobile = 0;
      let tablet = 0;
      let unknown = 0;

      activities.forEach(activity => {
        const userAgent = activity.userAgent?.toLowerCase() || '';
        if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
          mobile++;
        } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
          tablet++;
        } else if (userAgent.includes('windows') || userAgent.includes('macintosh') || userAgent.includes('linux')) {
          desktop++;
        } else {
          unknown++;
        }
      });

      return { desktop, mobile, tablet, unknown };
    } catch (error) {
      this.logger.warn('Could not get user device analytics:', error);
      return { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
    }
  }

  private async getUserLocationAnalytics(userId: string) {
    try {
      // Bu değerler IP adresinden hesaplanabilir
      return {
        country: undefined,
        city: undefined,
        region: undefined,
      };
    } catch (error) {
      this.logger.warn('Could not get user location analytics:', error);
      return {
        country: undefined,
        city: undefined,
        region: undefined,
      };
    }
  }

  private async getUserBehaviorPatterns(userId: string) {
    try {
      const activities = await this.prisma.userActivity.findMany({
        where: { userId },
        select: { timestamp: true },
      });

      const hourlyCounts = new Map<number, number>();
      const dailyCounts = new Map<string, number>();

      activities.forEach(activity => {
        const hour = activity.timestamp.getHours();
        const day = activity.timestamp.toISOString().split('T')[0];
        
        hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1);
        dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
      });

      const peakHours = Array.from(hourlyCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour]) => hour);

      const mostActiveDays = Array.from(dailyCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([day]) => day);

      const averageActivitiesPerDay = activities.length / Math.max(dailyCounts.size, 1);

      return {
        peakHours,
        mostActiveDays,
        averageActivitiesPerDay,
      };
    } catch (error) {
      this.logger.warn('Could not get user behavior patterns:', error);
      return {
        peakHours: [],
        mostActiveDays: [],
        averageActivitiesPerDay: 0,
      };
    }
  }

  async trackPageView(
    userId: string,
    page: string,
    referrer?: string,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<void> {
    await this.trackActivity(
      userId,
      'page_view',
      'page',
      page,
      { referrer },
      ipAddress,
      userAgent,
      sessionId
    );
  }

  async trackUserAction(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<void> {
    await this.trackActivity(
      userId,
      action,
      resource,
      resourceId,
      metadata,
      ipAddress,
      userAgent,
      sessionId
    );
  }

  async trackError(
    userId: string,
    error: string,
    stack?: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<void> {
    await this.trackActivity(
      userId,
      'error',
      'error',
      undefined,
      { error, stack, ...metadata },
      ipAddress,
      userAgent,
      sessionId
    );
  }

  async trackLogin(
    userId: string,
    method: string = 'password',
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<void> {
    await this.trackActivity(
      userId,
      'login',
      'auth',
      undefined,
      { method },
      ipAddress,
      userAgent,
      sessionId
    );
  }

  async trackLogout(
    userId: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.trackActivity(
      userId,
      'logout',
      'auth',
      undefined,
      {},
      ipAddress,
      userAgent,
      sessionId
    );
  }
}
