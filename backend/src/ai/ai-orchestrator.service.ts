import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { CacheService } from '../common/cache/cache.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { MetricsService } from '../monitoring/metrics.service';
import { PromptRegistry } from './prompt-registry.service';
import { AIConfigService } from './ai-config.service';
import { AILoggerService } from './ai-logger.service';

export interface AIRequest {
  prompt: string;
  context?: Record<string, any>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  requestId?: string;
  promptType?: string;
  version?: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  duration: number;
  requestId: string;
  timestamp: Date;
  cost: number;
}

export interface AIRequestOptions {
  cache?: boolean;
  cacheTTL?: number;
  rateLimit?: boolean;
  retry?: boolean;
  fallback?: boolean;
  timeout?: number;
}

export interface FallbackStrategy {
  primary: string;
  secondary: string;
  fallback: string;
  defaultContent?: string;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

@Injectable()
export class AIOrchestrator {
  private readonly logger = new Logger(AIOrchestrator.name);
  private openai!: OpenAI;
  private requestCounter = 0;
  private readonly fallbackStrategies: Map<string, FallbackStrategy> = new Map();
  private readonly rateLimitConfigs: Map<string, RateLimitConfig> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly aiConfig: AIConfigService,
    private readonly promptRegistry: PromptRegistry,
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
    private readonly aiLogger: AILoggerService,
  ) {
    this.initializeOpenAI();
    this.setupFallbackStrategies();
    this.setupRateLimitConfigs();
  }

