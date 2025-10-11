import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from '../common/analytics/analytics.service';

@ApiTags('Analytics Events')
@ApiBearerAuth()
@Controller('api/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsEventsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Kullanıcı aksiyon olaylarını alır' })
  async ingest(@Body() body: { event: string; properties?: any; sessionId?: string; context?: any }) {
    await this.analyticsService.trackEvent(body.event, (body as any).userId || 'anonymous', body.properties || {}, body.sessionId, body.context);
    return { success: true };
  }
}


