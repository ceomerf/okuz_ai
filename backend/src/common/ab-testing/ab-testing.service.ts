import { Injectable, Logger } from '@nestjs/common';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { AnalyticsService } from '../analytics/analytics.service';

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: Date;
  endDate: Date;
  variants: {
    name: string;
    weight: number;
    configuration: Record<string, any>;
  }[];
  targetSegments: string[];
  successMetrics: string[];
  hypothesis: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ABTestResult {
  testId: string;
  variant: string;
  users: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
  statisticalSignificance: boolean;
}

@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);

  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * Create a new A/B test
   */
  async createABTest(testData: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ABTest> {
    const test: ABTest = {
      id: this.generateTestId(),
      ...testData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create feature flags for each variant
    for (const variant of test.variants) {
      await this.featureFlagsService.createFeatureFlag({
        key: `${test.id}_${variant.name}`,
        name: `${test.name} - ${variant.name}`,
        description: `A/B test variant for ${test.name}`,
        enabled: test.status === 'running',
        rolloutPercentage: variant.weight,
        targetUsers: [],
        targetRoles: [],
        targetSegments: test.targetSegments,
        conditions: variant.configuration,
      });
    }

    this.logger.log(`A/B test created: ${test.id}`);
    return test;
  }

  /**
   * Get user's variant for a test
   */
  async getUserVariant(testId: string, userId: string, userRole: string, userSegments: string[]): Promise<{
    variant: string;
    testId: string;
    isParticipant: boolean;
  }> {
    try {
      const test = await this.getABTest(testId);
      if (!test || test.status !== 'running') {
        return { variant: 'control', testId, isParticipant: false };
      }

      // Check if user is in target segments
      if (test.targetSegments.length > 0 && !test.targetSegments.some(segment => userSegments.includes(segment))) {
        return { variant: 'control', testId, isParticipant: false };
      }

      // Determine variant based on user hash
      const userHash = this.hashUserId(userId);
      const totalWeight = test.variants.reduce((sum, v) => sum + v.weight, 0);
      let cumulativeWeight = 0;

      for (const variant of test.variants) {
        cumulativeWeight += variant.weight;
        if (userHash % totalWeight < cumulativeWeight) {
          return { variant: variant.name, testId, isParticipant: true };
        }
      }

      return { variant: 'control', testId, isParticipant: false };
    } catch (error) {
      this.logger.error(`Failed to get user variant for test ${testId}: ${(error as Error).message}`);
      return { variant: 'control', testId, isParticipant: false };
    }
  }

  /**
   * Track A/B test conversion
   */
  async trackConversion(
    testId: string,
    userId: string,
    variant: string,
    conversionEvent: string,
    value?: number
  ): Promise<void> {
    try {
      await this.analyticsService.trackEvent('ab_test_conversion', userId, {
        test_id: testId,
        variant,
        conversion_event: conversionEvent,
        value,
        conversion_timestamp: new Date().toISOString(),
      });

      this.logger.log(`A/B test conversion tracked: ${testId} - ${variant} - ${conversionEvent}`);
    } catch (error) {
      this.logger.error(`Failed to track A/B test conversion: ${(error as Error).message}`);
    }
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testId: string): Promise<ABTestResult[]> {
    try {
      const test = await this.getABTest(testId);
      if (!test) {
        throw new Error(`A/B test ${testId} not found`);
      }

      const results: ABTestResult[] = [];

      for (const variant of test.variants) {
        const variantData = await this.getVariantData(testId, variant.name);
        results.push({
          testId,
          variant: variant.name,
          users: variantData.users,
          conversions: variantData.conversions,
          conversionRate: variantData.conversions / Math.max(variantData.users, 1),
          confidence: this.calculateConfidence(variantData),
          statisticalSignificance: this.isStatisticallySignificant(variantData),
        });
      }

      return results;
    } catch (error) {
      this.logger.error(`Failed to get A/B test results: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get A/B test by ID
   */
  async getABTest(testId: string): Promise<ABTest | null> {
    // This would typically query a database
    // For now, return mock data
    return {
      id: testId,
      name: 'AI Coaching Feature Test',
      description: 'Test the impact of AI coaching on user engagement',
      status: 'running',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      variants: [
        { name: 'control', weight: 50, configuration: { ai_coaching: false } },
        { name: 'treatment', weight: 50, configuration: { ai_coaching: true } },
      ],
      targetSegments: ['premium_users', 'active_users'],
      successMetrics: ['session_completion', 'plan_creation', 'subscription_upgrade'],
      hypothesis: 'AI coaching will increase user engagement by 20%',
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };
  }

  /**
   * Start an A/B test
   */
  async startABTest(testId: string): Promise<void> {
    const test = await this.getABTest(testId);
    if (!test) {
      throw new Error(`A/B test ${testId} not found`);
    }

    // Enable feature flags for all variants
    for (const variant of test.variants) {
      await this.featureFlagsService.updateFeatureFlag(`${testId}_${variant.name}`, {
        enabled: true,
      });
    }

    this.logger.log(`A/B test started: ${testId}`);
  }

  /**
   * Stop an A/B test
   */
  async stopABTest(testId: string): Promise<void> {
    const test = await this.getABTest(testId);
    if (!test) {
      throw new Error(`A/B test ${testId} not found`);
    }

    // Disable feature flags for all variants
    for (const variant of test.variants) {
      await this.featureFlagsService.updateFeatureFlag(`${testId}_${variant.name}`, {
        enabled: false,
      });
    }

    this.logger.log(`A/B test stopped: ${testId}`);
  }

  /**
   * Get variant data for analysis
   */
  private async getVariantData(testId: string, variant: string): Promise<{
    users: number;
    conversions: number;
  }> {
    // This would typically query analytics data
    // For now, return mock data
    return {
      users: Math.floor(Math.random() * 1000) + 500,
      conversions: Math.floor(Math.random() * 100) + 50,
    };
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(data: { users: number; conversions: number }): number {
    // Simplified confidence calculation
    const conversionRate = data.conversions / Math.max(data.users, 1);
    const standardError = Math.sqrt((conversionRate * (1 - conversionRate)) / data.users);
    const confidence = Math.min(95, (1 - standardError) * 100);
    return confidence;
  }

  /**
   * Check if results are statistically significant
   */
  private isStatisticallySignificant(data: { users: number; conversions: number }): boolean {
    // Simplified significance test
    return data.users > 100 && data.conversions > 10;
  }

  /**
   * Hash user ID for consistent variant assignment
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Generate unique test ID
   */
  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