  /**
   * OpenAI client'ını başlat
   */
  private initializeOpenAI(): void {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey,
      timeout: 30000, // 30 saniye timeout
    });

    this.logger.log('OpenAI client initialized successfully');
  }

  /**
   * Fallback stratejilerini kur
   */
  private setupFallbackStrategies(): void {
    this.fallbackStrategies.set('default', {
      primary: 'gpt-4',
      secondary: 'gpt-3.5-turbo',
      fallback: 'gpt-3.5-turbo',
      defaultContent: 'AI servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
    });

    this.fallbackStrategies.set('planning', {
      primary: 'gpt-4',
      secondary: 'gpt-3.5-turbo',
      fallback: 'gpt-3.5-turbo',
      defaultContent: 'Plan oluşturma servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
    });

    this.fallbackStrategies.set('coaching', {
      primary: 'gpt-4',
      secondary: 'gpt-3.5-turbo',
      fallback: 'gpt-3.5-turbo',
      defaultContent: 'Koçluk servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
    });
  }

  /**
   * Rate limit konfigürasyonlarını kur
   */
  private setupRateLimitConfigs(): void {
    this.rateLimitConfigs.set('default', {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      burstLimit: 10,
    });

    this.rateLimitConfigs.set('premium', {
      requestsPerMinute: 120,
      requestsPerHour: 2000,
      requestsPerDay: 20000,
      burstLimit: 20,
    });

    this.rateLimitConfigs.set('enterprise', {
      requestsPerMinute: 300,
      requestsPerHour: 5000,
      requestsPerDay: 50000,
      burstLimit: 50,
    });
  }

  /**
   * Ana AI çağrısı - merkezi endpoint
   */
  async generateContent(
    request: AIRequest,
    options: AIRequestOptions = {}
  ): Promise<AIResponse> {
    const requestId = request.requestId || this.generateRequestId();
    const startTime = Date.now();

    try {
      this.logger.log(`AI request started: ${requestId}`, {
        model: request.model,
        userId: request.userId,
        promptType: request.promptType,
        promptLength: request.prompt.length,
      });

      // Rate limiting kontrolü
      if (options.rateLimit !== false) {
        await this.checkRateLimit(request.userId, request.promptType);
      }

      // Cache kontrolü
      if (options.cache !== false) {
        const cacheKey = this.generateCacheKey(request);
        const cached = await this.cache.get<AIResponse>(cacheKey);
        if (cached) {
          this.logger.log(`Cache hit for request: ${requestId}`);
          return cached;
        }
      }

      // AI çağrısı
      const response = await this.makeAIRequest(request, options);

      // Cache'e kaydet
      if (options.cache !== false) {
        const cacheTTL = options.cacheTTL || this.aiConfig.getDefaultCacheTTL();
        await this.cache.set(this.generateCacheKey(request), response, cacheTTL);
      }

      // Logging
      const duration = Date.now() - startTime;
      this.logger.log(`AI request completed: ${requestId}`, {
        duration,
        tokens: response.usage.totalTokens,
        model: response.model,
        cost: response.cost,
      });

      // Metrics kaydet
      await this.recordMetrics(request, response, duration);

      return response;
    } catch (error) {
      this.logger.error(`AI request failed: ${requestId}`, {
        // DÜZELTME: unknown error güvenli erişim
        error: (error instanceof Error ? error.message : String(error)),
        model: request.model,
        userId: request.userId,
      });

      // Fallback stratejisi
      if (options.fallback !== false) {
        return await this.handleFallback(request, error, options);
      }

      throw this.handleAIError(error, requestId);
    }
  }

  /**
   * Prompt registry kullanarak AI çağrısı
   */
  async generateWithPrompt(
    promptType: string,
    context: Record<string, any> = {},
    options: AIRequestOptions = {}
  ): Promise<AIResponse> {
    try {
      // Prompt'u registry'den al
      const renderedPrompt = await this.promptRegistry.getPrompt(promptType, context);
      const request: AIRequest = {
        prompt: renderedPrompt,
        context,
        model: this.aiConfig.getModelForPromptType(promptType),
        temperature: this.aiConfig.getTemperatureForPromptType(promptType),
        maxTokens: this.aiConfig.getMaxTokensForPromptType(promptType),
        promptType,
      };

      return await this.generateContent(request, options);
    } catch (error) {
      this.logger.error(`Failed to generate with prompt: ${promptType}`, {
        error: (error instanceof Error ? error.message : String(error)),
        context,
      });
      throw error;
    }
  }

  /**
   * AI çağrısı yap
   */
  private async makeAIRequest(
    request: AIRequest,
    options: AIRequestOptions
  ): Promise<AIResponse> {
    const model = request.model || this.aiConfig.getDefaultModel();
    const temperature = request.temperature || this.aiConfig.getDefaultTemperature();
    const maxTokens = request.maxTokens || this.aiConfig.getDefaultMaxTokens();

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        temperature,
        max_tokens: maxTokens,
      });

      const endTime = Date.now();
      const usage = response.usage;
      const totalTokens = usage?.total_tokens ?? 0;
      const duration = endTime - (options.timeout ? endTime - options.timeout : endTime);
      const cost = this.calculateCost(model, totalTokens);

      return {
        content: response.choices[0]?.message?.content || '',
        model: response.model,
        usage: {
          promptTokens: usage?.prompt_tokens ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
          totalTokens,
        },
        duration,
        requestId: request.requestId || this.generateRequestId(),
        timestamp: new Date(),
        cost,
      };
    } catch (error) {
      this.logger.error(`OpenAI API error`, {
        error: (error instanceof Error ? error.message : String(error)),
        model,
        userId: request.userId,
      });
      throw error;
    }
  }

  /**
   * Fallback stratejisi
   */
  private async handleFallback(
    request: AIRequest,
    error: any,
    options: AIRequestOptions
  ): Promise<AIResponse> {
    const promptType = request.promptType || 'default';
    const strategy = this.fallbackStrategies.get(promptType) || this.fallbackStrategies.get('default')!;

    this.logger.warn(`Primary model failed, trying fallback: ${strategy.secondary}`, {
      error: (error instanceof Error ? error.message : String(error)),
      promptType,
    });

    try {
      // Secondary model ile dene
      const fallbackRequest = { ...request, model: strategy.secondary };
      return await this.makeAIRequest(fallbackRequest, options);
    } catch (fallbackError) {
      this.logger.error(`Secondary model also failed, trying final fallback: ${strategy.fallback}`, {
        error: (fallbackError instanceof Error ? fallbackError.message : String(fallbackError)),
        promptType,
      });

      try {
        // Final fallback model ile dene
        const finalRequest = { ...request, model: strategy.fallback };
        return await this.makeAIRequest(finalRequest, options);
      } catch (finalError) {
        this.logger.error(`All models failed, returning default content`, {
          error: (finalError instanceof Error ? finalError.message : String(finalError)),
          promptType,
        });

        // Default content döndür
        return {
          content: strategy.defaultContent || 'AI servisi şu anda kullanılamıyor.',
          model: 'fallback',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          duration: 0,
          requestId: request.requestId || this.generateRequestId(),
          timestamp: new Date(),
          cost: 0,
        };
      }
    }
  }

  /**
   * Rate limiting kontrolü
   */
  private async checkRateLimit(userId?: string, promptType?: string): Promise<void> {
    if (!userId) return;

    const userTier = await this.getUserTier(userId);
    const config = this.rateLimitConfigs.get(userTier) || this.rateLimitConfigs.get('default')!;

    // Redis ile rate limiting kontrolü
    const key = `rate_limit:${userId}:${promptType || 'default'}`;
    const current = await this.cache.get<number>(key) || 0;

    if (current >= config.requestsPerMinute) {
      throw new BadRequestException('Rate limit exceeded. Please try again later.');
    }

    // Counter'ı artır
    await this.cache.set(key, current + 1, 60); // 1 dakika TTL
  }

  /**
   * Kullanıcı tier'ını al
   */
  private async getUserTier(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionStatus: true },
      });

      return user?.subscriptionStatus?.toLowerCase() || 'default';
    } catch (error) {
      this.logger.warn(`Failed to get user tier for ${userId}`, { error: (error instanceof Error ? error.message : String(error)) }); // DÜZELTME
      return 'default';
    }
  }

  /**
   * Cache key oluştur
   */
  private generateCacheKey(request: AIRequest): string {
    const hash = require('crypto')
      .createHash('sha256')
      .update(`${request.prompt}:${request.model}:${request.temperature}:${request.maxTokens}`)
      .digest('hex');
    
    return `ai:cache:${hash}`;
  }

  /**
   * Request ID oluştur
   */
  private generateRequestId(): string {
    return `ai_${Date.now()}_${++this.requestCounter}`;
  }

  /**
   * Cost hesapla
   */
  private calculateCost(model: string, tokens: number): number {
    return this.aiConfig.calculateCost(model, tokens);
  }

  /**
   * Metrics kaydet
   */
  private async recordMetrics(
    request: AIRequest,
    response: AIResponse,
    duration: number
  ): Promise<void> {
    try {
      // AI Logger'a kaydet
      await this.aiLogger.logAIRequest({
        // DÜZELTME: AILogEntry şemasına uygun veri gönderimi
        requestId: response.requestId,
        userId: request.userId,
        promptType: request.promptType || 'default',
        model: response.model,
        prompt: request.prompt,
        response: response.content,
        usage: {
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
        },
        duration,
        success: true,
        timestamp: new Date(),
      });

      // Metrics service'e kaydet
      this.metrics.recordGeminiUsage(request.userId, request.promptType, response.model, 'chat.completions', response.usage.totalTokens);
      this.metrics.recordGeminiCallDuration(request.userId, request.promptType, response.model, 'chat.completions', duration, true);
    } catch (error) {
      this.logger.error(`Failed to record metrics`, { error: (error instanceof Error ? error.message : String(error)) });
    }
  }

  /**
   * AI hatasını işle
   */
  private handleAIError(error: any, requestId: string): Error {
    if (error.message?.includes('rate limit')) {
      return new BadRequestException('AI service rate limit exceeded. Please try again later.');
    }

    if (error.message?.includes('timeout')) {
      return new InternalServerErrorException('AI service timeout. Please try again later.');
    }

    if (error.message?.includes('quota')) {
      return new BadRequestException('AI service quota exceeded. Please try again later.');
    }

    return new InternalServerErrorException('AI service temporarily unavailable.');
  }

  /**
   * AI servis durumunu kontrol et
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    models: string[];
    lastCheck: Date;
  }> {
    try {
      // Basit bir test çağrısı yap
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });

      return {
        status: 'healthy',
        models: ['gpt-3.5-turbo', 'gpt-4'],
        lastCheck: new Date(),
      };
    } catch (error) {
      this.logger.error(`AI health check failed`, { error: (error instanceof Error ? error.message : String(error)) });
      return {
        status: 'unhealthy',
        models: [],
        lastCheck: new Date(),
      };
    }
  }

  /**
   * AI kullanım istatistikleri
   */
  async getUsageStatistics(userId?: string, timeRange?: string): Promise<any> {
    try {
      const where: any = {};
      if (userId) where.userId = userId;
      if (timeRange) {
        const days = parseInt(timeRange.replace('days', ''));
        where.timestamp = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }; // DÜZELTME: createdAt -> timestamp
      }
      const logs = await this.prisma.aiRequestLog.findMany({ where, select: { model: true, totalTokens: true, duration: true } });
      const totalRequests = logs.length;
      const totalTokens = logs.reduce((sum, l) => sum + (l.totalTokens || 0), 0);
      const totalCost = logs.reduce((sum, l) => sum + this.aiConfig.calculateCost(l.model, l.totalTokens || 0), 0);
      const averageDuration = totalRequests > 0 ? logs.reduce((s, l) => s + (l.duration || 0), 0) / totalRequests : 0;

      return {
        totalRequests,
        totalTokens,
        totalCost,
        averageDuration,
      };
    } catch (error) {
      this.logger.error(`Failed to get usage statistics`, { error: (error instanceof Error ? error.message : String(error)) });
      return null;
    }
  }
}
