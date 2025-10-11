import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
// import { EventBusService } from '../common/events/event-bus.service';
import { BehaviorAnalysisService } from './behavior-analysis.service';
import { EmotionalAiService } from './emotional-ai.service';
import { ContextAwareCoachingService } from './context-aware-coaching.service';

export interface ProactiveCoachingContext {
  userId: string;
  currentMood: string;
  learningPattern: string;
  performanceTrend: 'improving' | 'stable' | 'declining';
  stressLevel: number;
  motivationLevel: number;
  recentActivities: any[];
  studyStreak: number;
  weakAreas: string[];
  strongAreas: string[];
  timeOfDay: string;
  dayOfWeek: string;
  upcomingDeadlines: any[];
  socialContext: string;
}

export interface ProactiveRecommendation {
  id: string;
  type: 'study_plan' | 'break_reminder' | 'motivation_boost' | 'difficulty_adjustment' | 'social_learning' | 'wellness';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  reasoning: string;
  expectedImpact: string;
  confidence: number;
  urgency: number;
  personalizedMessage: string;
  followUpActions: string[];
  expiresAt: Date;
  metadata: Record<string, any>;
}

@Injectable()
export class ProactiveCoachingService {
  private readonly logger = new Logger(ProactiveCoachingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly behaviorAnalysis: BehaviorAnalysisService,
    private readonly emotionalAI: EmotionalAiService,
    private readonly contextAware: ContextAwareCoachingService,
    @Optional() private readonly eventBus?: any,
  ) {}

  /**
   * Analyze user behavior and generate proactive recommendations
   */
  async analyzeAndRecommend(userId: string): Promise<ProactiveRecommendation[]> {
    try {
      this.logger.log(`Analyzing user behavior for proactive coaching: ${userId}`);

      // Gather comprehensive context
      const context = await this.gatherUserContext(userId);
      
      // Analyze behavior patterns
      const behaviorPatterns = await (this.behaviorAnalysis as any).analyzeBehavior(userId, context);
      
      // Analyze emotional state
      const emotionalState = await this.emotionalAI.analyzeEmotionalState(userId);
      
      // Generate context-aware recommendations
      const recommendation = await this.contextAware.generateContextAwareRecommendation({
        userId,
        context,
      });
      
      // Convert ContextAwareRecommendation to ProactiveRecommendation
      const recommendations: ProactiveRecommendation[] = recommendation ? [{
        id: 'rec-' + Date.now(),
        type: 'study_focus' as any,
        priority: 'medium' as any,
        title: recommendation.recommendation,
        description: recommendation.recommendation,
        action: recommendation.recommendation,
        reasoning: recommendation.factors.join(', '),
        expectedImpact: '0',
        confidence: recommendation.confidence,
        urgency: 0.5,
        personalizedMessage: recommendation.recommendation,
        followUpActions: [recommendation.recommendation],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: {},
      }] : [];

      // Store recommendations
      await this.storeRecommendations(userId, recommendations);

      // Send real-time notifications for high-priority recommendations
      await this.sendRealTimeNotifications(userId, recommendations);

      this.logger.log(`Generated ${recommendations.length} proactive recommendations for user ${userId}`);
      
      return recommendations;
    } catch (error) {
      this.logger.error(`Error in proactive coaching analysis for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Gather comprehensive user context
   */
  private async gatherUserContext(userId: string): Promise<ProactiveCoachingContext> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    // Get user data
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      include: {
        plans: true,
        studySessions: {
          where: {
            createdAt: {
              gte: startOfWeek,
            },
          },
        },
      },
    });

    // Get recent activities
    const recentActivities = await (this.prisma as any).studySession.findMany({
      where: {
        userId,
        createdAt: {
          gte: startOfWeek,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Get upcoming deadlines
    const upcomingDeadlines = await (this.prisma as any).studySession.findMany({
      where: {
        userId,
        startTime: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Calculate study streak
    const studyStreak = await this.calculateStudyStreak(userId);

    // Analyze performance trends
    const performanceTrend = await this.analyzePerformanceTrend(userId);

    // Identify weak and strong areas
    const { weakAreas, strongAreas } = await this.analyzeSubjectAreas(userId);

    return {
      userId,
      currentMood: await this.emotionalAI.getCurrentMood(userId),
      learningPattern: 'unknown',
      performanceTrend,
      stressLevel: await this.emotionalAI.getStressLevel(userId),
      motivationLevel: await this.emotionalAI.getMotivationLevel(userId),
      recentActivities,
      studyStreak,
      weakAreas,
      strongAreas,
      timeOfDay: this.getTimeOfDay(now),
      dayOfWeek: this.getDayOfWeek(now),
      upcomingDeadlines,
      socialContext: await this.getSocialContext(userId),
    };
  }

  /**
   * Generate proactive recommendations based on context
   */
  private async generateRecommendations(
    userId: string,
    context: ProactiveCoachingContext,
    behaviorPatterns: any,
    emotionalState: any,
  ): Promise<ProactiveRecommendation[]> {
    const recommendations: ProactiveRecommendation[] = [];

    // 1. Study Plan Recommendations
    if (context.performanceTrend === 'declining') {
      recommendations.push({
        id: `study-plan-${Date.now()}`,
        type: 'study_plan',
        priority: 'high',
        title: 'Study Plan Adjustment Needed',
        description: 'Your performance has been declining. Let me suggest a revised study plan.',
        action: 'Revise study plan with easier topics',
        reasoning: 'Performance decline detected in recent sessions',
        expectedImpact: 'Improved confidence and learning outcomes',
        confidence: 0.85,
        urgency: 0.8,
        personalizedMessage: `Hi! I noticed you've been struggling with some topics recently. Let's adjust your study plan to focus on building confidence with easier concepts first.`,
        followUpActions: ['Review weak areas', 'Adjust difficulty', 'Schedule review sessions'],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        metadata: { weakAreas: context.weakAreas, performanceTrend: context.performanceTrend },
      });
    }

    // 2. Break Reminder Recommendations
    if (context.stressLevel > 0.7 && context.studyStreak > 3) {
      recommendations.push({
        id: `break-reminder-${Date.now()}`,
        type: 'break_reminder',
        priority: 'high',
        title: 'Time for a Break!',
        description: 'You\'ve been studying hard. Take a well-deserved break.',
        action: 'Take a 15-30 minute break',
        reasoning: 'High stress level detected with extended study streak',
        expectedImpact: 'Reduced stress and improved focus',
        confidence: 0.9,
        urgency: 0.7,
        personalizedMessage: `You've been studying for ${context.studyStreak} days straight! Your brain needs a break to process all this information. Take a walk, listen to music, or do something you enjoy.`,
        followUpActions: ['Set break timer', 'Suggest break activities', 'Schedule next study session'],
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        metadata: { stressLevel: context.stressLevel, studyStreak: context.studyStreak },
      });
    }

