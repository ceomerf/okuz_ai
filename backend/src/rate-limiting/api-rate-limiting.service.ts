import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RateLimitRule {
  id: string;
  name: string;
  pattern: string;
  method: string;
  limit: number;
  window: number; // seconds
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface RateLimitStatus {
  key: string;
  current: number;
  limit: number;
  remaining: number;
  resetTime: number;
  isBlocked: boolean;
  blockReason?: string;
}

export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  allowedRequests: number;
  blockRate: number;
  topBlockedIPs: { ip: string; count: number }[];
  topBlockedEndpoints: { endpoint: string; count: number }[];
  hourlyStats: { hour: string; requests: number; blocked: number }[];
}

export interface RateLimitDashboard {
  rules: RateLimitRule[];
  stats: RateLimitStats;
  recentBlocks: {
    id: string;
    key: string;
    ipAddress: string;
    endpoint: string;
    method: string;
    reason: string;
    timestamp: string;
  }[];
  activeLimits: {
    key: string;
    current: number;
    limit: number;
    remaining: number;
    resetTime: number;
  }[];
}

@Injectable()
export class APIRateLimitingService {
  private readonly logger = new Logger(APIRateLimitingService.name);
  private readonly rateLimitStore = new Map<string, { count: number; resetTime: number }>();
  private readonly defaultRules: RateLimitRule[] = [
    {
      id: 'default',
      name: 'Default Rate Limit',
      pattern: '*',
      method: '*',
      limit: 100,
      window: 3600, // 1 hour
      isActive: true,
      priority: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'auth',
      name: 'Authentication Rate Limit',
      pattern: '/api/auth/*',
      method: 'POST',
      limit: 5,
      window: 300, // 5 minutes
      isActive: true,
      priority: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'api',
      name: 'API Rate Limit',
      pattern: '/api/*',
      method: '*',
      limit: 1000,
      window: 3600, // 1 hour
      isActive: true,
      priority: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  constructor(private prisma: PrismaService) {}

  async getRateLimitDashboard(): Promise<RateLimitDashboard> {
    try {
      const [rules, stats, recentBlocks, activeLimits] = await Promise.all([
        this.getRateLimitRules(),
        this.getRateLimitStats(),
        this.getRecentBlocks(),
        this.getActiveLimits(),
      ]);

      return {
        rules,
        stats,
        recentBlocks,
        activeLimits,
      };
    } catch (error) {
      this.logger.error('Failed to get rate limit dashboard:', error);
      throw error;
    }
  }

  private async getRateLimitRules(): Promise<RateLimitRule[]> {
    try {
      const rules = await this.prisma.rateLimitRule.findMany({
        where: { isActive: true },
        orderBy: { priority: 'desc' },
      });

      return rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        pattern: rule.pattern,
        method: rule.method,
        limit: rule.limit,
        window: rule.window,
        isActive: rule.isActive,
        priority: rule.priority,
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
      }));
    } catch (error) {
      this.logger.warn('Could not get rate limit rules:', error);
      return this.defaultRules;
    }
  }

  private async getRateLimitStats(): Promise<RateLimitStats> {
    try {
      const [totalRequests, blockedRequests, topBlockedIPs, topBlockedEndpoints, hourlyStats] = await Promise.all([
        this.getTotalRequests(),
        this.getBlockedRequests(),
        this.getTopBlockedIPs(),
        this.getTopBlockedEndpoints(),
        this.getHourlyStats(),
      ]);

      const allowedRequests = totalRequests - blockedRequests;
      const blockRate = totalRequests > 0 ? (blockedRequests / totalRequests) * 100 : 0;

      return {
        totalRequests,
        blockedRequests,
        allowedRequests,
        blockRate,
        topBlockedIPs,
        topBlockedEndpoints,
        hourlyStats,
      };
    } catch (error) {
      this.logger.warn('Could not get rate limit stats:', error);
      return {
        totalRequests: 0,
        blockedRequests: 0,
        allowedRequests: 0,
        blockRate: 0,
        topBlockedIPs: [],
        topBlockedEndpoints: [],
        hourlyStats: [],
      };
    }
  }

  private async getTotalRequests(): Promise<number> {
    try {
      return await this.prisma.rateLimitLog.count();
    } catch (error) {
      this.logger.warn('Could not get total requests:', error);
      return 0;
    }
  }

  private async getBlockedRequests(): Promise<number> {
    try {
      return await this.prisma.rateLimitLog.count({
        where: { blocked: true },
      });
    } catch (error) {
      this.logger.warn('Could not get blocked requests:', error);
      return 0;
    }
  }

  private async getTopBlockedIPs() {
    try {
      const result = await this.prisma.rateLimitLog.groupBy({
        by: ['ipAddress'],
        where: { blocked: true },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      return result.map(item => ({
        ip: item.ipAddress,
        count: item._count.id,
      }));
    } catch (error) {
      this.logger.warn('Could not get top blocked IPs:', error);
      return [];
    }
  }

  private async getTopBlockedEndpoints() {
    try {
      const result = await this.prisma.rateLimitLog.groupBy({
        by: ['endpoint'],
        where: { blocked: true },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      return result.map(item => ({
        endpoint: item.endpoint,
        count: item._count.id,
      }));
    } catch (error) {
      this.logger.warn('Could not get top blocked endpoints:', error);
      return [];
    }
  }

  private async getHourlyStats() {
    try {
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const logs = await this.prisma.rateLimitLog.findMany({
        where: {
          timestamp: { gte: last24Hours },
        },
        select: {
          timestamp: true,
          blocked: true,
        },
      });

      const hourlyData = new Map<string, { requests: number; blocked: number }>();
      
      logs.forEach(log => {
        const hour = log.timestamp.toISOString().substring(0, 13) + ':00:00.000Z';
        const existing = hourlyData.get(hour) || { requests: 0, blocked: 0 };
        hourlyData.set(hour, {
          requests: existing.requests + 1,
          blocked: existing.blocked + (log.blocked ? 1 : 0),
        });
      });

      return Array.from(hourlyData.entries())
        .map(([hour, data]) => ({ hour, ...data }))
        .sort((a, b) => a.hour.localeCompare(b.hour));
    } catch (error) {
      this.logger.warn('Could not get hourly stats:', error);
      return [];
    }
  }

  private async getRecentBlocks() {
    try {
      const blocks = await this.prisma.rateLimitLog.findMany({
        where: { blocked: true },
        take: 10,
        orderBy: { timestamp: 'desc' },
      });

      return blocks.map(block => ({
        id: block.id,
        key: block.key,
        ipAddress: block.ipAddress,
        endpoint: block.endpoint,
        method: block.method,
        reason: block.reason || 'Rate limit exceeded',
        timestamp: block.timestamp.toISOString(),
      }));
    } catch (error) {
      this.logger.warn('Could not get recent blocks:', error);
      return [];
    }
  }

  private async getActiveLimits() {
    try {
      const activeLimits = Array.from(this.rateLimitStore.entries()).map(([key, data]) => ({
        key,
        current: data.count,
        limit: 100, // Default limit, should be fetched from rules
        remaining: Math.max(0, 100 - data.count),
        resetTime: data.resetTime,
      }));

      return activeLimits.slice(0, 10);
    } catch (error) {
      this.logger.warn('Could not get active limits:', error);
      return [];
    }
  }

  async checkRateLimit(
    key: string,
    ipAddress: string,
    endpoint: string,
    method: string
  ): Promise<RateLimitStatus> {
    try {
      const rule = await this.findMatchingRule(endpoint, method);
      if (!rule) {
        return {
          key,
          current: 0,
          limit: 0,
          remaining: 0,
          resetTime: 0,
          isBlocked: false,
        };
      }

      const now = Date.now();
      const windowMs = rule.window * 1000;
      const resetTime = now + windowMs;

      // Get or create rate limit data
      let rateLimitData = this.rateLimitStore.get(key);
      if (!rateLimitData || now >= rateLimitData.resetTime) {
        rateLimitData = { count: 0, resetTime };
        this.rateLimitStore.set(key, rateLimitData);
      }

      // Increment counter
      rateLimitData.count++;
      const isBlocked = rateLimitData.count > rule.limit;

      // Log the request
      await this.logRateLimitRequest(key, ipAddress, endpoint, method, isBlocked, rule.name);

      return {
        key,
        current: rateLimitData.count,
        limit: rule.limit,
        remaining: Math.max(0, rule.limit - rateLimitData.count),
        resetTime: rateLimitData.resetTime,
        isBlocked,
        blockReason: isBlocked ? `Rate limit exceeded for ${rule.name}` : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to check rate limit:', error);
      return {
        key,
        current: 0,
        limit: 0,
        remaining: 0,
        resetTime: 0,
        isBlocked: false,
      };
    }
  }

  private async findMatchingRule(endpoint: string, method: string): Promise<RateLimitRule | null> {
    try {
      const rules = await this.getRateLimitRules();
      
      // Sort by priority (highest first)
      const sortedRules = rules.sort((a, b) => b.priority - a.priority);
      
      for (const rule of sortedRules) {
        if (this.matchesRule(endpoint, method, rule)) {
          return rule;
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to find matching rule:', error);
      return null;
    }
  }

  private matchesRule(endpoint: string, method: string, rule: RateLimitRule): boolean {
    // Check method
    if (rule.method !== '*' && rule.method !== method) {
      return false;
    }

    // Check pattern
    if (rule.pattern === '*') {
      return true;
    }

    // Simple pattern matching (can be enhanced with regex)
    if (rule.pattern.includes('*')) {
      const pattern = rule.pattern.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(endpoint);
    }

    return endpoint === rule.pattern;
  }

  private async logRateLimitRequest(
    key: string,
    ipAddress: string,
    endpoint: string,
    method: string,
    blocked: boolean,
    ruleName: string
  ): Promise<void> {
    try {
      await this.prisma.rateLimitLog.create({
        data: {
          key,
          ipAddress,
          endpoint,
          method,
          blocked,
          reason: blocked ? `Rate limit exceeded for ${ruleName}` : null,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to log rate limit request:', error);
    }
  }

  async createRateLimitRule(ruleData: {
    name: string;
    pattern: string;
    method: string;
    limit: number;
    window: number;
    priority: number;
  }): Promise<RateLimitRule> {
    try {
      const rule = await this.prisma.rateLimitRule.create({
        data: {
          name: ruleData.name,
          pattern: ruleData.pattern,
          method: ruleData.method,
          limit: ruleData.limit,
          window: ruleData.window,
          priority: ruleData.priority,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return {
        id: rule.id,
        name: rule.name,
        pattern: rule.pattern,
        method: rule.method,
        limit: rule.limit,
        window: rule.window,
        isActive: rule.isActive,
        priority: rule.priority,
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to create rate limit rule:', error);
      throw error;
    }
  }

  async updateRateLimitRule(
    ruleId: string,
    ruleData: Partial<RateLimitRule>
  ): Promise<RateLimitRule> {
    try {
      const rule = await this.prisma.rateLimitRule.update({
        where: { id: ruleId },
        data: {
          name: ruleData.name,
          pattern: ruleData.pattern,
          method: ruleData.method,
          limit: ruleData.limit,
          window: ruleData.window,
          priority: ruleData.priority,
          isActive: ruleData.isActive,
          updatedAt: new Date(),
        },
      });

      return {
        id: rule.id,
        name: rule.name,
        pattern: rule.pattern,
        method: rule.method,
        limit: rule.limit,
        window: rule.window,
        isActive: rule.isActive,
        priority: rule.priority,
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to update rate limit rule:', error);
      throw error;
    }
  }

  async deleteRateLimitRule(ruleId: string): Promise<void> {
    try {
      await this.prisma.rateLimitRule.delete({
        where: { id: ruleId },
      });
    } catch (error) {
      this.logger.error('Failed to delete rate limit rule:', error);
      throw error;
    }
  }

  async resetRateLimit(key: string): Promise<void> {
    try {
      this.rateLimitStore.delete(key);
      this.logger.log(`Rate limit reset for key: ${key}`);
    } catch (error) {
      this.logger.error('Failed to reset rate limit:', error);
      throw error;
    }
  }

  async getRateLimitStatus(key: string): Promise<RateLimitStatus | null> {
    try {
      const data = this.rateLimitStore.get(key);
      if (!data) {
        return null;
      }

      const now = Date.now();
      if (now >= data.resetTime) {
        this.rateLimitStore.delete(key);
        return null;
      }

      return {
        key,
        current: data.count,
        limit: 100, // Default limit
        remaining: Math.max(0, 100 - data.count),
        resetTime: data.resetTime,
        isBlocked: data.count > 100,
      };
    } catch (error) {
      this.logger.error('Failed to get rate limit status:', error);
      return null;
    }
  }

  async clearExpiredRateLimits(): Promise<void> {
    try {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, data] of this.rateLimitStore.entries()) {
        if (now >= data.resetTime) {
          expiredKeys.push(key);
        }
      }

      expiredKeys.forEach(key => this.rateLimitStore.delete(key));
      
      if (expiredKeys.length > 0) {
        this.logger.log(`Cleared ${expiredKeys.length} expired rate limits`);
      }
    } catch (error) {
      this.logger.error('Failed to clear expired rate limits:', error);
    }
  }

  // Cleanup expired rate limits every 5 minutes
  startCleanupInterval(): void {
    setInterval(() => {
      this.clearExpiredRateLimits();
    }, 5 * 60 * 1000);
  }
}
