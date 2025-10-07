import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmotionalAIService } from './emotional-ai.service';
import { ProactiveCoachingService } from './proactive-coaching.service';

export interface LearningLevel {
  overall: number;
  subjects: Record<string, number>;
  skills: Record<string, number>;
  trends: {
    improving: string[];
    stable: string[];
    declining: string[];
  };
  nextLevel: string;
  progressToNextLevel: number;
}

export interface PlanSuccess {
  totalPlans: number;
  completedPlans: number;
  successRate: number;
  averageCompletionTime: number;
  streak: number;
  bestStreak: number;
  recentPerformance: {
    lastWeek: number;
    lastMonth: number;
    lastQuarter: number;
  };
  subjectBreakdown: Record<string, {
    plans: number;
    completed: number;
    successRate: number;
  }>;
}

export interface AIRecommendationHistory {
  totalRecommendations: number;
  acceptedRecommendations: number;
  rejectedRecommendations: number;
  acceptanceRate: number;
  recommendationTypes: Record<string, {
    count: number;
    acceptanceRate: number;
    averageImpact: number;
  }>;
  recentRecommendations: {
    id: string;
    type: string;
    title: string;
    status: 'accepted' | 'rejected' | 'pending';
    impact: number;
    timestamp: Date;
  }[];
  impactTrends: {
    lastWeek: number;
    lastMonth: number;
    lastQuarter: number;
  };
}

export interface PersonalizedDashboard {
  userId: string;
  learningLevel: LearningLevel;
  planSuccess: PlanSuccess;
  aiRecommendationHistory: AIRecommendationHistory;
  emotionalState: {
    currentMood: string;
    stressLevel: number;
    motivationLevel: number;
    confidence: number;
    learningReadiness: number;
  };
  insights: {
    strengths: string[];
    areasForImprovement: string[];
    learningStyle: string;
    optimalStudyTime: string;
    recommendedActions: string[];
  };
  achievements: {
    total: number;
    recent: any[];
    upcoming: any[];
  };
  goals: {
    current: any[];
    completed: any[];
    progress: Record<string, number>;
  };
  socialLearning: {
    studyGroups: number;
    collaborations: number;
    peerInteractions: number;
    socialScore: number;
  };
  wellness: {
    studyLifeBalance: number;
    stressManagement: number;
    motivationMaintenance: number;
    overallWellness: number;
  };
  recommendations: {
    immediate: any[];
    shortTerm: any[];
    longTerm: any[];
  };
}

@Injectable()
export class PersonalizedDashboardService {
  private readonly logger = new Logger(PersonalizedDashboardService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emotionalAI: EmotionalAIService,
    private readonly proactiveCoaching: ProactiveCoachingService,
  ) {}

