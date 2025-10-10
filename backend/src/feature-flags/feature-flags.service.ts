import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  targetUsers: string[];
  targetRoles: string[];
  targetSegments: string[];
  conditions: FeatureFlagCondition[];
  environment: 'development' | 'staging' | 'production';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface FeatureFlagCondition {
  id: string;
  type: 'user_id' | 'user_role' | 'user_segment' | 'date_range' | 'percentage' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  isActive: boolean;
}

export interface FeatureFlagEvaluation {
  flagKey: string;
  userId: string;
  isEnabled: boolean;
  reason: string;
  timestamp: string;
  metadata?: any;
}

export interface FeatureFlagUsage {
  flagKey: string;
  totalEvaluations: number;
  enabledEvaluations: number;
  disabledEvaluations: number;
  uniqueUsers: number;
  lastEvaluated: string;
  usageByUser: { userId: string; count: number }[];
  usageBySegment: { segment: string; count: number }[];
}

export interface FeatureFlagDashboard {
  flags: FeatureFlag[];
  usage: FeatureFlagUsage[];
  stats: {
    totalFlags: number;
    enabledFlags: number;
    disabledFlags: number;
    totalEvaluations: number;
    uniqueUsers: number;
  };
  recentEvaluations: FeatureFlagEvaluation[];
  topFlags: { flagKey: string; evaluations: number }[];
}

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private readonly flagCache = new Map<string, FeatureFlag>();
  private readonly evaluationCache = new Map<string, FeatureFlagEvaluation>();

  constructor(private prisma: PrismaService) {
    // Cache'i başlat
    this.initializeCache();
  }

  async getFeatureFlagDashboard(): Promise<FeatureFlagDashboard> {
    try {
      const [flags, usage, stats, recentEvaluations, topFlags] = await Promise.all([
        this.getFeatureFlags(),
        this.getFeatureFlagUsage(),
        this.getFeatureFlagStats(),
        this.getRecentEvaluations(),
        this.getTopFlags(),
      ]);

      return {
        flags,
        usage,
        stats,
        recentEvaluations,
        topFlags,
      };
    } catch (error) {
      this.logger.error('Failed to get feature flag dashboard:', error);
      throw error;
    }
  }

  private async getFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      const flags = await this.prisma.featureFlag.findMany({
        orderBy: { updatedAt: 'desc' },
      });

      return flags.map(flag => ({
        id: flag.id,
        name: flag.name,
        key: flag.key,
        description: flag.description,
        isEnabled: flag.isEnabled,
        rolloutPercentage: flag.rolloutPercentage,
        targetUsers: flag.targetUsers || [],
        targetRoles: flag.targetRoles || [],
        targetSegments: flag.targetSegments || [],
        conditions: flag.conditions || [],
        environment: flag.environment as any,
        createdAt: flag.createdAt.toISOString(),
        updatedAt: flag.updatedAt.toISOString(),
        createdBy: flag.createdBy,
        updatedBy: flag.updatedBy,
      }));
    } catch (error) {
      this.logger.warn('Could not get feature flags:', error);
      return [];
    }
  }

  private async getFeatureFlagUsage(): Promise<FeatureFlagUsage[]> {
    try {
      const flags = await this.prisma.featureFlag.findMany({
        select: { key: true },
      });

      const usageData = [];

      for (const flag of flags) {
        const [totalEvaluations, enabledEvaluations, uniqueUsers, lastEvaluated, usageByUser, usageBySegment] = await Promise.all([
          this.getTotalEvaluations(flag.key),
          this.getEnabledEvaluations(flag.key),
          this.getUniqueUsers(flag.key),
          this.getLastEvaluated(flag.key),
          this.getUsageByUser(flag.key),
          this.getUsageBySegment(flag.key),
        ]);

        usageData.push({
          flagKey: flag.key,
          totalEvaluations,
          enabledEvaluations,
          disabledEvaluations: totalEvaluations - enabledEvaluations,
          uniqueUsers,
          lastEvaluated: lastEvaluated || '',
          usageByUser,
          usageBySegment,
        });
      }

      return usageData;
    } catch (error) {
      this.logger.warn('Could not get feature flag usage:', error);
      return [];
    }
  }

  private async getTotalEvaluations(flagKey: string): Promise<number> {
    try {
      return await this.prisma.featureFlagEvaluation.count({
        where: { flagKey },
      });
    } catch (error) {
      this.logger.warn(`Could not get total evaluations for ${flagKey}:`, error);
      return 0;
    }
  }

  private async getEnabledEvaluations(flagKey: string): Promise<number> {
    try {
      return await this.prisma.featureFlagEvaluation.count({
        where: { flagKey, isEnabled: true },
      });
    } catch (error) {
      this.logger.warn(`Could not get enabled evaluations for ${flagKey}:`, error);
      return 0;
    }
  }

  private async getUniqueUsers(flagKey: string): Promise<number> {
    try {
      const result = await this.prisma.featureFlagEvaluation.groupBy({
        by: ['userId'],
        where: { flagKey },
        _count: { userId: true },
      });

      return result.length;
    } catch (error) {
      this.logger.warn(`Could not get unique users for ${flagKey}:`, error);
      return 0;
    }
  }

  private async getLastEvaluated(flagKey: string): Promise<string | null> {
    try {
      const lastEvaluation = await this.prisma.featureFlagEvaluation.findFirst({
        where: { flagKey },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      });

      return lastEvaluation?.timestamp.toISOString() || null;
    } catch (error) {
      this.logger.warn(`Could not get last evaluated for ${flagKey}:`, error);
      return null;
    }
  }

  private async getUsageByUser(flagKey: string) {
    try {
      const result = await this.prisma.featureFlagEvaluation.groupBy({
        by: ['userId'],
        where: { flagKey },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      return result.map(item => ({
        userId: item.userId,
        count: item._count.id,
      }));
    } catch (error) {
      this.logger.warn(`Could not get usage by user for ${flagKey}:`, error);
      return [];
    }
  }

  private async getUsageBySegment(flagKey: string) {
    try {
      // Bu değer segment bilgilerinden hesaplanabilir
      return [];
    } catch (error) {
      this.logger.warn(`Could not get usage by segment for ${flagKey}:`, error);
      return [];
    }
  }

  private async getFeatureFlagStats() {
    try {
      const [totalFlags, enabledFlags, disabledFlags, totalEvaluations, uniqueUsers] = await Promise.all([
        this.prisma.featureFlag.count(),
        this.prisma.featureFlag.count({ where: { isEnabled: true } }),
        this.prisma.featureFlag.count({ where: { isEnabled: false } }),
        this.prisma.featureFlagEvaluation.count(),
        this.getTotalUniqueUsers(),
      ]);

      return {
        totalFlags,
        enabledFlags,
        disabledFlags,
        totalEvaluations,
        uniqueUsers,
      };
    } catch (error) {
      this.logger.warn('Could not get feature flag stats:', error);
      return {
        totalFlags: 0,
        enabledFlags: 0,
        disabledFlags: 0,
        totalEvaluations: 0,
        uniqueUsers: 0,
      };
    }
  }

  private async getTotalUniqueUsers(): Promise<number> {
    try {
      const result = await this.prisma.featureFlagEvaluation.groupBy({
        by: ['userId'],
        _count: { userId: true },
      });

      return result.length;
    } catch (error) {
      this.logger.warn('Could not get total unique users:', error);
      return 0;
    }
  }

  private async getRecentEvaluations(): Promise<FeatureFlagEvaluation[]> {
    try {
      const evaluations = await this.prisma.featureFlagEvaluation.findMany({
        take: 20,
        orderBy: { timestamp: 'desc' },
      });

      return evaluations.map(evaluation => ({
        flagKey: evaluation.flagKey,
        userId: evaluation.userId,
        isEnabled: evaluation.isEnabled,
        reason: evaluation.reason,
        timestamp: evaluation.timestamp.toISOString(),
        metadata: evaluation.metadata,
      }));
    } catch (error) {
      this.logger.warn('Could not get recent evaluations:', error);
      return [];
    }
  }

  private async getTopFlags() {
    try {
      const result = await this.prisma.featureFlagEvaluation.groupBy({
        by: ['flagKey'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      return result.map(item => ({
        flagKey: item.flagKey,
        evaluations: item._count.id,
      }));
    } catch (error) {
      this.logger.warn('Could not get top flags:', error);
      return [];
    }
  }

  async createFeatureFlag(flagData: {
    name: string;
    key: string;
    description: string;
    isEnabled: boolean;
    rolloutPercentage: number;
    targetUsers?: string[];
    targetRoles?: string[];
    targetSegments?: string[];
    conditions?: FeatureFlagCondition[];
    environment: 'development' | 'staging' | 'production';
    createdBy: string;
  }): Promise<FeatureFlag> {
    try {
      const flag = await this.prisma.featureFlag.create({
        data: {
          name: flagData.name,
          key: flagData.key,
          description: flagData.description,
          isEnabled: flagData.isEnabled,
          rolloutPercentage: flagData.rolloutPercentage,
          targetUsers: flagData.targetUsers || [],
          targetRoles: flagData.targetRoles || [],
          targetSegments: flagData.targetSegments || [],
          conditions: flagData.conditions || [],
          environment: flagData.environment,
          createdBy: flagData.createdBy,
          updatedBy: flagData.createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Cache'i güncelle
      this.flagCache.set(flag.key, {
        id: flag.id,
        name: flag.name,
        key: flag.key,
        description: flag.description,
        isEnabled: flag.isEnabled,
        rolloutPercentage: flag.rolloutPercentage,
        targetUsers: flag.targetUsers || [],
        targetRoles: flag.targetRoles || [],
        targetSegments: flag.targetSegments || [],
        conditions: flag.conditions || [],
        environment: flag.environment as any,
        createdAt: flag.createdAt.toISOString(),
        updatedAt: flag.updatedAt.toISOString(),
        createdBy: flag.createdBy,
        updatedBy: flag.updatedBy,
      });

      return this.flagCache.get(flag.key)!;
    } catch (error) {
      this.logger.error('Failed to create feature flag:', error);
      throw error;
    }
  }

  async updateFeatureFlag(
    flagId: string,
    flagData: Partial<FeatureFlag>,
    updatedBy: string
  ): Promise<FeatureFlag> {
    try {
      const flag = await this.prisma.featureFlag.update({
        where: { id: flagId },
        data: {
          name: flagData.name,
          description: flagData.description,
          isEnabled: flagData.isEnabled,
          rolloutPercentage: flagData.rolloutPercentage,
          targetUsers: flagData.targetUsers,
          targetRoles: flagData.targetRoles,
          targetSegments: flagData.targetSegments,
          conditions: flagData.conditions,
          updatedBy,
          updatedAt: new Date(),
        },
      });

      // Cache'i güncelle
      this.flagCache.set(flag.key, {
        id: flag.id,
        name: flag.name,
        key: flag.key,
        description: flag.description,
        isEnabled: flag.isEnabled,
        rolloutPercentage: flag.rolloutPercentage,
        targetUsers: flag.targetUsers || [],
        targetRoles: flag.targetRoles || [],
        targetSegments: flag.targetSegments || [],
        conditions: flag.conditions || [],
        environment: flag.environment as any,
        createdAt: flag.createdAt.toISOString(),
        updatedAt: flag.updatedAt.toISOString(),
        createdBy: flag.createdBy,
        updatedBy: flag.updatedBy,
      });

      return this.flagCache.get(flag.key)!;
    } catch (error) {
      this.logger.error('Failed to update feature flag:', error);
      throw error;
    }
  }

  async deleteFeatureFlag(flagId: string): Promise<void> {
    try {
      const flag = await this.prisma.featureFlag.findUnique({
        where: { id: flagId },
      });

      if (flag) {
        this.flagCache.delete(flag.key);
      }

      await this.prisma.featureFlag.delete({
        where: { id: flagId },
      });
    } catch (error) {
      this.logger.error('Failed to delete feature flag:', error);
      throw error;
    }
  }

  async evaluateFeatureFlag(
    flagKey: string,
    userId: string,
    userContext?: {
      role?: string;
      segment?: string;
      attributes?: Record<string, any>;
    }
  ): Promise<FeatureFlagEvaluation> {
    try {
      // Cache'den kontrol et
      const cacheKey = `${flagKey}:${userId}`;
      const cachedEvaluation = this.evaluationCache.get(cacheKey);
      
      if (cachedEvaluation) {
        return cachedEvaluation;
      }

      // Flag'i al
      let flag = this.flagCache.get(flagKey);
      if (!flag) {
        flag = await this.getFeatureFlagByKey(flagKey);
        if (flag) {
          this.flagCache.set(flagKey, flag);
        }
      }

      if (!flag) {
        throw new Error(`Feature flag not found: ${flagKey}`);
      }

      // Evaluation'ı yap
      const evaluation = await this.performEvaluation(flag, userId, userContext);

      // Cache'e kaydet
      this.evaluationCache.set(cacheKey, evaluation);

      // Database'e kaydet
      await this.prisma.featureFlagEvaluation.create({
        data: {
          flagKey,
          userId,
          isEnabled: evaluation.isEnabled,
          reason: evaluation.reason,
          metadata: evaluation.metadata || {},
          timestamp: new Date(),
        },
      });

      return evaluation;
    } catch (error) {
      this.logger.error('Failed to evaluate feature flag:', error);
      throw error;
    }
  }

  private async getFeatureFlagByKey(key: string): Promise<FeatureFlag | null> {
    try {
      const flag = await this.prisma.featureFlag.findUnique({
        where: { key },
      });

      if (!flag) return null;

      return {
        id: flag.id,
        name: flag.name,
        key: flag.key,
        description: flag.description,
        isEnabled: flag.isEnabled,
        rolloutPercentage: flag.rolloutPercentage,
        targetUsers: flag.targetUsers || [],
        targetRoles: flag.targetRoles || [],
        targetSegments: flag.targetSegments || [],
        conditions: flag.conditions || [],
        environment: flag.environment as any,
        createdAt: flag.createdAt.toISOString(),
        updatedAt: flag.updatedAt.toISOString(),
        createdBy: flag.createdBy,
        updatedBy: flag.updatedBy,
      };
    } catch (error) {
      this.logger.error('Failed to get feature flag by key:', error);
      return null;
    }
  }

  private async performEvaluation(
    flag: FeatureFlag,
    userId: string,
    userContext?: {
      role?: string;
      segment?: string;
      attributes?: Record<string, any>;
    }
  ): Promise<FeatureFlagEvaluation> {
    // Flag disabled ise
    if (!flag.isEnabled) {
      return {
        flagKey: flag.key,
        userId,
        isEnabled: false,
        reason: 'Feature flag is disabled',
        timestamp: new Date().toISOString(),
      };
    }

    // Target users kontrolü
    if (flag.targetUsers.length > 0 && !flag.targetUsers.includes(userId)) {
      return {
        flagKey: flag.key,
        userId,
        isEnabled: false,
        reason: 'User not in target users list',
        timestamp: new Date().toISOString(),
      };
    }

    // Target roles kontrolü
    if (flag.targetRoles.length > 0 && userContext?.role && !flag.targetRoles.includes(userContext.role)) {
      return {
        flagKey: flag.key,
        userId,
        isEnabled: false,
        reason: 'User role not in target roles list',
        timestamp: new Date().toISOString(),
      };
    }

    // Target segments kontrolü
    if (flag.targetSegments.length > 0 && userContext?.segment && !flag.targetSegments.includes(userContext.segment)) {
      return {
        flagKey: flag.key,
        userId,
        isEnabled: false,
        reason: 'User segment not in target segments list',
        timestamp: new Date().toISOString(),
      };
    }

    // Conditions kontrolü
    if (flag.conditions.length > 0) {
      const conditionsMet = await this.evaluateConditions(flag.conditions, userId, userContext);
      if (!conditionsMet) {
        return {
          flagKey: flag.key,
          userId,
          isEnabled: false,
          reason: 'Conditions not met',
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Rollout percentage kontrolü
    if (flag.rolloutPercentage < 100) {
      const userHash = this.hashUserId(userId, flag.key);
      const percentage = userHash % 100;
      
      if (percentage >= flag.rolloutPercentage) {
        return {
          flagKey: flag.key,
          userId,
          isEnabled: false,
          reason: `User not in rollout percentage (${flag.rolloutPercentage}%)`,
          timestamp: new Date().toISOString(),
        };
      }
    }

    return {
      flagKey: flag.key,
      userId,
      isEnabled: true,
      reason: 'Feature flag enabled',
      timestamp: new Date().toISOString(),
      metadata: {
        rolloutPercentage: flag.rolloutPercentage,
        userHash: this.hashUserId(userId, flag.key),
      },
    };
  }

  private async evaluateConditions(
    conditions: FeatureFlagCondition[],
    userId: string,
    userContext?: {
      role?: string;
      segment?: string;
      attributes?: Record<string, any>;
    }
  ): Promise<boolean> {
    for (const condition of conditions) {
      if (!condition.isActive) continue;

      const conditionMet = await this.evaluateCondition(condition, userId, userContext);
      if (!conditionMet) {
        return false;
      }
    }

    return true;
  }

  private async evaluateCondition(
    condition: FeatureFlagCondition,
    userId: string,
    userContext?: {
      role?: string;
      segment?: string;
      attributes?: Record<string, any>;
    }
  ): Promise<boolean> {
    switch (condition.type) {
      case 'user_id':
        return this.evaluateOperator(userId, condition.operator, condition.value);
      case 'user_role':
        return this.evaluateOperator(userContext?.role || '', condition.operator, condition.value);
      case 'user_segment':
        return this.evaluateOperator(userContext?.segment || '', condition.operator, condition.value);
      case 'date_range':
        return this.evaluateDateRange(condition);
      case 'percentage':
        return this.evaluatePercentage(condition, userId);
      case 'custom':
        return this.evaluateCustomCondition(condition, userId, userContext);
      default:
        return false;
    }
  }

  private evaluateOperator(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'not_contains':
        return !String(actual).includes(String(expected));
      case 'greater_than':
        return Number(actual) > Number(expected);
      case 'less_than':
        return Number(actual) < Number(expected);
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      default:
        return false;
    }
  }

  private evaluateDateRange(condition: FeatureFlagCondition): boolean {
    const now = new Date();
    const startDate = new Date(condition.value.start);
    const endDate = new Date(condition.value.end);
    
    return now >= startDate && now <= endDate;
  }

  private evaluatePercentage(condition: FeatureFlagCondition, userId: string): boolean {
    const userHash = this.hashUserId(userId, condition.id);
    const percentage = userHash % 100;
    
    return percentage < condition.value;
  }

  private evaluateCustomCondition(
    condition: FeatureFlagCondition,
    userId: string,
    userContext?: {
      role?: string;
      segment?: string;
      attributes?: Record<string, any>;
    }
  ): boolean {
    // Custom condition logic burada implement edilebilir
    return true;
  }

  private hashUserId(userId: string, salt: string): number {
    const hash = crypto.createHash('md5').update(userId + salt).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }

  private async initializeCache(): Promise<void> {
    try {
      const flags = await this.prisma.featureFlag.findMany();
      
      for (const flag of flags) {
        this.flagCache.set(flag.key, {
          id: flag.id,
          name: flag.name,
          key: flag.key,
          description: flag.description,
          isEnabled: flag.isEnabled,
          rolloutPercentage: flag.rolloutPercentage,
          targetUsers: flag.targetUsers || [],
          targetRoles: flag.targetRoles || [],
          targetSegments: flag.targetSegments || [],
          conditions: flag.conditions || [],
          environment: flag.environment as any,
          createdAt: flag.createdAt.toISOString(),
          updatedAt: flag.updatedAt.toISOString(),
          createdBy: flag.createdBy,
          updatedBy: flag.updatedBy,
        });
      }

      this.logger.log(`Initialized feature flag cache with ${flags.length} flags`);
    } catch (error) {
      this.logger.error('Failed to initialize feature flag cache:', error);
    }
  }

  async clearCache(): Promise<void> {
    this.flagCache.clear();
    this.evaluationCache.clear();
    await this.initializeCache();
  }

  async getFeatureFlagUsage(flagKey: string): Promise<FeatureFlagUsage | null> {
    try {
      const usageData = await this.getFeatureFlagUsage();
      return usageData.find(usage => usage.flagKey === flagKey) || null;
    } catch (error) {
      this.logger.error('Failed to get feature flag usage:', error);
      return null;
    }
  }
}
