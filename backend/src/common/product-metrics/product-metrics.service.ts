import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AnalyticsService } from '../analytics/analytics.service';

export interface ProductMetrics {
  // User Metrics
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  churnedUsers: number;
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
  };

  // Engagement Metrics
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  sessionsPerUser: number;

  // Conversion Metrics
  registrationToPlanConversion: number;
  planToSubscriptionConversion: number;
  freeToPaidConversion: number;
  conversionFunnel: {
    step: string;
    users: number;
    conversionRate: number;
  }[];

  // Feature Usage
  featureAdoption: {
    feature: string;
    users: number;
    adoptionRate: number;
  }[];

  // Revenue Metrics
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  averageRevenuePerUser: number;
  customerLifetimeValue: number;

  // Product Health
  netPromoterScore: number;
  customerSatisfaction: number;
  supportTicketVolume: number;
  bugReportVolume: number;
}

@Injectable()
export class ProductMetricsService {
  private readonly logger = new Logger(ProductMetricsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * Get comprehensive product metrics
   */
  async getProductMetrics(dateRange: { start: Date; end: Date }): Promise<ProductMetrics> {
    try {
      const [
        userMetrics,
        engagementMetrics,
        conversionMetrics,
        featureMetrics,
        revenueMetrics,
        healthMetrics,
      ] = await Promise.all([
        this.getUserMetrics(dateRange),
        this.getEngagementMetrics(dateRange),
        this.getConversionMetrics(dateRange),
        this.getFeatureMetrics(dateRange),
        this.getRevenueMetrics(dateRange),
        this.getHealthMetrics(dateRange),
      ]);

      return {
        ...userMetrics,
        ...engagementMetrics,
        ...conversionMetrics,
        ...featureMetrics,
        ...revenueMetrics,
        ...healthMetrics,
        // Ensure all required fields have default values
        totalUsers: userMetrics.totalUsers || 0,
        activeUsers: userMetrics.activeUsers || 0,
        newUsers: userMetrics.newUsers || 0,
        churnedUsers: userMetrics.churnedUsers || 0,
        userRetention: userMetrics.userRetention || { day1: 0, day7: 0, day30: 0 },
        dailyActiveUsers: engagementMetrics.dailyActiveUsers || 0,
        weeklyActiveUsers: engagementMetrics.weeklyActiveUsers || 0,
        monthlyActiveUsers: engagementMetrics.monthlyActiveUsers || 0,
        averageSessionDuration: engagementMetrics.averageSessionDuration || 0,
        sessionsPerUser: engagementMetrics.sessionsPerUser || 0,
        registrationToPlanConversion: conversionMetrics.registrationToPlanConversion || 0,
        planToSubscriptionConversion: conversionMetrics.planToSubscriptionConversion || 0,
        freeToPaidConversion: conversionMetrics.freeToPaidConversion || 0,
        conversionFunnel: conversionMetrics.conversionFunnel || [],
        featureAdoption: featureMetrics.featureAdoption || [],
        monthlyRecurringRevenue: revenueMetrics.monthlyRecurringRevenue || 0,
        annualRecurringRevenue: revenueMetrics.annualRecurringRevenue || 0,
        averageRevenuePerUser: revenueMetrics.averageRevenuePerUser || 0,
        customerLifetimeValue: revenueMetrics.customerLifetimeValue || 0,
        netPromoterScore: healthMetrics.netPromoterScore || 0,
        customerSatisfaction: healthMetrics.customerSatisfaction || 0,
        supportTicketVolume: healthMetrics.supportTicketVolume || 0,
        bugReportVolume: healthMetrics.bugReportVolume || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get product metrics: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get user metrics
   */
  private async getUserMetrics(dateRange: { start: Date; end: Date }): Promise<Partial<ProductMetrics>> {
    return this.databaseService.executeRead(async (readClient) => {
      const [
        totalUsers,
        activeUsers,
        newUsers,
        churnedUsers,
        retentionData,
      ] = await Promise.all([
        readClient.user.count(),
        readClient.user.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
        readClient.user.count({
          where: {
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
        }),
        readClient.user.count({
          where: {
            updatedAt: {
              lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Inactive for 30+ days
            },
          },
        }),
        this.calculateRetention(readClient, dateRange),
      ]);

      return {
        totalUsers,
        activeUsers,
        newUsers,
        churnedUsers,
        userRetention: retentionData,
      };
    });
  }

  /**
   * Get engagement metrics
   */
  private async getEngagementMetrics(dateRange: { start: Date; end: Date }): Promise<Partial<ProductMetrics>> {
    return this.databaseService.executeRead(async (readClient) => {
      const [
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers,
        sessionData,
      ] = await Promise.all([
        readClient.user.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
        readClient.user.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        }),
        readClient.user.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
        readClient.studySession.aggregate({
          where: {
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
          _avg: {
            duration: true,
          },
          _count: {
            id: true,
          },
        }),
      ]);

      const totalSessions = sessionData._count.id;
      const averageSessionDuration = sessionData._avg.duration || 0;
      const sessionsPerUser = totalSessions / Math.max(monthlyActiveUsers, 1);

      return {
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers,
        averageSessionDuration,
        sessionsPerUser,
      };
    });
  }

  /**
   * Get conversion metrics
   */
  private async getConversionMetrics(dateRange: { start: Date; end: Date }): Promise<Partial<ProductMetrics>> {
    return this.databaseService.executeRead(async (readClient) => {
      const [
        totalRegistrations,
        usersWithPlans,
        usersWithSubscriptions,
        paidUsers,
        funnelData,
      ] = await Promise.all([
        readClient.user.count({
          where: {
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
        }),
        readClient.user.count({
          where: {
            plans: {
              some: {},
            },
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
        }),
        readClient.user.count({
          where: {
            subscriptionStatus: {
              not: 'FREE',
            },
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
        }),
        readClient.user.count({
          where: {
            subscriptionStatus: {
              in: ['PREMIUM'],
            },
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
        }),
        this.calculateConversionFunnel(readClient, dateRange),
      ]);

      return {
        registrationToPlanConversion: totalRegistrations > 0 ? (usersWithPlans / totalRegistrations) * 100 : 0,
        planToSubscriptionConversion: usersWithPlans > 0 ? (usersWithSubscriptions / usersWithPlans) * 100 : 0,
        freeToPaidConversion: totalRegistrations > 0 ? (paidUsers / totalRegistrations) * 100 : 0,
        conversionFunnel: funnelData,
      };
    });
  }

  /**
   * Get feature usage metrics
   */
  private async getFeatureMetrics(dateRange: { start: Date; end: Date }): Promise<Partial<ProductMetrics>> {
    // This would typically query analytics data
    // For now, return mock data
    return {
      featureAdoption: [
        { feature: 'smart_tools', users: 1500, adoptionRate: 75 },
        { feature: 'ai_coaching', users: 800, adoptionRate: 40 },
        { feature: 'analytics', users: 1200, adoptionRate: 60 },
        { feature: 'collaboration', users: 600, adoptionRate: 30 },
      ],
    };
  }

  /**
   * Get revenue metrics
   */
  private async getRevenueMetrics(dateRange: { start: Date; end: Date }): Promise<Partial<ProductMetrics>> {
    return this.databaseService.executeRead(async (readClient) => {
      const [
        totalRevenue,
        paidUsers,
        averageRevenue,
      ] = await Promise.all([
        readClient.subscription.count({
          where: {
            status: 'PREMIUM',
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          },
        }),
        readClient.user.count({
          where: {
            subscriptionStatus: {
              in: ['PREMIUM'],
            },
          },
        }),
        readClient.subscription.count({
          where: {
            status: 'PREMIUM',
          },
        }),
      ]);

      const monthlyRevenue = totalRevenue * 99; // Assuming 99 per subscription
      const annualRevenue = monthlyRevenue * 12;
      const averageRevenuePerUser = paidUsers > 0 ? monthlyRevenue / paidUsers : 0;
      const customerLifetimeValue = averageRevenuePerUser * 12; // Simplified calculation

      return {
        monthlyRecurringRevenue: monthlyRevenue,
        annualRecurringRevenue: annualRevenue,
        averageRevenuePerUser,
        customerLifetimeValue,
      };
    });
  }

  /**
   * Get product health metrics
   */
  private async getHealthMetrics(dateRange: { start: Date; end: Date }): Promise<Partial<ProductMetrics>> {
    // This would typically query support and feedback data
    // For now, return mock data
    return {
      netPromoterScore: 8.5,
      customerSatisfaction: 4.2,
      supportTicketVolume: 45,
      bugReportVolume: 12,
    };
  }

  /**
   * Calculate user retention
   */
  private async calculateRetention(readClient: any, dateRange: { start: Date; end: Date }): Promise<{
    day1: number;
    day7: number;
    day30: number;
  }> {
    // Simplified retention calculation
    // In a real implementation, this would be more complex
    return {
      day1: 85,
      day7: 65,
      day30: 45,
    };
  }

  /**
   * Calculate conversion funnel
   */
  private async calculateConversionFunnel(readClient: any, dateRange: { start: Date; end: Date }): Promise<{
    step: string;
    users: number;
    conversionRate: number;
  }[]> {
    const steps = [
      { step: 'registration', users: 1000, conversionRate: 100 },
      { step: 'first_login', users: 850, conversionRate: 85 },
      { step: 'plan_created', users: 600, conversionRate: 60 },
      { step: 'first_session', users: 450, conversionRate: 45 },
      { step: 'subscription', users: 200, conversionRate: 20 },
    ];

    return steps;
  }

  /**
   * Get metrics for a specific user segment
   */
  async getSegmentMetrics(segment: string, dateRange: { start: Date; end: Date }): Promise<Partial<ProductMetrics>> {
    // This would filter metrics by user segment
    // For now, return the same metrics
    return this.getProductMetrics(dateRange);
  }

  /**
   * Get metrics comparison between periods
   */
  async getMetricsComparison(
    currentPeriod: { start: Date; end: Date },
    previousPeriod: { start: Date; end: Date }
  ): Promise<{
    current: ProductMetrics;
    previous: ProductMetrics;
    changes: Record<string, { absolute: number; percentage: number }>;
  }> {
    const [current, previous] = await Promise.all([
      this.getProductMetrics(currentPeriod),
      this.getProductMetrics(previousPeriod),
    ]);

    const changes: Record<string, { absolute: number; percentage: number }> = {};

    // Calculate changes for key metrics
    const metrics = ['totalUsers', 'activeUsers', 'monthlyRecurringRevenue', 'averageSessionDuration'];
    
    for (const metric of metrics) {
      const currentValue = current[metric as keyof ProductMetrics] as number;
      const previousValue = previous[metric as keyof ProductMetrics] as number;
      
      if (typeof currentValue === 'number' && typeof previousValue === 'number') {
        const absolute = currentValue - previousValue;
        const percentage = previousValue > 0 ? (absolute / previousValue) * 100 : 0;
        
        changes[metric] = { absolute, percentage };
      }
    }

    return { current, previous, changes };
  }
}
