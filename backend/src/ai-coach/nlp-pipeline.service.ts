import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { AIService } from '../ai/ai.service';
import { PromptRegistry } from '../ai/prompt-registry.service'; // DÜZELTME: doğru sınıf adı
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface TextAnalysis {
  id: string;
  userId: string;
  text: string;
  language: string;
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
    compound: number;
  };
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
    anticipation: number;
    trust: number;
  };
  topics: {
    name: string;
    confidence: number;
    relevance: number;
  }[];
  keywords: {
    word: string;
    frequency: number;
    importance: number;
    sentiment: number;
  }[];
  entities: {
    name: string;
    type: string;
    confidence: number;
    sentiment: number;
  }[];
  intent: {
    primary: string;
    secondary: string[];
    confidence: number;
  };
  personality: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  learningStyle: {
    visual: number;
    auditory: number;
    kinesthetic: number;
    reading: number;
  };
  stressIndicators: {
    level: number;
    triggers: string[];
    copingStrategies: string[];
  };
  motivationFactors: {
    intrinsic: number;
    extrinsic: number;
    factors: string[];
  };
  confidence: number;
  createdAt: Date;
}

export interface NLPPipelineConfig {
  enableSentimentAnalysis: boolean;
  enableEmotionDetection: boolean;
  enableTopicModeling: boolean;
  enableEntityRecognition: boolean;
  enableIntentClassification: boolean;
  enablePersonalityAnalysis: boolean;
  enableLearningStyleDetection: boolean;
  enableStressDetection: boolean;
  enableMotivationAnalysis: boolean;
  language: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ProcessingResult {
  success: boolean;
  data?: TextAnalysis;
  error?: string;
  processingTime: number;
  confidence: number;
}

@Injectable()
export class NLPPipelineService implements OnModuleInit {
  private readonly logger = new Logger(NLPPipelineService.name);
  private readonly config: NLPPipelineConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly aiService: AIService,
    private readonly promptRegistry: PromptRegistry, // DÜZELTME
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.config = {
      enableSentimentAnalysis: true,
      enableEmotionDetection: true,
      enableTopicModeling: true,
      enableEntityRecognition: true,
      enableIntentClassification: true,
      enablePersonalityAnalysis: true,
      enableLearningStyleDetection: true,
      enableStressDetection: true,
      enableMotivationAnalysis: true,
      language: 'turkish',
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 2000,
    };
  }

  async onModuleInit() {
    this.logger.log('NLPPipelineService initialized');
  }

