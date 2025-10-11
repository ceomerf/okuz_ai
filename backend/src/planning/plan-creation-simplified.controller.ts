import { Controller, Post, Get, Body, UseGuards, Request, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureFlagsGuard } from '../common/feature-flags/feature-flags.guard';
import { RequireFeatureFlag } from '../common/feature-flags/feature-flags.decorator';
import { TrackEvent } from '../common/analytics/analytics.decorator';
import { AnalyticsService } from '../common/analytics/analytics.service';
import { PlanCreationABTestService } from './plan-creation-ab-test.service';
import { PlanningService } from './planning.service';

export interface SimplifiedPlanCreationDto {
  // Adım 1: Temel Bilgiler (Birleştirilmiş)
  subjects: string[];
  goals: string[];
  availableTime: number; // dakika
  planDurationDays: number;
  planType: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  
  // Adım 2: AI Önerileri (Otomatik)
  aiRecommendations?: {
    suggestedSubjects: string[];
    optimalSchedule: any;
    difficultyLevel: string;
  };
  
  // Adım 3: Onay ve Oluşturma
  confirmCreation: boolean;
}

@ApiTags('Plan Creation - Simplified')
@Controller('planning/simplified')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlanCreationSimplifiedController {
  constructor(
    private readonly planningService: PlanningService,
    private readonly analyticsService: AnalyticsService,
    private readonly planCreationABTest: PlanCreationABTestService,
  ) {}

  @Post('create-plan')
  @RequireFeatureFlag('simplified_plan_creation', { fallback: true })
  @TrackEvent('simplified_plan_created', { flow_type: 'simplified' })
  @ApiOperation({ summary: 'Basitleştirilmiş plan oluşturma akışı (3 adım)' })
  @ApiResponse({ status: 201, description: 'Plan başarıyla oluşturuldu' })
  @ApiResponse({ status: 400, description: 'Geçersiz plan verisi' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createSimplifiedPlan(
    @Body() planData: SimplifiedPlanCreationDto,
    @Request() req: any
  ) {
    const startTime = Date.now();
    
    try {
      // Adım 1: Temel bilgileri doğrula
      if (!planData.subjects || planData.subjects.length === 0) {
        throw new Error('En az bir konu seçmelisiniz');
      }
      
      if (!planData.goals || planData.goals.length === 0) {
        throw new Error('En az bir hedef belirtmelisiniz');
      }
      
      if (planData.availableTime < 30) {
        throw new Error('Minimum 30 dakika çalışma süresi gereklidir');
      }

      // Adım 2: AI önerilerini otomatik oluştur
      const aiRecommendations = await this.generateAIRecommendations(planData);
      
      // Adım 3: Plan oluştur
      const planResult = await this.planningService.createPremiumPlan(req.user.id, {
        subjects: planData.subjects,
        goals: planData.goals,
        availableTime: planData.availableTime,
        planDurationDays: planData.planDurationDays,
        planType: planData.planType,
        aiRecommendations: aiRecommendations,
      });

      const completionTime = Date.now() - startTime;

      // A/B test dönüşümünü kaydet
      await this.planCreationABTest.trackPlanCreationConversion(
        req.user.id,
        'treatment', // Basitleştirilmiş akış
        'plan_creation_ab_test',
        true,
        completionTime
      );

      // Analytics event kaydet
      await this.analyticsService.trackEvent('plan_created', req.user.id, {
        plan_id: planResult.plan.id,
        plan_type: planData.planType,
        subjects: planData.subjects,
        goals: planData.goals,
        duration: planData.planDurationDays,
        completion_time: completionTime,
        flow_type: 'simplified',
        ai_recommendations_used: true,
        creation_timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Plan başarıyla oluşturuldu!',
        plan: planResult.plan,
        sessions: planResult.sessions,
        aiRecommendations: aiRecommendations,
        metrics: {
          completionTime: completionTime,
          flowType: 'simplified',
          stepsCompleted: 3,
        },
      };

    } catch (error) {
      const completionTime = Date.now() - startTime;
      
      // Başarısız dönüşümü kaydet
      await this.planCreationABTest.trackPlanCreationConversion(
        req.user.id,
        'treatment',
        'plan_creation_ab_test',
        false,
        completionTime
      );

      // Hata analytics'i kaydet
      await this.analyticsService.trackError(req.user.id, {
        error: 'PlanCreationError',
        message: (error as Error).message,
        context: {
          flow_type: 'simplified',
          completion_time: completionTime,
          error_timestamp: new Date().toISOString(),
        },
      });

      throw error;
    }
  }

  @Get('ab-test-results')
  @ApiOperation({ summary: 'Plan oluşturma A/B test sonuçları' })
  @ApiResponse({ status: 200, description: 'A/B test sonuçları' })
  async getABTestResults(@Query('testId') testId: string) {
    try {
      const results = await this.planCreationABTest.analyzePlanCreationResults(testId);
      const winningVariant = await this.planCreationABTest.determineWinningVariant(testId);
      
      return {
        results,
        winningVariant,
        recommendations: this.generateRecommendations(results, winningVariant),
      };
    } catch (error) {
      throw new Error(`A/B test sonuçları alınamadı: ${(error as Error).message}`);
    }
  }

  @Get('drop-off-analysis')
  @ApiOperation({ summary: 'Plan oluşturma drop-off analizi' })
  @ApiResponse({ status: 200, description: 'Drop-off analizi' })
  async getDropOffAnalysis() {
    // Bu endpoint analytics verilerinden drop-off analizi yapacak
    return {
      currentDropOffRate: 30, // %30
      targetDropOffRate: 15,  // %15
      improvementNeeded: 15,  // %15 iyileştirme gerekli
      keyDropOffPoints: [
        { step: 'subject_selection', dropOff: 12 },
        { step: 'goal_setting', dropOff: 8 },
        { step: 'time_allocation', dropOff: 6 },
        { step: 'plan_confirmation', dropOff: 4 },
      ],
      recommendations: [
        'Konu seçimini basitleştirin',
        'Hedef belirleme sürecini otomatikleştirin',
        'Zaman tahsisi için AI önerileri kullanın',
        'Onay sürecini tek tıkla yapın',
      ],
    };
  }

  /**
   * AI önerilerini otomatik oluştur
   */
  private async generateAIRecommendations(planData: SimplifiedPlanCreationDto): Promise<any> {
    // Bu fonksiyon AI servisi ile entegre edilecek
    return {
      suggestedSubjects: planData.subjects,
      optimalSchedule: {
        dailyStudyTime: Math.ceil(planData.availableTime / 7),
        weeklyDistribution: this.calculateWeeklyDistribution(planData.subjects),
        breakFrequency: 25, // 25 dakikada bir mola
      },
      difficultyLevel: this.calculateDifficultyLevel(planData),
      studyTips: this.generateStudyTips(planData.subjects),
    };
  }

  /**
   * Haftalık dağılımı hesapla
   */
  private calculateWeeklyDistribution(subjects: string[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    const totalSubjects = subjects.length;
    
    subjects.forEach(subject => {
      distribution[subject] = Math.ceil(100 / totalSubjects);
    });
    
    return distribution;
  }

  /**
   * Zorluk seviyesini hesapla
   */
  private calculateDifficultyLevel(planData: SimplifiedPlanCreationDto): string {
    if (planData.availableTime < 60) return 'beginner';
    if (planData.availableTime < 120) return 'intermediate';
    return 'advanced';
  }

  /**
   * Çalışma ipuçları oluştur
   */
  private generateStudyTips(subjects: string[]): string[] {
    const tips = [
      'Her 25 dakikada bir 5 dakika mola verin',
      'Zor konuları sabah saatlerinde çalışın',
      'Tekrar yapmak için 24 saat sonra konuyu gözden geçirin',
      'Aktif öğrenme teknikleri kullanın (not alma, özet çıkarma)',
    ];
    
    return tips;
  }

  /**
   * Öneriler oluştur
   */
  private generateRecommendations(results: any, winningVariant: any): string[] {
    const recommendations = [];
    
    if (winningVariant.shouldRollout) {
      recommendations.push('✅ Tedavi grubu kazandı! Tam rollout önerilir.');
      recommendations.push(`📈 Dönüşüm oranı iyileştirmesi: %${results.improvement.conversionRateImprovement.toFixed(1)}`);
    } else {
      recommendations.push('❌ Test sonuçları yetersiz. Daha fazla veri toplayın.');
      recommendations.push('🔄 Test süresini uzatın veya daha fazla kullanıcı ekleyin.');
    }
    
    return recommendations;
  }
}
