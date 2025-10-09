import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { AIService } from '../ai/ai.service';
import { PromptRegistry } from '../ai/prompt-registry.service'; // DÜZELTME
import { ConnectionManagerService } from '../realtime/connection-manager.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface CoachingRecommendation {
  id: string;
  userId: string;
  type: 'study_focus' | 'time_management' | 'difficulty_adjustment' | 'motivation' | 'break_reminder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  actionItems: string[];
  estimatedImpact: number; // 1-10 scale
  confidence: number; // 0-1 scale
  context: {
    currentSession?: string;
    recentPerformance?: any;
    timeOfDay?: string;
    studyStreak?: number;
  };
  createdAt: Date;
  expiresAt?: Date;
  isRead: boolean;
  isActedUpon: boolean;
}

export interface RealTimeCoachingContext {
  userId: string;
  currentActivity: string;
  sessionDuration: number;
  recentPerformance: any;
  timeOfDay: string;
  studyStreak: number;
  lastBreakTime?: Date;
  currentDifficulty: number;
  focusLevel: number;
  energyLevel: number;
}

@Injectable()
export class RealTimeAICoachService implements OnModuleInit {
  private readonly logger = new Logger(RealTimeAICoachService.name);
  private readonly activeCoachingSessions = new Map<string, RealTimeCoachingContext>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly aiService: AIService,
    private readonly promptRegistry: PromptRegistry, // DÜZELTME
    private readonly connectionManager: ConnectionManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('RealTimeAICoachService initialized');
    this.setupEventListeners();
  }

  /**
   * Event listener'ları kur
   */
  private setupEventListeners(): void {
    // Session events
    this.eventEmitter.on('session.started', (data) => {
      this.handleSessionStarted(data);
    });

    this.eventEmitter.on('session.completed', (data) => {
      this.handleSessionCompleted(data);
    });

    this.eventEmitter.on('session.paused', (data) => {
      this.handleSessionPaused(data);
    });

    // Performance events
    this.eventEmitter.on('performance.updated', (data) => {
      this.handlePerformanceUpdated(data);
    });

    // User activity events
    this.eventEmitter.on('user.activity', (data) => {
      this.handleUserActivity(data);
    });
  }

  /**
   * Session başladığında coaching context'i güncelle
   */
  private async handleSessionStarted(data: any): Promise<void> {
    try {
      const { userId, sessionId, subject, difficulty } = data;
      
      const context: RealTimeCoachingContext = {
        userId,
        currentActivity: `studying_${subject}`,
        sessionDuration: 0,
        recentPerformance: await this.getRecentPerformance(userId),
        timeOfDay: this.getTimeOfDay(),
        studyStreak: await this.getStudyStreak(userId),
        currentDifficulty: difficulty || 5,
        focusLevel: 8, // Default high focus at start
        energyLevel: await this.getEnergyLevel(userId),
      };

      this.activeCoachingSessions.set(userId, context);
      
      // Proaktif öneri oluştur
      await this.generateProactiveRecommendation(userId, context);
      
      this.logger.log(`Coaching session started for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to handle session started: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Session tamamlandığında coaching context'i güncelle
   */
  private async handleSessionCompleted(data: any): Promise<void> {
    try {
      const { userId, sessionId, score, timeSpent, notes } = data;
      
      const context = this.activeCoachingSessions.get(userId);
      if (!context) return;

      // Context'i güncelle
      context.recentPerformance = {
        ...context.recentPerformance,
        lastSession: {
          score,
          timeSpent,
          notes,
          completedAt: new Date(),
        },
      };

      // Session sonrası öneri oluştur
      await this.generateSessionCompletionRecommendation(userId, context, {
        score,
        timeSpent,
        notes,
      });

      this.activeCoachingSessions.delete(userId);
      
      this.logger.log(`Coaching session completed for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to handle session completed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Session duraklatıldığında coaching context'i güncelle
   */
  private async handleSessionPaused(data: any): Promise<void> {
    try {
      const { userId, sessionId, pauseReason } = data;
      
      const context = this.activeCoachingSessions.get(userId);
      if (!context) return;

      // Duraklama önerisi oluştur
      await this.generatePauseRecommendation(userId, context, pauseReason);
      
      this.logger.log(`Coaching session paused for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to handle session paused: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Performans güncellendiğinde coaching context'i güncelle
   */
  private async handlePerformanceUpdated(data: any): Promise<void> {
    try {
      const { userId, performance } = data;
      
      const context = this.activeCoachingSessions.get(userId);
      if (!context) return;

      context.recentPerformance = performance;
      
      // Performans tabanlı öneri oluştur
      await this.generatePerformanceBasedRecommendation(userId, context);
      
      this.logger.log(`Performance updated for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to handle performance updated: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Kullanıcı aktivitesi güncellendiğinde coaching context'i güncelle
   */
  private async handleUserActivity(data: any): Promise<void> {
    try {
      const { userId, activity, metadata } = data;
      
      const context = this.activeCoachingSessions.get(userId);
      if (!context) return;

      context.currentActivity = activity;
      
      // Aktivite tabanlı öneri oluştur
      await this.generateActivityBasedRecommendation(userId, context, metadata);
      
      this.logger.log(`User activity updated for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to handle user activity: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Proaktif öneri oluştur
   */
  async generateProactiveRecommendation(
    userId: string,
    context: RealTimeCoachingContext
  ): Promise<CoachingRecommendation | null> {
    try {
      // AI ile proaktif öneri oluştur
      const prompt = await this.promptRegistry.getPrompt('proactive_coaching', {
        userId,
        context: JSON.stringify(context),
        timeOfDay: context.timeOfDay,
        studyStreak: context.studyStreak,
        recentPerformance: JSON.stringify(context.recentPerformance),
      });

      const aiResponse = await this.aiService.generateContent({
        // DÜZELTME: AIRequestOptions yerine AIRequest kullanıldı
        prompt,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 500,
        userId,
      });

      const recommendation = this.parseAIResponse(aiResponse.content, userId, context); // DÜZELTME: string içerik gönder
      
      if (recommendation) {
        // Veritabanına kaydet
        await this.saveRecommendation(recommendation);
        
        // WebSocket ile gönder
        await this.sendRecommendationToUser(userId, recommendation);
        
        this.logger.log(`Proactive recommendation generated for user ${userId}`);
      }

      return recommendation;
    } catch (error) {
      this.logger.error(`Failed to generate proactive recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Session tamamlanma önerisi oluştur
   */
  async generateSessionCompletionRecommendation(
    userId: string,
    context: RealTimeCoachingContext,
    sessionData: any
  ): Promise<CoachingRecommendation | null> {
    try {
      const prompt = await this.promptRegistry.getPrompt('session_completion_coaching', {
        userId,
        context: JSON.stringify(context),
        sessionData: JSON.stringify(sessionData),
        score: sessionData.score,
        timeSpent: sessionData.timeSpent,
        notes: sessionData.notes,
      });

      const aiResponse = await this.aiService.generateContent({
        // DÜZELTME: AIRequestOptions yerine AIRequest kullanıldı
        prompt,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 500,
        userId,
      });

      const recommendation = this.parseAIResponse(aiResponse.content, userId, context); // DÜZELTME
      
      if (recommendation) {
        await this.saveRecommendation(recommendation);
        await this.sendRecommendationToUser(userId, recommendation);
      }

      return recommendation;
    } catch (error) {
      this.logger.error(`Failed to generate session completion recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Duraklama önerisi oluştur
   */
  async generatePauseRecommendation(
    userId: string,
    context: RealTimeCoachingContext,
    pauseReason: string
  ): Promise<CoachingRecommendation | null> {
    try {
      const prompt = await this.promptRegistry.getPrompt('pause_coaching', {
        userId,
        context: JSON.stringify(context),
        pauseReason,
        sessionDuration: context.sessionDuration,
        energyLevel: context.energyLevel,
      });

      const aiResponse = await this.aiService.generateContent({
        // DÜZELTME: AIRequestOptions yerine AIRequest kullanıldı
        prompt,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 400,
        userId,
      });

      const recommendation = this.parseAIResponse(aiResponse.content, userId, context); // DÜZELTME
      
      if (recommendation) {
        await this.saveRecommendation(recommendation);
        await this.sendRecommendationToUser(userId, recommendation);
      }

      return recommendation;
    } catch (error) {
      this.logger.error(`Failed to generate pause recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Performans tabanlı öneri oluştur
   */
  async generatePerformanceBasedRecommendation(
    userId: string,
    context: RealTimeCoachingContext
  ): Promise<CoachingRecommendation | null> {
    try {
      const prompt = await this.promptRegistry.getPrompt('performance_coaching', {
        userId,
        context: JSON.stringify(context),
        recentPerformance: JSON.stringify(context.recentPerformance),
        currentDifficulty: context.currentDifficulty,
        focusLevel: context.focusLevel,
      });

      const aiResponse = await this.aiService.generateContent({
        // DÜZELTME: AIRequestOptions yerine AIRequest kullanıldı
        prompt,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 500,
        userId,
      });

      const recommendation = this.parseAIResponse(aiResponse.content, userId, context); // DÜZELTME
      
      if (recommendation) {
        await this.saveRecommendation(recommendation);
        await this.sendRecommendationToUser(userId, recommendation);
      }

      return recommendation;
    } catch (error) {
      this.logger.error(`Failed to generate performance-based recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null; // DÜZELTME: dönüş garanti edildi
    }
  }

  /**
   * Aktivite tabanlı öneri oluştur
   */
  async generateActivityBasedRecommendation(
    userId: string,
    context: RealTimeCoachingContext,
    metadata: any
  ): Promise<CoachingRecommendation | null> {
    try {
      const prompt = await this.promptRegistry.getPrompt('activity_coaching', {
        userId,
        context: JSON.stringify(context),
        activity: context.currentActivity,
        metadata: JSON.stringify(metadata),
        timeOfDay: context.timeOfDay,
      });

      const aiResponse = await this.aiService.generateContent({
        // DÜZELTME: AIRequestOptions yerine AIRequest kullanıldı
        prompt,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 400,
        userId,
      });

      const recommendation = this.parseAIResponse(aiResponse.content, userId, context); // DÜZELTME
      
      if (recommendation) {
        await this.saveRecommendation(recommendation);
        await this.sendRecommendationToUser(userId, recommendation);
      }

      return recommendation;
    } catch (error) {
      this.logger.error(`Failed to generate activity-based recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * AI yanıtını parse et
   */
  private parseAIResponse(aiResponse: string, userId: string, context: RealTimeCoachingContext): CoachingRecommendation | null {
    try {
      const parsed = JSON.parse(aiResponse);
      
      return {
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: parsed.type || 'study_focus',
        priority: parsed.priority || 'medium',
        title: parsed.title || 'AI Coaching Recommendation',
        message: parsed.message || 'You have a new coaching recommendation',
        actionItems: parsed.actionItems || [],
        estimatedImpact: parsed.estimatedImpact || 5,
        confidence: parsed.confidence || 0.7,
        context: {
          currentSession: context.currentActivity,
          recentPerformance: context.recentPerformance,
          timeOfDay: context.timeOfDay,
          studyStreak: context.studyStreak,
        },
        createdAt: new Date(),
        expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
        isRead: false,
        isActedUpon: false,
      };
    } catch (error) {
      this.logger.error(`Failed to parse AI response: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Öneriyi veritabanına kaydet
   */
  private async saveRecommendation(recommendation: CoachingRecommendation): Promise<void> {
    try {
      await (this.prisma as any).coachingRecommendation.create({
        data: {
          id: recommendation.id,
          userId: recommendation.userId,
          type: recommendation.type,
          priority: recommendation.priority,
          title: recommendation.title,
          message: recommendation.message,
          actionItems: recommendation.actionItems,
          estimatedImpact: recommendation.estimatedImpact,
          confidence: recommendation.confidence,
          context: recommendation.context,
          expiresAt: recommendation.expiresAt,
          isRead: recommendation.isRead,
          isActedUpon: recommendation.isActedUpon,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save recommendation: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Öneriyi kullanıcıya gönder
   */
  private async sendRecommendationToUser(userId: string, recommendation: CoachingRecommendation): Promise<void> {
    try {
      // WebSocket ile gönder
      await this.connectionManager.sendToUser(userId, 'coaching_recommendation', {
        type: 'coaching_recommendation',
        recommendation,
        timestamp: new Date(),
      });

      // Push notification gönder
      this.eventEmitter.emit('notification.send', {
        userId,
        type: 'coaching_recommendation',
        title: recommendation.title,
        message: recommendation.message,
        priority: recommendation.priority,
        data: recommendation,
      });
    } catch (error) {
      this.logger.error(`Failed to send recommendation to user: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Son performansı al
   */
  private async getRecentPerformance(userId: string): Promise<any> {
    try {
      const performance = await (this.prisma as any).studentPerformanceHistory.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      return performance;
    } catch (error) {
      this.logger.error(`Failed to get recent performance: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Günün saatini al
   */
  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  /**
   * Çalışma serisini al
   */
  private async getStudyStreak(userId: string): Promise<number> {
    try {
      const streak = await (this.prisma as any).studyStreak.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      return streak?.currentStreak || 0;
    } catch (error) {
      this.logger.error(`Failed to get study streak: ${error instanceof Error ? error.message : "Unknown error"}`);
      return 0;
    }
  }

  /**
   * Enerji seviyesini al
   */
  private async getEnergyLevel(userId: string): Promise<number> {
    try {
      // Basit hesaplama - gerçek implementasyonda daha karmaşık olabilir
      const hour = new Date().getHours();
      if (hour >= 6 && hour <= 10) return 9; // Morning high energy
      if (hour >= 14 && hour <= 16) return 7; // Afternoon medium energy
      if (hour >= 20 && hour <= 22) return 6; // Evening lower energy
      return 5; // Default medium energy
    } catch (error) {
      this.logger.error(`Failed to get energy level: ${error instanceof Error ? error.message : "Unknown error"}`);
      return 5;
    }
  }

  /**
   * Aktif coaching session'ları temizle
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupInactiveSessions(): Promise<void> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      for (const [userId, context] of this.activeCoachingSessions.entries()) {
        // Son aktivite 1 saatten eskiyse temizle
        if (context.recentPerformance?.lastSession?.completedAt < oneHourAgo) {
          this.activeCoachingSessions.delete(userId);
        }
      }

      this.logger.log(`Cleaned up inactive coaching sessions`);
    } catch (error) {
      this.logger.error(`Failed to cleanup inactive sessions: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Kullanıcının aktif coaching context'ini al
   */
  getActiveCoachingContext(userId: string): RealTimeCoachingContext | undefined {
    return this.activeCoachingSessions.get(userId);
  }

  /**
   * Aktif coaching session sayısını al
   */
  getActiveCoachingSessionsCount(): number {
    return this.activeCoachingSessions.size;
  }

  /**
   * Health check
   */
  getHealthStatus(): { status: 'healthy' | 'unhealthy'; activeSessions: number } {
    return {
      status: 'healthy',
      activeSessions: this.activeCoachingSessions.size,
    };
  }
}
