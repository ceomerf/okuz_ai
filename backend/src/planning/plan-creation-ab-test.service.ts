import { Injectable, Logger } from '@nestjs/common';
import { ABTestingService } from '../common/ab-testing/ab-testing.service';
import { AnalyticsService } from '../common/analytics/analytics.service';
import { FeatureFlagsService } from '../common/feature-flags/feature-flags.service';

@Injectable()
export class PlanCreationABTestService {
  private readonly logger = new Logger(PlanCreationABTestService.name);

  constructor(
    private readonly abTestingService: ABTestingService,
    private readonly analyticsService: AnalyticsService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  /**
   * Plan oluşturma drop-off sorunu için A/B test başlat
   */
  async startPlanCreationABTest(): Promise<void> {
    this.logger.log('🧪 Plan Oluşturma A/B Testi Başlatılıyor...');

    try {
      // A/B test oluştur
      const abTest = await this.abTestingService.createABTest({
        name: 'Plan Creation Flow Optimization',
        description: 'Plan oluşturma akışını 5 adımdan 3 adıma düşürerek drop-off oranını azaltma',
        status: 'running',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 gün
        variants: [
          {
            name: 'control',
            weight: 50,
            configuration: {
              steps: 5,
              flow_type: 'original',
              ai_guidance: false,
            },
          },
          {
            name: 'treatment',
            weight: 50,
            configuration: {
              steps: 3,
              flow_type: 'simplified',
              ai_guidance: true,
            },
          },
        ],
        targetSegments: ['new_users', 'active_users'],
        successMetrics: ['plan_created', 'plan_completion_time', 'user_satisfaction'],
        hypothesis: 'Basitleştirilmiş plan oluşturma akışı drop-off oranını %30\'dan %15\'e düşürecek',
      });

      // Feature flags oluştur
      await this.createPlanCreationFeatureFlags(abTest.id);

      this.logger.log(`✅ Plan Oluşturma A/B Testi başlatıldı: ${abTest.id}`);
      this.logger.log('📊 Test Parametreleri:');
      this.logger.log('  - Kontrol Grubu: 5 adımlı orijinal akış');
      this.logger.log('  - Tedavi Grubu: 3 adımlı basitleştirilmiş akış');
      this.logger.log('  - Hedef Segment: Yeni ve aktif kullanıcılar');
      this.logger.log('  - Test Süresi: 14 gün');
      this.logger.log('  - Beklenen Sonuç: %30 drop-off → %15 drop-off');

    } catch (error) {
      this.logger.error(`❌ Plan oluşturma A/B testi başlatma hatası: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Plan oluşturma için feature flags oluştur
   */
  private async createPlanCreationFeatureFlags(testId: string): Promise<void> {
    // Kontrol grubu feature flag
    await this.featureFlagsService.createFeatureFlag({
      key: `${testId}_control`,
      name: 'Plan Creation - Control Group',
      description: 'Orijinal 5 adımlı plan oluşturma akışı',
      enabled: true,
      rolloutPercentage: 50,
      targetUsers: [],
      targetRoles: [],
      targetSegments: ['new_users', 'active_users'],
      conditions: {
        variant: 'control',
        steps: 5,
        flow_type: 'original',
        ai_guidance: false,
      },
    });

    // Tedavi grubu feature flag
    await this.featureFlagsService.createFeatureFlag({
      key: `${testId}_treatment`,
      name: 'Plan Creation - Treatment Group',
      description: 'Basitleştirilmiş 3 adımlı plan oluşturma akışı',
      enabled: true,
      rolloutPercentage: 50,
      targetUsers: [],
      targetRoles: [],
      targetSegments: ['new_users', 'active_users'],
      conditions: {
        variant: 'treatment',
        steps: 3,
        flow_type: 'simplified',
        ai_guidance: true,
      },
    });

    this.logger.log('✅ Plan oluşturma feature flags oluşturuldu');
  }

  /**
   * Plan oluşturma dönüşümünü takip et
   */
  async trackPlanCreationConversion(
    userId: string,
    variant: string,
    testId: string,
    success: boolean,
    completionTime?: number
  ): Promise<void> {
    try {
      // A/B test dönüşümünü kaydet
      await this.abTestingService.trackConversion(
        testId,
        userId,
        variant,
        'plan_created',
        success ? 1 : 0
      );

      // Analytics event kaydet
      await this.analyticsService.trackEvent('plan_creation_ab_test', userId, {
        test_id: testId,
        variant,
        success,
        completion_time: completionTime,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`📊 Plan oluşturma dönüşümü kaydedildi: ${userId} - ${variant} - ${success ? 'Başarılı' : 'Başarısız'}`);

    } catch (error) {
      this.logger.error(`❌ Plan oluşturma dönüşümü kaydetme hatası: ${(error as Error).message}`);
    }
  }

  /**
   * A/B test sonuçlarını analiz et
   */
  async analyzePlanCreationResults(testId: string): Promise<{
    controlGroup: {
      users: number;
      conversions: number;
      conversionRate: number;
      averageCompletionTime: number;
    };
    treatmentGroup: {
      users: number;
      conversions: number;
      conversionRate: number;
      averageCompletionTime: number;
    };
    improvement: {
      conversionRateImprovement: number;
      completionTimeImprovement: number;
      statisticalSignificance: boolean;
    };
  }> {
    try {
      const results = await this.abTestingService.getABTestResults(testId);
      
      const controlResult = results.find(r => r.variant === 'control');
      const treatmentResult = results.find(r => r.variant === 'treatment');

      if (!controlResult || !treatmentResult) {
        throw new Error('A/B test sonuçları bulunamadı');
      }

      const conversionRateImprovement = 
        ((treatmentResult.conversionRate - controlResult.conversionRate) / controlResult.conversionRate) * 100;

      return {
        controlGroup: {
          users: controlResult.users,
          conversions: controlResult.conversions,
          conversionRate: controlResult.conversionRate,
          averageCompletionTime: 0, // Bu veri analytics'ten gelecek
        },
        treatmentGroup: {
          users: treatmentResult.users,
          conversions: treatmentResult.conversions,
          conversionRate: treatmentResult.conversionRate,
          averageCompletionTime: 0, // Bu veri analytics'ten gelecek
        },
        improvement: {
          conversionRateImprovement,
          completionTimeImprovement: 0, // Bu veri analytics'ten gelecek
          statisticalSignificance: treatmentResult.statisticalSignificance,
        },
      };

    } catch (error) {
      this.logger.error(`❌ A/B test sonuçları analiz hatası: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Test sonuçlarına göre kazanan varyantı belirle
   */
  async determineWinningVariant(testId: string): Promise<{
    winningVariant: string;
    shouldRollout: boolean;
    confidence: number;
    recommendation: string;
  }> {
    try {
      const results = await this.analyzePlanCreationResults(testId);
      
      const { controlGroup, treatmentGroup, improvement } = results;

      // İstatistiksel anlamlılık kontrolü
      if (!improvement.statisticalSignificance) {
        return {
          winningVariant: 'none',
          shouldRollout: false,
          confidence: 0,
          recommendation: 'Test sonuçları istatistiksel olarak anlamlı değil. Test süresini uzatın veya daha fazla kullanıcı ekleyin.',
        };
      }

      // Dönüşüm oranı iyileştirmesi kontrolü
      if (improvement.conversionRateImprovement < 10) {
        return {
          winningVariant: 'control',
          shouldRollout: false,
          confidence: 50,
          recommendation: 'Tedavi grubu yeterli iyileştirme göstermiyor. Orijinal akışı koruyun.',
        };
      }

      // Kazanan varyant: Tedavi grubu
      return {
        winningVariant: 'treatment',
        shouldRollout: true,
        confidence: 95,
        recommendation: `Tedavi grubu ${improvement.conversionRateImprovement.toFixed(1)}% daha iyi performans gösteriyor. Tam rollout önerilir.`,
      };

    } catch (error) {
      this.logger.error(`❌ Kazanan varyant belirleme hatası: ${(error as Error).message}`);
      throw error;
    }
  }
}