  /**
   * Metin analizi pipeline
   */
  async analyzeText(
    userId: string,
    text: string,
    context?: any
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Cache kontrolü
      const cacheKey = `nlp_analysis_${userId}_${this.hashText(text)}`;
      const cachedResult = await this.cache.get<TextAnalysis>(cacheKey); // DÜZELTME: tipli cache get
      
      if (cachedResult) {
        this.logger.log(`Using cached NLP analysis for user ${userId}`);
        return {
          success: true,
          data: cachedResult,
          processingTime: Date.now() - startTime,
          confidence: cachedResult?.confidence || 0.7,
        };
      }

      // AI ile kapsamlı metin analizi
      const prompt = await this.promptRegistry.getPrompt('comprehensive_text_analysis', {
        userId,
        text,
        context: JSON.stringify(context || {}),
        config: JSON.stringify(this.config),
        timestamp: new Date().toISOString(),
      });

      const aiResponse = await this.aiService.generateContent({ // DÜZELTME: AIRequest ile çağrı
        prompt,
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        userId,
      });

      const analysisData = this.parseAnalysisResponse(aiResponse.content); // DÜZELTME: string içerik parse
      
      if (!analysisData) {
        throw new Error('Failed to parse NLP analysis response');
      }

      // TextAnalysis objesi oluştur
      const textAnalysis: TextAnalysis = {
        id: `analysis_${userId}_${Date.now()}`,
        userId,
        text,
        language: this.config.language,
        sentiment: analysisData.sentiment || {
          positive: 0.5,
          negative: 0.5,
          neutral: 0.5,
          compound: 0.0,
        },
        emotions: analysisData.emotions || {
          joy: 0.5,
          sadness: 0.5,
          anger: 0.5,
          fear: 0.5,
          surprise: 0.5,
          disgust: 0.5,
          anticipation: 0.5,
          trust: 0.5,
        },
        topics: analysisData.topics || [],
        keywords: analysisData.keywords || [],
        entities: analysisData.entities || [],
        intent: analysisData.intent || {
          primary: 'unknown',
          secondary: [],
          confidence: 0.5,
        },
        personality: analysisData.personality || {
          openness: 0.5,
          conscientiousness: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          neuroticism: 0.5,
        },
        learningStyle: analysisData.learningStyle || {
          visual: 0.5,
          auditory: 0.5,
          kinesthetic: 0.5,
          reading: 0.5,
        },
        stressIndicators: analysisData.stressIndicators || {
          level: 0.5,
          triggers: [],
          copingStrategies: [],
        },
        motivationFactors: analysisData.motivationFactors || {
          intrinsic: 0.5,
          extrinsic: 0.5,
          factors: [],
        },
        confidence: analysisData.confidence || 0.7,
        createdAt: new Date(),
      };

      // Veritabanına kaydet
      await this.saveTextAnalysis(textAnalysis);

      // Cache'e kaydet
      await this.cache.set(cacheKey, textAnalysis, 3600); // 1 saat

      // Event emit
      this.eventEmitter.emit('nlp.analysis.completed', {
        userId,
        analysis: textAnalysis,
        timestamp: new Date(),
      });

      const processingTime = Date.now() - startTime;
      
      this.logger.log(`NLP analysis completed for user ${userId} in ${processingTime}ms`);
      
      return {
        success: true,
        data: textAnalysis,
        processingTime,
        confidence: textAnalysis.confidence,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.logger.error(`NLP analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        processingTime,
        confidence: 0,
      };
    }
  }

  /**
   * Toplu metin analizi
   */
  async analyzeBatchTexts(
    userId: string,
    texts: string[],
    context?: any
  ): Promise<ProcessingResult[]> {
    try {
      const results: ProcessingResult[] = [];
      
      for (const text of texts) {
        const result = await this.analyzeText(userId, text, context);
        results.push(result);
      }
      
      this.logger.log(`Batch NLP analysis completed for user ${userId}: ${results.length} texts`);
      return results;
    } catch (error) {
      this.logger.error(`Batch NLP analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      return [];
    }
  }

  /**
   * Metin önerisi oluştur
   */
  async generateTextRecommendation(
    userId: string,
    analysis: TextAnalysis,
    context?: any
  ): Promise<string | null> {
    try {
      const prompt = await this.promptRegistry.getPrompt('text_recommendation', {
        userId,
        analysis: JSON.stringify(analysis),
        context: JSON.stringify(context || {}),
        timestamp: new Date().toISOString(),
      });

      const aiResponse = await this.aiService.generateContent({
        prompt,
        model: this.config.model,
        temperature: 0.7,
        maxTokens: 500,
        userId,
      });

      this.logger.log(`Text recommendation generated for user ${userId}`);
      return aiResponse.content; // DÜZELTME: string döndür
    } catch (error) {
      this.logger.error(`Failed to generate text recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Metin sınıflandırma
   */
  async classifyText(
    text: string,
    categories: string[],
    context?: any
  ): Promise<{ category: string; confidence: number } | null> {
    try {
      const prompt = await this.promptRegistry.getPrompt('text_classification', {
        text,
        categories: JSON.stringify(categories),
        context: JSON.stringify(context || {}),
        timestamp: new Date().toISOString(),
      });

      const aiResponse = await this.aiService.generateContent({
        prompt,
        model: this.config.model,
        temperature: 0.1,
        maxTokens: 200,
      });

      const classification = JSON.parse(aiResponse.content); // DÜZELTME
      
      this.logger.log(`Text classified: ${classification.category}`);
      return classification;
    } catch (error) {
      this.logger.error(`Failed to classify text: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Metin özetleme
   */
  async summarizeText(
    text: string,
    maxLength: number = 200,
    context?: any
  ): Promise<string | null> {
    try {
      const prompt = await this.promptRegistry.getPrompt('text_summarization', {
        text,
        maxLength,
        context: JSON.stringify(context || {}),
        timestamp: new Date().toISOString(),
      });

      const aiResponse = await this.aiService.generateContent({
        prompt,
        model: this.config.model,
        temperature: 0.3,
        maxTokens: maxLength,
      });

      this.logger.log(`Text summarized: ${text.length} -> ${aiResponse.content.length} characters`); // DÜZELTME
      return aiResponse.content; // DÜZELTME
    } catch (error) {
      this.logger.error(`Failed to summarize text: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Metin benzerliği
   */
  async calculateTextSimilarity(
    text1: string,
    text2: string,
    context?: any
  ): Promise<number | null> {
    try {
      const prompt = await this.promptRegistry.getPrompt('text_similarity', {
        text1,
        text2,
        context: JSON.stringify(context || {}),
        timestamp: new Date().toISOString(),
      });

      const aiResponse = await this.aiService.generateContent({
        prompt,
        model: this.config.model,
        temperature: 0.1,
        maxTokens: 100,
      });

      const similarity = parseFloat(aiResponse.content); // DÜZELTME
      
      this.logger.log(`Text similarity calculated: ${similarity}`);
      return similarity;
    } catch (error) {
      this.logger.error(`Failed to calculate text similarity: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Yardımcı metodlar
   */
  private hashText(text: string): string {
    // Basit hash fonksiyonu
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer
    }
    return hash.toString();
  }

  private parseAnalysisResponse(aiResponse: string): any {
    try {
      return JSON.parse(aiResponse);
    } catch (error) {
      this.logger.error(`Failed to parse analysis response: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Veritabanı işlemleri
   */
  private async saveTextAnalysis(analysis: TextAnalysis): Promise<void> {
    try {
      await this.prisma.textAnalysis.create({
        data: analysis,
      });
    } catch (error) {
      this.logger.error(`Failed to save text analysis: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Günlük NLP analizi cron job
   */
  @Cron(CronExpression.EVERY_DAY_AT_10PM)
  async processDailyNLPData(): Promise<void> {
    try {
      // Son 24 saatteki metin verilerini analiz et
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const texts = await this.prisma.studentJournal.findMany({
        where: {
          createdAt: { gte: yesterday },
        },
        select: {
          id: true,
          userId: true,
          content: true,
        },
      });

      for (const text of texts) {
        await this.analyzeText(text.userId, text.content, {
          journalId: text.id,
          type: 'daily_analysis',
        });
      }

      this.logger.log(`Daily NLP processing completed: ${texts.length} texts analyzed`);
    } catch (error) {
      this.logger.error(`Failed to process daily NLP data: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Health check
   */
  getHealthStatus(): { status: 'healthy' | 'unhealthy' } {
    return { status: 'healthy' };
  }
}
