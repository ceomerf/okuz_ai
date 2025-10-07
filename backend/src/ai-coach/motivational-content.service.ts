import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { AIService } from '../ai/ai.service';
import { PromptRegistry } from '../ai/prompt-registry.service'; // DÜZELTME: doğru sınıf adı
import { EmotionalAIService } from './emotional-ai.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface MotivationalContent {
  id: string;
  userId: string;
  type: 'quote' | 'tip' | 'challenge' | 'reminder' | 'celebration' | 'encouragement';
  title: string;
  content: string;
  emotionalTone: 'uplifting' | 'calming' | 'energizing' | 'supportive' | 'challenging';
  targetEmotions: string[];
  context: {
    studySession?: string;
    subject?: string;
    difficulty?: number;
    timeOfDay?: string;
    recentPerformance?: any;
  };
  personalization: {
    learningStyle: string;
    personalityType: string;
    interests: string[];
    goals: string[];
  };
  effectiveness: {
    expectedImpact: number; // 1-10 scale
    confidence: number; // 0-1 scale
    targetOutcome: string;
  };
  delivery: {
    channel: 'push' | 'email' | 'websocket' | 'in_app';
    timing: 'immediate' | 'scheduled' | 'contextual';
    priority: 'low' | 'medium' | 'high' | 'urgent';
  };
  metadata: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface ContentTemplate {
  id: string;
  name: string;
  type: string;
  emotionalTone: string;
  template: string;
  variables: string[];
  conditions: {
    emotions: string[];
    contexts: string[];
    personalityTypes: string[];
  };
  effectiveness: number;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalizedRecommendation {
  id: string;
  userId: string;
  category: 'study' | 'motivation' | 'wellness' | 'social' | 'goal';
  title: string;
  description: string;
  actionItems: string[];
  emotionalSupport: {
    message: string;
    tone: string;
    encouragement: string[];
  };
  personalization: {
    basedOn: string[];
    adaptedFor: string[];
    reasoning: string;
  };
  expectedOutcome: {
    shortTerm: string;
    longTerm: string;
    metrics: string[];
  };
  confidence: number;
  urgency: 'low' | 'medium' | 'high';
  createdAt: Date;
}

@Injectable()
export class MotivationalContentService implements OnModuleInit {
  private readonly logger = new Logger(MotivationalContentService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly aiService: AIService,
    private readonly promptRegistry: PromptRegistry, // DÜZELTME
    private readonly emotionalAI: EmotionalAIService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('MotivationalContentService initialized');
  }

  /**
   * Öğrenciye uygun motivasyonel içerik oluştur
   */
  async generateMotivationalContent(
    userId: string,
    context: any,
    emotionalState?: any
  ): Promise<MotivationalContent | null> {
    try {
      // Öğrenci profili al
      const userProfile = await this.getUserProfile(userId);
      
      // Duygusal durum analizi
      const currentEmotionalState = emotionalState || await this.getCurrentEmotionalState(userId);
      
      // AI ile kişiselleştirilmiş içerik oluştur
      const prompt = await this.promptRegistry.getPrompt('motivational_content_generation', {
        userId,
        userProfile: JSON.stringify(userProfile),
        emotionalState: JSON.stringify(currentEmotionalState),
        context: JSON.stringify(context),
        timestamp: new Date().toISOString(),
      });

      const aiResponse = await this.aiService.generateContent({
        // DÜZELTME: AIRequest ile çağrı
        prompt,
        model: 'gpt-4',
        temperature: 0.8,
        maxTokens: 800,
        userId,
      });

      const contentData = this.parseContentResponse(aiResponse.content); // DÜZELTME
      
      if (!contentData) {
        this.logger.warn(`Failed to parse motivational content for user ${userId}`);
        return null;
      }

      // Motivasyonel içerik oluştur
      const motivationalContent: MotivationalContent = {
        id: `content_${userId}_${Date.now()}`,
        userId,
        type: contentData.type || 'encouragement',
        title: contentData.title || 'Motivational Message',
        content: contentData.content || 'You are doing great!',
        emotionalTone: contentData.emotionalTone || 'supportive',
        targetEmotions: contentData.targetEmotions || [],
        context: context || {},
        personalization: {
          learningStyle: userProfile.learningStyle || 'visual',
          personalityType: userProfile.personalityType || 'balanced',
          interests: userProfile.interests || [],
          goals: userProfile.goals || [],
        },
        effectiveness: {
          expectedImpact: contentData.expectedImpact || 7,
          confidence: contentData.confidence || 0.8,
          targetOutcome: contentData.targetOutcome || 'Increased motivation',
        },
        delivery: {
          channel: contentData.delivery?.channel || 'push',
          timing: contentData.delivery?.timing || 'contextual',
          priority: contentData.delivery?.priority || 'medium',
        },
        metadata: contentData.metadata || {},
        createdAt: new Date(),
        expiresAt: contentData.expiresAt ? new Date(contentData.expiresAt) : undefined,
      };

      // Veritabanına kaydet
      await this.saveMotivationalContent(motivationalContent);

      // Event emit
      this.eventEmitter.emit('motivational.content.generated', {
        userId,
        content: motivationalContent,
        timestamp: new Date(),
      });

      this.logger.log(`Motivational content generated for user ${userId}`);
      return motivationalContent;
    } catch (error) {
      this.logger.error(`Failed to generate motivational content: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Kişiselleştirilmiş öneri oluştur
   */
  async generatePersonalizedRecommendation(
    userId: string,
    category: 'study' | 'motivation' | 'wellness' | 'social' | 'goal',
    context: any
  ): Promise<PersonalizedRecommendation | null> {
    try {
      // Öğrenci profili ve geçmiş veriler
      const userProfile = await this.getUserProfile(userId);
      const emotionalHistory = await this.getEmotionalHistory(userId, 7); // Son 7 gün
      const studyHistory = await this.getStudyHistory(userId, 7);
      const performanceData = await this.getPerformanceData(userId, 7);

      // AI ile kişiselleştirilmiş öneri oluştur
      const prompt = await this.promptRegistry.getPrompt('personalized_recommendation', {
        userId,
        category,
        userProfile: JSON.stringify(userProfile),
        emotionalHistory: JSON.stringify(emotionalHistory),
        studyHistory: JSON.stringify(studyHistory),
        performanceData: JSON.stringify(performanceData),
        context: JSON.stringify(context),
        timestamp: new Date().toISOString(),
      });

      const aiResponse = await this.aiService.generateContent({
        prompt,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1200,
        userId,
      });

      const recommendationData = this.parseRecommendationResponse(aiResponse.content); // DÜZELTME
      
      if (!recommendationData) {
        this.logger.warn(`Failed to parse personalized recommendation for user ${userId}`);
        return null;
      }

      // Kişiselleştirilmiş öneri oluştur
      const recommendation: PersonalizedRecommendation = {
        id: `rec_${userId}_${Date.now()}`,
        userId,
        category,
        title: recommendationData.title || 'Personalized Recommendation',
        description: recommendationData.description || 'Here is a personalized recommendation for you.',
        actionItems: recommendationData.actionItems || [],
        emotionalSupport: {
          message: recommendationData.emotionalSupport?.message || 'You are doing great!',
          tone: recommendationData.emotionalSupport?.tone || 'supportive',
          encouragement: recommendationData.emotionalSupport?.encouragement || ['Keep going!'],
        },
        personalization: {
          basedOn: recommendationData.personalization?.basedOn || ['user profile'],
          adaptedFor: recommendationData.personalization?.adaptedFor || ['your learning style'],
          reasoning: recommendationData.personalization?.reasoning || 'Based on your recent performance and emotional state.',
        },
        expectedOutcome: {
          shortTerm: recommendationData.expectedOutcome?.shortTerm || 'Immediate improvement',
          longTerm: recommendationData.expectedOutcome?.longTerm || 'Long-term success',
          metrics: recommendationData.expectedOutcome?.metrics || ['motivation', 'performance'],
        },
        confidence: recommendationData.confidence || 0.8,
        urgency: recommendationData.urgency || 'medium',
        createdAt: new Date(),
      };

      // Veritabanına kaydet
      await this.savePersonalizedRecommendation(recommendation);

      this.logger.log(`Personalized recommendation generated for user ${userId}`);
      return recommendation;
    } catch (error) {
      this.logger.error(`Failed to generate personalized recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * İçerik şablonu oluştur
   */
  async createContentTemplate(
    name: string,
    type: string,
    emotionalTone: string,
    template: string,
    conditions: any
  ): Promise<ContentTemplate | null> {
    try {
      const contentTemplate: ContentTemplate = {
        id: `template_${Date.now()}`,
        name,
        type,
        emotionalTone,
        template,
        variables: this.extractVariables(template),
        conditions,
        effectiveness: 0.7,
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.saveContentTemplate(contentTemplate);
      
      this.logger.log(`Content template created: ${name}`);
      return contentTemplate;
    } catch (error) {
      this.logger.error(`Failed to create content template: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * İçerik etkinliğini ölç
   */
  async measureContentEffectiveness(contentId: string, feedback: any): Promise<void> {
    try {
      // Etkinlik verilerini güncelle
      await this.updateContentEffectiveness(contentId, feedback);
      
      this.logger.log(`Content effectiveness updated for ${contentId}`);
    } catch (error) {
      this.logger.error(`Failed to measure content effectiveness: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Yardımcı metodlar
   */
  private async getUserProfile(userId: string): Promise<any> {
    try {
      return await this.prisma.user.findUnique({
        where: { id: userId },
        // DÜZELTME: Prisma User modelinde preferences/goals yok; ilişkili alanlar çıkarıldı
      });
    } catch (error) {
      this.logger.error(`Failed to get user profile: ${error instanceof Error ? error.message : "Unknown error"}`);
      return {};
    }
  }

  private async getCurrentEmotionalState(userId: string): Promise<any> {
    try {
      return await this.prisma.emotionalState.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get current emotional state: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private async getEmotionalHistory(userId: string, days: number): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      return await this.prisma.emotionalState.findMany({
        where: {
          userId,
          date: { gte: startDate },
        },
        orderBy: { date: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get emotional history: ${error instanceof Error ? error.message : "Unknown error"}`);
      return [];
    }
  }

  private async getStudyHistory(userId: string, days: number): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      return await this.prisma.studySession.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get study history: ${error instanceof Error ? error.message : "Unknown error"}`);
      return [];
    }
  }

  private async getPerformanceData(userId: string, days: number): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      return await this.prisma.studentPerformanceHistory.findMany({
        where: {
          userId,
          date: { gte: startDate },
        },
        orderBy: { date: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get performance data: ${error instanceof Error ? error.message : "Unknown error"}`);
      return [];
    }
  }

  private parseContentResponse(aiResponse: string): any {
    try {
      return JSON.parse(aiResponse);
    } catch (error) {
      this.logger.error(`Failed to parse content response: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private parseRecommendationResponse(aiResponse: string): any {
    try {
      return JSON.parse(aiResponse);
    } catch (error) {
      this.logger.error(`Failed to parse recommendation response: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private extractVariables(template: string): string[] {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = variableRegex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  }

  /**
   * Veritabanı işlemleri
   */
  private async saveMotivationalContent(content: MotivationalContent): Promise<void> {
    try {
      await this.prisma.motivationalContent.create({
        data: content,
      });
    } catch (error) {
      this.logger.error(`Failed to save motivational content: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async savePersonalizedRecommendation(recommendation: PersonalizedRecommendation): Promise<void> {
    try {
      await this.prisma.personalizedRecommendation.create({
        data: recommendation,
      });
    } catch (error) {
      this.logger.error(`Failed to save personalized recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async saveContentTemplate(template: ContentTemplate): Promise<void> {
    try {
      await this.prisma.contentTemplate.create({
        data: template,
      });
    } catch (error) {
      this.logger.error(`Failed to save content template: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async updateContentEffectiveness(contentId: string, feedback: any): Promise<void> {
    try {
      await this.prisma.motivationalContent.update({
        where: { id: contentId },
        data: {
          effectiveness: {
            expectedImpact: feedback.impact || 7,
            confidence: feedback.confidence || 0.8,
            targetOutcome: feedback.outcome || 'Improved motivation',
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update content effectiveness: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Günlük motivasyonel içerik cron job
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async generateDailyMotivationalContent(): Promise<void> {
    try {
      // Aktif öğrenciler için günlük motivasyonel içerik oluştur
      const students = await this.prisma.user.findMany({
        where: {
          role: 'STUDENT',
        },
        select: { id: true },
      });

      for (const student of students) {
        await this.generateMotivationalContent(student.id, {
          timeOfDay: 'morning',
          type: 'daily_motivation',
        });
      }

      this.logger.log(`Daily motivational content generated for ${students.length} students`);
    } catch (error) {
      this.logger.error(`Failed to generate daily motivational content: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Health check
   */
  getHealthStatus(): { status: 'healthy' | 'unhealthy' } {
    return { status: 'healthy' };
  }
}
