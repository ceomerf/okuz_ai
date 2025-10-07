import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AIConfigService } from './ai-config.service'; // DÜZELTME: cost hesaplamak için eklendi
import { CacheService } from '../common/cache/cache.service';
import { MetricsService } from '../monitoring/metrics.service';

export interface AIMetrics {
  timestamp: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalTokens: number;
  totalCost: number;
  requestsByModel: Record<string, number>;
  requestsByPromptType: Record<string, number>;
  requestsByUser: Record<string, number>;
  errorRate: number;
  costPerToken: number;
}

export interface AIAlert {
  id: string;
  type: 'high_error_rate' | 'high_cost' | 'slow_response' | 'rate_limit_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: any;
  timestamp: Date;
  resolved: boolean;
}

export interface CostAnalysis {
  period: string;
  totalCost: number;
  costByModel: Record<string, number>;
  costByPromptType: Record<string, number>;
  costByUser: Record<string, number>;
  averageCostPerRequest: number;
  costTrend: 'increasing' | 'decreasing' | 'stable';
  projectedMonthlyCost: number;
}

export interface PerformanceAnalysis {
  period: string;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  successRate: number;
  throughput: number;
  bottleneck: string;
  recommendations: string[];
}

@Injectable()
export class AIMonitoringService {
  private readonly logger = new Logger(AIMonitoringService.name);
  private readonly alertThresholds = {
    errorRate: 0.1, // 10%
    responseTime: 5000, // 5 saniye
    costPerHour: 100, // $100/saat
    rateLimitExceeded: 10, // 10 kez
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly metrics: MetricsService,
    private readonly aiConfig: AIConfigService, // DÜZELTME
  ) {}

  /**
   * AI metriklerini topla
   */
  async collectAIMetrics(timeRange: string = '1h'): Promise<AIMetrics> {
    try {
      const endTime = new Date();
      const startTime = this.getStartTime(timeRange, endTime);

      // AI request logs'dan metrikleri al
      const logs = await this.prisma.aiRequestLog.findMany({
        where: {
          timestamp: { // DÜZELTME: createdAt -> timestamp
            gte: startTime,
            lte: endTime,
          },
        },
        orderBy: { timestamp: 'desc' }, // DÜZELTME
      });

      const totalRequests = logs.length;
      const successfulRequests = logs.filter(log => log.success).length;
      const failedRequests = totalRequests - successfulRequests;
      const averageResponseTime = logs.reduce((sum, log) => sum + log.duration, 0) / totalRequests;
      const totalTokens = logs.reduce((sum, log) => sum + log.totalTokens, 0);
      const totalCost = logs.reduce((sum, log) => sum + this.aiConfig.calculateCost(log.model, log.totalTokens), 0); // DÜZELTME

      // Model bazlı istatistikler
      const requestsByModel: Record<string, number> = {};
      const requestsByPromptType: Record<string, number> = {};
      const requestsByUser: Record<string, number> = {};

      logs.forEach(log => {
        requestsByModel[log.model] = (requestsByModel[log.model] || 0) + 1;
        requestsByPromptType[log.promptType] = (requestsByPromptType[log.promptType] || 0) + 1;
        if (log.userId) {
          requestsByUser[log.userId] = (requestsByUser[log.userId] || 0) + 1;
        }
      });

      const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;
      const costPerToken = totalTokens > 0 ? totalCost / totalTokens : 0;

      return {
        timestamp: endTime,
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        totalTokens,
        totalCost,
        requestsByModel,
        requestsByPromptType,
        requestsByUser,
        errorRate,
        costPerToken,
      };
    } catch (error) {
      this.logger.error(`Failed to collect AI metrics: ${error instanceof Error ? error.message : String(error)}`); // DÜZELTME
      throw error;
    }
  }

  /**
   * AI alertlerini kontrol et
   */
  async checkAIAlerts(): Promise<AIAlert[]> {
    const alerts: AIAlert[] = [];
    const metrics = await this.collectAIMetrics('1h');

    // High error rate alert
    if (metrics.errorRate > this.alertThresholds.errorRate) {
      alerts.push({
        id: `alert_${Date.now()}_error_rate`,
        type: 'high_error_rate',
        severity: metrics.errorRate > 0.2 ? 'critical' : 'high',
        message: `High error rate detected: ${(metrics.errorRate * 100).toFixed(2)}%`,
        data: { errorRate: metrics.errorRate, threshold: this.alertThresholds.errorRate },
        timestamp: new Date(),
        resolved: false,
      });
    }

    // Slow response time alert
    if (metrics.averageResponseTime > this.alertThresholds.responseTime) {
      alerts.push({
        id: `alert_${Date.now()}_slow_response`,
        type: 'slow_response',
        severity: metrics.averageResponseTime > 10000 ? 'critical' : 'high',
        message: `Slow response time detected: ${metrics.averageResponseTime.toFixed(2)}ms`,
        data: { responseTime: metrics.averageResponseTime, threshold: this.alertThresholds.responseTime },
        timestamp: new Date(),
        resolved: false,
      });
    }

    // High cost alert
    if (metrics.totalCost > this.alertThresholds.costPerHour) {
      alerts.push({
        id: `alert_${Date.now()}_high_cost`,
        type: 'high_cost',
        severity: metrics.totalCost > 500 ? 'critical' : 'high',
        message: `High cost detected: $${metrics.totalCost.toFixed(2)} in the last hour`,
        data: { cost: metrics.totalCost, threshold: this.alertThresholds.costPerHour },
        timestamp: new Date(),
        resolved: false,
      });
    }

    return alerts;
  }

