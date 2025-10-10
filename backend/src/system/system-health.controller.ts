import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { SystemHealthService, SystemHealth, ServiceStatus, SystemMetrics } from './system-health.service';

@Controller('system')
export class SystemHealthController {
  constructor(private readonly systemHealthService: SystemHealthService) {}

  @Get('health')
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      return await this.systemHealthService.getSystemHealth();
    } catch (error) {
      throw new HttpException(
        'Failed to get system health',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('services')
  async getServiceStatus(): Promise<ServiceStatus[]> {
    try {
      const health = await this.systemHealthService.getSystemHealth();
      return health.services;
    } catch (error) {
      throw new HttpException(
        'Failed to get service status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics')
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const health = await this.systemHealthService.getSystemHealth();
      return health.metrics;
    } catch (error) {
      throw new HttpException(
        'Failed to get system metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('logs')
  async getSystemLogs(@Query('limit') limit?: string): Promise<any[]> {
    try {
      const limitNumber = limit ? parseInt(limit, 10) : 100;
      return await this.systemHealthService.getSystemLogs(limitNumber);
    } catch (error) {
      throw new HttpException(
        'Failed to get system logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}