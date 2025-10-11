import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProductMetricsService } from '../common/product-metrics/product-metrics.service';
import { ABTestingService } from '../common/ab-testing/ab-testing.service';
import { FeatureFlagsService } from '../common/feature-flags/feature-flags.service';
import { AnalyticsService } from '../common/analytics/analytics.service';

@ApiTags('Product Dashboard')
@Controller('product-dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class ProductDashboardController {
  constructor(
    private readonly productMetricsService: ProductMetricsService,
    private readonly abTestingService: ABTestingService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get comprehensive product metrics' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO string)' })
  @ApiResponse({ status: 200, description: 'Product metrics data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getProductMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date(),
    };

    return this.productMetricsService.getProductMetrics(dateRange);
  }

  @Get('metrics/comparison')
  @ApiOperation({ summary: 'Get metrics comparison between periods' })
  @ApiQuery({ name: 'currentStart', required: true, type: String })
  @ApiQuery({ name: 'currentEnd', required: true, type: String })
  @ApiQuery({ name: 'previousStart', required: true, type: String })
  @ApiQuery({ name: 'previousEnd', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Metrics comparison data' })
  async getMetricsComparison(
    @Query('currentStart') currentStart: string,
    @Query('currentEnd') currentEnd: string,
    @Query('previousStart') previousStart: string,
    @Query('previousEnd') previousEnd: string,
  ) {
    const currentPeriod = {
      start: new Date(currentStart),
      end: new Date(currentEnd),
    };
    const previousPeriod = {
      start: new Date(previousStart),
      end: new Date(previousEnd),
    };

    return this.productMetricsService.getMetricsComparison(currentPeriod, previousPeriod);
  }

  @Get('feature-flags')
  @ApiOperation({ summary: 'Get all feature flags and their status' })
  @ApiResponse({ status: 200, description: 'Feature flags data' })
  async getFeatureFlags() {
    const flags = await this.featureFlagsService.getAllFeatureFlags();
    return {
      flags,
      total: flags.length,
      enabled: flags.filter(f => f.enabled).length,
      disabled: flags.filter(f => !f.enabled).length,
    };
  }

  @Get('feature-flags/:key/stats')
  @ApiOperation({ summary: 'Get feature flag statistics' })
  @ApiResponse({ status: 200, description: 'Feature flag statistics' })
  async getFeatureFlagStats(@Query('key') key: string) {
    return this.featureFlagsService.getFeatureFlagStats(key);
  }

  @Get('ab-tests')
  @ApiOperation({ summary: 'Get all A/B tests' })
  @ApiResponse({ status: 200, description: 'A/B tests data' })
  async getABTests() {
    // This would typically return all A/B tests
    // For now, return mock data
    return {
      tests: [
        {
          id: 'test_1',
          name: 'AI Coaching Feature Test',
          status: 'running',
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          variants: ['control', 'treatment'],
          participants: 1250,
        },
      ],
      total: 1,
      running: 1,
      completed: 0,
    };
  }

  @Get('ab-tests/:testId/results')
  @ApiOperation({ summary: 'Get A/B test results' })
  @ApiResponse({ status: 200, description: 'A/B test results' })
  async getABTestResults(@Query('testId') testId: string) {
    return this.abTestingService.getABTestResults(testId);
  }

  @Get('conversion-funnel')
  @ApiOperation({ summary: 'Get conversion funnel analysis' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Conversion funnel data' })
  async getConversionFunnel(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date(),
    };

    const metrics = await this.productMetricsService.getProductMetrics(dateRange);
    return {
      funnel: metrics.conversionFunnel,
      overallConversion: metrics.freeToPaidConversion,
      dropOffPoints: this.analyzeDropOffPoints(metrics.conversionFunnel),
    };
  }

  @Get('user-segments')
  @ApiOperation({ summary: 'Get user segmentation analysis' })
  @ApiResponse({ status: 200, description: 'User segments data' })
  async getUserSegments() {
    return {
      segments: [
        {
          name: 'new_users',
          description: 'Users registered in the last 7 days',
          count: 450,
          growth: 12.5,
        },
        {
          name: 'active_users',
          description: 'Users active in the last 30 days',
          count: 1200,
          growth: 8.3,
        },
        {
          name: 'premium_users',
          description: 'Users with active premium subscription',
          count: 300,
          growth: 15.2,
        },
        {
          name: 'churned_users',
          description: 'Users inactive for 30+ days',
          count: 150,
          growth: -5.1,
        },
      ],
      totalSegments: 4,
      totalUsers: 2100,
    };
  }

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get analytics summary' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Analytics summary' })
  async getAnalyticsSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date(),
    };

    return this.analyticsService.getAnalyticsSummary(dateRange);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Get key performance indicators' })
  @ApiResponse({ status: 200, description: 'KPI data' })
  async getKPIs() {
    const metrics = await this.productMetricsService.getProductMetrics({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    });

    return {
      kpis: [
        {
          name: 'Monthly Active Users',
          value: metrics.monthlyActiveUsers,
          target: 5000,
          status: metrics.monthlyActiveUsers >= 5000 ? 'achieved' : 'pending',
          trend: 12.5,
        },
        {
          name: 'Monthly Recurring Revenue',
          value: metrics.monthlyRecurringRevenue,
          target: 50000,
          status: metrics.monthlyRecurringRevenue >= 50000 ? 'achieved' : 'pending',
          trend: 8.3,
        },
        {
          name: 'User Retention (Day 7)',
          value: metrics.userRetention.day7,
          target: 70,
          status: metrics.userRetention.day7 >= 70 ? 'achieved' : 'pending',
          trend: 5.2,
        },
        {
          name: 'Conversion Rate',
          value: metrics.freeToPaidConversion,
          target: 15,
          status: metrics.freeToPaidConversion >= 15 ? 'achieved' : 'pending',
          trend: 3.1,
        },
      ],
      overallHealth: this.calculateOverallHealth(metrics),
    };
  }

  private analyzeDropOffPoints(funnel: any[]): Array<{
    step: string;
    dropOffRate: number;
    usersLost: number;
  }> {
    const dropOffs = [];
    for (let i = 1; i < funnel.length; i++) {
      const current = funnel[i];
      const previous = funnel[i - 1];
      const dropOffRate = ((previous.users - current.users) / previous.users) * 100;
      dropOffs.push({
        step: current.step,
        dropOffRate,
        usersLost: previous.users - current.users,
      });
    }
    return dropOffs;
  }

  private calculateOverallHealth(metrics: any): {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    recommendations: string[];
  } {
    let score = 0;
    const recommendations = [];

    // Score based on key metrics
    if (metrics.monthlyActiveUsers >= 1000) score += 25;
    if (metrics.userRetention.day7 >= 60) score += 25;
    if (metrics.freeToPaidConversion >= 10) score += 25;
    if (metrics.monthlyRecurringRevenue >= 10000) score += 25;

    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) status = 'excellent';
    else if (score >= 70) status = 'good';
    else if (score >= 50) status = 'fair';
    else status = 'poor';

    // Generate recommendations
    if (metrics.userRetention.day7 < 60) {
      recommendations.push('Improve user onboarding to increase 7-day retention');
    }
    if (metrics.freeToPaidConversion < 10) {
      recommendations.push('Optimize conversion funnel to increase paid conversions');
    }
    if (metrics.monthlyActiveUsers < 1000) {
      recommendations.push('Focus on user acquisition and engagement');
    }

    return { score, status, recommendations };
  }
}
