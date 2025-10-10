import { Controller, Get, Post, Put, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { PerformanceMonitoringService, PerformanceMetrics, PerformanceDashboard, PerformanceAlert } from './performance-monitoring.service';

@Controller('performance')
export class PerformanceMonitoringController {
  constructor(private readonly performanceMonitoringService: PerformanceMonitoringService) {}

  @Get('metrics')
  async getCurrentMetrics(): Promise<PerformanceMetrics> {
    try {
      return await this.performanceMonitoringService.collectMetrics();
    } catch (error) {
      throw new HttpException(
        'Failed to get current metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('dashboard')
  async getPerformanceDashboard(): Promise<PerformanceDashboard> {
    try {
      return await this.performanceMonitoringService.getPerformanceDashboard();
    } catch (error) {
      throw new HttpException(
        'Failed to get performance dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('history')
  async getMetricsHistory(@Query('limit') limit?: string): Promise<PerformanceMetrics[]> {
    try {
      const limitNumber = limit ? parseInt(limit, 10) : 100;
      return await this.performanceMonitoringService.getMetricsHistory(limitNumber);
    } catch (error) {
      throw new HttpException(
        'Failed to get metrics history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('alert')
  async createAlert(@Body() alertData: {
    type: 'cpu' | 'memory' | 'disk' | 'response_time' | 'error_rate' | 'database';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    threshold: number;
    currentValue: number;
  }): Promise<void> {
    try {
      await this.performanceMonitoringService.createAlert(
        alertData.type,
        alertData.severity,
        alertData.title,
        alertData.message,
        alertData.threshold,
        alertData.currentValue
      );
    } catch (error) {
      throw new HttpException(
        'Failed to create performance alert',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('alert/:alertId/resolve')
  async resolveAlert(@Param('alertId') alertId: string): Promise<void> {
    try {
      await this.performanceMonitoringService.resolveAlert(alertId);
    } catch (error) {
      throw new HttpException(
        'Failed to resolve alert',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
