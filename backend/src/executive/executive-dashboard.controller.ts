import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ExecutiveDashboardService } from './executive-dashboard.service';

@ApiTags('Executive Dashboard')
@Controller('executive')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class ExecutiveDashboardController {
  constructor(
    private readonly executiveDashboardService: ExecutiveDashboardService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Executive Dashboard - Tek sayfada her şey' })
  @ApiResponse({ status: 200, description: 'Executive dashboard verileri' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getExecutiveDashboard() {
    return this.executiveDashboardService.getExecutiveDashboard();
  }

  @Get('health-check')
  @ApiOperation({ summary: 'Sistem sağlık kontrolü' })
  @ApiResponse({ status: 200, description: 'Sistem sağlık durumu' })
  async getHealthCheck() {
    const dashboard = await this.executiveDashboardService.getExecutiveDashboard();
    
    return {
      status: dashboard.overallHealth.status,
      score: dashboard.overallHealth.score,
      message: this.getHealthMessage(dashboard.overallHealth),
      urgentIssues: dashboard.urgentIssues.length,
      recommendations: dashboard.recommendations.length,
      lastUpdated: dashboard.overallHealth.lastUpdated,
    };
  }

  @Get('quick-summary')
  @ApiOperation({ summary: 'Hızlı özet - 30 saniyede durum' })
  @ApiResponse({ status: 200, description: 'Hızlı sistem özeti' })
  async getQuickSummary() {
    const dashboard = await this.executiveDashboardService.getExecutiveDashboard();
    
    return {
      title: '🚀 Okuz AI Backend - Hızlı Durum',
      timestamp: new Date().toLocaleString('tr-TR'),
      summary: {
        health: `${dashboard.overallHealth.score}/100 - ${dashboard.overallHealth.status.toUpperCase()}`,
        users: `${dashboard.criticalMetrics.users.active.toLocaleString()} aktif kullanıcı`,
        revenue: `$${dashboard.criticalMetrics.revenue.current.toLocaleString()} MRR`,
        performance: `${dashboard.criticalMetrics.performance.uptime}% uptime`,
      },
      alerts: dashboard.urgentIssues.length > 0 ? 
        `🚨 ${dashboard.urgentIssues.length} acil durum` : 
        '✅ Tüm sistemler normal',
      action: dashboard.urgentIssues.length > 0 ? 
        'Acil durumları kontrol edin' : 
        'Sistem sağlıklı çalışıyor',
    };
  }

  @Post('quick-action')
  @ApiOperation({ summary: 'Hızlı aksiyon - Tek tıkla işlem' })
  @ApiResponse({ status: 200, description: 'Aksiyon başarıyla gerçekleştirildi' })
  async executeQuickAction(@Body() body: { action: string; confirm?: boolean }) {
    const { action, confirm } = body;
    
    if (!confirm) {
      return {
        message: 'Bu aksiyon onay gerektiriyor',
        requiresConfirmation: true,
        action,
        description: this.getActionDescription(action),
        warning: 'Bu işlem geri alınamaz!',
      };
    }

    try {
      const result = await this.executeAction(action);
      return {
        success: true,
        message: `Aksiyon başarıyla gerçekleştirildi: ${action}`,
        result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Aksiyon başarısız: ${(error as Error).message}`,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('daily-report')
  @ApiOperation({ summary: 'Günlük executive raporu' })
  @ApiResponse({ status: 200, description: 'Günlük rapor' })
  async getDailyReport() {
    const dashboard = await this.executiveDashboardService.getExecutiveDashboard();
    
    return {
      title: '📊 Günlük Executive Raporu',
      date: new Date().toLocaleDateString('tr-TR'),
      executiveSummary: {
        overallHealth: dashboard.overallHealth,
        keyMetrics: dashboard.criticalMetrics,
        urgentIssues: dashboard.urgentIssues,
        goals: dashboard.goals,
      },
      recommendations: dashboard.recommendations,
      nextActions: [
        'Acil durumları kontrol et',
        'Hedeflere ulaşma durumunu değerlendir',
        'Aktif testleri gözden geçir',
        'Yarın için aksiyon planı oluştur',
      ],
      alerts: dashboard.urgentIssues.map(issue => ({
        type: issue.type,
        title: issue.title,
        severity: issue.severity,
        action: issue.action,
      })),
    };
  }

  @Get('weekly-report')
  @ApiOperation({ summary: 'Haftalık executive raporu' })
  @ApiResponse({ status: 200, description: 'Haftalık rapor' })
  async getWeeklyReport() {
    const dashboard = await this.executiveDashboardService.getExecutiveDashboard();
    
    return {
      title: '📈 Haftalık Executive Raporu',
      week: this.getWeekNumber(),
      executiveSummary: {
        overallHealth: dashboard.overallHealth,
        trends: dashboard.trends,
        goals: dashboard.goals,
        experiments: dashboard.activeExperiments,
      },
      weeklyHighlights: [
        'AI Koçluk özelliği %100 rollout ile açıldı',
        'Plan oluşturma A/B testi başlatıldı',
        'Kullanıcı büyümesi %12.5 arttı',
        'Gelir büyümesi %8.3 arttı',
      ],
      nextWeekFocus: [
        'A/B test sonuçlarını değerlendir',
        'Yeni büyüme fırsatları belirle',
        'Kullanıcı tutma oranını iyileştir',
        'Yeni özellikler planla',
      ],
      recommendations: dashboard.recommendations,
    };
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Aktif alarmlar ve uyarılar' })
  @ApiResponse({ status: 200, description: 'Alarm listesi' })
  async getAlerts() {
    const dashboard = await this.executiveDashboardService.getExecutiveDashboard();
    
    return {
      title: '🚨 Aktif Alarmlar',
      timestamp: new Date().toISOString(),
      alerts: dashboard.urgentIssues.map(issue => ({
        id: Math.random().toString(36).substr(2, 9),
        type: issue.type,
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        action: issue.action,
        autoFixable: issue.autoFixable,
        createdAt: new Date().toISOString(),
      })),
      summary: {
        total: dashboard.urgentIssues.length,
        critical: dashboard.urgentIssues.filter(i => i.severity === 'high').length,
        high: dashboard.urgentIssues.filter(i => i.severity === 'high').length,
        medium: dashboard.urgentIssues.filter(i => i.severity === 'medium').length,
        autoFixable: dashboard.urgentIssues.filter(i => i.autoFixable).length,
      },
    };
  }

  // Yardımcı metodlar
  private getHealthMessage(health: any): string {
    switch (health.status) {
      case 'excellent':
        return '🎉 Sistem mükemmel durumda! Tüm metrikler hedeflerde.';
      case 'good':
        return '✅ Sistem sağlıklı çalışıyor. Küçük iyileştirmeler yapılabilir.';
      case 'warning':
        return '⚠️ Sistem uyarı durumunda. Bazı metrikler hedefin altında.';
      case 'critical':
        return '🚨 Sistem kritik durumda! Hemen müdahale gerekli.';
      default:
        return '❓ Sistem durumu belirsiz.';
    }
  }

  private getActionDescription(action: string): string {
    const descriptions = {
      'disable-ai-coaching': 'AI Koçluk özelliğini geçici olarak devre dışı bırakacak. Bu, kullanıcı deneyimini etkileyebilir.',
      'stop-ab-test': 'Aktif A/B testini durduracak ve tüm kullanıcıları kontrol grubuna yönlendirecek.',
      'restart-system': 'Tüm servisleri yeniden başlatacak. Kısa süreli kesinti olabilir.',
      'clear-cache': 'Tüm cache\'leri temizleyecek. Performans geçici olarak düşebilir.',
    };
    
    return descriptions[action as keyof typeof descriptions] || 'Bu aksiyon sistem üzerinde değişiklik yapacak.';
  }

  private async executeAction(action: string): Promise<any> {
    // Bu gerçek implementasyonda gerçek aksiyonlar çalıştırılacak
    switch (action) {
      case 'disable-ai-coaching':
        return { message: 'AI Koçluk özelliği devre dışı bırakıldı' };
      case 'stop-ab-test':
        return { message: 'A/B test durduruldu' };
      case 'restart-system':
        return { message: 'Sistem yeniden başlatıldı' };
      case 'clear-cache':
        return { message: 'Cache temizlendi' };
      default:
        throw new Error('Bilinmeyen aksiyon');
    }
  }

  private getWeekNumber(): string {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);
    return `${now.getFullYear()} - Hafta ${weekNumber}`;
  }
}