    // 3. Motivation Boost Recommendations
    if (context.motivationLevel < 0.4) {
      recommendations.push({
        id: `motivation-boost-${Date.now()}`,
        type: 'motivation_boost',
        priority: 'medium',
        title: 'Let\'s Boost Your Motivation!',
        description: 'I can see you\'re feeling a bit low on motivation. Let me help you get back on track.',
        action: 'Engage with motivational content',
        reasoning: 'Low motivation level detected',
        expectedImpact: 'Increased motivation and engagement',
        confidence: 0.75,
        urgency: 0.6,
        personalizedMessage: `I understand that studying can sometimes feel overwhelming. Remember why you started this journey and the amazing progress you've already made!`,
        followUpActions: ['Show progress highlights', 'Set small achievable goals', 'Connect with study community'],
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
        metadata: { motivationLevel: context.motivationLevel, recentAchievements: [] },
      });
    }

    // 4. Difficulty Adjustment Recommendations
    if (context.weakAreas.length > 2 && context.performanceTrend === 'stable') {
      recommendations.push({
        id: `difficulty-adjustment-${Date.now()}`,
        type: 'difficulty_adjustment',
        priority: 'medium',
        title: 'Let\'s Adjust the Difficulty',
        description: 'I notice you have several weak areas. Let\'s break them down into smaller, manageable steps.',
        action: 'Adjust study plan difficulty',
        reasoning: 'Multiple weak areas identified with stable performance',
        expectedImpact: 'Better understanding and confidence',
        confidence: 0.8,
        urgency: 0.5,
        personalizedMessage: `I see you're working on ${context.weakAreas.length} challenging areas. Let's break these down into smaller, more manageable pieces so you can build confidence step by step.`,
        followUpActions: ['Create micro-goals', 'Provide additional resources', 'Schedule practice sessions'],
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
        metadata: { weakAreas: context.weakAreas, currentDifficulty: 'medium' },
      });
    }

    // 5. Social Learning Recommendations
    if (context.socialContext === 'isolated' && context.motivationLevel < 0.6) {
      recommendations.push({
        id: `social-learning-${Date.now()}`,
        type: 'social_learning',
        priority: 'low',
        title: 'Connect with Other Learners',
        description: 'Learning with others can be more engaging and motivating.',
        action: 'Join study groups or forums',
        reasoning: 'Isolated learning detected with moderate motivation',
        expectedImpact: 'Increased engagement and motivation',
        confidence: 0.7,
        urgency: 0.3,
        personalizedMessage: `Learning doesn't have to be a solo journey! Connecting with other learners can make the process more enjoyable and help you stay motivated.`,
        followUpActions: ['Find study partners', 'Join online communities', 'Share progress'],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        metadata: { socialContext: context.socialContext, availableGroups: [] },
      });
    }

