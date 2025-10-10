import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { FeatureFlagsService, FeatureFlagDashboard, FeatureFlag, FeatureFlagEvaluation, FeatureFlagUsage } from './feature-flags.service';

@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get('dashboard')
  async getFeatureFlagDashboard(): Promise<FeatureFlagDashboard> {
    try {
      return await this.featureFlagsService.getFeatureFlagDashboard();
    } catch (error) {
      throw new HttpException(
        'Failed to get feature flag dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createFeatureFlag(@Body() flagData: {
    name: string;
    key: string;
    description: string;
    isEnabled: boolean;
    rolloutPercentage: number;
    targetUsers?: string[];
    targetRoles?: string[];
    targetSegments?: string[];
    conditions?: any[];
    environment: 'development' | 'staging' | 'production';
    createdBy: string;
  }): Promise<FeatureFlag> {
    try {
      return await this.featureFlagsService.createFeatureFlag(flagData);
    } catch (error) {
      throw new HttpException(
        'Failed to create feature flag',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      const dashboard = await this.featureFlagsService.getFeatureFlagDashboard();
      return dashboard.flags;
    } catch (error) {
      throw new HttpException(
        'Failed to get feature flags',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':flagId')
  async getFeatureFlag(@Param('flagId') flagId: string): Promise<FeatureFlag | null> {
    try {
      const dashboard = await this.featureFlagsService.getFeatureFlagDashboard();
      return dashboard.flags.find(flag => flag.id === flagId) || null;
    } catch (error) {
      throw new HttpException(
        'Failed to get feature flag',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':flagId')
  async updateFeatureFlag(
    @Param('flagId') flagId: string,
    @Body() flagData: Partial<FeatureFlag> & { updatedBy: string }
  ): Promise<FeatureFlag> {
    try {
      return await this.featureFlagsService.updateFeatureFlag(flagId, flagData, flagData.updatedBy);
    } catch (error) {
      throw new HttpException(
        'Failed to update feature flag',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':flagId')
  async deleteFeatureFlag(@Param('flagId') flagId: string): Promise<void> {
    try {
      await this.featureFlagsService.deleteFeatureFlag(flagId);
    } catch (error) {
      throw new HttpException(
        'Failed to delete feature flag',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('evaluate')
  async evaluateFeatureFlag(@Body() evaluationData: {
    flagKey: string;
    userId: string;
    userContext?: {
      role?: string;
      segment?: string;
      attributes?: Record<string, any>;
    };
  }): Promise<FeatureFlagEvaluation> {
    try {
      return await this.featureFlagsService.evaluateFeatureFlag(
        evaluationData.flagKey,
        evaluationData.userId,
        evaluationData.userContext
      );
    } catch (error) {
      throw new HttpException(
        'Failed to evaluate feature flag',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('usage/:flagKey')
  async getFeatureFlagUsage(@Param('flagKey') flagKey: string): Promise<FeatureFlagUsage | null> {
    try {
      return await this.featureFlagsService.getFeatureFlagUsage(flagKey);
    } catch (error) {
      throw new HttpException(
        'Failed to get feature flag usage',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cache/clear')
  async clearCache(): Promise<void> {
    try {
      await this.featureFlagsService.clearCache();
    } catch (error) {
      throw new HttpException(
        'Failed to clear cache',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}