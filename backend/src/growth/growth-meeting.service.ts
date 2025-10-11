import { Injectable, Logger } from '@nestjs/common';
import { ProductMetricsService } from '../common/product-metrics/product-metrics.service';
import { AnalyticsService } from '../common/analytics/analytics.service';
import { ABTestingService } from '../common/ab-testing/ab-testing.service';
import { FeatureFlagsService } from '../common/feature-flags/feature-flags.service';

export interface GrowthMeetingReport {
  date: Date;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    current: any;
    previous: any;
    changes: Record<string, { absolute: number; percentage: number }>;
  };
  kpis: {
    name: string;
    current: number;
    target: number;
    status: 'achieved' | 'pending' | 'declining';
    trend: number;
    priority: 'high' | 'medium' | 'low';
  }[];
  abTests: {
    testId: string;
    name: string;
    status: string;
    participants: number;
    results?: any;
    recommendation?: string;
  }[];
  featureFlags: {
    key: string;
    name: string;
    enabled: boolean;
    rolloutPercentage: number;
    impact: 'positive' | 'negative' | 'neutral';
  }[];
  insights: {
    type: 'success' | 'warning' | 'opportunity' | 'threat';
    title: string;
    description: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  recommendations: {
    action: string;
    impact: 'medium' | 'low' | 'high';
    effort: 'medium' | 'low' | 'high';
    timeline: string;
    owner: string;
  }[];
}

@Injectable()
export class GrowthMeetingService {
  private readonly logger = new Logger(GrowthMeetingService.name);