  /**
   * Cost analizi
   */
  async analyzeCosts(timeRange: string = '24h'): Promise<CostAnalysis> {
    try {
      const endTime = new Date();
      const startTime = this.getStartTime(timeRange, endTime);

      const logs = await this.prisma.aiRequestLog.findMany({
        where: {
          timestamp: { // DÜZELTME
            gte: startTime,
            lte: endTime,
          },
        },
        select: { // DÜZELTME: gerekli alanlar seçildi
          model: true,
          promptType: true,
          totalTokens: true,
          userId: true,
          duration: true,
          success: true,
          timestamp: true,
        },
      });

      const totalCost = logs.reduce((sum, log) => sum + this.aiConfig.calculateCost(log.model, log.totalTokens), 0); // DÜZELTME
      
      // Model bazlı cost
      const costByModel: Record<string, number> = {};
      const costByPromptType: Record<string, number> = {};
      const costByUser: Record<string, number> = {};

      logs.forEach(log => {
        const cost = this.aiConfig.calculateCost(log.model, log.totalTokens);
        costByModel[log.model] = (costByModel[log.model] || 0) + cost;
        costByPromptType[log.promptType] = (costByPromptType[log.promptType] || 0) + cost;
        if (log.userId) {
          costByUser[log.userId] = (costByUser[log.userId] || 0) + cost;
        }
      });

      const averageCostPerRequest = logs.length > 0 ? totalCost / logs.length : 0;
      
      // Cost trend hesapla (basit implementasyon)
      const costTrend = await this.calculateCostTrend(startTime, endTime);
      const projectedMonthlyCost = this.projectMonthlyCost(totalCost, timeRange);

      return {
        period: timeRange,
        totalCost,
        costByModel,
        costByPromptType,
        costByUser,
        averageCostPerRequest,
        costTrend,
        projectedMonthlyCost,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze costs: ${error instanceof Error ? error.message : String(error)}`); // DÜZELTME
      throw error;
    }
  }

  /**
   * Performance analizi
   */
  async analyzePerformance(timeRange: string = '24h'): Promise<PerformanceAnalysis> {
    try {
      const endTime = new Date();
      const startTime = this.getStartTime(timeRange, endTime);

      const logs = await this.prisma.aiRequestLog.findMany({
        where: {
          timestamp: { // DÜZELTME
            gte: startTime,
            lte: endTime,
          },
        },
        select: { // DÜZELTME
          model: true,
          promptType: true,
          totalTokens: true,
          duration: true,
          success: true,
          timestamp: true,
        },
      });

      const durations = logs.map(log => log.duration).sort((a, b) => a - b);
      const averageResponseTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const p95ResponseTime = durations[Math.floor(durations.length * 0.95)];
      const p99ResponseTime = durations[Math.floor(durations.length * 0.99)];

      const successfulRequests = logs.filter(log => log.success).length;
      const errorRate = logs.length > 0 ? (logs.length - successfulRequests) / logs.length : 0;
      const successRate = 1 - errorRate;
      const throughput = logs.length / (endTime.getTime() - startTime.getTime()) * 1000; // requests per second

      // Bottleneck analizi
      const bottleneck = this.identifyBottleneck(logs);
      const recommendations = this.generateRecommendations(logs, bottleneck);

      return {
        period: timeRange,
        averageResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        errorRate,
        successRate,
        throughput,
        bottleneck,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze performance: ${error instanceof Error ? error.message : String(error)}`); // DÜZELTME
      throw error;
    }
  }

  /**
   * AI dashboard verilerini getir
   */
  async getAIDashboard(): Promise<{
    metrics: AIMetrics;
    alerts: AIAlert[];
    costAnalysis: CostAnalysis;
    performanceAnalysis: PerformanceAnalysis;
    recommendations: string[];
  }> {
    const metrics = await this.collectAIMetrics('1h');
    const alerts = await this.checkAIAlerts();
    const costAnalysis = await this.analyzeCosts('24h');
    const performanceAnalysis = await this.analyzePerformance('24h');
    const recommendations = this.generateDashboardRecommendations(metrics, alerts, costAnalysis, performanceAnalysis);

    return {
      metrics,
      alerts,
      costAnalysis,
      performanceAnalysis,
      recommendations,
    };
  }

