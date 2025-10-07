import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { AIService } from '../ai/ai.service';
import { PromptRegistry } from '../ai/prompt-registry.service';
import { EmotionalAIService } from './emotional-ai.service';
import { MotivationalContentService } from './motivational-content.service';
import { NLPPipelineService } from './nlp-pipeline.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface ContextAwareRecommendation {
  id: string;
  userId: string;
  context: {
    currentActivity: string;
    emotionalState: any;
    studySession: any;
    timeOfDay: string;
    recentPerformance: any;
    learningGoals: string[];
    preferences: any;
  };
  recommendation: {
    type: 'study' | 'motivation' | 'wellness' | 'social' | 'goal' | 'break';
    title: string;
    description: string;
    actionItems: string[];
    expectedOutcome: string;
    confidence: number;
    urgency: 'low' | 'medium' | 'high' | 'urgent';
  };
  personalization: {
    basedOn: string[];
    adaptedFor: string[];
    reasoning: string;
    emotionalSupport: string;
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

export interface FunctionCall {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface FunctionResult {
  functionName: string;
  result: any;
  success: boolean;
  error?: string;
  executionTime: number;
}

@Injectable()
export class ContextAwareCoachingService implements OnModuleInit {
  private readonly logger = new Logger(ContextAwareCoachingService.name);
  private readonly availableFunctions: FunctionCall[];

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly aiService: AIService,
    private readonly promptRegistry: PromptRegistry,
    private readonly emotionalAI: EmotionalAIService,
    private readonly motivationalContent: MotivationalContentService,
    private readonly nlpPipeline: NLPPipelineService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.availableFunctions = this.initializeFunctions();
  }

  async onModuleInit() {
    this.logger.log('ContextAwareCoachingService initialized');
  }

  /**
   * Context-aware öneri oluştur
   */
  async generateContextAwareRecommendation(
    userId: string,
    context: any
  ): Promise<ContextAwareRecommendation | null> {
    try {
      // Kullanıcı bağlamını topla
      const userContext = await this.gatherUserContext(userId, context);
      
      // AI function calling ile öneri oluştur
      const prompt = await this.promptRegistry.getPrompt('context_aware_coaching', {
        userId,
        context: JSON.stringify(userContext),
        availableFunctions: JSON.stringify(this.availableFunctions),
        timestamp: new Date().toISOString(),
      });

      const aiResponse = await (this.aiService as any).generateContentWithFunctions?.(
        prompt,
        this.availableFunctions,
        {
          temperature: 0.7,
          maxTokens: 1500,
        }
      ) ?? await this.aiService.generateContent({ prompt, temperature: 0.7, maxTokens: 1500 });

      const recommendationData = this.parseRecommendationResponse(aiResponse);
      
      if (!recommendationData) {
        this.logger.warn(`Failed to parse context-aware recommendation for user ${userId}`);
        return null;
      }

      // Context-aware öneri oluştur
      const recommendation: ContextAwareRecommendation = {
        id: `rec_${userId}_${Date.now()}`,
        userId,
        context: userContext,
        recommendation: {
          type: recommendationData.type || 'study',
          title: recommendationData.title || 'Personalized Recommendation',
          description: recommendationData.description || 'Here is a personalized recommendation for you.',
          actionItems: recommendationData.actionItems || [],
          expectedOutcome: recommendationData.expectedOutcome || 'Improved performance',
          confidence: recommendationData.confidence || 0.8,
          urgency: recommendationData.urgency || 'medium',
        },
        personalization: {
          basedOn: recommendationData.personalization?.basedOn || ['user profile'],
          adaptedFor: recommendationData.personalization?.adaptedFor || ['your learning style'],
          reasoning: recommendationData.personalization?.reasoning || 'Based on your current context and emotional state.',
          emotionalSupport: recommendationData.personalization?.emotionalSupport || 'You are doing great!',
        },
        delivery: {
          channel: recommendationData.delivery?.channel || 'push',
          timing: recommendationData.delivery?.timing || 'contextual',
          priority: recommendationData.delivery?.priority || 'medium',
        },
        metadata: recommendationData.metadata || {},
        createdAt: new Date(),
        expiresAt: recommendationData.expiresAt ? new Date(recommendationData.expiresAt) : undefined,
      };

      // Veritabanına kaydet
      await this.saveContextAwareRecommendation(recommendation);

      // Event emit
      this.eventEmitter.emit('context.aware.recommendation.generated', {
        userId,
        recommendation,
        timestamp: new Date(),
      });

      this.logger.log(`Context-aware recommendation generated for user ${userId}`);
      return recommendation;
    } catch (error) {
      this.logger.error(`Failed to generate context-aware recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Function calling ile öneri oluştur
   */
  async generateRecommendationWithFunctionCalling(
    userId: string,
    context: any
  ): Promise<ContextAwareRecommendation | null> {
    try {
      // Kullanıcı bağlamını topla
      const userContext = await this.gatherUserContext(userId, context);
      
      // AI function calling ile öneri oluştur
      const prompt = await this.promptRegistry.getPrompt('function_calling_coaching', {
        userId,
        context: JSON.stringify(userContext),
        availableFunctions: JSON.stringify(this.availableFunctions),
        timestamp: new Date().toISOString(),
      });

      const aiResponse = await (this.aiService as any).generateContentWithFunctions?.(
        prompt,
        this.availableFunctions,
        {
          temperature: 0.7,
          maxTokens: 1500,
        }
      ) ?? await this.aiService.generateContent({ prompt, temperature: 0.7, maxTokens: 1500 });

      // Function calls'ları işle
      const functionResults = await this.executeFunctionCalls((aiResponse as any).functionCalls || []);
      
      // Sonuçları birleştir
      const recommendation = await this.synthesizeRecommendation(
        userId,
        userContext,
        functionResults
      );

      this.logger.log(`Function calling recommendation generated for user ${userId}`);
      return recommendation;
    } catch (error) {
      this.logger.error(`Failed to generate function calling recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Function calls'ları çalıştır
   */
  private async executeFunctionCalls(functionCalls: any[]): Promise<FunctionResult[]> {
    const results: FunctionResult[] = [];
    
    for (const functionCall of functionCalls) {
      const startTime = Date.now();
      
      try {
        const result = await this.executeFunction(functionCall);
        
        results.push({
          functionName: functionCall.name,
          result,
          success: true,
          executionTime: Date.now() - startTime,
        });
      } catch (error) {
        results.push({
          functionName: functionCall.name,
          result: null,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          executionTime: Date.now() - startTime,
        });
      }
    }
    
    return results;
  }

  /**
   * Function çalıştır
   */
  private async executeFunction(functionCall: any): Promise<any> {
    const { name, arguments: args } = functionCall;
    
    switch (name) {
      case 'analyze_emotional_state':
        return await this.analyzeEmotionalState(args.userId, args.text);
      
      case 'generate_motivational_content':
        return await this.generateMotivationalContent(args.userId, args.context);
      
      case 'analyze_study_performance':
        return await this.analyzeStudyPerformance(args.userId, args.period);
      
      case 'get_learning_recommendations':
        return await this.getLearningRecommendations(args.userId, args.subject);
      
      case 'assess_wellness_needs':
        return await this.assessWellnessNeeds(args.userId, args.context);
      
      case 'generate_goal_suggestions':
        return await this.generateGoalSuggestions(args.userId, args.currentGoals);
      
      case 'analyze_social_patterns':
        return await this.analyzeSocialPatterns(args.userId, args.period);
      
      case 'recommend_break_activities':
        return await this.recommendBreakActivities(args.userId, args.context);
      
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  /**
   * Function implementations
   */
  private async analyzeEmotionalState(userId: string, text: string): Promise<any> {
    try {
      const analysis = await this.nlpPipeline.analyzeText(userId, text);
      return analysis.data;
    } catch (error) {
      this.logger.error(`Failed to analyze emotional state: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private async generateMotivationalContent(userId: string, context: any): Promise<any> {
    try {
      const content = await this.motivationalContent.generateMotivationalContent(userId, context);
      return content;
    } catch (error) {
      this.logger.error(`Failed to generate motivational content: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private async analyzeStudyPerformance(userId: string, period: string): Promise<any> {
    try {
      const performance = await this.prisma.studentPerformanceHistory.findMany({
        where: {
          userId,
          date: {
            gte: new Date(Date.now() - this.getPeriodDays(period) * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { date: 'desc' },
      });
      
      return {
        period,
        performance,
        averageScore: performance.reduce((sum, p: any) => sum + ((p as any).averageScore ?? 0), 0) / Math.max(performance.length, 1),
        trend: this.calculateTrend(performance),
      };
    } catch (error) {
      this.logger.error(`Failed to analyze study performance: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private async getLearningRecommendations(userId: string, subject: string): Promise<any> {
    try {
      const recommendations = await this.prisma.coachingRecommendation.findMany({
        where: {
          userId,
          type: 'study_focus',
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      
      return {
        subject,
        recommendations,
        personalized: true,
      };
    } catch (error) {
      this.logger.error(`Failed to get learning recommendations: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private async assessWellnessNeeds(userId: string, context: any): Promise<any> {
    try {
      const emotionalState = (this.emotionalAI as any)?.getCurrentEmotionalState
        ? await (this.emotionalAI as any).getCurrentEmotionalState(userId)
        : await this.prisma.emotionalState.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
      const stressLevel = emotionalState?.stressLevel || 0.5;
      
      return {
        stressLevel,
        needs: stressLevel > 0.7 ? ['relaxation', 'break', 'support'] : ['maintenance', 'growth'],
        recommendations: stressLevel > 0.7 ? 
          ['Take a break', 'Practice breathing', 'Listen to music'] :
          ['Continue current routine', 'Set new goals', 'Celebrate progress'],
      };
    } catch (error) {
      this.logger.error(`Failed to assess wellness needs: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private async generateGoalSuggestions(userId: string, currentGoals: string[]): Promise<any> {
    try {
      const userProfile = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      
      return {
        currentGoals,
        suggestions: [
          'Improve study consistency',
          'Master difficult concepts',
          'Build confidence',
          'Develop better habits',
        ],
        personalized: true,
      };
    } catch (error) {
      this.logger.error(`Failed to generate goal suggestions: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private async analyzeSocialPatterns(userId: string, period: string): Promise<any> {
    try {
      const socialData = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          socialInteractions: true,
        },
      });
      
      return {
        period,
        socialActivity: socialData?.socialInteractions?.length || 0,
        patterns: ['collaborative', 'independent', 'mixed'],
        recommendations: ['Join study groups', 'Find study partners', 'Participate in discussions'],
      };
    } catch (error) {
      this.logger.error(`Failed to analyze social patterns: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private async recommendBreakActivities(userId: string, context: any): Promise<any> {
    try {
      const userProfile = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      
      return {
        activities: [
          'Take a walk',
          'Listen to music',
          'Do some stretching',
          'Have a healthy snack',
          'Practice mindfulness',
        ],
        personalized: true,
        duration: '5-15 minutes',
      };
    } catch (error) {
      this.logger.error(`Failed to recommend break activities: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Yardımcı metodlar
   */
  private async gatherUserContext(userId: string, context: any): Promise<any> {
    try {
      const userProfile = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          studyGoals: true,
          emotionalStates: {
            orderBy: { date: 'desc' },
            take: 1,
          },
          studySessions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });
      
      return {
        userProfile,
        context,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to gather user context: ${error instanceof Error ? error.message : "Unknown error"}`);
      return {};
    }
  }

  private parseRecommendationResponse(aiResponse: any): any {
    try {
      return typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
    } catch (error) {
      this.logger.error(`Failed to parse recommendation response: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private async synthesizeRecommendation(
    userId: string,
    context: any,
    functionResults: FunctionResult[]
  ): Promise<ContextAwareRecommendation | null> {
    try {
      // Function results'ları birleştir
      const synthesis = await this.aiService.generateContent({
        prompt: await this.promptRegistry.getPrompt('recommendation_synthesis', {
          userId,
          context: JSON.stringify(context),
          functionResults: JSON.stringify(functionResults),
          timestamp: new Date().toISOString(),
        }),
        temperature: 0.7,
        maxTokens: 1000,
      });

      const recommendationData = typeof synthesis === 'string' ? JSON.parse(synthesis) : synthesis;
      
      return {
        id: `rec_${userId}_${Date.now()}`,
        userId,
        context,
        recommendation: recommendationData.recommendation,
        personalization: recommendationData.personalization,
        delivery: recommendationData.delivery,
        metadata: recommendationData.metadata,
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to synthesize recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private getPeriodDays(period: string): number {
    switch (period) {
      case 'daily': return 1;
      case 'weekly': return 7;
      case 'monthly': return 30;
      default: return 7;
    }
  }

  private calculateTrend(performance: any[]): string {
    if (performance.length < 2) return 'stable';
    
    const recent = performance.slice(0, Math.ceil(performance.length / 2));
    const older = performance.slice(Math.ceil(performance.length / 2));
    
    const recentAvg = recent.reduce((sum, p) => sum + p.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.score, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.1) return 'improving';
    if (recentAvg < olderAvg * 0.9) return 'declining';
    return 'stable';
  }

  /**
   * Function definitions
   */
  private initializeFunctions(): FunctionCall[] {
    return [
      {
        name: 'analyze_emotional_state',
        description: 'Analyze the emotional state of a student based on their text input',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            text: { type: 'string', description: 'Text to analyze' },
          },
          required: ['userId', 'text'],
        },
      },
      {
        name: 'generate_motivational_content',
        description: 'Generate motivational content for a student',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            context: { type: 'object', description: 'Context information' },
          },
          required: ['userId', 'context'],
        },
      },
      {
        name: 'analyze_study_performance',
        description: 'Analyze study performance for a given period',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'Analysis period' },
          },
          required: ['userId', 'period'],
        },
      },
      {
        name: 'get_learning_recommendations',
        description: 'Get personalized learning recommendations for a subject',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            subject: { type: 'string', description: 'Subject to get recommendations for' },
          },
          required: ['userId', 'subject'],
        },
      },
      {
        name: 'assess_wellness_needs',
        description: 'Assess wellness needs based on current context',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            context: { type: 'object', description: 'Current context' },
          },
          required: ['userId', 'context'],
        },
      },
      {
        name: 'generate_goal_suggestions',
        description: 'Generate personalized goal suggestions',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            currentGoals: { type: 'array', items: { type: 'string' }, description: 'Current goals' },
          },
          required: ['userId', 'currentGoals'],
        },
      },
      {
        name: 'analyze_social_patterns',
        description: 'Analyze social interaction patterns',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'Analysis period' },
          },
          required: ['userId', 'period'],
        },
      },
      {
        name: 'recommend_break_activities',
        description: 'Recommend break activities based on context',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            context: { type: 'object', description: 'Current context' },
          },
          required: ['userId', 'context'],
        },
      },
    ];
  }

  /**
   * Veritabanı işlemleri
   */
  private async saveContextAwareRecommendation(recommendation: ContextAwareRecommendation): Promise<void> {
    try {
      await this.prisma.contextAwareRecommendation.create({
        data: recommendation,
      });
    } catch (error) {
      this.logger.error(`Failed to save context-aware recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Günlük context-aware öneri cron job
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async generateDailyContextAwareRecommendations(): Promise<void> {
    try {
      // Aktif öğrenciler için günlük context-aware öneri oluştur
      const students = await this.prisma.user.findMany({
        where: {
          role: 'STUDENT',
        },
        select: { id: true },
      });

      for (const student of students) {
        await this.generateContextAwareRecommendation(student.id, {
          timeOfDay: 'morning',
          type: 'daily_recommendation',
        });
      }

      this.logger.log(`Daily context-aware recommendations generated for ${students.length} students`);
    } catch (error) {
      this.logger.error(`Failed to generate daily context-aware recommendations: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Health check
   */
  getHealthStatus(): { status: 'healthy' | 'unhealthy' } {
    return { status: 'healthy' };
  }
}