    // 6. Wellness Recommendations
    if (context.stressLevel > 0.8 || context.currentMood === 'stressed') {
      recommendations.push({
        id: `wellness-${Date.now()}`,
        type: 'wellness',
        priority: 'high',
        title: 'Take Care of Your Well-being',
        description: 'Your mental health is important. Let\'s focus on wellness activities.',
        action: 'Engage in wellness activities',
        reasoning: 'High stress level or stressed mood detected',
        expectedImpact: 'Improved mental health and learning capacity',
        confidence: 0.9,
        urgency: 0.9,
        personalizedMessage: `I can see you're feeling stressed. Remember that your well-being is just as important as your studies. Let's take some time to focus on activities that help you relax and recharge.`,
        followUpActions: ['Breathing exercises', 'Mindfulness activities', 'Physical exercise'],
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
        metadata: { stressLevel: context.stressLevel, mood: context.currentMood },
      });
    }

    return recommendations;
  }

  /**
   * Store recommendations in database
   */
  private async storeRecommendations(userId: string, recommendations: ProactiveRecommendation[]): Promise<void> {
    for (const recommendation of recommendations) {
      // Store recommendation in a simple way for now
      this.logger.log(`Storing recommendation for user ${userId}: ${recommendation.title}`);
    }
  }

  /**
   * Send real-time notifications for high-priority recommendations
   */
  private async sendRealTimeNotifications(userId: string, recommendations: ProactiveRecommendation[]): Promise<void> {
    const highPriorityRecommendations = recommendations.filter(r => r.priority === 'high');
    
    for (const recommendation of highPriorityRecommendations) {
      await this.eventBus.publishProactiveRecommendation(
        userId,
        recommendation.type,
        recommendation.title,
        recommendation.personalizedMessage,
        recommendation.metadata,
      );
    }
  }

  /**
   * Calculate study streak
   */
  private async calculateStudyStreak(userId: string): Promise<number> {
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      
      const studySessions = await (this.prisma as any).studySession.count({
        where: {
          userId,
          startTime: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      });
      
      if (studySessions > 0) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  /**
   * Analyze performance trend
   */
  private async analyzePerformanceTrend(userId: string): Promise<'improving' | 'stable' | 'declining'> {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const oldProgress = await (this.prisma as any).studySession.findMany({
      where: {
        userId,
        createdAt: {
          gte: twoWeeksAgo,
          lt: oneWeekAgo,
        },
      },
    });
    
    const recentProgress = await (this.prisma as any).studySession.findMany({
      where: {
        userId,
        createdAt: {
          gte: oneWeekAgo,
        },
      },
    });
    
    const oldAverage = oldProgress.reduce((sum: number, p: any) => sum + (p.performance || 0), 0) / oldProgress.length;
    const recentAverage = recentProgress.reduce((sum: number, p: any) => sum + (p.performance || 0), 0) / recentProgress.length;
    
    if (recentAverage > oldAverage + 0.1) return 'improving';
    if (recentAverage < oldAverage - 0.1) return 'declining';
    return 'stable';
  }

  /**
   * Analyze subject areas
   */
  private async analyzeSubjectAreas(userId: string): Promise<{ weakAreas: string[]; strongAreas: string[] }> {
    const progress = await (this.prisma as any).studySession.findMany({
      where: { userId },
      include: { plan: true },
    });
    
    const subjectScores: Record<string, number[]> = {};
    
    for (const p of progress) {
      if (p.plan) {
        const subject = p.subject;
        if (!subjectScores[subject]) subjectScores[subject] = [];
        subjectScores[subject].push(p.performance || 0);
      }
    }
    
    const subjectAverages: Record<string, number> = {};
    for (const [subject, scores] of Object.entries(subjectScores)) {
      subjectAverages[subject] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }
    
    const weakAreas = Object.entries(subjectAverages)
      .filter(([_, avg]) => avg < 0.6)
      .map(([subject, _]) => subject);
    
    const strongAreas = Object.entries(subjectAverages)
      .filter(([_, avg]) => avg > 0.8)
      .map(([subject, _]) => subject);
    
    return { weakAreas, strongAreas };
  }

  /**
   * Get time of day
   */
  private getTimeOfDay(date: Date): string {
    const hour = date.getHours();
    if (hour < 6) return 'early_morning';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Get day of week
   */
  private getDayOfWeek(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  /**
   * Get social context
   */
  private async getSocialContext(userId: string): Promise<string> {
    // This would analyze user's social interactions
    // For now, return a placeholder
    return 'moderate';
  }
}