  /**
   * Start time hesapla
   */
  private getStartTime(timeRange: string, endTime: Date): Date {
    const now = endTime.getTime();
    
    switch (timeRange) {
      case '1h':
        return new Date(now - 60 * 60 * 1000);
      case '24h':
        return new Date(now - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 60 * 60 * 1000);
    }
  }

  /**
   * Cost trend hesapla
   */
  private async calculateCostTrend(startTime: Date, endTime: Date): Promise<'increasing' | 'decreasing' | 'stable'> {
    try {
      const midTime = new Date((startTime.getTime() + endTime.getTime()) / 2);
      
      const firstLogs = await this.prisma.aiRequestLog.findMany({
        where: {
          timestamp: {
            gte: startTime,
            lt: midTime,
          },
        },
        select: { model: true, totalTokens: true },
      });

      const secondLogs = await this.prisma.aiRequestLog.findMany({
        where: {
          timestamp: {
            gte: midTime,
            lte: endTime,
          },
        },
        select: { model: true, totalTokens: true },
      });
      const firstHalfCost = firstLogs.reduce((s, l) => s + this.aiConfig.calculateCost(l.model, l.totalTokens), 0);
      const secondHalfCost = secondLogs.reduce((s, l) => s + this.aiConfig.calculateCost(l.model, l.totalTokens), 0);

      if (secondHalfCost > firstHalfCost * 1.1) return 'increasing';
      if (secondHalfCost < firstHalfCost * 0.9) return 'decreasing';
      return 'stable';
    } catch (error) {
      this.logger.error(`Failed to calculate cost trend`, { error: (error instanceof Error ? error.message : String(error)) });
      return 'stable';
    }
  }

  /**
   * Monthly cost projeksiyonu
   */
  private projectMonthlyCost(currentCost: number, timeRange: string): number {
    const multipliers: Record<string, number> = {
      '1h': 24 * 30,
      '24h': 30,
      '7d': 30 / 7,
      '30d': 1,
    };

    return currentCost * (multipliers[timeRange] || 1);
  }

  /**
   * Bottleneck tespit et
   */
  private identifyBottleneck(logs: any[]): string {
    const modelPerformance = new Map<string, number>();
    const promptTypePerformance = new Map<string, number>();

    logs.forEach(log => {
      const modelAvg = modelPerformance.get(log.model) || 0;
      const promptAvg = promptTypePerformance.get(log.promptType) || 0;
      
      modelPerformance.set(log.model, (modelAvg + log.duration) / 2);
      promptTypePerformance.set(log.promptType, (promptAvg + log.duration) / 2);
    });

    const slowestModel = Array.from(modelPerformance.entries())
      .sort(([,a], [,b]) => b - a)[0];
    const slowestPromptType = Array.from(promptTypePerformance.entries())
      .sort(([,a], [,b]) => b - a)[0];

    if (slowestModel && slowestModel[1] > 5000) {
      return `Model ${slowestModel[0]} is slow (${slowestModel[1].toFixed(2)}ms avg)`;
    }

    if (slowestPromptType && slowestPromptType[1] > 5000) {
      return `Prompt type ${slowestPromptType[0]} is slow (${slowestPromptType[1].toFixed(2)}ms avg)`;
    }

    return 'No significant bottlenecks detected';
  }

  /**
   * Öneriler oluştur
   */
  private generateRecommendations(logs: any[], bottleneck: string): string[] {
    const recommendations: string[] = [];

    if (bottleneck.includes('Model')) {
      recommendations.push('Consider switching to a faster model for better performance');
    }

    if (bottleneck.includes('Prompt type')) {
      recommendations.push('Optimize prompt templates for better performance');
    }

    const errorRate = logs.filter(log => !log.success).length / logs.length;
    if (errorRate > 0.1) {
      recommendations.push('High error rate detected. Review prompt quality and model selection');
    }

    const avgCost = logs.reduce((sum, log) => sum + log.cost, 0) / logs.length;
    if (avgCost > 0.1) {
      recommendations.push('High cost per request. Consider using cheaper models for simple tasks');
    }

    return recommendations;
  }

  /**
   * Dashboard önerileri
   */
  private generateDashboardRecommendations(
    metrics: AIMetrics,
    alerts: AIAlert[],
    costAnalysis: CostAnalysis,
    performanceAnalysis: PerformanceAnalysis
  ): string[] {
    const recommendations: string[] = [];

    if (alerts.length > 0) {
      recommendations.push('Active alerts detected. Review and resolve issues immediately');
    }

    if (costAnalysis.costTrend === 'increasing') {
      recommendations.push('Cost trend is increasing. Consider implementing cost controls');
    }

    if (performanceAnalysis.errorRate > 0.05) {
      recommendations.push('Error rate is high. Review prompt quality and model selection');
    }

    if (performanceAnalysis.averageResponseTime > 3000) {
      recommendations.push('Response time is slow. Consider optimizing prompts or using faster models');
    }

    return recommendations;
  }
}
