import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { NotificationManagementService, NotificationManagementData, NotificationTemplate, NotificationCampaign } from './notification-management.service';

@Controller('notification-management')
export class NotificationManagementController {
  constructor(private readonly notificationManagementService: NotificationManagementService) {}

  @Get('dashboard')
  async getManagementData(): Promise<NotificationManagementData> {
    try {
      return await this.notificationManagementService.getManagementData();
    } catch (error) {
      throw new HttpException(
        'Failed to get notification management data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('templates')
  async createTemplate(@Body() templateData: {
    name: string;
    type: 'email' | 'sms' | 'push' | 'in_app';
    subject?: string;
    content: string;
    variables: string[];
  }): Promise<NotificationTemplate> {
    try {
      return await this.notificationManagementService.createTemplate(templateData);
    } catch (error) {
      throw new HttpException(
        'Failed to create template',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('templates/:templateId')
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() templateData: Partial<NotificationTemplate>
  ): Promise<NotificationTemplate> {
    try {
      return await this.notificationManagementService.updateTemplate(templateId, templateData);
    } catch (error) {
      throw new HttpException(
        'Failed to update template',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('templates/:templateId')
  async deleteTemplate(@Param('templateId') templateId: string): Promise<void> {
    try {
      await this.notificationManagementService.deleteTemplate(templateId);
    } catch (error) {
      throw new HttpException(
        'Failed to delete template',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('campaigns')
  async createCampaign(@Body() campaignData: {
    name: string;
    description: string;
    templateId: string;
    targetUsers?: string[];
    targetCriteria?: any;
    scheduledAt?: string;
  }): Promise<NotificationCampaign> {
    try {
      return await this.notificationManagementService.createCampaign(campaignData);
    } catch (error) {
      throw new HttpException(
        'Failed to create campaign',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('campaigns/:campaignId')
  async updateCampaign(
    @Param('campaignId') campaignId: string,
    @Body() campaignData: Partial<NotificationCampaign>
  ): Promise<NotificationCampaign> {
    try {
      return await this.notificationManagementService.updateCampaign(campaignId, campaignData);
    } catch (error) {
      throw new HttpException(
        'Failed to update campaign',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('campaigns/:campaignId')
  async deleteCampaign(@Param('campaignId') campaignId: string): Promise<void> {
    try {
      await this.notificationManagementService.deleteCampaign(campaignId);
    } catch (error) {
      throw new HttpException(
        'Failed to delete campaign',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('campaigns/:campaignId/start')
  async startCampaign(@Param('campaignId') campaignId: string): Promise<void> {
    try {
      await this.notificationManagementService.startCampaign(campaignId);
    } catch (error) {
      throw new HttpException(
        'Failed to start campaign',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
