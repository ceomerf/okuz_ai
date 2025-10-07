import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetUsers: string[];
  targetRoles: string[];
  targetSegments: string[];
  conditions: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagEvaluation {
  enabled: boolean;
  reason: string;
  variant?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private readonly cacheKey = 'feature_flags';

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Create a new feature flag
   */
  async createFeatureFlag(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    const newFlag: FeatureFlag = {
      ...flag,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.cacheService.set(
      `${this.cacheKey}:${flag.key}`,
      JSON.stringify(newFlag),
      3600 // 1 hour cache
    );

    this.logger.log(`Feature flag created: ${flag.key}`);
    return newFlag;
  }

  /**
   * Update an existing feature flag
   */
  async updateFeatureFlag(key: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const existingFlag = await this.getFeatureFlag(key);
    if (!existingFlag) {
      throw new Error(`Feature flag ${key} not found`);
    }

    const updatedFlag: FeatureFlag = {
      ...existingFlag,
      ...updates,
      updatedAt: new Date(),
    };

    await this.cacheService.set(
      `${this.cacheKey}:${key}`,
      JSON.stringify(updatedFlag),
      3600
    );

    this.logger.log(`Feature flag updated: ${key}`);
    return updatedFlag;
  }

  /**
   * Get a feature flag by key
   */
  async getFeatureFlag(key: string): Promise<FeatureFlag | null> {
    try {
      const cached = await this.cacheService.get(`${this.cacheKey}:${key}`);
      if (cached) {
        return JSON.parse(cached as string);
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get feature flag ${key}: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get all feature flags
   */
  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      const keys = await (this.cacheService as any).keys(`${this.cacheKey}:*`);
      const flags: FeatureFlag[] = [];

      for (const key of keys) {
        const cached = await this.cacheService.get(key);
        if (cached) {
          flags.push(JSON.parse(cached as string));
        }
      }

      return flags;
    } catch (error) {
      this.logger.error(`Failed to get all feature flags: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Evaluate a feature flag for a user
   */
  async evaluateFeatureFlag(
    flagKey: string,
    userId: string,
    userRole: string,
    userSegments: string[] = [],
    context: Record<string, any> = {}
  ): Promise<FeatureFlagEvaluation> {
    try {
      const flag = await this.getFeatureFlag(flagKey);
      if (!flag) {
        return {
          enabled: false,
          reason: 'Feature flag not found',
        };
      }

      // Check if flag is globally disabled
      if (!flag.enabled) {
        return {
          enabled: false,
          reason: 'Feature flag is globally disabled',
        };
      }

      // Check target users
      if (flag.targetUsers.length > 0 && !flag.targetUsers.includes(userId)) {
        return {
          enabled: false,
          reason: 'User not in target users list',
        };
      }

      // Check target roles
      if (flag.targetRoles.length > 0 && !flag.targetRoles.includes(userRole)) {
        return {
          enabled: false,
          reason: 'User role not in target roles',
        };
      }

      // Check target segments
      if (flag.targetSegments.length > 0 && !flag.targetSegments.some(segment => userSegments.includes(segment))) {
        return {
          enabled: false,
          reason: 'User not in target segments',
        };
      }

      // Check rollout percentage
      if (flag.rolloutPercentage < 100) {
        const userHash = this.hashUserId(userId);
        const percentage = userHash % 100;
        
        if (percentage >= flag.rolloutPercentage) {
          return {
            enabled: false,
            reason: `User not in rollout percentage (${flag.rolloutPercentage}%)`,
          };
        }
      }

      // Check custom conditions
      if (Object.keys(flag.conditions).length > 0) {
        const conditionsMet = this.evaluateConditions(flag.conditions, context);
        if (!conditionsMet) {
          return {
            enabled: false,
            reason: 'Custom conditions not met',
          };
        }
      }

      return {
        enabled: true,
        reason: 'All conditions met',
        variant: flag.conditions.variant || 'default',
        metadata: {
          flagKey,
          userId,
          userRole,
          userSegments,
          evaluatedAt: new Date().toISOString(),
        },
      };

    } catch (error) {
      this.logger.error(`Failed to evaluate feature flag ${flagKey}: ${(error as Error).message}`);
      return {
        enabled: false,
        reason: 'Evaluation error',
      };
    }
  }

  /**
   * Check if a feature is enabled for a user
   */
  async isFeatureEnabled(
    flagKey: string,
    userId: string,
    userRole: string,
    userSegments: string[] = [],
    context: Record<string, any> = {}
  ): Promise<boolean> {
    const evaluation = await this.evaluateFeatureFlag(flagKey, userId, userRole, userSegments, context);
    return evaluation.enabled;
  }

  /**
   * Get feature flag statistics
   */
  async getFeatureFlagStats(flagKey: string): Promise<{
    totalEvaluations: number;
    enabledCount: number;
    disabledCount: number;
    enabledPercentage: number;
    topReasons: Record<string, number>;
  }> {
    try {
      const statsKey = `feature_flag_stats:${flagKey}`;
      const cached = await this.cacheService.get(statsKey);
      
      if (cached) {
        return JSON.parse(cached as string);
      }

      return {
        totalEvaluations: 0,
        enabledCount: 0,
        disabledCount: 0,
        enabledPercentage: 0,
        topReasons: {},
      };
    } catch (error) {
      this.logger.error(`Failed to get feature flag stats: ${(error as Error).message}`);
      return {
        totalEvaluations: 0,
        enabledCount: 0,
        disabledCount: 0,
        enabledPercentage: 0,
        topReasons: {},
      };
    }
  }

  /**
   * Record feature flag evaluation
   */
  async recordEvaluation(
    flagKey: string,
    userId: string,
    enabled: boolean,
    reason: string
  ): Promise<void> {
    try {
      const statsKey = `feature_flag_stats:${flagKey}`;
      const existingStats = await this.getFeatureFlagStats(flagKey);
      
      const updatedStats = {
        totalEvaluations: existingStats.totalEvaluations + 1,
        enabledCount: existingStats.enabledCount + (enabled ? 1 : 0),
        disabledCount: existingStats.disabledCount + (enabled ? 0 : 1),
        enabledPercentage: 0,
        topReasons: {
          ...existingStats.topReasons,
          [reason]: (existingStats.topReasons[reason] || 0) + 1,
        },
      };

      updatedStats.enabledPercentage = updatedStats.totalEvaluations > 0 
        ? (updatedStats.enabledCount / updatedStats.totalEvaluations) * 100 
        : 0;

      await this.cacheService.set(statsKey, JSON.stringify(updatedStats), 3600);
    } catch (error) {
      this.logger.error(`Failed to record feature flag evaluation: ${(error as Error).message}`);
    }
  }

  /**
   * Hash user ID for consistent rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Evaluate custom conditions
   */
  private evaluateConditions(conditions: Record<string, any>, context: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (key === 'variant') continue; // Skip variant, it's not a condition
      
      const contextValue = context[key];
      if (contextValue !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Delete a feature flag
   */
  async deleteFeatureFlag(key: string): Promise<void> {
    await this.cacheService.del(`${this.cacheKey}:${key}`);
    this.logger.log(`Feature flag deleted: ${key}`);
  }
}
