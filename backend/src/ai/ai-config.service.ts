import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ModelConfig {
  name: string;
  maxTokens: number;
  costPerToken: number;
  capabilities: string[];
  temperature: number;
  timeout: number;
}

export interface PromptTypeConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  retries: number;
  cacheTTL: number;
}

@Injectable()
export class AIConfigService {
  private readonly logger = new Logger(AIConfigService.name);
  private readonly models: Map<string, ModelConfig> = new Map();
  private readonly promptTypeConfigs: Map<string, PromptTypeConfig> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeModels();
    this.initializePromptTypeConfigs();
  }

  /**
   * Model konfigürasyonlarını başlat
   */
  private initializeModels(): void {
    // GPT-4
    this.models.set('gpt-4', {
      name: 'gpt-4',
      maxTokens: 8192,
      costPerToken: 0.00003,
      capabilities: ['text', 'reasoning', 'analysis'],
      temperature: 0.7,
      timeout: 60000,
    });

    // GPT-4 Turbo
    this.models.set('gpt-4-turbo', {
      name: 'gpt-4-turbo',
      maxTokens: 128000,
      costPerToken: 0.00001,
      capabilities: ['text', 'reasoning', 'analysis', 'long_context'],
      temperature: 0.7,
      timeout: 60000,
    });

    // GPT-3.5 Turbo
    this.models.set('gpt-3.5-turbo', {
      name: 'gpt-3.5-turbo',
      maxTokens: 4096,
      costPerToken: 0.000002,
      capabilities: ['text', 'reasoning'],
      temperature: 0.7,
      timeout: 30000,
    });

    // GPT-3.5 Turbo 16K
    this.models.set('gpt-3.5-turbo-16k', {
      name: 'gpt-3.5-turbo-16k',
      maxTokens: 16384,
      costPerToken: 0.000003,
      capabilities: ['text', 'reasoning', 'long_context'],
      temperature: 0.7,
      timeout: 45000,
    });

    this.logger.log(`Initialized ${this.models.size} AI models`);
  }

  /**
   * Prompt type konfigürasyonlarını başlat
   */
  private initializePromptTypeConfigs(): void {
    // Plan generation
    this.promptTypeConfigs.set('plan_generation', {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 4000,
      timeout: 60000,
      retries: 3,
      cacheTTL: 3600, // 1 saat
    });

    // Plan optimization
    this.promptTypeConfigs.set('plan_optimization', {
      model: 'gpt-4',
      temperature: 0.5,
      maxTokens: 3000,
      timeout: 45000,
      retries: 2,
      cacheTTL: 1800, // 30 dakika
    });

    // Content generation
    this.promptTypeConfigs.set('content_generation', {
      model: 'gpt-3.5-turbo',
      temperature: 0.8,
      maxTokens: 2000,
      timeout: 30000,
      retries: 2,
      cacheTTL: 7200, // 2 saat
    });

    // Analysis
    this.promptTypeConfigs.set('analysis', {
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 2000,
      timeout: 45000,
      retries: 2,
      cacheTTL: 3600, // 1 saat
    });

    // Coaching
    this.promptTypeConfigs.set('coaching', {
      model: 'gpt-4',
      temperature: 0.6,
      maxTokens: 1500,
      timeout: 30000,
      retries: 2,
      cacheTTL: 1800, // 30 dakika
    });

    // Question solving
    this.promptTypeConfigs.set('question_solving', {
      model: 'gpt-4',
      temperature: 0.4,
      maxTokens: 3000,
      timeout: 45000,
      retries: 3,
      cacheTTL: 14400, // 4 saat
    });

    // Quick chat
    this.promptTypeConfigs.set('quick_chat', {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      timeout: 20000,
      retries: 1,
      cacheTTL: 600, // 10 dakika
    });

    this.logger.log(`Initialized ${this.promptTypeConfigs.size} prompt type configurations`);
  }

  /**
   * Varsayılan model
   */
  getDefaultModel(): string {
    return this.configService.get<string>('AI_DEFAULT_MODEL') || 'gpt-3.5-turbo';
  }

  /**
   * Varsayılan temperature
   */
  getDefaultTemperature(): number {
    return parseFloat(this.configService.get<string>('AI_DEFAULT_TEMPERATURE') || '0.7');
  }

  /**
   * Varsayılan max tokens
   */
  getDefaultMaxTokens(): number {
    return parseInt(this.configService.get<string>('AI_DEFAULT_MAX_TOKENS') || '2000');
  }

  /**
   * Varsayılan timeout
   */
  getDefaultTimeout(): number {
    return parseInt(this.configService.get<string>('AI_DEFAULT_TIMEOUT') || '30000');
  }

  /**
   * Varsayılan retry sayısı
   */
  getDefaultRetries(): number {
    return parseInt(this.configService.get<string>('AI_DEFAULT_RETRIES') || '2');
  }

  /**
   * Varsayılan cache TTL
   */
  getDefaultCacheTTL(): number {
    return parseInt(this.configService.get<string>('AI_DEFAULT_CACHE_TTL') || '1800');
  }

  /**
   * Rate limit
   */
  getRateLimit(): number {
    return parseInt(this.configService.get<string>('AI_RATE_LIMIT') || '100');
  }

  /**
   * System prompt
   */
  getSystemPrompt(): string {
    return this.configService.get<string>('AI_SYSTEM_PROMPT') || 
      'You are an AI assistant specialized in educational planning and learning optimization. Provide helpful, accurate, and personalized responses.';
  }

  /**
   * Prompt type için model
   */
  getModelForPromptType(promptType: string): string {
    const config = this.promptTypeConfigs.get(promptType);
    return config?.model || this.getDefaultModel();
  }

  /**
   * Prompt type için temperature
   */
  getTemperatureForPromptType(promptType: string): number {
    const config = this.promptTypeConfigs.get(promptType);
    return config?.temperature || this.getDefaultTemperature();
  }

  /**
   * Prompt type için max tokens
   */
  getMaxTokensForPromptType(promptType: string): number {
    const config = this.promptTypeConfigs.get(promptType);
    return config?.maxTokens || this.getDefaultMaxTokens();
  }

  /**
   * Prompt type için timeout
   */
  getTimeoutForPromptType(promptType: string): number {
    const config = this.promptTypeConfigs.get(promptType);
    return config?.timeout || this.getDefaultTimeout();
  }

  /**
   * Prompt type için retry sayısı
   */
  getRetriesForPromptType(promptType: string): number {
    const config = this.promptTypeConfigs.get(promptType);
    return config?.retries || this.getDefaultRetries();
  }

  /**
   * Prompt type için cache TTL
   */
  getCacheTTLForPromptType(promptType: string): number {
    const config = this.promptTypeConfigs.get(promptType);
    return config?.cacheTTL || this.getDefaultCacheTTL();
  }

  /**
   * Model konfigürasyonu getir
   */
  getModelConfig(modelName: string): ModelConfig | undefined {
    return this.models.get(modelName);
  }

  /**
   * Prompt type konfigürasyonu getir
   */
  getPromptTypeConfig(promptType: string): PromptTypeConfig | undefined {
    return this.promptTypeConfigs.get(promptType);
  }

  /**
   * Tüm modelleri getir
   */
  getAllModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  /**
   * Tüm prompt type konfigürasyonlarını getir
   */
  getAllPromptTypeConfigs(): Record<string, PromptTypeConfig> {
    const result: Record<string, PromptTypeConfig> = {};
    this.promptTypeConfigs.forEach((config, key) => {
      result[key] = config;
    });
    return result;
  }

  /**
   * Model maliyeti hesapla
   */
  calculateCost(modelName: string, tokens: number): number {
    const model = this.getModelConfig(modelName);
    if (!model) return 0;
    
    return tokens * model.costPerToken;
  }

  /**
   * Prompt type için toplam maliyet hesapla
   */
  calculatePromptTypeCost(promptType: string, tokens: number): number {
    const model = this.getModelForPromptType(promptType);
    return this.calculateCost(model, tokens);
  }

  /**
   * Model önerisi (kullanım durumuna göre)
   */
  recommendModel(useCase: string, requirements: {
    maxTokens?: number;
    temperature?: number;
    budget?: number;
    speed?: 'fast' | 'balanced' | 'quality';
  }): string {
    const { maxTokens = 2000, temperature = 0.7, budget, speed = 'balanced' } = requirements;

    // Hızlı yanıt gerekli
    if (speed === 'fast') {
      return 'gpt-3.5-turbo';
    }

    // Yüksek kalite gerekli
    if (speed === 'quality' || maxTokens > 4000) {
      return 'gpt-4';
    }

    // Uzun context gerekli
    if (maxTokens > 8000) {
      return 'gpt-4-turbo';
    }

    // Bütçe kısıtı var
    if (budget && budget < 0.01) {
      return 'gpt-3.5-turbo';
    }

    // Varsayılan
    return 'gpt-3.5-turbo';
  }

  /**
   * Model performansı değerlendir
   */
  evaluateModelPerformance(modelName: string, metrics: {
    responseTime: number;
    successRate: number;
    cost: number;
    quality: number;
  }): {
    score: number;
    recommendation: string;
  } {
    const { responseTime, successRate, cost, quality } = metrics;
    
    // Performans skoru hesapla (0-100)
    const timeScore = Math.max(0, 100 - (responseTime / 1000)); // Saniye cinsinden
    const successScore = successRate * 100;
    const costScore = Math.max(0, 100 - (cost * 10000)); // Cost'u normalize et
    const qualityScore = quality * 100;
    
    const totalScore = (timeScore + successScore + costScore + qualityScore) / 4;
    
    let recommendation = 'good';
    if (totalScore < 50) {
      recommendation = 'poor';
    } else if (totalScore < 75) {
      recommendation = 'fair';
    } else if (totalScore < 90) {
      recommendation = 'good';
    } else {
      recommendation = 'excellent';
    }

    return {
      score: Math.round(totalScore),
      recommendation,
    };
  }

  /**
   * Konfigürasyonu güncelle
   */
  updatePromptTypeConfig(promptType: string, config: Partial<PromptTypeConfig>): void {
    const existing = this.promptTypeConfigs.get(promptType);
    if (existing) {
      this.promptTypeConfigs.set(promptType, { ...existing, ...config });
      this.logger.log(`Updated prompt type config: ${promptType}`);
    } else {
      this.logger.warn(`Prompt type not found: ${promptType}`);
    }
  }

  /**
   * Yeni prompt type ekle
   */
  addPromptTypeConfig(promptType: string, config: PromptTypeConfig): void {
    this.promptTypeConfigs.set(promptType, config);
    this.logger.log(`Added new prompt type config: ${promptType}`);
  }

  /**
   * Konfigürasyonu sıfırla
   */
  resetToDefaults(): void {
    this.initializeModels();
    this.initializePromptTypeConfigs();
    this.logger.log('AI configuration reset to defaults');
  }
}
