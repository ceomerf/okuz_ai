import { Controller, Get, Post, Body, UseGuards, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ExecutiveDashboardService } from './executive-dashboard.service';
import { AutoManagementService } from './auto-management.service';
import { Response } from 'express';

@ApiTags('Executive Web Interface')
@Controller('executive/web')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class ExecutiveWebController {
  constructor(
    private readonly executiveDashboardService: ExecutiveDashboardService,
    private readonly autoManagementService: AutoManagementService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Executive Dashboard - Web Arayüzü' })
  async getDashboardPage(@Res() res: Response) {
    const dashboard = await this.executiveDashboardService.getExecutiveDashboard();
    
    const html = this.generateDashboardHTML(dashboard);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Get('mobile')
  @ApiOperation({ summary: 'Mobil Executive Dashboard' })
  async getMobileDashboard(@Res() res: Response) {
    const dashboard = await this.executiveDashboardService.getExecutiveDashboard();
    
    const html = this.generateMobileHTML(dashboard);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Get('status')
  @ApiOperation({ summary: 'Hızlı durum kontrolü' })
  async getQuickStatus() {
    const dashboard = await this.executiveDashboardService.getExecutiveDashboard();
    
    return {
      status: dashboard.overallHealth.status,
      score: dashboard.overallHealth.score,
      message: this.getStatusMessage(dashboard.overallHealth),
      urgentIssues: dashboard.urgentIssues.length,
      lastUpdated: new Date().toLocaleString('tr-TR'),
      quickActions: dashboard.quickActions.map(action => ({
        name: action.action,
        button: action.buttonText,
        endpoint: action.endpoint,
      })),
    };
  }

  @Post('action')
  @ApiOperation({ summary: 'Hızlı aksiyon çalıştır' })
  async executeAction(@Body() body: { action: string; confirm?: boolean }) {
    const { action, confirm } = body;
    
    if (!confirm) {
      return {
        requiresConfirmation: true,
        message: 'Bu aksiyon onay gerektiriyor',
        action,
        warning: 'Bu işlem geri alınamaz!',
      };
    }

    try {
      // Aksiyonu çalıştır
      const result = await this.executeQuickAction(action);
      return {
        success: true,
        message: `✅ ${action} başarıyla gerçekleştirildi`,
        result,
        timestamp: new Date().toLocaleString('tr-TR'),
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ ${action} başarısız: ${(error as Error).message}`,
        timestamp: new Date().toLocaleString('tr-TR'),
      };
    }
  }

  @Get('rules')
  @ApiOperation({ summary: 'Otomatik yönetim kuralları' })
  async getAutoManagementRules() {
    const rules = this.autoManagementService.getRulesStatus();
    
    return {
      title: '🤖 Otomatik Yönetim Kuralları',
      rules: rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        enabled: rule.enabled,
        severity: rule.severity,
        lastTriggered: rule.lastTriggered ? 
          new Date(rule.lastTriggered).toLocaleString('tr-TR') : 
          'Hiç tetiklenmedi',
        status: rule.enabled ? '🟢 Aktif' : '🔴 Pasif',
      })),
      summary: {
        total: rules.length,
        active: rules.filter(r => r.enabled).length,
        inactive: rules.filter(r => !r.enabled).length,
      },
    };
  }

  @Post('rules/toggle')
  @ApiOperation({ summary: 'Kuralı etkinleştir/devre dışı bırak' })
  async toggleRule(@Body() body: { ruleId: string; enabled: boolean }) {
    this.autoManagementService.toggleRule(body.ruleId, body.enabled);
    
    return {
      success: true,
      message: `Kural ${body.enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`,
      ruleId: body.ruleId,
      enabled: body.enabled,
    };
  }

  // Yardımcı metodlar
  private generateDashboardHTML(dashboard: any): string {
    return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 Okuz AI - Executive Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            text-align: center;
            color: white;
        }
        .health-score {
            font-size: 4rem;
            font-weight: bold;
            margin: 20px 0;
        }
        .status-${dashboard.overallHealth.status} {
            padding: 10px 20px;
            border-radius: 50px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-excellent { background: #10b981; }
        .status-good { background: #3b82f6; }
        .status-warning { background: #f59e0b; }
        .status-critical { background: #ef4444; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            color: white;
        }
        .card h3 {
            font-size: 1.5rem;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 10px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
        }
        .urgent-issues {
            background: rgba(239, 68, 68, 0.2);
            border: 2px solid #ef4444;
        }
        .quick-actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .action-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s;
        }
        .action-btn:hover {
            background: #2563eb;
            transform: translateY(-2px);
        }
        .action-btn.danger {
            background: #ef4444;
        }
        .action-btn.danger:hover {
            background: #dc2626;
        }
        .refresh-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #10b981;
            color: white;
            border: none;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            font-size: 1.5rem;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Okuz AI Executive Dashboard</h1>
            <div class="health-score">${dashboard.overallHealth.score}/100</div>
            <div class="status-${dashboard.overallHealth.status}">
                ${this.getStatusText(dashboard.overallHealth.status)}
            </div>
            <p>Son güncelleme: ${new Date().toLocaleString('tr-TR')}</p>
        </div>

        <div class="grid">
            <div class="card">
                <h3>📊 Kritik Metrikler</h3>
                <div class="metric">
                    <span>Kullanıcılar:</span>
                    <span>${dashboard.criticalMetrics.users.active.toLocaleString()}</span>
                </div>
                <div class="metric">
                    <span>Gelir (MRR):</span>
                    <span>$${dashboard.criticalMetrics.revenue.current.toLocaleString()}</span>
                </div>
                <div class="metric">
                    <span>Uptime:</span>
                    <span>${dashboard.criticalMetrics.performance.uptime}%</span>
                </div>
            </div>

            <div class="card">
                <h3>🎯 Hedefler</h3>
                ${dashboard.goals.map((goal: any) => `
                    <div class="metric">
                        <span>${goal.name}:</span>
                        <span>${goal.progress.toFixed(1)}%</span>
                    </div>
                `).join('')}
            </div>

            <div class="card ${dashboard.urgentIssues.length > 0 ? 'urgent-issues' : ''}">
                <h3>🚨 Acil Durumlar</h3>
                ${dashboard.urgentIssues.length === 0 ? 
                    '<p>✅ Tüm sistemler normal</p>' : 
                    dashboard.urgentIssues.map((issue: any) => `
                        <div class="metric">
                            <span>${issue.title}:</span>
                            <span>${issue.severity.toUpperCase()}</span>
                        </div>
                    `).join('')
                }
            </div>

            <div class="card">
                <h3>🧪 Aktif Testler</h3>
                ${dashboard.activeExperiments.map((exp: any) => `
                    <div class="metric">
                        <span>${exp.name}:</span>
                        <span>${exp.status}</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="card">
            <h3>⚡ Hızlı Aksiyonlar</h3>
            <div class="quick-actions">
                ${dashboard.quickActions.map((action: any) => `
                    <button class="action-btn ${action.action.includes('Kapat') || action.action.includes('Durdur') ? 'danger' : ''}" 
                            onclick="executeAction('${action.endpoint}', '${action.action}')">
                        ${action.buttonText}
                    </button>
                `).join('')}
            </div>
        </div>
    </div>

    <button class="refresh-btn" onclick="location.reload()">🔄</button>

    <script>
        function executeAction(endpoint, action) {
            if (confirm('Bu aksiyonu gerçekleştirmek istediğinizden emin misiniz?\\n\\n' + action)) {
                fetch('/api/executive/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: endpoint, confirm: true })
                })
                .then(response => response.json())
                .then(data => {
                    alert(data.message);
                    if (data.success) location.reload();
                })
                .catch(error => alert('Hata: ' + error.message));
            }
        }

        // Otomatik yenileme (5 dakikada bir)
        setInterval(() => location.reload(), 300000);
    </script>
</body>
</html>`;
  }

  private generateMobileHTML(dashboard: any): string {
    return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📱 Okuz AI - Mobile Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            background: #1a1a1a;
            color: white;
            padding: 15px;
        }
        .status-bar {
            background: ${this.getStatusColor(dashboard.overallHealth.status)};
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            margin-bottom: 20px;
        }
        .score { font-size: 3rem; font-weight: bold; }
        .status { font-size: 1.2rem; margin-top: 10px; }
        .metric-card {
            background: #2a2a2a;
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 15px;
        }
        .metric-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
        }
        .alert-card {
            background: #ef4444;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 15px;
        }
        .action-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 15px;
            border-radius: 10px;
            width: 100%;
            margin: 5px 0;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="status-bar">
        <div class="score">${dashboard.overallHealth.score}/100</div>
        <div class="status">${this.getStatusText(dashboard.overallHealth.status)}</div>
    </div>

    <div class="metric-card">
        <h3>📊 Metrikler</h3>
        <div class="metric-row">
            <span>Kullanıcılar:</span>
            <span>${dashboard.criticalMetrics.users.active.toLocaleString()}</span>
        </div>
        <div class="metric-row">
            <span>Gelir:</span>
            <span>$${dashboard.criticalMetrics.revenue.current.toLocaleString()}</span>
        </div>
        <div class="metric-row">
            <span>Uptime:</span>
            <span>${dashboard.criticalMetrics.performance.uptime}%</span>
        </div>
    </div>

    ${dashboard.urgentIssues.length > 0 ? `
        <div class="alert-card">
            <h3>🚨 ${dashboard.urgentIssues.length} Acil Durum</h3>
            ${dashboard.urgentIssues.map((issue: any) => `
                <div>${issue.title}</div>
            `).join('')}
        </div>
    ` : ''}

    <div class="metric-card">
        <h3>⚡ Hızlı Aksiyonlar</h3>
        ${dashboard.quickActions.map((action: any) => `
            <button class="action-btn" onclick="executeAction('${action.endpoint}', '${action.action}')">
                ${action.buttonText}
            </button>
        `).join('')}
    </div>

    <script>
        function executeAction(endpoint, action) {
            if (confirm(action + ' yapmak istediğinizden emin misiniz?')) {
                fetch('/api/executive/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: endpoint, confirm: true })
                })
                .then(response => response.json())
                .then(data => {
                    alert(data.message);
                    if (data.success) location.reload();
                });
            }
        }
    </script>
</body>
</html>`;
  }

  private getStatusText(status: string): string {
    const statusTexts = {
      excellent: 'MÜKEMMEL',
      good: 'İYİ',
      warning: 'UYARI',
      critical: 'KRİTİK'
    };
    return statusTexts[status as keyof typeof statusTexts] || 'BİLİNMEYEN';
  }

  private getStatusColor(status: string): string {
    const colors = {
      excellent: '#10b981',
      good: '#3b82f6',
      warning: '#f59e0b',
      critical: '#ef4444'
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  }

  private getStatusMessage(health: any): string {
    const messages = {
      excellent: '🎉 Sistem mükemmel durumda!',
      good: '✅ Sistem sağlıklı çalışıyor.',
      warning: '⚠️ Dikkat edilmesi gereken durumlar var.',
      critical: '🚨 Kritik durum! Hemen müdahale gerekli!'
    };
    return messages[health.status as keyof typeof messages] || '❓ Durum belirsiz.';
  }

  private async executeQuickAction(action: string): Promise<any> {
    // Bu gerçek implementasyonda gerçek aksiyonlar çalıştırılacak
    switch (action) {
      case '/api/executive/disable-ai-coaching':
        return { message: 'AI Koçluk özelliği devre dışı bırakıldı' };
      case '/api/executive/stop-ab-test':
        return { message: 'A/B test durduruldu' };
      case '/api/executive/restart-system':
        return { message: 'Sistem yeniden başlatıldı' };
      case '/api/executive/clear-cache':
        return { message: 'Cache temizlendi' };
      default:
        throw new Error('Bilinmeyen aksiyon');
    }
  }
}
