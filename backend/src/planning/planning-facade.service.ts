import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PlanGenerationService, PlanGenerationData } from './services/plan-generation.service';
import { PlanValidationService } from './services/plan-validation.service';
import { PlanOptimizationService, OptimizationOptions } from './services/plan-optimization.service';
import { PlanPersistenceService, PlanCreateData, PlanUpdateData } from './services/plan-persistence.service';
import { CacheService } from '../common/cache/cache.service';
import { QueueService } from '../services/queue.service';

export interface PlanGenerationRequest {
  userId: string;
  subjects: string[];
  goals: string[];
  availableTime: number;
  learningStyle?: string;
  currentLevel?: string;
  preferences?: {
    studyTimes?: string[];
    difficulty?: string;
  };
  planDurationDays?: number;
  planType?: string;
  targetExam?: string;
  optimize?: boolean;
  optimizationOptions?: OptimizationOptions;
}

export interface PlanGenerationResponse {
  plan: {
    id: string;
    title: string;
    description: string;
    subjects: string[];
    goals: string[];
    totalSessions: number;
    duration: number;
    createdAt: Date;
  };
  sessions: Array<{
    id: string;
    subject: string;
    topic: string;
    duration: number;
    difficulty: string;
    type: string;
    startTime: Date;
    objectives?: string[];
    resources?: string[];
    techniques?: string[];
  }>;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  };
  optimization?: {
    optimized: boolean;
    improvements: string[];
    performanceGain: number;
    originalScore: number;
    optimizedScore: number;
  };
}

@Injectable()
export class PlanningFacade {
  private readonly logger = new Logger(PlanningFacade.name);

  constructor(
    private readonly planGeneration: PlanGenerationService,
    private readonly planValidation: PlanValidationService,
    private readonly planOptimization: PlanOptimizationService,
    private readonly planPersistence: PlanPersistenceService,
    private readonly cache: CacheService,
    private readonly queue: QueueService,
  ) {}

