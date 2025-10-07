import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface AILogEntry {
  requestId: string;
  userId?: string;
  promptType: string;
  model: string;
  prompt: string;
  response: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  duration: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface AIUsageStats {
  totalRequests: number;
  totalTokens: number;
  averageResponseTime: number;
  successRate: number;
  costEstimate: number;
  topModels: Array<{ model: string; count: number }>;
  topPromptTypes: Array<{ type: string; count: number }>;
}

@Injectable()
export class AILoggerService {
  private readonly logger = new Logger(AILoggerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * AI çağrısını logla
   */
  async logAIRequest(entry: AILogEntry): Promise<void> {
    try {
      // Database'e kaydet
      await this.prisma.aiRequestLog.create({
        data: {
          requestId: entry.requestId,
          userId: entry.userId,
          promptType: entry.promptType,
          model: entry.model,
          prompt: entry.prompt,
          response: entry.response,
          promptTokens: entry.usage.promptTokens,
          completionTokens: entry.usage.completionTokens,
          totalTokens: entry.usage.totalTokens,
          duration: entry.duration,
          success: entry.success,
          error: entry.error,
          timestamp: entry.timestamp,
        },
      });

      // Console log
      this.logger.log(`AI Request logged: ${entry.requestId}`, {
        userId: entry.userId,
        promptType: entry.promptType,
        model: entry.model,
        tokens: entry.usage.totalTokens,
        duration: entry.duration,
        success: entry.success,
      });
    } catch (error) {
      this.logger.error(`Failed to log AI request: ${entry.requestId}`, {
        error: (error instanceof Error ? error.message : String(error)),
      });
    }
  }

  /**
   * AI hata logla
   */
  async logAIError(
    requestId: string,
    userId: string | undefined,
    promptType: string,
    model: string,
    error: string,
    duration: number
  ): Promise<void> {
    try {
      await this.prisma.aiRequestLog.create({
        data: {
          requestId,
          userId,
          promptType,
          model,
          prompt: '',
          response: '',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          duration,
          success: false,
          error,
          timestamp: new Date(),
        },
      });

      this.logger.error(`AI Error logged: ${requestId}`, {
        userId,
        promptType,
        model,
        error,
        duration,
      });
    } catch (logError) {
      this.logger.error(`Failed to log AI error: ${requestId}`, {
        error: (logError instanceof Error ? logError.message : String(logError)),
      });
    }
  }

  /**
   * Kullanım istatistikleri getir
   */
  async getUsageStats(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AIUsageStats> {
    try {
      const where: any = {};
      
      if (userId) {
        where.userId = userId;
      }
      
      if (startDate && endDate) {
        where.timestamp = {
          gte: startDate,
          lte: endDate,
        };
      }

      const logs = await this.prisma.aiRequestLog.findMany({
        where,
        select: {
          model: true,
          promptType: true,
          totalTokens: true,
          duration: true,
          success: true,
        },
      });

      const totalRequests = logs.length;
      const totalTokens = logs.reduce((sum, log) => sum + log.totalTokens, 0);
      const successfulRequests = logs.filter(log => log.success).length;
      const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0;
      const averageResponseTime = totalRequests > 0 
        ? logs.reduce((sum, log) => sum + log.duration, 0) / totalRequests 
        : 0;

      // Model istatistikleri
      const modelCounts: Record<string, number> = {};
      logs.forEach(log => {
        modelCounts[log.model] = (modelCounts[log.model] || 0) + 1;
      });

      const topModels = Object.entries(modelCounts)
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Prompt type istatistikleri
      const promptTypeCounts: Record<string, number> = {};
      logs.forEach(log => {
        promptTypeCounts[log.promptType] = (promptTypeCounts[log.promptType] || 0) + 1;
      });

      const topPromptTypes = Object.entries(promptTypeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Maliyet tahmini (basit hesaplama)
      const costEstimate = this.calculateCostEstimate(logs);

      return {
        totalRequests,
        totalTokens,
        averageResponseTime: Math.round(averageResponseTime),
        successRate: Math.round(successRate * 100) / 100,
        costEstimate,
        topModels,
        topPromptTypes,
      };
    } catch (error) {
      this.logger.error(`Failed to get usage stats`, { error: (error instanceof Error ? error.message : String(error)) });
      throw error;
    }
  }

  /**
   * Model performansı analiz et
   */
  async analyzeModelPerformance(
    model: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    model: string;
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    averageTokens: number;
    costEstimate: number;
    errorRate: number;
  }> {
    try {
      const where: any = { model };
      
      if (startDate && endDate) {
        where.timestamp = {
          gte: startDate,
          lte: endDate,
        };
      }

      const logs = await this.prisma.aiRequestLog.findMany({
        where,
        select: {
          totalTokens: true,
          duration: true,
          success: true,
        },
      });

      const totalRequests = logs.length;
      const successfulRequests = logs.filter(log => log.success).length;
      const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0;
      const errorRate = 1 - successRate;
      
      const averageResponseTime = totalRequests > 0 
        ? logs.reduce((sum, log) => sum + log.duration, 0) / totalRequests 
        : 0;
      
      const averageTokens = totalRequests > 0 
        ? logs.reduce((sum, log) => sum + log.totalTokens, 0) / totalRequests 
        : 0;

      const costEstimate = this.calculateCostEstimate(logs);

      return {
        model,
        totalRequests,
        successRate: Math.round(successRate * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime),
        averageTokens: Math.round(averageTokens),
        costEstimate,
        errorRate: Math.round(errorRate * 100) / 100,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze model performance`, { error: (error instanceof Error ? error.message : String(error)) });
      throw error;
    }
  }

  /**
   * Kullanıcı AI kullanımı analiz et
   */
  async analyzeUserUsage(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    userId: string;
    totalRequests: number;
    totalTokens: number;
    averageResponseTime: number;
    successRate: number;
    costEstimate: number;
    mostUsedModel: string;
    mostUsedPromptType: string;
    usagePattern: Array<{ date: string; requests: number; tokens: number }>;
  }> {
    try {
      const where: any = { userId };
      
      if (startDate && endDate) {
        where.timestamp = {
          gte: startDate,
          lte: endDate,
        };
      }

      const logs = await this.prisma.aiRequestLog.findMany({
        where,
        select: {
          model: true,
          promptType: true,
          totalTokens: true,
          duration: true,
          success: true,
          timestamp: true,
        },
        orderBy: { timestamp: 'asc' },
      });

      const totalRequests = logs.length;
      const totalTokens = logs.reduce((sum, log) => sum + log.totalTokens, 0);
      const successfulRequests = logs.filter(log => log.success).length;
      const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0;
      const averageResponseTime = totalRequests > 0 
        ? logs.reduce((sum, log) => sum + log.duration, 0) / totalRequests 
        : 0;

      // En çok kullanılan model
      const modelCounts: Record<string, number> = {};
      logs.forEach(log => {
        modelCounts[log.model] = (modelCounts[log.model] || 0) + 1;
      });
      const mostUsedModel = Object.entries(modelCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';

      // En çok kullanılan prompt type
      const promptTypeCounts: Record<string, number> = {};
      logs.forEach(log => {
        promptTypeCounts[log.promptType] = (promptTypeCounts[log.promptType] || 0) + 1;
      });
      const mostUsedPromptType = Object.entries(promptTypeCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';

      // Kullanım pattern'i (günlük)
      const usagePattern: Record<string, { requests: number; tokens: number }> = {};
      logs.forEach(log => {
        const date = log.timestamp.toISOString().split('T')[0];
        if (!usagePattern[date]) {
          usagePattern[date] = { requests: 0, tokens: 0 };
        }
        usagePattern[date].requests++;
        usagePattern[date].tokens += log.totalTokens;
      });

      const usagePatternArray = Object.entries(usagePattern)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const costEstimate = this.calculateCostEstimate(logs);

      return {
        userId,
        totalRequests,
        totalTokens,
        averageResponseTime: Math.round(averageResponseTime),
        successRate: Math.round(successRate * 100) / 100,
        costEstimate,
        mostUsedModel,
        mostUsedPromptType,
        usagePattern: usagePatternArray,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze user usage`, { error: (error instanceof Error ? error.message : String(error)) });
      throw error;
    }
  }

  /**
   * Maliyet tahmini hesapla
   */
  private calculateCostEstimate(logs: any[]): number {
    // Basit maliyet hesaplama (gerçek maliyetler modele göre değişir)
    const costPerToken = 0.000002; // GPT-3.5 Turbo yaklaşık maliyeti
    const totalTokens = logs.reduce((sum, log) => sum + log.totalTokens, 0);
    return totalTokens * costPerToken;
  }

  /**
   * Eski logları temizle
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.prisma.aiRequestLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} old AI request logs`);
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to cleanup old logs`, { error: (error instanceof Error ? error.message : String(error)) });
      throw error;
    }
  }

  /**
   * AI kullanım raporu oluştur
   */
  async generateUsageReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    period: { start: Date; end: Date };
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    successRate: number;
    topModels: Array<{ model: string; requests: number; tokens: number }>;
    topPromptTypes: Array<{ type: string; requests: number; tokens: number }>;
    dailyUsage: Array<{ date: string; requests: number; tokens: number }>;
  }> {
    try {
      const logs = await this.prisma.aiRequestLog.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          model: true,
          promptType: true,
          totalTokens: true,
          success: true,
          timestamp: true,
        },
      });

      const totalRequests = logs.length;
      const totalTokens = logs.reduce((sum, log) => sum + log.totalTokens, 0);
      const successfulRequests = logs.filter(log => log.success).length;
      const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0;
      const totalCost = this.calculateCostEstimate(logs);

      // Model istatistikleri
      const modelStats: Record<string, { requests: number; tokens: number }> = {};
      logs.forEach(log => {
        if (!modelStats[log.model]) {
          modelStats[log.model] = { requests: 0, tokens: 0 };
        }
        modelStats[log.model].requests++;
        modelStats[log.model].tokens += log.totalTokens;
      });

      const topModels = Object.entries(modelStats)
        .map(([model, data]) => ({ model, ...data }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 5);

      // Prompt type istatistikleri
      const promptTypeStats: Record<string, { requests: number; tokens: number }> = {};
      logs.forEach(log => {
        if (!promptTypeStats[log.promptType]) {
          promptTypeStats[log.promptType] = { requests: 0, tokens: 0 };
        }
        promptTypeStats[log.promptType].requests++;
        promptTypeStats[log.promptType].tokens += log.totalTokens;
      });

      const topPromptTypes = Object.entries(promptTypeStats)
        .map(([type, data]) => ({ type, ...data }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 5);

      // Günlük kullanım
      const dailyUsage: Record<string, { requests: number; tokens: number }> = {};
      logs.forEach(log => {
        const date = log.timestamp.toISOString().split('T')[0];
        if (!dailyUsage[date]) {
          dailyUsage[date] = { requests: 0, tokens: 0 };
        }
        dailyUsage[date].requests++;
        dailyUsage[date].tokens += log.totalTokens;
      });

      const dailyUsageArray = Object.entries(dailyUsage)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        period: { start: startDate, end: endDate },
        totalRequests,
        totalTokens,
        totalCost,
        successRate: Math.round(successRate * 100) / 100,
        topModels,
        topPromptTypes,
        dailyUsage: dailyUsageArray,
      };
    } catch (error) {
      this.logger.error(`Failed to generate usage report`, { error: (error instanceof Error ? error.message : String(error)) });
      throw error;
    }
  }
}
