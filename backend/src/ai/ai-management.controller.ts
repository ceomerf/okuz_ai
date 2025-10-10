import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { AIManagementService, AIDashboardData, AIServiceStatus, AIModelInfo, AILogEntry } from './ai-management.service';

@Controller('ai')
export class AIManagementController {
  constructor(private readonly aiManagementService: AIManagementService) {}

  @Get('dashboard')
  async getDashboardData(): Promise<AIDashboardData> {
    try {
      return await this.aiManagementService.getDashboardData();
    } catch (error) {
      throw new HttpException(
        'Failed to get AI management dashboard data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('services')
  async getAIServices(): Promise<AIServiceStatus[]> {
    try {
      const data = await this.aiManagementService.getDashboardData();
      return data.services;
    } catch (error) {
      throw new HttpException(
        'Failed to get AI services',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('models')
  async getAIModels(): Promise<AIModelInfo[]> {
    try {
      const data = await this.aiManagementService.getDashboardData();
      return data.models;
    } catch (error) {
      throw new HttpException(
        'Failed to get AI models',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('logs')
  async getAILogs(@Query('limit') limit?: string): Promise<AILogEntry[]> {
    try {
      const data = await this.aiManagementService.getDashboardData();
      const limitNumber = limit ? parseInt(limit, 10) : 50;
      return data.logs.slice(0, limitNumber);
    } catch (error) {
      throw new HttpException(
        'Failed to get AI logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('log')
  async createAILog(@Body() logData: {
    service: string;
    model: string;
    action: string;
    input: any;
    output: any;
    duration: number;
    tokens: number;
    cost: number;
    status: 'success' | 'error' | 'warning';
    error?: string;
  }): Promise<void> {
    try {
      await this.aiManagementService.createAILog(
        logData.service,
        logData.model,
        logData.action,
        logData.input,
        logData.output,
        logData.duration,
        logData.tokens,
        logData.cost,
        logData.status,
        logData.error
      );
    } catch (error) {
      throw new HttpException(
        'Failed to create AI log',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('alert')
  async createAIAlert(@Body() alertData: {
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }): Promise<void> {
    try {
      await this.aiManagementService.createAIAlert(
        alertData.type,
        alertData.title,
        alertData.message
      );
    } catch (error) {
      throw new HttpException(
        'Failed to create AI alert',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}