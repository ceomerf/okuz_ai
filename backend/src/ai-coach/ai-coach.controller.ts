import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { AICoachService } from './ai-coach.service';
import { ProactiveCoachingService } from './proactive-coaching.service';
import { EmotionalAIService } from './emotional-ai.service';
import { PersonalizedDashboardService } from './personalized-dashboard.service';
import { AIExplainabilityService } from './ai-explainability.service';

@Controller('ai-coach')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AICoachController {
  constructor(
    private readonly aiCoachService: AICoachService,
    private readonly proactiveCoaching: ProactiveCoachingService,
    private readonly emotionalAI: EmotionalAIService,
    private readonly personalizedDashboard: PersonalizedDashboardService,
    private readonly aiExplainability: AIExplainabilityService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Günlük AI önerisi getir
   */
  @Get('daily-recommendation')
  @Roles('STUDENT')
  async getDailyRecommendation(
    @Request() req: AuthenticatedRequest,
    @Query('date') date?: string
  ) {
    const targetDate = date ? new Date(date) : new Date();
    return this.aiCoachService.getDailyRecommendation(req.user.id, targetDate);
  }

  /**
   * Günlük AI önerisi oluştur
   */
  @Post('daily-recommendation')
  @Roles('STUDENT')
  async generateDailyRecommendation(
    @Request() req: AuthenticatedRequest,
    @Body() body: { date?: string }
  ) {
    const targetDate = body.date ? new Date(body.date) : new Date();
    return this.aiCoachService.generateDailyRecommendation(req.user.id, targetDate);
  }

  /**
   * Gün sonu değerlendirmesi
   */
  @Post('daily-score')
  @Roles('STUDENT')
  async generateDailyScore(
    @Request() req: AuthenticatedRequest,
    @Body() body: {
      date?: string;
      completedSessions: number;
      plannedSessions: number;
      studyTime: number;
      plannedTime: number;
      performance: number[];
    }
  ) {
    const targetDate = body.date ? new Date(body.date) : new Date();
    return this.aiCoachService.generateDailyScore(req.user.id, targetDate, {
      completedSessions: body.completedSessions,
      plannedSessions: body.plannedSessions,
      studyTime: body.studyTime,
      plannedTime: body.plannedTime,
      performance: body.performance,
    });
  }

  /**
   * Haftalık AI özeti
   */
  @Get('weekly-summary')
  @Roles('STUDENT')
  async getWeeklySummary(
    @Request() req: AuthenticatedRequest,
    @Query('weekStart') weekStart?: string
  ) {
    const weekStartDate = weekStart ? new Date(weekStart) : this.getCurrentWeekStart();
    return this.aiCoachService.getWeeklySummary(req.user.id, weekStartDate);
  }

  /**
   * Motivasyonel mesaj oluştur
   */
  @Post('motivational-message')
  @Roles('STUDENT')
  async generateMotivationalMessage(
    @Request() req: AuthenticatedRequest,
    @Body() body: {
      recentPerformance: number;
      streak: number;
      goals: string[];
    }
  ) {
    return this.aiCoachService.generateMotivationalMessage(req.user.id, body);
  }

  /**
   * Proactive coaching recommendations
   */
  @Get('proactive-recommendations')
  @Roles('STUDENT')
  async getProactiveRecommendations(@Request() req: AuthenticatedRequest) {
    return this.proactiveCoaching.analyzeAndRecommend(req.user.id);
  }

  /**
   * Emotional state analysis
   */
  @Get('emotional-state')
  @Roles('STUDENT')
  async getEmotionalState(@Request() req: AuthenticatedRequest) {
    const context = await this.getUserContext(req.user.id);
    return this.emotionalAI.analyzeEmotionalState(req.user.id, context);
  }

  /**
   * Analyze text emotions
   */
  @Post('analyze-text-emotions')
  @Roles('STUDENT')
  async analyzeTextEmotions(
    @Request() req: AuthenticatedRequest,
    @Body() body: { text: string }
  ) {
    return this.emotionalAI.analyzeTextEmotions([body.text]);
  }

  /**
   * Personalized dashboard
   */
  @Get('dashboard')
  @Roles('STUDENT')
  async getPersonalizedDashboard(@Request() req: AuthenticatedRequest) {
    return this.personalizedDashboard.generateDashboard(req.user.id);
  }

  /**
   * AI explanation for recommendation
   */
  @Post('explain-recommendation')
  @Roles('STUDENT')
  async explainRecommendation(
    @Request() req: AuthenticatedRequest,
    @Body() body: {
      recommendationId: string;
      userPreferences: {
        detailLevel: 'basic' | 'intermediate' | 'advanced';
        language: string;
        includeAlternatives: boolean;
        includeTechnicalDetails: boolean;
      };
    }
  ) {
    return this.aiExplainability.generateExplanation({
      userId: req.user.id,
      recommendationId: body.recommendationId,
      context: await this.getUserContext(req.user.id),
      userPreferences: body.userPreferences,
    });
  }

  /**
   * Get current mood
   */
  @Get('current-mood')
  @Roles('STUDENT')
  async getCurrentMood(@Request() req: AuthenticatedRequest) {
    return {
      mood: await this.emotionalAI.getCurrentMood(req.user.id),
      stressLevel: await this.emotionalAI.getStressLevel(req.user.id),
      motivationLevel: await this.emotionalAI.getMotivationLevel(req.user.id),
    };
  }

  /**
   * Get learning insights
   */
  @Get('learning-insights')
  @Roles('STUDENT')
  async getLearningInsights(@Request() req: AuthenticatedRequest) {
    const dashboard = await this.personalizedDashboard.generateDashboard(req.user.id);
    return {
      insights: dashboard.insights,
      learningLevel: dashboard.learningLevel,
      planSuccess: dashboard.planSuccess,
    };
  }

  /**
   * Get AI recommendation history
   */
  @Get('recommendation-history')
  @Roles('STUDENT')
  async getRecommendationHistory(@Request() req: AuthenticatedRequest) {
    const dashboard = await this.personalizedDashboard.generateDashboard(req.user.id);
    return dashboard.aiRecommendationHistory;
  }

  private async getUserContext(userId: string): Promise<any> {
    // Get basic user context for AI analysis
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentActivities = await this.prisma.studySession.findMany({
      where: {
        userId,
        createdAt: { gte: oneWeekAgo },
      },
    });

    const progressData = await this.prisma.studySession.findMany({
      where: {
        userId,
        createdAt: { gte: oneWeekAgo },
      },
    });

    return {
      recentActivities,
      progressData,
      userId,
    };
  }

  private getCurrentWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  }
}
