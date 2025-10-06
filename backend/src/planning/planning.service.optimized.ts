import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PlanType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { PlanGenerationService } from './plan-generation.service';
import { PlanPersistenceService } from './plan-persistence.service';
import { PlanValidationService } from './plan-validation.service';
import { ScheduleAdjustmentService } from './schedule-adjustment.service';
import { AiAnalysisService } from './ai-analysis.service';
import { TopicManagementService } from './topic-management.service';
import { ProgressTrackingService } from './progress-tracking.service';
import { AssessmentService } from './assessment.service';
import { CoachingService } from './coaching.service';
import { DigitalDossierService } from './digital-dossier.service';
import { AdaptiveInsightsService } from './adaptive-insights.service';
import { AdaptiveStrategyService } from './adaptive-strategy.service';
import { CacheService } from '../common/cache/cache.service';

interface PlanGenerationData {
  subjects: string[];
  goals: string[];
  availableTime: number;
  learningStyle?: string;
  currentLevel?: string;
  preferences?: {
    studyTimes?: string[];
    difficulty?: string;
  };
}

interface PlanParameters {
  subjects: string[];
  goals: string[];
  availableTime: number;
  learningStyle?: string;
  currentLevel?: string;
  preferences?: any;
}

@Injectable()
export class PlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planGeneration: PlanGenerationService,
    private readonly planPersistence: PlanPersistenceService,
    private readonly planValidation: PlanValidationService,
    private readonly scheduleAdjustment: ScheduleAdjustmentService,
    private readonly aiAnalysis: AiAnalysisService,
    private readonly topicManagement: TopicManagementService,
    private readonly progressTracking: ProgressTrackingService,
    private readonly assessment: AssessmentService,
    private readonly coaching: CoachingService,
    private readonly dossier: DigitalDossierService,
    private readonly adaptiveInsights: AdaptiveInsightsService,
    private readonly adaptiveStrategy: AdaptiveStrategyService,
    private readonly cache: CacheService,
  ) {}

  // Ana plan üretimi - koordinasyon
  async generatePlan(data: PlanGenerationData | (any & { userId: string })): Promise<any> {
    try {
      // 1. Kullanıcı bağlamını analiz et
      const userContext = await this.analyzeUserContext(data.userId);
      
      // 2. AI ile plan üret
      const planResult = await this.planGeneration.generatePlan({
        subjects: data.subjects,
        goals: data.goals,
        availableTime: data.availableTime,
        learningStyle: data.learningStyle,
        currentLevel: data.currentLevel,
        preferences: data.preferences,
      });

      // 3. Planı doğrula
      const validation = this.planValidation.validatePlan(planResult.plan);
      if (!validation.isValid) {
        throw new BadRequestException(`Plan validation failed: ${validation.errors.join(', ')}`);
      }

      // 4. Planı kaydet
      const savedPlan = await this.planPersistence.createPlan({
        userId: data.userId,
        title: planResult.plan.title,
        description: planResult.plan.description,
        type: PlanType.WEEKLY,
        subjects: data.subjects,
        goals: data.goals,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün
        metadata: {
          planStructure: planResult.plan,
          aiGenerated: true,
        },
      });

      // 5. Seansları oluştur
      if (planResult.sessions && planResult.sessions.length > 0) {
        await this.planPersistence.createStudySessions(savedPlan.id, planResult.sessions, data.userId);
      }

      return {
        success: true,
        plan: savedPlan,
        sessions: planResult.sessions,
        message: 'Plan generated successfully',
      };
    } catch (error) {
      throw new BadRequestException(`Plan generation failed: ${(error as any).message}`);
    }
  }

  // Kullanıcı bağlamını analiz et
  private async analyzeUserContext(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        studySessions: {
          where: { isCompleted: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user?.studentProfile) {
      return {
        weakAreas: [],
        strongAreas: [],
        topicSuccessRates: {},
        subjectPerformance: {},
        preferredStudyHours: [],
        subjectTimeAllocation: {},
      };
    }

    // Zayıf alanları tespit et
    const weakAreas = await this.identifyWeakAreas(userId);
    
    // Güçlü alanları tespit et
    const strongAreas = await this.identifyStrongAreas(userId);
    
    // Konu başarı oranları
    const topicSuccessRates = this.calculateTopicSuccessRates(user.studySessions);
    
    // Ders performansı
    const subjectPerformance = this.calculateSubjectPerformance(user.studySessions);
    
    // Tercih edilen çalışma saatleri
    const preferredStudyHours = this.calculatePreferredStudyHours(user.studySessions);
    
    // Ders zaman dağılımı
    const subjectTimeAllocation = this.calculateSubjectTimeAllocation(user.studySessions);

    return {
      weakAreas,
      strongAreas,
      topicSuccessRates,
      subjectPerformance,
      preferredStudyHours,
      subjectTimeAllocation,
    };
  }

  // Konu başarı oranlarını hesapla
  private calculateTopicSuccessRates(sessions: any[]): Record<string, number> {
    const rates: Record<string, { total: number; success: number }> = {};
    
    sessions.forEach(session => {
      if (session.performance !== null && session.performance !== undefined) {
        if (!rates[session.topic]) {
          rates[session.topic] = { total: 0, success: 0 };
        }
        rates[session.topic].total++;
        if (session.performance >= 70) {
          rates[session.topic].success++;
        }
      }
    });

    const result: Record<string, number> = {};
    Object.keys(rates).forEach(topic => {
      result[topic] = rates[topic].total > 0 ? (rates[topic].success / rates[topic].total) * 100 : 0;
    });

    return result;
  }

  // Ders performansını hesapla
  private calculateSubjectPerformance(sessions: any[]): Record<string, number> {
    const performance: Record<string, { total: number; sum: number }> = {};
    
    sessions.forEach(session => {
      if (session.performance !== null && session.performance !== undefined) {
        if (!performance[session.subject]) {
          performance[session.subject] = { total: 0, sum: 0 };
        }
        performance[session.subject].total++;
        performance[session.subject].sum += session.performance;
      }
    });

    const result: Record<string, number> = {};
    Object.keys(performance).forEach(subject => {
      result[subject] = performance[subject].total > 0 ? 
        performance[subject].sum / performance[subject].total : 0;
    });

    return result;
  }

  // Tercih edilen çalışma saatlerini hesapla
  private calculatePreferredStudyHours(sessions: any[]): string[] {
    const hourCounts: Record<number, number> = {};
    
    sessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);
  }

  // Ders zaman dağılımını hesapla
  private calculateSubjectTimeAllocation(sessions: any[]): Record<string, number> {
    const allocation: Record<string, number> = {};
    
    sessions.forEach(session => {
      allocation[session.subject] = (allocation[session.subject] || 0) + session.duration;
    });

    return allocation;
  }

  // Progress tracking
  async trackProgress(userId: string, sessionId: string, performance: { score: number; timeSpent: number; notes?: string }) {
    return this.progressTracking.trackProgress(userId, sessionId, performance);
  }

  async getProgressOverview(userId: string) {
    return this.progressTracking.getProgressOverview(userId);
  }

  // Assessment
  async startAssessment(userId: string, assessmentData: { subjects: string[]; grade: number; learningGoals: string[] }) {
    return this.assessment.startAssessment(userId, assessmentData);
  }

  async getAssessmentStatus(userId: string) {
    return this.assessment.getAssessmentStatus(userId);
  }

  // Coaching
  async getSmartCoaching(userId: string) {
    return this.coaching.getSmartCoaching(userId);
  }

  // Schedule adjustment
  async rescheduleSession(data: { userId: string; sessionId: string; newStartTime: Date; duration?: number }) {
    return this.scheduleAdjustment.rescheduleSession(data);
  }

  async completeSession(data: { userId: string; sessionId: string; performance?: number }) {
    return this.scheduleAdjustment.completeSession(data);
  }

  async cancelSession(data: { userId: string; sessionId: string; reason?: string }) {
    return this.scheduleAdjustment.cancelSession(data);
  }

  // Plan management
  async getUserPlans(userId: string) {
    return this.planPersistence.getUserPlans(userId);
  }

  async getPlan(userId: string, planId: string) {
    return this.planPersistence.getPlan(userId, planId);
  }

  async updatePlan(userId: string, planId: string, data: any) {
    return this.planPersistence.updatePlan(planId, data);
  }

  async deletePlan(userId: string, planId: string) {
    return this.planPersistence.deletePlan(planId);
  }

  // Topic management
  async getMebTopics(subject?: string, grade?: string) {
    return this.topicManagement.getTopicsBySubjectAndGrade(subject || '', parseInt(grade || '0'));
  }

  async getYksSubjectRecommendations(track?: string) {
    return this.assessment.getYksSubjectRecommendations(track);
  }

  // Utility methods
  async updateTaskProgress(data: { userId: string; taskId: string; minutes: number }) {
    // Task progress update logic
    return { success: true, message: 'Progress updated' };
  }

  async createPlanFromOnboarding(userId: string, data: any) {
    // Create plan from onboarding data
    return this.generatePlan({ ...data, userId });
  }

  async createPremiumPlan(userId: string, data: any) {
    // Create premium plan
    return this.generatePlan({ ...data, userId });
  }

  async checkHolidayStatus(userId: string) {
    // Check holiday status
    return { isHoliday: false, message: 'Not in holiday period' };
  }

  async assignYksSubjects(userId: string, data: { subjects: string[] }) {
    // Assign YKS subjects
    return { success: true, subjects: data.subjects };
  }

  async generateYksPlan(userId: string, data: any) {
    // Generate YKS plan
    return this.generatePlan({ ...data, userId });
  }

  // Eksik methodları ekle
  private async identifyWeakAreas(userId: string): Promise<string[]> {
    // Implementation for identifying weak areas
    return [];
  }

  private async identifyStrongAreas(userId: string): Promise<string[]> {
    // Implementation for identifying strong areas
    return [];
  }
}
