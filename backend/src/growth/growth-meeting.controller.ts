import { Controller, Get, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GrowthMeetingService } from './growth-meeting.service';

@ApiTags('Growth Meeting')
@Controller('growth-meeting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class GrowthMeetingController {
  constructor(
    private readonly growthMeetingService: GrowthMeetingService,
  ) {}

  @Get('weekly-report')
  @ApiOperation({ summary: 'Haftalık büyüme toplantısı raporu' })
  @ApiResponse({ status: 200, description: 'Haftalık büyüme raporu' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getWeeklyGrowthReport() {
    return this.growthMeetingService.generateWeeklyGrowthReport();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Haftalık büyüme özeti' })
  @ApiResponse({ status: 200, description: 'Büyüme özeti' })
  async getWeeklyGrowthSummary() {
    return this.growthMeetingService.getWeeklyGrowthSummary();
  }

  @Get('kpi-dashboard')
  @ApiOperation({ summary: 'KPI Dashboard - Büyüme toplantısı için' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'KPI Dashboard verileri' })
  async getKPIDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const report = await this.growthMeetingService.generateWeeklyGrowthReport();
    
    return {
      title: 'Haftalık Büyüme Toplantısı - KPI Dashboard',
      date: new Date().toLocaleDateString('tr-TR'),
      period: {
        start: report.period.start.toLocaleDateString('tr-TR'),
        end: report.period.end.toLocaleDateString('tr-TR'),
      },
      kpis: report.kpis,
      insights: report.insights,
      recommendations: report.recommendations,
      nextWeekFocus: [
        'Plan oluşturma A/B test sonuçlarını değerlendir',
        'AI Koçluk rollout etkisini ölç',
        'Kullanıcı tutma oranını iyileştir',
        'Yeni A/B testleri planla',
      ],
    };
  }

  @Get('growth-questions')
  @ApiOperation({ summary: 'Büyüme toplantısı için kritik sorular' })
  @ApiResponse({ status: 200, description: 'Kritik büyüme soruları' })
  async getGrowthQuestions() {
    return {
      questions: [
        {
          category: 'Kullanıcı Büyümesi',
          questions: [
            'Bu hafta MAU hedefimize ne kadar yaklaştık?',
            'Yeni kullanıcı edinme maliyetimiz nasıl?',
            'Hangi kanallardan en kaliteli kullanıcılar geliyor?',
            'Kullanıcı segmentasyonumuz nasıl değişiyor?',
          ],
        },
        {
          category: 'Kullanıcı Tutma',
          questions: [
            'User Retention neden düştü/arttı?',
            'Hangi özellikler kullanıcıları en çok tutuyor?',
            'Churn oranımız hangi segmentlerde yüksek?',
            'Onboarding sürecimiz ne kadar etkili?',
          ],
        },
        {
          category: 'Dönüşüm ve Gelir',
          questions: [
            'Conversion funnel\'imizde en büyük darboğaz nerede?',
            'MRR büyüme hızımız hedefimize uygun mu?',
            'ARPU hangi segmentlerde en yüksek?',
            'Ödeme sürecinde hangi adımlarda kayıp yaşıyoruz?',
          ],
        },
        {
          category: 'Ürün ve Özellikler',
          questions: [
            'Geçen hafta başlattığımız A/B testinin sonuçları ne durumda?',
            'Hangi özellikler en çok kullanılıyor?',
            'Feature adoption oranlarımız nasıl?',
            'Kullanıcı geri bildirimlerinde en çok ne isteniyor?',
          ],
        },
        {
          category: 'Rekabet ve Pazar',
          questions: [
            'Rakiplerimizle karşılaştırıldığımızda neredeyiz?',
            'Pazar büyüme hızı bizim büyüme hızımızdan yüksek mi?',
            'Hangi pazarlarda daha hızlı büyüyoruz?',
            'Yeni pazarlara giriş fırsatlarımız neler?',
          ],
        },
      ],
      meetingAgenda: [
        '📊 Geçen hafta metrikleri gözden geçir (15 dk)',
        '🎯 Bu hafta hedefleri değerlendir (10 dk)',
        '🧪 A/B test sonuçlarını analiz et (15 dk)',
        '🚀 Yeni büyüme fırsatlarını belirle (15 dk)',
        '📋 Gelecek hafta aksiyon planı oluştur (5 dk)',
      ],
      successCriteria: [
        'MAU hedefinin %80\'ine ulaşmak',
        'En az 1 A/B test sonucunu değerlendirmek',
        '3 yeni büyüme fırsatı belirlemek',
        'Gelecek hafta için 5 aksiyon öğesi oluşturmak',
      ],
    };
  }

  @Post('schedule-meeting')
  @ApiOperation({ summary: 'Haftalık büyüme toplantısı planla' })
  @ApiResponse({ status: 201, description: 'Toplantı planlandı' })
  async scheduleGrowthMeeting() {
    return {
      message: 'Haftalık büyüme toplantısı planlandı',
      schedule: {
        frequency: 'Haftalık',
        day: 'Pazartesi',
        time: '10:00 - 11:00',
        duration: '1 saat',
        participants: [
          'Product Manager',
          'Growth Manager',
          'Data Analyst',
          'Engineering Lead',
        ],
        agenda: [
          'KPI Dashboard inceleme',
          'A/B test sonuçları',
          'Büyüme fırsatları',
          'Aksiyon planı',
        ],
        preparation: [
          'KPI Dashboard\'u önceden inceleyin',
          'A/B test sonuçlarını hazırlayın',
          'Rakip analizi yapın',
          'Kullanıcı geri bildirimlerini gözden geçirin',
        ],
      },
    };
  }
}