  /**
   * Generate personalized dashboard for user
   */
  async generateDashboard(userId: string): Promise<PersonalizedDashboard> {
    try {
      this.logger.log(`Generating personalized dashboard for user: ${userId}`);

      // Gather all dashboard data
      const learningLevel = await this.analyzeLearningLevel(userId);
      const planSuccess = await this.analyzePlanSuccess(userId);
      const aiRecommendationHistory = await this.analyzeAIRecommendationHistory(userId);
      const emotionalState = await this.getEmotionalState(userId);
      const insights = await this.generateInsights(userId, learningLevel, planSuccess);
      const achievements = await this.getAchievements(userId);
      const goals = await this.getGoals(userId);
      const socialLearning = await this.analyzeSocialLearning(userId);
      const wellness = await this.analyzeWellness(userId);
      const recommendations = await this.generateRecommendations(userId, learningLevel, planSuccess, emotionalState);

      const dashboard: PersonalizedDashboard = {
        userId,
        learningLevel,
        planSuccess,
        aiRecommendationHistory,
        emotionalState,
        insights,
        achievements,
        goals,
        socialLearning,
        wellness,
        recommendations,
      };

      // Store dashboard data
      await this.storeDashboardData(userId, dashboard);

      this.logger.log(`Personalized dashboard generated for user: ${userId}`);
      
      return dashboard;
    } catch (error) {
      this.logger.error(`Error generating dashboard for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze learning level
   */
  private async analyzeLearningLevel(userId: string): Promise<LearningLevel> {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Get user progress data
    const progressData = await this.prisma.progress.findMany({
      where: {
        userId,
        createdAt: { gte: oneMonthAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate overall learning level
    const overallScore = progressData.length > 0
      ? progressData.reduce((sum, p: any) => sum + ((p as any).score || 0), 0) / progressData.length
      : 0;
    
    // Calculate subject-specific levels
    const subjects: Record<string, number[]> = {};
    for (const progress of progressData as any[]) {
      const subject = (progress as any).subject;
      if (subject) {
        if (!subjects[subject]) subjects[subject] = [];
        subjects[subject].push((progress as any).score || (progress as any).progress || 0);
      }
    }

    const subjectLevels: Record<string, number> = {};
    for (const [subject, scores] of Object.entries(subjects)) {
      subjectLevels[subject] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    // Calculate skill levels
    const skills: Record<string, number> = {
      problemSolving: overallScore * 0.9,
      criticalThinking: overallScore * 0.85,
      timeManagement: overallScore * 0.8,
      communication: overallScore * 0.75,
    };

    // Analyze trends
    const trends = await this.analyzeLearningTrends(userId, progressData);

    // Calculate next level
    const nextLevel = this.calculateNextLevel(overallScore);
    const progressToNextLevel = this.calculateProgressToNextLevel(overallScore, nextLevel);

    return {
      overall: overallScore,
      subjects: subjectLevels,
      skills,
      trends,
      nextLevel,
      progressToNextLevel,
    };
  }

  /**
   * Analyze plan success
   */
  private async analyzePlanSuccess(userId: string): Promise<PlanSuccess> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oneQuarterAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Get all plans
    const allPlans = await this.prisma.plan.findMany({
      where: { userId },
      include: { studySessions: true },
    });

    const totalPlans = allPlans.length;
    const completedPlans = 0; // Şemada status alanı yok
    const successRate = totalPlans > 0 ? completedPlans / totalPlans : 0;

    // Calculate average completion time
    const completedPlansWithTime: any[] = [];
    const averageCompletionTime = completedPlansWithTime.length > 0
      ? completedPlansWithTime.reduce((sum, plan) => 
          sum + 0, 0
        ) / completedPlansWithTime.length
      : 0;

    // Calculate streaks
    const streak = await this.calculateStudyStreak(userId);
    const bestStreak = await this.calculateBestStreak(userId);

    // Calculate recent performance
    const recentPerformance = {
      lastWeek: await this.calculatePerformanceInPeriod(userId, oneWeekAgo),
      lastMonth: await this.calculatePerformanceInPeriod(userId, oneMonthAgo),
      lastQuarter: await this.calculatePerformanceInPeriod(userId, oneQuarterAgo),
    };

    // Calculate subject breakdown
    const subjectBreakdown: Record<string, any> = {};
    for (const plan of allPlans) {
      const subject = (plan.subjects || [])[0];
      if (!subject) continue;
      if (!subjectBreakdown[subject]) {
        subjectBreakdown[subject] = { plans: 0, completed: 0, successRate: 0 };
      }
      subjectBreakdown[subject].plans++;
    }

    // Calculate success rates for each subject
    for (const [subject, data] of Object.entries(subjectBreakdown)) {
      data.successRate = data.plans > 0 ? data.completed / data.plans : 0;
    }

    return {
      totalPlans,
      completedPlans,
      successRate,
      averageCompletionTime,
      streak,
      bestStreak,
      recentPerformance,
      subjectBreakdown,
    };
  }

  /**
   * Analyze AI recommendation history
   */
  private async analyzeAIRecommendationHistory(userId: string): Promise<AIRecommendationHistory> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oneQuarterAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Get all recommendations
    const allRecommendations = await this.prisma.proactiveRecommendation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const totalRecommendations = allRecommendations.length;
    const acceptedRecommendations = 0; // Şemada status alanı yok
    const rejectedRecommendations = 0; // Şemada status alanı yok
    const acceptanceRate = totalRecommendations > 0 ? acceptedRecommendations / totalRecommendations : 0;

    // Analyze recommendation types
    const recommendationTypes: Record<string, any> = {};
    for (const rec of allRecommendations) {
      if (!recommendationTypes[rec.type]) {
        recommendationTypes[rec.type] = { count: 0, acceptanceRate: 0, averageImpact: 0 };
      }
      recommendationTypes[rec.type].count++;
    }

    // Calculate acceptance rates and impact for each type
    for (const [type, data] of Object.entries(recommendationTypes)) {
      const typeRecommendations = allRecommendations.filter(r => r.type === type);
      const accepted = 0; // Şemada status alanı yok
      data.acceptanceRate = typeRecommendations.length > 0 ? accepted / typeRecommendations.length : 0;
      data.averageImpact = typeRecommendations.length > 0
        ? typeRecommendations.reduce((sum, r: any) => sum + ((r as any).impact || 0), 0) / typeRecommendations.length
        : 0;
    }

    // Get recent recommendations
    const recentRecommendations = allRecommendations.slice(0, 10).map((rec: any) => ({
      id: rec.id,
      type: rec.type,
      title: rec.title,
      status: 'pending' as 'accepted' | 'rejected' | 'pending',
      impact: (rec as any).impact || 0,
      timestamp: rec.createdAt,
    }));

    // Calculate impact trends
    const impactTrends = {
      lastWeek: await this.calculateImpactInPeriod(userId, oneWeekAgo),
      lastMonth: await this.calculateImpactInPeriod(userId, oneMonthAgo),
      lastQuarter: await this.calculateImpactInPeriod(userId, oneQuarterAgo),
    };

    return {
      totalRecommendations,
      acceptedRecommendations,
      rejectedRecommendations,
      acceptanceRate,
      recommendationTypes,
      recentRecommendations,
      impactTrends,
    };
  }

  /**
   * Get emotional state
   */
  private async getEmotionalState(userId: string): Promise<any> {
    const recentState = await this.prisma.emotionalState.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }, // DÜZELTME: timestamp yerine createdAt
    });

    return {
      currentMood: recentState?.overallMood || 'neutral', // DÜZELTME: mood -> overallMood
      stressLevel: recentState?.stressLevel || 0.5,
      motivationLevel: recentState?.motivationLevel || 0.5,
      confidence: recentState?.confidence || 0.5,
      learningReadiness: recentState?.energyLevel || 0.5, // DÜZELTME: learningReadiness yok, energyLevel kullanıldı
    };
  }

  /**
   * Generate insights
   */
  private async generateInsights(
    userId: string,
    learningLevel: LearningLevel,
    planSuccess: PlanSuccess,
  ): Promise<any> {
    // Identify strengths
    const strengths: string[] = [];
    for (const [subject, level] of Object.entries(learningLevel.subjects)) {
      if (level > 0.8) {
        strengths.push(subject);
      }
    }

    // Identify areas for improvement
    const areasForImprovement: string[] = [];
    for (const [subject, level] of Object.entries(learningLevel.subjects)) {
      if (level < 0.6) {
        areasForImprovement.push(subject);
      }
    }

    // Determine learning style
    const learningStyle = await this.determineLearningStyle(userId);

    // Find optimal study time
    const optimalStudyTime = await this.findOptimalStudyTime(userId);

    // Generate recommended actions
    const recommendedActions = await this.generateRecommendedActions(userId, learningLevel, planSuccess);

    return {
      strengths,
      areasForImprovement,
      learningStyle,
      optimalStudyTime,
      recommendedActions,
    };
  }

  /**
   * Get achievements
   */
  private async getAchievements(userId: string): Promise<any> {
    const achievements = await this.prisma.achievement.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const total = achievements.length;
    const recent = achievements.slice(0, 5);
    const upcoming = await this.getUpcomingAchievements(userId);

    return {
      total,
      recent,
      upcoming,
    };
  }

  /**
   * Get goals
   */
  private async getGoals(userId: string): Promise<any> {
    // DÜZELTME: PrismaService'te goal modeli yok; studyGoal kullanılıyor
    const currentGoals = await this.prisma.studyGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const completedGoals = await this.prisma.studyGoal.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    const progress: Record<string, number> = {};
    for (const goal of currentGoals) {
      // DÜZELTME: progress alanı yoksa 0 kabul edilir
      progress[goal.id] = (goal as any).progress || 0;
    }

    return {
      current: currentGoals,
      completed: completedGoals,
      progress,
    };
  }

  /**
   * Analyze social learning
   */
  private async analyzeSocialLearning(userId: string): Promise<any> {
    // DÜZELTME: PrismaService'te studyGroup/collaboration/peerInteraction yok; interaction üzerinden sayım
    const peerInteractions = await (this.prisma as any).interaction?.count?.({ where: { userId } }) || 0;
    const studyGroups = 0;
    const collaborations = 0;

    const socialScore = Math.min(1, (studyGroups + collaborations + peerInteractions) / 10);

    return {
      studyGroups,
      collaborations,
      peerInteractions,
      socialScore,
    };
  }

  /**
   * Analyze wellness
   */
  private async analyzeWellness(userId: string): Promise<any> {
    const recentState = await this.prisma.emotionalState.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }, // DÜZELTME
    });

    const studyLifeBalance = await this.calculateStudyLifeBalance(userId);
    const stressManagement = 1 - (recentState?.stressLevel || 0.5);
    const motivationMaintenance = recentState?.motivationLevel || 0.5;
    const overallWellness = (studyLifeBalance + stressManagement + motivationMaintenance) / 3;

    return {
      studyLifeBalance,
      stressManagement,
      motivationMaintenance,
      overallWellness,
    };
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(
    userId: string,
    learningLevel: LearningLevel,
    planSuccess: PlanSuccess,
    emotionalState: any,
  ): Promise<any> {
    const immediate: any[] = [];
    const shortTerm: any[] = [];
    const longTerm: any[] = [];

    // Immediate recommendations based on current state
    if (emotionalState.stressLevel > 0.7) {
      immediate.push({
        type: 'wellness',
        title: 'Take a Break',
        description: 'Your stress level is high. Take a 15-minute break.',
        priority: 'high',
      });
    }

    if (emotionalState.motivationLevel < 0.4) {
      immediate.push({
        type: 'motivation',
        title: 'Boost Motivation',
        description: 'Try a quick motivational activity to get back on track.',
        priority: 'high',
      });
    }

    // Short-term recommendations
    if (learningLevel.overall < 0.6) {
      shortTerm.push({
        type: 'learning',
        title: 'Improve Learning Strategy',
        description: 'Focus on fundamental concepts before advanced topics.',
        priority: 'medium',
      });
    }

    if (planSuccess.successRate < 0.7) {
      shortTerm.push({
        type: 'planning',
        title: 'Optimize Study Plans',
        description: 'Break down complex plans into smaller, manageable tasks.',
        priority: 'medium',
      });
    }

    // Long-term recommendations
    if (learningLevel.trends.declining.length > 0) {
      longTerm.push({
        type: 'strategy',
        title: 'Revise Learning Approach',
        description: 'Consider changing your learning strategy for declining subjects.',
        priority: 'low',
      });
    }

    return {
      immediate,
      shortTerm,
      longTerm,
    };
  }

  // Helper methods
  private async analyzeLearningTrends(userId: string, progressData: any[]): Promise<any> {
    // Analyze learning trends from progress data
    return {
      improving: [],
      stable: [],
      declining: [],
    };
  }

  private calculateNextLevel(overallScore: number): string {
    if (overallScore < 0.3) return 'Beginner';
    if (overallScore < 0.6) return 'Intermediate';
    if (overallScore < 0.8) return 'Advanced';
    return 'Expert';
  }

  private calculateProgressToNextLevel(overallScore: number, nextLevel: string): number {
    const thresholds = { Beginner: 0.3, Intermediate: 0.6, Advanced: 0.8, Expert: 1.0 };
    const currentThreshold = thresholds[nextLevel as keyof typeof thresholds];
    return Math.min(1, overallScore / currentThreshold);
  }

  private async calculateStudyStreak(userId: string): Promise<number> {
    // Calculate study streak
    return 0;
  }

  private async calculateBestStreak(userId: string): Promise<number> {
    // Calculate best study streak
    return 0;
  }

  private async calculatePerformanceInPeriod(userId: string, startDate: Date): Promise<number> {
    // Calculate performance in a specific period
    return 0;
  }

  private async calculateImpactInPeriod(userId: string, startDate: Date): Promise<number> {
    // Calculate impact in a specific period
    return 0;
  }

  private async determineLearningStyle(userId: string): Promise<string> {
    // Determine learning style from user behavior
    return 'mixed';
  }

  private async findOptimalStudyTime(userId: string): Promise<string> {
    // Find optimal study time from user patterns
    return 'morning';
  }

  private async generateRecommendedActions(userId: string, learningLevel: LearningLevel, planSuccess: PlanSuccess): Promise<string[]> {
    // Generate recommended actions based on current state
    return [];
  }

  private async getUpcomingAchievements(userId: string): Promise<any[]> {
    // Get upcoming achievements
    return [];
  }

  private async calculateStudyLifeBalance(userId: string): Promise<number> {
    // Calculate study-life balance
    return 0.5;
  }

  private async storeDashboardData(userId: string, dashboard: PersonalizedDashboard): Promise<void> {
    // DÜZELTME: PrismaService'te dashboardData yok; mevcutsa çağır, yoksa atla
    try {
      const repo = (this.prisma as any).dashboardData;
      if (repo?.create) {
        await repo.create({
          data: {
            userId,
            data: dashboard as any,
            timestamp: new Date(),
          },
        });
      }
    } catch (error) {
      this.logger.warn(`Dashboard data persistence skipped`, { error: (error instanceof Error ? error.message : String(error)) });
    }
  }
}
