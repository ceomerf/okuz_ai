import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { BulkNotificationService } from './bulk-notification.service';

// Alias controller to match frontend paths: /api/notifications/*
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly bulk: BulkNotificationService) {}

  @Get('templates') getTemplates(@Query('category') category?: string) { return this.bulk.getTemplates(category); }
  @Get('templates/:id') getTemplateById(@Param('id') id: string) { return this.bulk.getTemplateById(id); }
  @Post('templates') createTemplate(@Body() b: any) { return this.bulk.createTemplate(b); }
  @Put('templates/:id') updateTemplate(@Param('id') id: string, @Body() b: any) { return this.bulk.updateTemplate(id, b); }
  @Delete('templates/:id') deleteTemplate(@Param('id') id: string) { return this.bulk.deleteTemplate(id); }

  @Get('segments') getSegments() { return this.bulk.getAudienceSegments(); }
  @Post('segments') upsertSegment(@Body() _b: any) { return { success: true }; }
  @Delete('segments/:id') deleteSegment(@Param('id') _id: string) { return { success: true }; }

  @Post('campaigns/send') sendCampaign(@Body() b: any) { return this.bulk.sendBulkNotification({
    title: 'Campaign', message: 'N/A', type: 'SYSTEM', channels: ['email'], targetAudience: { userRoles: [] }, templateId: b.templateIdA, variables: {},
  } as any); }
  @Get('campaigns/:id/report') getReport(@Param('id') id: string) { return this.bulk.getCampaignStatistics(id); }
}
