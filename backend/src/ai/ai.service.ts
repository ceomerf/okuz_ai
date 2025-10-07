import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AIConfigService } from './ai-config.service';
import { PromptRegistry } from './prompt-registry.service';
import { CacheService } from '../common/cache/cache.service';

export interface AIRequest {
  prompt: string;
  context?: Record<string, any>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  requestId?: string;
}

export interface AIResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  requestId: string;
  timestamp: Date;
}

export interface AIRequestOptions {
  retries?: number;
  timeout?: number;
  cache?: boolean;
  cacheTTL?: number;
  rateLimit?: boolean;
  temperature?: number;
  maxTokens?: number;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private openai!: OpenAI;
  private requestCounter = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiConfig: AIConfigService,
    private readonly promptRegistry: PromptRegistry,
    private readonly cache: CacheService,
  ) {
    this.initializeOpenAI();
  }

  /**
   * OpenAI client'ını başlat
   */
  private initializeOpenAI(): void {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      this.logger.error('OpenAI API key not found');
      throw new InternalServerErrorException('OpenAI API key not configured');
    }

    this.openai = new OpenAI({
      apiKey,
      timeout: this.aiConfig.getDefaultTimeout(),
      maxRetries: this.aiConfig.getDefaultRetries(),
    });

    this.logger.log('OpenAI client initialized successfully');
  }

  /**
   * Ana AI çağrısı - merkezi endpoint
   */
  async generateContent(
    request: AIRequest | string,
    options: AIRequestOptions = {}
  ): Promise<AIResponse> {
    const normalizedRequest: AIRequest = typeof request === 'string' 
      ? { prompt: request, temperature: options.temperature, maxTokens: options.maxTokens }
      : { ...request, temperature: request.temperature ?? options.temperature, maxTokens: request.maxTokens ?? options.maxTokens };
    const requestId = normalizedRequest.requestId || this.generateRequestId();
    const startTime = Date.now();

    try {
      this.logger.log(`AI request started: ${requestId}`, {
        model: normalizedRequest.model,
        userId: normalizedRequest.userId,
        promptLength: normalizedRequest.prompt.length,
      });

      // Cache kontrolü
      if (options.cache !== false) {
        const cacheKey = this.generateCacheKey(normalizedRequest);
        const cached = await this.cache.get<AIResponse>(cacheKey); // DÜZELTME: tipli cache get
        if (cached) {
          this.logger.log(`Cache hit for request: ${requestId}`);
          return cached;
        }
      }

      // Rate limiting kontrolü
      if (options.rateLimit !== false) {
        await this.checkRateLimit(normalizedRequest.userId);
      }

      // AI çağrısı
      const response = await this.makeAIRequest(normalizedRequest, options);

      // Cache'e kaydet
      if (options.cache !== false) {
        const cacheTTL = options.cacheTTL || this.aiConfig.getDefaultCacheTTL();
        await this.cache.set(this.generateCacheKey(normalizedRequest), response, cacheTTL);
      }

      // Logging
      const duration = Date.now() - startTime;
      this.logger.log(`AI request completed: ${requestId}`, {
        duration,
        tokens: response.usage.totalTokens,
        model: response.model,
      });

      return response;
    } catch (error) {
      this.logger.error(`AI request failed: ${requestId}`, {
        error: (error instanceof Error ? error.message : String(error)),
        model: normalizedRequest.model,
        userId: normalizedRequest.userId,
      });

      throw this.handleAIError(error as Error, requestId);
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
      const prompt = await this.promptRegistry.getPrompt(promptType, context);
      const model = this.aiConfig.getModelForPromptType(promptType);
      
      return this.generateContent({
        prompt,
        context,
        model,
        temperature: this.aiConfig.getTemperatureForPromptType(promptType),
        maxTokens: this.aiConfig.getMaxTokensForPromptType(promptType),
      }, options);
    } catch (error) {
      this.logger.error(`Prompt-based AI request failed: ${promptType}`, {
        error: (error instanceof Error ? error.message : String(error)),
        context,
      });
      throw error;
    }
  }

  /**
   * Retry mekanizması ile AI çağrısı
   */
  private async makeAIRequest(
    request: AIRequest,
    options: AIRequestOptions
  ): Promise<AIResponse> {
    const maxRetries = options.retries || this.aiConfig.getDefaultRetries();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: request.model || this.aiConfig.getDefaultModel(),
          messages: [
            {
              role: 'system',
              content: this.aiConfig.getSystemPrompt(),
            },
            {
              role: 'user',
              content: request.prompt,
            },
          ],
          temperature: request.temperature || this.aiConfig.getDefaultTemperature(),
          max_tokens: request.maxTokens || this.aiConfig.getDefaultMaxTokens(),
        });

        return {
          content: completion.choices[0]?.message?.content || '',
          usage: {
            promptTokens: completion.usage?.prompt_tokens || 0,
            completionTokens: completion.usage?.completion_tokens || 0,
            totalTokens: completion.usage?.total_tokens || 0,
          },
          model: completion.model,
          requestId: request.requestId || this.generateRequestId(),
          timestamp: new Date(),
        };
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          this.logger.warn(`AI request attempt ${attempt} failed, retrying in ${delay}ms`, {
            error: (error instanceof Error ? error.message : String(error)),
            attempt,
            maxRetries,
          });
          
          await this.sleep(delay);
        }
      }
    }

    throw (lastError ?? new Error('Unknown AI request error'));
  }

  /**
   * Rate limiting kontrolü
   */
  private async checkRateLimit(userId?: string): Promise<void> {
    if (!userId) return;

    const rateLimitKey = `ai:rate_limit:${userId}`;
    const currentCount = Number(await this.cache.get(rateLimitKey) || 0);
    const rateLimit = this.aiConfig.getRateLimit();

    if (currentCount >= rateLimit) {
      throw new BadRequestException('AI rate limit exceeded. Please try again later.');
    }

    // Rate limit counter'ı artır
    await this.cache.set(rateLimitKey, currentCount + 1, 3600); // 1 saat
  }

  /**
   * Cache key oluştur
   */
  private generateCacheKey(request: AIRequest): string {
    const hash = this.hashString(JSON.stringify({
      prompt: request.prompt,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    }));
    
    return `ai:cache:${hash}`;
  }

  /**
   * Request ID oluştur
   */
  private generateRequestId(): string {
    return `ai_${Date.now()}_${++this.requestCounter}`;
  }

  /**
   * Retry delay hesapla (exponential backoff)
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = 1000; // 1 saniye
    const maxDelay = 30000; // 30 saniye
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Jitter ekle (rastgele gecikme)
    const jitter = Math.random() * 1000;
    return delay + jitter;
  }

  /**
   * Sleep fonksiyonu
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * String hash fonksiyonu
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32-bit integer'a çevir
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * AI hatalarını işle
   */
  private handleAIError(error: any, requestId: string): Error {
    if (error.code === 'rate_limit_exceeded') {
      this.logger.warn(`Rate limit exceeded for request: ${requestId}`);
      return new BadRequestException('AI service rate limit exceeded. Please try again later.');
    }

    if (error.code === 'insufficient_quota') {
      this.logger.error(`Insufficient quota for request: ${requestId}`);
      return new InternalServerErrorException('AI service quota exceeded. Please contact support.');
    }

    if (error.code === 'invalid_api_key') {
      this.logger.error(`Invalid API key for request: ${requestId}`);
      return new InternalServerErrorException('AI service configuration error.');
    }

    if (error.code === 'context_length_exceeded') {
      this.logger.warn(`Context length exceeded for request: ${requestId}`);
      return new BadRequestException('Request too long. Please reduce the input size.');
    }

    // Genel hata
    this.logger.error(`Unexpected AI error for request: ${requestId}`, {
      code: error.code,
      message: error.message,
    });

    return new InternalServerErrorException('AI service temporarily unavailable. Please try again later.');
  }

  /**
   * AI servis durumu
   */
  async getServiceStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastRequest?: Date;
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
  }> {
    try {
      // Basit bir test çağrısı yap
      const testResponse = await this.openai.chat.completions.create({
        model: this.aiConfig.getDefaultModel(),
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      });

      return {
        status: 'healthy',
        totalRequests: this.requestCounter,
        averageResponseTime: 0, // TODO: Implement metrics
        errorRate: 0, // TODO: Implement metrics
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        totalRequests: this.requestCounter,
        averageResponseTime: 0,
        errorRate: 1,
      };
    }
  }

  /**
   * Kullanım istatistikleri
   */
  async getUsageStats(userId?: string): Promise<{
    totalRequests: number;
    totalTokens: number;
    averageTokensPerRequest: number;
    mostUsedModel: string;
    requestsToday: number;
  }> {
    // TODO: Implement usage tracking
    return {
      totalRequests: this.requestCounter,
      totalTokens: 0,
      averageTokensPerRequest: 0,
      mostUsedModel: this.aiConfig.getDefaultModel(),
      requestsToday: 0,
    };
  }

  /**
   * Reschedule önerileri oluştur
   */
  async generateRescheduleSuggestions(data: { planId: string; conflicts: any[]; performance: any; userId: string }): Promise<any> {
    try {
      const prompt = `Plan ID: ${data.planId}
Conflicts: ${JSON.stringify(data.conflicts)}
Performance: ${JSON.stringify(data.performance)}
User ID: ${data.userId}

Based on the conflicts and performance data, suggest reschedule options.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that helps with study plan rescheduling. Provide practical suggestions based on conflicts and performance data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      return {
        success: true,
        suggestions: response.choices[0]?.message?.content || 'No suggestions available',
        message: 'Reschedule suggestions generated successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to generate reschedule suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to generate reschedule suggestions');
    }
  }
}
