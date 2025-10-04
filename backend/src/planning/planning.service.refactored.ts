import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GeminiService } from '../services/gemini.service';
import { GeminiFunctionCallingService } from '../services/gemini-fc.service';
import { SolverService } from '../services/solver.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { MetricsService } from '../monitoring/metrics.service';
import { PlanGenerationService } from './plan-generation.service';
import { PlanValidationService } from './plan-validation.service';
import { PlanPersistenceService } from './plan-persistence.service';
import { PlanAnalysisService } from './plan-analysis.service';
import { ScheduleAdjustmentService } from './schedule-adjustment.service';
import { AdaptiveInsightsService } from './adaptive-insights.service';
import { AdaptiveStrategyService } from './adaptive-strategy.service';
import { CacheService } from '../services/cache.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';

interface PlanGenerationData {
  subjects: string[];
  goals: string[];
  availableTime: number;
  learningStyle: string;
  currentLevel: string;
  userId?: string;
  preferences?: {
    studyTimes: string[];
    sessionDuration: number;
    breakDuration: number;
    difficulty: string;
    focusAreas: string[];
    grade?: number | string;
    curriculumTopicsBySubject?: Record<string, string[]>;
  };
}

@Injectable()
export class PlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly geminiFC: GeminiFunctionCallingService,
    private readonly solver: SolverService,
    private readonly realtime: RealtimeGateway,
    private readonly metrics: MetricsService,
    private readonly planGeneration: PlanGenerationService,
    private readonly planValidation: PlanValidationService,
    private readonly planPersistence: PlanPersistenceService,
    private readonly planAnalysis: PlanAnalysisService,
    private readonly scheduleAdjustmentService: ScheduleAdjustmentService,
    private readonly adaptiveInsights: AdaptiveInsightsService,
    private readonly adaptiveStrategy: AdaptiveStrategyService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Plan oluşturur
   */
  async generatePlan(data: PlanGenerationData | (GeneratePlanDto & { userId: string })): Promise<any> {
    const normalized: PlanGenerationData = (data as any).availableTime != null
      ? (data as PlanGenerationData)
      : {
          subjects: (data as any).subjects,
          goals: (data as any).goals ?? [],
          availableTime: 120,
          learningStyle: (data as any).learningStyle,
          currentLevel: (data as any).currentLevel,
          userId: (data as any).userId,
          preferences: (data as any).preferences,
        };

    if (!normalized.userId) {
      throw new BadRequestException('Kullanıcı kimliği gerekli');
    }

    const userId = normalized.userId;

    // BASIC MODE: Deterministik plan üret
    const requestedMode = (data as any)?.mode || 'ai';
    if (requestedMode === 'basic') {
      return this.generateBasicPlan(normalized);
    }

    // AI MODE: AI ile plan üret
    return this.generateAiPlan(normalized);
  }

  /**
   * Kullanıcının planlarını getirir
   */
  async getUserPlans(userId: string): Promise<any> {
    const plans = await this.planPersistence.getUserPlans(userId);
    
    return plans.map(plan => ({
      ...plan,
      progress: this.planAnalysis.calculatePlanProgress(plan.sessions),
      nextSession: this.planAnalysis.getNextSession(plan.sessions),
      stats: {
        totalSessions: plan.sessions.length,
        completedSessions: plan.sessions.filter(s => s.isCompleted).length,
        totalStudyTime: plan.sessions.reduce((sum, s) => sum + s.duration, 0),
        completedStudyTime: plan.sessions.filter(s => s.isCompleted).reduce((sum, s) => sum + s.duration, 0),
      },
    }));
  }

  /**
   * Belirli bir planı getirir
   */
  async getPlan(userId: string, planId: string): Promise<any> {
    const plan = await this.planPersistence.getPlan(userId, planId);
    
    // Eğer bu planda henüz session oluşmadıysa metadata.planStructure üzerinden backfill yap
    if (!plan.sessions || plan.sessions.length === 0) {
      const planStructure: any = (plan as any)?.metadata?.planStructure || {};
      const sessionsFromStructure = Array.isArray(planStructure.sessions)
        ? planStructure.sessions
        : Array.isArray(planStructure.weeklyPlans)
          ? planStructure.weeklyPlans.flatMap((w: any) => w?.sessions || [])
          : [];
      if (sessionsFromStructure.length > 0) {
        await this.planPersistence.createStudySessions(plan.id, sessionsFromStructure, userId);
        // Tekrar yükle
        const updatedPlan = await this.planPersistence.getPlan(userId, planId);
        return {
          ...updatedPlan,
          progress: this.planAnalysis.calculatePlanProgress(updatedPlan.sessions),
          analytics: await this.planAnalysis.getPlanAnalytics(planId),
          recommendations: await this.planAnalysis.getPlanRecommendations(updatedPlan),
        };
      }
    }

    return {
      ...plan,
      progress: this.planAnalysis.calculatePlanProgress(plan.sessions),
      analytics: await this.planAnalysis.getPlanAnalytics(planId),
      recommendations: await this.planAnalysis.getPlanRecommendations(plan),
    };
  }

  /**
   * Plan günceller
   */
  async updatePlan(userId: string, planId: string, updateData: any): Promise<any> {
    // Sahiplik kontrolü
    const isOwner = await this.planPersistence.verifyPlanOwnership(userId, planId);
    if (!isOwner) {
      throw new NotFoundException('Plan not found or access denied');
    }

    // Doğrulama
    const validation = this.planValidation.validatePlanUpdate(updateData);
    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    // Güncelleme
    const updatedPlan = await this.planPersistence.updatePlan(planId, updateData);
    
    // Metrikleri kaydet
    await this.metrics.recordPlanUpdate(planId, updateData);

    return {
      success: true,
      message: 'Plan updated successfully',
      plan: updatedPlan,
    };
  }

  /**
   * Plan siler
   */
  async deletePlan(userId: string, planId: string): Promise<any> {
    // Sahiplik kontrolü
    const isOwner = await this.planPersistence.verifyPlanOwnership(userId, planId);
    if (!isOwner) {
      throw new NotFoundException('Plan not found or access denied');
    }

    // Silme
    await this.planPersistence.deletePlan(planId);
    
    // Metrikleri kaydet
    await this.metrics.recordPlanDelete(planId);

    return {
      success: true,
      message: 'Plan deleted successfully',
    };
  }

  /**
   * Temel plan oluşturur
   */
  private async generateBasicPlan(data: PlanGenerationData): Promise<any> {
    const planDurationDays = 3; // Varsayılan 3 gün
    
    // Konuları al
    const relevantTopics = await this.getRelevantTopicsForStudent(data, new Date());
    
    // Deterministik plan oluştur
    const planSkeleton = this.planGeneration.buildScheduleFromTopics(relevantTopics, {
      ...data,
      planDurationDays,
    });

    // Planı doğrula
    const validation = this.planValidation.validatePlan(planSkeleton);
    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    // Planı kaydet
    const savedPlan = await this.planPersistence.createPlan({
      title: 'Temel Çalışma Planı',
      description: 'Deterministik olarak oluşturulmuş plan',
      type: 'basic',
      subjects: data.subjects,
      goals: data.goals,
      userId: data.userId,
      startDate: new Date(),
      endDate: new Date(Date.now() + planDurationDays * 24 * 60 * 60 * 1000),
      isActive: true,
      metadata: { planStructure: planSkeleton },
    });

    // Study session'ları oluştur
    const sessions = planSkeleton.weeklyPlans.flatMap(week => week.sessions);
    await this.planPersistence.createStudySessions(savedPlan.id, sessions, data.userId);

    // Metrikleri kaydet
    await this.metrics.recordPlanGeneration(savedPlan.id, 'basic');

    return {
      success: true,
      message: 'Basic plan generated successfully',
      plan: savedPlan,
    };
  }

  /**
   * AI ile plan oluşturur
   */
  private async generateAiPlan(data: PlanGenerationData): Promise<any> {
    const userId = data.userId;
    
    // Kullanıcı profilini al
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.studentProfile) {
      throw new BadRequestException('Student profile not found');
    }

    // Kullanıcı bağlamını analiz et (N+1 problemi çözülmüş)
    const userContext = await this.planAnalysis.analyzeUserContext(userId);
    
    // Konuları al
    const relevantTopics = await this.getRelevantTopicsForStudent(data, new Date());
    
    // AI ile plan oluştur
    const planSkeleton = this.planGeneration.buildScheduleFromTopics(relevantTopics, {
      ...data,
      planDurationDays: 7, // AI planları için 7 gün
    });

    // AI ile zenginleştir
    let finalPlanStructure: any = planSkeleton;
    try {
      const insights = await this.adaptiveInsights.computeUserInsights(userId);
      finalPlanStructure = await this.planGeneration.enrichSkeletonWithAI(
        planSkeleton, 
        data.learningStyle, 
        { insights, hints: undefined }
      );
    } catch (err) {
      console.warn('[PLANNING] AI enrichment failed, using skeleton', err);
      finalPlanStructure = {
        ...planSkeleton,
        fallbackReason: 'ai_enrichment_failed',
      };
    }

    // Planı doğrula
    const validation = this.planValidation.validatePlan(finalPlanStructure);
    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    // Planı kaydet
    const savedPlan = await this.planPersistence.createPlan({
      title: finalPlanStructure.planTitle || 'AI Çalışma Planı',
      description: 'AI ile oluşturulmuş kişiselleştirilmiş plan',
      type: 'ai',
      subjects: data.subjects,
      goals: data.goals,
      userId: data.userId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
      metadata: { planStructure: finalPlanStructure },
    });

    // Study session'ları oluştur
    const sessions = finalPlanStructure.weeklyPlans.flatMap(week => week.sessions);
    await this.planPersistence.createStudySessions(savedPlan.id, sessions, data.userId);

    // Metrikleri kaydet
    await this.metrics.recordPlanGeneration(savedPlan.id, 'ai');

    return {
      success: true,
      message: 'AI plan generated successfully',
      plan: savedPlan,
    };
  }

  /**
   * Öğrenci için ilgili konuları getirir
   */
  private async getRelevantTopicsForStudent(studentProfile: any, currentDate: Date): Promise<string[]> {
    const grade = studentProfile.grade || 12;
    const field = studentProfile.field || 'Sayısal';
    const subjects = studentProfile.selectedSubjects || [];

    const curriculum = await this.prisma.curriculum.findMany({
      where: {
        grade,
        field,
        subject: { in: subjects },
      },
      select: { subject: true, topic: true },
    });

    return curriculum.map(c => `${c.subject}::${c.topic}`);
  }

  /**
   * Gemini ile içerik oluşturur (retry ile)
   */
  private async generateContentWithRetry(prompt: string, maxRetries = 2, initialDelayMs = 1000): Promise<string> {
    return this.planGeneration.generateContentWithRetry(prompt, maxRetries, initialDelayMs);
  }
}
