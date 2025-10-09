import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AIManagementService } from './ai-management.service';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AIManagementController {
  constructor(private readonly aiManagementService: AIManagementService) {}

  @Get('statistics')
  async getAIStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('model') model?: string,
    @Query('promptType') promptType?: string,
  ) {
    return this.aiManagementService.getAIUsageStatistics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      model,
      promptType,
    });
  }

  @Get('logs')
  async getAILogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('level') level?: string,
    @Query('service') service?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.aiManagementService.getAIErrorLogs({
      page,
      limit,
      level,
      service,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('services')
  async getAIServices() {
    return this.aiManagementService.getAIServiceStatus();
  }

  @Get('costs')
  async getAIUsageCosts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('service') service?: string,
  ) {
    return this.aiManagementService.getAIUsageCosts({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      service,
    });
  }

  @Get('performance')
  async getAIPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('service') service?: string,
  ) {
    return this.aiManagementService.getAIPerformanceMetrics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      service,
    });
  }

  @Get('errors')
  async getAIErrorAnalysis(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('level') level?: string,
    @Query('service') service?: string,
  ) {
    return this.aiManagementService.getAIErrorAnalysis({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      level,
      service,
    });
  }

  @Post('test')
  async testAIService(@Body() body: {
    service: string;
    prompt: string;
    parameters?: Record<string, any>;
  }) {
    return this.aiManagementService.testAIService(body);
  }

  @Get('model-status')
  async getAIModelStatus() {
    return this.aiManagementService.getAIModelStatus();
  }
}