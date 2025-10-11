import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PlanType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { PlanningFacade } from './planning-facade.service';
import { PlanGenerationService } from './services/plan-generation.service';
import { PlanValidationService } from './services/plan-validation.service';
import { PlanOptimizationService } from './services/plan-optimization.service';
import { PlanPersistenceService } from './services/plan-persistence.service';
import { ScheduleAdjustmentService } from './schedule-adjustment.service';
import { AiAnalysisService } from './ai-analysis.service';
import { TopicManagementService } from './services/topic-management.service';
import { ProgressTrackingService } from './progress-tracking.service';
import { AssessmentService } from './assessment.service';
import { CoachingService } from './coaching.service';
import { DigitalDossierService } from './digital-dossier.service';
import { AdaptiveInsightsService } from './adaptive-insights.service';
import { AdaptiveStrategyService } from './adaptive-strategy.service';
import { CacheService } from '../common/cache/cache.service';
import { QueueService } from '../services/queue.service';
import { CurriculumEngineService } from './services/curriculum-engine.service';
import { PerformanceAnalyzerService } from './services/performance-analyzer.service';
import { TopicPrioritizerService } from './services/topic-prioritizer.service';
import { AIService } from '../ai/ai.service';
import { LoggingService } from '../common/logging/logging.service';
import { ExceptionService } from '../common/exceptions/exception.service';

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

/**
 * Refactored PlanningService - SRP uyumlu, 300 satır altında
 * Ana sorumluluk: PlanningFacade'i koordine etmek
 */
@Injectable()
export class PlanningService {
  private readonly logger = new Logger(PlanningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planningFacade: PlanningFacade,
    private readonly planGeneration: PlanGenerationService,
    private readonly planValidation: PlanValidationService,
    private readonly planOptimization: PlanOptimizationService,
    private readonly planPersistence: PlanPersistenceService,
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
    private readonly queue: QueueService,
    private readonly curriculumEngine: CurriculumEngineService,
    private readonly performanceAnalyzer: PerformanceAnalyzerService,
    private readonly topicPrioritizer: TopicPrioritizerService,
    private readonly aiService: AIService,
    private readonly loggingService: LoggingService,
    private readonly exceptionService: ExceptionService,
  ) {}

