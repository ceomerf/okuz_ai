import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { AdvancedAnalyticsService, AdvancedAnalyticsData } from './advanced-analytics.service';

@Controller('analytics')
export class AdvancedAnalyticsController {
  constructor(private readonly advancedAnalyticsService: AdvancedAnalyticsService) {}

  @Get('advanced')
  async getAdvancedAnalytics(): Promise<AdvancedAnalyticsData> {
    try {
      return await this.advancedAnalyticsService.getAdvancedAnalytics();
    } catch (error) {
      throw new HttpException(
        'Failed to get advanced analytics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user-engagement')
  async getUserEngagement() {
    try {
      const data = await this.advancedAnalyticsService.getAdvancedAnalytics();
      return data.userEngagement;
    } catch (error) {
      throw new HttpException(
        'Failed to get user engagement metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('learning')
  async getLearningAnalytics() {
    try {
      const data = await this.advancedAnalyticsService.getAdvancedAnalytics();
      return data.learningAnalytics;
    } catch (error) {
      throw new HttpException(
        'Failed to get learning analytics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('revenue')
  async getRevenueAnalytics() {
    try {
      const data = await this.advancedAnalyticsService.getAdvancedAnalytics();
      return data.revenueAnalytics;
    } catch (error) {
      throw new HttpException(
        'Failed to get revenue analytics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('performance')
  async getPerformanceAnalytics() {
    try {
      const data = await this.advancedAnalyticsService.getAdvancedAnalytics();
      return data.performanceAnalytics;
    } catch (error) {
      throw new HttpException(
        'Failed to get performance analytics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('trends')
  async getTrends() {
    try {
      const data = await this.advancedAnalyticsService.getAdvancedAnalytics();
      return data.trends;
    } catch (error) {
      throw new HttpException(
        'Failed to get trends',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('predictions')
  async getPredictions() {
    try {
      const data = await this.advancedAnalyticsService.getAdvancedAnalytics();
      return data.predictions;
    } catch (error) {
      throw new HttpException(
        'Failed to get predictions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