  /**
   * Ana plan üretimi - Facade pattern ile koordinasyon
   */
  async generatePlan(request: PlanGenerationRequest): Promise<PlanGenerationResponse> {
    try {
      this.logger.log(`Generating plan for user: ${request.userId}`);

      // 1. Plan üretimi
      const generationData: PlanGenerationData = {
        userId: request.userId,
        subjects: request.subjects,
        goals: request.goals,
        availableTime: request.availableTime,
        learningStyle: request.learningStyle,
        currentLevel: request.currentLevel,
        preferences: request.preferences,
        planDurationDays: request.planDurationDays,
        planType: request.planType,
        targetExam: request.targetExam,
      };

      const planResult = await this.planGeneration.generatePlan(generationData);

      // 2. Plan doğrulama
      const validation = this.planValidation.validatePlan(planResult.plan);
      const sessionValidation = this.planValidation.validateSessions(planResult.sessions);

      // Doğrulama hatalarını birleştir
      const combinedValidation = {
        isValid: validation.isValid && sessionValidation.isValid,
        errors: [...validation.errors, ...sessionValidation.errors],
        warnings: [...validation.warnings, ...sessionValidation.warnings],
        suggestions: [...validation.suggestions, ...sessionValidation.suggestions],
      };

      // 3. Optimizasyon (isteğe bağlı)
      let optimizationResult;
      if (request.optimize && combinedValidation.isValid) {
        const optimization = await this.planOptimization.optimizePlan(
          planResult.plan,
          planResult.sessions,
          request.userId,
          request.optimizationOptions || {}
        );

        if (optimization.result.optimized) {
          planResult.plan = optimization.plan;
          planResult.sessions = optimization.sessions;
          optimizationResult = optimization.result;
        }
      }

      // 4. Plan kaydetme
      const planCreateData: PlanCreateData = {
        userId: request.userId,
        plan: planResult.plan,
        sessions: planResult.sessions,
        planType: request.planType,
        targetExam: request.targetExam,
        isActive: true,
      };

      const savedPlan = await this.planPersistence.createPlan(planCreateData);

      // 5. Cache güncelleme
      await this.cache.set(`user:${request.userId}:latest_plan`, savedPlan.plan.id, 3600);

      // 6. Queue'ya event ekleme
      await this.queue.add('plan-generated', {
        userId: request.userId,
        planId: savedPlan.plan.id,
        planType: request.planType,
        optimizationApplied: !!optimizationResult,
      });

      this.logger.log(`Plan generated successfully: ${savedPlan.plan.id}`);

      return {
        plan: {
          id: savedPlan.plan.id,
          title: savedPlan.plan.title,
          description: savedPlan.plan.description,
          subjects: savedPlan.plan.subjects,
          goals: savedPlan.plan.goals,
          totalSessions: savedPlan.totalSessions,
          duration: savedPlan.plan.duration,
          createdAt: savedPlan.plan.createdAt,
        },
        sessions: (savedPlan.sessions || savedPlan.studySessions || []).map((session: any) => ({
          id: session.id,
          subject: session.subject,
          topic: session.topic,
          duration: session.duration,
          difficulty: session.difficulty ?? session.metadata?.difficulty,
          type: session.type ?? session.metadata?.type,
          startTime: session.startTime,
          objectives: session.objectives ?? session.metadata?.objectives,
          resources: session.resources ?? session.metadata?.resources,
          techniques: session.techniques ?? session.metadata?.techniques,
        })),
        validation: combinedValidation,
        optimization: optimizationResult,
      };
    } catch (error) {
      this.logger.error(`Plan generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException(`Plan generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Kullanıcının planlarını getir
   */
  async getUserPlans(userId: string, options: {
    includeInactive?: boolean;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      return this.planPersistence.getUserPlans(userId, options);
    } catch (error) {
      this.logger.error(`Failed to get user plans: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Belirli bir planı getir
   */
  async getPlan(userId: string, planId: string) {
    try {
      return this.planPersistence.getPlan(userId, planId);
    } catch (error) {
      this.logger.error(`Failed to get plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Plan güncelle
   */
  async updatePlan(userId: string, planId: string, data: PlanUpdateData) {
    try {
      // Güncelleme öncesi doğrulama
      if (data.title || data.description || data.subjects || data.goals) {
        const existingPlan = await this.planPersistence.getPlan(userId, planId);
        
        const updatedPlan = {
          ...existingPlan,
          title: data.title || existingPlan.title,
          description: data.description || existingPlan.description,
          subjects: data.subjects || existingPlan.subjects,
          goals: data.goals || existingPlan.goals,
        };

        const validation = this.planValidation.validatePlan(updatedPlan);
        if (!validation.isValid) {
          throw new BadRequestException(`Plan validation failed: ${validation.errors.join(', ')}`);
        }
      }

      return this.planPersistence.updatePlan(userId, planId, data);
    } catch (error) {
      this.logger.error(`Failed to update plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Plan sil
   */
  async deletePlan(userId: string, planId: string) {
    try {
      return this.planPersistence.deletePlan(userId, planId);
    } catch (error) {
      this.logger.error(`Failed to delete plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Plan optimizasyonu
   */
  async optimizePlan(
    userId: string, 
    planId: string, 
    options: OptimizationOptions = {}
  ) {
    try {
      this.logger.log(`Optimizing plan: ${planId} for user: ${userId}`);

      // Plan ve seansları getir
      const plan = await this.planPersistence.getPlan(userId, planId);
      
      // Optimizasyon uygula
      const optimization = await this.planOptimization.optimizePlan(
        plan,
        plan.studySessions,
        userId,
        options
      );

      if (optimization.result.optimized) {
        // Optimize edilmiş planı kaydet
        const updatedPlan = await this.planPersistence.updatePlan(userId, planId, {
          title: optimization.plan.title,
          description: optimization.plan.description,
          subjects: optimization.plan.subjects,
          goals: optimization.plan.goals,
        });

        // Cache'i güncelle
        await this.cache.del(`plan:${planId}`);
        await this.cache.del(`user:${userId}:plans:*`);

        // Queue'ya optimizasyon eventi ekle
        await this.queue.add('plan-optimized', {
          planId,
          userId,
          performanceGain: optimization.result.performanceGain,
        });

        this.logger.log(`Plan optimized successfully: ${planId}`);
      }

      return optimization.result;
    } catch (error) {
      this.logger.error(`Plan optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException(`Plan optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Plan doğrulama
   */
  async validatePlan(userId: string, planId: string) {
    try {
      const plan = await this.planPersistence.getPlan(userId, planId);
      
      const planValidation = this.planValidation.validatePlan(plan);
      const sessionValidation = this.planValidation.validateSessions(plan.studySessions);
      const userValidation = await this.planValidation.validatePlanForUser(plan, userId);

      return {
        planValidation,
        sessionValidation,
        userValidation,
        overall: {
          isValid: planValidation.isValid && sessionValidation.isValid && userValidation.isValid,
          errors: [
            ...planValidation.errors,
            ...sessionValidation.errors,
            ...userValidation.errors,
          ],
          warnings: [
            ...planValidation.warnings,
            ...sessionValidation.warnings,
            ...userValidation.warnings,
          ],
          suggestions: [
            ...planValidation.suggestions,
            ...sessionValidation.suggestions,
            ...userValidation.suggestions,
          ],
        },
      };
    } catch (error) {
      this.logger.error(`Plan validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException(`Plan validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Plan istatistikleri
   */
  async getPlanStatistics(userId: string, planId: string) {
    try {
      return this.planPersistence.getPlanStatistics(planId, userId);
    } catch (error) {
      this.logger.error(`Failed to get plan statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Plan kopyala
   */
  async duplicatePlan(userId: string, planId: string, newTitle?: string) {
    try {
      return this.planPersistence.duplicatePlan(userId, planId, newTitle);
    } catch (error) {
      this.logger.error(`Failed to duplicate plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Plan arşivle
   */
  async archivePlan(userId: string, planId: string) {
    try {
      return this.planPersistence.archivePlan(userId, planId);
    } catch (error) {
      this.logger.error(`Failed to archive plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Plan yeniden aktifleştir
   */
  async activatePlan(userId: string, planId: string) {
    try {
      return this.planPersistence.activatePlan(userId, planId);
    } catch (error) {
      this.logger.error(`Failed to activate plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Plan önerileri
   */
  async getPlanSuggestions(userId: string, planId: string) {
    try {
      const plan = await this.planPersistence.getPlan(userId, planId);
      
      const optimizationSuggestions = this.planOptimization.generateOptimizationSuggestions(
        plan,
        plan.studySessions
      );

      const validationSuggestions = this.planValidation.generateOptimizationSuggestions(plan);

      return {
        optimization: optimizationSuggestions,
        validation: validationSuggestions,
        combined: [...new Set([...optimizationSuggestions, ...validationSuggestions])],
      };
    } catch (error) {
      this.logger.error(`Failed to get plan suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException(`Failed to get plan suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Plan performans analizi
   */
  async analyzePlanPerformance(userId: string, planId: string) {
    try {
      const statistics = await this.planPersistence.getPlanStatistics(planId, userId);
      const validation = await this.validatePlan(userId, planId);
      const suggestions = await this.getPlanSuggestions(userId, planId);

      return {
        statistics,
        validation: validation.overall,
        suggestions,
        performanceScore: this.calculatePerformanceScore(statistics, validation.overall),
        recommendations: this.generateRecommendations(statistics, validation.overall, suggestions),
      };
    } catch (error) {
      this.logger.error(`Failed to analyze plan performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException(`Failed to analyze plan performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Performans skoru hesaplama
   */
  private calculatePerformanceScore(statistics: any, validation: any): number {
    let score = 0;

    // Tamamlanma oranı (40 puan)
    score += (statistics.completionRate / 100) * 40;

    // Doğrulama durumu (30 puan)
    if (validation.isValid) {
      score += 30;
    } else {
      score += Math.max(0, 30 - validation.errors.length * 5);
    }

    // Süre verimliliği (20 puan)
    const efficiency = statistics.completedDuration / statistics.totalDuration;
    score += efficiency * 20;

    // Uyarı sayısı (10 puan)
    const warningPenalty = Math.min(validation.warnings.length * 2, 10);
    score += Math.max(0, 10 - warningPenalty);

    return Math.min(Math.round(score), 100);
  }

  /**
   * Öneriler oluşturma
   */
  private generateRecommendations(statistics: any, validation: any, suggestions: any): string[] {
    const recommendations: string[] = [];

    // Tamamlanma oranına göre öneriler
    if (statistics.completionRate < 50) {
      recommendations.push('Plan tamamlanma oranı düşük, daha gerçekçi hedefler belirleyin');
    } else if (statistics.completionRate > 90) {
      recommendations.push('Mükemmel! Plan hedeflerini artırabilirsiniz');
    }

    // Doğrulama durumuna göre öneriler
    if (!validation.isValid) {
      recommendations.push('Plan doğrulama hatalarını düzeltin');
    }

    if (validation.warnings.length > 0) {
      recommendations.push('Plan uyarılarını gözden geçirin');
    }

    // Önerileri ekle
    recommendations.push(...suggestions.combined.slice(0, 3));

    return recommendations;
  }

  /**
   * Onboarding'dan plan oluştur
   */
  async createPlanFromOnboarding(userId: string, data: any): Promise<any> {
    try {
      const request = {
        userId,
        subjects: data.subjects,
        goals: data.goals,
        availableTime: data.dailyStudyTime * 60, // dakikaya çevir
        learningStyle: data.learningStyle || 'visual',
        currentLevel: data.currentLevel || 'intermediate',
        preferences: data.preferences || {},
        planDurationDays: 7,
        planType: 'weekly',
        targetExam: data.targetExam,
        optimize: false,
        optimizationOptions: {
          focusOnWeakAreas: true,
          balanceSubjects: true,
          optimizeTiming: true,
          adjustDifficulty: true,
        }
      };

      return await this.generatePlan(request);
    } catch (error) {
      this.logger.error(`Failed to create plan from onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException('Failed to create plan from onboarding');
    }
  }

  /**
   * Premium plan oluştur
   */
  async createPremiumPlan(userId: string, data: any): Promise<any> {
    try {
      const request = {
        userId,
        subjects: data.subjects,
        goals: data.goals,
        availableTime: data.availableTime,
        learningStyle: data.learningStyle,
        currentLevel: data.currentLevel,
        preferences: data.preferences,
        planDurationDays: data.planDurationDays,
        planType: data.planType,
        targetExam: data.targetExam,
        optimize: true,
        optimizationOptions: {
          focusOnWeakAreas: true,
          balanceSubjects: true,
          optimizeTiming: true,
          adjustDifficulty: true,
        }
      };

      return await this.generatePlan(request);
    } catch (error) {
      this.logger.error(`Failed to create premium plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException('Failed to create premium plan');
    }
  }

  /**
   * YKS plan oluştur
   */
  async generateYksPlan(userId: string, data: any): Promise<any> {
    try {
      const request = {
        userId,
        subjects: data.subjects,
        goals: data.goals,
        availableTime: data.availableTime,
        learningStyle: data.learningStyle,
        currentLevel: data.currentLevel,
        preferences: data.preferences,
        planDurationDays: data.planDurationDays,
        planType: data.planType,
        targetExam: 'YKS',
        optimize: true,
        optimizationOptions: {
          focusOnWeakAreas: true,
          balanceSubjects: true,
          optimizeTiming: true,
          adjustDifficulty: true,
        }
      };

      return await this.generatePlan(request);
    } catch (error) {
      this.logger.error(`Failed to generate YKS plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException('Failed to generate YKS plan');
    }
  }

  /**
   * Tatil planı oluştur
   */
  async generateHolidayPlan(data: { 
    userId: string; 
    holidayType: string; 
    duration: number; 
    goals: string[];
    subjects?: string[];
  }): Promise<any> {
    try {
      this.logger.log(`Generating holiday plan for user: ${data.userId}`);

      const request: PlanGenerationRequest = {
        userId: data.userId,
        subjects: data.subjects || ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'],
        goals: data.goals,
        availableTime: data.duration * 60, // dakika cinsinden
        learningStyle: 'mixed',
        currentLevel: 'intermediate',
        preferences: {
          studyTimes: ['09:00', '14:00', '19:00'],
          difficulty: 'medium'
        },
        planDurationDays: data.duration,
        planType: 'HOLIDAY',
        targetExam: 'YKS',
        optimize: true
      };

      return await this.generatePlan(request);
    } catch (error) {
      this.logger.error(`Holiday plan generation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Holiday plan generation failed');
    }
  }
}