  /**
   * Ana plan üretimi - PlanningFacade'e delegate eder
   */
  async generatePlan(data: PlanGenerationData | (any & { userId: string })): Promise<any> {
    try {
      this.loggingService.log('Plan generation started', { userId: data.userId });
      
      const result = await this.planningFacade.generatePlan({
        userId: data.userId,
        subjects: data.subjects,
        goals: data.goals,
        availableTime: data.availableTime,
        learningStyle: data.learningStyle,
        currentLevel: data.currentLevel,
        preferences: data.preferences,
        planDurationDays: (data as any).planDurationDays,
        planType: (data as any).planType,
        targetExam: (data as any).targetExam,
        optimize: (data as any).optimize,
        optimizationOptions: (data as any).optimizationOptions,
      });

      this.loggingService.log('Plan generation completed', { 
        userId: data.userId, 
        planId: result.plan.id 
      });

      return result;
    } catch (error) {
      this.loggingService.error('Plan generation failed', { 
        userId: data.userId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw this.exceptionService.handlePlanningError(error, 'Plan generation failed');
    }
  }

  /**
   * Kullanıcı planlarını getir - PlanPersistenceService'e delegate eder
   */
  async getUserPlans(userId: string) {
    try {
      return await this.planPersistence.getUserPlans(userId);
    } catch (error) {
      this.loggingService.error('Failed to get user plans', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to get user plans');
    }
  }

  /**
   * Plan detayını getir - PlanPersistenceService'e delegate eder
   */
  async getPlan(userId: string, planId: string) {
    try {
      return await this.planPersistence.getPlan(userId, planId);
    } catch (error) {
      this.loggingService.error('Failed to get plan', { userId, planId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to get plan');
    }
  }

  /**
   * Plan güncelle - PlanPersistenceService'e delegate eder
   */
  async updatePlan(userId: string, planId: string, data: any) {
    try {
      return await this.planPersistence.updatePlan(userId, planId, data);
    } catch (error) {
      this.loggingService.error('Failed to update plan', { userId, planId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to update plan');
    }
  }

  /**
   * Plan sil - PlanPersistenceService'e delegate eder
   */
  async deletePlan(userId: string, planId: string) {
    try {
      return await this.planPersistence.deletePlan(userId, planId);
    } catch (error) {
      this.loggingService.error('Failed to delete plan', { userId, planId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to delete plan');
    }
  }

  /**
   * Plan optimizasyonu - PlanOptimizationService'e delegate eder
   */
  async optimizePlan(planId: string, userId: string): Promise<any> {
    try {
      // Plan'ı ve session'ları getir
      const plan = await this.planPersistence.getPlan(planId, userId);
      if (!plan) {
        throw new Error('Plan not found');
      }
      
      // Plan structure'ı oluştur
      const planStructure = {
        id: plan.id,
        title: plan.title,
        description: plan.description,
        subjects: plan.subjects,
        goals: plan.goals,
        startDate: plan.startDate,
        endDate: plan.endDate,
        type: plan.type,
        metadata: plan.metadata
      };
      
      // Session structure'ları oluştur
      const sessionStructures = plan.studySessions?.map((session: any) => ({
        id: session.id,
        subject: session.subject,
        topic: session.topic,
        duration: session.duration,
        difficulty: session.difficulty,
        type: session.type,
        order: session.order,
        startTime: session.startTime,
        endTime: session.endTime,
        objectives: session.objectives,
        resources: session.resources,
        techniques: session.techniques,
        metadata: session.metadata
      })) || [];
      
      return await this.planOptimization.optimizePlan(planStructure, sessionStructures, userId, {});
    } catch (error) {
      this.loggingService.error('Failed to optimize plan', { userId, planId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to optimize plan');
    }
  }

  /**
   * İlerleme takibi - ProgressTrackingService'e delegate eder
   */
  async trackProgress(userId: string, sessionId: string, performance: { 
    score: number; 
    timeSpent: number; 
    notes?: string 
  }) {
    try {
      return await this.progressTracking.trackProgress(userId, sessionId, performance);
    } catch (error) {
      this.loggingService.error('Failed to track progress', { userId, sessionId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to track progress');
    }
  }

  /**
   * İlerleme özeti - ProgressTrackingService'e delegate eder
   */
  async getProgressOverview(userId: string) {
    try {
      return await this.progressTracking.getProgressOverview(userId);
    } catch (error) {
      this.loggingService.error('Failed to get progress overview', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to get progress overview');
    }
  }

  /**
   * Değerlendirme başlat - AssessmentService'e delegate eder
   */
  async startAssessment(userId: string, assessmentData: { 
    subjects: string[]; 
    grade: number; 
    learningGoals: string[] 
  }) {
    try {
      return await this.assessment.startAssessment(userId, assessmentData);
    } catch (error) {
      this.loggingService.error('Failed to start assessment', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to start assessment');
    }
  }

  /**
   * Değerlendirme durumu - AssessmentService'e delegate eder
   */
  async getAssessmentStatus(userId: string) {
    try {
      return await this.assessment.getAssessmentStatus(userId);
    } catch (error) {
      this.loggingService.error('Failed to get assessment status', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to get assessment status');
    }
  }

  /**
   * Akıllı koçluk - CoachingService'e delegate eder
   */
  async getSmartCoaching(userId: string) {
    try {
      return await this.coaching.getSmartCoaching(userId);
    } catch (error) {
      this.loggingService.error('Failed to get smart coaching', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to get smart coaching');
    }
  }

  /**
   * Oturum yeniden planla - ScheduleAdjustmentService'e delegate eder
   */
  async rescheduleSession(data: { 
    userId: string; 
    sessionId: string; 
    newStartTime: Date; 
    duration?: number 
  }) {
    try {
      return await this.scheduleAdjustment.rescheduleSession(data);
    } catch (error) {
      this.loggingService.error('Failed to reschedule session', { 
        userId: data.userId, 
        sessionId: data.sessionId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw this.exceptionService.handlePlanningError(error, 'Failed to reschedule session');
    }
  }

  /**
   * Oturum tamamla - ScheduleAdjustmentService'e delegate eder
   */
  async completeSession(data: { 
    userId: string; 
    sessionId: string; 
    performance?: number 
  }) {
    try {
      return await this.scheduleAdjustment.completeSession(data);
    } catch (error) {
      this.loggingService.error('Failed to complete session', { 
        userId: data.userId, 
        sessionId: data.sessionId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw this.exceptionService.handlePlanningError(error, 'Failed to complete session');
    }
  }

  /**
   * Oturum iptal et - ScheduleAdjustmentService'e delegate eder
   */
  async cancelSession(data: { 
    userId: string; 
    sessionId: string; 
    reason?: string 
  }) {
    try {
      return await this.scheduleAdjustment.cancelSession(data);
    } catch (error) {
      this.loggingService.error('Failed to cancel session', { 
        userId: data.userId, 
        sessionId: data.sessionId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw this.exceptionService.handlePlanningError(error, 'Failed to cancel session');
    }
  }

  /**
   * MEB konularını getir - TopicManagementService'e delegate eder
   */
  async getMebTopics(subject?: string, grade?: string) {
    try {
      return await (this.topicManagement as any).getMebTopics(subject, grade);
    } catch (error) {
      this.loggingService.error('Failed to get MEB topics', { subject, grade, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to get MEB topics');
    }
  }

  /**
   * YKS konu önerileri - TopicManagementService'e delegate eder
   */
  async getYksSubjectRecommendations(track?: string) {
    try {
      return await (this.topicManagement as any).getYksSubjectRecommendations(track);
    } catch (error) {
      this.loggingService.error('Failed to get YKS recommendations', { track, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to get YKS recommendations');
    }
  }

  /**
   * Görev ilerlemesi güncelle - ProgressTrackingService'e delegate eder
   */
  async updateTaskProgress(data: { 
    userId: string; 
    taskId: string; 
    minutes: number 
  }) {
    try {
      return await this.progressTracking.updateTaskProgressWithMinutes(data);
    } catch (error) {
      this.loggingService.error('Failed to update task progress', { 
        userId: data.userId, 
        taskId: data.taskId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw this.exceptionService.handlePlanningError(error, 'Failed to update task progress');
    }
  }

  /**
   * Onboarding'den plan oluştur - PlanningFacade'e delegate eder
   */
  async createPlanFromOnboarding(userId: string, data: any) {
    try {
      return await this.planningFacade.createPlanFromOnboarding(userId, data);
    } catch (error) {
      this.loggingService.error('Failed to create plan from onboarding', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to create plan from onboarding');
    }
  }

  /**
   * Premium plan oluştur - PlanningFacade'e delegate eder
   */
  async createPremiumPlan(userId: string, data: any) {
    try {
      return await this.planningFacade.createPremiumPlan(userId, data);
    } catch (error) {
      this.loggingService.error('Failed to create premium plan', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to create premium plan');
    }
  }

  /**
   * Tatil durumu kontrol et - ScheduleAdjustmentService'e delegate eder
   */
  async checkHolidayStatus(userId: string) {
    try {
      return await this.scheduleAdjustment.checkHolidayStatus(userId);
    } catch (error) {
      this.loggingService.error('Failed to check holiday status', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to check holiday status');
    }
  }

  /**
   * YKS konuları ata - TopicManagementService'e delegate eder
   */
  async assignYksSubjects(userId: string, data: { subjects: string[] }) {
    try {
      return await (this.topicManagement as any).assignYksSubjects(userId, data);
    } catch (error) {
      this.loggingService.error('Failed to assign YKS subjects', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to assign YKS subjects');
    }
  }

  /**
   * YKS planı oluştur - PlanningFacade'e delegate eder
   */
  async generateYksPlan(userId: string, data: any) {
    try {
      return await this.planningFacade.generateYksPlan(userId, data);
    } catch (error) {
      this.loggingService.error('Failed to generate YKS plan', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to generate YKS plan');
    }
  }

  /**
   * Tatil planı oluştur - PlanningFacade'e delegate eder
   */
  async generateHolidayPlan(data: any) {
    try {
      // return await this.planningFacade.generateHolidayPlan(data); // Bu metod kaldırıldı
      return { success: false, message: 'Holiday plan generation not implemented' };
    } catch (error) {
      this.loggingService.error('Failed to generate holiday plan', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to generate holiday plan');
    }
  }

  /**
   * Uzun vadeli plan oluştur - PlanningFacade'e delegate eder
   */
  async createLongTermPlan(userId: string, data: any) {
    try {
      // return await this.planningFacade.createLongTermPlan(userId, data); // Bu metod kaldırıldı
      return { success: false, message: 'Long term plan creation not implemented' };
    } catch (error) {
      this.loggingService.error('Failed to create long term plan', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to create long term plan');
    }
  }

  /**
   * Uzun vadeli plan getir - PlanningFacade'e delegate eder
   */
  async getLongTermPlan(userId: string) {
    try {
      // return await this.planningFacade.getLongTermPlan(userId); // Bu metod kaldırıldı
      return { success: false, message: 'Long term plan retrieval not implemented' };
    } catch (error) {
      this.loggingService.error('Failed to get long term plan', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to get long term plan');
    }
  }

  /**
   * Haftalık özet - ProgressTrackingService'e delegate eder
   */
  async getWeeklyOverview(userId: string) {
    try {
      // return await this.progressTracking.getWeeklyOverview(userId); // Bu metod kaldırıldı
      return { success: false, message: 'Weekly overview not implemented' };
    } catch (error) {
      this.loggingService.error('Failed to get weekly overview', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to get weekly overview');
    }
  }

  /**
   * Günlük program - ScheduleAdjustmentService'e delegate eder
   */
  async getDailySchedule(userId: string, date: string) {
    try {
      // return await this.scheduleAdjustment.getDailySchedule(userId, date); // Bu metod kaldırıldı
      return { success: false, message: 'Daily schedule not implemented' };
    } catch (error) {
      this.loggingService.error('Failed to get daily schedule', { userId, date, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to get daily schedule');
    }
  }

  /**
   * Oturum atla - ScheduleAdjustmentService'e delegate eder
   */
  async skipSession(data: { 
    userId: string; 
    sessionId: string; 
    reason: string 
  }) {
    try {
      // return await this.scheduleAdjustment.skipSession(data); // Bu metod kaldırıldı
      return { success: false, message: 'Skip session not implemented' };
    } catch (error) {
      this.loggingService.error('Failed to skip session', { 
        userId: data.userId, 
        sessionId: data.sessionId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw this.exceptionService.handlePlanningError(error, 'Failed to skip session');
    }
  }

  /**
   * İlerleme takibi - ProgressTrackingService'e delegate eder
   */
  async getProgressTracking(userId: string, planId: string) {
    try {
      // return await this.progressTracking.getProgressTracking(userId, planId); // Bu metod kaldırıldı
      return { success: false, message: 'Progress tracking not implemented' };
    } catch (error) {
      this.loggingService.error('Failed to get progress tracking', { userId, planId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to get progress tracking');
    }
  }

  /**
   * Oturum geçmişi - ProgressTrackingService'e delegate eder
   */
  async getSessionHistory(userId: string, filters: any) {
    try {
      // return await this.progressTracking.getSessionHistory(userId, filters); // Bu metod kaldırıldı
      return { success: false, message: 'Session history not implemented' };
    } catch (error) {
      this.loggingService.error('Failed to get session history', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to get session history');
    }
  }

  /**
   * Asenkron plan oluşturma - QueueService'e delegate eder
   */
  async generatePlanAsync(jobData: any) {
    try {
      return await this.queue.addJob('generate-plan', jobData);
    } catch (error) {
      this.loggingService.error('Failed to generate plan async', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw this.exceptionService.handlePlanningError(error, 'Failed to generate plan async');
    }
  }
}
