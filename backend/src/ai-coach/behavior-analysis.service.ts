import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { AIService } from '../ai/ai.service';
import { PromptRegistry } from '../ai/prompt-registry.service';
import { EmotionalAIService } from './emotional-ai.service';
import { MotivationalContentService } from './motivational-content.service';
import { NLPPipelineService } from './nlp-pipeline.service';
import { ContextAwareCoachingService } from './context-aware-coaching.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface BehaviorPattern {
  id: string;
  userId: string;
  patternType: 'study' | 'emotional' | 'social' | 'wellness' | 'goal' | 'motivation';
  name: string;
  description: string;
  frequency: number; // 0-1 scale
  consistency: number; // 0-1 scale
  intensity: number; // 0-1 scale
  triggers: string[];
  outcomes: string[];
  positiveImpact: number; // 0-1 scale
  negativeImpact: number; // 0-1 scale
  recommendations: string[];
  confidence: number; // 0-1 scale
  period: {
    startDate: Date;
    endDate: Date;
    duration: number; // days
  };
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BehaviorInsight {
  id: string;
  userId: string;
  insightType: 'pattern' | 'trend' | 'anomaly' | 'correlation' | 'prediction';
  title: string;
  description: string;
  data: {
    patterns: BehaviorPattern[];
    trends: any[];
    anomalies: any[];
    correlations: any[];
    predictions: any[];
  };
  significance: number; // 0-1 scale
  actionable: boolean;
  recommendations: string[];
  expectedImpact: number; // 0-1 scale
  confidence: number; // 0-1 scale
  period: {
    startDate: Date;
    endDate: Date;
  };
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface BehaviorPrediction {
  id: string;
  userId: string;
  predictionType: 'performance' | 'emotional' | 'motivation' | 'engagement' | 'risk';
  title: string;
  description: string;
  prediction: {
    value: number;
    confidence: number;
    timeframe: string;
    factors: string[];
  };
  recommendations: {
    preventive: string[];
    supportive: string[];
    corrective: string[];
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  expectedOutcome: string;
  confidence: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface BehaviorRecommendation {
  id: string;
  userId: string;
  category: 'study' | 'emotional' | 'social' | 'wellness' | 'goal' | 'motivation';
  title: string;
  description: string;
  actionItems: string[];
  expectedOutcome: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  personalization: {
    basedOn: string[];
    adaptedFor: string[];
    reasoning: string;
  };
  implementation: {
    steps: string[];
    timeline: string;
    resources: string[];
    support: string[];
  };
  monitoring: {
    metrics: string[];
    frequency: string;
    alerts: string[];
  };
  confidence: number;
  expectedImpact: number;
  createdAt: Date;
  expiresAt?: Date;
}

@Injectable()
export class BehaviorAnalysisService implements OnModuleInit {
  private readonly logger = new Logger(BehaviorAnalysisService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly aiService: AIService,
    private readonly promptRegistry: PromptRegistry,
    private readonly emotionalAI: EmotionalAIService,
    private readonly motivationalContent: MotivationalContentService,
    private readonly nlpPipeline: NLPPipelineService,
    private readonly contextAwareCoaching: ContextAwareCoachingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('BehaviorAnalysisService initialized');
  }

  /**
   * Davranış analizi yap
   */
  async analyzeBehavior(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date
  ): Promise<BehaviorInsight | null> {
    try {
      // Veri toplama
      const behaviorData = await this.gatherBehaviorData(userId, startDate, endDate);
      
      if (!behaviorData || Object.keys(behaviorData).length === 0) {
        this.logger.warn(`No behavior data found for user ${userId} in period ${period}`);
        return null;
      }

      // AI ile davranış analizi
      const prompt = await this.promptRegistry.getPrompt('behavior_analysis', {
        userId,
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        behaviorData: JSON.stringify(behaviorData),
        timestamp: new Date().toISOString(),
      });

      const aiResponse = await this.aiService.generateContent(
        { prompt, temperature: 0.3, maxTokens: 2000 }
      );

      const analysisText = typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse);
      const analysisData = this.parseBehaviorAnalysis(analysisText);
      
      if (!analysisData) {
        this.logger.warn(`Failed to parse behavior analysis for user ${userId}`);
        return null;
      }

      // Davranış içgörüsü oluştur
      const insight: BehaviorInsight = {
        id: `insight_${userId}_${startDate.getTime()}`,
        userId,
        insightType: analysisData.insightType || 'pattern',
        title: analysisData.title || 'Behavior Analysis',
        description: analysisData.description || 'Behavior analysis completed',
        data: {
          patterns: analysisData.patterns || [],
          trends: analysisData.trends || [],
          anomalies: analysisData.anomalies || [],
          correlations: analysisData.correlations || [],
          predictions: analysisData.predictions || [],
        },
        significance: analysisData.significance || 0.7,
        actionable: analysisData.actionable || true,
        recommendations: analysisData.recommendations || [],
        expectedImpact: analysisData.expectedImpact || 0.7,
        confidence: analysisData.confidence || 0.8,
        period: { startDate, endDate },
        metadata: analysisData.metadata || {},
        createdAt: new Date(),
      };

      // Veritabanına kaydet
      await this.saveBehaviorInsight(insight);

      // Event emit
      this.eventEmitter.emit('behavior.analysis.completed', {
        userId,
        insight,
        timestamp: new Date(),
      });

      this.logger.log(`Behavior analysis completed for user ${userId}`);
      return insight;
    } catch (error) {
      this.logger.error(`Failed to analyze behavior: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Davranış tahmini yap
   */
  async predictBehavior(
    userId: string,
    predictionType: 'performance' | 'emotional' | 'motivation' | 'engagement' | 'risk',
    timeframe: string
  ): Promise<BehaviorPrediction | null> {
    try {
      // Geçmiş veri analizi
      const historicalData = await this.getHistoricalBehaviorData(userId, 30); // Son 30 gün
      
      if (!historicalData || historicalData.length === 0) {
        this.logger.warn(`No historical data found for user ${userId}`);
        return null;
      }

      // AI ile davranış tahmini
      const prompt = await this.promptRegistry.getPrompt('behavior_prediction', {
        userId,
        predictionType,
        timeframe,
        historicalData: JSON.stringify(historicalData),
        timestamp: new Date().toISOString(),
      });

      const aiResponse = await this.aiService.generateContent(
        { prompt, temperature: 0.3, maxTokens: 1500 }
      );

      const predictionText = typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse);
      const predictionData = this.parseBehaviorPrediction(predictionText);
      
      if (!predictionData) {
        this.logger.warn(`Failed to parse behavior prediction for user ${userId}`);
        return null;
      }

      // Davranış tahmini oluştur
      const prediction: BehaviorPrediction = {
        id: `prediction_${userId}_${Date.now()}`,
        userId,
        predictionType,
        title: predictionData.title || 'Behavior Prediction',
        description: predictionData.description || 'Behavior prediction completed',
        prediction: {
          value: predictionData.prediction?.value || 0.5,
          confidence: predictionData.prediction?.confidence || 0.7,
          timeframe,
          factors: predictionData.prediction?.factors || [],
        },
        recommendations: {
          preventive: predictionData.recommendations?.preventive || [],
          supportive: predictionData.recommendations?.supportive || [],
          corrective: predictionData.recommendations?.corrective || [],
        },
        riskLevel: predictionData.riskLevel || 'medium',
        expectedOutcome: predictionData.expectedOutcome || 'Stable behavior',
        confidence: predictionData.confidence || 0.7,
        period: {
          startDate: new Date(),
          endDate: new Date(Date.now() + this.getTimeframeDays(timeframe) * 24 * 60 * 60 * 1000),
        },
        metadata: predictionData.metadata || {},
        createdAt: new Date(),
      };

      // Veritabanına kaydet
      await this.saveBehaviorPrediction(prediction);

      this.logger.log(`Behavior prediction completed for user ${userId}`);
      return prediction;
    } catch (error) {
      this.logger.error(`Failed to predict behavior: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Davranış önerisi oluştur
   */
  async generateBehaviorRecommendation(
    userId: string,
    category: 'study' | 'emotional' | 'social' | 'wellness' | 'goal' | 'motivation',
    context: any
  ): Promise<BehaviorRecommendation | null> {
    try {
      // Kullanıcı profili ve davranış verileri
      const userProfile = await this.getUserProfile(userId);
      const behaviorInsights = await this.getRecentBehaviorInsights(userId, 7);
      const behaviorPredictions = await this.getRecentBehaviorPredictions(userId, 7);

      // AI ile davranış önerisi oluştur
      const prompt = await this.promptRegistry.getPrompt('behavior_recommendation', {
        userId,
        category,
        userProfile: JSON.stringify(userProfile),
        behaviorInsights: JSON.stringify(behaviorInsights),
        behaviorPredictions: JSON.stringify(behaviorPredictions),
        context: JSON.stringify(context),
        timestamp: new Date().toISOString(),
      });

      const aiResponse = await this.aiService.generateContent(
        { prompt, temperature: 0.7, maxTokens: 1500 }
      );

      const recText = typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse);
      const recommendationData = this.parseBehaviorRecommendation(recText);
      
      if (!recommendationData) {
        this.logger.warn(`Failed to parse behavior recommendation for user ${userId}`);
        return null;
      }

      // Davranış önerisi oluştur
      const recommendation: BehaviorRecommendation = {
        id: `rec_${userId}_${Date.now()}`,
        userId,
        category,
        title: recommendationData.title || 'Behavior Recommendation',
        description: recommendationData.description || 'Here is a personalized behavior recommendation.',
        actionItems: recommendationData.actionItems || [],
        expectedOutcome: recommendationData.expectedOutcome || 'Improved behavior',
        priority: recommendationData.priority || 'medium',
        urgency: recommendationData.urgency || 'medium',
        personalization: {
          basedOn: recommendationData.personalization?.basedOn || ['behavior analysis'],
          adaptedFor: recommendationData.personalization?.adaptedFor || ['your profile'],
          reasoning: recommendationData.personalization?.reasoning || 'Based on your behavior patterns.',
        },
        implementation: {
          steps: recommendationData.implementation?.steps || [],
          timeline: recommendationData.implementation?.timeline || '1-2 weeks',
          resources: recommendationData.implementation?.resources || [],
          support: recommendationData.implementation?.support || [],
        },
        monitoring: {
          metrics: recommendationData.monitoring?.metrics || [],
          frequency: recommendationData.monitoring?.frequency || 'daily',
          alerts: recommendationData.monitoring?.alerts || [],
        },
        confidence: recommendationData.confidence || 0.8,
        expectedImpact: recommendationData.expectedImpact || 0.7,
        createdAt: new Date(),
        expiresAt: recommendationData.expiresAt ? new Date(recommendationData.expiresAt) : undefined,
      };

      // Veritabanına kaydet
      await this.saveBehaviorRecommendation(recommendation);

      this.logger.log(`Behavior recommendation generated for user ${userId}`);
      return recommendation;
    } catch (error) {
      this.logger.error(`Failed to generate behavior recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Davranış deseni tespit et
   */
  async detectBehaviorPattern(
    userId: string,
    patternType: 'study' | 'emotional' | 'social' | 'wellness' | 'goal' | 'motivation',
    period: { startDate: Date; endDate: Date }
  ): Promise<BehaviorPattern | null> {
    try {
      // Dönem verilerini al
      const periodData = await this.getPeriodBehaviorData(userId, period);
      
      if (!periodData || periodData.length === 0) {
        this.logger.warn(`No period data found for user ${userId}`);
        return null;
      }

      // AI ile davranış deseni tespit et
      const prompt = await this.promptRegistry.getPrompt('behavior_pattern_detection', {
        userId,
        patternType,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        periodData: JSON.stringify(periodData),
        timestamp: new Date().toISOString(),
      });

      const aiResponse = await this.aiService.generateContent(
        { prompt, temperature: 0.3, maxTokens: 1000 }
      );

      const patternText = typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse);
      const patternData = this.parseBehaviorPattern(patternText);
      
      if (!patternData) {
        this.logger.warn(`Failed to parse behavior pattern for user ${userId}`);
        return null;
      }

      // Davranış deseni oluştur
      const pattern: BehaviorPattern = {
        id: `pattern_${userId}_${Date.now()}`,
        userId,
        patternType,
        name: patternData.name || 'Detected Pattern',
        description: patternData.description || 'Behavior pattern detected',
        frequency: patternData.frequency || 0.5,
        consistency: patternData.consistency || 0.5,
        intensity: patternData.intensity || 0.5,
        triggers: patternData.triggers || [],
        outcomes: patternData.outcomes || [],
        positiveImpact: patternData.positiveImpact || 0.5,
        negativeImpact: patternData.negativeImpact || 0.5,
        recommendations: patternData.recommendations || [],
        confidence: patternData.confidence || 0.7,
        period: {
          startDate: period.startDate,
          endDate: period.endDate,
          duration: Math.ceil((period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24)),
        },
        metadata: patternData.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Veritabanına kaydet
      await this.saveBehaviorPattern(pattern);

      this.logger.log(`Behavior pattern detected for user ${userId}`);
      return pattern;
    } catch (error) {
      this.logger.error(`Failed to detect behavior pattern: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Yardımcı metodlar
   */
  private async gatherBehaviorData(userId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const [
        emotionalStates,
        studySessions,
        performanceData,
        journals,
        socialInteractions,
        wellnessData,
      ] = await Promise.all([
        this.prisma.emotionalState.findMany({
          where: { userId, date: { gte: startDate, lte: endDate } },
          orderBy: { date: 'desc' },
        }),
        this.prisma.studySession.findMany({
          where: { userId, createdAt: { gte: startDate, lte: endDate } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.studentPerformanceHistory.findMany({
          where: { userId, date: { gte: startDate, lte: endDate } },
          orderBy: { date: 'desc' },
        }),
        this.prisma.studentJournal.findMany({
          where: { userId, createdAt: { gte: startDate, lte: endDate } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.socialInteraction.findMany({
          where: { userId, createdAt: { gte: startDate, lte: endDate } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.wellnessData.findMany({
          where: { userId, date: { gte: startDate, lte: endDate } },
          orderBy: { date: 'desc' },
        }),
      ]);

      return {
        emotionalStates,
        studySessions,
        performanceData,
        journals,
        socialInteractions,
        wellnessData,
        totalEntries: emotionalStates.length + studySessions.length + performanceData.length + journals.length + socialInteractions.length + wellnessData.length,
      };
    } catch (error) {
      this.logger.error(`Failed to gather behavior data: ${error instanceof Error ? error.message : "Unknown error"}`);
      return {};
    }
  }

  private async getHistoricalBehaviorData(userId: string, days: number): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      return await this.prisma.behaviorInsight.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get historical behavior data: ${error instanceof Error ? error.message : "Unknown error"}`);
      return [];
    }
  }

  private async getUserProfile(userId: string): Promise<any> {
    try {
      // Şemada preferences/goals ilişkileri yok; temel profil ve ilişkili veriler getiriliyor
      return await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          studentProfile: true,
          gamificationProfile: true,
          plans: {
            where: { isActive: true },
            select: { id: true, title: true, subjects: true, goals: true }
          }
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get user profile: ${error instanceof Error ? error.message : "Unknown error"}`);
      return {};
    }
  }

  private async getRecentBehaviorInsights(userId: string, days: number): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      return await this.prisma.behaviorInsight.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get recent behavior insights: ${error instanceof Error ? error.message : "Unknown error"}`);
      return [];
    }
  }

  private async getRecentBehaviorPredictions(userId: string, days: number): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      return await this.prisma.behaviorPrediction.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get recent behavior predictions: ${error instanceof Error ? error.message : "Unknown error"}`);
      return [];
    }
  }

  private async getPeriodBehaviorData(userId: string, period: { startDate: Date; endDate: Date }): Promise<any[]> {
    try {
      return await this.prisma.behaviorInsight.findMany({
        where: {
          userId,
          createdAt: { gte: period.startDate, lte: period.endDate },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get period behavior data: ${error instanceof Error ? error.message : "Unknown error"}`);
      return [];
    }
  }

  private parseBehaviorAnalysis(aiResponse: string): any {
    try {
      return JSON.parse(aiResponse);
    } catch (error) {
      this.logger.error(`Failed to parse behavior analysis: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private parseBehaviorPrediction(aiResponse: string): any {
    try {
      return JSON.parse(aiResponse);
    } catch (error) {
      this.logger.error(`Failed to parse behavior prediction: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private parseBehaviorRecommendation(aiResponse: string): any {
    try {
      return JSON.parse(aiResponse);
    } catch (error) {
      this.logger.error(`Failed to parse behavior recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private parseBehaviorPattern(aiResponse: string): any {
    try {
      return JSON.parse(aiResponse);
    } catch (error) {
      this.logger.error(`Failed to parse behavior pattern: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  private getTimeframeDays(timeframe: string): number {
    switch (timeframe) {
      case 'daily': return 1;
      case 'weekly': return 7;
      case 'monthly': return 30;
      default: return 7;
    }
  }

  /**
   * Veritabanı işlemleri
   */
  private async saveBehaviorInsight(insight: BehaviorInsight): Promise<void> {
    try {
      await this.prisma.behaviorInsight.create({
        data: {
          id: insight.id,
          userId: insight.userId,
          insightType: insight.insightType,
          title: insight.title,
          description: insight.description,
          data: insight.data as any,
          significance: insight.significance,
          actionable: insight.actionable,
          recommendations: insight.recommendations,
          expectedImpact: insight.expectedImpact,
          confidence: insight.confidence,
          period: insight.period as any,
          metadata: insight.metadata as any,
          createdAt: insight.createdAt,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save behavior insight: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async saveBehaviorPrediction(prediction: BehaviorPrediction): Promise<void> {
    try {
      await this.prisma.behaviorPrediction.create({
        data: prediction,
      });
    } catch (error) {
      this.logger.error(`Failed to save behavior prediction: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async saveBehaviorRecommendation(recommendation: BehaviorRecommendation): Promise<void> {
    try {
      await this.prisma.behaviorRecommendation.create({
        data: recommendation,
      });
    } catch (error) {
      this.logger.error(`Failed to save behavior recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async saveBehaviorPattern(pattern: BehaviorPattern): Promise<void> {
    try {
      await this.prisma.behaviorPattern.create({
        data: pattern,
      });
    } catch (error) {
      this.logger.error(`Failed to save behavior pattern: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Günlük davranış analizi cron job
   */
  @Cron(CronExpression.EVERY_DAY_AT_11PM)
  async generateDailyBehaviorAnalysis(): Promise<void> {
    try {
      // Aktif öğrenciler için günlük davranış analizi
      const students = await this.prisma.user.findMany({
        where: {
          role: 'STUDENT',
        },
        select: { id: true },
      });

      for (const student of students) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(yesterday);
        endOfDay.setHours(23, 59, 59, 999);

        await this.analyzeBehavior(student.id, 'daily', yesterday, endOfDay);
      }

      this.logger.log(`Daily behavior analysis completed for ${students.length} students`);
    } catch (error) {
      this.logger.error(`Failed to generate daily behavior analysis: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Health check
   */
  getHealthStatus(): { status: 'healthy' | 'unhealthy' } {
    return { status: 'healthy' };
  }
}