  constructor(
    private readonly productMetricsService: ProductMetricsService,
    private readonly analyticsService: AnalyticsService,
    private readonly abTestingService: ABTestingService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  /**
   * Haftalık büyüme toplantısı raporu oluştur
   */
  async generateWeeklyGrowthReport(): Promise<GrowthMeetingReport> {
    this.logger.log('📊 Haftalık büyüme toplantısı raporu oluşturuluyor...');

    const endDate = new Date();
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const previousEndDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
      // Mevcut ve önceki dönem metrikleri
      const [currentMetrics, previousMetrics, comparison] = await Promise.all([
        this.productMetricsService.getProductMetrics({ start: startDate, end: endDate }),
        this.productMetricsService.getProductMetrics({ start: previousStartDate, end: previousEndDate }),
        this.productMetricsService.getMetricsComparison(
          { start: startDate, end: endDate },
          { start: previousStartDate, end: previousEndDate }
        ),
      ]);

      // KPI'ları analiz et
      const kpis = this.analyzeKPIs(currentMetrics, comparison);

      // A/B testleri analiz et
      const abTests = await this.analyzeABTests();

      // Feature flags analiz et
      const featureFlags = await this.analyzeFeatureFlags();

      // İçgörüler oluştur
      const insights = this.generateInsights(currentMetrics, comparison, kpis, abTests);

      // Öneriler oluştur
      const recommendations = this.generateRecommendations(insights, kpis, abTests);

      const report: GrowthMeetingReport = {
        date: new Date(),
        period: { start: startDate, end: endDate },
        metrics: {
          current: currentMetrics,
          previous: previousMetrics,
          changes: comparison.changes,
        },
        kpis,
        abTests,
        featureFlags,
        insights,
        recommendations,
      };

      this.logger.log('✅ Haftalık büyüme toplantısı raporu oluşturuldu');
      return report;

    } catch (error) {
      this.logger.error(`❌ Haftalık büyüme raporu oluşturma hatası: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * KPI'ları analiz et
   */
  private analyzeKPIs(currentMetrics: any, comparison: any): any[] {
    const kpis = [
      {
        name: 'Monthly Active Users',
        current: currentMetrics.monthlyActiveUsers,
        target: 5000,
        status: this.getKPIStatus(currentMetrics.monthlyActiveUsers, 5000),
        trend: comparison.changes.monthlyActiveUsers?.percentage || 0,
        priority: 'high' as const,
      },
      {
        name: 'Monthly Recurring Revenue',
        current: currentMetrics.monthlyRecurringRevenue,
        target: 50000,
        status: this.getKPIStatus(currentMetrics.monthlyRecurringRevenue, 50000),
        trend: comparison.changes.monthlyRecurringRevenue?.percentage || 0,
        priority: 'high' as const,
      },
      {
        name: 'User Retention (Day 7)',
        current: currentMetrics.userRetention.day7,
        target: 70,
        status: this.getKPIStatus(currentMetrics.userRetention.day7, 70),
        trend: 0, // Bu metrik için trend hesaplanacak
        priority: 'high' as const,
      },
      {
        name: 'Conversion Rate',
        current: currentMetrics.freeToPaidConversion,
        target: 15,
        status: this.getKPIStatus(currentMetrics.freeToPaidConversion, 15),
        trend: comparison.changes.freeToPaidConversion?.percentage || 0,
        priority: 'high' as const,
      },
      {
        name: 'Average Session Duration',
        current: currentMetrics.averageSessionDuration,
        target: 30,
        status: this.getKPIStatus(currentMetrics.averageSessionDuration, 30),
        trend: comparison.changes.averageSessionDuration?.percentage || 0,
        priority: 'medium' as const,
      },
    ];

    return kpis;
  }

  /**
   * A/B testleri analiz et
   */
  private async analyzeABTests(): Promise<any[]> {
    try {
      // Bu gerçek implementasyonda A/B test verilerini çekecek
      return [
        {
          testId: 'plan_creation_ab_test',
          name: 'Plan Creation Flow Optimization',
          status: 'running',
          participants: 1250,
          results: {
            controlConversion: 15.2,
            treatmentConversion: 18.7,
            statisticalSignificance: true,
          },
          recommendation: 'Tedavi grubu kazandı! Tam rollout önerilir.',
        },
        {
          testId: 'ai_coaching_test',
          name: 'AI Coaching Feature',
          status: 'completed',
          participants: 2000,
          results: {
            controlConversion: 15.2,
            treatmentConversion: 18.7,
            statisticalSignificance: true,
          },
          recommendation: 'AI Koçluk özelliği %100 rollout ile açıldı.',
        },
      ];
    } catch (error) {
      this.logger.error(`A/B test analizi hatası: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Feature flags analiz et
   */
  private async analyzeFeatureFlags(): Promise<any[]> {
    try {
      const flags = await this.featureFlagsService.getAllFeatureFlags();
      
      return flags.map(flag => ({
        key: flag.key,
        name: flag.name,
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage,
        impact: this.assessFeatureFlagImpact(flag),
      }));
    } catch (error) {
      this.logger.error(`Feature flag analizi hatası: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * İçgörüler oluştur
   */
  private generateInsights(
    currentMetrics: any,
    comparison: any,
    kpis: any[],
    abTests: any[]
  ): any[] {
    const insights = [];

    // Başarılı içgörüler
    if (comparison.changes.monthlyActiveUsers?.percentage > 10) {
      insights.push({
        type: 'success',
        title: 'Kullanıcı Büyümesi Hızlandı',
        description: `MAU %${comparison.changes.monthlyActiveUsers.percentage.toFixed(1)} arttı`,
        action: 'Bu büyüme trendini sürdürmek için kullanıcı edinme stratejilerini güçlendirin',
        priority: 'high',
      });
    }

    // Uyarı içgörüleri
    if (currentMetrics.userRetention.day7 < 60) {
      insights.push({
        type: 'warning',
        title: 'Kullanıcı Tutma Oranı Düşük',
        description: '7 günlük tutma oranı %60\'ın altında',
        action: 'Kullanıcı onboarding sürecini iyileştirin ve erken değer sağlayın',
        priority: 'high',
      });
    }

    // Fırsat içgörüleri
    if (abTests.some(test => test.recommendation?.includes('rollout'))) {
      insights.push({
        type: 'opportunity',
        title: 'A/B Test Kazananları Hazır',
        description: 'Başarılı A/B test sonuçları tam rollout için hazır',
        action: 'Kazanan varyantları tüm kullanıcılara açın',
        priority: 'high',
      });
    }

    // Tehdit içgörüleri
    if (comparison.changes.monthlyRecurringRevenue?.percentage < -5) {
      insights.push({
        type: 'threat',
        title: 'Gelir Düşüşü Tespit Edildi',
        description: `MRR %${Math.abs(comparison.changes.monthlyRecurringRevenue.percentage).toFixed(1)} düştü`,
        action: 'Gelir düşüşünün nedenlerini araştırın ve düzeltin',
        priority: 'high',
      });
    }

    return insights;
  }

  /**
   * Öneriler oluştur
   */
  private generateRecommendations(
    insights: any[],
    kpis: any[],
    abTests: any[]
  ): Array<{
    action: string;
    impact: 'medium' | 'low' | 'high';
    effort: 'medium' | 'low' | 'high';
    timeline: string;
    owner: string;
  }> {
    const recommendations: Array<{
      action: string;
      impact: 'medium' | 'low' | 'high';
      effort: 'medium' | 'low' | 'high';
      timeline: string;
      owner: string;
    }> = [];

    // Yüksek öncelikli öneriler
    const highPriorityInsights = insights.filter(i => i.priority === 'high');
    
    highPriorityInsights.forEach(insight => {
      recommendations.push({
        action: insight.action,
        impact: 'high' as 'medium' | 'low' | 'high',
        effort: this.assessEffort(insight.action) as 'medium' | 'low' | 'high',
        timeline: this.assessTimeline(insight.action),
        owner: this.assignOwner(insight.type),
      });
    });

    // A/B test önerileri
    abTests.forEach(test => {
      if (test.recommendation?.includes('rollout')) {
        recommendations.push({
          action: `"${test.name}" testini tam rollout yapın`,
          impact: 'high' as 'medium' | 'low' | 'high',
          effort: 'low' as 'medium' | 'low' | 'high',
          timeline: '1 hafta',
          owner: 'Product Manager',
        });
      }
    });

    // KPI önerileri
    const underperformingKPIs = kpis.filter(kpi => kpi.status === 'pending' && kpi.trend < 0);
    underperformingKPIs.forEach(kpi => {
      recommendations.push({
        action: `${kpi.name} performansını iyileştirin`,
        impact: 'high' as 'medium' | 'low' | 'high',
        effort: 'medium' as 'medium' | 'low' | 'high',
        timeline: '2-4 hafta',
        owner: 'Growth Team',
      });
    });

    return recommendations;
  }

  /**
   * KPI durumunu belirle
   */
  private getKPIStatus(current: number, target: number): 'achieved' | 'pending' | 'declining' {
    if (current >= target) return 'achieved';
    if (current >= target * 0.8) return 'pending';
    return 'declining';
  }

  /**
   * Feature flag etkisini değerlendir
   */
  private assessFeatureFlagImpact(flag: any): 'positive' | 'negative' | 'neutral' {
    // Bu gerçek implementasyonda analytics verilerine göre değerlendirilecek
    if (flag.rolloutPercentage === 100 && flag.enabled) return 'positive';
    if (flag.rolloutPercentage === 0) return 'neutral';
    return 'neutral';
  }

  /**
   * Çaba seviyesini değerlendir
   */
  private assessEffort(action: string): 'high' | 'medium' | 'low' {
    if (action.includes('rollout') || action.includes('açın')) return 'low';
    if (action.includes('iyileştirin') || action.includes('güçlendirin')) return 'medium';
    return 'high';
  }

  /**
   * Zaman çizelgesini değerlendir
   */
  private assessTimeline(action: string): string {
    if (action.includes('rollout') || action.includes('açın')) return '1 hafta';
    if (action.includes('iyileştirin')) return '2-4 hafta';
    return '1-2 ay';
  }

  /**
   * Sahibi atama
   */
  private assignOwner(type: string): string {
    switch (type) {
      case 'success':
      case 'opportunity':
        return 'Product Manager';
      case 'warning':
      case 'threat':
        return 'Growth Team';
      default:
        return 'Product Team';
    }
  }

  /**
   * Haftalık büyüme toplantısı özeti
   */
  async getWeeklyGrowthSummary(): Promise<{
    keyMetrics: any;
    topInsights: any[];
    urgentActions: any[];
    nextWeekFocus: string[];
  }> {
    const report = await this.generateWeeklyGrowthReport();
    
    return {
      keyMetrics: {
        mau: report.metrics.current.monthlyActiveUsers,
        mrr: report.metrics.current.monthlyRecurringRevenue,
        retention: report.metrics.current.userRetention.day7,
        conversion: report.metrics.current.freeToPaidConversion,
      },
      topInsights: report.insights.filter(i => i.priority === 'high').slice(0, 3),
      urgentActions: report.recommendations.filter(r => r.impact === 'high').slice(0, 3),
      nextWeekFocus: [
        'Plan oluşturma A/B test sonuçlarını değerlendir',
        'AI Koçluk rollout etkisini ölç',
        'Kullanıcı tutma oranını iyileştir',
        'Yeni A/B testleri planla',
      ],
    };
  }
}
